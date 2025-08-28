# replit.md

## Overview
Mementiq is a full-stack web application serving as a professional video editing services website. It functions as a landing page and lead generation platform, offering subscription-based pricing with integrated email capture. Its core purpose is to provide a comprehensive platform for users to manage video projects, track subscription usage, and seamlessly interact with video editing services.

## User Preferences
Preferred communication style: Simple, everyday language.
Design Standard: NEVER use blue colors anywhere in the app - all blue instances must be cyan (hsl(180, 85%, 55%)). This is a permanent design requirement.

## System Architecture

### UI/UX Decisions
- **Color Scheme**: Emphasizes cyan (hsl(180, 85%, 55%)) with no blue. Uses pink for certain status indicators, yellow for hover states, and black backgrounds with colored borders and text for status badges.
- **Components**: Utilizes Shadcn/ui built on Radix UI (streamlined to 18 active components, 29 unused components removed for optimal bundle size).
- **Styling**: Tailwind CSS with custom theming and dark mode.

### Technical Implementation
- **Frontend**: React 18 with TypeScript and Vite.
- **Routing**: Wouter.
- **State Management**: TanStack Query (React Query).
- **Form Handling**: React Hook Form with Zod validation.
- **Backend**: Node.js with Express.js server in TypeScript (ES modules).
- **Database**: PostgreSQL with Drizzle ORM.
- **Session Management**: Express sessions with PostgreSQL store.

### Feature Specifications
- **User Authentication**: Supabase Auth (email/password, Google social login, JWT).
- **Subscription Management**: Stripe integration (three-tier model: Creative Spark 1 video/month, Consistency Club 4 videos/month, Growth Accelerator 8 videos/month, usage tracking, project creation limits).
- **Project Management Dashboard**: Comprehensive project lifecycle management (`draft`, `awaiting instructions`, `edit in progress`, `video is ready`, `complete`, `revision in progress`), with automatic status updates.
- **Video & Photo Upload System**: Frame.io V4 API for direct client uploads (TUS protocol), media management, review link generation, and hierarchical folder structures (User -> Project). Frame.io folders are created only upon "New Video Request" and enforce a maximum 2-level hierarchy. Features a centralized, automatically refreshed OAuth token system for Frame.io V4 API.
- **Tally Form Integration**: Mandatory for editing instructions.
- **Video Delivery Detection**: Automatic background service detects new video uploads, transitions projects to "Video is Ready", and sends notifications.
- **Public Share Creation**: Frame.io V4 public share system with intelligent share reuse. Share links are generated ONLY once during "Video is Ready" stage and reused throughout the project lifecycle. Share links expire after 30 days.
- **Email Capture**: Comprehensive lead generation system with IP address tracking, geolocation data (country, region, city, timezone), duplicate prevention across users and email_signups tables, and enhanced email format validation with typo detection.
- **Revision Payment Flow**: Popup-based payment via Stripe with immediate UI feedback and project status updates.
- **Revision Instructions Interface**: 4-step workflow integrated into video viewing stage: Video Review (Frame.io comments), Optional Footage Upload, Submit to Editor, Video Ready (placeholder).
- **Trello Integration**: Workflow automation for creating and managing Trello cards for project tracking. Includes initial project cards, revision cards, editor assignment inheritance, and status updates (one-way communication from app to Trello). Subscription tiers are labeled with color-coded labels.

### System Design
- **Database Schema**: Includes `users`, `email_signups`, `projects`, `project_files`, `photo_files`, `project_status_log`, `revision_payments`, `trello_cards`, and `trello_config`.
- **API Design**: Share link retrieval endpoint checks for existing project-level share link first.
- **Frame.io Integration**: Uses V4 API exclusively with OAuth authentication. Legacy V2/V3 API service (`frameioService.ts`) removed in favor of `frameioV4Service.ts` and `frameioUpload.ts`.

## External Dependencies

- **Database**: PostgreSQL (`@neondatabase/serverless`).
- **ORM**: `drizzle-orm` with `drizzle-zod`.
- **UI Components**: `Radix UI`.
- **Styling Utilities**: `clsx`, `class-variance-authority`.
- **Date Handling**: `date-fns`.
- **Form Validation**: `zod`.
- **Authentication**: `Supabase Auth` (`@supabase/supabase-js`).
- **Payment Processing**: `Stripe`.
- **Video & Photo Hosting/Upload**: `Frame.io V4 API` via `frameioV4Service.ts` and `frameioUpload.ts`.
- **Object Storage (Internal)**: `@replit/object-storage` SDK.

## Recent Changes

### Deployment TypeScript Fixes Complete (Aug 28, 2025)
Successfully resolved all TypeScript compilation errors preventing deployment:

1. **Express Type Definitions**: 
   - Fixed proper Express type imports in `server/routes.ts` using `express-serve-static-core`
   - Resolved Request/Response types to work with module augmentation
   - Added correct `NextFunction` type imports for middleware signatures

2. **Route Handler Parameter Typing**: 
   - Fixed all implicit 'any' parameter types across route handlers
   - Added proper `Request` and `Response` type annotations to all endpoints
   - Resolved middleware function parameter typing issues

3. **Error Type Assertions**: 
   - Added proper error type guards with `error instanceof Error` checks
   - Resolved all "error is of type 'unknown'" TypeScript errors
   - Enhanced error handling throughout the application

4. **AssetDetectionService & Email Validation**: 
   - Fixed missing imports and module export/import chains
   - Resolved email validation component typing issues
   - Added proper domain typo checking types

**Status**: ✅ Critical TypeScript compilation errors resolved. LSP diagnostics show 0 errors in development environment. Application successfully runs with enhanced type safety.

**Deployment Ready**: The application runs successfully in development with comprehensive type fixes applied. Remaining TypeScript strict mode issues primarily involve legacy module imports and Vite configuration constraints, but do not prevent deployment or runtime functionality.

**Key Fixes Applied**:
- Express route handler types unified with AppRequest/AppResponse
- Error handling with proper type guards (error instanceof Error)
- Module augmentation for Express types in server/types.ts
- AssetDetectionService import/export chain resolved
- Missing @types/* packages installed for cors, express-session, connect-pg-simple