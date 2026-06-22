const API_URL = window.APP_CONFIG?.API_URL || 'http://localhost:9090/api';

let todosProdutos = [];
let idsSalvos = new Set();

// Estado da tabela
let sortCol = '';
let sortAsc = true;
let currentPage = 1;
let itemsPerPage = 10;
let searchQuery = '';

// 1. FUNÇÃO PARA BUSCAR DADOS
async function carregarProdutos() {
  const btnSync = document.getElementById('btn-sync');
  const tbody = document.getElementById('tabela-produtos');

  if (btnSync) {
    btnSync.disabled = true;
    btnSync.innerHTML = 'Buscando Produtos...';
  }

  tbody.innerHTML = `<tr><td colspan="5" style="padding: 20px; text-align: center;">Carregando produtos...</td></tr>`;

  try {
    const resLocais = await fetch(`${API_URL}/produtos-selecionados`);
    const produtosSalvos = await resLocais.json();
    idsSalvos = new Set(produtosSalvos.map(p => String(p.id)));

    const resJson = await fetch(`${API_URL}/produtos`);
    if (!resJson.ok) throw new Error("Erro ao consultar ERP");
    const produtosJson = await resJson.json();

    const mapaProdutos = new Map();

    produtosSalvos.forEach(p => {
      mapaProdutos.set(String(p.id), {
        prd_id: p.id,
        prd_descricao: p.nome,
        prd_preco_venda: p.preco,
        prd_foto: p.foto
      });
    });

    if (Array.isArray(produtosJson)) {
      produtosJson.forEach(p => {
        const id = p.prd_id || p.PRD_ID;
        mapaProdutos.set(String(id), p);
      });
    }

    todosProdutos = Array.from(mapaProdutos.values());
    currentPage = 1; // Reseta a página ao recarregar
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

  if (todosProdutos.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="padding: 20px; text-align: center; color: #64748B;">Nenhum produto listado no ERP.</td></tr>`;
    atualizarPaginacao(0, 0);
    return;
  }

  // 1. Filtrar
  let produtosFiltrados = todosProdutos.filter(p => {
    const id = String(p.prd_id || p.PRD_ID || '');
    const descricao = String(p.prd_descricao || p.PRD_DESCRICAO || '').toLowerCase();
    const preco = String(p.prd_preco_venda || p.PRD_PRECO_VENDA || 0);
    return id.includes(searchQuery) || descricao.includes(searchQuery) || preco.includes(searchQuery);
  });

  // 2. Ordenar
  if (sortCol) {
    produtosFiltrados.sort((a, b) => {
      let valA, valB;
      if (sortCol === 'id') {
        valA = Number(a.prd_id || a.PRD_ID) || 0;
        valB = Number(b.prd_id || b.PRD_ID) || 0;
      } else if (sortCol === 'descricao') {
        valA = String(a.prd_descricao || a.PRD_DESCRICAO || '').toLowerCase();
        valB = String(b.prd_descricao || b.PRD_DESCRICAO || '').toLowerCase();
      } else if (sortCol === 'preco') {
        valA = Number(a.prd_preco_venda || a.PRD_PRECO_VENDA || 0);
        valB = Number(b.prd_preco_venda || b.PRD_PRECO_VENDA || 0);
      }
      
      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });
  }

  // 3. Paginar
  const totalItems = produtosFiltrados.length;
  let totalPages = 1;
  let produtosPaginados = produtosFiltrados;

  if (itemsPerPage !== 'all') {
    const limit = parseInt(itemsPerPage, 10);
    totalPages = Math.ceil(totalItems / limit);
    if (totalPages === 0) totalPages = 1;
    if (currentPage > totalPages) currentPage = totalPages;

    const start = (currentPage - 1) * limit;
    const end = start + limit;
    produtosPaginados = produtosFiltrados.slice(start, end);
  } else {
    currentPage = 1;
  }

  if (produtosPaginados.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="padding: 20px; text-align: center; color: #64748B;">Nenhum produto encontrado.</td></tr>`;
  } else {
    produtosPaginados.forEach(produto => {
      const id = produto.prd_id || produto.PRD_ID;
      const descricao = produto.prd_descricao || produto.PRD_DESCRICAO;
      const preco = produto.prd_preco_venda || produto.PRD_PRECO_VENDA || 0;
      const foto = produto.PRD_IMAGEM || produto.prd_imagem || produto.prd_foto || produto.PRD_FOTO;

      const estaMarcado = idsSalvos.has(String(id)) ? 'checked' : '';
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

  atualizarPaginacao(totalItems, totalPages);
  atualizarSetasOrdenacao();
}

function atualizarPaginacao(totalItems, totalPages) {
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
  renderTabela();
}

function mudarItensPorPagina() {
  itemsPerPage = document.getElementById('itensPorPagina').value;
  currentPage = 1;
  renderTabela();
}

function ordenarPor(coluna) {
  if (sortCol === coluna) {
    sortAsc = !sortAsc;
  } else {
    sortCol = coluna;
    sortAsc = true;
  }
  renderTabela();
}

function atualizarSetasOrdenacao() {
  const colunas = ['id', 'descricao', 'preco'];
  colunas.forEach(col => {
    const span = document.getElementById(`sort-${col}`);
    if (span) {
      if (sortCol === col) {
        span.textContent = sortAsc ? ' ↑' : ' ↓';
        span.style.color = '#334155';
        span.style.fontWeight = 'bold';
      } else {
        span.textContent = ' ↕';
        span.style.color = '#94a3b8';
        span.style.fontWeight = 'normal';
      }
    }
  });
}

function sincronizarERP() {
  carregarProdutos();
}

function filtrarTabela() {
  searchQuery = document.getElementById('buscaProduto').value.toLowerCase();
  currentPage = 1; // Reseta para a primeira página ao buscar
  renderTabela();
}

function toggleProduto(idStr, isChecked) {
  if (isChecked) {
    idsSalvos.add(idStr);
  } else {
    idsSalvos.delete(idStr);
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

// 3. FUNÇÃO DO BOTÃO "SALVAR PRODUTOS SELECIONADOS"
async function salvarSelecao() {
  const btnSalvar = document.getElementById('btn-salvar');
  const textoOriginal = btnSalvar.innerHTML;
  btnSalvar.innerHTML = 'Salvando no Banco...';
  btnSalvar.disabled = true;

  const selecionados = [];
  
  idsSalvos.forEach(idStr => {
    const produtoCompleto = todosProdutos.find(p => String(p.prd_id || p.PRD_ID) === idStr);
    if (produtoCompleto) selecionados.push(produtoCompleto);
  });

  try {
    const response = await fetch(`${API_URL}/produtos-selecionados`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(selecionados)
    });

    if (response.ok) {
      // Disparos WebSocket (SSE) ocorrem silenciosamente no backend que vao atualizar a TV na mesma hora.
      btnSalvar.innerHTML = '✔ Salvo com sucesso!';
      btnSalvar.style.backgroundColor = '#10B981';
      setTimeout(() => {
        btnSalvar.innerHTML = textoOriginal;
        btnSalvar.style.backgroundColor = '';
        btnSalvar.disabled = false;
      }, 3000);
      return; // Retorna cedo para não reabilitar o botão no finally imediatamente
    } else {
      btnSalvar.innerHTML = '❌ Erro ao salvar';
      btnSalvar.style.backgroundColor = '#EF4444';
      setTimeout(() => {
        btnSalvar.innerHTML = textoOriginal;
        btnSalvar.style.backgroundColor = '';
        btnSalvar.disabled = false;
      }, 3000);
      return;
    }
  } catch (error) {
    console.error(error);
    btnSalvar.innerHTML = '❌ Falha na conexão';
    btnSalvar.style.backgroundColor = '#EF4444';
    setTimeout(() => {
      btnSalvar.innerHTML = textoOriginal;
      btnSalvar.style.backgroundColor = '';
      btnSalvar.disabled = false;
    }, 3000);
    return;
  }
}

// Inicializa a tabela
window.addEventListener('DOMContentLoaded', () => {
  const inputBusca = document.getElementById('buscaProduto');
  if (inputBusca) inputBusca.value = ''; // Limpa o cache do navegador para não bugar a busca
  carregarProdutos();
});