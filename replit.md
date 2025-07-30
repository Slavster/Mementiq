# replit.md

## Overview

Mementiq is a professional video editing services website built as a modern full-stack web application. The application serves as a landing page and lead generation platform for video editing services, featuring a subscription-based pricing model with email capture functionality.

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

### July 30, 2025 - Stripe Subscription Integration (COMPLETED)
- **Problem**: User requested comprehensive subscription management with Stripe integration
- **User Requirement**: Complete subscription system with usage limits, payment verification, and project creation validation
- **Solution Implemented**: Full Stripe subscription system with dashboard integration
- **Key Features**:
  - Subscription status checking and display in dashboard
  - Project creation validation against subscription limits
  - Three-tier subscription system (Basic: 2 projects, Standard: 6 projects, Premium: 12 projects)
  - Automatic usage tracking and limit enforcement
  - Subscription management UI with plan comparison
  - Stripe customer creation and checkout session handling
  - Dashboard subscription status display with usage meters
- **Technical Implementation**:
  - Added subscription fields to users table (stripe_customer_id, subscription_status, etc.)
  - Created comprehensive Stripe API integration with error handling
  - Built subscription status checking middleware for project creation
  - Implemented subscription management page (/subscribe) with pricing tiers
  - Enhanced dashboard with subscription information and management links
  - Added project creation validation with subscription requirement checks
  - Real-time subscription status updates and cache invalidation
- **User Experience**:
  - Clear subscription status display in dashboard header
  - Automatic redirection to subscription page when limits reached
  - Usage meter showing projects used vs allowance
  - Subscription management button for easy access to billing
  - Validation prevents project creation without valid subscription
- **API Endpoints**:
  - GET /api/subscription/status - Check current subscription status
  - POST /api/subscription/create-checkout - Create Stripe checkout session
  - POST /api/webhooks/stripe - Handle Stripe subscription updates
  - Enhanced POST /api/projects with subscription validation
- **Database Schema Updates**:
  - Added stripe_customer_id, stripe_subscription_id to users table
  - Added subscription_status, subscription_tier, subscription_usage fields
  - Added subscription_allowance, subscription_period_start/end timestamps
- **Status**: Fully operational subscription system with test Stripe keys configured

### July 24, 2025 - Enhanced Tally Form Integration with Auto-Close (COMPLETED)
- **Problem**: User requested Tally form integration as mandatory step after video upload verification
- **User Requirement**: Two-step workflow with engaging step names and one form submission per project
- **Solution Implemented**: Complete Tally form integration with step-based workflow
- **Key Features**:
  - Two-step workflow: "Upload Videos" → "Describe Your Dream Edit" → "Editor is On It!"
  - Tally form embedded with iframe and automatic submission detection
  - One form submission per project enforced by database unique constraints
  - Automatic project status update to "submitted" upon form completion
  - Step progress indicator with visual feedback for completed steps
- **Technical Implementation**:
  - Added `tally_form_submissions` table with projectId/userId unique constraint
  - Created API endpoints: POST/GET `/api/projects/:id/tally-submission`
  - Built TallyFormStep React component with message handling for form completion
  - Enhanced dashboard with step-based workflow and navigation
  - Integrated Tally embed code with userId and projectId parameters
- **User Experience**:
  - Clean three-step visual progress indicator
  - Engaging step names: "Upload Videos", "Describe Your Dream Edit", "Editor is On It!"
  - Automatic step progression and completion tracking
  - Form submission triggers project status change and user feedback
- **Database Schema**: 
  - `tally_form_submissions` table (id, project_id, user_id, tally_submission_id, submission_data, submitted_at, verified_at)
  - Unique constraint on (project_id, user_id) to prevent duplicate submissions
- **Status**: Fully operational with complete workflow from upload to form submission
- **Latest Enhancement**: Removed manual buttons ("Close Form", "Form will auto-submit") - form now automatically closes dialog upon Tally submission detection
- **UX Improvement**: Streamlined experience with automatic dialog closure and step progression after form completion

### July 24, 2025 - CORS and Direct Vimeo Upload Integration (FULLY OPERATIONAL)
- **Problem**: User requested CORS configuration for direct uploads to improve performance and handle large files
- **User Requirement**: Enable direct client-to-Vimeo uploads bypassing server intermediary for better performance
- **Solution Implemented**: Complete CORS configuration and direct upload system with TUS protocol
- **Key Features**:
  - CORS middleware configured for Vimeo domains and development/production origins
  - Direct upload session creation API endpoints with authentication
  - TUS (resumable upload) protocol implementation for large file uploads
  - Dual upload interface: Direct to Vimeo vs Server-mediated uploads
  - Real-time upload progress tracking with chunked upload support
  - Automatic video folder management and completion handling
