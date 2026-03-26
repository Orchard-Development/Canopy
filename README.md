# Orchard UI

Frontend surfaces for the [Orchard](https://github.com/Orchard-Development/Orchard) agent workspace engine.

## Surfaces

| Directory | Description | Status |
|-----------|-------------|--------|
| `app/` | React web app (Command Center) | Active |
| `pages/` | Marketing site (Cloudflare Pages) | Active |
| `electron/` | Desktop shell | Planned |
| `mobile/` | iOS / Android | Planned |

## Development

Each surface is a standalone project with its own `package.json`.

### Command Center (`app/`)

```bash
cd app
npm install
npm run dev
```

The dev server proxies `/api` and `/ws` to the Orchard engine (default port 19470).
Configure with `CTX_DASHBOARD_PORT` and `CTX_VITE_PORT` env vars.

### Marketing Site (`pages/`)

```bash
cd pages
npm install
npm run dev
```

## Engine Connection

The app communicates with the Orchard engine via WebSocket and REST API.
No engine source code is needed -- just a running engine instance.
