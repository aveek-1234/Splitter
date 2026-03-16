# Docker Setup Guide for Splitter

## Overview
This guide covers building and running the Splitter application using Docker for both development and production environments.

## Files

- **Dockerfile** - Production-optimized multi-stage build
- **Dockerfile.dev** - Development environment with hot reload
- **docker-compose.yml** - Docker Compose configuration for orchestration
- **.dockerignore** - Files to exclude from Docker builds

## Prerequisites

- Docker 20.10+
- Docker Compose 2.0+ (optional but recommended)
- 4GB RAM minimum for builds

## Production Build

### Build the image:
```bash
docker build -t splitter:latest .
```

### Run the container:
```bash
docker run -p 3000:3000 \
  -e CONVEX_DEPLOYMENT=your_deployment \
  -e NEXT_PUBLIC_CONVEX_URL=your_url \
  -e CLERK_SECRET_KEY=your_secret \
  -e NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_key \
  splitter:latest
```

### Using Docker Compose (Recommended):
```bash
docker-compose up -d
```

Before running, update `docker-compose.yml` with your environment variables.

## Development Build

### Build the development image:
```bash
docker build -f Dockerfile.dev -t splitter:dev .
```

### Run with hot reload (requires volume mount):
```bash
docker run -p 3000:3000 \
  -v $(pwd):/app \
  -e CONVEX_DEPLOYMENT=your_deployment \
  -e NEXT_PUBLIC_CONVEX_URL=your_url \
  splitter:dev
```

## Environment Variables

Add these to your `.env.local` or pass them to Docker:

```
# Convex
CONVEX_DEPLOYMENT=<your_deployment>
NEXT_PUBLIC_CONVEX_URL=<your_url>

# Clerk Authentication
CLERK_SECRET_KEY=<your_secret_key>
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=<your_publishable_key>
CLERK_SIGN_IN_URL=/sign-in
CLERK_SIGN_UP_URL=/sign-up
CLERK_AFTER_SIGN_IN_URL=/dashboard
CLERK_AFTER_SIGN_UP_URL=/dashboard
```

## Common Commands

### View logs:
```bash
docker-compose logs -f splitter
```

### Stop containers:
```bash
docker-compose down
```

### Remove images and containers:
```bash
docker-compose down --rmi all
```

### Rebuild without cache:
```bash
docker-compose up -d --build --no-cache
```

### Shell into running container:
```bash
docker exec -it splitter-app sh
```

## Production Deployment

### Using Docker Stack (Docker Swarm):
```bash
docker stack deploy -c docker-compose.yml splitter
```

### Using Kubernetes:
Convert the docker-compose.yml using a tool like Kompose:
```bash
kompose convert -f docker-compose.yml -o k8s/
kubectl apply -f k8s/
```

### Cloud Deployment Options

#### AWS ECS:
```bash
ecs-cli compose service up --file docker-compose.yml
```

#### Google Cloud Run:
```bash
gcloud run deploy splitter --source .
```

#### Azure Container Instances:
```bash
az container create --resource-group mygroup \
  --name splitter \
  --image splitter:latest \
  --ports 3000
```

#### DigitalOcean App Platform:
Push to Docker Hub, then connect via DigitalOcean dashboard.

## Performance Optimization

### Multi-stage build benefits:
- Reduces final image size by ~60%
- Separates build dependencies from runtime
- Faster deployments

### Current image optimization:
- Uses Alpine Linux (small base image)
- Non-root user (security)
- Health checks enabled
- Proper signal handling (dumb-init)

## Security Best Practices

✅ **Implemented:**
- Non-root user (nextjs:nodejs)
- Alpine Linux base (minimal attack surface)
- Multi-stage build (no dev dependencies in production)
- Health checks configured
- Proper signal handling

⚠️ **To add:**
- Docker network isolation (already in docker-compose)
- Resource limits in docker-compose:
  ```yaml
  deploy:
    resources:
      limits:
        cpus: '0.5'
        memory: 512M
  ```
- Secrets management (use Docker Secrets or external service)

## Troubleshooting

### Port already in use:
```bash
docker-compose down
# or use a different port
docker run -p 8000:3000 splitter:latest
```

### Out of memory:
Increase Docker's allocated memory in settings.

### Permission denied errors:
Run without `-u` flag or check file ownership.

### Application won't start:
```bash
docker logs splitter-app
```

Check that all required environment variables are set.

## Next Steps

1. Build the image: `docker build -t splitter:latest .`
2. Test locally with Docker Compose
3. Push to a registry (Docker Hub, ECR, GCR, etc.)
4. Deploy to your production platform
5. Monitor with Docker health checks and logging

## Additional Resources

- [Next.js Docker Documentation](https://nextjs.org/docs/deployment/docker)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Convex Deployment Guide](https://docs.convex.dev/deployment)
