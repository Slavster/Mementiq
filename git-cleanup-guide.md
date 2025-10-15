# Git Repository Cleanup Guide for GitHub Publishing

## ✅ Progress So Far

1. **Moved** `client/.env.local` to `client/.env.local.backup` ✓
2. **Created** new `client/.env.local` (not tracked by git) ✓
3. **Updated** `.gitignore` to prevent future commits ✓
4. **Created** cleanup script: `cleanup-git-history.sh` ✓

## 🚨 Critical Step Required: Clean Git History

Since the Replit environment restricts direct git history modifications, you need to execute the cleanup script manually.

### Option 1: Run the Cleanup Script (Recommended)

```bash
./cleanup-git-history.sh
```

This script will:
- Remove `client/.env.local` from git tracking
- Clean all historical commits containing the file
- Verify the cleanup was successful

### Option 2: Manual Commands

If the script doesn't work, run these commands manually:

```bash
# 1. Remove from tracking
git rm --cached client/.env.local

# 2. Commit the removal
git commit -m "Security: Remove .env.local from git tracking"

# 3. Remove from history
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch client/.env.local" \
  --prune-empty --tag-name-filter cat -- --all

# 4. Clean up
rm -rf .git/refs/original/
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# 5. Verify (should only show .env.example)
git log --all --pretty=format: --name-only | grep -E '\.env' | sort -u
```

### Option 3: Using BFG Repo Cleaner

If you prefer BFG (faster for large repos):

```bash
# Install BFG first
brew install bfg  # macOS
# or download: https://rtyley.github.io/bfg-repo-cleaner/

# Run BFG
bfg --delete-files .env.local
git reflog expire --expire=now --all
git gc --prune=now --aggressive
```

## 📋 Final Verification Checklist

Run these commands to verify your repository is clean:

```bash
# Check no .env files are tracked (should be empty or only .env.example)
git ls-files | grep -E '\.env[^.]|\.env$'

# Check history for sensitive files
git log --all --pretty=format: --name-only | grep -E '\.env[^.]|\.env$'

# Check for any Supabase keys in history
git log -p --all | grep -i "supabase" | head -20
```

## 🚀 Publishing to GitHub

Once cleaned, your repository is safe to publish:

1. Create a new repository on GitHub
2. Add the remote: `git remote add origin https://github.com/yourusername/mementiq.git`
3. Force push (required after history rewrite): `git push -u origin main --force`

## ⚠️ Important Notes

- The Supabase ANON key in the history is designed to be public (used in client-side code)
- However, best practice is to never commit `.env` files
- After publishing, team members should re-clone the repository
- Consider rotating the Supabase keys if you want extra security

## 📝 Security Best Practices Going Forward

1. **Never commit `.env` files** - Always use `.env.example` as a template
2. **Check before committing**: `git status` to ensure no sensitive files
3. **Use environment variables** in production deployments
4. **Regular audits**: Periodically check for exposed secrets

Your app is now configured correctly with:
- ✅ `.gitignore` blocking all `.env` files
- ✅ `.env.example` documenting required variables
- ✅ `.env.local` recreated but not tracked
- ⏳ Git history cleanup (execute the script to complete)