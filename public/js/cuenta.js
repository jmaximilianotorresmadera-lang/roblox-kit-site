const modeButtons = document.querySelectorAll('.cat-btn[data-mode]');
const fieldUsername = document.getElementById('field-username');
const form = document.getElementById('account-form');
const submitBtn = document.getElementById('account-submit');
const message = document.getElementById('account-message');
const title = document.getElementById('account-title');
const loggedInView = document.getElementById('logged-in-view');
const loggedInName = document.getElementById('logged-in-name');

let mode = 'login';

function setMode(newMode) {
  mode = newMode;
  modeButtons.forEach((b) => b.classList.toggle('active', b.dataset.mode === mode));
  fieldUsername.classList.toggle('hidden', mode !== 'signup');
  submitBtn.textContent = mode === 'signup' ? 'Registrarme' : 'Iniciar sesión';
  title.textContent = mode === 'signup' ? 'Crear cuenta' : 'Iniciar sesión';
  message.textContent = '';
}

modeButtons.forEach((btn) => {
  btn.addEventListener('click', () => setMode(btn.dataset.mode));
});

async function redirectAfterAuth() {
  const params = new URLSearchParams(window.location.search);
  const redirect = params.get('redirect');
  window.location.href = redirect || '/';
}

async function checkAlreadyLoggedIn() {
  const name = await window.RobloxKitsAuth.getDisplayName();
  if (name) {
    form.classList.add('hidden');
    document.querySelector('.category-toggle').classList.add('hidden');
    loggedInView.classList.remove('hidden');
    loggedInName.textContent = name;
  }
}

document.getElementById('logout-btn').addEventListener('click', async () => {
  await window.RobloxKitsAuth.signOut();
  window.location.reload();
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  message.textContent = '';
  message.className = 'form-message';
  submitBtn.disabled = true;

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const username = document.getElementById('username').value.trim();

  try {
    if (mode === 'signup') {
      if (!username) throw new Error('Poné un nombre para tu cuenta.');
      await window.RobloxKitsAuth.signUp({ email, password, username });
      message.textContent = '¡Cuenta creada! Redirigiendo...';
    } else {
      await window.RobloxKitsAuth.signIn({ email, password });
      message.textContent = '¡Listo! Redirigiendo...';
    }
    message.classList.add('success');
    setTimeout(redirectAfterAuth, 900);
  } catch (err) {
    message.textContent = err.message;
    message.classList.add('error');
    submitBtn.disabled = false;
  }
});

setMode('login');
checkAlreadyLoggedIn();
