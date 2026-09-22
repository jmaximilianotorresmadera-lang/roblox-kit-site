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
let countdownInterval = null;

const RATE_LIMIT_KEY = 'roblox-kits-rate-limit-until';
const RATE_LIMIT_MINUTES = 60;

function getRedirectTarget() {
  const params = new URLSearchParams(window.location.search);
  const redirect = params.get('redirect');
  return redirect || '/';
}

function formatCountdown(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

function startRateLimitCountdown(until) {
  try {
    localStorage.setItem(RATE_LIMIT_KEY, String(until));
  } catch {
    /* localStorage no disponible: el cronometro solo dura mientras la pagina siga abierta */
  }

  emailSubmit.disabled = true;

  clearInterval(countdownInterval);
  countdownInterval = setInterval(() => {
    const remaining = until - Date.now();
    if (remaining <= 0) {
      clearInterval(countdownInterval);
      emailSubmit.disabled = false;
      emailSubmit.textContent = 'Enviarme el código';
      message.textContent = 'Ya podés intentar de nuevo.';
      message.className = 'form-message success';
      try {
        localStorage.removeItem(RATE_LIMIT_KEY);
      } catch {
        /* nada que limpiar si no hay localStorage */
      }
      return;
    }
    emailSubmit.textContent = 'Enviarme el código';
    message.textContent = `Mandaste demasiados códigos seguidos. Podés reintentar en ${formatCountdown(remaining)}.`;
    message.className = 'form-message error';
  }, 1000);
}

function checkExistingRateLimit() {
  let stored = null;
  try {
    stored = localStorage.getItem(RATE_LIMIT_KEY);
  } catch {
    return;
  }
  if (!stored) return;
  const until = Number(stored);
  if (until > Date.now()) {
    startRateLimitCountdown(until);
  } else {
    try {
      localStorage.removeItem(RATE_LIMIT_KEY);
    } catch {
      /* nada que limpiar */
    }
  }
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
    emailSubmit.disabled = false;
    emailSubmit.textContent = 'Enviarme el código';
  } catch (err) {
    if (/rate limit/i.test(err.message)) {
      startRateLimitCountdown(Date.now() + RATE_LIMIT_MINUTES * 60 * 1000);
    } else {
      message.textContent = err.message;
      message.classList.add('error');
      emailSubmit.disabled = false;
      emailSubmit.textContent = 'Enviarme el código';
    }
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
checkExistingRateLimit();
