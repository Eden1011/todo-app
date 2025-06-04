# Use Node.js LTS version
FROM node:18-alpine

# Install required packages for healthcheck and other utilities
RUN apk add --no-cache wget

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies using npm ci for production
RUN npm ci --only=production && npm cache clean --force

# Copy Prisma schema first
COPY prisma ./prisma/

# Generate Prisma client
RUN npx prisma generate

# Copy application code
COPY . .

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Change ownership of the app directory
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 4000

# Start the application
CMD ["sh", "-c", "npx prisma db push && node server.js"]
