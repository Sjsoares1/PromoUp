const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { startServer, stopServer } = require('./server');

// Função auxiliar para lidar com falhas críticas (Fail-Fast & Recover)
function handleFatalError(error, type) {
    // 3.1 - Converte o erro em uma string formatada (data, hora e stack trace)
    const now = new Date();
    const timestamp = now.toLocaleString('pt-BR');
    const errorMessage = error instanceof Error ? error.stack || error.message : String(error);
    const logEntry = `\n[${timestamp}] [${type}]\n${errorMessage}\n----------------------------------------\n`;

    try {
        // 3.2 - Salva o log no arquivo crash_logs.txt dentro do diretório userData
        const logFilePath = path.join(app.getPath('userData'), 'crash_logs.txt');
        fs.appendFileSync(logFilePath, logEntry);
    } catch (fsError) {
        console.error('Falha ao escrever no log de crash:', fsError);
    }

    // 3.3 - Mostra mensagem amigável para o usuário final
    dialog.showErrorBox(
        'Erro Crítico no Sistema',
        'Ocorreu um erro grave e o aplicativo precisa ser reiniciado para evitar corrupção de dados.\n\n' +
        'O erro já foi registrado nos nossos logs de diagnóstico.\n\n' +
        'O sistema será reiniciado automaticamente após você fechar este aviso.'
    );

    // 3.4 - Reinicia o app imediatamente após o fechamento da janela de diálogo (Fail-Fast & Recover)
    app.relaunch();
    app.exit(1);
}

// Intercepta exceções não tratadas (Síncronas)
process.on('uncaughtException', (error) => {
    handleFatalError(error, 'UNCAUGHT_EXCEPTION');
});

// Intercepta promessas rejeitadas e não tratadas (Assíncronas)
process.on('unhandledRejection', (reason, promise) => {
    handleFatalError(reason, 'UNHANDLED_REJECTION');
});

let mainWindow;
let serverPort = 9090;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, '../frontend/public/icon.png'),
    title: 'PromoUp - Sistema de Gestão'
  });

  // Carrega a página via servidor local em vez de loadFile para evitar bloqueios de CORS
  mainWindow.loadURL(`http://localhost:${serverPort}/firebird.html`);

  // Abrir DevTools em modo desenvolvimento
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  try {
    await startServer(serverPort);
    console.log(`✓ Servidor iniciado na porta ${serverPort}`);
    createWindow();
  } catch (error) {
    console.error('Erro ao iniciar servidor:', error);
    app.quit();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  stopServer();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  stopServer();
});

// IPC Handlers
ipcMain.handle('get-port', () => serverPort);

ipcMain.handle('open-display-window', (event, tvRoute) => {
  const displayWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    fullscreen: true,
    frame: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // Carrega a tela da TV via servidor local também
  displayWindow.loadURL(`http://localhost:${serverPort}/display.html?tv=${tvRoute}`);

  return true;
});

//botao de explorador de arquivos para selecionar o caminho do firebird
ipcMain.handle('dialog:openFile', async (event, options) => {
  const { canceled, filePaths } = await dialog.showOpenDialog(options);
  if (canceled) {
    return null;
  } else {
    return filePaths[0]; // Retorna o caminho do arquivo selecionado
  }
});