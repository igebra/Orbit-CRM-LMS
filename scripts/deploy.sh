#!/usr/bin/env bash
set -e

echo ""
echo "======================================"
echo " Orbit Production Deploy"
echo "======================================"
echo ""

echo "1/4 Running production build..."
npm run build

echo ""
echo "2/4 Checking changed files..."
git add -A

if git diff --cached --quiet; then
  echo ""
  echo "No new changes to deploy."
  echo "Orbit production is already up to date."
  exit 0
fi

echo ""
echo "3/4 Committing changes..."
COMMIT_MESSAGE="Orbit update $(date '+%Y-%m-%d %H:%M')"
git commit -m "$COMMIT_MESSAGE"

echo ""
echo "4/4 Pushing to GitHub main..."
git push origin HEAD:main

echo ""
echo "======================================"
echo " Done!"
echo " GitHub has been updated."
echo " Vercel will deploy automatically."
echo "======================================"
echo ""