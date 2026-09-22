// Helper de autenticacion compartido por todas las paginas.
// Expone window.RobloxKitsAuth con funciones para registrarse, iniciar sesion, etc.
window.RobloxKitsAuth = (function () {
  let client = null;
  let configPromise = null;

  async function getConfig() {
    if (!configPromise) {
      configPromise = fetch('/api/config').then((r) => r.json());
    }
    return configPromise;
  }

  async function getClient() {
    if (client) return client;
    const config = await getConfig();
    if (!config.authEnabled) return null;
    client = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
    return client;
  }

  async function getSession() {
    const c = await getClient();
    if (!c) return null;
    const { data } = await c.auth.getSession();
    return data.session;
  }

  async function getAccessToken() {
    const session = await getSession();
    return session ? session.access_token : null;
  }

  async function getDisplayName() {
    const session = await getSession();
    if (!session) return null;
    return (session.user.user_metadata && session.user.user_metadata.username) || session.user.email;
  }

  // Envia un "link magico" al email: al hacer clic, la persona queda logueada.
  // Si el email es nuevo, se crea la cuenta sola con ese nombre de usuario.
  async function sendMagicLink({ email, username, redirectTo }) {
    const c = await getClient();
    if (!c) throw new Error('El inicio de sesion no esta disponible en este momento.');
    const { error } = await c.auth.signInWithOtp({
      email,
      options: {
        data: username ? { username } : undefined,
        emailRedirectTo: redirectTo || window.location.origin + '/',
      },
    });
    if (error) throw new Error(error.message);
  }

  async function signOut() {
    const c = await getClient();
    if (!c) return;
    await c.auth.signOut();
  }

  async function renderAuthStatus() {
    const el = document.getElementById('auth-status');
    if (!el) return;

    const config = await getConfig();
    if (!config.authEnabled) {
      el.innerHTML = '';
      return;
    }

    const name = await getDisplayName();
    if (name) {
      el.innerHTML = `<span class="auth-name">${name}</span> <a href="#" id="nav-logout">Salir</a>`;
      document.getElementById('nav-logout').addEventListener('click', async (e) => {
        e.preventDefault();
        await signOut();
        window.location.reload();
      });
    } else {
      el.innerHTML = '<a href="/cuenta.html">Iniciar sesión</a>';
    }
  }

  document.addEventListener('DOMContentLoaded', renderAuthStatus);

  return { getConfig, getClient, getSession, getAccessToken, getDisplayName, sendMagicLink, signOut, renderAuthStatus };
})();
