# Roblox Kits Site

Servidor Node.js + Express para una página web de descarga de kits para
**Roblox Studio** y **Roblox Studio Lite**.

## Instalar y correr

```powershell
npm install
npm start
```

Luego abrí http://localhost:3000

Para desarrollo con reinicio automático:

```powershell
npm run dev
```

## Estructura

- `server.js` — servidor Express y API (`/api/kits`, `/api/kits/:id`).
- `data/kits.json` — lista de kits (nombre, categoría, descripción, tags, archivo).
- `public/` — frontend estático (HTML/CSS/JS) y carpeta `downloads/` con los .zip reales.

## Agregar un kit nuevo

1. Subí el archivo `.zip` del kit a `public/downloads/`.
2. Agregá una entrada en `data/kits.json`:

```json
{
  "id": "mi-kit",
  "name": "Mi Kit",
  "category": "roblox-studio",      // o "roblox-studio-lite"
  "description": "Descripción corta del kit.",
  "version": "1.0.0",
  "image": "/img/placeholder.svg",
  "file": "/downloads/mi-kit.zip",
  "tags": ["Tag1", "Tag2"]
}
```

3. Reiniciá el servidor (o usá `npm run dev`).

## Notas

- Los kits de ejemplo en `data/kits.json` apuntan a archivos `.zip` que todavía
  no existen en `public/downloads/`. Agregá los archivos reales con esos
  mismos nombres para que la descarga funcione (ver `public/downloads/README.txt`).
- Las imágenes usan un placeholder (`public/img/placeholder.svg`); reemplazalas
  por capturas reales de cada kit cuando quieras.
