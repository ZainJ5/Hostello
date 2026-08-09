# Deployment

Production runs on a single Ubuntu 24.04 host: NGINX terminates HTTP and serves
static files, Next.js runs under systemd as an unprivileged user, and MongoDB
listens on loopback only.

```
internet ──▶ NGINX :80/:443 ──┬──▶ /uploads/     → disk (never touches Node)
                              ├──▶ /_next/static → disk
                              └──▶ everything else → 127.0.0.1:3000 (Next.js)
                                                      └──▶ 127.0.0.1:27017 (MongoDB)
```

## Layout

| Path | Purpose |
|---|---|
| `/var/www/hostello` | Application checkout, owned by the `hostello` user |
| `/var/www/hostello/.env.local` | Secrets, mode `600`, **not** in git |
| `/var/www/hostello/public/uploads/hostels` | Listing photography (~100 MB) |
| `/var/www/hostello/public/uploads/payments` | Payment screenshots (private) |
| `/etc/nginx/sites-available/hostello.conf` | Copied from `deploy/nginx/` |
| `/etc/systemd/system/hostello.service` | Copied from `deploy/systemd/` |

The service account is a system user with `nologin`; the app never runs as root.

## First-time setup

```bash
# System packages
apt-get install -y nginx mongodb-org nodejs fail2ban ufw

# Firewall: allow SSH before enabling, or you lose access
ufw allow 22/tcp && ufw allow 80/tcp && ufw allow 443/tcp
ufw default deny incoming && ufw --force enable

# Application
adduser --system --group --home /var/www/hostello --shell /usr/sbin/nologin hostello
git clone https://github.com/ZainJ5/Hostello.git /var/www/hostello
cd /var/www/hostello && npm ci && npm run build
chown -R hostello:hostello /var/www/hostello

# Services
cp deploy/systemd/hostello.service /etc/systemd/system/
cp deploy/nginx/hostello.conf /etc/nginx/sites-available/
ln -sf /etc/nginx/sites-available/hostello.conf /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
systemctl daemon-reload && systemctl enable --now hostello
nginx -t && systemctl reload nginx
```

`.env.local` must be created by hand. Generate the secret with
`openssl rand -hex 32`:

| Variable | Production value |
|---|---|
| `MONGODB_URI` | `mongodb://hostello_app:…@127.0.0.1:27017/hostello?authSource=hostello` |
| `AUTH_SECRET` | 64 hex characters, unique to the host |
| `NEXT_PUBLIC_SITE_URL` | `https://hostello.tech` |
| `RESEND_API_KEY` | Resend API key that sends all transactional mail |
| `MAIL_FROM` | `Hostello <no-reply@hostello.tech>` (domain must be verified in Resend) |

## Email

Mail goes out through [Resend](https://resend.com)'s HTTP API. `lib/mail.js`
picks a transport in this order:

1. `RESEND_API_KEY` set → Resend HTTP API
2. else `SMTP_HOST` set → SMTP via nodemailer
3. else → the code is printed to the journal (development)

The HTTP API is preferred over Resend's SMTP endpoint because it needs no
outbound mail ports and returns readable JSON errors instead of SMTP timeouts.

The sending domain must be verified in the Resend dashboard, with the DKIM and
SPF records they provide added to `hostello.tech`. Until that verification is
complete Resend rejects sends from `@hostello.tech` with a 403.

## CI/CD

`.github/workflows/deploy.yml` runs on every push to `main` and on manual
dispatch (Actions → Deploy to production → Run workflow).

- **verify** lints and builds against a real MongoDB service container, so a
  broken build never reaches the server.
- **deploy** SSHes to the VPS and runs `/usr/local/bin/deploy-hostello.sh`,
  then checks the homepage returns 200.

The deploy key is pinned in `/root/.ssh/authorized_keys` with
`command="/usr/local/bin/deploy-hostello.sh"` plus `no-pty` and the forwarding
restrictions, so that key can run the deploy and nothing else: a leaked CI
secret cannot open a root shell.

Repository secrets: `SSH_PRIVATE_KEY`, `SSH_KNOWN_HOSTS`, `SSH_HOST`,
`SSH_USER`.

The deploy script builds *before* restarting, so a failed build leaves the
running release untouched. If the health check fails after restart, it checks
out the previous commit, rebuilds and restarts automatically.

## Seeding

Production uses `scripts/seed-production.js`, **not** `scripts/seed.js`. The
development seeder fabricates students, reviews, bookings, page-view traffic
and sample payment receipts; none of that belongs in a live database.

```bash
sudo -u hostello ADMIN_EMAIL=you@hostello.tech ADMIN_PASSWORD='…' \
  node scripts/seed-production.js
```

It imports the 124 real listings from `data/hostels.json`, preserving the
rating and review counts carried over from the legacy platform, and creates one
administrator. Listings are stored with `ownerId: null`, because they are
directory entries rather than owner-submitted records, and a real owner claims
one later.

Pass `--purge-demo` to strip development seed data from a database that was
restored from a dev dump.

## Deploying an update

```bash
cd /var/www/hostello
git pull
npm ci
npm run build
chown -R hostello:hostello /var/www/hostello
systemctl restart hostello
```

## Operations

```bash
systemctl status hostello          # service state
journalctl -u hostello -f          # application logs
journalctl -u hostello | grep -A6 'dev mail'   # verification codes, while SMTP is unset
tail -f /var/log/nginx/hostello.access.log
```

## TLS

Certificates are issued by Let's Encrypt for `hostello.tech` and
`www.hostello.tech`, and `certbot.timer` renews them automatically:

```bash
certbot certificates      # inspect expiry
certbot renew --dry-run   # rehearse renewal
```

`deploy/nginx/hostello.conf` references the certificate paths directly, which
stay stable across renewals, so the vhost never needs regenerating. Note that
Ubuntu 24.04 ships NGINX 1.24, which has no `http2 on;` directive, so HTTP/2 is
enabled with `listen 443 ssl http2;`.

The vhost defines four servers: an HTTP redirect, an HTTPS catch-all that
returns 444 for unrecognised Host headers, a `www` → apex redirect, and the
application itself.

## Known caveats

- **Payment screenshots sit under `public/`.** NGINX returns 404 for
  `/uploads/payments/` so the static copies are unreachable, and the
  authenticated route still serves them by reading from disk. Moving the
  directory outside the web root remains the more durable fix.
- **Listing photography is not in git.** The ~102 MB in
  `public/uploads/hostels` is deployed out of band and survives deploys because
  the deploy script only touches tracked files. A rebuilt host needs it copied
  back before listings render their photos.
- **Review counts without review documents.** Listings carry genuine `rating`
  and `reviewCount` values from the legacy platform, but no `Review` documents
  exist, so a listing can show a score while its reviews tab is empty. The
  alternative, zeroing them, would contradict the listing descriptions, which
  quote the same figures.
