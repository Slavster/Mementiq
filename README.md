# Mementiq

Professional video editing services platform - bringing your stories to life with transparency, quality, and ease.

## 🎬 Overview

Mementiq is a full-stack web application designed for professional video editing services. It serves as a complete platform for managing video projects, subscriptions, and client interactions with integrated payment processing and automated workflow management.

## ✨ Features

- **User Authentication** - Secure authentication via Supabase (email/password + Google OAuth)
- **Subscription Management** - Three-tier pricing model with Stripe integration
- **Project Management** - Comprehensive dashboard for tracking project lifecycle
- **Video & Photo Upload** - Direct client uploads via Frame.io V4 API with TUS protocol
- **Automated Workflows** - Background services for video delivery detection and notifications
- **Public Sharing** - Frame.io public share system for video delivery
- **Revision System** - Integrated payment flow and instruction workflow for revisions
- **Trello Integration** - Automated project card creation and tracking
- **Email Capture** - Lead generation system with geolocation tracking
- **Cloudflare R2 Streaming** - Optimized video delivery from CDN

## 🛠️ Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** - Build tool and dev server
- **Wouter** - Client-side routing
- **TanStack Query** - Data fetching and caching
- **React Hook Form** + **Zod** - Form validation
- **Tailwind CSS** - Styling
- **Shadcn/ui** - Component library (Radix UI)

### Backend
- **Node.js** with Express.js (TypeScript + ES modules)
- **PostgreSQL** - Database (Neon/Replit)
- **Drizzle ORM** - Type-safe database queries

### External Services
- **Supabase** - Authentication and user management
- **Stripe** - Payment processing and subscriptions
- **Frame.io V4 API** - Video hosting and client uploads
- **Trello** - Project management automation
- **Resend** - Transactional emails
- **Cloudflare R2** - Video CDN storage

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ installed
- PostgreSQL database
- Required API keys (see `.env.example`)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/mementiq.git
   cd mementiq
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   Then edit `.env` and fill in all required values (see [Environment Variables](#environment-variables) section)

4. **Set up the database**
   ```bash
   npm run db:push
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

   The app will be available at `http://localhost:5000`

### Building for Production

```bash
npm run build
npm run serve
```

## 🔐 Environment Variables

All required environment variables are documented in `.env.example`. Copy this file to `.env` and configure:

### Required Services:
- **Database** - PostgreSQL connection string
- **Supabase** - Authentication service
- **Stripe** - Payment processing
- **Frame.io** - Video management
- **Trello** - Project tracking
- **Resend** - Email delivery
- **Cloudflare R2** - Video CDN

⚠️ **SECURITY WARNING**: Never commit `.env` files or expose API keys publicly!

## 📁 Project Structure

```
.
├── client/              # Frontend React application
│   ├── src/
│   │   ├── components/  # Reusable UI components
│   │   ├── pages/       # Route pages
│   │   ├── lib/         # Utilities and configs
│   │   └── hooks/       # Custom React hooks
│   └── index.html
├── server/              # Backend Express server
│   ├── routes.ts        # API routes
│   ├── storage.ts       # Data layer interface
│   ├── services/        # Business logic and integrations
│   └── db.ts            # Database connection
├── shared/
│   └── schema.ts        # Shared TypeScript types and Drizzle schemas
└── drizzle.config.ts    # Database migration config
```

## 🔒 Security Features

- **Content Security Policy** - Strict CSP headers in production
- **HTTPS enforcement** - HSTS headers for secure connections
- **Rate limiting** - API request throttling
- **Session management** - Secure JWT-based authentication
- **Input validation** - Zod schema validation on all inputs
- **CORS configuration** - Restricted origins
- **Environment isolation** - Secrets managed via environment variables

## 📝 Available Scripts

- `npm run dev` - Start development server with Vite + Express
- `npm run build` - Build for production
- `npm run serve` - Run production server
- `npm run db:push` - Push database schema changes
- `npm run db:generate` - Generate migration files

## 🎨 Design System

- **Color Scheme**: Cyan primary accent, purple/pink gradients, dark backgrounds
- **Design Rule**: No blue colors - cyan (hsl(180, 85%, 55%)) is used instead
- **Responsive Design**: Mobile-first approach with Tailwind breakpoints
- **Dark Mode**: Fully supported with theme provider

## 🔄 Deployment

The application is designed to run on Replit with automatic:
- Database provisioning (PostgreSQL)
- Environment variable management
- Automatic deployments
- Custom domain support

For other platforms, ensure:
1. Node.js 18+ runtime
2. PostgreSQL database access
3. All environment variables configured
4. Static files served from `server/public/`

## 📄 License

All rights reserved - Seraph Ventures LLC

## 🤝 Contributing

This is a private project. For questions or support, contact: mementiq@seraphventures.net

---

**Made with ❤️ by the Mementiq Team**
