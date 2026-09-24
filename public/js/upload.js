const form = document.getElementById('kit-form');
const catButtons = document.querySelectorAll('.cat-btn[data-category]');
const categoryInput = document.getElementById('category-input');
const fieldsStudio = document.getElementById('fields-studio');
const fieldsLite = document.getElementById('fields-lite');
const fieldsVideo = document.getElementById('fields-video');
const imageLabel = document.getElementById('image-label');
const fileInput = document.getElementById('file');
const fileLabel = document.getElementById('file-label');
const pluginHint = document.getElementById('plugin-hint');
const robloxIdInput = document.getElementById('robloxId');
const submitBtn = document.getElementById('submit-btn');
const message = document.getElementById('form-message');

function setCategory(category) {
  categoryInput.value = category;
  catButtons.forEach((b) => b.classList.toggle('active', b.dataset.category === category));

  const isLite = category === 'roblox-studio-lite';

  fieldsStudio.classList.toggle('hidden', isLite);
  fieldsLite.classList.toggle('hidden', !isLite);
  fieldsVideo.classList.toggle('hidden', !isLite);
  pluginHint.classList.toggle('hidden', !isLite);
  imageLabel.textContent = 'Foto del kit (opcional)';

  if (category === 'mapa') {
    fileLabel.textContent = 'Archivo del mapa (.rbxl, .rbxlx o .zip, máx 50MB)';
    fileInput.accept = '.rbxl,.rbxlx,.zip';
  } else {
    fileLabel.textContent = 'Archivo del kit (.zip, .rbxm o .rbxmx, máx 50MB)';
    fileInput.accept = '.zip,.rbxm,.rbxmx';
  }

  fileInput.required = !isLite;
  robloxIdInput.required = isLite;
}

catButtons.forEach((btn) => {
  btn.addEventListener('click', () => setCategory(btn.dataset.category));
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  message.textContent = '';
  message.className = 'form-message';
  submitBtn.disabled = true;
  submitBtn.textContent = 'Subiendo...';

  try {
    const res = await fetch('/api/kits', { method: 'POST', body: new FormData(form) });
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'No se pudo guardar el kit.');
    }

    message.textContent = '¡Kit publicado! Redirigiendo...';
    message.classList.add('success');
    setTimeout(() => {
      window.location.href = '/';
    }, 1200);
  } catch (err) {
    message.textContent = err.message;
    message.classList.add('error');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Publicar kit';
  }
});

setCategory('roblox-studio');
