# ── Build stage ──────────────────────────────────────────────────────────────
FROM node:22-alpine AS build
WORKDIR /app

# Install dependencies in a separate layer so subsequent builds are fast
# as long as package-lock.json hasn't changed.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# VITE_API_URL is intentionally set to "/" (relative) so the axios instance
# uses paths like /api/synonyms. nginx then proxies those to the backend
# container, which keeps the browser away from cross-origin requests entirely.
ARG  VITE_API_URL=/
ENV  VITE_API_URL=$VITE_API_URL

RUN npm run build

# ── Serve stage ───────────────────────────────────────────────────────────────
FROM nginx:alpine AS runtime

COPY --from=build /app/dist  /usr/share/nginx/html

# Store the template; the entrypoint will render it with the real BACKEND_URL.
COPY nginx.conf /etc/nginx/templates/default.conf.template

EXPOSE 80

# nginx:alpine ships with envsubst. The official image's entrypoint at
# /docker-entrypoint.sh automatically processes every *.template file in
# /etc/nginx/templates/ and writes the result to /etc/nginx/conf.d/, so
# ${BACKEND_URL} is replaced before nginx starts.
#
# Default points at the Docker Compose service name; override with the
# Render internal address in production (set via the Render dashboard / render.yaml).
ENV BACKEND_URL=http://backend:8080

CMD ["nginx", "-g", "daemon off;"]
