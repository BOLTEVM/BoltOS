# syntax=docker/dockerfile:1

# =============================================================================
# BOLTWallet Frontend Dockerfile (Hardened)
# Multi-stage build for Vite SPA wallet client served by Nginx as non-root user
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Base & Tooling Setup
# -----------------------------------------------------------------------------
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN apk add --no-cache python3 make g++
WORKDIR /app

# -----------------------------------------------------------------------------
# Stage 2: Workspace Dependencies Layer
# -----------------------------------------------------------------------------
FROM base AS deps

# Copy workspace settings and locks
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml .npmrc ./

# Copy all package.json files for lockfile cache optimization
COPY apps/web/package.json ./apps/web/
COPY apps/extension/package.json ./apps/extension/
COPY apps/mobile/package.json ./apps/mobile/
COPY packages/core/package.json ./packages/core/
COPY packages/ui/package.json ./packages/ui/

# Install dependencies deterministically
RUN pnpm install --frozen-lockfile --shamefully-hoist

# -----------------------------------------------------------------------------
# Stage 3: Builder Stage
# -----------------------------------------------------------------------------
FROM base AS builder

# Inherit workspace environment & node_modules
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/pnpm-workspace.yaml ./
COPY --from=deps /app/package.json ./
COPY --from=deps /app/pnpm-lock.yaml ./
COPY --from=deps /app/.npmrc ./

# Copy packages and application source
COPY packages ./packages
COPY apps ./apps

# Build-time Argument Injectors for Vite static environment variables
ARG VITE_BOLT_API_KEY
ARG VITE_PINATA_API_KEY

ENV VITE_BOLT_API_KEY=${VITE_BOLT_API_KEY}
ENV VITE_PINATA_API_KEY=${VITE_PINATA_API_KEY}

# Compile TypeScript libs and build the Vite production package
RUN pnpm build

# -----------------------------------------------------------------------------
# Stage 4: Production Web Server Runner (Hardened Non-Root)
# -----------------------------------------------------------------------------
FROM nginx:alpine AS runner

# Create non-root directories and set permissions for default nginx user
RUN mkdir -p /var/cache/nginx /var/log/nginx /var/run && \
    chown -R nginx:nginx /var/cache/nginx /var/log/nginx /var/run

# Remove default nginx boilerplate
RUN rm /etc/nginx/conf.d/default.conf

# Copy build output static directory
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

# Copy optimized hardened server configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Expose non-privileged port
EXPOSE 8080

USER nginx

# Production Health Check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
