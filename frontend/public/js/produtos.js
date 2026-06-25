const API_URL = window.APP_CONFIG?.API_URL || 'http://localhost:9090/api';

let produtosNaPagina = [];
let produtosSelecionadosMap = new Map(); // id -> objeto produto
let primeiraCarga = true;

// Utilitário de Debounce
function debounce(func, wait) {
  let timeout;
  return function(...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), wait);
  };
}


// Estado da tabela
let currentPage = 1;
let itemsPerPage = 50;
let searchQuery = '';
let totalItems = 0;
let totalPages = 1;

// 1. FUNÇÃO PARA BUSCAR DADOS
async function carregarProdutos(resetPage = false) {
  if (resetPage) currentPage = 1;

  const btnSync = document.getElementById('btn-sync');
  const tbody = document.getElementById('tabela-produtos');

  if (btnSync) {
    btnSync.disabled = true;
    btnSync.innerHTML = 'Buscando Produtos...';
  }

  tbody.innerHTML = `<tr><td colspan="5" style="padding: 20px; text-align: center;">Carregando produtos...</td></tr>`;

  try {
    if (primeiraCarga) {
      const resLocais = await fetch(`${API_URL}/produtos-selecionados`);
      const produtosSalvos = await resLocais.json();
      
      produtosSalvos.forEach(p => {
        produtosSelecionadosMap.set(String(p.id), {
          prd_id: p.id,
          prd_descricao: p.nome,
          prd_preco_venda: p.preco,
          prd_foto: p.foto
        });
      });
      primeiraCarga = false;
    }

    const limitQuery = itemsPerPage === 'all' ? 10000 : itemsPerPage;
    const url = `${API_URL}/produtos?page=${currentPage}&limit=${limitQuery}&search=${encodeURIComponent(searchQuery)}`;

    const resJson = await fetch(url);
    if (!resJson.ok) throw new Error("Erro ao consultar ERP");
    
    const result = await resJson.json();

    produtosNaPagina = result.data || [];
    totalItems = result.total || 0;
    
    // Calcula total de páginas
    if (limitQuery >= totalItems) {
      totalPages = 1;
    } else {
      totalPages = Math.ceil(totalItems / limitQuery);
    }
    
    if (totalPages === 0) totalPages = 1;
    if (currentPage > totalPages) currentPage = totalPages;

    renderTabela();

  } catch (error) {
    console.error(error);
    tbody.innerHTML = `<tr><td colspan="5" style="padding: 20px; text-align: center; color: red;">Faça a configuração do Firebird! Erro: ${error.message}</td></tr>`;
  } finally {
    if (btnSync) {
      btnSync.disabled = false;
      btnSync.innerHTML = '<svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg> RECARREGAR ERP';
    }
  }
}

