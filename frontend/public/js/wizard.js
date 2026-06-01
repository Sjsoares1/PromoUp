const API_URL = window.APP_CONFIG.API_URL;
let editId = null;

async function checkEditMode() {
  const params = new URLSearchParams(window.location.search);
  editId = params.get('id');

  if (editId) {
    document.getElementById('wizard-title').textContent = 'Editar Televisão';
    document.getElementById('wizard-subtitle').textContent = 'Altere as informações da televisão cadastrada';
    document.getElementById('btn-save-text').textContent = 'Atualizar TV';
    
    try {
      const response = await fetch(`${API_URL}/tvs/${editId}`);
      if (response.ok) {
        const tv = await response.json();
        document.getElementById('nome').value = tv.nome;
        document.getElementById('route_path').value = tv.route_path;
        document.getElementById('filtro_tipo').value = tv.filtro.tipo;
        document.getElementById('cor_fundo').value = tv.layout.cor_fundo;
      }
    } catch (error) {
      console.error('Erro ao carregar dados da TV:', error);
    }
  }
}

async function saveTV(event) {
  event.preventDefault();
  
  const tvData = {
    nome: document.getElementById('nome').value,
    route_path: document.getElementById('route_path').value.toLowerCase().replace(/\s+/g, ''),
    filtro: {
      tipo: document.getElementById('filtro_tipo').value,
      valor: ''
    },
    layout: {
      cor_fundo: document.getElementById('cor_fundo').value,
      cor_tela: '#F8FAFC',
      fonte: 'Inter'
    },
    timeline: [],
    ativa: true
  };

  try {
    const url = editId ? `${API_URL}/tvs/${editId}` : `${API_URL}/tvs`;
    const method = editId ? 'PUT' : 'POST';

    const response = await fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tvData)
    });

    if (response.ok) {
      const result = await response.json();
      const finalId = editId || result.id;
      alert(editId ? 'TV atualizada com sucesso!' : 'TV cadastrada com sucesso!');
      window.location.href = `config_promo.html?tvId=${finalId}`;
    } else {
      alert('Erro ao salvar TV');
    }
  } catch (error) {
    console.error('Erro ao salvar:', error);
    alert('Erro ao salvar TV');
  }
}

window.addEventListener('DOMContentLoaded', () => {
  checkEditMode();
  document.getElementById('tvForm').addEventListener('submit', saveTV);
});