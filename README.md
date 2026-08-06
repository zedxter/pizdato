# Pizdato

Voting site for [pizdato.net](https://pizdato.net): two buttons — **Сделать пиздато** / **Сделать хуёво** — with live counts and one vote per visitor (cookie + hashed IP).

## Stack

- **Frontend:** React + Vite (TypeScript)
- **Backend:** Rust (Axum) + SQLite
- **Deploy:** Caddy + systemd

## Development

```bash
# terminal 1
cd backend
cp ../deploy/pizdato.env.example .env   # optional; defaults work for local
# set COOKIE_SECURE=false for local HTTP
cargo run

# terminal 2
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 — Vite proxies `/api` to the backend on `:8080`.

## API

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/stats` | Counts + whether this client already voted |
| `POST` | `/api/vote` | Body `{ "choice": "pizdato" \| "huyevo" }` |

Repeat votes return `409` with current stats. Identity: `voter_id` HTTP-only cookie **or** `SHA256(VOTE_IP_SALT + ip)` — either match blocks a new vote.

## Production deploy

On this VPS (Caddy is already running):

```bash
./deploy/install.sh
```

That builds the app, installs the systemd service, writes `/etc/caddy/Caddyfile`, and reloads Caddy. TLS is automatic via Caddy.

Env file: `/etc/pizdato.env` (see [deploy/pizdato.env.example](deploy/pizdato.env.example)).

## License

MIT
