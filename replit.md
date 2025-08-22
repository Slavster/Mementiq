# replit.md

## Overview
Mementiq is a full-stack web application designed as a professional video editing services website. It serves as a landing page and lead generation platform, offering subscription-based pricing with integrated email capture. The project's core purpose is to provide a comprehensive platform for users to manage video projects, track subscription usage, and seamlessly interact with video editing services.

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
- **Session Management**: Express sessions with PostgreSQL store.

### Database Schema
- `users`: User authentication and subscription details.
- `email_signups`: Email capture for lead generation.
- `projects`: Video projects managed by users, including status tracking and media platform identifiers.
- `project_files`: Tracks files associated with projects.
- `photo_files`: Tracks photo files associated with projects.
- `project_status_log`: Audit trail for project status changes.
- `revision_payments`: Tracks revision payments with Stripe session IDs.
- `trello_cards`: Maps projects to Trello cards with card IDs, types (initial/revision), assigned editors, and completion tracking.
- `trello_config`: Stores Trello board and list configuration for automation.

### Core Features
- **User Authentication**: Supabase Auth integration for email/password and Google social login with JWT token-based API authentication.
- **Subscription Management**: Full Stripe integration with a three-tier model, real-time usage tracking, and project creation validation against limits.
- **Project Management Dashboard**: Comprehensive dashboard for users to view, create, and manage video projects with status tracking (`draft`, `awaiting instructions`, `edit in progress`, `video is ready`, `complete`, `revision in progress`). Includes automatic project status updates upon payment or video asset detection.
- **Video & Photo Upload System**: Utilizes Frame.io API for direct client-to-platform uploads (TUS protocol), managing video and photo assets, generating review links, and handling hierarchical folder structures (User -> Project). Employs a centralized, automatically refreshed token system for Frame.io V4 API with robust security measures. Frame.io folders are created only upon "New Video Request" and enforce a maximum 2-level hierarchy.
- **Tally Form Integration**: Integrated as a mandatory step for users to provide editing instructions.
- **Video Delivery Detection**: Automatic background service detects new video uploads, transitions projects to "Video is Ready", and sends notifications. Asset detection filters by submission timestamp to avoid false positives.
- **Public Share Creation**: Implementation of Frame.io V4 public share system with proper API schema compliance, including intelligent share reuse and project-level security. Share links are stored at both file and project level (frameioReviewLink). IMPORTANT: Share links are generated ONLY once during "Video is Ready" stage and reused throughout the entire project lifecycle - no new share links should be created after initial generation. The API endpoint `/api/projects/:id/video-share-link` now checks for existing project-level share link FIRST before attempting any Frame.io operations.
- **Email Capture**: Persistent storage for email signups.
- **Revision Payment Flow**: Implemented a popup-based payment flow for revisions with immediate UI feedback, automatic payment status monitoring, and comprehensive payment tracking including `revision_count` per project. Projects automatically update to "awaiting revision instructions" status after successful payment.
- **Revision Instructions Interface**: Complete 4-step revision workflow redesigned as extension of video viewing stage:
  - Step 1: Video Review - Identical to video viewing screen with Frame.io link button, revision comments added directly on timeline
  - Step 2: Upload Footage (Optional) - Reuses existing upload interface with folder asset checking
  - Step 3: Submit to Editor - Confirmation screen with warning text, checklist, and irreversible submission
  - Step 4: Video Ready (Placeholder) - For future implementation
  Navigation allows back/forward until submission, after which "Editor is on it" screen displays and status updates to "revision in progress".
- **Trello Integration**: Comprehensive workflow automation that creates and manages Trello cards for project lifecycle tracking:
  - Automatically creates initial project cards when submitted to editor with client info, Frame.io links, Tally form responses, and subscription details
  - Moves cards to "Done" when videos are delivered (both initial and revision)
  - Creates revision cards with original editor assignment inheritance and Frame.io review links
  - Supports configurable board setup with separate lists for todo, done, and optionally revisions
  - Includes project metadata storage (project ID, revision count, editor assignments) embedded in card descriptions
  - All operations are one-way (app to Trello) to avoid webhook complexity and stay within free Trello plan limits

