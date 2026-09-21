import express from "express";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { timingSafeEqual } from "node:crypto";

const execFileAsync = promisify(execFile);
const app = express();

const PORT = Number(process.env.PORT || 8080);
const HUB_SECRET = process.env.HUB_SECRET || "";
const DEMO_HOST = process.env.DEMO_HOST || "demo.staark-app.cloud";
const TRAEFIK_NETWORK = process.env.TRAEFIK_NETWORK || "staark-network";
const GHCR_USERNAME = process.env.GHCR_USERNAME || "";
const GHCR_TOKEN = process.env.GHCR_TOKEN || "";
const ALLOWED_IMAGE_PREFIX =
  process.env.ALLOWED_IMAGE_PREFIX || "ghcr.io/staark-inc/";

app.disable("x-powered-by");
app.use(express.json({ limit: "32kb" }));
app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  next();
});

function safeEqual(left, right) {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  return a.length === b.length && timingSafeEqual(a, b);
}

function authenticate(req, res, next) {
  if (!HUB_SECRET) {
    return res.status(503).json({
      error: "HUB_SECRET is not configured",
    });
  }

  const auth = req.headers.authorization || "";
  const expected = `Bearer ${HUB_SECRET}`;

  if (!safeEqual(auth, expected)) {
    return res.status(401).json({
      error: "Unauthorized",
    });
  }

  next();
}

function validSlug(slug) {
  return /^[a-z0-9][a-z0-9-]{0,62}$/.test(String(slug || ""));
}

function normalizeState(item) {
  const state = String(item.State || "").trim().toLowerCase();
  if (state) return state;

  const status = String(item.Status || "").trim().toLowerCase();
  if (status.startsWith("up")) return "running";
  if (status.startsWith("created")) return "created";
  if (status.startsWith("restarting")) return "restarting";
  if (status.startsWith("paused")) return "paused";
  if (status.startsWith("exited")) return "exited";
  if (status.startsWith("dead")) return "dead";
  return "unknown";
}

function normalizeHealth(status) {
  const value = String(status || "").toLowerCase();
  if (value.includes("(healthy)")) return "healthy";
  if (value.includes("(unhealthy)")) return "unhealthy";
  if (value.includes("health: starting")) return "starting";
  return "none";
}

function validImage(image) {
  return (
    typeof image === "string" &&
    image.length <= 300 &&
    image.startsWith(ALLOWED_IMAGE_PREFIX)
  );
}

async function docker(args) {
  return execFileAsync("docker", args, {
    maxBuffer: 10 * 1024 * 1024,
    timeout: 60_000,
  });
}

async function removeContainer(name) {
  try {
    await docker(["rm", "-f", name]);
  } catch (error) {
    const message = `${error?.stderr || ""}${error?.message || ""}`;
    if (!/No such container/i.test(message)) {
      throw error;
    }
  }
}

async function ghcrLogin() {
  if (!GHCR_USERNAME || !GHCR_TOKEN) return;

  await execFileAsync(
    "docker",
    [
      "login",
      "ghcr.io",
      "-u",
      GHCR_USERNAME,
      "--password-stdin",
    ],
    {
      input: GHCR_TOKEN,
      timeout: 30_000,
    }
  );
}

app.get("/health", (req, res) => {
  res.json({
    ok: true,
    service: "staark-demo-manager",
    host: DEMO_HOST,
    network: TRAEFIK_NETWORK,
  });
});

app.use(authenticate);

app.get("/console", async (req, res) => {
  try {
    const { stdout } = await docker([
      "ps",
      "-a",
      "--filter",
      "label=staark.demo=true",
      "--format",
      "{{json .}}",
    ]);

    const rows = stdout
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line));

    const demos = rows.map((item) => {
      const container = item.Names || "";
      const slug = container.replace(/^staark-demo-/, "");
      const state = normalizeState(item);
      const health = normalizeHealth(item.Status);

      return {
        slug,
        container,
        image: item.Image || "",
        status: item.Status || "",
        state,
        health,
        running: state === "running",
        created: item.CreatedAt || null,
        url: `https://${DEMO_HOST}/${slug}`,
      };
    });

    res.json({
      ok: true,
      host: DEMO_HOST,
      demos,
    });
  } catch (error) {
    res.status(500).json({
      error: "Could not list demos",
      details: error.message,
    });
  }
});

