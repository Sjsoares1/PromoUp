const API_URL = window.APP_CONFIG.API_URL;

// Load existing config
async function loadConfig() {
  try {
    const response = await fetch(`${API_URL}/firebird-config`);
    const data = await response.json();
    
    if (data) {
      document.getElementById('caminho_banco').value = data.caminho_banco;
      document.getElementById('porta').value = data.porta;
      document.getElementById('dll_path').value = data.dll_path;
    }
  } catch (error) {
    console.error('Erro ao carregar configuração:', error);
  }
}

// Save config
async function saveConfig(event) {
  event.preventDefault();
  
  const config = {
    caminho_banco: document.getElementById('caminho_banco').value,
    porta: parseInt(document.getElementById('porta').value),
    dll_path: document.getElementById('dll_path').value,
    user: document.getElementById('user').value || 'SYSDBA',
    password: document.getElementById('password').value || 'masterkey',
    created_at: new Date().toISOString()
  };

  try {
    const response = await fetch(`${API_URL}/firebird-config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });

    if (response.ok) {
      alert('Configuração salva com sucesso!');
      // 👇 AQUI FOI FEITA A ALTERAÇÃO: mudou de 'index.html' para 'tvs.html'
      setTimeout(() => window.location.href = 'tvs.html', 500);
    } else {
      alert('Erro ao salvar configuração');
    }
  } catch (error) {
    console.error('Erro ao salvar:', error);
    alert('Erro ao salvar configuração');
  }
}

// Test connection to Firebird
async function testConnection() {
  const caminhoBanco = document.getElementById('caminho_banco').value;
  const porta = document.getElementById('porta').value;
  const dllPath = document.getElementById('dll_path').value;
  const user = document.getElementById('user').value || 'SYSDBA';
  const password = document.getElementById('password').value || 'masterkey';
  
  // Validate required fields
  if (!caminhoBanco) {
    showFeedback('Por favor, insira o caminho do banco de dados', 'error');
    return;
  }
  
  if (!porta) {
    showFeedback('Por favor, insira a porta', 'error');
    return;
  }
  
  // Show loading state
  const btnTest = document.getElementById('btnTestConnection');
  const originalText = btnTest.innerHTML;
  btnTest.disabled = true;
  btnTest.innerHTML = '<svg class="animate-spin" width="20" height="20" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg> Testando...';
  
  // Prepare request body
  const requestBody = {
    host: 'localhost',
    port: parseInt(porta),
    database: caminhoBanco,
    user: user,
    password: password
  };
  
  try {
    const response = await fetch(`${API_URL}/firebird-test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });
    
    const result = await response.json();
    
    if (response.ok && result.status === 'success') {
      showFeedback(`✓ Conexão estabelecida com sucesso! Host: ${result.details.host}:${result.details.port}`, 'success');
    } else {
      showFeedback(`✗ Erro na conexão: ${result.message}`, 'error');
    }
  } catch (error) {
    showFeedback(`✗ Erro ao testar conexão: ${error.message}`, 'error');
  } finally {
    // Restore button state
    btnTest.disabled = false;
    btnTest.innerHTML = originalText;
  }
}

// Show feedback message in the form
function showFeedback(message, type) {
  // Remove existing feedback if any
  const existingFeedback = document.getElementById('connectionFeedback');
  if (existingFeedback) {
    existingFeedback.remove();
  }
  
  // Create feedback element
  const feedback = document.createElement('div');
  feedback.id = 'connectionFeedback';
  feedback.className = `feedback-message feedback-${type}`;
  feedback.textContent = message;
  
  // Insert after the form buttons
  const form = document.getElementById('firebirdForm');
  const buttonsDiv = form.querySelector('.flex');
  buttonsDiv.parentNode.insertBefore(feedback, buttonsDiv.nextSibling);
  
  // Auto-remove after 8 seconds
  setTimeout(() => {
    if (feedback.parentNode) {
      feedback.remove();
    }
  }, 8000);
}

// Abrir explorador de arquivos para o banco de dados
async function browseDatabase() {
  if (window.electronAPI && window.electronAPI.selectFile) {
    const filePath = await window.electronAPI.selectFile({
      title: 'Selecione o arquivo do banco de dados Firebird',
      filters: [
        { name: 'Firebird Database', extensions: ['fdb', 'gdb'] },
        { name: 'Todos os Arquivos', extensions: ['*'] }
      ],
      properties: ['openFile']
    });
    
    if (filePath) {
      document.getElementById('caminho_banco').value = filePath;
    }
  } else {
    alert('A seleção de arquivos não está disponível no modo web.');
  }
}

// Abrir explorador de arquivos para a DLL
async function browseDll() {
  if (window.electronAPI && window.electronAPI.selectFile) {
    const filePath = await window.electronAPI.selectFile({
      title: 'Selecione a DLL do Firebird',
      filters: [
        { name: 'Dynamic Link Library', extensions: ['dll', 'so', 'dylib'] },
        { name: 'Todos os Arquivos', extensions: ['*'] }
      ],
      properties: ['openFile']
    });
    
    if (filePath) {
      document.getElementById('dll_path').value = filePath;
    }
  } else {
    alert('A seleção de arquivos não está disponível no modo web.');
  }
}

window.addEventListener('DOMContentLoaded', () => {
  loadConfig();
  document.getElementById('firebirdForm').addEventListener('submit', saveConfig);
});