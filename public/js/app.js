const grid = document.getElementById('kits-grid');
const searchInput = document.getElementById('search-input');
const tabButtons = document.querySelectorAll('.tab-btn');

let activeCategory = 'all';
let activeQuery = '';

function categoryLabel(category) {
  return category === 'roblox-studio-lite' ? 'Studio Lite' : 'Roblox Studio';
}

function renderKits(kits) {
  if (!kits.length) {
    grid.innerHTML = '<p class="empty">No se encontraron kits.</p>';
    return;
  }

  grid.innerHTML = kits
    .map(
      (kit) => `
      <article class="kit-card">
        <img src="${kit.image}" alt="${kit.name}" />
        <div class="kit-card-body">
          <span class="badge ${kit.category === 'roblox-studio-lite' ? 'lite' : ''}">
            ${categoryLabel(kit.category)}
          </span>
          <h3>${kit.name}</h3>
          <p>${kit.description}</p>
          <div class="tags">
            ${kit.tags.map((t) => `<span class="tag">${t}</span>`).join('')}
          </div>
          <a class="download-btn" href="${kit.file}" download>
            Descargar v${kit.version}
          </a>
        </div>
      </article>`
    )
    .join('');
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
