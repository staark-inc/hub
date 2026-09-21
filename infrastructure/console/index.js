import express from "express";

const app = express();

const PORT = 8080;

const MANAGER_URL =
  process.env.MANAGER_URL ||
  "http://staark-demo-manager:8080";

const HUB_SECRET =
  process.env.HUB_SECRET;

const CONSOLE_USER =
  process.env.CONSOLE_USER;

const CONSOLE_PASSWORD =
  process.env.CONSOLE_PASSWORD;

app.use(
  express.urlencoded({
    extended: true,
  })
);

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function auth(req, res, next) {
  const header =
    req.headers.authorization;

  if (
    !header ||
    !header.startsWith("Basic ")
  ) {
    res.setHeader(
      "WWW-Authenticate",
      'Basic realm="Staark Demo Console"'
    );

    return res
      .status(401)
      .send("Authentication required");
  }

  const decoded = Buffer
    .from(
      header.slice(6),
      "base64"
    )
    .toString();

  const separator =
    decoded.indexOf(":");

  const username =
    decoded.slice(
      0,
      separator
    );

  const password =
    decoded.slice(
      separator + 1
    );

  if (
    username !== CONSOLE_USER ||
    password !== CONSOLE_PASSWORD
  ) {
    res.setHeader(
      "WWW-Authenticate",
      'Basic realm="Staark Demo Console"'
    );

    return res
      .status(401)
      .send("Unauthorized");
  }

  next();
}

app.use(auth);

async function manager(
  path,
  options = {}
) {
  const response =
    await fetch(
      `${MANAGER_URL}${path}`,
      {
        ...options,

        headers: {
          Authorization:
            `Bearer ${HUB_SECRET}`,

          "Content-Type":
            "application/json",

          ...(
            options.headers ||
            {}
          ),
        },
      }
    );

  const body =
    await response.text();

  if (!response.ok) {
    throw new Error(
      `Manager ${response.status}: ${body}`
    );
  }

  if (!body) {
    return {};
  }

  try {
    return JSON.parse(body);
  } catch {
    throw new Error(
      `Invalid manager response: ${body}`
    );
  }
}

function isRunning(demo) {
  return (
    demo.state === "running" ||
    String(
      demo.status || ""
    )
      .toLowerCase()
      .startsWith("up")
  );
}

app.get("/", (req, res) => {
  res.redirect("/manage");
});

