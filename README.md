# InvoiceForge UK

Professional invoicing, VAT management, and inventory for UK businesses. HMRC-ready, Making Tax Digital compliant.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js](https://nextjs.org) 16 (App Router, Turbopack) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v4 + [shadcn/ui](https://ui.shadcn.com) |
| Auth | [Clerk](https://clerk.com) |
| Database | PostgreSQL via [Neon](https://neon.tech) |
| ORM | Prisma 7 (with `pg` driver adapter) |
| Payments | [Stripe](https://stripe.com) |
| Email | [Resend](https://resend.com) |
| File Uploads | [UploadThing](https://uploadthing.com) |
| Charts | Recharts |
| PDF Generation | `@react-pdf/renderer` |

## Prerequisites

- Node.js 22 LTS
- PostgreSQL database (Neon recommended)
- Accounts with Clerk, Stripe, Resend, and UploadThing

## Environment Variables

Copy `.env.example` to `.env.local` and fill in all values:

```bash
cp .env.example .env.local
```

### Required Variables

| Variable | Source |
|---|---|
| `DATABASE_URL` | Neon → Connection Details |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk Dashboard → API Keys |
| `CLERK_SECRET_KEY` | Clerk Dashboard → API Keys |
| `CLERK_WEBHOOK_SECRET` | Clerk Dashboard → Webhooks |
| `STRIPE_SECRET_KEY` | Stripe Dashboard → Developers → API Keys |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe Dashboard → Developers → API Keys |
| `STRIPE_WEBHOOK_SECRET` | Stripe CLI or Dashboard Webhooks |
| `STRIPE_PRO_PRICE_ID` | Stripe Dashboard → Products |
| `STRIPE_ENTERPRISE_PRICE_ID` | Stripe Dashboard → Products |
| `RESEND_API_KEY` | Resend Dashboard → API Keys |
| `RESEND_FROM_EMAIL` | Resend → Domains (verified sender) |
| `UPLOADTHING_TOKEN` | UploadThing Dashboard → API Keys |
| `NEXT_PUBLIC_APP_URL` | Your domain, e.g. `https://invoiceforge.co.uk` |
| `ADMIN_SESSION_SECRET` | Generate a random 32+ char string |
| `CRON_SECRET` | Generate a random string for cron job auth |

### Clerk Redirect URLs

```
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/onboarding
```

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Generate Prisma client

```bash
npx prisma generate
```

### 3. Run database migrations

```bash
npx prisma migrate deploy
```

### 5. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Building for Production

```bash
npx prisma generate
npm run build
npm start
```

## Project Structure

```
app/
  (admin)/          # Admin panel (independent auth)
  (auth)/           # Sign-in / sign-up pages
  (dashboard)/      # Main app (invoices, clients, settings, etc.)
  api/              # API routes (webhooks, file uploads, cron)
components/
  ui/               # shadcn/ui components
  shared/           # Reusable app components
  [feature]/        # Feature-specific components
lib/
  actions/          # Server Actions
  pdf/              # PDF generation
  prisma.ts         # Prisma client singleton
  resend.ts         # Email helpers
  stripe.ts         # Stripe helpers
  uploadthing.ts    # UploadThing React helpers
prisma/
  schema.prisma     # Database schema
```

## Key Features

- **UK VAT Compliant** — Automatic VAT calculation at 20%, 5%, 0%, and exempt rates
- **Professional PDF Invoices** — Branded with your logo, payment terms, and bank details
- **Recurring Invoices** — Weekly, monthly, quarterly, annual automation
- **Client CRM** — Full contact history and outstanding balances
- **Inventory Management** — Stock tracking with reorder alerts
- **Financial Reports** — P&L, aged debtors, VAT summaries, cash-flow forecasts
- **Stripe Integration** — Online payments and subscription billing
- **Email Delivery** — Invoice emails, payment reminders, and confirmations via Resend

## VPS Deployment Guide

### Server Specifications
- **OS**: Ubuntu 26.04 LTS
- **Resources**: 1 vCPU, 1GB RAM, 10GB NVMe
- **IP**: `77.68.116.166`
- **Domain**: `invoiceforge.co.uk` (DNS A record → `77.68.116.166`)
- **SSL**: Let's Encrypt (auto-renewal enabled)

### What Was Set Up on the Server

1. **User `deploy`** — Sudo user with SSH key authentication
2. **2GB Swap** — Added for build processes (1GB RAM is insufficient for Next.js builds)
3. **Node.js 22** — Via NodeSource repository
4. **PM2** — Process manager for running the Next.js app
5. **Nginx** — Reverse proxy with SSL termination
6. **Certbot** — Let's Encrypt SSL certificate automation
7. **SSH Hardening** — Root login disabled, password auth disabled, key-only auth

### SSH Access

```bash
# From your local machine
ssh -i ~/.ssh/invoiceforge_deploy deploy@77.68.116.166
```

### Environment Setup on Server

Create `/home/deploy/app/.env.production` with all production secrets:

```bash
# Database (Neon PostgreSQL)
DATABASE_URL="postgresql://..."

# Clerk Auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_live_..."
CLERK_SECRET_KEY="sk_live_..."
CLERK_WEBHOOK_SECRET="whsec_..."

# Stripe
STRIPE_SECRET_KEY="sk_live_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_PRO_PRICE_ID="price_..."
STRIPE_ENTERPRISE_PRICE_ID="price_..."

# Email (Resend)
RESEND_API_KEY="re_..."
RESEND_FROM_EMAIL="noreply@invoiceforge.co.uk"

# UploadThing
UPLOADTHING_TOKEN="..."

# App
NEXT_PUBLIC_APP_URL="https://invoiceforge.co.uk"
ADMIN_SESSION_SECRET="<random-32-char-string>"
CRON_SECRET="<random-string>"

# Clerk Redirects
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/onboarding
```

### Deploy from GitHub

```bash
# On server (as deploy user)
cd ~
git clone git@github.com:YOUR_USERNAME/invoiceforge.git app
cd app
npm install
npx prisma generate
npm run build
pm2 start npm --name "invoiceforge" -- start
```

### Nginx Configuration

Already configured at `/etc/nginx/sites-available/invoiceforge`:

```nginx
server {
    listen 80;
    server_name invoiceforge.co.uk www.invoiceforge.co.uk;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name invoiceforge.co.uk www.invoiceforge.co.uk;

    ssl_certificate /etc/letsencrypt/live/invoiceforge.co.uk/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/invoiceforge.co.uk/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### SSL Certificate

Already obtained and auto-renewing:
```bash
sudo certbot certificates  # View certificate status
```

### PM2 Management

```bash
pm2 status              # Check app status
pm2 logs invoiceforge   # View logs
pm2 restart invoiceforge
pm2 stop invoiceforge
pm2 save                # Save PM2 config
pm2 startup             # Enable PM2 on boot
```

### Database Migrations

```bash
cd ~/app
npx prisma migrate deploy
```

### Build Locally (Recommended for 1GB RAM)

With only 1GB RAM, builds may fail. Build locally and deploy the `.next` folder:

```bash
# On local machine
npm run build
rsync -avz --exclude=node_modules --exclude=.git ./ deploy@77.68.116.166:~/app/
ssh deploy@77.68.116.166 "cd ~/app && pm2 restart invoiceforge"
```

## License

Private — All rights reserved.
