# replit.md

## Overview
Mementiq is a full-stack web application designed as a professional video editing services platform. It serves as a landing page and lead generation tool, offering subscription-based pricing with integrated email capture. Its primary purpose is to enable users to manage video projects, track subscription usage, and interact seamlessly with video editing services.

## User Preferences
Preferred communication style: Simple, everyday language.
Design Standard: NEVER use blue colors anywhere in the app - all blue instances must be cyan (hsl(180, 85%, 55%)). This is a permanent design requirement.

## System Architecture

### UI/UX Decisions
- **Color Scheme**: Emphasizes cyan (hsl(180, 85%, 55%)) with no blue. Uses pink for certain status indicators, yellow for hover states, and black backgrounds with colored borders and text for status badges.
- **Components**: Utilizes Shadcn/ui built on Radix UI.
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
- **Subscription Management**: Stripe integration (three-tier model with usage tracking and project creation limits).
- **Project Management Dashboard**: Comprehensive project lifecycle management (`draft`, `awaiting instructions`, `edit in progress`, `video is ready`, `complete`, `revision in progress`), with automatic status updates.
- **Video & Photo Upload System**: Frame.io V4 API for direct client uploads (TUS protocol), media management, review link generation, and hierarchical folder structures (User -> Project). Features a centralized, automatically refreshed OAuth token system.
- **Tally Form Integration**: Mandatory for editing instructions.
- **Video Delivery Detection**: Automatic background service detects new video uploads, transitions projects to "Video is Ready", and sends notifications.
- **Public Share Creation**: Frame.io V4 public share system with intelligent share reuse. Share links are generated once during "Video is Ready" and expire after 30 days.
- **Email Capture**: Comprehensive lead generation system with IP address tracking, geolocation data, duplicate prevention, and enhanced email format validation.
- **Revision Payment Flow**: Popup-based payment via Stripe with immediate UI feedback and project status updates.
- **Revision Instructions Interface**: 4-step workflow integrated into video viewing stage.
- **Trello Integration**: Workflow automation for creating and managing Trello cards for project tracking, including initial project cards, revision cards, editor assignment inheritance, and status updates.
- **Admin Settings System**: Protected admin-only page at `/admin/settings` for managing Frame.io integration status, token health monitoring, and manual reconnection. Access controlled via email-based authorization (ADMIN_EMAILS environment variable).
- **Token Keep-Alive Service**: Background service running every 12 hours that proactively refreshes Frame.io OAuth tokens to prevent expiration, with automatic email alerts to admin when tokens are expiring or need attention.
- **Graceful Upload Error Handling**: Upload endpoints check token status before processing and return user-friendly "Upload service temporarily unavailable" messages instead of cryptic errors when Frame.io integration is down.

### System Design
- **Database Schema**: Includes `users`, `email_signups`, `projects`, `project_files`, `photo_files`, `project_status_log`, `revision_payments`, `trello_cards`, and `trello_config`.
- **API Design**: Share link retrieval endpoint checks for existing project-level share link first.
- **Frame.io Integration**: Uses V4 API exclusively with OAuth authentication. Token management via centralized service with automatic keep-alive refresh and admin notifications.
- **Admin Authorization**: Email-based admin access via ADMIN_EMAILS environment variable. Admin-only routes protected by requireAdmin middleware.

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