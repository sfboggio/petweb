# ─── Stage 1: Generate images.json ───────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy only what's needed to generate the image list
COPY generate-images-json.js ./
COPY fotos/ ./fotos/

RUN node generate-images-json.js

# ─── Stage 2: Serve with nginx ────────────────────────────────────────────────
FROM nginx:stable-alpine

# Copy static app
COPY index.html   /usr/share/nginx/html/
COPY style.css    /usr/share/nginx/html/
COPY app.js       /usr/share/nginx/html/
COPY manifest.json        /usr/share/nginx/html/
COPY service-worker.js    /usr/share/nginx/html/
COPY icons/               /usr/share/nginx/html/icons/
COPY fotos/               /usr/share/nginx/html/fotos/

# Copy the generated images.json from builder stage
COPY --from=builder /app/images.json /usr/share/nginx/html/images.json

# nginx config: serve from /usr/share/nginx/html, SPA-friendly
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
