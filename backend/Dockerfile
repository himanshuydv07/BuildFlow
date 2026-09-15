FROM node:20-alpine AS base
WORKDIR /app

# Install dependencies first for better layer caching.
COPY package*.json ./
RUN npm install --omit=dev && npm cache clean --force

# Copy source.
COPY . .

# Non-root user for defense in depth.
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
RUN mkdir -p /app/uploads && chown -R appuser:appgroup /app
USER appuser

ENV NODE_ENV=production
EXPOSE 5000

# Simple container-level healthcheck hitting our own /healthcheck route.
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
  CMD node -e "require('http').get('http://localhost:5000/api/v1/healthcheck', r => process.exit(r.statusCode < 500 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "src/server.js"]
