require('dotenv').config();

const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

const KITS_FILE = path.join(__dirname, 'data', 'kits.json');
const DIR_ZIP = path.join(__dirname, 'public', 'downloads');
const DIR_IMG = path.join(__dirname, 'public', 'uploads', 'img');
const DIR_VIDEO = path.join(__dirname, 'public', 'uploads', 'video');

[DIR_ZIP, DIR_IMG, DIR_VIDEO].forEach((dir) => fs.mkdirSync(dir, { recursive: true }));

// --- Almacenamiento persistente (Supabase) ---
// Si SUPABASE_URL / SUPABASE_SERVICE_KEY estan configurados (variables de entorno en Render),
// los kits y los archivos subidos se guardan en Supabase y sobreviven a los reinicios/redeploys.
// Si no estan configurados, se usa el disco local (se borra en cada redeploy, sirve para probar).
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || 'kits-data';
const useSupabase = Boolean(SUPABASE_URL && SUPABASE_KEY);

const supabase = useSupabase ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

if (useSupabase) {
  console.log('Almacenamiento: Supabase (persistente)');
} else {
  console.log('Almacenamiento: disco local (NO persistente entre redeploys)');
}

async function loadKits() {
  if (useSupabase) {
    const { data, error } = await supabase.storage.from(SUPABASE_BUCKET).download('kits.json');
    if (error) return []; // todavia no existe: no hay kits subidos
    const text = await data.text();
    return JSON.parse(text || '[]');
  }
  const raw = fs.readFileSync(KITS_FILE, 'utf-8');
  return JSON.parse(raw);
}

async function saveKits(kits) {
  const json = JSON.stringify(kits, null, 2);
  if (useSupabase) {
    const { error } = await supabase.storage
      .from(SUPABASE_BUCKET)
      .upload('kits.json', Buffer.from(json, 'utf-8'), {
        contentType: 'application/json',
        upsert: true,
      });
    if (error) throw new Error('No se pudo guardar kits.json en Supabase: ' + error.message);
    return;
  }
  fs.writeFileSync(KITS_FILE, json, 'utf-8');
}

// --- Administrador ---
// Solo quien conozca ADMIN_KEY (variable de entorno en Render) puede borrar kits.
// La clave se guarda en el navegador de tu PC y de tu celular (ver /admin.html).
const ADMIN_KEY = process.env.ADMIN_KEY;
if (!ADMIN_KEY) console.log('ADMIN_KEY no configurada: no se pueden borrar kits.');

