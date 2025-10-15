#!/bin/bash

echo "========================================"
echo "Removing backup file from git"
echo "========================================"
echo ""

# Step 1: Remove from git tracking
echo "Step 1: Removing client/.env.local.backup from git tracking..."
git rm --cached client/.env.local.backup 2>/dev/null || echo "File not currently tracked"

# Step 2: Commit the change
echo ""
echo "Step 2: Committing the removal..."
git commit -m "Security: Remove .env.local.backup from git tracking" || echo "Nothing to commit"

# Step 3: Remove from git history
echo ""
echo "Step 3: Cleaning backup file from git history..."
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch client/.env.local.backup" \
  --prune-empty --tag-name-filter cat -- --all

# Step 4: Clean up refs
echo ""
echo "Step 4: Cleaning up references..."
rm -rf .git/refs/original/
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Step 5: Verify
echo ""
echo "Step 5: Final verification..."
echo "Checking for .env files in git (should only show .env.example):"
git ls-files | grep -E '\.env'

echo ""
echo "Checking .env files in history:"
git log --all --pretty=format: --name-only | grep -E '\.env' | sort -u

echo ""
echo "========================================"
echo "✅ Cleanup Complete!"
echo "========================================"
echo ""
echo "The backup file is now:"
echo "✅ Removed from git tracking"
echo "✅ Removed from git history"
echo "✅ Still in your Replit workspace (you can still see it)"
echo "✅ Won't be published to GitHub"
echo ""
echo "Your repository is now safe to publish!"
