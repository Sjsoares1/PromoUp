const API_URL = window.APP_CONFIG?.API_URL || 'http://localhost:9090/api';

let todosProdutos = [];

// 1. FUNÇÃO PARA DESENHAR NA TELA E BUSCAR DIRETAMENTE
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
    const idsSalvos = new Set(produtosSalvos.map(p => String(p.id)));

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
    tbody.innerHTML = '';

    if (todosProdutos.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="padding: 20px; text-align: center; color: #64748B;">Nenhum produto listado no ERP.</td></tr>`;
      return;
    }

    todosProdutos.forEach(produto => {
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

      tr.innerHTML = `
        <td style="padding: 12px 16px;">
          <input type="checkbox" class="check-produto" value="${id}" ${estaMarcado} style="cursor: pointer;">
        </td>
        <td style="padding: 12px 16px;">${htmlFoto}</td>
        <td style="padding: 12px 16px; color: #64748B;">${id}</td>
        <td style="padding: 12px 16px; font-weight: 500;" class="nome-produto">${descricao}</td>
        <td style="padding: 12px 16px; color: #10b981; font-weight: bold; text-align: right;">${precoFormatado}</td>
      `;
      tbody.appendChild(tr);
    });

  } catch (error) {
    console.error(error);
    alert('ERRO: ' + error.message);
    tbody.innerHTML = `<tr><td colspan="5" style="padding: 20px; text-align: center; color: red;">Faça a configuração do Firebird!</td></tr>`;
  } finally {
    if (btnSync) {
      btnSync.disabled = false;
      btnSync.innerHTML = '<svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg> RECARREGAR ERP';
    }
  }
}

function sincronizarERP() {
  carregarProdutos();
}

function filtrarTabela() {
  const input = document.getElementById('buscaProduto').value.toLowerCase();
  const linhas = document.getElementById('tabela-produtos').getElementsByTagName('tr');
  for (let i = 0; i < linhas.length; i++) {
    const nomeDaColuna = linhas[i].getElementsByClassName('nome-produto')[0];
    if (nomeDaColuna) {
      const texto = nomeDaColuna.textContent || nomeDaColuna.innerText;
      linhas[i].style.display = texto.toLowerCase().indexOf(input) > -1 ? "" : "none";
    }
  }
}

function marcarTodos(checkboxGeral) {
  const checkboxes = document.getElementsByClassName('check-produto');
  for (let i = 0; i < checkboxes.length; i++) {
    if (checkboxes[i].closest('tr').style.display !== "none") {
      checkboxes[i].checked = checkboxGeral.checked;
    }
  }
}

// 3. FUNÇÃO DO BOTÃO "SALVAR PRODUTOS SELECIONADOS"
async function salvarSelecao() {
  const btnSalvar = document.getElementById('btn-salvar');
  const textoOriginal = btnSalvar.innerHTML;
  btnSalvar.innerHTML = 'Salvando no Banco...';
  btnSalvar.disabled = true;

  const checkboxes = document.getElementsByClassName('check-produto');
  const selecionados = [];

  for (let i = 0; i < checkboxes.length; i++) {
    if (checkboxes[i].checked) {
      const id = checkboxes[i].value;
      const produtoCompleto = todosProdutos.find(p => String(p.prd_id || p.PRD_ID) === String(id));
      if (produtoCompleto) selecionados.push(produtoCompleto);
    }
  }

  try {
    const response = await fetch(`${API_URL}/produtos-selecionados`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(selecionados)
    });

    if (response.ok) {
      // Disparos WebSocket (SSE) ocorrem silenciosamente no backend que vao atualizar a TV na mesma hora.
      alert(`Sucesso! ${selecionados.length} produtos foram gravados na Vitrine.`);
    } else {
      alert('Erro ao salvar no banco de dados local.');
    }
  } catch (error) {
    console.error(error);
    alert('Erro de conexão ao tentar salvar.');
  } finally {
    btnSalvar.innerHTML = textoOriginal;
    btnSalvar.disabled = false;
  }
}

// Inicializa a tabela
window.addEventListener('DOMContentLoaded', () => carregarProdutos());