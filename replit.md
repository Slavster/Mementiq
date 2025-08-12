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
- **Correct Frame.io V4 API Implementation (August 11, 2025)**: Implemented proper Frame.io V4 file upload flow using Adobe Developer documentation. Uses correct endpoint structure: `/accounts/{accountId}/folders/{folderId}/files` for file placeholder creation, followed by multi-part upload to pre-signed S3 URLs. Supports chunked uploads with proper headers (x-amz-acl: private, Content-Type) and authentication flow through Adobe IMS. Replaces previous mock system with authentic Frame.io V4 integration.
- **Automatic Folder Structure Verification (August 11, 2025)**: Added robust folder structure verification system that automatically checks and creates Frame.io user and project folders when users click "Manage & Upload Footage". New endpoint `/api/projects/:id/ensure-folder-structure` verifies existing folders or creates missing ones, preventing upload failures due to incomplete Frame.io setup. Frontend now automatically calls this verification before opening project upload dialog, ensuring seamless user experience with proper error handling and user feedback.
- **Enhanced Upload Interface with File Management (August 11, 2025)**: Implemented comprehensive upload improvements including: automatic project status advancement from 'draft' to 'awaiting instructions' when accessing upload interface, existing file display with storage usage calculation, 100-file upload limit per project with real-time validation, enhanced UI showing both existing and new files separately, improved storage tracking displaying total files and space used across project lifecycle, and "Continue to Next Step" button when existing files are present allowing users to proceed without uploading additional files.
- **DirectVideoUpload Component Removal (August 11, 2025)**: Completely removed legacy DirectVideoUpload.tsx component and replaced all references with FrameioUploadInterface. Updated dashboard.tsx and RevisionModal.tsx to use unified Frame.io upload system. This cleanup eliminates duplicate upload functionality and ensures all video uploads go through the single Frame.io V4 integration.
- **Enhanced Project Workflow UI (August 12, 2025)**: Implemented intelligent step navigation where projects in "Edit in Progress" status default to "Editor is On It!" step instead of form step. Added dynamic messaging in TallyFormStep component that shows different content when Tally form has already been submitted - alerts user that instructions are already provided and allows re-submission with updated button text "Re-submit Instructions". Added navigation between steps for projects in progress, allowing users to update instructions from the Editor status screen.
- **Frame.io Video Delivery Detection System (August 12, 2025)**: Successfully implemented automatic video delivery detection using Frame.io V4 webhooks. When editors upload completed videos to project folders, the system automatically detects video assets (by media_type), updates project status to "video is ready", sends email notifications to users, and stores video metadata in project_files table. Webhook handler processes 'asset.processing_complete' events and verifies video uploads belong to projects in "edit in progress" status. System provides seamless delivery workflow with Frame.io view URLs for video playback integration.

## User Preferences
Preferred communication style: Simple, everyday language.
Frame.io Account: V4 account with OAuth authentication successfully configured via Adobe Developer Console.
Design Standard: NEVER use blue colors anywhere in the app - all blue instances must be cyan (hsl(180, 85%, 55%)). This is a permanent design requirement.

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