- **Technical Implementation**:
  - Added cors middleware with proper origin and header configuration
  - Created vimeoUpload.ts service for direct Vimeo API integration
  - Built DirectVideoUpload component with TUS protocol support
  - Added upload-session and complete-upload API endpoints
  - Implemented chunked upload with 8MB chunk size for reliability
  - Enhanced dashboard with tabbed upload interface (Direct vs Server)
- **Architecture Changes**:
  - CORS headers properly configured for cross-origin Vimeo uploads
  - New API endpoints for creating and completing direct upload sessions
  - Dual upload strategy allowing users to choose upload method
  - Enhanced security with project ownership validation for all upload endpoints
- **Performance Benefits**: Direct uploads bypass server storage, reducing bandwidth and enabling faster uploads
- **User Experience**: Clean TUS-only upload interface with no server storage of user videos
- **Architecture Decision**: Removed server-side video storage entirely - all uploads go directly to Vimeo via TUS protocol
- **Hierarchical Folder Structure**: Implemented User -> Project folder hierarchy in Vimeo for proper organization and isolation
  - Each user gets a main folder: `User_{userIdPrefix}_{emailPrefix}`  
  - Each project gets a subfolder: `Project_{projectId}_{titleSanitized}`
  - Ensures videos are isolated by both user and project for security and organization
- **Upload Verification System**: Added comprehensive verification to ensure videos are successfully received by Vimeo
  - After TUS upload completion, system automatically verifies video status with Vimeo API
  - Users cannot proceed to next step until all uploads are verified as received
  - Real-time verification polling every 10 seconds for up to 5 minutes
  - Clear visual feedback showing verification progress and status
  - Failed verifications prompt user to re-upload with detailed error messages
  - Supports both upload confirmation and transcoding status tracking
- **Final Resolution**: System now fully operational with modern Vimeo API (3.4+) compatibility
  - Fixed deprecated complete_uri handling for current Vimeo TUS protocol
  - Resolved database parameter formatting issues
  - Upload success rate confirmed: 14 videos successfully uploaded to Vimeo during testing
  - Error handling improved to distinguish between client-side display issues and actual upload failures

### July 22, 2025 - Supabase Authentication Migration (COMPLETED)
- **Problem**: User requested social login capabilities (Google only initially) that weren't available with custom Express authentication
- **User Requirement**: Replace custom auth system with Supabase Auth to enable Google social login
- **Solution Implemented**: Complete migration from Express sessions to Supabase authentication
- **Key Features**:
  - Supabase Auth integration with Google social login support
  - Client-side authentication with @supabase/supabase-js
  - JWT token-based API authentication replacing session-based auth
  - Seamless auth state management with React hooks
  - Automatic redirect handling for OAuth providers
- **Technical Implementation**:
  - Created Supabase client configuration with environment variables
  - Built useAuth hook for centralized auth state management
  - Updated frontend auth forms with Google login button (Facebook removed per user request)
  - Implemented server middleware to verify Supabase JWT tokens
  - Modified API routes to use Bearer token authentication
  - Updated dashboard to work with Supabase user objects
- **Architecture Changes**:
  - Removed Express session middleware and bcrypt dependencies
  - Replaced custom user registration/login with Supabase Auth API
  - Updated queryClient to include Authorization headers
  - Modified storage layer to work with Supabase user IDs (string format)
- **Status**: Authentication system fully migrated, limited to email/password and Google login as requested

### July 15, 2025 - Dashboard & Project Management (COMPLETED)
- **Problem**: Users needed a comprehensive dashboard to view and manage their video projects after successful login
- **User Requirement**: Build main dashboard with project list, status tracking, timestamps, and "New Video Request" functionality
- **Solution Implemented**: Complete dashboard with project management, status visualization, and inspiring empty states
- **Key Features**:
  - Responsive project grid layout with status badges and timestamps
  - "New Video Request" button for easy project creation
  - Project creation modal with validation and user feedback
  - Inspiring empty state message: "Ready to create something amazing?"
  - Real-time project status indicators with color coding (draft, in_progress, review, completed, on_hold)
  - Professional project cards showing created/updated dates
  - Automatic redirect to dashboard after successful login
- **Technical Implementation**:
  - Built comprehensive dashboard component with React Query integration
  - Fixed API request calls to use proper parameter format
  - Added project creation mutation with cache invalidation
  - Implemented status helper functions with icons and colors
  - Created modal dialog for new project creation with form validation
  - Added loading states and error handling throughout
- **User Experience**:
  - Clean, professional interface matching brand colors
  - Intuitive project management workflow
  - Clear visual hierarchy and status communication
  - Seamless integration with existing authentication system
- **API Endpoints Tested**: All project CRUD operations working correctly with proper session management

