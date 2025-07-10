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

### July 10, 2025 - Click-to-Play Video System (COMPLETED)
- **Problem**: Videos were stuttering after first frame due to HTTP Range chunking and complex buffering strategies
- **User Requirement**: Click-to-play videos with immediate playback, position tracking, and seamless switching between videos
- **Solution Implemented**: Complete video system overhaul with click-to-play functionality
- **Key Features**:
  - Click any video thumbnail to start playing immediately (no auto-play)
  - Click playing video to pause and save position
  - Switch between videos - pauses current and starts new one
  - Return to previous video - resumes from saved position
  - Progress tracking with 1-second interval updates
- **Technical Implementation**:
  - Serve full cached videos (25-46MB) in single 200 response vs chunked 206 responses
  - All videos preload metadata for instant playback
  - Video elements always present in DOM but hidden/shown based on play state
  - Cached videos load in under 500ms vs previous 3-4 seconds
- **UI Improvements**: 
  - Increased video spacing (420px vs 200px) to prevent overlapping
  - Adjusted scaling (scale-100 vs scale-75) for better visual hierarchy
  - Added overflow-hidden to container for cleaner presentation
- **Performance**: Videos now play smoothly from start to finish without stuttering or buffering delays

### July 10, 2025 - Object Storage Integration (COMPLETED)
- **Issue**: Portfolio assets in Replit Object Storage (bucket: replit-objstore-b07cef7e-47a6-4dcc-aca4-da16dd52e2e9) not accessible via direct URLs
- **Problem**: Replit Object Storage requires authentication and doesn't provide direct public URLs
- **Solution Implemented**: Backend API proxy endpoints at `/api/assets/*` using `@replit/object-storage` SDK
- **Final Resolution**: Object Storage SDK returns Node.js Buffer objects wrapped in arrays - fixed by properly extracting binary data from `bytesResult.value[0]`
- **Frontend Path Update**: Updated portfolio component URLs from `/Objects/Thumbnails/` to `/Thumbnails/` to match actual Object Storage structure
- **Result**: API now serving full file content (3.6MB thumbnails, 25MB videos) via `/api/assets/*` endpoints

### File Structure (Final Working):
- Frontend URLs: `/api/assets/Thumbnails/`, `/api/assets/Videos/` (direct paths matching Object Storage)
- Actual Storage: `Thumbnails/`, `Videos/` (root level directories in Object Storage)
- Files: `tu_lan_cover.jpg`, `Coaching Ad Cover.png`, `conference cover.png`, `Swap_in_city_cover.png`, `Sun a wear cover.png`, `Travel video.mp4`, etc.
- **Technical Detail**: Object Storage SDK `downloadAsBytes()` returns `{ok: true, value: [Buffer]}` where Buffer contains actual file data

### Performance Optimizations (July 10, 2025):
- **Memory Caching**: Thumbnails cached in-memory for 10 minutes (50MB cache limit, automatic cleanup)
- **Video Caching**: Videos cached for 30 minutes (100MB cache limit) - major performance boost
- **HTTP Range Support**: Video streaming with partial content (206 responses) for instant playback
- **Request Deduplication**: Prevents multiple simultaneous requests for same asset
- **HTTP Cache Headers**: Browser caching (10min thumbnails, 1hr videos) with ETags
- **Frontend Optimizations**: Lazy loading images, preload="metadata" for videos, smart adjacent video preloading
- **Final Performance**: 
  - Thumbnails: 450ms → 36ms (93% faster)
  - Video Range (cached): 3-4s → 4.8ms (99.8% faster)
  - Full Video (cached): 3-4s → 173ms (95% faster)

### June 25, 2025 - Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.