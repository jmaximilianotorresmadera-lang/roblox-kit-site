const grid = document.getElementById('kits-grid');
const searchInput = document.getElementById('search-input');
const tabButtons = document.querySelectorAll('.tab-btn');

let activeCategory = 'all';
let activeQuery = '';

const ADMIN_KEY_STORAGE = 'roblox-kits-admin-key';

function getAdminKey() {
  try {
    return localStorage.getItem(ADMIN_KEY_STORAGE) || '';
  } catch {
    return '';
  }
}

let isAdmin = false;

async function checkAdmin() {
  const key = getAdminKey();
  if (!key) return;
  try {
    const res = await fetch('/api/admin/check', { headers: { 'x-admin-key': key } });
    isAdmin = (await res.json()).admin === true;
  } catch {
    isAdmin = false;
  }
}

function categoryLabel(category) {
  if (category === 'roblox-studio-lite') return 'Studio Lite';
  if (category === 'mapa') return 'Mapa';
  return 'Roblox Studio';
}

function categoryBadgeClass(category) {
  if (category === 'roblox-studio-lite') return 'lite';
  if (category === 'mapa') return 'map';
  return '';
}

function escapeHtml(str = '') {
  return str.replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[c]));
}


function renderKitCard(kit) {
  const isLite = kit.category === 'roblox-studio-lite';

  const verifiedLine = kit.verified
    ? `<a class="verified-badge" href="https://create.roblox.com/store/asset/${encodeURIComponent(kit.robloxId)}" target="_blank" rel="noopener noreferrer" title="Verificado en Roblox: ${escapeHtml(kit.robloxName || '')}">✔ Plugin verificado en Roblox${kit.robloxCreator ? ` · ${escapeHtml(kit.robloxCreator)}` : ''}</a>`
    : '';

  const media = isLite
    ? `
      <div class="kit-media">
        ${
          kit.image
            ? `<img src="${kit.image}" alt="${escapeHtml(kit.name)}" loading="lazy" />`
            : `<div class="kit-noimg"><span>Studio Lite</span></div>`
        }
        ${kit.video ? `<video src="${kit.video}" controls preload="none" ${kit.image ? `poster="${kit.image}"` : ''}></video>` : ''}
      </div>`
    : `<img class="kit-thumb" src="${kit.image}" alt="${escapeHtml(kit.name)}" loading="lazy" />`;

  const action = isLite
    ? `
      <div class="lite-id" title="ID de Roblox del kit">
        <span class="lite-id-label">ID Roblox</span>
        <code>${escapeHtml(kit.robloxId || '—')}</code>
        <button class="copy-btn" type="button" data-id="${escapeHtml(kit.robloxId || '')}">
          Copiar
        </button>
      </div>`
    : `<a class="download-btn" href="${kit.file}" download>Descargar</a>`;

  return `
    <article class="kit-card">
      ${media}
      <div class="kit-card-body">
        <div class="kit-card-top">
          <span class="badge ${categoryBadgeClass(kit.category)}">${categoryLabel(kit.category)}</span>
          <span class="version-badge">v${escapeHtml(kit.version || '1.0.0')}</span>
        </div>
        ${verifiedLine}
        <h3>${escapeHtml(kit.name)}</h3>
        <p>${escapeHtml(kit.description)}</p>
        <div class="tags">
          ${(kit.tags || []).map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join('')}
        </div>
        <div class="kit-meta">por ${escapeHtml(kit.author || 'Anonimo')}</div>
        <div class="kit-actions">
          ${action}
        </div>
        ${isAdmin ? `<button class="delete-btn" type="button" data-id="${escapeHtml(kit.id)}">Borrar kit</button>` : ''}
      </div>
    </article>`;
}

function renderKits(kits) {
  if (!kits.length) {
    grid.innerHTML = '<p class="empty">No se encontraron kits.</p>';
    return;
  }

  grid.innerHTML = kits.map(renderKitCard).join('');

  grid.querySelectorAll('.delete-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('¿Seguro que querés borrar este kit? No se puede deshacer.')) return;
      btn.disabled = true;
      const res = await fetch(`/api/kits/${encodeURIComponent(btn.dataset.id)}`, {
        method: 'DELETE',
        headers: { 'x-admin-key': getAdminKey() },
      });
      if (res.ok) {
        fetchKits();
      } else {
        btn.disabled = false;
        alert('No se pudo borrar el kit.');
      }
    });
  });

  grid.querySelectorAll('.copy-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      try {
        await navigator.clipboard.writeText(id);
        const original = btn.textContent;
        btn.textContent = '¡Copiado!';
        setTimeout(() => (btn.textContent = original), 1200);
      } catch {
        alert(`ID: ${id}`);
      }
    });
  });
}

async function fetchKits() {
  grid.innerHTML = '<p class="loading">Cargando kits...</p>';

  const params = new URLSearchParams();
  if (activeCategory !== 'all') params.set('category', activeCategory);
  if (activeQuery) params.set('q', activeQuery);

  const res = await fetch(`/api/kits?${params.toString()}`);
  const kits = await res.json();
  renderKits(kits);
}

tabButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    tabButtons.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    activeCategory = btn.dataset.category;
    fetchKits();
  });
});

let debounceTimer;
searchInput.addEventListener('input', (e) => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    activeQuery = e.target.value.trim();
    fetchKits();
  }, 250);
});

checkAdmin().then(fetchKits);
