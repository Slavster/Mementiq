#!/usr/bin/env node

import { Client } from "@replit/object-storage";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Object Storage client
const ObjectStorage = new Client();

// Define video assets with their source paths and normalized destination names
// Mapped to match the exact references in portfolio-section.tsx
const videoAssets = [
  {
    source: "EditingPortfolioAssets/Videos/Tu Lan Cave Final.mp4",
    dest: "travel-video.mp4"  // Travel Vlog Magic
  },
  {
    source: "EditingPortfolioAssets/Videos/Coaching Ad Final.mp4",
    dest: "coaching-ad.mp4"  // Coaching Ad
  },
  {
    source: "EditingPortfolioAssets/Videos/Conference Interviews.mp4",
    dest: "conference-interviews.mp4"  // Captivating Interviews
  },
  {
    source: "EditingPortfolioAssets/Videos/Swap in the City Final.mp4",
    dest: "event-promo.mp4"  // Event Highlights (clothing swap)
  },
  {
    source: "EditingPortfolioAssets/Videos/Sun n Sea-FINAL.mp4",
    dest: "product-ad.mp4"  // Product Showcase (Sun n wear)
  }
];

// Ensure videos directory exists
const videosDir = path.join(__dirname, "client", "public", "videos");
if (!fs.existsSync(videosDir)) {
  fs.mkdirSync(videosDir, { recursive: true });
  console.log(`📁 Created directory: ${videosDir}`);
}

console.log("🎬 Starting video download from Object Storage...");
console.log(`📂 Destination: ${videosDir}`);
console.log("");

// Download each video
let successCount = 0;
let failCount = 0;

for (const asset of videoAssets) {
  try {
    console.log(`⏬ Downloading: ${asset.source}`);
    console.log(`   → Saving as: ${asset.dest}`);
    
    // Download from Object Storage
    const data = await ObjectStorage.get(asset.source);
    
    if (!data) {
      console.error(`   ❌ Failed: File not found in Object Storage`);
      failCount++;
      continue;
    }
    
    // Convert to Buffer if needed
    let buffer;
    if (Buffer.isBuffer(data)) {
      buffer = data;
    } else if (data.value) {
      // Handle BytesResult format
      if (Buffer.isBuffer(data.value)) {
        buffer = data.value;
      } else if (Array.isArray(data.value)) {
        // Convert array of buffers to single buffer
        buffer = Buffer.concat(data.value.map(item => 
          Buffer.isBuffer(item) ? item : Buffer.from(item)
        ));
      } else {
        buffer = Buffer.from(data.value);
      }
    } else {
      buffer = Buffer.from(data);
    }
    
    // Write to destination
    const destPath = path.join(videosDir, asset.dest);
    fs.writeFileSync(destPath, buffer);
    
    const fileSize = (buffer.length / (1024 * 1024)).toFixed(2);
    console.log(`   ✅ Success: ${fileSize} MB saved`);
    successCount++;
    
  } catch (error) {
    console.error(`   ❌ Failed: ${error.message}`);
    failCount++;
  }
  
  console.log("");
}

// Summary
console.log("========================================");
console.log("📊 Download Summary:");
console.log(`   ✅ Successful: ${successCount} videos`);
if (failCount > 0) {
  console.log(`   ❌ Failed: ${failCount} videos`);
}
console.log("");

// List downloaded files
const downloadedFiles = fs.readdirSync(videosDir).filter(f => f.endsWith('.mp4'));
if (downloadedFiles.length > 0) {
  console.log("📹 Downloaded videos:");
  downloadedFiles.forEach(file => {
    const filePath = path.join(videosDir, file);
    const stats = fs.statSync(filePath);
    const fileSize = (stats.size / (1024 * 1024)).toFixed(2);
    console.log(`   • ${file} (${fileSize} MB)`);
  });
} else {
  console.log("⚠️ No videos found in destination directory");
}

console.log("");
console.log("✨ Video download process complete!");
console.log("");
console.log("Next steps:");
console.log("1. Run: npm run build");
console.log("2. Deploy to production");
console.log("========================================");

process.exit(failCount > 0 ? 1 : 0);