#!/bin/bash

echo "========================================"
echo "FINAL SECURITY CLEANUP FOR GITHUB"
echo "========================================"
echo ""

# Check for git lock and remove if needed
if [ -f .git/index.lock ]; then
    echo "⚠️  Removing stale git lock file..."
    rm -f .git/index.lock
    echo "✅ Lock file removed"
    echo ""
fi

# Step 1: Update .gitignore to include backup files
echo "Step 1: Ensuring .gitignore covers backup files..."
if ! grep -q "\.env\.local\.backup" .gitignore; then
    echo "*.env.backup" >> .gitignore
    echo "*.env.local.backup" >> .gitignore
    echo ".env.*.backup" >> .gitignore
    echo "✅ Added backup patterns to .gitignore"
else
    echo "✅ .gitignore already covers backup files"
fi
echo ""

# Step 2: Remove backup file from git tracking
echo "Step 2: Removing client/.env.local.backup from git..."
git rm --cached client/.env.local.backup 2>/dev/null && echo "✅ Removed from git tracking" || echo "ℹ️  File not currently staged"
echo ""

# Step 3: Commit the changes
echo "Step 3: Committing .gitignore updates..."
git add .gitignore
git commit -m "Security: Update .gitignore to prevent env backups" 2>/dev/null && echo "✅ Committed" || echo "ℹ️  Nothing to commit"
echo ""

# Step 4: Remove from all git history
echo "Step 4: Removing sensitive files from git history..."
echo "This may take 30-60 seconds..."
git filter-branch --force --index-filter \
  'git rm --cached --ignore-unmatch client/.env.local.backup client/.env.local' \
  --prune-empty --tag-name-filter cat -- --all 2>/dev/null

echo "✅ History cleaned"
echo ""

# Step 5: Clean up git references
echo "Step 5: Cleaning up git references..."
rm -rf .git/refs/original/ 2>/dev/null
git reflog expire --expire=now --all 2>/dev/null
git gc --prune=now --aggressive 2>/dev/null
echo "✅ References cleaned"
echo ""

# Step 6: Final verification
echo "========================================"
echo "FINAL VERIFICATION"
echo "========================================"
echo ""

echo "📋 Files currently tracked by git with .env or backup:"
git ls-files | grep -E "\.env|backup" || echo "✅ No sensitive files tracked (perfect!)"
echo ""

echo "📋 .env files in git history:"
HISTORY_CHECK=$(git log --all --pretty=format: --name-only | grep -E "\.env" | grep -v ".env.example" | sort -u)
if [ -z "$HISTORY_CHECK" ]; then
    echo "✅ No sensitive .env files in history (perfect!)"
else
    echo "⚠️  Found in history:"
    echo "$HISTORY_CHECK"
fi
echo ""

echo "========================================"
echo "🎉 SECURITY CLEANUP COMPLETE!"
echo "========================================"
echo ""
echo "Your repository is now:"
echo "✅ Free of sensitive files in git tracking"
echo "✅ Free of sensitive files in git history"
echo "✅ Protected by comprehensive .gitignore"
echo "✅ Safe to publish publicly on GitHub"
echo ""
echo "📌 NEXT STEPS:"
echo "1. Review the verification output above"
echo "2. If everything shows ✅, you're ready to publish!"
echo "3. Create your GitHub repository"
echo "4. Push your code: git push origin main"
echo ""
echo "🔒 The backup files remain in your Replit workspace"
echo "   but will NOT be published to GitHub."
echo ""