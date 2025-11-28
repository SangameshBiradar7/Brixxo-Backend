# Backend Deployment Guide for Render

This guide will help you deploy the Brixxo backend to Render.

## Prerequisites

1. A Render account
2. MongoDB database (MongoDB Atlas recommended)
3. Redis database (optional, for caching)
4. Vercel frontend deployment (for CORS configuration)

## Step 1: Prepare Your Environment Variables

1. Copy `.env.example` to `.env`
2. Fill in all required environment variables:

### Required Variables:
- `MONGO_URI`: Your MongoDB connection string
- `JWT_SECRET`: A secure random string for JWT signing
- `FRONTEND_URL`: Your Vercel frontend URL (e.g., `https://your-app.vercel.app`)

### Optional Variables:
- `REDIS_URL`: Redis connection string for caching
- `GOOGLE_CLIENT_ID/SECRET`: For Google OAuth
- `STRIPE_SECRET_KEY`: For payment processing
- `EMAIL_*`: For email notifications

## Step 2: Deploy to Render

### Option A: Using Render Dashboard (Recommended)

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New" → "Web Service"
3. Connect your GitHub repository
4. Configure the service:
   - **Name**: `brixxo-backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Choose based on your needs (Starter plan recommended)

### Option B: Using render.yaml

1. Push the `render.yaml` file to your repository
2. Render will automatically detect and configure the service

## Step 3: Configure Environment Variables

In your Render service settings, add these environment variables:

### Required:
```
NODE_ENV=production
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secure_jwt_secret
FRONTEND_URL=https://your-vercel-app.vercel.app
```

### Optional:
```
REDIS_URL=your_redis_url
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
STRIPE_SECRET_KEY=your_stripe_secret_key
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
```

## Step 4: Database Setup

### MongoDB Atlas (Recommended)

1. Create a MongoDB Atlas cluster
2. Create a database user
3. Whitelist Render's IP addresses (0.0.0.0/0 for development)
4. Get your connection string and update `MONGO_URI`

### Redis (Optional)

1. Create a Redis instance on Render or another provider
2. Get the connection URL and update `REDIS_URL`

## Step 5: File Uploads

Render provides persistent disk storage. The `render.yaml` configures:
- **Disk Name**: `uploads`
- **Mount Path**: `/opt/render/project/src/uploads`
- **Size**: 1GB

## Step 6: Health Checks

The backend includes a health check endpoint at `/health` that Render will use to monitor your service.

## Step 7: Testing Deployment

1. Once deployed, check the service logs in Render dashboard
2. Test the `/health` endpoint
3. Verify your frontend can connect to the backend
4. Test authentication and API endpoints

## Troubleshooting

### Common Issues:

1. **Port Binding**: Render automatically sets the `PORT` environment variable. The app uses `process.env.PORT || 5000`.

2. **CORS Issues**: Ensure `FRONTEND_URL` matches your Vercel deployment URL exactly.

3. **Database Connection**: Check your MongoDB connection string and network access.

4. **File Uploads**: Files are stored in the persistent disk at `/opt/render/project/src/uploads`.

5. **Memory Issues**: If you encounter memory limits, consider upgrading your Render plan.

### Logs and Monitoring:

- Check Render service logs for errors
- Use the `/health` and `/metrics` endpoints for monitoring
- Enable Redis for better caching performance

## Security Notes

- Never commit `.env` files to version control
- Use strong, unique secrets for JWT and session management
- Regularly rotate API keys and secrets
- Enable 2FA on your Render account

## Support

If you encounter issues:
1. Check Render service logs
2. Verify environment variables are set correctly
3. Test database connectivity
4. Ensure CORS settings match your frontend URL

## Cost Optimization

- Use Redis for caching to reduce database load
- Implement rate limiting to prevent abuse
- Monitor usage and adjust plan as needed
- Consider using Render's free tier for development