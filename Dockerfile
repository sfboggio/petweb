# ─── Stage 1: Convert HEIC → JPG + Generate images.json ─────────────────────
FROM node:20-alpine AS builder

# Install ImageMagick for HEIC conversion
RUN apk add --no-cache imagemagick imagemagick-heic

WORKDIR /app

COPY generate-images-json.js ./
COPY fotos/ ./fotos/

# Convert all HEIC/heic files to JPG and remove originals
RUN for f in fotos/*.HEIC fotos/*.heic; do \
      [ -f "$f" ] && magick "$f" "${f%.*}.jpg" && rm "$f" && echo "Converted: $f"; \
    done; true

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

# Copy fotos from builder (HEIC already converted to JPG)
COPY --from=builder /app/fotos/ /usr/share/nginx/html/fotos/

# Copy the generated images.json from builder stage
COPY --from=builder /app/images.json /usr/share/nginx/html/images.json

# nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
