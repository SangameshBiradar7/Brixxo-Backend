# 🚀 BRIXXO Deployment & Scaling Guide

## Overview

This guide covers deploying and scaling the BRIXXO construction marketplace to handle high traffic loads with optimal performance, security, and monitoring.

## 🏗️ Architecture Overview

### Production Stack
- **Frontend**: Next.js (React) with optimized builds
- **Backend**: Node.js/Express with performance optimizations
- **Database**: MongoDB with replica sets
- **Cache**: Redis for session and data caching
- **Load Balancer**: Nginx with rate limiting
- **Monitoring**: Prometheus + Grafana + Loki
- **Containerization**: Docker + Docker Compose

### High Availability Features
- Multi-instance backend services (3 replicas)
- MongoDB replica sets
- Redis clustering ready
- Nginx load balancing
- Automatic failover and health checks

## 📋 Prerequisites

### System Requirements
- Docker & Docker Compose
- 4GB+ RAM (8GB recommended)
- 2+ CPU cores
- 50GB+ storage
- Domain name with SSL certificates

### Environment Setup
```bash
# Copy production environment file
cp .env.production .env

# Edit with your actual values
nano .env
```

## 🚀 Quick Deployment

### 1. Single Server Deployment
```bash
# Build and start all services
cd docker
docker-compose up -d --build

# Check service health
docker-compose ps
curl http://localhost/health
```

### 2. Multi-Server Deployment
```bash
# Deploy backend services
docker-compose up -d backend redis mongo prometheus

# Deploy frontend services
docker-compose up -d frontend nginx grafana

# Scale services as needed
docker-compose up -d --scale backend=5 --scale frontend=3
```

## ⚙️ Configuration

### Environment Variables
```bash
# Database
MONGO_URI=mongodb://admin:securepass@mongo:27017/brixxo?replicaSet=rs0

# Redis
REDIS_URL=redis://redis:6379

# Security
JWT_SECRET=your-256-bit-secret
BCRYPT_ROUNDS=12

# CDN (Optional)
CDN_URL=https://cdn.brixxo.com
CDN_ENABLED=true
```

### Nginx Configuration
- Rate limiting: 1000 req/15min per IP
- Auth endpoints: 10 req/15min per IP
- Upload endpoints: 50 req/15min per IP
- SSL/TLS encryption
- Gzip compression enabled

## 📊 Monitoring & Analytics

### Accessing Monitoring Tools
```bash
# Prometheus metrics
open http://localhost:9090

# Grafana dashboards
open http://localhost:3001
# Default login: admin / admin123

# Application metrics
curl http://localhost/metrics
```

### Key Metrics to Monitor
- **Response Time**: < 500ms average
- **Error Rate**: < 1%
- **CPU Usage**: < 70%
- **Memory Usage**: < 80%
- **Database Connections**: Monitor pool usage
- **Cache Hit Rate**: > 85%

## 🔧 Performance Optimization

### Database Optimization
```javascript
// Indexes are automatically created on startup
// Monitor slow queries in MongoDB logs
db.currentOp({
  "secs_running": { "$gt": 5 }
})
```

### Cache Configuration
```javascript
// Redis configuration
maxmemory 512mb
maxmemory-policy allkeys-lru

// Application cache TTL
API_CACHE_TTL=300    // 5 minutes
STATIC_CACHE_TTL=3600 // 1 hour
```

### CDN Setup (Recommended)
```bash
# Configure Cloudflare/AWS CloudFront
# Point to your nginx server
# Enable caching for:
# - /_next/static/* (1 year)
# - /uploads/* (1 day)
# - /api/* (5 minutes)
```

## 🛡️ Security Features

### Implemented Security
- ✅ Helmet.js security headers
- ✅ Rate limiting and DDoS protection
- ✅ CORS configuration
- ✅ Input validation and sanitization
- ✅ JWT token authentication
- ✅ HTTPS enforcement
- ✅ SQL injection prevention

