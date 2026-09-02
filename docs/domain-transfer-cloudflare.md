# Domain Transfer: pizdato.net GoDaddy → Cloudflare

**Status:** Migration plan
**Source:** Issue #19

## Current DNS State

| Record | Value |
|--------|-------|
| Nameservers | ns31.domaincontrol.com, ns32.domaincontrol.com (GoDaddy) |
| A (pizdato.net) | 202.61.253.55 |
| A (www.pizdato.net) | 202.61.253.55 |
| AAAA | None |
| MX | None (no mail on GoDaddy) |
| Registrar | GoDaddy |

Caddy serves at `202.61.253.55` — no change needed on the VPS.

## Steps

### Phase 1: GoDaddy (before transfer)

- [ ] Disable Transfer Lock on pizdato.net
- [ ] Get EPP/Auth code (available in GoDaddy Domains → Settings)
- [ ] Disable Privacy Protection if enabled (GoDaddy removes it on transfer anyway)
- [ ] Verify registrant email — the transfer confirmation goes there

### Phase 2: Cloudflare — Add Site (before requesting transfer)

- [ ] In Cloudflare Dashboard → Add Site → enter `pizdato.net`
- [ ] Cloudflare scans existing DNS records automatically
- [ ] **Verify the scanned records:**
  - A record: `pizdato.net` → `202.61.253.55` (proxied or DNS-only)
  - A record: `www.pizdato.net` → `202.61.253.55` (CNAME to pizdato.net or A record)
  - No MX, no TXT needed
- [ ] **DO NOT** change nameservers yet — this is just zone import
- [ ] Keep the plan on **DNS-only** (grey cloud) initially — Caddy handles SSL
- [ ] Once records are verified, change nameservers to Cloudflare's:
  - `dahlia.ns.cloudflare.com`
  - `zahn.ns.cloudflare.com`
- [ ] Wait for DNS propagation (5–30 min)

### Phase 3: Cloudflare — Domain Transfer

- [ ] Cloudflare Dashboard → Domain Registration → Transfer
- [ ] Enter `pizdato.net` and the EPP code from GoDaddy
- [ ] Pay the transfer fee (at-cost, ~$8–10)
- [ ] Confirm the transfer email (sent to registrant contact)
- [ ] Wait 5–7 days for ICANN transfer to complete

### Phase 4: Post-transfer

- [ ] Verify pizdato.net loads via Caddy — `curl -I https://pizdato.net`
- [ ] Verify www redirect — `curl -I https://www.pizdato.net`
- [ ] Verify /design.css — `curl -I https://pizdato.net/design.css`
- [ ] Enable auto-renewal in Cloudflare → Domain Registration
- [ ] Once stable, switch A record to **Proxied** (orange cloud) for CDN/DDoS
- [ ] Update `deploy/Caddyfile` if Cloudflare's proxy changes TLS termination

## DNS Records to Create in Cloudflare

| Type | Name | Value | Proxy Status |
|------|------|-------|-------------|
| A | `@` | `202.61.253.55` | DNS-only (grey) → Proxied (orange) later |
| A | `www` | `202.61.253.55` | DNS-only (grey) |

## Caddy Changes

No Caddy changes required for the transfer. Caddy continues serving on the VPS at `202.61.253.55` regardless of who manages DNS. If Cloudflare proxy (orange cloud) is enabled later, TLS terminates at Cloudflare; Caddy must trust Cloudflare's `CF-Connecting-IP` header or run on a non-standard port with Cloudflare's Origin Certificate.