const grid = document.getElementById('kits-grid');
const searchInput = document.getElementById('search-input');
const tabButtons = document.querySelectorAll('.tab-btn');

let activeCategory = 'all';
let activeQuery = '';

function categoryLabel(category) {
  return category === 'roblox-studio-lite' ? 'Studio Lite' : 'Roblox Studio';
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

  const editLink = `<a class="edit-link" href="/subir.html?edit=${encodeURIComponent(kit.id)}">Actualizar</a>`;

  const authorLine = kit.updatedBy && kit.updatedBy !== kit.author
    ? `por ${escapeHtml(kit.author || 'Anonimo')} · editado por ${escapeHtml(kit.updatedBy)}`
    : `por ${escapeHtml(kit.author || 'Anonimo')}`;

  return `
    <article class="kit-card">
      ${media}
      <div class="kit-card-body">
        <div class="kit-card-top">
          <span class="badge ${isLite ? 'lite' : ''}">${categoryLabel(kit.category)}</span>
          <span class="version-badge">v${escapeHtml(kit.version || '1.0.0')}</span>
        </div>
        <h3>${escapeHtml(kit.name)}</h3>
        <p>${escapeHtml(kit.description)}</p>
        <div class="tags">
          ${(kit.tags || []).map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join('')}
        </div>
        <div class="kit-meta">${authorLine}</div>
        <div class="kit-actions">
          ${action}
          ${editLink}
        </div>
      </div>
    </article>`;
}

function renderKits(kits) {
  if (!kits.length) {
    grid.innerHTML = '<p class="empty">No se encontraron kits.</p>';
    return;
  }

  grid.innerHTML = kits.map(renderKitCard).join('');

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

fetchKits();
