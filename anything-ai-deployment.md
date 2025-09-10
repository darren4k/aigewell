# SafeAging Healthcare Platform - Anything AI Deployment Guide

## Overview
This is a unified AI-powered healthcare platform with a therapist/provider marketplace, designed for deployment on Anything AI.

## Features
- **AI-Powered Provider Matching**: Intelligent matching of patients with therapists/providers
- **Therapist Marketplace**: Browse, search, and book appointments with healthcare providers
- **Health Assessments**: AI-analyzed health evaluations
- **Appointment System**: Full booking and scheduling capabilities
- **Payment Processing**: Stripe integration for subscriptions and payments
- **HIPAA Compliant**: Security features for healthcare data protection

## Architecture

### Core Components
1. **Unified API Server** (`api-server-unified.js`)
   - Pure REST API (no HTML serving)
   - JWT authentication
   - Role-based access control
   - Rate limiting and security headers

2. **Marketplace Module** (`marketplace-module.js`)
   - Provider profiles and services
   - AI-powered matching algorithm
   - Review and rating system
   - User preference learning

3. **Database** (SQLite/Better-SQLite3)
   - Encrypted in production
   - HIPAA-compliant data storage
   - Automatic schema initialization

## Deployment to Anything AI

### Method 1: Direct Upload

1. **Prepare the package**:
```bash
# Create deployment package
cd aigewell
npm install --production

# Create deployment archive
tar -czf aigewell-anything-ai.tar.gz \
  api-server-unified.js \
  marketplace-module.js \
  package.json \
  package-lock.json \
  .env.example \
  src/ \
  migrations/ \
  schema.sql
```

2. **Upload to Anything AI**:
   - Navigate to your Anything AI dashboard
   - Create a new application
   - Upload the `aigewell-anything-ai.tar.gz` file
   - Set environment variables (see below)

### Method 2: Git Repository

1. **Push to GitHub**:
```bash
git init
git add .
git commit -m "SafeAging Healthcare Platform with AI Marketplace"
git remote add origin YOUR_GITHUB_REPO_URL
git push -u origin main
```

2. **Connect to Anything AI**:
   - In Anything AI dashboard, select "Deploy from GitHub"
   - Connect your repository
   - Select the main branch
   - Configure build settings

### Method 3: Docker Container

1. **Create Dockerfile**:
```dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --production

# Copy application files
COPY api-server-unified.js ./
COPY marketplace-module.js ./
COPY src ./src
COPY migrations ./migrations
COPY schema.sql ./

# Create uploads directory
RUN mkdir -p uploads

# Set production environment
ENV NODE_ENV=production

# Expose port
EXPOSE 8787

# Start command
CMD ["node", "api-server-unified.js"]
```

2. **Build and push**:
```bash
docker build -t aigewell-platform .
docker tag aigewell-platform YOUR_REGISTRY/aigewell-platform:latest
docker push YOUR_REGISTRY/aigewell-platform:latest
```

## Environment Variables

Configure these in Anything AI's environment settings:

```env
# Required
JWT_SECRET=your-secure-jwt-secret-min-32-chars
DATABASE_PATH=./healthcare.db
PORT=8787

# AI Features (Optional but recommended)
OPENAI_API_KEY=your-openai-api-key

# Payment Processing (Optional)
STRIPE_SECRET_KEY=your-stripe-secret-key

# Production Settings
NODE_ENV=production
DATABASE_ENCRYPTION_KEY=your-encryption-key-for-hipaa

# CORS Origins (comma-separated)
ALLOWED_ORIGINS=https://your-frontend.com,https://anything.ai
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login

### Marketplace
- `GET /api/marketplace/providers` - Search providers
- `POST /api/marketplace/match` - AI-powered provider matching
- `POST /api/marketplace/provider/profile` - Create provider profile
- `POST /api/marketplace/provider/service` - Add provider service
- `GET /api/marketplace/provider/:id` - Get provider details
- `POST /api/marketplace/review` - Add provider review
- `PUT /api/marketplace/preferences` - Update matching preferences

### Health Assessments
- `POST /api/assessment/create` - Create assessment
- `POST /api/assessment/:id/analyze` - AI analysis of assessment

### Appointments
- `POST /api/appointments/book` - Book appointment
- `GET /api/appointments/my` - Get user's appointments

### Payments
- `POST /api/payments/subscription` - Create subscription
- `POST /api/payments/process` - Process payment

## Testing the Deployment

1. **Health Check**:
```bash
curl https://your-app.anything.ai/api/health
```

2. **Register Test User**:
```bash
curl -X POST https://your-app.anything.ai/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "securepassword",
    "name": "Test User",
    "role": "patient"
  }'
```

3. **Test AI Matching**:
```bash
curl -X POST https://your-app.anything.ai/api/marketplace/match \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "specialty": "mental_health",
    "virtual": true,
    "urgency": "moderate"
  }'
```

## Scaling Considerations

### For Anything AI Platform:
1. **Database**: Consider migrating to PostgreSQL for production
2. **File Storage**: Use cloud storage (S3, CloudFlare R2) for uploads
3. **Caching**: Implement Redis for session management
4. **Rate Limiting**: Configure based on your plan limits

### Performance Optimization:
- Enable database connection pooling
- Implement response caching for provider searches
- Use CDN for static assets
- Enable gzip compression

## Security Best Practices

1. **Always use HTTPS** in production
2. **Rotate JWT secrets** regularly
3. **Enable database encryption** for HIPAA compliance
4. **Implement audit logging** for healthcare records
5. **Regular security updates** for dependencies

## Support & Documentation

- API Documentation: `/api` endpoint provides interactive docs
- Health Status: `/api/health` for monitoring
- Test Accounts: Available in development mode

## Integration with Anything AI Features

This platform is designed to leverage Anything AI's capabilities:
- **Auto-scaling**: Handles traffic spikes during peak booking times
- **AI Model Integration**: Uses OpenAI for intelligent matching
- **Multi-region Deployment**: Deploy close to your users
- **Analytics Integration**: Track usage and performance metrics

## Quick Start Commands

```bash
# Install dependencies
npm install

# Set up database
npm run setup-db

# Start unified API server
node api-server-unified.js

# Or use the existing script
npm run backend
```

## Troubleshooting

### Common Issues:

1. **JWT_SECRET Error**: Ensure it's at least 32 characters
2. **Database Lock**: Only one instance should access SQLite at a time
3. **CORS Issues**: Add your frontend domain to ALLOWED_ORIGINS
4. **AI Features Not Working**: Check OPENAI_API_KEY is valid

### Logs:
- Check Anything AI dashboard for application logs
- Enable verbose logging with `DEBUG=*` environment variable

## License
MIT License - See LICENSE file for details