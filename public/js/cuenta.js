const form = document.getElementById('account-form');
const submitBtn = document.getElementById('account-submit');
const message = document.getElementById('account-message');
const loggedInView = document.getElementById('logged-in-view');
const loggedInName = document.getElementById('logged-in-name');

function getRedirectTarget() {
  const params = new URLSearchParams(window.location.search);
  const redirect = params.get('redirect');
  return window.location.origin + (redirect || '/');
}

async function checkAlreadyLoggedIn() {
  const name = await window.RobloxKitsAuth.getDisplayName();
  if (name) {
    form.classList.add('hidden');
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
  submitBtn.textContent = 'Enviando...';

  const email = document.getElementById('email').value.trim();
  const username = document.getElementById('username').value.trim();

  try {
    await window.RobloxKitsAuth.sendMagicLink({ email, username, redirectTo: getRedirectTarget() });
    message.textContent = `¡Listo! Revisá ${email} y hacé clic en el link para entrar.`;
    message.classList.add('success');
    form.querySelectorAll('input, button').forEach((el) => (el.disabled = true));
  } catch (err) {
    message.textContent = err.message;
    message.classList.add('error');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Enviarme el link de acceso';
  }
});

checkAlreadyLoggedIn();
