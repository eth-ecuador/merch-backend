# Deployment Guide

## Prerequisites

- Node.js 18+
- MongoDB 7+
- Redis 7+
- Docker & Docker Compose (optional)

## Environment Setup

1. Copy `.env.example` to `.env`
2. Fill in all required values:
   - `API_KEY`: Generate a strong random key
   - `BASE_SEPOLIA_RPC_URL`: Base Sepolia RPC endpoint
   - Contract addresses from smart contract deployment
   - `EAS_ATTESTATION_PRIVATE_KEY`: Private key of funded wallet

## Local Development

```bash
# Install dependencies
npm install

# Run database migrations (if any)
npm run migrate

# Seed test data
npm run seed

# Start development server
npm run dev
```

Server will start on http://localhost:3000

## Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- src/services/claim.service.test.ts
```

## Production Deployment

### Option 1: Docker Compose (Recommended)

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f api

# Stop services
docker-compose down
```

### Option 2: Manual Deployment

```bash
# Build TypeScript
npm run build

# Start production server
NODE_ENV=production npm start
```

### Option 3: Deploy to Cloud

#### Heroku

```bash
# Login to Heroku
heroku login

# Create app
heroku create merch-mvp-api

# Set environment variables
heroku config:set API_KEY=your-api-key
heroku config:set BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
# ... set all other env vars

# Deploy
git push heroku main

# View logs
heroku logs --tail
```

#### Railway

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Deploy
railway up

# Set environment variables in Railway dashboard
```

#### Render

1. Connect GitHub repository
2. Select "Web Service"
3. Set build command: `npm install && npm run build`
4. Set start command: `npm start`
5. Add environment variables in dashboard

## Post-Deployment Checklist

- [ ] All environment variables set
- [ ] Database connected successfully
- [ ] Redis connected successfully
- [ ] RPC endpoint accessible
- [ ] API key authentication working
- [ ] Health check endpoint responding
- [ ] Test all endpoints with Postman/curl
- [ ] Monitor logs for errors
- [ ] Set up monitoring (Sentry, etc.)
- [ ] Configure SSL/HTTPS
- [ ] Set up backup strategy

## Monitoring

### Health Check

```bash
curl https://your-api-domain.com/api/v1/health
```

Should return:
```json
{
  "status": "healthy",
  "timestamp": "2025-10-20T12:00:00Z",
  "version": "1.0.0",
  "services": {
    "database": "connected",
    "redis": "connected",
    "rpc": "connected"
  }
}
```

### Logging

Logs are stored in:
- `logs/combined.log` - All logs
- `logs/error.log` - Error logs only

View live logs:
```bash
tail -f logs/combined.log
```

## Troubleshooting

### Database Connection Issues

```bash
# Check MongoDB connection
mongosh $MONGODB_URI

# Check Redis connection
redis-cli -u $REDIS_URL ping
```

### RPC Issues

```bash
# Test RPC endpoint
curl -X POST $BASE_SEPOLIA_RPC_URL \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

### API Key Issues

Ensure API key matches exactly in:
1. `.env` file
2. Request headers: `X-API-KEY`

## Security Best Practices

1. **Never commit `.env` file**
2. **Use strong API keys** (min 32 characters)
3. **Keep private keys secure** (use env vars, not code)
4. **Enable HTTPS** in production
5. **Use rate limiting** (already configured)
6. **Monitor failed requests**
7. **Regular security updates**: `npm audit`

## Scaling

### Horizontal Scaling

Run multiple instances behind a load balancer:

```yaml
# docker-compose.scale.yml
services:
  api:
    deploy:
      replicas: 3
      restart_policy:
        condition: on-failure
  
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
```

### Caching Strategy

Redis is already integrated. Add caching for:
- Token metadata
- Event information
- Frequently accessed claims

## Backup Strategy

### MongoDB Backup

```bash
# Create backup
mongodump --uri=$MONGODB_URI --out=./backup

# Restore backup
mongorestore --uri=$MONGODB_URI ./backup
```

### Redis Backup

Redis persistence is enabled by default in docker-compose.yml

## Support

For issues or questions:
1. Check logs first
2. Review this deployment guide
3. Check GitHub issues
4. Contact team lead

---

**Last Updated**: October 20, 2025
**Version**: 1.0.0