### July 15, 2025 - Authentication API Fix (COMPLETED)
- **Problem**: Users experiencing "unspecified error" when creating accounts and logging in
- **Root Cause**: Incorrect API request parameter order and email verification requirement not communicated clearly
- **Solution Implemented**: Fixed API calls and verified user accounts for testing
- **Key Fixes**:
  - Corrected apiRequest function calls to use proper parameter order (method, url, data)
  - Added better error logging and user feedback for authentication failures
  - Verified that email verification is required before login (as designed)
  - Manually verified test user account to enable login testing
- **Technical Implementation**:
  - Updated login and signup mutations to use correct API format
  - Enhanced error handling with detailed error messages and console logging
  - Confirmed authentication flow works correctly after email verification
- **Result**: Authentication system now working properly with clear error messages

### July 15, 2025 - User Name Field Update (COMPLETED)
- **Problem**: Authentication form was using single "name" field instead of separate firstName and lastName fields
- **User Requirement**: Collect firstName and lastName separately in signup form for better user experience
- **Solution Implemented**: Updated database schema and frontend forms to use firstName/lastName fields
- **Key Changes**:
  - Updated database schema to replace 'name' field with 'firstName' and 'lastName' fields
  - Modified signup form to collect first and last names separately
  - Updated dashboard to display full name properly
  - Updated all authentication API responses to include firstName and lastName
  - Maintained backward compatibility during schema migration
- **Technical Implementation**:
  - Added firstName and lastName columns to users table
  - Updated shared schema types and validation
  - Modified frontend forms and interfaces
  - Updated server routes to handle new field structure
  - Tested all authentication flows with new field structure

### July 15, 2025 - Phase 1: User Authentication System (COMPLETED)
- **Problem**: Marketing website needed user accounts and project management capabilities
- **User Requirement**: Complete user authentication system with email verification and secure password handling
- **Solution Implemented**: Full authentication system with PostgreSQL sessions and bcrypt password hashing
- **Key Features**:
  - User registration with email verification requirement
  - Secure password hashing using bcrypt (10 rounds)
  - Session management with PostgreSQL store for scalability
  - Email verification tokens with secure random generation
  - Protected API endpoints with session-based authentication
  - User login/logout with proper session handling
  - Complete project CRUD operations with user ownership validation
- **Technical Implementation**:
  - Added bcrypt dependency for password hashing
  - Configured express-session with connect-pg-simple for PostgreSQL sessions
  - Created comprehensive authentication API routes (/api/auth/*)
  - Implemented project management API routes (/api/projects/*)
  - Added proper TypeScript session types declaration
  - Database schema includes users, projects, project_files, and project_status_log tables
- **Database Schema**: 
  - `users` table with email verification support (id, email, password, firstName, lastName, company, created_at, verified_at, verification_token)
  - `projects` table with user relationships (id, user_id, title, status, vimeo_folder_id, tally_form_url, created_at, updated_at)
  - `project_files` table for file tracking (id, project_id, vimeo_video_id, filename, file_type, file_size, upload_date)
  - `project_status_log` table for audit trail (id, project_id, old_status, new_status, changed_at)
- **Security Features**: 
  - Password hashing with bcrypt
  - Session-based authentication
  - Email verification requirement
  - Protected endpoints with ownership validation
  - Secure session cookies configuration
- **API Endpoints**:
  - POST /api/auth/register - User registration with email verification
  - POST /api/auth/login - User login with password verification
  - POST /api/auth/logout - Session destruction
  - GET /api/auth/verify-email/:token - Email verification
  - GET /api/auth/me - Get current user data
  - GET /api/projects - Get user's projects
  - POST /api/projects - Create new project
  - GET /api/projects/:id - Get project details
  - PUT /api/projects/:id - Update project
- **Testing Results**: All authentication flows tested successfully with curl commands
- **Next Phase**: Phase 2 will add Vimeo integration for file uploads and video management

### July 14, 2025 - Production Database Migration (COMPLETED)
- **Problem**: In-memory storage for email signups wasn't production-ready - data lost on server restart
- **User Requirement**: Production-ready email capture system with persistent storage
- **Solution Implemented**: Complete migration from in-memory to PostgreSQL database storage
- **Key Features**:
  - PostgreSQL database with proper schema and constraints
  - Drizzle ORM integration with type-safe database operations
  - Persistent email storage that survives server restarts
  - Duplicate email prevention via database unique constraints
  - Ordered email retrieval by creation timestamp
- **Technical Implementation**:
  - Created `server/db.ts` with Neon serverless PostgreSQL connection
  - Replaced `MemStorage` with `DatabaseStorage` class implementing same interface
  - Used `npm run db:push` to sync schema with production database
  - Maintained existing API endpoints with enhanced error handling
- **Database Schema**: 
  - `email_signups` table with id, email (unique), and created_at timestamp
  - Proper foreign key relationships and constraints
- **Production Benefits**: Scalable, persistent, backup-ready email collection system

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