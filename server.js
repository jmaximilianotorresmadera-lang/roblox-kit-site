const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;

const KITS_FILE = path.join(__dirname, 'data', 'kits.json');
const DIR_ZIP = path.join(__dirname, 'public', 'downloads');
const DIR_IMG = path.join(__dirname, 'public', 'uploads', 'img');
const DIR_VIDEO = path.join(__dirname, 'public', 'uploads', 'video');

[DIR_ZIP, DIR_IMG, DIR_VIDEO].forEach((dir) => fs.mkdirSync(dir, { recursive: true }));

function loadKits() {
  const raw = fs.readFileSync(KITS_FILE, 'utf-8');
  return JSON.parse(raw);
}

function saveKits(kits) {
  fs.writeFileSync(KITS_FILE, JSON.stringify(kits, null, 2), 'utf-8');
}

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 40);
}

// --- Subida de archivos ---
const storage = multer.diskStorage({
  destination(req, file, cb) {
    if (file.fieldname === 'file') return cb(null, DIR_ZIP);
    if (file.fieldname === 'image') return cb(null, DIR_IMG);
    if (file.fieldname === 'video') return cb(null, DIR_VIDEO);
    cb(new Error('Campo de archivo desconocido'));
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const unique = crypto.randomBytes(8).toString('hex');
    cb(null, `${Date.now()}-${unique}${ext}`);
  },
});

const ALLOWED = {
  file: ['.zip'],
  image: ['.png', '.jpg', '.jpeg', '.webp', '.gif'],
  video: ['.mp4', '.webm', '.mov'],
};

function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  const allowed = ALLOWED[file.fieldname] || [];
  if (!allowed.includes(ext)) {
    return cb(new Error(`Extension no permitida para "${file.fieldname}": ${ext}`));
  }
  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 60 * 1024 * 1024, files: 3 }, // 60MB por archivo
});

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Lista todos los kits, opcionalmente filtrados por categoria: ?category=roblox-studio | roblox-studio-lite
app.get('/api/kits', (req, res) => {
  const kits = loadKits();
  const { category, q } = req.query;

  let result = kits;

  if (category) {
    result = result.filter((k) => k.category === category);
  }

  if (q) {
    const term = q.toLowerCase();
    result = result.filter(
      (k) =>
        k.name.toLowerCase().includes(term) ||
        k.description.toLowerCase().includes(term) ||
        (k.tags || []).some((t) => t.toLowerCase().includes(term))
    );
  }

  res.json(result.slice().reverse());
});

app.get('/api/kits/:id', (req, res) => {
  const kits = loadKits();
  const kit = kits.find((k) => k.id === req.params.id);
  if (!kit) {
    return res.status(404).json({ error: 'Kit no encontrado' });
  }
  res.json(kit);
});

// Subida de un kit nuevo por parte de cualquier usuario.
// Roblox Studio -> requiere archivo .zip
// Roblox Studio Lite -> requiere ID de Roblox, foto y video (sin descarga)
app.post(
  '/api/kits',
  upload.fields([
    { name: 'file', maxCount: 1 },
    { name: 'image', maxCount: 1 },
    { name: 'video', maxCount: 1 },
  ]),
  (req, res) => {
    const cleanupAndFail = (status, message) => {
      const files = req.files || {};
      Object.values(files)
        .flat()
        .forEach((f) => fs.unlink(f.path, () => {}));
      return res.status(status).json({ error: message });
    };

    try {
      const { name, description, category, tags, author, robloxId } = req.body;

      if (!name || !name.trim()) return cleanupAndFail(400, 'Falta el nombre del kit.');
      if (!description || !description.trim())
        return cleanupAndFail(400, 'Falta la descripcion del kit.');
      if (!['roblox-studio', 'roblox-studio-lite'].includes(category)) {
        return cleanupAndFail(400, 'Categoria invalida.');
      }

      const files = req.files || {};
      const kits = loadKits();

      const baseId = slugify(name) || 'kit';
      let id = baseId;
      let n = 1;
      while (kits.some((k) => k.id === id)) {
        id = `${baseId}-${n++}`;
      }

      const parsedTags = (tags || '')
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, 8);

      let kit;

      if (category === 'roblox-studio') {
        const zipFile = files.file && files.file[0];
        if (!zipFile) return cleanupAndFail(400, 'Falta el archivo .zip del kit.');

        kit = {
          id,
          name: name.trim(),
          category,
          description: description.trim(),
          version: '1.0.0',
          image: files.image && files.image[0]
            ? `/uploads/img/${files.image[0].filename}`
            : '/img/placeholder.svg',
          file: `/downloads/${zipFile.filename}`,
          tags: parsedTags,
          author: (author || 'Anonimo').trim().slice(0, 40),
          createdAt: new Date().toISOString(),
        };
      } else {
        if (!robloxId || !robloxId.trim())
          return cleanupAndFail(400, 'Falta el ID de Roblox del kit.');
        const photo = files.image && files.image[0];
        const video = files.video && files.video[0];

        kit = {
          id,
          name: name.trim(),
          category,
          description: description.trim(),
          robloxId: robloxId.trim().slice(0, 30),
          image: photo ? `/uploads/img/${photo.filename}` : null,
          video: video ? `/uploads/video/${video.filename}` : null,
          tags: parsedTags,
          author: (author || 'Anonimo').trim().slice(0, 40),
          createdAt: new Date().toISOString(),
        };
      }

      kits.push(kit);
      saveKits(kits);
      res.status(201).json(kit);
    } catch (err) {
      cleanupAndFail(500, 'Error al procesar la subida: ' + err.message);
    }
  }
);

// Manejo de errores de multer (archivo muy grande, extension no permitida, etc.)
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError || err) {
    return res.status(400).json({ error: err.message });
  }
  next();
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
