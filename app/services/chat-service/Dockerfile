# Multi-stage build dla optymalizacji
ARG NODE_VERSION=18
ARG ALPINE_VERSION=3.18

# Build stage
FROM node:${NODE_VERSION}-alpine${ALPINE_VERSION} AS builder

# Build arguments
ARG BUILD_DATE
ARG VERSION=1.0.0
ARG SERVICE_NAME=chat-service

# Labels for metadata
LABEL maintainer="todo-app-team"
LABEL build-date=${BUILD_DATE}
LABEL version=${VERSION}
LABEL service=${SERVICE_NAME}

# Install build dependencies
RUN apk add --no-cache --virtual .build-deps \
    python3 \
    make \
    g++

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including dev dependencies for build)
RUN npm ci && npm cache clean --force

# Copy ALL source code
COPY . .

# Remove build dependencies  
RUN apk del .build-deps

# Production stage
FROM node:${NODE_VERSION}-alpine${ALPINE_VERSION} AS production

# Runtime arguments
ARG NODE_ENV=production
ARG PORT=5000
ARG SERVICE_NAME=chat-service

# Environment variables
ENV NODE_ENV=${NODE_ENV}
ENV PORT=${PORT}
ENV SERVICE_NAME=${SERVICE_NAME}

# Install runtime dependencies only
RUN apk add --no-cache \
    wget \
    curl \
    dumb-init

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production && npm cache clean --force

# Copy ALL application code from builder (excluding what's in .dockerignore)
COPY --from=builder /app .

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs

# Change ownership
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE ${PORT}

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT}/health || exit 1

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "server.js"]
