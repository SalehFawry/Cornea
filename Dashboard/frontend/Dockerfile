# ─────────────────────────────────────────────────────────────────────────────
# Stage 1 — Build the Vite/React application
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies with a locked install for reproducibility.
COPY package.json package-lock.json ./
RUN npm ci

# Copy source files.
COPY . .

# Vite bakes VITE_* variables into the JS bundle at build time.
# .env.production is committed and supplies VITE_API_BASE_URL.
# VITE_API_KEY is secret — inject it via --build-arg at deploy time.
ARG VITE_API_KEY=""
ENV VITE_API_KEY=${VITE_API_KEY}

RUN npm run build

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2 — Serve the static bundle with Nginx
# ─────────────────────────────────────────────────────────────────────────────
FROM nginx:1.25-alpine

# Remove the default Nginx site config.
RUN rm /etc/nginx/conf.d/default.conf

# Copy the custom SPA-aware Nginx config (serves on port 3063).
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy the compiled static assets from the build stage.
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 3063

CMD ["nginx", "-g", "daemon off;"]
