# Staark Demo Infrastructure

This stack runs the internal demo deployment manager and the authenticated web console used to control demo environments served under `DEMO_HOST`.

## Services

- `demo-manager` — Docker control API bound to `127.0.0.1:8181` and authenticated with `HUB_SECRET`.
- `demo-console` — Basic-auth protected operator UI exposed by Traefik under `/manage`.
- Demo containers — created dynamically by the manager and attached to the configured Traefik network.

## First-time setup

```bash
cd infrastructure
cp .env.example .env
```

Set strong values for `HUB_SECRET`, `CONSOLE_USER`, `CONSOLE_PASSWORD`, and GHCR credentials when private images need to be pulled.

The external Docker network must already exist:

```bash
docker network create staark-network
```

Change `TRAEFIK_NETWORK` if your server uses a different network name.

## Start / update

```bash
docker compose up -d --build
```

Check service health:

```bash
docker compose ps
docker compose logs --tail=100 demo-manager demo-console
```

The console is available at:

```text
https://<DEMO_HOST>/manage
```

## Security notes

The manager has access to `/var/run/docker.sock`, which effectively grants host-level Docker control. Keep port `8181` bound to loopback, keep `HUB_SECRET` private, and do not expose the manager directly to the internet.

`ALLOWED_IMAGE_PREFIX` limits deploy requests to trusted container image namespaces. The default is `ghcr.io/staark-inc/`.

## CI

`.github/workflows/infrastructure-check.yml` validates JavaScript syntax, Docker Compose configuration, and builds both infrastructure images for changes touching this directory.

## Console operations

The infrastructure console exposes Start, Stop, Restart, Logs and Remove actions for demo containers. Running environments also report Docker CPU and memory usage and refresh automatically every 30 seconds by default.

The console keeps search/filter state across automatic refreshes. Auto-refresh can be disabled from the dashboard.

## Additional security hardening

The console applies restrictive browser security headers, CSRF tokens for state-changing forms, constant-time credential comparisons, and an in-memory authentication failure throttle.

The manager still requires Docker control privileges to create, remove, start and stop demo containers. Treat access to the manager as privileged. It remains bound to loopback on the host and is not intended to be internet-facing.

