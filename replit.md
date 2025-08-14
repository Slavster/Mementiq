# replit.md

## Overview
Mementiq is a professional video editing services website, designed as a modern full-stack web application. It functions as a landing page and lead generation platform for video editing services, featuring a subscription-based pricing model with email capture. The project aims to provide a comprehensive platform for users to manage video projects, track subscription usage, and seamlessly interact with video editing services.

## User Preferences
Preferred communication style: Simple, everyday language.
Frame.io Account: V4 account with OAuth authentication successfully configured via Adobe Developer Console.
Design Standard: NEVER use blue colors anywhere in the app - all blue instances must be cyan (hsl(180, 85%, 55%)). This is a permanent design requirement.

## Recent Changes (August 14, 2025)
- Fixed corrupted database configuration that was preventing app startup
- Enhanced Frame.io V4 OAuth implementation to meet enterprise security standards:
  - ✅ offline_access scope properly requested during authorization
  - ✅ Refresh token rotation on each refresh cycle
  - ✅ Early token refresh (T-5 minutes) using expires_in
  - ✅ Database-level locking for single-flight refresh operations
  - ✅ Single retry on 401 with proper error surfacing
  - ✅ Server-only token storage (never exposed to browser)
  - ✅ invalid_grant detection for admin re-authentication
  - ✅ Organization/profile verification on 403 errors
- Updated project status workflow to replace "delivered" with "complete" status
- Enhanced "Accept Video" functionality with confetti animation and automatic dashboard redirect
- Updated dashboard UI to show "Download Final Video" button for completed projects instead of "Manage & Upload Footage"
- **ENFORCED 1:1 SHARE LINK RELATIONSHIP:**
  - ✅ Added `frameioReviewLink` and `frameioReviewShareId` columns to projects table
  - ✅ Share links stored at both file level AND project level simultaneously
  - ✅ "Download Final Video" button uses existing project-level share link (no new API calls)
  - ✅ Prevents duplicate share link creation and ensures consistency
- **CRITICAL FOLDER MANAGEMENT RULES ENFORCED:**
  - ✅ Frame.io folders are ONLY created when "New Video Request" button is clicked (never during project listing or other operations)
  - ✅ Maximum 2-level folder hierarchy enforced: User → Project (no deeper nesting allowed)
  - ✅ Removed automatic folder creation from project listing and general project creation
  - ✅ Added Frame.io asset status updates: Accept Video → "Accepted", Request Revision → "Needs Review"
- **FRAME.IO V4 FOLDER CREATION IMPLEMENTED:**
  - ✅ Removed workaround code and implemented proper V4 folder creation endpoint
  - ✅ Using centralized token system exclusively for all API calls
  - ✅ Proper V4 API endpoint: `POST /folders` with `data: {name, parent_id}` structure
  - ✅ Full compliance with Frame.io V4 API specification
- **FIXED FOLDER HIERARCHY ISSUE:**
  - ✅ Resolved issue where project folders were being created at wrong nesting level (3 levels deep instead of 2)
  - ✅ Fixed mismatch between getUserFolders() and getUserFolder() methods causing incorrect parent selection
  - ✅ Project folders now properly created as siblings to existing projects, not nested within them
- **IMPROVED INSTRUCTIONS WORKFLOW:**
  - ✅ Added "Continue to Confirmation" button positioned on same line as "Back to Upload" button
  - ✅ Users can now proceed to upload step or update existing instructions
  - ✅ Enhanced user experience for returning to projects with existing form submissions
- **ENHANCED STEP PROGRESS INDICATORS:**
  - ✅ "Upload Footage" step shows green checkmark when user progresses to later workflow stages
  - ✅ Visual progress indicator matches completion styling of other workflow steps
  - ✅ Simplified logic: completed when currentStep is "form"/"confirmation" or project status is "Edit in Progress"/"Video is Ready"
  - ✅ No additional API calls needed - relies on existing workflow progression logic

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript and Vite.
- **UI Library**: Shadcn/ui components built on Radix UI.
- **Styling**: Tailwind CSS with custom theming and dark mode.
- **Routing**: Wouter for lightweight client-side routing.
- **State Management**: TanStack Query (React Query) for server state.
- **Form Handling**: React Hook Form with Zod validation.

### Backend
- **Runtime**: Node.js with Express.js server.
- **Language**: TypeScript with ES modules.
- **Database**: PostgreSQL with Drizzle ORM.
- **Session Management**: Express sessions with PostgreSQL store (migrated to Supabase Auth).
- **Development**: Hot reload with Vite middleware integration.

### Database Schema
- `users`: User authentication and subscription details.
- `email_signups`: Email capture for lead generation.
- `projects`: Video projects managed by users, including status tracking and media platform identifiers.
- `project_files`: Tracks files associated with projects.
- `photo_files`: Tracks photo files associated with projects.
- `project_status_log`: Audit trail for project status changes.

### Core Features
- **User Authentication**: Supabase Auth integration for email/password and Google social login with JWT token-based API authentication.
- **Subscription Management**: Full Stripe integration with a three-tier model, including real-time usage tracking, project creation validation against limits, and a customer portal.
- **Project Management Dashboard**: Comprehensive dashboard for users to view, create, and manage video projects with status tracking (`draft`, `awaiting instructions`, `edit in progress`, `video is ready`, `complete`, `revision in progress`). Last Updated timestamps calculated from latest Frame.io asset activity and Tally form submissions.
- **Video & Photo Upload System**: Utilizes Frame.io API for direct client-to-platform uploads (TUS protocol), managing video and photo assets, generating review links, and handling hierarchical folder structures (User -> Project). Includes a centralized, automatically refreshed token system for Frame.io V4 API.
- **Tally Form Integration**: Integrated as a mandatory step for users to provide editing instructions, tracking the latest submission.
- **Video Delivery Detection**: Automatic detection of completed video deliveries via Frame.io webhooks, updating project status, sending notifications, and storing metadata.
- **Public Share Creation**: Implementation of Frame.io V4 public share system with proper API schema compliance, including intelligent share reuse, project-level security to prevent cross-user access, and comments always enabled per user preference.
- **Email Capture**: Persistent storage for email signups.

## External Dependencies

- **Database**: PostgreSQL (`@neondatabase/serverless`).
- **ORM**: `drizzle-orm` with `drizzle-zod`.
- **UI Components**: `Radix UI`.
- **Styling Utilities**: `clsx`, `class-variance-authority`.
- **Date Handling**: `date-fns`.
- **Form Validation**: `zod`.
- **Authentication**: `Supabase Auth` (`@supabase/supabase-js`).
- **Payment Processing**: `Stripe` (for subscriptions, checkout sessions, webhooks).
- **Video & Photo Hosting/Upload**: `Frame.io API` (unified platform for direct uploads via TUS protocol, video management, photo management, review links, and thumbnail generation).
- **Object Storage (Internal)**: `@replit/object-storage` SDK for serving static assets.