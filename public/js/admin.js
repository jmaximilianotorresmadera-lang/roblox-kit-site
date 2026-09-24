const STORAGE_KEY = 'roblox-kits-admin-key';
const form = document.getElementById('admin-form');
const active = document.getElementById('admin-active');
const message = document.getElementById('admin-message');

async function isKeyValid(key) {
  const res = await fetch('/api/admin/check', { headers: { 'x-admin-key': key } });
  return (await res.json()).admin === true;
}

function showActive(on) {
  form.classList.toggle('hidden', on);
  active.classList.toggle('hidden', !on);
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  message.textContent = '';
  message.className = 'form-message';
  const key = document.getElementById('admin-key').value;

  if (await isKeyValid(key)) {
    try {
      localStorage.setItem(STORAGE_KEY, key);
    } catch {
      message.textContent = 'Tu navegador no deja guardar la clave (¿modo privado?).';
      message.classList.add('error');
      return;
    }
    showActive(true);
  } else {
    message.textContent = 'Clave incorrecta.';
    message.classList.add('error');
  }
});

document.getElementById('admin-off').addEventListener('click', () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* nada que quitar */
  }
  showActive(false);
});

(async function init() {
  let key = '';
  try {
    key = localStorage.getItem(STORAGE_KEY) || '';
  } catch {
    /* sin localStorage */
  }
  showActive(key ? await isKeyValid(key) : false);
})();