function isAdmin(req) {
  const given = req.headers['x-admin-key'];
  if (!ADMIN_KEY || typeof given !== 'string') return false;
  const a = Buffer.from(given);
  const b = Buffer.from(ADMIN_KEY);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function requireAdmin(req, res, next) {
  if (!isAdmin(req)) return res.status(403).json({ error: 'No autorizado.' });
  next();
}

// Comprueba en Roblox que el ID sea un plugin real (AssetTypeId 38).
async function verifyRobloxPlugin(assetId) {
  if (!/^\d{1,19}$/.test(assetId)) return { ok: false, reason: 'notfound' };
  let res;
  try {
    res = await fetch(`https://economy.roblox.com/v2/assets/${assetId}/details`, {
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    return { ok: false, reason: 'unreachable' };
  }
  if (res.status === 400 || res.status === 404) return { ok: false, reason: 'notfound' };
  if (!res.ok) return { ok: false, reason: 'unreachable' };
  const data = await res.json();
  if (data.AssetTypeId !== 38) return { ok: false, reason: 'not-plugin' };
  return { ok: true, name: data.Name, creator: data.Creator && data.Creator.Name };
}

// Borra un archivo subido (Supabase o disco local). Si falla no pasa nada: el kit ya se quito de la lista.
async function deleteStoredFile(url) {
  if (!url) return;
  try {
    if (useSupabase) {
      const marker = `/storage/v1/object/public/${SUPABASE_BUCKET}/`;
      const i = url.indexOf(marker);
      if (i !== -1) {
        await supabase.storage.from(SUPABASE_BUCKET).remove([decodeURIComponent(url.slice(i + marker.length))]);
      }
      return;
    }
    const localDirs = { '/downloads/': DIR_ZIP, '/uploads/img/': DIR_IMG, '/uploads/video/': DIR_VIDEO };
    for (const [prefix, dir] of Object.entries(localDirs)) {
      if (url.startsWith(prefix)) {
        fs.unlink(path.join(dir, path.basename(url)), () => {});
        return;
      }
    }
  } catch {
    /* borrar el archivo es opcional */
  }
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

// Guarda un archivo subido (buffer en memoria) en Supabase Storage o en disco local,
// y devuelve la URL publica para usarlo desde el frontend.
async function saveUploadedFile(file, kind) {
  const ext = path.extname(file.originalname).toLowerCase();
  const filename = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;

  if (useSupabase) {
    const objectPath = `${kind}/${filename}`;
    const { error } = await supabase.storage
      .from(SUPABASE_BUCKET)
      .upload(objectPath, file.buffer, { contentType: file.mimetype, upsert: false });
    if (error) throw new Error('No se pudo subir el archivo: ' + error.message);
    const { data } = supabase.storage.from(SUPABASE_BUCKET).getPublicUrl(objectPath);
    return data.publicUrl;
  }

  const LOCAL_DIR = { zip: DIR_ZIP, img: DIR_IMG, video: DIR_VIDEO };
  const LOCAL_URL_PREFIX = { zip: '/downloads', img: '/uploads/img', video: '/uploads/video' };
  fs.writeFileSync(path.join(LOCAL_DIR[kind], filename), file.buffer);
  return `${LOCAL_URL_PREFIX[kind]}/${filename}`;
}

// --- Subida de archivos (multer guarda en memoria; el destino final lo decide saveUploadedFile) ---
const ALLOWED = {
  file: ['.zip', '.rbxm', '.rbxmx', '.rbxl', '.rbxlx'],
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
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024, files: 3 }, // 50MB por archivo (limite de Supabase gratis)
});

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Lista todos los kits, opcionalmente filtrados por categoria: ?category=roblox-studio | roblox-studio-lite
app.get('/api/kits', async (req, res) => {
  try {
    const kits = await loadKits();
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
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/kits/:id', async (req, res) => {
  try {
    const kits = await loadKits();
    const kit = kits.find((k) => k.id === req.params.id);
    if (!kit) return res.status(404).json({ error: 'Kit no encontrado' });
    res.json(kit);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Comprueba que el servidor esta hablando con un administrador (para mostrar los botones de borrar).
app.get('/api/admin/check', (req, res) => {
  res.json({ admin: isAdmin(req) });
});

// Borra un kit y sus archivos. Solo administrador.
app.delete('/api/kits/:id', requireAdmin, async (req, res) => {
  try {
    const kits = await loadKits();
    const index = kits.findIndex((k) => k.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: 'Kit no encontrado.' });

    const [kit] = kits.splice(index, 1);
    await saveKits(kits);
    await Promise.all([kit.file, kit.image, kit.video].map(deleteStoredFile));
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Error al borrar el kit: ' + err.message });
  }
});

// Subida de un kit nuevo, sin necesidad de cuenta.
// Roblox Studio y Mapas -> requieren archivo (.zip, .rbxm, .rbxmx, .rbxl, .rbxlx)
// Roblox Studio Lite -> requiere ID de Roblox (foto y video opcionales, sin descarga).
//   Si lleva la etiqueta "plugin", se verifica en Roblox que el ID sea un plugin real.
app.post(
  '/api/kits',
  upload.fields([
    { name: 'file', maxCount: 1 },
    { name: 'image', maxCount: 1 },
    { name: 'video', maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const { name, description, category, tags, author, robloxId, version } = req.body;

      if (!name || !name.trim()) return res.status(400).json({ error: 'Falta el nombre del kit.' });
      if (!description || !description.trim())
        return res.status(400).json({ error: 'Falta la descripcion del kit.' });
      if (!['roblox-studio', 'roblox-studio-lite', 'mapa'].includes(category)) {
        return res.status(400).json({ error: 'Categoria invalida.' });
      }

      const files = req.files || {};
      const isLite = category === 'roblox-studio-lite';

      if (!isLite && !(files.file && files.file[0])) {
        return res.status(400).json({ error: 'Falta el archivo (.zip, .rbxm, .rbxmx, .rbxl o .rbxlx).' });
      }
      if (isLite && (!robloxId || !robloxId.trim())) {
        return res.status(400).json({ error: 'Falta el ID de Roblox del kit.' });
      }

      const parsedTags = (tags || '')
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, 8);

      let verification = null;
      if (isLite && parsedTags.some((t) => t.toLowerCase() === 'plugin')) {
        verification = await verifyRobloxPlugin(robloxId.trim());
        if (!verification.ok) {
          const messages = {
            notfound: 'No se encontró ese ID en Roblox, así que no se puede verificar como plugin.',
            'not-plugin': 'Ese ID existe en Roblox pero no es un plugin.',
            unreachable: 'No se pudo consultar Roblox ahora mismo. Probá de nuevo en un rato.',
          };
          return res.status(verification.reason === 'unreachable' ? 503 : 400).json({ error: messages[verification.reason] });
        }
      }

      const kits = await loadKits();

      const baseId = slugify(name) || 'kit';
      let id = baseId;
      let n = 1;
      while (kits.some((k) => k.id === id)) {
        id = `${baseId}-${n++}`;
      }

      const kitVersion = (version || '').trim().slice(0, 20) || '1.0.0';
      const now = new Date().toISOString();

      let kit;

      if (!isLite) {
        const zipUrl = await saveUploadedFile(files.file[0], 'zip');
        const imageUrl = files.image && files.image[0]
          ? await saveUploadedFile(files.image[0], 'img')
          : '/img/placeholder.svg';

        kit = {
          id,
          name: name.trim(),
          category,
          description: description.trim(),
          version: kitVersion,
          image: imageUrl,
          file: zipUrl,
          tags: parsedTags,
          author: (author || 'Anonimo').trim().slice(0, 40),
          createdAt: now,
          updatedAt: now,
        };
      } else {
        const imageUrl = files.image && files.image[0]
          ? await saveUploadedFile(files.image[0], 'img')
          : null;
        const videoUrl = files.video && files.video[0]
          ? await saveUploadedFile(files.video[0], 'video')
          : null;

        kit = {
          id,
          name: name.trim(),
          category,
          description: description.trim(),
          version: kitVersion,
          robloxId: robloxId.trim().slice(0, 30),
          image: imageUrl,
          video: videoUrl,
          tags: parsedTags,
          author: (author || 'Anonimo').trim().slice(0, 40),
          createdAt: now,
          updatedAt: now,
        };
        if (verification) {
          kit.verified = true;
          kit.robloxName = verification.name;
          kit.robloxCreator = verification.creator;
        }
      }

      kits.push(kit);
      await saveKits(kits);
      res.status(201).json(kit);
    } catch (err) {
      res.status(500).json({ error: 'Error al procesar la subida: ' + err.message });
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
