# Asset Detection: New Files vs Version Updates

## ✅ ENHANCED DETECTION IMPLEMENTED

The polling system now detects **BOTH** new files and version updates of existing files.

## Detection Comparison

### Previous Implementation ❌
- **Only detected**: New files with `created_at` timestamp after revision request
- **Missed**: Version updates of existing files (Frame.io version stacking)
- **Problem**: If editor uploaded a new version of the same file, it wouldn't be detected

### Current Implementation ✅
- **Detects**: New files via `created_at` timestamp
- **Detects**: Version updates via `updated_at` timestamp  
- **Logic**: Checks whichever is more recent between `created_at` and `updated_at`

## How Frame.io Handles Versions

### Scenario 1: Brand New File Upload
```
File: revision_v1.mp4
created_at: 2025-08-20T10:00:00Z
updated_at: 2025-08-20T10:00:00Z
```
✅ **Detected**: created_at is after revision request

### Scenario 2: Version Update (Same File)
```
File: original_video.mp4
created_at: 2025-08-14T09:00:00Z  ← Original upload (before revision)
updated_at: 2025-08-20T10:00:00Z  ← New version uploaded
```
✅ **Detected**: updated_at is after revision request

## Technical Implementation

```typescript
// Enhanced detection logic
const createdTime = new Date(asset.created_at);
const updatedTime = new Date(asset.updated_at || asset.created_at);
const latestTime = Math.max(createdTime, updatedTime);

// Check if asset activity is after revision request
const isAfterTimestamp = latestTime > timestampToCheck;
```

## Testing Validation

To validate version detection works:

1. **Test New File**: Upload a completely new file to a revision project
   - Expected: Detected via `created_at`
   - Log shows: "created [date], checking against [revision date]: true"

2. **Test Version Update**: Upload a new version of existing file
   - Expected: Detected via `updated_at`  
   - Log shows: "created [old date], updated [new date], checking against [revision date]: true (version update detected)"

## Polling Schedule

- **Frequency**: Every 5 minutes
- **Detection delay**: 0-5 minutes after upload
- **Status monitored**: 
  - "edit in progress" → initial videos
  - "revision in progress" → revision videos

## Webhook Alternative (Commented Out)

The code still contains the webhook handler for `file.versioned` events, which would provide instant detection. It's currently commented out but can be enabled if needed.

## Summary

✅ **New files**: Detected via created_at
✅ **Version updates**: Detected via updated_at
✅ **Both scenarios**: Fully covered
✅ **No configuration needed**: Works automatically
✅ **Frame.io version stacking**: Fully supported

The system now comprehensively detects both completely new uploads AND version updates of existing files!