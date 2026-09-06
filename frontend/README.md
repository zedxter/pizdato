# Frontend — pizdato.net

React + TypeScript frontend for the pizdato voting site, built with Vite.

## Getting started

```bash
cd frontend
npm install
npm run dev
```

Opens at `http://localhost:5173` — Vite proxies `/api` to the backend and maps clean paths (`/lenta`, `/pizdato`, etc.) to their HTML entry points.

## Key dependencies

| Package | Purpose |
|---------|---------|
| React 18 | UI framework |
| TypeScript | Type safety |
| Vite | Build tool + dev server |

## Project structure

```
frontend/
├── public/           # Static assets (logo, images, design.css)
├── src/
│   ├── App.tsx       # Main app shell
│   ├── pages/        # Page components mapped to routes
│   ├── components/   # Shared UI components
│   └── api/          # API client functions
├── index.html        # HTML entry point
├── vite.config.ts    # Vite configuration (proxy, build)
└── package.json      # Dependencies and scripts
```

## Available scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with HMR |
| `npm run build` | Production build to `dist/` |
| `npm run lint` | Run ESLint |
| `npm run preview` | Preview production build locally |

## Development notes

- The frontend is served as a static build via Caddy in production. Vite's dev server is for local development only.
- Page shells (`index.html`, `lenta.html`, `pizdato.html`, etc.) are served by Caddy via `try_files` — the frontend SPA hydrates React on top.
- The site uses `design.css` (shared design tokens) from `public/` — do not import CSS from `node_modules/` directly.
- All API calls go to `/api/*` — proxied to the Rust backend (port 3000 in dev, Caddy in production).

## Routing

Pages are served as static HTML shells by Caddy, then hydrated by React for interactive components. The main entry point is `index.html` which handles all routes via React Router.

## Production build

```bash
npm run build
```

Output goes to `dist/` — included in the Docker image by the multi-stage build.