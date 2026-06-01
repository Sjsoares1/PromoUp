// Usa a URL do config ou o localhost como garantia
const API_URL = window.APP_CONFIG?.API_URL || 'http://localhost:9090/api';

async function updateDashboard() {
  try {
    // 1. Busca os status gerais do sistema (agora pegando tudo do SQLite no backend)
    const statusRes = await fetch(`${API_URL}/status`);
    const statusData = await statusRes.json();

    if (statusData) {
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

  } catch (error) {
    console.error('Erro ao atualizar dashboard:', error);
    const statusEl = document.getElementById('status-servidor');
    if (statusEl) {
      statusEl.textContent = 'ERRO';
      statusEl.style.color = '#ef4444'; // Fica vermelho em caso de erro
    }
  }
}

// Inicia a atualização quando a página carrega
window.addEventListener('DOMContentLoaded', () => {
  updateDashboard();
  
  // Auto-refresh a cada 5 segundos para manter a tela sempre atualizada
  setInterval(updateDashboard, 5000);
});