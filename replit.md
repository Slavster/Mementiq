# replit.md

## Overview
Mementiq is a professional video editing services website designed as a modern full-stack web application. Its primary purpose is to serve as a landing page and lead generation platform for video editing services, incorporating a subscription-based pricing model with email capture functionality. The project aims to provide a comprehensive platform for users to manage video projects, track subscription usage, and interact with video editing services seamlessly.

## Recent Changes (August 2025)
- **Complete Migration to Frame.io**: Replaced Vimeo API with Frame.io API for all video operations including uploads, review links, folder management, and asset downloads. This migration removes the Pro/Business account restrictions that limited Vimeo review functionality.
- **Unified Media Management**: Frame.io now handles both video and photo management, providing a single API for all media operations.
- **Enhanced Webhook System**: Updated webhook handling from Vimeo events to Frame.io asset completion events for real-time project status updates.
- **Generic Database Schema Migration (August 2025)**: Successfully completed migration from platform-specific field names (vimeoFolderId, vimeoVideoId, etc.) to generic equivalents (mediaFolderId, mediaAssetId, etc.) across entire codebase. This enables seamless future migrations between media platforms without code changes. Updated all database tables, API endpoints, service methods, client components, and documentation to use generic terminology.
- **Final Vimeo Cleanup (August 2025)**: Removed all remaining legacy Vimeo compatibility exports from frameioUpload.ts, completing the full migration to Frame.io platform.
- **Complete ImageKit Migration (August 2025)**: Successfully migrated all photo upload functionality from ImageKit to Frame.io. Added photo upload capabilities to Frame.io service, updated all API endpoints to use Frame.io for photos, removed imagekitService.ts, and updated client components. Frame.io now serves as the unified platform for both video and photo management with consistent folder structure and thumbnail generation.
- **Frame.io V4 OAuth Authentication Successful (August 9, 2025)**: Successfully implemented Frame.io V4 OAuth authentication using Adobe IMS endpoints with database-backed state management. Resolved invalid_scope error by using `openid` scope, fixed state parameter issues with Adobe's redirect chain by implementing database-backed OAuth state storage, and successfully completed full OAuth flow with token exchange. V4 authentication now working with access token obtained.
- **Frame.io V4 Project Integration Complete (August 9, 2025)**: Fixed project creation to use Frame.io V4 service instead of legacy V2. Updated project creation route to check OAuth status before attempting Frame.io operations, ensuring projects can be created successfully regardless of Frame.io OAuth completion. Added graceful fallback with OAuth URL provision for users who haven't completed Frame.io authentication yet.
- **Production-Ready OAuth System Complete (August 9, 2025)**: Implemented fully automatic, persistent OAuth system for Frame.io V4 integration. Service account token now stored permanently in database and automatically loaded on app startup. Zero manual intervention required after initial OAuth completion. Added automatic token loading on service initialization and permanent storage during OAuth callback. Production deployment will have zero downtime for Frame.io operations.
- **Centralized Token System with Automatic Refresh (August 11, 2025)**: Successfully migrated from user-level to centralized service_tokens architecture. Implemented automatic token refresh with ensureValidToken() and refreshAccessToken() methods. Enhanced OAuth scopes to include offline_access for refresh token capability. System now automatically detects token expiration and refreshes before 401 errors occur. All users share single centralized token with zero-interruption service. Refresh tokens successfully obtained and stored for autonomous operation.
- **Database Schema Cleanup (August 11, 2025)**: Removed legacy user-level Frame.io columns (frameio_v4_access_token, frameio_v4_refresh_token, frameio_v4_token_expires_at) from users table. Cleaned up test projects created during authentication troubleshooting. System now fully optimized for centralized token architecture with zero manual intervention required.
- **Complete Frame.io V2 to V4 Migration (August 11, 2025)**: Successfully completed full migration from legacy Frame.io V2 service to Frame.io V4 API across entire codebase. Replaced all frameioService calls with frameioV4Service in routes.ts, frameioUpload.ts, and related files. Added comprehensive V4 methods including getFolderAssets(), generateAssetDownloadLink(), verifyAssetInProjectFolder(), getUserFolders(), createUserProjectPhotoFolder(), uploadPhoto(), getAsset(), and deleteAsset(). All webhook handling, project creation, file uploads, photo management, and review link generation now use Frame.io V4 API with centralized token management. Zero legacy V2 dependencies remaining.

