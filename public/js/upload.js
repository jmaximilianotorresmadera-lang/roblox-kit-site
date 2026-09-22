const form = document.getElementById('kit-form');
const catButtons = document.querySelectorAll('.cat-btn');
const categoryInput = document.getElementById('category-input');
const fieldsStudio = document.getElementById('fields-studio');
const fieldsLite = document.getElementById('fields-lite');
const fieldsVideo = document.getElementById('fields-video');
const imageLabel = document.getElementById('image-label');
const fileInput = document.getElementById('file');
const robloxIdInput = document.getElementById('robloxId');
const videoInput = document.getElementById('video');
const submitBtn = document.getElementById('submit-btn');
const message = document.getElementById('form-message');
const formTitle = document.getElementById('form-title');
const formIntro = document.getElementById('form-intro');
const fileLabel = document.querySelector('label[for="file"]');

const TOKENS_KEY = 'roblox-kits-my-tokens';

function getMyTokens() {
  try {
    return JSON.parse(localStorage.getItem(TOKENS_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveMyToken(id, editToken) {
  try {
    const tokens = getMyTokens();
    tokens[id] = editToken;
    localStorage.setItem(TOKENS_KEY, JSON.stringify(tokens));
  } catch {
    /* localStorage no disponible: no se puede guardar la clave de edicion */
  }
}

function setCategory(category) {
  categoryInput.value = category;
  catButtons.forEach((b) => b.classList.toggle('active', b.dataset.category === category));

  const isLite = category === 'roblox-studio-lite';

  fieldsStudio.classList.toggle('hidden', isLite);
  fieldsLite.classList.toggle('hidden', !isLite);
  fieldsVideo.classList.toggle('hidden', !isLite);
  imageLabel.textContent = 'Foto del kit (opcional)';

  fileInput.required = !isLite && !editId;
  robloxIdInput.required = isLite;
  videoInput.required = false;
}

catButtons.forEach((btn) => {
  btn.addEventListener('click', () => setCategory(btn.dataset.category));
});

// --- Modo edicion: /subir.html?edit=<id> ---
const editId = new URLSearchParams(window.location.search).get('edit');
let editToken = null;

async function loadForEdit() {
  editToken = getMyTokens()[editId];

  if (!editToken) {
    formTitle.textContent = 'No podés editar este kit';
    formIntro.textContent =
      'Este kit no fue subido desde este navegador, asi que no tenemos la clave para editarlo.';
    form.classList.add('hidden');
    return;
  }

  const res = await fetch(`/api/kits/${editId}`);
  if (!res.ok) {
    formTitle.textContent = 'Kit no encontrado';
    form.classList.add('hidden');
    return;
  }
  const kit = await res.json();

  formTitle.textContent = `Actualizar "${kit.name}"`;
  formIntro.textContent = 'Cambiá la descripción, la versión, o subí archivos nuevos para reemplazar los actuales.';

  document.getElementById('name').value = kit.name;
  document.getElementById('name').readOnly = true;
  document.getElementById('author').value = kit.author || '';
  document.getElementById('description').value = kit.description;
  document.getElementById('tags').value = (kit.tags || []).join(', ');
  document.getElementById('version').value = kit.version || '1.0.0';

  // Categoria fija: no se puede cambiar un kit de tipo al actualizarlo.
  setCategory(kit.category);
  catButtons.forEach((b) => (b.disabled = true));

  if (kit.category === 'roblox-studio') {
    fileInput.required = false;
    fileLabel.textContent = 'Reemplazar archivo .zip (opcional, dejar vacío para mantener el actual)';
  } else {
    robloxIdInput.value = kit.robloxId || '';
    robloxIdInput.required = false;
  }

  submitBtn.textContent = 'Guardar cambios';
}

if (editId) {
  loadForEdit();
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  message.textContent = '';
  message.className = 'form-message';
  submitBtn.disabled = true;
  submitBtn.textContent = editId ? 'Guardando...' : 'Subiendo...';

  try {
    const formData = new FormData(form);
    let res;

    if (editId) {
      formData.set('editToken', editToken);
      res = await fetch(`/api/kits/${editId}`, { method: 'PUT', body: formData });
    } else {
      res = await fetch('/api/kits', { method: 'POST', body: formData });
    }

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'No se pudo guardar el kit.');
    }

    if (!editId && data.editToken) {
      saveMyToken(data.id, data.editToken);
    }

    message.textContent = editId ? '¡Cambios guardados! Redirigiendo...' : '¡Kit publicado! Redirigiendo...';
    message.classList.add('success');
    setTimeout(() => {
      window.location.href = '/';
    }, 1200);
  } catch (err) {
    message.textContent = err.message;
    message.classList.add('error');
    submitBtn.disabled = false;
    submitBtn.textContent = editId ? 'Guardar cambios' : 'Publicar kit';
  }
});

if (!editId) {
  setCategory('roblox-studio');
}
