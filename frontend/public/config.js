// Configuração centralizada para API
// Este arquivo deve ser incluído em todas as páginas HTML

(function() {
  // Detectar automaticamente o servidor
  var currentHost = window.location.hostname;
  var currentPort = window.location.port || (window.location.protocol === 'https:' ? 443 : 80);
  
  // Porta do servidor Electron (9090)
  var serverPort = 9090;
  
  window.APP_CONFIG = {
    // URL base da API - detecta automaticamente
    API_URL: window.location.protocol + '//' + currentHost + ':' + serverPort + '/api',
    // Servidor atual
    SERVER_HOST: currentHost,
    SERVER_PORT: serverPort
  };
  
  console.log('[Config] API URL:', window.APP_CONFIG.API_URL);
})();