## User Preferences
Preferred communication style: Simple, everyday language.
Frame.io Account: V4 account with OAuth authentication successfully configured via Adobe Developer Console.

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
- **Session Management**: Express sessions with PostgreSQL store (initial, later migrated to Supabase Auth).
- **Development**: Hot reload with Vite middleware integration.

### Database Schema
- `users`: User authentication and subscription details (`id`, `username`, `password`, `firstName`, `lastName`, `company`, `stripe_customer_id`, `stripe_subscription_id`, `subscription_status`, `subscription_tier`, `subscription_usage`, `subscription_allowance`, `subscription_period_start`, `subscription_period_end`).
- `email_signups`: Email capture for lead generation (`id`, `email`, `created_at`).
- `projects`: Video projects managed by users (`id`, `user_id`, `title`, `status`, `media_folder_id`, `media_user_folder_id`, `media_review_link`, `tally_form_url`, `created_at`, `updated_at`).
- `project_files`: Tracks files associated with projects (`id`, `project_id`, `media_asset_id`, `media_asset_url`, `filename`, `file_type`, `file_size`, `upload_date`).
- `photo_files`: Tracks photo files (`id`, `album_id`, `project_id`, `user_id`, `media_file_id`, `media_url`, `media_thumbnail_url`, `media_folder_path`, `filename`, `file_size`, `upload_date`).
- `project_status_log`: Audit trail for project status changes (`id`, `project_id`, `old_status`, `new_status`, `changed_at`).

### Core Features
- **User Authentication**: Supabase Auth integration for email/password and Google social login. JWT token-based API authentication.
- **Subscription Management**: Full Stripe integration with a three-tier model (Basic, Standard, Premium). Includes real-time usage tracking, project creation validation against subscription limits, and a customer portal.
- **Project Management Dashboard**: Comprehensive dashboard for users to view, create, and manage video projects with status tracking (`draft`, `awaiting instructions`, `edit in progress`, `video is ready`, `revision in progress`). Projects in `draft` status do not count towards subscription limits.
- **Video Upload System**: Direct client-to-Vimeo uploads using the TUS protocol for large files, bypassing server intermediaries. Includes a hierarchical Vimeo folder structure (User -> Project) and upload verification.
- **Tally Form Integration**: Integrated as a mandatory step in the project workflow for users to provide editing instructions. Tracks the latest Tally submission ID for automation.
- **Video Portfolio & Streaming**: Click-to-play video system for portfolio showcase with optimized performance through caching and HTTP Range support.
- **Email Capture**: Persistent storage for email signups using PostgreSQL.

## External Dependencies

- **Database**: PostgreSQL, specifically `@neondatabase/serverless` for connectivity.
- **ORM**: `drizzle-orm` with `drizzle-zod`.
- **UI Components**: `Radix UI`.
- **Styling Utilities**: `clsx`, `class-variance-authority`.
- **Date Handling**: `date-fns`.
- **Form Validation**: `zod`.
- **Authentication**: `Supabase Auth` (`@supabase/supabase-js`).
- **Payment Processing**: `Stripe` (for subscriptions, checkout sessions, webhooks).
- **Video & Photo Hosting/Upload**: `Frame.io API` (unified platform for direct uploads via TUS protocol, video management, photo management, review links, and thumbnail generation).
- **Object Storage (Internal)**: `@replit/object-storage` SDK for serving static assets.
- **Development Tools**: `Vite`, `esbuild`, `TypeScript`, `tsx`.