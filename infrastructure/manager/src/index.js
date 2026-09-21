import express from "express";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const app = express();

app.use(express.json());

const PORT = 8080;

const HUB_SECRET = process.env.HUB_SECRET;
const DEMO_HOST =
  process.env.DEMO_HOST || "demo.staark-app.cloud";

const TRAEFIK_NETWORK =
  process.env.TRAEFIK_NETWORK || "staark-network";

const GHCR_USERNAME = process.env.GHCR_USERNAME;
const GHCR_TOKEN = process.env.GHCR_TOKEN;

function authenticate(req, res, next) {
  const auth = req.headers.authorization;

  if (!HUB_SECRET) {
    return res.status(500).json({
      error: "HUB_SECRET is not configured",
    });
  }

  if (auth !== `Bearer ${HUB_SECRET}`) {
    return res.status(401).json({
      error: "Unauthorized",
    });
  }

  next();
}

function validSlug(slug) {
  return /^[a-z0-9][a-z0-9-]{0,62}$/.test(slug);
}

async function docker(args) {
  return execFileAsync("docker", args, {
    maxBuffer: 10 * 1024 * 1024,
  });
}

async function removeContainer(name) {
  try {
    await docker(["rm", "-f", name]);
  } catch {
    // container does not exist
  }
}

async function ghcrLogin() {
  if (!GHCR_USERNAME || !GHCR_TOKEN) {
    return;
  }

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
      const container =
        item.Names || "";

      const slug =
        container.replace(
          /^staark-demo-/,
          ""
        );

      return {
        slug,
        container,
        image: item.Image || "",
        status: item.Status || "",
        state:
          item.State ||
          (
            item.Status || ""
          )
            .toLowerCase()
            .startsWith("up")
            ? "running"
            : "stopped",

        created:
          item.CreatedAt || null,

        url:
          `https://${DEMO_HOST}/${slug}`,
      };
    });

    res.json({
      ok: true,
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
    const {
      slug,
      image,
      port = 3000,
    } = req.body;

    if (!slug || !validSlug(slug)) {
      return res.status(400).json({
        error: "Invalid slug",
      });
    }

    if (!image || typeof image !== "string") {
      return res.status(400).json({
        error: "Invalid image",
      });
    }

    const internalPort = Number(port);

    if (
      !Number.isInteger(internalPort) ||
      internalPort < 1 ||
      internalPort > 65535
    ) {
      return res.status(400).json({
        error: "Invalid port",
      });
    }

    const containerName = `staark-demo-${slug}`;
    const routerName = `staark-demo-${slug}`;

    await ghcrLogin();

    console.log(`[DEPLOY] Pulling ${image}`);

    await docker([
      "pull",
      image,
    ]);

    await removeContainer(containerName);

    const rule =
      `Host(\`${DEMO_HOST}\`) && PathPrefix(\`/${slug}\`)`;

    console.log(
      `[DEPLOY] Starting ${containerName}`
    );

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
      `staark.demo=true`,

      "--label",
      `staark.demo.slug=${slug}`,

      "--label",
      `staark.demo.image=${image}`,

      image,
    ]);

    const containerId = stdout.trim();

    res.json({
      ok: true,
      status: "online",
      slug,
      image,
      containerId,
      containerName,
      url: `https://${DEMO_HOST}/${slug}`,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Deploy failed",
      details:
        error.stderr ||
        error.message ||
        "Unknown error",
    });
  }
});

app.post("/stop/:slug", async (req, res) => {
  try {
    const { slug } = req.params;

    if (!validSlug(slug)) {
      return res.status(400).json({
        error: "Invalid slug",
      });
    }

    const containerName =
      `staark-demo-${slug}`;

    await docker([
      "stop",
      containerName,
    ]);

    res.json({
      ok: true,
      status: "stopped",
      slug,
    });
  } catch (error) {
    res.status(500).json({
      error: "Stop failed",
      details:
        error.stderr ||
        error.message,
    });
  }
});

app.post("/start/:slug", async (req, res) => {
  try {
    const { slug } = req.params;

    if (!validSlug(slug)) {
      return res.status(400).json({
        error: "Invalid slug",
      });
    }

    const containerName = `staark-demo-${slug}`;

    await docker([
      "start",
      containerName,
    ]);

    res.json({
      ok: true,
      slug,
      status: "running",
    });
  } catch (error) {
    res.status(500).json({
      error: "Start failed",
      details:
        error.stderr ||
        error.message,
    });
  }
});

app.delete("/demo/:slug", async (req, res) => {
  try {
    const { slug } = req.params;

    if (!validSlug(slug)) {
      return res.status(400).json({
        error: "Invalid slug",
      });
    }

    await removeContainer(
      `staark-demo-${slug}`
    );

    res.json({
      ok: true,
      status: "removed",
      slug,
    });
  } catch (error) {
    res.status(500).json({
      error: "Remove failed",
      details:
        error.stderr ||
        error.message,
    });
  }
});

app.get("/status/:slug", async (req, res) => {
  try {
    const { slug } = req.params;

    if (!validSlug(slug)) {
      return res.status(400).json({
        error: "Invalid slug",
      });
    }

    const containerName =
      `staark-demo-${slug}`;

    const { stdout } = await docker([
      "inspect",
      containerName,
      "--format",
      "{{.State.Status}}",
    ]);

    res.json({
      slug,
      status: stdout.trim(),
      url: `https://${DEMO_HOST}/${slug}`,
    });
  } catch {
    res.json({
      slug: req.params.slug,
      status: "not_found",
    });
  }
});

app.get("/logs/:slug", async (req, res) => {
  try {
    const { slug } = req.params;

    if (!validSlug(slug)) {
      return res.status(400).json({
        error: "Invalid slug",
      });
    }

    const { stdout, stderr } = await docker([
      "logs",
      "--tail",
      "200",
      `staark-demo-${slug}`,
    ]);

    res.json({
      slug,
      logs: `${stdout}${stderr}`,
    });
  } catch (error) {
    res.status(500).json({
      error: "Could not get logs",
    });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(
    `Staark Demo Manager listening on :${PORT}`
  );
});
