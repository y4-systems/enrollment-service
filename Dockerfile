# ── Build stage ───────────────────────────────────────────────────
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

# ── Final stage ───────────────────────────────────────────────────
FROM node:18-alpine

WORKDIR /app

# Non-root user for security (principle of least privilege)
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy production deps and source
COPY --from=builder /app/node_modules ./node_modules
COPY src/ ./src/
COPY package.json ./

RUN chown -R appuser:appgroup /app
USER appuser

# Cloud Run injects PORT env var — must listen on it
EXPOSE 5003

CMD ["node", "src/server.js"]
