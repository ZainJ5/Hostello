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
| `/var/www/hostello/public/uploads/payments` | Payment screenshots — private |
| `/etc/nginx/sites-available/hostello.conf` | Copied from `deploy/nginx/` |
| `/etc/systemd/system/hostello.service` | Copied from `deploy/systemd/` |

The service account is a system user with `nologin`; the app never runs as root.

## First-time setup

```bash
# System packages
apt-get install -y nginx mongodb-org nodejs fail2ban ufw

# Firewall — allow SSH before enabling, or you lose access
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

`.env.local` must be created by hand — generate the secret with
`openssl rand -hex 32`:

| Variable | Production value |
|---|---|
| `MONGODB_URI` | `mongodb://127.0.0.1:27017/hostello` |
| `AUTH_SECRET` | 64 hex characters, unique to the host |
| `NEXT_PUBLIC_SITE_URL` | `https://hostello.tech` |
| `SMTP_HOST` … | Real credentials — see the caveat below |

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
administrator. Listings are stored with `ownerId: null` — they are directory
entries, not owner-submitted records, and a real owner claims one later.

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

Once DNS for `hostello.tech` points at the host:

```bash
apt-get install -y certbot python3-certbot-nginx
certbot --nginx -d hostello.tech -d www.hostello.tech
```

Certbot rewrites the vhost to listen on 443 and installs a renewal timer. After
issuing, drop the `_` from `server_name` so the host stops answering for
arbitrary Host headers.

## Known caveats

- **SMTP is unconfigured.** With `SMTP_HOST` empty, signup and password-reset
  codes are written to the journal instead of being emailed, so no outside user
  can complete verification. Fill in real credentials before launch.
- **Payment screenshots sit under `public/`.** NGINX returns 404 for
  `/uploads/payments/` so the static copies are unreachable, and the
  authenticated route still serves them by reading from disk. Moving the
  directory outside the web root remains the more durable fix.
- **Review counts without review documents.** Listings carry genuine `rating`
  and `reviewCount` values from the legacy platform, but no `Review` documents
  exist, so a listing can show a score while its reviews tab is empty. The
  alternative — zeroing them — would contradict the listing descriptions, which
  quote the same figures.