### SSL/TLS Setup
```bash
# Generate SSL certificates
certbot certonly --webroot -w /var/www/html -d yourdomain.com

# Update nginx.conf with SSL paths
ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
```

## 📈 Scaling Strategies

### Horizontal Scaling
```bash
# Scale backend services
docker-compose up -d --scale backend=5

# Scale database read replicas
docker-compose up -d --scale mongo-replica=2

# Add more frontend instances
docker-compose up -d --scale frontend=4
```

### Vertical Scaling
```bash
# Increase container resources
docker-compose.yml:
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 2G
        reservations:
          cpus: '1.0'
          memory: 1G
```

### Auto-scaling (Advanced)
```yaml
# Docker Swarm or Kubernetes deployment
services:
  backend:
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '1.0'
          memory: 1G
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
        window: 120s
```

## 🔍 Troubleshooting

### Common Issues

#### High Memory Usage
```bash
# Check memory usage
docker stats

# Clear Redis cache
docker exec redis redis-cli FLUSHALL

# Restart services
docker-compose restart backend
```

#### Slow Response Times
```bash
# Check nginx logs
docker logs nginx

# Monitor database performance
docker exec mongo mongo --eval "db.serverStatus().metrics"

# Check Redis performance
docker exec redis redis-cli INFO
```

#### Database Connection Issues
```bash
# Check MongoDB status
docker exec mongo mongo --eval "db.stats()"

# Restart database
docker-compose restart mongo

# Check replica set status
docker exec mongo mongo --eval "rs.status()"
```

## 📚 Maintenance Tasks

### Daily
- Monitor error logs
- Check disk space usage
- Review performance metrics
- Update security patches

### Weekly
- Clear old logs
- Optimize database indexes
- Review cache hit rates
- Update dependencies

### Monthly
- Full system backup
- Security audit
- Performance review
- Capacity planning

## 🚨 Emergency Procedures

### Service Outage
1. Check service status: `docker-compose ps`
2. Review logs: `docker-compose logs [service]`
3. Restart failed services: `docker-compose restart [service]`
4. Scale up if needed: `docker-compose up -d --scale [service]=N`

### Database Issues
1. Check MongoDB status
2. Attempt restart
3. Restore from backup if needed
4. Contact database administrator

### Security Incident
1. Isolate affected services
2. Review access logs
3. Update security rules
4. Notify stakeholders
5. Perform security audit

## 📞 Support & Resources

### Monitoring Dashboards
- **Grafana**: http://localhost:3001
- **Prometheus**: http://localhost:9090
- **Application Health**: http://localhost/health

### Log Files
```bash
# Application logs
docker logs backend
docker logs frontend

# System logs
docker logs nginx
docker logs mongo
```

### Backup Strategy
```bash
# Database backup
docker exec mongo mongodump --out /backup

# File system backup
docker run --rm -v brixxo_mongo_data:/data -v $(pwd):/backup alpine tar czf /backup/mongo-backup.tar.gz -C /data .

# Configuration backup
cp docker-compose.yml docker-compose.yml.backup
cp .env .env.backup
```

## 🎯 Performance Benchmarks

### Target Metrics
- **Page Load Time**: < 2 seconds
- **API Response Time**: < 200ms
- **Concurrent Users**: 10,000+
- **Uptime**: 99.9%
- **Error Rate**: < 0.1%

### Load Testing
```bash
# Install artillery
npm install -g artillery

# Run load test
artillery quick --count 100 --num 10 http://localhost/api/professionals

# Run stress test
artillery run load-test.yml
```

## 🔄 Updates & Deployment

### Zero-Downtime Deployment
```bash
# Build new images
docker-compose build --no-cache

# Rolling update
docker-compose up -d --scale backend=0
docker-compose up -d --scale backend=3

# Verify health
curl http://localhost/health

# Remove old containers
docker system prune -f
```

---

## 📝 Notes

- Always test in staging environment first
- Monitor resource usage after scaling
- Keep security patches updated
- Regular backup verification
- Document all configuration changes

For additional support, check the application logs and monitoring dashboards.