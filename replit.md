# replit.md

## Overview
Mementiq is a professional video editing services website, designed as a modern full-stack web application. It functions as a landing page and lead generation platform for video editing services, featuring a subscription-based pricing model with email capture. The project aims to provide a comprehensive platform for users to manage video projects, track subscription usage, and seamlessly interact with video editing services.

## User Preferences
Preferred communication style: Simple, everyday language.
Frame.io Account: V4 account with OAuth authentication successfully configured via Adobe Developer Console.
Design Standard: NEVER use blue colors anywhere in the app - all blue instances must be cyan (hsl(180, 85%, 55%)). This is a permanent design requirement.

## Recent Changes (August 18, 2025)
- **ENHANCED REVISION PAYMENT FLOW WITH POPUP APPROACH:**
  - ✅ Implemented popup-based payment flow instead of redirect approach (better UX in Replit environment)
  - ✅ Created prominent RevisionPaymentPopup component with clear visual feedback
  - ✅ Added "Editor is on it" screen (EditorWorkingScreen) shown after successful payment
  - ✅ Projects in "revision in progress" status show dedicated "View Revision Status" button
  - ✅ Enhanced popup modal with glowing border, pulsing payment amount, and clear instructions
  - ✅ Users can manually retry opening payment window if popup is blocked
  - ✅ Automatic payment status monitoring every 2 seconds while popup is open
  - ✅ Clear screen change ensures users know payment is in progress even if popup blocked
  - ✅ Hidden "Need Changes" and "Next Steps" sections during payment popup for better visibility
  - ✅ Made payment dialog static (removed distracting "checking" status changes) for smoother UX
  - ✅ After successful payment, users return to normal revision workflow (stage 3) instead of success screen
  - ✅ Tally form step automatically skipped for revision requests - goes directly from upload to submission
  - ✅ Revision workflow clearly marked with "Instructions (Skipped for Revision)" in progress indicator
  - ✅ Submit button changes to "Submit for Revision" instead of "Send to Editor" for revision workflows

## Earlier Changes (August 14, 2025)
- Fixed corrupted database configuration that was preventing app startup
- **IMPLEMENTED AUTOMATIC VIDEO ASSET DETECTION SERVICE:**
  - ✅ Created automatic background service that checks for new video uploads every 5 minutes
  - ✅ Detects when videos are uploaded to projects in "Edit in Progress" status
  - ✅ Automatically transitions projects to "Video is Ready" when videos are found
  - ✅ Sends email notifications and updates timestamps when videos are detected
  - ✅ Test 10 successfully transitioned from "Edit in Progress" to "Video is Ready" via automatic detection
  - ✅ Service provides manual trigger endpoint for testing and debugging
  - ✅ Runs continuously in background to ensure no video deliveries are missed
- **ENHANCED ASSET DETECTION WITH TIMESTAMP FILTERING:**
  - ✅ Added `submittedToEditorAt` timestamp field to projects table
  - ✅ Asset detection now only processes videos uploaded AFTER project submission to editor
  - ✅ When multiple videos are detected, only the most recently uploaded video is used
  - ✅ "Send to Editor" action now properly sets submission timestamp for accurate filtering
  - ✅ Enhanced logging shows video upload times vs submission times for debugging
  - ✅ Prevents false positives from videos uploaded during initial project setup
- **FIXED FRAME.IO LAST UPDATED DATE CALCULATION:**
  - ✅ Resolved missing `refresh_locks` table preventing Frame.io token refresh
  - ✅ Fixed SQL parameter syntax for PostgreSQL compatibility  
  - ✅ Eliminated "Frame.io ready" console messages that might appear as popups
  - ✅ Test 9 and other completed projects now properly calculate Last Updated from Frame.io asset activity instead of falling back to database timestamps
  - ✅ Token refresh mechanism now works properly for consistent Frame.io API access
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
- **COMPLETED FRAME.IO V4 SHARE CREATION (August 16, 2025):**
  - ✅ Fixed Frame.io V4 API share creation using correct `type: 'asset'` discriminator
  - ✅ Removed unsupported fields (`allow_comments`, `allow_downloads`) from V4 API requests  
  - ✅ Implemented proper 2-step process: create share + add asset to share
  - ✅ Successfully generating f.io short URLs for public access without login
  - ✅ Both share URL and share UUID stored in database for future reference without API calls
  - ✅ Test 10 confirmed working with share link: https://f.io/BC9_Q8JH
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
- **FIXED SEND TO EDITOR WORKFLOW:**
  - ✅ "Send to Editor" confirmation now properly updates UI to show "Edit in Progress" state
  - ✅ Instead of closing dialog, updates selectedProject status and stays on confirmation screen
  - ✅ Confirmation screen automatically detects status change and shows appropriate "submitted" view
  - ✅ Users can now see immediate feedback that project was successfully sent to editor
- **DATABASE-DRIVEN TIMESTAMP TRACKING:**
  - ✅ Implemented reliable database-only "Last Updated" tracking for all key project actions
  - ✅ Added `updateProjectTimestamp()` helper function with consistent logging
  - ✅ Project listing now uses database timestamps only (no Frame.io API calls for performance)
  - ✅ All key actions tracked: project creation, asset uploads, form submissions, video delivery, acceptance, revisions
- **FIXED FRAME.IO ASSET STATUS WORKFLOW:**
  - ✅ Project acceptance now correctly updates Frame.io assets to "Approved" status (was "Accepted")  
  - ✅ Enhanced asset detection logic to find video files in correct project folders
  - ✅ Improved folder structure handling for projects with missing mediaFolderId
  - ✅ Frame.io V4 API workflow tracking implemented (V4 doesn't support direct status updates)

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