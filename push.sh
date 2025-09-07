#!/bin/bash
echo "Please paste your GitHub token and press Enter:"
read -s TOKEN
echo ""
echo "Pushing to GitHub..."
git push https://darren4k:${TOKEN}@github.com/darren4k/aigewell.git main
echo "✅ Push complete! Check Cloudflare for deployment status."