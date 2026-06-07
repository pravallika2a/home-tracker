# ── Stage 1: build frontend ──────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /build
COPY . .
RUN npm run install:all && npm run build

# ── Stage 2: production image ─────────────────────────────────────────────────
FROM node:22-alpine
WORKDIR /app

# Copy backend (with its node_modules: express, cors)
COPY --from=builder /build/backend ./backend/

# Copy built frontend (served statically by the backend)
COPY --from=builder /build/frontend/dist ./frontend/dist/

EXPOSE 3001
ENV NODE_ENV=production

CMD ["node", "backend/server.js"]
