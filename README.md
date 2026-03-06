# Foleio Platform

**Foleio** (Igbo: "Creator" / "Beautiful Creator") - Your work. Your world. Your Foleio.

**Tagline:** "Your work. Your world. Your Foleio."

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript 5.x
- **Styling:** Tailwind CSS 4.0
- **UI Components:** Shadcn/ui
- **Database:** PostgreSQL (Supabase)
- **ORM:** Prisma
- **Payments:** Paystack Nigeria
- **File Storage:** Cloudflare R2
- **Video Hosting:** Cloudflare Stream
- **Hosting:** Netlify
- **Monorepo:** Turborepo

## Project Structure

```
foleio-platform/
├── apps/
│   └── web/              # Next.js 16 application
├── packages/
│   ├── ui/               # Shared UI components
│   ├── database/         # Prisma schema & Supabase client
│   └── utils/            # Shared utilities
└── netlify/              # Netlify functions
```

## Getting Started

### Prerequisites

- Node.js 20+
- npm 10+
- Supabase account
- Paystack account
- Cloudflare account

### Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local

# Run database migrations
npm run db:migrate

# Start development server
npm run dev
```

## Development

```bash
# Run all apps in dev mode
npm run dev

# Build all packages
npm run build

# Run linting
npm run lint

# Run tests
npm run test

# Format code
npm run format
```

## Deployment

The platform is configured for deployment on Netlify. See `netlify.toml` for configuration.

## License

Proprietary - All rights reserved