function renderTabela() {
  const tbody = document.getElementById('tabela-produtos');
  tbody.innerHTML = '';

  if (produtosNaPagina.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="padding: 20px; text-align: center; color: #64748B;">Nenhum produto encontrado.</td></tr>`;
  } else {
    produtosNaPagina.forEach(produto => {
      const id = produto.prd_id || produto.PRD_ID;
      const descricao = produto.prd_descricao || produto.PRD_DESCRICAO;
      const preco = produto.prd_preco_venda || produto.PRD_PRECO_VENDA || 0;
      const foto = produto.PRD_IMAGEM || produto.prd_imagem || produto.prd_foto || produto.PRD_FOTO;

      const estaMarcado = produtosSelecionadosMap.has(String(id)) ? 'checked' : '';
      const precoFormatado = Number(preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

      let htmlFoto = `<div style="width: 40px; height: 40px; background: #e2e8f0; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #64748B;">Sem Foto</div>`;
      if (foto === 'TEM_FOTO' || (typeof foto === 'string' && foto.includes('TEM_FOTO'))) {
        htmlFoto = `<img src="${API_URL}/produtos/${id}/foto" style="width: 40px; height: 40px; object-fit: cover; border-radius: 4px; background: #10b981;" alt="Foto" onerror="this.onerror=null; this.src='img/sample_product.png';">`;
      }

      const tr = document.createElement('tr');
      tr.style.borderBottom = '1px solid #f1f5f9';
      tr.style.cursor = 'pointer';

      tr.innerHTML = `
        <td style="padding: 12px 16px;">
          <input type="checkbox" class="check-produto" value="${id}" ${estaMarcado} onchange="toggleProduto('${id}', this.checked)" style="cursor: pointer;" onclick="event.stopPropagation()">
        </td>
        <td style="padding: 12px 16px;">${htmlFoto}</td>
        <td style="padding: 12px 16px; color: #64748B;">${id}</td>
        <td style="padding: 12px 16px; font-weight: 500;" class="nome-produto">${descricao}</td>
        <td style="padding: 12px 16px; color: #10b981; font-weight: bold; text-align: right;">${precoFormatado}</td>
      `;
      
      tr.addEventListener('click', () => {
        const checkbox = tr.querySelector('.check-produto');
        if (checkbox) {
          checkbox.checked = !checkbox.checked;
          toggleProduto(String(id), checkbox.checked);
        }
      });
      
      tbody.appendChild(tr);
    });
  }

  atualizarPaginacao();
}

function atualizarPaginacao() {
  const info = document.getElementById('info-paginacao');
  const btnPrev = document.getElementById('btn-prev');
  const btnNext = document.getElementById('btn-next');
  const spanPagina = document.getElementById('pagina-atual');

  if (!info || !btnPrev || !btnNext || !spanPagina) return;

  if (totalItems === 0) {
    info.textContent = `Nenhum produto`;
  } else if (itemsPerPage === 'all') {
    info.textContent = `Mostrando todos os ${totalItems} produtos`;
  } else {
    const limit = parseInt(itemsPerPage, 10);
    const start = (currentPage - 1) * limit + 1;
    const end = Math.min(currentPage * limit, totalItems);
    info.textContent = `Mostrando ${start} até ${end} de ${totalItems} produtos`;
  }

  spanPagina.textContent = itemsPerPage === 'all' ? 1 : currentPage;
  btnPrev.disabled = currentPage <= 1 || itemsPerPage === 'all';
  btnNext.disabled = currentPage >= totalPages || itemsPerPage === 'all';
}

function mudarPagina(delta) {
  currentPage += delta;
  carregarProdutos();
}

function mudarItensPorPagina() {
  itemsPerPage = document.getElementById('itensPorPagina').value;
  carregarProdutos(true);
}

function sincronizarERP() {
  carregarProdutos(true);
}

function filtrarTabela() {
  searchQuery = document.getElementById('buscaProduto').value.toLowerCase();
  carregarProdutos(true); // Sempre recarrega na primeira pagina
}

function toggleProduto(idStr, isChecked) {
  if (isChecked) {
    const produto = produtosNaPagina.find(p => String(p.prd_id || p.PRD_ID) === idStr);
    if (produto) {
      produtosSelecionadosMap.set(idStr, produto);
    }
  } else {
    produtosSelecionadosMap.delete(idStr);
  }
}

function marcarTodos(checkboxGeral) {
  const checkboxes = document.getElementsByClassName('check-produto');
  const isChecked = checkboxGeral.checked;
  for (let i = 0; i < checkboxes.length; i++) {
    checkboxes[i].checked = isChecked;
    toggleProduto(checkboxes[i].value, isChecked);
  }
}

// Sistema de Toast Notification
function mostrarToast(mensagem, tipo = 'sucesso') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${tipo}`;
  
  let iconSvg = '';
  if (tipo === 'sucesso') {
    iconSvg = `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>`;
  } else {
    iconSvg = `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>`;
  }

  toast.innerHTML = `
    <div class="toast-icon">${iconSvg}</div>
    <div class="toast-message">${mensagem}</div>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('fade-out');
    toast.addEventListener('animationend', () => {
      toast.remove();
    });
  }, 3500);
}

// 3. FUNÇÃO DO BOTÃO "SALVAR PRODUTOS SELECIONADOS"
async function salvarSelecao() {
  const btnSalvar = document.getElementById('btn-salvar');
  const textoOriginal = btnSalvar.innerHTML;
  btnSalvar.innerHTML = 'Salvando no Banco...';
  btnSalvar.disabled = true;

  const selecionados = Array.from(produtosSelecionadosMap.values());

  try {
    const response = await fetch(`${API_URL}/produtos-selecionados`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(selecionados)
    });

    if (response.ok) {
      mostrarToast('Configurações salvas com sucesso!', 'sucesso');
    } else {
      mostrarToast('Erro ao salvar configurações.', 'erro');
    }
  } catch (error) {
    console.error(error);
    mostrarToast('Falha na conexão com o servidor.', 'erro');
  } finally {
    btnSalvar.innerHTML = textoOriginal;
    btnSalvar.disabled = false;
  }
}

// Inicializa a tabela
window.addEventListener('DOMContentLoaded', () => {
  const inputBusca = document.getElementById('buscaProduto');
  if (inputBusca) {
    inputBusca.value = ''; // Limpa o cache do navegador para não bugar a busca
    
    // Adiciona o evento de input com debounce de 300ms
    inputBusca.addEventListener('input', debounce(filtrarTabela, 300));
  }
  
  // Set default pagination to 50
  const selectItens = document.getElementById('itensPorPagina');
  if (selectItens) {
    selectItens.value = '50';
    itemsPerPage = 50;
  }
  
  carregarProdutos();
});