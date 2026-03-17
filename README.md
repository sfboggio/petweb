# 🐾 Pet Gallery PWA

Galería de fotos de mascotas con carrusel, votación y resultados. PWA instalable.

---

## Estructura del proyecto

```
webgallery/
├── fotos/                  ← Tus imágenes (jpg, jpeg, png, webp)
├── icons/                  ← Íconos PWA (generados con create-icons.js)
├── index.html
├── style.css
├── app.js
├── images.json             ← Lista de imágenes (regenerar si agregás fotos)
├── manifest.json
├── service-worker.js
├── generate-images-json.js ← Regenera images.json
├── create-icons.js         ← Genera iconos PNG
├── Dockerfile
├── docker-compose.yml
├── nginx.conf
└── .dockerignore
```

---

## 🐳 Opción A — Docker (recomendado)

```bash
docker compose up --build
```

Abre `http://localhost:8080`.

> **¿Agregaste fotos nuevas?** Corré `docker compose up --build` de nuevo para
> que se regenere `images.json` dentro de la imagen.

---

## 💻 Opción B — Servidor local

### Requisitos
- Node.js ≥ 18

```bash
# 1. Genera la lista de imágenes
node generate-images-json.js

# 2. Inicia un servidor HTTP
npx -y serve .
```

Abre la URL que muestra `serve` (normalmente `http://localhost:3000`).

> ⚠️ No abras `index.html` directamente como archivo (`file://`).
> El Service Worker requiere un servidor HTTP.

---

## ➕ Agregar o quitar fotos

1. Copiá/borrá archivos `.jpg/.jpeg/.png/.webp` en la carpeta `fotos/`.
2. Regenerá la lista:
   ```bash
   node generate-images-json.js
   ```
3. Recargá la página (o reconstruí la imagen Docker).

---

## 🗳️ Sistema de votación

- Dos categorías: **Adorable 🥰** y **Graciosa 😂**.
- Los votos se guardan en `localStorage` del navegador.
- La sección **Resultados** se actualiza en tiempo real.
- Para resetear votos: `localStorage.removeItem('petgallery_votes')` en la consola.

---

## 📱 PWA — Instalación

- En Chrome/Edge de escritorio: ícono de instalación en la barra de direcciones.
- En Android (Chrome): "Agregar a pantalla de inicio".
- En iOS (Safari): compartir → "Agregar a inicio".

---

## 🔧 Formatos soportados

`.jpg` · `.jpeg` · `.png` · `.webp` · `.gif`

> `.HEIC` no es compatible con navegadores web. Convertí tus archivos con
> cualquier conversor online o con `magick input.heic output.jpg`.

---

## Mejoras futuras (opcionales)

- [ ] Agregar nombres amigables a las mascotas via `metadata.json`
- [ ] Galería filtrable por especie/nombre
- [ ] Compartir fotos favoritas
- [ ] Subir fotos desde la propia app (requiere backend)
- [ ] Animación de confeti al votar
