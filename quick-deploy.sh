#!/bin/bash

echo "🚀 SafeAging Quick Deploy Script"
echo "================================"
echo ""
echo "This script will help you deploy your app for trials"
echo ""

# Check if logged in to Cloudflare
echo "Step 1: Checking Cloudflare login..."
if ! npx wrangler whoami &>/dev/null; then
    echo "❌ Not logged in to Cloudflare"
    echo "👉 Please run: npx wrangler login"
    echo "   Then run this script again"
    exit 1
fi

echo "✅ Logged in to Cloudflare"
echo ""

# Build the project
echo "Step 2: Building project..."
npm run build
echo "✅ Build complete"
echo ""

# Deploy to Cloudflare Pages
echo "Step 3: Deploying to Cloudflare Pages..."
npx wrangler pages deploy dist --project-name aigewell-trial
echo ""

# Show next steps
echo "✅ Deployment complete!"
echo ""
echo "📱 Your app is now live at:"
echo "   https://aigewell-trial.pages.dev"
echo ""
echo "Next steps for trials:"
echo "1. Share the link with providers/patients"
echo "2. Create demo accounts (see deploy-instructions.md)"
echo "3. Gather feedback using the built-in feedback form"
echo ""
echo "For custom domain setup, see deploy-instructions.md"