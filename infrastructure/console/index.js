import express from "express";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { fileURLToPath } from "node:url";

const app = express();

const PORT = Number(process.env.PORT || 8080);
const MANAGER_URL =
  process.env.MANAGER_URL || "http://staark-demo-manager:8080";
const HUB_SECRET = process.env.HUB_SECRET || "";
const CONSOLE_USER = process.env.CONSOLE_USER || "";
const CONSOLE_PASSWORD = process.env.CONSOLE_PASSWORD || "";
const DEMO_HOST = process.env.DEMO_HOST || "demo.staark-app.cloud";
const CSRF_TOKEN = randomBytes(32).toString("hex");
const PUBLIC_DIR = fileURLToPath(new URL("./public", import.meta.url));

app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(express.urlencoded({ extended: false, limit: "16kb" }));
app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader("X-Permitted-Cross-Domain-Policies", "none");
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; style-src 'self'; script-src 'self' 'unsafe-inline'; img-src 'self' data:; form-action 'self'; frame-ancestors 'none'; base-uri 'none'"
  );
  next();
});

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function safeEqual(left, right) {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  return a.length === b.length && timingSafeEqual(a, b);
}

const AUTH_LIMIT = 8;
const AUTH_WINDOW_MS = 10 * 60 * 1000;
const AUTH_BLOCK_MS = 15 * 60 * 1000;
const authAttempts = new Map();

function authEntry(req) {
  const key = req.ip || req.socket.remoteAddress || "unknown";
  const now = Date.now();
  let entry = authAttempts.get(key);

  if (!entry || now - entry.windowStarted > AUTH_WINDOW_MS) {
    entry = { failures: 0, windowStarted: now, blockedUntil: 0 };
    authAttempts.set(key, entry);
  }

  return { key, entry, now };
}

function auth(req, res, next) {
  if (!CONSOLE_USER || !CONSOLE_PASSWORD) {
    return res.status(503).send("Console credentials are not configured");
  }

  const { key, entry, now } = authEntry(req);

  if (entry.blockedUntil > now) {
    res.setHeader(
      "Retry-After",
      String(Math.ceil((entry.blockedUntil - now) / 1000))
    );
    return res.status(429).send("Too many authentication failures");
  }

  const header = req.headers.authorization || "";
  if (!header.startsWith("Basic ")) {
    res.setHeader("WWW-Authenticate", 'Basic realm="Staark Demo Console"');
    return res.status(401).send("Authentication required");
  }

  let decoded = "";
  try {
    decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
  } catch {
    decoded = "";
  }

  const separator = decoded.indexOf(":");
  const username = separator >= 0 ? decoded.slice(0, separator) : "";
  const password = separator >= 0 ? decoded.slice(separator + 1) : "";

  if (!safeEqual(username, CONSOLE_USER) || !safeEqual(password, CONSOLE_PASSWORD)) {
    entry.failures += 1;

    if (entry.failures >= AUTH_LIMIT) {
      entry.blockedUntil = now + AUTH_BLOCK_MS;
    }

    authAttempts.set(key, entry);
    res.setHeader("WWW-Authenticate", 'Basic realm="Staark Demo Console"');
    return res.status(401).send("Unauthorized");
  }

  authAttempts.delete(key);
  next();
}

function verifyCsrf(req, res, next) {
  if (!safeEqual(req.body?.csrf || "", CSRF_TOKEN)) {
    return res.status(403).send("Invalid request token");
  }
  next();
}

