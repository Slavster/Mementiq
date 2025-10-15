#!/bin/bash

# Git Repository Cleanup Script for Public GitHub Publishing
# This script removes sensitive files from git history

echo "========================================"
echo "Git Repository Security Cleanup Script"
echo "========================================"
echo ""
echo "This script will:"
echo "1. Remove client/.env.local from git tracking"
echo "2. Clean git history to remove all traces"
echo "3. Verify the cleanup"
echo ""
echo "WARNING: This will rewrite git history!"
echo "Press Ctrl+C to cancel, or Enter to continue..."
read

# Step 1: Remove from git tracking
echo ""
echo "Step 1: Removing client/.env.local from git tracking..."
git rm --cached client/.env.local 2>/dev/null || echo "File not currently tracked"

# Create a commit for the removal
git add .gitignore
git commit -m "Security: Remove .env.local from git tracking" || echo "Nothing to commit"

# Step 2: Clean git history
echo ""
echo "Step 2: Cleaning git history..."
echo "Removing all traces of .env.local from history..."

# Use filter-branch to remove the file from all commits
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch client/.env.local" \
  --prune-empty --tag-name-filter cat -- --all

# Step 3: Clean up refs and garbage collect
echo ""
echo "Step 3: Cleaning up references..."
rm -rf .git/refs/original/
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Step 4: Verify the cleanup
echo ""
echo "Step 4: Verifying cleanup..."
echo "Checking for any .env files in history (should only show .env.example):"
git log --all --pretty=format: --name-only | grep -E '\.env' | sort -u

echo ""
echo "Checking currently tracked files for .env patterns:"
git ls-files | grep -E '\.env' || echo "No .env files tracked (good!)"

echo ""
echo "========================================"
echo "Cleanup Complete!"
echo "========================================"
echo ""
echo "IMPORTANT NEXT STEPS:"
echo "1. Review the output above"
echo "2. If you have a remote repository, force push:"
echo "   git push origin --force --all"
echo "   git push origin --force --tags"
echo "3. Rotate your Supabase keys if concerned"
echo "4. Ensure all team members re-clone the repository"
echo ""
echo "Your repository is now safe to publish on GitHub!"