app.post("/deploy", async (req, res) => {
  try {
    const { slug, image, port = 3000 } = req.body || {};

    if (!validSlug(slug)) {
      return res.status(400).json({ error: "Invalid slug" });
    }

    if (!validImage(image)) {
      return res.status(400).json({
        error: `Image must start with ${ALLOWED_IMAGE_PREFIX}`,
      });
    }

    const internalPort = Number(port);
    if (
      !Number.isInteger(internalPort) ||
      internalPort < 1 ||
      internalPort > 65535
    ) {
      return res.status(400).json({ error: "Invalid port" });
    }

    const containerName = `staark-demo-${slug}`;
    const routerName = `staark-demo-${slug}`;

    await ghcrLogin();
    console.log(`[DEPLOY] Pulling ${image}`);
    await docker(["pull", image]);
    await removeContainer(containerName);

    const rule = `Host(\`${DEMO_HOST}\`) && PathPrefix(\`/${slug}\`)`;

    console.log(`[DEPLOY] Starting ${containerName}`);

    const { stdout } = await docker([
      "run",
      "-d",
      "--name",
      containerName,
      "--restart",
      "unless-stopped",
      "--network",
      TRAEFIK_NETWORK,
      "--label",
      "traefik.enable=true",
      "--label",
      `traefik.http.routers.${routerName}.rule=${rule}`,
      "--label",
      `traefik.http.routers.${routerName}.entrypoints=web`,
      "--label",
      `traefik.http.routers.${routerName}.middlewares=${routerName}-https`,
      "--label",
      `traefik.http.middlewares.${routerName}-https.headers.customrequestheaders.X-Forwarded-Proto=https`,
      "--label",
      `traefik.http.middlewares.${routerName}-https.headers.customrequestheaders.X-Forwarded-Port=443`,
      "--label",
      `traefik.http.services.${routerName}.loadbalancer.server.port=${internalPort}`,
      "--label",
      "staark.demo=true",
      "--label",
      `staark.demo.slug=${slug}`,
      "--label",
      `staark.demo.image=${image}`,
      image,
    ]);

    res.json({
      ok: true,
      status: "online",
      slug,
      image,
      containerId: stdout.trim(),
      containerName,
      url: `https://${DEMO_HOST}/${slug}`,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Deploy failed",
      details: error.stderr || error.message || "Unknown error",
    });
  }
});

app.post("/stop/:slug", async (req, res) => {
  try {
    const { slug } = req.params;
    if (!validSlug(slug)) {
      return res.status(400).json({ error: "Invalid slug" });
    }

    await docker(["stop", `staark-demo-${slug}`]);
    res.json({ ok: true, status: "stopped", slug });
  } catch (error) {
    res.status(500).json({
      error: "Stop failed",
      details: error.stderr || error.message,
    });
  }
});

app.post("/start/:slug", async (req, res) => {
  try {
    const { slug } = req.params;
    if (!validSlug(slug)) {
      return res.status(400).json({ error: "Invalid slug" });
    }

    await docker(["start", `staark-demo-${slug}`]);
    res.json({ ok: true, slug, status: "running" });
  } catch (error) {
    res.status(500).json({
      error: "Start failed",
      details: error.stderr || error.message,
    });
  }
});

app.delete("/demo/:slug", async (req, res) => {
  try {
    const { slug } = req.params;
    if (!validSlug(slug)) {
      return res.status(400).json({ error: "Invalid slug" });
    }

    await removeContainer(`staark-demo-${slug}`);
    res.json({ ok: true, status: "removed", slug });
  } catch (error) {
    res.status(500).json({
      error: "Remove failed",
      details: error.stderr || error.message,
    });
  }
});

app.get("/status/:slug", async (req, res) => {
  try {
    const { slug } = req.params;
    if (!validSlug(slug)) {
      return res.status(400).json({ error: "Invalid slug" });
    }

    const { stdout } = await docker([
      "inspect",
      `staark-demo-${slug}`,
      "--format",
      "{{.State.Status}}",
    ]);

    res.json({
      slug,
      status: stdout.trim(),
      url: `https://${DEMO_HOST}/${slug}`,
    });
  } catch {
    res.json({ slug: req.params.slug, status: "not_found" });
  }
});

app.get("/logs/:slug", async (req, res) => {
  try {
    const { slug } = req.params;
    if (!validSlug(slug)) {
      return res.status(400).json({ error: "Invalid slug" });
    }

    const requestedTail = Number(req.query.tail || 200);
    const tail = Number.isInteger(requestedTail)
      ? Math.min(Math.max(requestedTail, 20), 500)
      : 200;

    const { stdout, stderr } = await docker([
      "logs",
      "--tail",
      String(tail),
      `staark-demo-${slug}`,
    ]);

    res.json({
      slug,
      tail,
      logs: `${stdout}${stderr}`,
    });
  } catch (error) {
    res.status(500).json({
      error: "Could not get logs",
      details: error.message,
    });
  }
});

app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Staark Demo Manager listening on :${PORT}`);
});