async function manager(path, options = {}) {
  const response = await fetch(`${MANAGER_URL}${path}`, {
    ...options,
    signal: options.signal || AbortSignal.timeout(8_000),
    headers: {
      Authorization: `Bearer ${HUB_SECRET}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const body = await response.text();
  if (!response.ok) {
    throw new Error(`Manager ${response.status}: ${body}`);
  }

  if (!body) return {};

  try {
    return JSON.parse(body);
  } catch {
    throw new Error(`Invalid manager response: ${body}`);
  }
}

function isRunning(demo) {
  return demo.running === true || demo.state === "running";
}

function isAttention(demo) {
  return (
    demo.health === "unhealthy" ||
    ["dead", "restarting", "paused"].includes(String(demo.state || ""))
  );
}

function stateLabel(demo) {
  if (demo.health === "unhealthy") return "Unhealthy";
  if (demo.health === "starting") return "Starting";
  if (isRunning(demo)) return "Running";
  const value = String(demo.state || "stopped");
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function stateClass(demo) {
  if (isAttention(demo) || demo.health === "starting") return "warning";
  return isRunning(demo) ? "running" : "stopped";
}

function formatCreated(value) {
  if (!value) return "—";
  return String(value).replace(/\s+[+-]\d{4}.*$/, "").slice(0, 19);
}

function resourceText(demo) {
  if (!demo.resources) return "No live metrics";
  return `${demo.resources.cpu || "—"} CPU · ${demo.resources.memory || "—"} RAM`;
}

function uptimeText(demo) {
  const value = String(demo.uptime || "").trim();
  return value || "—";
}

function shellStart({ title, subtitle, eyebrow = "Infrastructure", now }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>${escapeHtml(title)} · Staark Demo Console</title>
<link rel="stylesheet" href="/manage/assets/app.css">
</head>
<body>
<div class="shell">
<header class="topbar">
  <div class="topbar-inner">
    <a class="brand" href="/manage">
      <span class="brand-mark">S</span>
      <span class="brand-copy"><strong>STAARK</strong><span>Demo infrastructure</span></span>
    </a>
    <div class="topbar-meta">
      <span class="connection"><span class="dot"></span>Manager connected</span>
      <span class="clock">${escapeHtml(now)}</span>
    </div>
  </div>
</header>
<div class="layout">
  <aside class="sidebar">
    <div class="nav-label">WORKSPACE</div>
    <nav class="nav">
      <a class="nav-item active" href="/manage"><span class="nav-icon">▤</span>Environments</a>
    </nav>
    <div class="sidebar-foot">${escapeHtml(DEMO_HOST)}<br>console v1.1.0</div>
  </aside>
  <main class="content">
    <section class="page-head">
      <div>
        <div class="eyebrow">${escapeHtml(eyebrow)}</div>
        <h1>${escapeHtml(title)}</h1>
        <div class="subtitle">${escapeHtml(subtitle)}</div>
      </div>`;
}

function shellEnd() {
  return `</main></div></div></body></html>`;
}

app.get("/health", (req, res) => {
  res.json({ ok: true, service: "staark-demo-console" });
});

app.use(auth);
app.use(
  "/manage/assets",
  express.static(PUBLIC_DIR, {
    fallthrough: false,
    etag: true,
    maxAge: "1h",
  })
);

app.get("/", (req, res) => {
  res.redirect("/manage");
});

app.get("/manage", async (req, res) => {
  try {
    const data = await manager("/console");
    const demos = data.demos || [];
    const running = demos.filter(isRunning).length;
    const stopped = demos.length - running;
    const attention = demos.filter(isAttention).length;
    const now = new Date().toLocaleString("sv-SE", { hour12: false });

    const rows = demos
      .map((demo) => {
        const slug = demo.slug || String(demo.container || "").replace(/^staark-demo-/, "");
        const online = isRunning(demo);
        const attentionState = isAttention(demo);
        const image = demo.image || "—";
        const url = demo.url || `https://${DEMO_HOST}/${slug}`;
        const filterState = attentionState ? "attention" : online ? "running" : "stopped";

        return `<article class="deployment-row" data-row data-search="${escapeHtml(`${slug} ${image}`.toLowerCase())}" data-status="${filterState}">
  <div class="deployment-main">
    <div class="deployment-name">${escapeHtml(slug)}</div>
    <div class="deployment-path">/${escapeHtml(slug)}</div>
  </div>
  <div class="status-stack">
    <span class="status ${stateClass(demo)}">${escapeHtml(stateLabel(demo))}</span>
    <span class="runtime-meta">${escapeHtml(uptimeText(demo))}</span>
  </div>
  <div class="deployment-image">
    <div class="image-name" title="${escapeHtml(image)}">${escapeHtml(image)}</div>
    <div class="runtime-meta">${escapeHtml(resourceText(demo))}</div>
  </div>
  <div class="created"><strong>${escapeHtml(formatCreated(demo.created))}</strong><span>Created</span></div>
  <div class="actions">
    ${online ? `<a class="button" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">↗ Open</a>` : `<span class="button disabled">↗ Open</span>`}
    <a class="button" href="/manage/${encodeURIComponent(slug)}/logs">▤ Logs</a>
    ${online ? `<form method="POST" action="/manage/${encodeURIComponent(slug)}/restart"><input type="hidden" name="csrf" value="${CSRF_TOKEN}"><button class="button warning" type="submit">↻ Restart</button></form>` : ""}
    ${online
      ? `<form method="POST" action="/manage/${encodeURIComponent(slug)}/stop"><input type="hidden" name="csrf" value="${CSRF_TOKEN}"><button class="button danger" type="submit">■ Stop</button></form>`
      : `<form method="POST" action="/manage/${encodeURIComponent(slug)}/start"><input type="hidden" name="csrf" value="${CSRF_TOKEN}"><button class="button success" type="submit">▶ Start</button></form>`}
    <form method="POST" action="/manage/${encodeURIComponent(slug)}/remove" onsubmit="return confirm('Remove this demo environment?')"><input type="hidden" name="csrf" value="${CSRF_TOKEN}"><button class="button danger" type="submit">× Remove</button></form>
  </div>
</article>`;
      })
      .join("");

    const errorNotice = req.query.error
      ? `<div class="notice error">${escapeHtml(req.query.error)}</div>`
      : "";

    res.send(`${shellStart({
      title: "Demo environments",
      subtitle: "Monitor deployments, open previews, inspect logs and control container lifecycle.",
      now,
    })}
      <div class="head-actions">
        <span class="updated-at">Updated ${escapeHtml(now)}</span>
        <button class="button" id="auto-refresh" type="button">Auto 30s</button>
        <a class="button" href="/manage">↻ Refresh</a>
      </div>
    </section>
    ${errorNotice}
    <section class="stats">
      <div class="stat"><div class="stat-top"><span class="stat-label">Total</span><span class="stat-icon">▤</span></div><strong class="stat-value">${demos.length}</strong><span class="stat-meta">Demo environments</span></div>
      <div class="stat"><div class="stat-top"><span class="stat-label">Running</span><span class="stat-icon">●</span></div><strong class="stat-value green">${running}</strong><span class="stat-meta">Serving previews</span></div>
      <div class="stat"><div class="stat-top"><span class="stat-label">Stopped</span><span class="stat-icon">■</span></div><strong class="stat-value">${stopped}</strong><span class="stat-meta">Currently offline</span></div>
      <div class="stat"><div class="stat-top"><span class="stat-label">Attention</span><span class="stat-icon">!</span></div><strong class="stat-value ${attention ? "amber" : ""}">${attention}</strong><span class="stat-meta">Unhealthy or unstable</span></div>
    </section>
    <section class="toolbar">
      <div class="search-wrap"><span class="search-icon">⌕</span><input id="search" class="search" type="search" placeholder="Search name or image…" autocomplete="off"></div>
      <select id="filter"><option value="all">All status</option><option value="running">Running</option><option value="stopped">Stopped</option><option value="attention">Attention</option></select>
    </section>
    <section class="deployments">
      <div class="deployments-head"><span>Environment</span><span>Status / uptime</span><span>Image / resources</span><span>Created</span><span>Actions</span></div>
      ${rows || `<div class="empty"><strong>No demo environments</strong>Deploy a project from Staark Hub and it will appear here.</div>`}
    </section>
    <div class="table-footer"><span id="counter">Showing ${demos.length} of ${demos.length} environments</span><span>${escapeHtml(data.host || DEMO_HOST)}</span></div>
    <script>
      const search = document.getElementById('search');
      const filter = document.getElementById('filter');
      const counter = document.getElementById('counter');
      const rows = Array.from(document.querySelectorAll('[data-row]'));
      const autoRefresh = document.getElementById('auto-refresh');
      const SEARCH_KEY = 'staark-demo-console-search';
      const FILTER_KEY = 'staark-demo-console-filter';
      const AUTO_KEY = 'staark-demo-console-auto';
      let refreshTimer = null;

      function persistView() {
        sessionStorage.setItem(SEARCH_KEY, search.value);
        sessionStorage.setItem(FILTER_KEY, filter.value);
      }

      function applyFilters() {
        const query = search.value.trim().toLowerCase();
        const status = filter.value;
        let visible = 0;
        for (const row of rows) {
          const matchesSearch = !query || (row.dataset.search || '').includes(query);
          const matchesStatus = status === 'all' || row.dataset.status === status;
          const show = matchesSearch && matchesStatus;
          row.classList.toggle('hidden-row', !show);
          if (show) visible++;
        }
        counter.textContent = 'Showing ' + visible + ' of ' + rows.length + ' environments';
      }

      function autoEnabled() {
        return localStorage.getItem(AUTO_KEY) !== 'off';
      }

      function scheduleRefresh() {
        if (refreshTimer) clearTimeout(refreshTimer);
        autoRefresh.classList.toggle('active', autoEnabled());
        autoRefresh.textContent = autoEnabled() ? 'Auto 30s · On' : 'Auto 30s · Off';

        if (autoEnabled()) {
          refreshTimer = setTimeout(() => {
            persistView();
            location.reload();
          }, 30000);
        }
      }

      search.value = sessionStorage.getItem(SEARCH_KEY) || '';
      const savedFilter = sessionStorage.getItem(FILTER_KEY) || 'all';
      if (Array.from(filter.options).some(option => option.value === savedFilter)) {
        filter.value = savedFilter;
      }

      search.addEventListener('input', () => {
        persistView();
        applyFilters();
      });
      filter.addEventListener('change', () => {
        persistView();
        applyFilters();
      });
      autoRefresh.addEventListener('click', () => {
        localStorage.setItem(AUTO_KEY, autoEnabled() ? 'off' : 'on');
        scheduleRefresh();
      });

      applyFilters();
      scheduleRefresh();
    </script>
  ${shellEnd()}`);
  } catch (error) {
    console.error(error);
    res.status(502).send(`<!doctype html><html><body style="background:#090b0e;color:#edf1f4;font-family:system-ui;padding:30px"><h1>Demo manager unavailable</h1><pre>${escapeHtml(error.message)}</pre></body></html>`);
  }
});

app.post("/manage/:slug/stop", verifyCsrf, async (req, res) => {
  try {
    await manager(`/stop/${encodeURIComponent(req.params.slug)}`, { method: "POST" });
    res.redirect("/manage");
  } catch (error) {
    res.redirect(`/manage?error=${encodeURIComponent(error.message)}`);
  }
});

app.post("/manage/:slug/start", verifyCsrf, async (req, res) => {
  try {
    await manager(`/start/${encodeURIComponent(req.params.slug)}`, { method: "POST" });
    res.redirect("/manage");
  } catch (error) {
    res.redirect(`/manage?error=${encodeURIComponent(error.message)}`);
  }
});

app.post("/manage/:slug/restart", verifyCsrf, async (req, res) => {
  try {
    await manager(`/restart/${encodeURIComponent(req.params.slug)}`, { method: "POST" });
    res.redirect("/manage");
  } catch (error) {
    res.redirect(`/manage?error=${encodeURIComponent(error.message)}`);
  }
});

app.post("/manage/:slug/remove", verifyCsrf, async (req, res) => {
  try {
    await manager(`/demo/${encodeURIComponent(req.params.slug)}`, { method: "DELETE" });
    res.redirect("/manage");
  } catch (error) {
    res.redirect(`/manage?error=${encodeURIComponent(error.message)}`);
  }
});

app.get("/manage/:slug/logs", async (req, res) => {
  try {
    const data = await manager(`/logs/${encodeURIComponent(req.params.slug)}?tail=300`);
    const now = new Date().toLocaleString("sv-SE", { hour12: false });

    res.send(`${shellStart({
      title: `${req.params.slug} logs`,
      subtitle: `Latest ${data.tail || 300} lines from the demo container.`,
      eyebrow: "Environment / Logs",
      now,
    })}
      <div class="head-actions">
        <a class="button" href="/manage/${encodeURIComponent(req.params.slug)}/logs">↻ Reload</a>
        <a class="button primary" href="/manage">← Environments</a>
      </div>
    </section>
    <div class="log-head"><div class="log-meta">Container: staark-demo-${escapeHtml(req.params.slug)}</div><div class="log-meta">Updated ${escapeHtml(now)}</div></div>
    <pre class="log-box">${escapeHtml(data.logs || "No logs available.")}</pre>
  ${shellEnd()}`);
  } catch (error) {
    res.redirect(`/manage?error=${encodeURIComponent(error.message)}`);
  }
});

app.use((req, res) => {
  res.status(404).send("Not found");
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Staark Demo Console listening on :${PORT}`);
});
