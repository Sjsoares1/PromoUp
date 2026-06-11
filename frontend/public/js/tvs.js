const API_URL = window.APP_CONFIG.API_URL;

let tvs = [];
let routePrefix = 'http://localhost:9090/display.html?tv='; // Fallback padrão

async function loadTVs() {
  try {
    try {
      const statusRes = await fetch(`${API_URL}/status`);
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        if (statusData && statusData.local_ip) {
          if (statusData.short_port) {
            const port = statusData.short_port;
            routePrefix = `http://${statusData.local_ip}${port === 80 ? '' : ':' + port}/`;
          } else {
            routePrefix = `http://${statusData.local_ip}:9090/`;
          }
        }
      }
    } catch (e) {
      console.warn('Não foi possível obter status do IP local, usando fallback.', e);
    }

    const response = await fetch(`${API_URL}/tvs`);
    tvs = await response.json();
    
    document.getElementById('tvCount').textContent = 
      `${tvs.length} ${tvs.length === 1 ? 'televisão cadastrada' : 'televisões cadastradas'}`;
    
    renderTVs();
  } catch (error) {
    console.error('Erro ao carregar TVs:', error);
    document.getElementById('tvsContainer').innerHTML = 
      '<div class="empty-state"><h3>Erro ao carregar televisões</h3></div>';
  }
}

function renderTVs() {
  const container = document.getElementById('tvsContainer');
  
  if (tvs.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <h3>Nenhuma televisão cadastrada ainda</h3>
        <p>Comece cadastrando sua primeira TV</p>
        <a href="wizard.html" class="btn btn-primary mt-4">
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
          </svg>
          Cadastrar Primeira TV
        </a>
      </div>
    `;
    return;
  }
  
  const grid = document.createElement('div');
  grid.className = 'card-grid';
  grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(350px, 1fr))';
  
  tvs.forEach(tv => {
    const card = document.createElement('div');
    card.className = 'tv-card';
    card.innerHTML = `
      <div class="tv-card-header">
        <div class="tv-icon">
          <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
              d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
          </svg>
        </div>
        <div style="flex: 1;">
          <h3 style="font-size: 18px; margin-bottom: 4px;">${tv.nome}</h3>
          <span class="badge ${tv.ativa ? 'badge-success' : 'badge-danger'}">
            ${tv.ativa ? 'Ativa' : 'Inativa'}
          </span>
        </div>
      </div>
      
      <div>
        <p style="font-size: 12px; color: #64748B; margin-bottom: 4px;">Endereço de Acesso:</p>
        <div class="tv-url">${routePrefix === 'http://localhost:9090/display.html?tv=' ? `http://localhost:9090/display.html?tv=${tv.route_path}` : `${routePrefix}${tv.route_path}`}</div>
      </div>
      
      <div class="tv-actions">
        <button onclick="editTV('${tv.id}')" class="btn btn-secondary" style="flex: 1;">
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
          </svg>
          Editar
        </button>
        <button onclick="configurePromo('${tv.id}')" class="btn btn-primary" title="Configurar Promoções">
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
          </svg>
          Produtos
        </button>
        <button onclick="openDisplay('${tv.route_path}')" class="btn btn-secondary" title="Ver TV">
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
          </svg>
        </button>
        <button onclick="deleteTV('${tv.id}', '${tv.nome}')" class="btn btn-danger" title="Excluir">
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
          </svg>
        </button>
      </div>
    `;
    grid.appendChild(card);
  });
  
  container.innerHTML = '';
  container.appendChild(grid);
}

function editTV(id) {
  window.location.href = `wizard.html?id=${id}`;
}

function configurePromo(id) {
  window.location.href = `config_promo.html?tvId=${id}`;
}

function openDisplay(route) {
  const url = routePrefix === 'http://localhost:9090/display.html?tv=' ? `display.html?tv=${route}` : `${routePrefix}${route}`;
  window.open(url, '_blank', 'fullscreen=yes');
}

async function deleteTV(id, nome) {
  if (!confirm(`Tem certeza que deseja deletar a TV "${nome}"?`)) {
    return;
  }
  
  try {
    const response = await fetch(`${API_URL}/tvs/${id}`, { method: 'DELETE' });
    if (response.ok) {
      alert('TV deletada com sucesso!');
      loadTVs();
    } else {
      alert('Erro ao deletar TV');
    }
  } catch (error) {
    console.error('Erro ao deletar:', error);
    alert('Erro ao deletar TV');
  }
}

window.addEventListener('DOMContentLoaded', loadTVs);