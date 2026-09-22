const emailForm = document.getElementById('email-form');
const codeForm = document.getElementById('code-form');
const emailSubmit = document.getElementById('email-submit');
const codeSubmit = document.getElementById('code-submit');
const changeEmailBtn = document.getElementById('change-email-btn');
const message = document.getElementById('account-message');
const introText = document.getElementById('intro-text');
const loggedInView = document.getElementById('logged-in-view');
const loggedInName = document.getElementById('logged-in-name');

let pendingEmail = '';

function getRedirectTarget() {
  const params = new URLSearchParams(window.location.search);
  const redirect = params.get('redirect');
  return redirect || '/';
}

async function checkAlreadyLoggedIn() {
  const name = await window.RobloxKitsAuth.getDisplayName();
  if (name) {
    emailForm.classList.add('hidden');
    codeForm.classList.add('hidden');
    introText.classList.add('hidden');
    loggedInView.classList.remove('hidden');
    loggedInName.textContent = name;
  }
}

document.getElementById('logout-btn').addEventListener('click', async () => {
  await window.RobloxKitsAuth.signOut();
  window.location.reload();
});

changeEmailBtn.addEventListener('click', () => {
  codeForm.classList.add('hidden');
  emailForm.classList.remove('hidden');
  message.textContent = '';
  message.className = 'form-message';
});

emailForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  message.textContent = '';
  message.className = 'form-message';
  emailSubmit.disabled = true;
  emailSubmit.textContent = 'Enviando...';

  const email = document.getElementById('email').value.trim();
  const username = document.getElementById('username').value.trim();

  try {
    await window.RobloxKitsAuth.sendCode({ email, username });
    pendingEmail = email;
    emailForm.classList.add('hidden');
    codeForm.classList.remove('hidden');
    message.textContent = `Te mandamos un código a ${email}. Escribilo abajo (revisá spam si no lo ves).`;
    message.classList.add('success');
    document.getElementById('code').focus();
  } catch (err) {
    message.textContent = err.message;
    message.classList.add('error');
  } finally {
    emailSubmit.disabled = false;
    emailSubmit.textContent = 'Enviarme el código';
  }
});

codeForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  message.textContent = '';
  message.className = 'form-message';
  codeSubmit.disabled = true;
  codeSubmit.textContent = 'Verificando...';

  const code = document.getElementById('code').value.trim();

  try {
    await window.RobloxKitsAuth.verifyCode({ email: pendingEmail, token: code });
    message.textContent = '¡Listo! Redirigiendo...';
    message.classList.add('success');
    setTimeout(() => {
      window.location.href = getRedirectTarget();
    }, 700);
  } catch (err) {
    message.textContent = err.message;
    message.classList.add('error');
    codeSubmit.disabled = false;
    codeSubmit.textContent = 'Confirmar código';
  }
});

checkAlreadyLoggedIn();
