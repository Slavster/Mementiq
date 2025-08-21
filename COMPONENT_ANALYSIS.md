# Component Analysis: FrameioUploadInterface & FrameVideo

## 1. FrameioUploadInterface Component

### Where It's Used (Downstream):
1. **Dashboard.tsx** - Main dashboard page
   - Used when creating a new project
   - Appears in the upload modal for uploading videos/photos
   - Line ~2000+: Rendered when `isUploading` state is true

2. **RevisionModal.tsx** - Revision workflow
   - Used in Step 2: "Upload Footage (Optional)"
   - Allows users to upload additional footage during revision process
   - Line ~600+: Rendered in the upload footage step

### What It Depends On (Upstream):
- **API Endpoints:**
  - `/api/frameio/upload/create-session` - Creates upload session
  - `/api/frameio/upload/complete` - Completes upload
  - `/api/frameio/folders/:folderId/videos` - Gets folder videos
  - `/api/frameio/review-link` - Creates review links
  - `/api/frameio/upload/verify` - Verifies upload completion

- **UI Components:**
  - Button, Card, Progress, Alert from shadcn/ui
  - Upload, CheckCircle, AlertCircle icons from lucide-react
  - TUS client for resumable uploads

- **External Services:**
  - Frame.io V4 API (through server proxy)
  - TUS protocol for chunked uploads

### Main Functionality:
- Handles file selection and validation
- Creates Frame.io upload sessions
- Manages TUS resumable uploads with progress tracking
- Completes uploads and verifies them
- Supports both video and photo uploads
- Shows upload progress with visual feedback

---

## 2. FrameVideo Component

### Where It's Used (Downstream):
1. **VideoViewingStep.tsx** - Video viewing/acceptance flow
   - ONLY place where FrameVideo is used
   - Embeds Frame.io player for video preview
   - Line 7: Import statement (but component is NOT actually rendered!)

### What It Depends On (Upstream):
- **No dependencies** - The component is defined but NOT USED
- Would embed Frame.io iframe if it were used

### Main Functionality (if it were used):
- Would display Frame.io embedded video player
- Would handle iframe security and sandboxing
- Currently NOT RENDERED anywhere in the app

---

## Component Flow Diagram

```
User Actions
     |
     v
Dashboard.tsx -----> New Project Creation
     |                      |
     |                      v
     |              FrameioUploadInterface
     |                      |
     |                      v
     |              Frame.io V4 API
     |                  (via server)
     |
     v
Project Status: "Video is Ready"
     |
     v
VideoViewingStep.tsx
     |
     |---> Accept Video (Complete)
     |
     |---> Request Revision
            |
            v
     RevisionModal.tsx
            |
            |---> Step 1: Video Review
            |
            |---> Step 2: Upload Footage
            |        |
            |        v
            |    FrameioUploadInterface
            |        |
            |        v
            |    Frame.io V4 API
            |
            |---> Step 3: Submit to Editor
```

---

## Key Observations

1. **FrameioUploadInterface** is actively used in 2 places:
   - Dashboard for initial project uploads
   - RevisionModal for additional footage uploads

2. **FrameVideo** component exists but is NOT actually used:
   - Imported in VideoViewingStep.tsx but never rendered
   - This is dead code that could be removed
   - Video viewing is handled differently (using Frame.io share links opened externally)

3. **Data Flow:**
   - Uploads go through: Client → Express Server → Frame.io V4 API
   - Server acts as proxy to handle authentication and tokens
   - TUS protocol enables resumable uploads directly to Frame.io

4. **Security:**
   - All Frame.io API calls go through server (no direct client access)
   - Service account token managed server-side
   - Share links expire after 30 days for security

---

## Recommendations

1. **Remove FrameVideo component** - It's not being used anywhere
2. **Keep FrameioUploadInterface** - It's critical for both initial uploads and revisions
3. The upload interface is well-integrated and properly abstracted through server endpoints