## Recent Changes
- **2025-08-22**: Enhanced Trello integration with subscription tier labels and bidirectional card linking - Moved subscription information from card descriptions to visual color-coded labels (Growth Accelerator: Red, Consistency Club: Orange, Creative Spark: Yellow) for better filtering and organization. Implemented comprehensive bidirectional linking system between original project cards and revision cards using Trello's attachment feature with duplicate prevention. Cards now cross-reference each other with clear naming conventions, making it easy for editors to navigate between related requests and maintain full project context during revisions
- **2025-08-22**: Implemented comprehensive Trello integration with enhanced card formatting - Added complete Trello API service with board/list management, card creation/updates, and editor assignment tracking. Cards now include submission dates (both project creation and editor submission timestamps), complete client information (email, company), and beautifully formatted Tally form Q&A sections. Integrated automation triggers at key project lifecycle points: initial submission (creates project card with all client/project details), video delivery (moves cards to done), revision requests (creates revision cards with editor inheritance), and revision completion (marks revision cards done). System designed for one-way communication (app to Trello) to stay within free plan limits
- **2025-08-21**: Implemented 30-day expiration for all Frame.io share links - All newly created share links now automatically expire after 30 days for enhanced security. Share creation process updated to include PATCH request setting expiration timestamp using ISO-8601 format
- **2025-08-18**: Fixed revision submission flow - corrected apiRequest handling in RevisionModal.tsx to properly handle returned JSON data instead of treating it as Response object, resolving "undefined" errors during submission
- **2025-08-18**: Improved revision workflow UX - step 3 ("Submit to Editor") now transforms in-place to show "Editor is on it!" confirmation screen without changing steps, then auto-closes after 3 seconds for seamless user experience
- **2025-08-18**: Fixed revision submission errors - removed unnecessary Frame.io API calls from revision request endpoint that were causing submission failures. Revision submission now only updates project status and logs changes without external API dependencies
- **2025-08-18**: Completed revision modal UI consistency - step tracker now matches upload modal styling with w-8 h-8 circles, cyan color scheme, and proper back button behavior (disappears after submission)
- **2025-08-18**: Revised revision modal UI - replaced emojis with appropriate icons (Edit3, MessageCircle, Info), updated all text content per user requirements, added Frame.io instructions section emphasizing comments must be left within Frame.io, made modal scrollable, and removed all unnecessary navigation buttons at bottom
- **2025-08-18**: Fixed revision workflow share link retrieval - API endpoint now checks project-level frameioReviewLink FIRST before any Frame.io operations, ensuring NO new share links can be created during revision process
- **2025-08-18**: Removed misleading toast notifications about "Share Link Created!" in revision workflow - links are only retrieved, never created
- **2025-08-18**: Updated database with correct share link (https://f.io/BC9_Q8JH) and video filename (Me - tu lan cave.mp4) for project 16
- **2025-08-18**: Fixed file size display - API now fetches real-time Frame.io asset data for revision projects to show accurate file sizes instead of cached database values
- **2025-08-19**: Enhanced polling-based asset detection to support revision workflow - AssetDetectionService now monitors both "edit in progress" and "revision in progress" statuses, detecting new videos based on appropriate timestamps (submission date for initial edits, revision request date for revisions). System runs every 5 minutes to detect uploads for both initial deliveries and revisions, providing a simple and reliable solution without external dependencies. Webhook infrastructure code preserved but commented out for potential future use
- **2025-08-21**: Unified video review experience - Replaced ProjectAcceptanceModal with VideoViewingStep for all video review flows (both initial delivery and revision completion). VideoViewingStep provides superior UX with integrated payment functionality for revisions, detailed Frame.io instructions, confetti animation on acceptance, and comprehensive video information. This consolidation eliminates code duplication and ensures consistent user experience across all video review scenarios
- **2025-08-21**: Removed distracting share link popups from VideoViewingStep - The "Creating Share Link" and "Share Link Created!" toast notifications have been removed to improve user experience. The Frame.io link button now opens directly without popup distractions, maintaining only error notifications when necessary
- **2025-08-21**: Changed all orange color instances to pink throughout the dashboard - Updated status badge colors for "awaiting instructions", "awaiting revision instructions", and "revision in progress" from orange to pink. Modified all orange buttons, alerts, and warning messages to use pink color scheme for better visual consistency with the overall design
- **2025-08-21**: Removed unnecessary "Video Accepted!" toast notification - The popup notification that appeared after accepting a video has been removed as requested. The confetti animation alone provides sufficient visual feedback for video acceptance
- **2025-08-21**: Updated neon green color scheme with black text - Changed all neon green buttons and UI elements to use black text instead of white text for better visual consistency with the cyan button design. This includes status badges, action buttons, step progress indicators, and all completion states throughout the dashboard
- **2025-08-21**: Added yellow hover states to green buttons matching cyan button behavior - Updated all green button hover states to turn yellow (hsl(45, 93%, 58%)) for clear interaction feedback, creating consistent button behavior across different color schemes (green and cyan)
- **2025-08-21**: Updated status indicators to black backgrounds with colored borders and text - Changed all project status badges from solid colored backgrounds to black backgrounds with colored borders and text to make them visually distinct from clickable buttons and prevent accidental clicks. Applied to both project status badges and account status indicators (verified status, subscription tiers, etc.)

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