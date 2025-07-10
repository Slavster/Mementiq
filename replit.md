# replit.md

## Overview

CreativeEdge is a professional video editing services website built as a modern full-stack web application. The application serves as a landing page and lead generation platform for video editing services, featuring a subscription-based pricing model with email capture functionality.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript using Vite as the build tool
- **UI Library**: Shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom theming and dark mode support
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query (React Query) for server state management
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express.js server
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM
- **Session Management**: Express sessions with PostgreSQL store
- **Development**: Hot reload with Vite middleware integration

### Database Schema
The application uses PostgreSQL with the following tables:
- `users`: User authentication (id, username, password)
- `email_signups`: Email capture for lead generation (id, email, created_at)

## Key Components

### Frontend Components
- **Landing Page Sections**: Hero, Services, Portfolio, Testimonials, Competitive Advantage, Pricing, Email Capture, Footer
- **Navigation**: Responsive navigation with smooth scrolling
- **Email Capture Form**: Lead generation with validation and success/error handling
- **Portfolio Carousel**: Interactive portfolio showcase with video previews
- **Pricing Cards**: Subscription tiers with feature comparisons

### Backend Services
- **Email Signup API**: Handles email capture with duplicate prevention
- **Storage Layer**: Abstracted storage interface with in-memory implementation
- **Route Handlers**: RESTful API endpoints for email operations
- **Static File Serving**: Vite integration for development and production builds

## Data Flow

1. **User Interaction**: Users browse the landing page and interact with CTAs
2. **Email Capture**: Users submit email addresses through the email capture form
3. **Validation**: Frontend validates email format, backend prevents duplicates
4. **Storage**: Valid emails are stored in PostgreSQL database
5. **Feedback**: Users receive immediate feedback via toast notifications
6. **Admin Access**: Email signups can be retrieved via admin endpoint

## External Dependencies

### Production Dependencies
- **Database**: @neondatabase/serverless for PostgreSQL connectivity
- **ORM**: drizzle-orm with drizzle-zod for schema validation
- **UI Components**: Extensive Radix UI component library
- **Utilities**: clsx, class-variance-authority for styling utilities
- **Date Handling**: date-fns for date manipulation
- **Form Validation**: zod for schema validation

### Development Dependencies
- **Build Tools**: Vite, esbuild, TypeScript compiler
- **Development Server**: tsx for TypeScript execution
- **Linting**: Built-in TypeScript checking

## Deployment Strategy

### Build Process
- **Frontend**: Vite builds React application to `dist/public`
- **Backend**: esbuild bundles server code to `dist/index.js`
- **Database**: Drizzle migrations in `migrations/` directory

### Environment Configuration
- **Development**: Local development with hot reload
- **Production**: Optimized builds with static file serving
- **Database**: Environment variable `DATABASE_URL` for PostgreSQL connection

### Replit Configuration
- **Modules**: Node.js 20, Web, PostgreSQL 16
- **Ports**: Application runs on port 5000, mapped to external port 80
- **Deployment**: Autoscale deployment target with build and run scripts

## Changelog

### July 10, 2025 - Object Storage Integration (COMPLETED)
- **Issue**: Portfolio assets in Replit Object Storage (bucket: replit-objstore-b07cef7e-47a6-4dcc-aca4-da16dd52e2e9) not accessible via direct URLs
- **Problem**: Replit Object Storage requires authentication and doesn't provide direct public URLs
- **Solution Implemented**: Backend API proxy endpoints at `/api/assets/*` using `@replit/object-storage` SDK
- **Resolution**: Fixed path mapping - files exist at root level (`Thumbnails/`, `Videos/`) not with `EditingPortfolioAssets/` prefix
- **Result**: All 5 portfolio videos and thumbnails now loading correctly via `/api/assets/*` endpoints

### File Structure (Confirmed Working):
- Thumbnails: `Thumbnails/tu_lan_cover.jpg`, `Coaching Ad Cover.png`, `conference cover.png`, `Swap_in_city_cover.png`, `Sun a wear cover.png`  
- Videos: `Videos/Travel video.mp4`, `Coaching Ad 1 - 720.mp4`, `Conference Interviews.mp4`, `Event promo video.mp4`, `Product Ad.mp4`

### June 25, 2025 - Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.