app.get(
  "/manage",
  async (req, res) => {
    try {
      const data =
        await manager(
          "/console"
        );

      const demos =
        data.demos || [];

      const running =
        demos.filter(
          isRunning
        ).length;

      const stopped =
        demos.length -
        running;

      const rows =
        demos
          .map((demo) => {
            const slug =
              demo.slug ||
              String(
                demo.container || ""
              )
                .replace(
                  /^staark-demo-/,
                  ""
                );

            const online =
              isRunning(demo);

            const image =
              demo.image || "—";

            return `
<tr
  data-row
  data-name="${escapeHtml(
    slug.toLowerCase()
  )}"
  data-status="${
    online
      ? "running"
      : "stopped"
  }"
>
  <td>
    <div class="deployment-name">
      ${escapeHtml(slug)}
    </div>

    <div class="deployment-path">
      /${escapeHtml(slug)}
    </div>
  </td>

  <td>
    <span
      class="status ${
        online
          ? "running"
          : "stopped"
      }"
    >
      <span></span>

      ${
        online
          ? "RUNNING"
          : "STOPPED"
      }
    </span>
  </td>

  <td>
    <div
      class="image-name"
      title="${escapeHtml(
        image
      )}"
    >
      ${escapeHtml(image)}
    </div>
  </td>

  <td>
    <div class="created">
      ${
        demo.created
          ? escapeHtml(
              demo.created
            )
          : "—"
      }
    </div>
  </td>

  <td>
    <div class="actions">

      ${
        online
          ? `
        <a
          class="action"
          href="https://demo.staark-app.cloud/${encodeURIComponent(
            slug
          )}"
          target="_blank"
          rel="noopener noreferrer"
        >
          ↗ Open
        </a>
        `
          : `
        <span
          class="action disabled"
        >
          ↗ Open
        </span>
        `
      }

      <a
        class="action"
        href="/manage/${encodeURIComponent(
          slug
        )}/logs"
      >
        ▤ Logs
      </a>

      ${
        online
          ? `
        <form
          method="POST"
          action="/manage/${encodeURIComponent(
            slug
          )}/stop"
        >
          <button
            class="action danger"
            type="submit"
          >
            ■ Stop
          </button>
        </form>
        `
          : `
        <form
          method="POST"
          action="/manage/${encodeURIComponent(
            slug
          )}/start"
        >
          <button
            class="action success"
            type="submit"
          >
            ▶ Start
          </button>
        </form>
        `
      }

    </div>
  </td>
</tr>
`;
          })
          .join("");

      const now =
        new Date()
          .toLocaleString(
            "sv-SE",
            {
              hour12: false,
            }
          );

      res.send(`
<!DOCTYPE html>

<html lang="en">

<head>

<meta charset="utf-8">

<meta
  name="viewport"
  content="width=device-width, initial-scale=1"
>

<meta
  name="robots"
  content="noindex,nofollow"
>

<title>
  Staark Demo Console
</title>

<style>

:root {
  color-scheme: dark;

  --bg: #0b0e12;
  --sidebar: #0d1014;
  --panel: #101419;
  --panel-alt: #12171d;

  --border: #252b33;
  --border-soft: #1b2026;

  --text: #e6e9ed;
  --muted: #858d98;
  --dim: #59616b;

  --green: #35c878;
  --red: #ef5e67;

  --blue: #8aa2c8;
}

* {
  box-sizing: border-box;
}

html,
body {
  margin: 0;

  min-height: 100%;

  background:
    var(--bg);

  color:
    var(--text);

  font-family:
    ui-monospace,
    SFMono-Regular,
    Menlo,
    Monaco,
    Consolas,
    "Liberation Mono",
    monospace;

  font-size: 13px;
}

body {
  min-height: 100vh;
}

a {
  color: inherit;

  text-decoration: none;
}

button,
input,
select {
  font: inherit;
}

.header {
  height: 64px;

  display: flex;
  align-items: center;

  border-bottom:
    1px solid var(--border);

  background:
    #0c0f13;
}

.header-inner {
  width: 100%;

  padding:
    0 28px;

  display: flex;
  align-items: center;
  justify-content: space-between;
}

.brand {
  display: flex;
  align-items: baseline;
  gap: 18px;
}

.brand strong {
  font-family:
    system-ui,
    sans-serif;

  font-size: 22px;
  font-weight: 750;

  letter-spacing:
    .04em;
}

.brand span {
  color:
    var(--muted);

  font-size: 12px;

  letter-spacing:
    .05em;
}

.header-meta {
  display: flex;
  align-items: center;

  gap: 28px;

  color:
    var(--muted);

  font-size: 11px;
}

.connection {
  display: flex;
  align-items: center;

  gap: 9px;
}

.connection-dot {
  width: 7px;
  height: 7px;

  border-radius:
    50%;

  background:
    var(--green);
}

.layout {
  min-height:
    calc(
      100vh - 64px
    );

  display: grid;

  grid-template-columns:
    210px 1fr;
}

.sidebar {
  padding:
    22px 12px;

  display: flex;
  flex-direction: column;

  border-right:
    1px solid var(--border);

  background:
    var(--sidebar);
}

.nav {
  display: flex;
  flex-direction: column;

  gap: 5px;
}

.nav-item {
  padding:
    11px 13px;

  display: flex;
  align-items: center;

  gap: 11px;

  border-radius:
    4px;

  color:
    var(--muted);
}

.nav-item.active {
  background:
    #171c22;

  color:
    var(--text);
}

.nav-icon {
  width: 18px;

  color:
    #a7afb9;

  text-align: center;
}

.sidebar-bottom {
  margin-top: auto;

  padding:
    15px 10px 4px;

  color:
    var(--dim);

  font-size: 10px;

  line-height: 1.8;
}

.content {
  min-width: 0;

  padding:
    40px;

  overflow:
    hidden;
}

.page-head {
  display: flex;
  justify-content: space-between;
  align-items: center;

  gap: 30px;

  margin-bottom:
    30px;
}

.page-label {
  margin-bottom:
    9px;

  color:
    var(--dim);

  font-size: 10px;

  letter-spacing:
    .08em;
}

h1 {
  margin: 0;

  font-family:
    system-ui,
    sans-serif;

  font-size: 32px;
  font-weight: 650;

  letter-spacing:
    -.03em;
}

.subtitle {
  margin-top:
    9px;

  color:
    var(--muted);

  line-height:
    1.6;
}

.head-actions {
  display: flex;
  align-items: center;

  gap: 18px;
}

.refresh {
  padding:
    10px 14px;

  border:
    1px solid var(--border);

  border-radius:
    4px;

  color:
    #cad0d7;

  background:
    var(--panel);

  cursor:
    pointer;
}

.last-updated {
  color:
    var(--muted);

  font-size:
    10px;

  line-height:
    1.6;
}

.stats {
  display: grid;

  grid-template-columns:
    repeat(
      3,
      minmax(
        0,
        1fr
      )
    );

  gap:
    14px;

  margin-bottom:
    28px;
}

.stat {
  min-height:
    92px;

  padding:
    18px 20px;

  border:
    1px solid var(--border);

  border-radius:
    4px;

  background:
    var(--panel);
}

.stat-label {
  display: block;

  margin-bottom:
    12px;

  color:
    var(--muted);

  font-size:
    11px;
}

.stat-value {
  font-family:
    system-ui,
    sans-serif;

  font-size:
    27px;
  font-weight:
    650;
}

.stat-value.green {
  color:
    var(--green);
}

.toolbar {
  display: grid;

  grid-template-columns:
    1fr 190px;

  gap:
    12px;

  margin-bottom:
    18px;
}

.search-wrap {
  position:
    relative;
}

.search-icon {
  position:
    absolute;

  top:
    50%;
  left:
    14px;

  transform:
    translateY(-50%);

  color:
    var(--muted);
}

.search {
  width:
    100%;
  height:
    42px;

  padding:
    0 14px 0 38px;

  border:
    1px solid var(--border);

  border-radius:
    4px;

  outline:
    none;

  background:
    var(--panel);

  color:
    var(--text);
}

.search:focus {
  border-color:
    #3c4652;
}

select {
  height:
    42px;

  padding:
    0 12px;

  border:
    1px solid var(--border);

  border-radius:
    4px;

  outline:
    none;

  background:
    var(--panel);

  color:
    var(--text);
}

.table-wrap {
  overflow-x:
    auto;

  border:
    1px solid var(--border);

  border-radius:
    4px;

  background:
    var(--panel);
}

table {
  width:
    100%;

  min-width:
    850px;

  border-collapse:
    collapse;
}

thead {
  background:
    var(--panel-alt);
}

th {
  padding:
    13px 16px;

  color:
    var(--muted);

  font-size:
    10px;
  font-weight:
    500;

  letter-spacing:
    .05em;

  text-align:
    left;
}

td {
  padding:
    16px;

  border-top:
    1px solid var(--border);

  vertical-align:
    middle;
}

tbody tr:hover {
  background:
    #13181e;
}

.deployment-name {
  margin-bottom:
    5px;

  color:
    #f0f2f4;

  font-weight:
    650;
}

.deployment-path {
  color:
    var(--muted);

  font-size:
    11px;
}

.status {
  display:
    inline-flex;

  align-items:
    center;

  gap:
    7px;

  font-size:
    10px;
}

.status span {
  width:
    6px;
  height:
    6px;

  display:
    inline-block;

  border-radius:
    50%;
}

.status.running {
  color:
    var(--green);
}

.status.running span {
  background:
    var(--green);
}

.status.stopped {
  color:
    var(--muted);
}

.status.stopped span {
  background:
    #6e7680;
}

.image-name {
  max-width:
    320px;

  overflow:
    hidden;

  color:
    #aab1b9;

  font-size:
    11px;

  text-overflow:
    ellipsis;

  white-space:
    nowrap;
}

.created {
  color:
    #aab1b9;

  font-size:
    11px;
}

.actions {
  display:
    flex;

  align-items:
    center;

  gap:
    7px;

  white-space:
    nowrap;
}

.actions form {
  margin:
    0;
}

.action {
  min-height:
    32px;

  padding:
    0 10px;

  display:
    inline-flex;

  align-items:
    center;
  justify-content:
    center;

  border:
    1px solid var(--border);

  border-radius:
    4px;

  background:
    #11161b;

  color:
    #c2c8cf;

  font-size:
    10px;

  cursor:
    pointer;
}

.action:hover {
  border-color:
    #414a55;

  color:
    white;
}

.action.success {
  border-color:
    rgba(
      53,
      200,
      120,
      .45
    );

  color:
    var(--green);
}

.action.danger {
  border-color:
    rgba(
      239,
      94,
      103,
      .45
    );

  color:
    var(--red);
}

.action.disabled {
  opacity:
    .35;

  cursor:
    not-allowed;
}

.table-footer {
  padding:
    17px 2px;

  display:
    flex;

  justify-content:
    space-between;

  color:
    var(--muted);

  font-size:
    10px;
}

.hidden-row {
  display:
    none;
}

@media (
  max-width:
  900px
) {

  .layout {
    grid-template-columns:
      1fr;
  }

  .sidebar {
    display:
      none;
  }

  .content {
    padding:
      24px;
  }

  .stats {
    grid-template-columns:
      1fr;
  }

  .page-head {
    align-items:
      flex-start;

    flex-direction:
      column;
  }

}

</style>

</head>


<body>

<header class="header">

  <div class="header-inner">

    <div class="brand">
      <strong>STAARK</strong>
      <span>DEMO CONSOLE</span>
    </div>

    <div class="header-meta">

      <div class="connection">
        <span
          class="connection-dot"
        ></span>

        Manager Connected
      </div>

      <div>
        ${escapeHtml(now)}
      </div>

    </div>

  </div>

</header>


<div class="layout">

  <aside class="sidebar">

    <nav class="nav">

      <a
        class="nav-item active"
        href="/manage"
      >
        <span class="nav-icon">
          ▤
        </span>

        Environments
      </a>

      <a
        class="nav-item"
        href="/manage"
      >
        <span class="nav-icon">
          ≡
        </span>

        Logs
      </a>

      <span
        class="nav-item"
      >
        <span class="nav-icon">
          ⚙
        </span>

        Settings
      </span>

    </nav>


    <div class="sidebar-bottom">

      demo.staark-app.cloud
      <br>

      console v1.0.0

    </div>

  </aside>


  <main class="content">

    <section class="page-head">

      <div>

        <div class="page-label">
          INFRASTRUCTURE
        </div>

        <h1>
          Demo environments
        </h1>

        <div class="subtitle">
          Manage and monitor
          your demo deployments.
        </div>

      </div>


      <div class="head-actions">

        <a
          class="refresh"
          href="/manage"
        >
          ↻ Refresh
        </a>

        <div class="last-updated">

          Last updated
          <br>

          ${escapeHtml(now)}

        </div>

      </div>

    </section>


    <section class="stats">

      <div class="stat">

        <span class="stat-label">
          Total
        </span>

        <span class="stat-value">
          ${demos.length}
        </span>

      </div>


      <div class="stat">

        <span class="stat-label">
          Running
        </span>

        <span
          class="stat-value green"
        >
          ${running}
        </span>

      </div>


      <div class="stat">

        <span class="stat-label">
          Stopped
        </span>

        <span class="stat-value">
          ${stopped}
        </span>

      </div>

    </section>


    <section class="toolbar">

      <div class="search-wrap">

        <span class="search-icon">
          ⌕
        </span>

        <input
          id="search"
          class="search"
          type="search"
          placeholder="Search environments..."
          autocomplete="off"
        >

      </div>


      <select id="filter">

        <option value="all">
          All status
        </option>

        <option value="running">
          Running
        </option>

        <option value="stopped">
          Stopped
        </option>

      </select>

    </section>


    <section class="table-wrap">

      <table>

        <thead>

          <tr>
            <th>NAME</th>
            <th>STATUS</th>
            <th>IMAGE</th>
            <th>CREATED</th>
            <th>ACTIONS</th>
          </tr>

        </thead>

        <tbody id="rows">

          ${
            rows ||
            `
            <tr>
              <td
                colspan="5"
                style="
                  color:#858d98;
                  text-align:center;
                  padding:40px
                "
              >
                No demo environments found.
              </td>
            </tr>
            `
          }

        </tbody>

      </table>

    </section>


    <div class="table-footer">

      <span id="counter">
        Showing ${demos.length}
        of ${demos.length}
        environments
      </span>

      <span>
        Staark Demo Infrastructure
      </span>

    </div>

  </main>

</div>


<script>

const search =
  document.getElementById(
    "search"
  );

const filter =
  document.getElementById(
    "filter"
  );

const counter =
  document.getElementById(
    "counter"
  );

const rows =
  Array.from(
    document.querySelectorAll(
      "[data-row]"
    )
  );

function applyFilters() {

  const query =
    search.value
      .trim()
      .toLowerCase();

  const status =
    filter.value;

  let visible = 0;

  for (
    const row
    of rows
  ) {

    const name =
      row.dataset.name || "";

    const rowStatus =
      row.dataset.status || "";

    const matchSearch =
      !query ||
      name.includes(
        query
      );

    const matchStatus =
      status === "all" ||
      status === rowStatus;

    const show =
      matchSearch &&
      matchStatus;

    row.classList.toggle(
      "hidden-row",
      !show
    );

    if (show) {
      visible++;
    }

  }

  counter.textContent =
    "Showing " +
    visible +
    " of " +
    rows.length +
    " environments";

}

search.addEventListener(
  "input",
  applyFilters
);

filter.addEventListener(
  "change",
  applyFilters
);

</script>

</body>

</html>
      `);

    } catch (error) {

      console.error(
        error
      );

      res
        .status(500)
        .send(
          `<pre>${escapeHtml(
            error.message
          )}</pre>`
        );
    }
  }
);


