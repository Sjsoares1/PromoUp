const API_URL = window.APP_CONFIG.API_URL;
let selectedMode = 'cardapio';
let selectedProducts = new Set();
let tvId = '';

async function loadConfigurationData() {
  const params = new URLSearchParams(window.location.search);
  tvId = params.get('tvId');

  if (!tvId) {
    alert('TV não encontrada!');
    window.location.href = 'tvs.html';
    return;
  }

  try {
    // Carregar informações da TV
    const tvResponse = await fetch(`${API_URL}/tvs/${tvId}`);
    if (!tvResponse.ok) throw new Error('TV não encontrada');
    const tv = await tvResponse.json();
    document.getElementById('tv-name-header').textContent = `Configurar TV: ${tv.nome}`;

    // Carregar produtos selecionados (do SQLite)
    const prodResponse = await fetch(`${API_URL}/produtos-selecionados`);
    const produtos = await prodResponse.json();
    
    // Carregar configuração existente (se houver)
    const configResponse = await fetch(`${API_URL}/tvs/${tvId}/configuracao`);
    const config = await configResponse.json();

    if (config) {
      selectMode(config.tipo);
      config.produtos.forEach(id => selectedProducts.add(String(id)));
    }

    renderProducts(produtos);
    updateSelectedCount();

  } catch (error) {
    console.error('Erro ao carregar dados:', error);
    alert('Erro ao carregar informações da configuração.');
  }
}

function renderProducts(produtos) {
  const grid = document.getElementById('product-grid');
  grid.innerHTML = '';

  if (produtos.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <h3>Nenhum produto selecionado no banco</h3>
        <p>Vá em "Produtos do Cardápio" e selecione alguns itens primeiro.</p>
        <a href="produtos.html" class="btn btn-secondary">Ir para Produtos</a>
      </div>
    `;
    return;
  }

  produtos.forEach(p => {
    const isSelected = selectedProducts.has(String(p.id));
    const card = document.createElement('div');
    card.className = `product-item-card ${isSelected ? 'selected' : ''}`;
    card.id = `prod-${p.id}`;
    card.onclick = () => toggleProduct(String(p.id));

    // Handle Image
    let imgHtml = `
      <div class="img-placeholder-small">
        <svg width="32" height="32" fill="none" stroke="#CBD5E1" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
        </svg>
      </div>`;
    
    if (p.foto === 'TEM_FOTO') {
      imgHtml = `
        <div class="img-placeholder-small">
          <img src="${API_URL}/produtos/${p.id}/foto" alt="${p.nome}" onerror="this.onerror=null; this.src='img/sample_product.png';">
        </div>`;
    }

    card.innerHTML = `
      <input type="checkbox" ${isSelected ? 'checked' : ''} onclick="event.stopPropagation()">
      ${imgHtml}
      <div style="font-weight: 600; font-size: 14px; margin-bottom: 4px;">${p.nome}</div>
      <div style="font-size: 14px; color: #10B981; font-weight: bold;">
        ${Number(p.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
      </div>
    `;
    grid.appendChild(card);
  });
}

function selectMode(mode) {
  selectedMode = mode;
  document.getElementById('mode-cardapio').classList.toggle('active', mode === 'cardapio');
  document.getElementById('mode-promocao').classList.toggle('active', mode === 'promocao');
}

function toggleProduct(id) {
  const card = document.getElementById(`prod-${id}`);
  const checkbox = card.querySelector('input[type="checkbox"]');
  
  if (selectedProducts.has(id)) {
    selectedProducts.delete(id);
    card.classList.remove('selected');
    checkbox.checked = false;
  } else {
    selectedProducts.add(id);
    card.classList.add('selected');
    checkbox.checked = true;
  }
  updateSelectedCount();
}

function updateSelectedCount() {
  document.getElementById('selected-count').textContent = selectedProducts.size;
}

async function saveConfiguration() {
  const btn = document.getElementById('btn-save-config');
  btn.disabled = true;
  btn.innerHTML = 'Salvando...';

  const configData = {
    tipo: selectedMode,
    produtos: Array.from(selectedProducts)
  };

  try {
    const response = await fetch(`${API_URL}/tvs/${tvId}/configuracao`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(configData)
    });

    if (response.ok) {
      alert('Configuração ativada com sucesso!');
      window.location.href = 'tvs.html';
    } else {
      alert('Erro ao salvar configuração.');
    }
  } catch (error) {
    console.error('Erro ao salvar:', error);
    alert('Erro de conexão com o servidor.');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg> Ativar Configuração na TV';
  }
}

window.addEventListener('DOMContentLoaded', loadConfigurationData);
