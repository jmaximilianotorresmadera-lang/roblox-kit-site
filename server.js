const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

const KITS_FILE = path.join(__dirname, 'data', 'kits.json');

function loadKits() {
  const raw = fs.readFileSync(KITS_FILE, 'utf-8');
  return JSON.parse(raw);
}

app.use(express.static(path.join(__dirname, 'public')));

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
        k.tags.some((t) => t.toLowerCase().includes(term))
    );
  }

  res.json(result);
});

app.get('/api/kits/:id', (req, res) => {
  const kits = loadKits();
  const kit = kits.find((k) => k.id === req.params.id);
  if (!kit) {
    return res.status(404).json({ error: 'Kit no encontrado' });
  }
  res.json(kit);
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
