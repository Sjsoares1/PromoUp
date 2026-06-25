// Usa a URL do config ou o localhost como garantia
const API_URL = window.APP_CONFIG?.API_URL || 'http://localhost:9090/api';

function updateUI(statusData) {
  if (!statusData) return;

  // Atualiza Status do Servidor
  const statusEl = document.getElementById('status-servidor');
  if (statusEl) {
    statusEl.textContent = statusData.servidor_online ? 'ONLINE' : 'OFFLINE';
    statusEl.style.color = statusData.servidor_online ? '#10b981' : '#ef4444';
  }
  
  // Atualiza TVs Ativas
  const tvsEl = document.getElementById('total-tvs');
  if (tvsEl) {
    tvsEl.textContent = statusData.tvs_ativas;
  }

  // Atualiza Total Promoções 
  const promocoesEl = document.getElementById('total-promocoes');
  if (promocoesEl) {
    promocoesEl.textContent = statusData.total_promocoes;
  }

  // Atualiza Total TVs Ativas Agora exibindo algo
  const ativasAgoraEl = document.getElementById('total-ativas-agora');
  if (ativasAgoraEl) {
    ativasAgoraEl.textContent = statusData.ativas_agora;
  }
}

function setErrorUI() {
  const statusEl = document.getElementById('status-servidor');
  if (statusEl) {
    statusEl.textContent = 'RECONECTANDO...';
    statusEl.style.color = '#ef4444'; // Fica vermelho em caso de erro
  }
}

function connectSSE() {
  const eventSource = new EventSource(`${API_URL}/stream-status`);

  eventSource.onmessage = (event) => {
    try {
      const statusData = JSON.parse(event.data);
      updateUI(statusData);
    } catch (error) {
      console.error('Erro ao fazer parse dos dados SSE:', error);
    }
  };

  eventSource.onerror = (error) => {
    console.error('Erro na conexão SSE do dashboard:', error);
    setErrorUI();
    // O EventSource tentará reconectar automaticamente.
  };
}

// Inicia a conexão quando a página carrega
window.addEventListener('DOMContentLoaded', () => {
  connectSSE();
});