app.post(
  "/manage/:slug/stop",
  async (req, res) => {

    try {

      await manager(
        `/stop/${req.params.slug}`,
        {
          method: "POST",
        }
      );

      res.redirect(
        "/manage"
      );

    } catch (error) {

      res
        .status(500)
        .send(
          escapeHtml(
            error.message
          )
        );
    }
  }
);


app.post(
  "/manage/:slug/start",
  async (req, res) => {

    try {

      await manager(
        `/start/${req.params.slug}`,
        {
          method: "POST",
        }
      );

      res.redirect(
        "/manage"
      );

    } catch (error) {

      res
        .status(500)
        .send(
          escapeHtml(
            error.message
          )
        );
    }
  }
);


app.get(
  "/manage/:slug/logs",
  async (req, res) => {

    try {

      const data =
        await manager(
          `/logs/${req.params.slug}`
        );

      res.send(`
<!doctype html>

<html>

<head>

<meta charset="utf-8">

<meta
  name="viewport"
  content="width=device-width, initial-scale=1"
>

<title>
${escapeHtml(
  req.params.slug
)} / Logs
</title>

<style>

body {
  margin: 0;

  background: #0b0e12;

  color: #d8dce1;

  font-family:
    ui-monospace,
    SFMono-Regular,
    Menlo,
    Monaco,
    Consolas,
    monospace;
}

main {
  width:
    min(
      1200px,
      calc(
        100% - 40px
      )
    );

  margin:
    0 auto;

  padding:
    35px 0 60px;
}

a {
  color:
    #8aa2c8;

  text-decoration:
    none;
}

h1 {
  margin:
    30px 0 18px;

  font-family:
    system-ui,
    sans-serif;

  font-size:
    24px;

  font-weight:
    600;
}

pre {
  margin:
    0;

  padding:
    20px;

  overflow:
    auto;

  border:
    1px solid #252b33;

  border-radius:
    4px;

  background:
    #101419;

  color:
    #bcc2ca;

  font-size:
    11px;

  line-height:
    1.65;

  white-space:
    pre-wrap;
}

</style>

</head>

<body>

<main>

  <a href="/manage">
    ← Back to environments
  </a>

  <h1>
    ${escapeHtml(
      req.params.slug
    )}
    / logs
  </h1>

  <pre>${escapeHtml(
    data.logs ||
    "No logs available."
  )}</pre>

</main>

</body>

</html>
      `);

    } catch (error) {

      res
        .status(500)
        .send(
          escapeHtml(
            error.message
          )
        );
    }
  }
);


app.listen(
  PORT,
  "0.0.0.0",
  () => {

    console.log(
      `Staark Demo Console listening on :${PORT}`
    );

  }
);