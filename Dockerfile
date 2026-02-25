# ── Build stage ───────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

# ── Final stage ───────────────────────────────────────────────────
FROM node:20-alpine

WORKDIR /app

# Non-root user for security (principle of least privilege)
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy production deps and source
COPY --from=builder /app/node_modules ./node_modules
COPY src/ ./src/
COPY package.json ./

RUN chown -R appuser:appgroup /app
USER appuser

EXPOSE 8080

CMD ["node", "src/server.js"]
