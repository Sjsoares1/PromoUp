const http = require('http');
const fs = require('fs');
const path = require('path');
const fbModule = require('./firebird'); 
const { initDatabase, getDb } = require('./database');

let server;
let serverShort;
let shortPort = null;
let sseClients = [];

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml'
};

function notifyTvs(event, data) {
  sseClients.forEach(client => {
    client.res.write(`event: ${event}\n`);
    client.res.write(`data: ${JSON.stringify(data)}\n\n`);
  });
}

function serveStatic(res, filePath) {
  const ext = path.extname(filePath);
  const contentType = MIME_TYPES[ext] || 'text/plain';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not Found');
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}

function safeStringify(obj) {
  return JSON.stringify(obj, (key, value) =>
    typeof value === 'bigint' ? Number(value) : value
  );
}

const getFirebirdOptions = (db) => {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM firebird_config ORDER BY id DESC LIMIT 1', (err, row) => {
      if (err || !row || !row.caminho_banco) {
        return reject('Configuração do Firebird não encontrada no sistema. Salve o caminho do banco nas configurações.');
      }
      resolve({
        host: row.host || '127.0.0.1',
        port: row.porta,
        database: row.caminho_banco,
        user: row.user,
        password: row.password,
        lowercase_keys: true,
        wireCrypt: false
      });
    });
  });
};

function handleAPI(req, res, url, method) {
  const db = getDb();

  // === Server-Sent Events (SSE) Route ===
  if (url === '/api/events' && method === 'GET') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });
    res.write('retry: 10000\n\n'); // Reconnect every 10s if dropped

    const clientId = Date.now();
    const newClient = { id: clientId, res };
    sseClients.push(newClient);

    req.on('close', () => {
      sseClients = sseClients.filter(c => c.id !== clientId);
    });
    return;
  }

  // Regular JSON APIs
  res.setHeader('Content-Type', 'application/json');

  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', () => {
    try {
      const data = body ? JSON.parse(body) : {};

      if (url === '/api/status' && method === 'GET') {
        db.get('SELECT COUNT(*) as count FROM tvs WHERE ativa = 1', (err, rowTvs) => {
          if (err) {
            res.writeHead(500);
            return res.end(safeStringify({ error: err.message }));
          }
          db.get('SELECT COUNT(*) as count FROM produtos_selecionados', (err, rowPromos) => {
            db.get('SELECT COUNT(DISTINCT tv_id) as count FROM tv_configuracoes WHERE ativa = 1', (err, rowAtivas) => {
              const os = require('os');
              const interfaces = os.networkInterfaces();
              let localIp = 'localhost';
              for (const interfaceName in interfaces) {
                const addresses = interfaces[interfaceName];
                for (const addr of addresses) {
                  if (addr.family === 'IPv4' && !addr.internal) {
                    localIp = addr.address;
                    break;
                  }
                }
                if (localIp !== 'localhost') break;
              }

              res.writeHead(200);
              res.end(safeStringify({
                tvs_ativas: rowTvs ? rowTvs.count : 0,
                total_promocoes: rowPromos ? rowPromos.count : 0,
                ativas_agora: rowAtivas ? rowAtivas.count : 0,
                servidor_online: true,
                local_ip: localIp,
                short_port: shortPort
              }));
            });
          });
        });
        return;
      }

      if (url === '/api/firebird-config' && method === 'GET') {
        db.get('SELECT * FROM firebird_config ORDER BY id DESC LIMIT 1', (err, row) => {
          res.writeHead(200);
          res.end(safeStringify(row || null));
        });
        return;
      }

      if (url === '/api/firebird-config' && method === 'POST') {
        db.run('DELETE FROM firebird_config');
        db.run(
          'INSERT INTO firebird_config (caminho_banco, porta, dll_path, user, password, host) VALUES (?, ?, ?, ?, ?, ?)',
          [data.caminho_banco, data.porta, data.dll_path, data.user || 'SYSDBA', data.password || 'masterkey', data.host || '127.0.0.1'],
          function(err) {
            if (err) {
              res.writeHead(500);
              return res.end(safeStringify({ error: err.message }));
            }
            res.writeHead(201);
            res.end(safeStringify({ id: this.lastID, ...data }));
          }
        );
        return;
      }

      if (url === '/api/firebird-test' && method === 'POST') {
        const options = {
          host: data.host || '127.0.0.1',
          port: data.port,
          database: data.database,
          user: data.user || 'SYSDBA',
          password: data.password || 'masterkey',
          lowercase_keys: true,
          wireCrypt: false
        };

        let responded = false;
        const timeoutId = setTimeout(() => {
          if (!responded) {
            responded = true;
            res.writeHead(400);
            res.end(safeStringify({
              status: 'error',
              message: 'Tempo limite esgotado ao tentar conectar. Verifique se o IP/Porta estão corretos e se o banco Firebird está ativo.'
            }));
          }
        }, 5000); // 5 seconds timeout

        fbModule.testConnection(options)
          .then(result => {
            if (responded) return;
            responded = true;
            clearTimeout(timeoutId);
            if (result.success) {
              res.writeHead(200);
              res.end(safeStringify({
                status: 'success',
                message: result.message,
                details: {
                  host: options.host,
                  port: options.port
                }
              }));
            } else {
              res.writeHead(400);
              res.end(safeStringify({
                status: 'error',
                message: result.message
              }));
            }
          })
          .catch(err => {
            if (responded) return;
            responded = true;
            clearTimeout(timeoutId);
            res.writeHead(500);
            res.end(safeStringify({
              status: 'error',
              message: err.message || 'Erro interno ao testar conexão'
            }));
          });
        return;
      }


      if (url === '/api/tvs' && method === 'GET') {
        db.all('SELECT * FROM tvs ORDER BY created_at DESC', (err, rows) => {
          if (err) {
            res.writeHead(500);
            return res.end(safeStringify({ error: err.message }));
          }
          const tvs = rows.map(row => ({
            ...row,
            filtro: JSON.parse(row.filtro || '{}'),
            layout: JSON.parse(row.layout || '{}'),
            timeline: JSON.parse(row.timeline || '[]')
          }));
          res.writeHead(200);
          res.end(safeStringify(tvs));
        });
        return;
      }

      if (url === '/api/tvs' && method === 'POST') {
        const id = 'tv_' + Date.now();
        db.run(
          'INSERT INTO tvs (id, nome, route_path, filtro, layout, timeline, ativa) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [id, data.nome, data.route_path, JSON.stringify(data.filtro || {}), JSON.stringify(data.layout || {}), JSON.stringify(data.timeline || []), 1],
          function(err) {
            if (err) {
              res.writeHead(500);
              return res.end(safeStringify({ error: err.message }));
            }
            res.writeHead(201);
            res.end(safeStringify({ id, ...data }));
            notifyTvs('tv-update', { action: 'tv-created', id }); // Notificação SSE
          }
        );
        return;
      }

      const tvIdMatch = url.match(/^\/api\/tvs\/([^/]+)$/);
      if (tvIdMatch && method === 'GET') {
        const tvId = tvIdMatch[1];
        db.get('SELECT * FROM tvs WHERE id = ?', [tvId], (err, row) => {
          if (err || !row) {
            res.writeHead(404);
            return res.end(safeStringify({ error: 'TV não encontrada' }));
          }
          const tv = {
            ...row,
            filtro: JSON.parse(row.filtro || '{}'),
            layout: JSON.parse(row.layout || '{}'),
            timeline: JSON.parse(row.timeline || '[]')
          };
          res.writeHead(200);
          res.end(safeStringify(tv));
        });
        return;
      }

      if (tvIdMatch && method === 'PUT') {
        const tvId = tvIdMatch[1];
        const updates = [];
        const values = [];
        
        if (data.nome) { updates.push('nome = ?'); values.push(data.nome); }
        if (data.route_path) { updates.push('route_path = ?'); values.push(data.route_path); }
        if (data.filtro) { updates.push('filtro = ?'); values.push(JSON.stringify(data.filtro)); }
        if (data.layout) { updates.push('layout = ?'); values.push(JSON.stringify(data.layout)); }
        if (data.timeline) { updates.push('timeline = ?'); values.push(JSON.stringify(data.timeline)); }
        if (data.ativa !== undefined) { updates.push('ativa = ?'); values.push(data.ativa ? 1 : 0); }
        values.push(tvId);
        
        db.run(
          `UPDATE tvs SET ${updates.join(', ')} WHERE id = ?`, values,
          function(err) {
            if (err) {
              res.writeHead(500);
              return res.end(safeStringify({ error: err.message }));
            }
            res.writeHead(200);
            res.end(safeStringify({ message: 'TV atualizada' }));
            notifyTvs('tv-update', { action: 'tv-updated', id: tvId }); // Notificação SSE
          }
        );
        return;
      }

      // NOVO: Salvar configuração de promoção/cardápio da TV
      const configMatch = url.match(/^\/api\/tvs\/([^/]+)\/configuracao$/);
      if (configMatch && method === 'POST') {
        const tvId = configMatch[1];
        db.run(
          'INSERT INTO tv_configuracoes (tv_id, tipo, produtos, ativa) VALUES (?, ?, ?, 1)',
          [tvId, data.tipo, JSON.stringify(data.produtos || [])],
          function(err) {
            if (err) {
              res.writeHead(500);
              return res.end(safeStringify({ error: err.message }));
            }
            res.writeHead(201);
            res.end(safeStringify({ id: this.lastID, ...data }));
            notifyTvs('tv-update', { action: 'config-updated', tv_id: tvId });
          }
        );
        return;
      }

      // NOVO: Buscar configuração ativa da TV
      if (configMatch && method === 'GET') {
        const tvId = configMatch[1];
        db.get('SELECT * FROM tv_configuracoes WHERE tv_id = ? AND ativa = 1 ORDER BY created_at DESC LIMIT 1', [tvId], (err, row) => {
          if (err) {
            res.writeHead(500);
            return res.end(safeStringify({ error: err.message }));
          }
          if (row) {
            row.produtos = JSON.parse(row.produtos || '[]');
          }
          res.writeHead(200);
          res.end(safeStringify(row || null));
        });
        return;
      }

      const routeMatch = url.match(/^\/api\/tvs\/route\/([^/]+)$/);
      if (routeMatch && method === 'GET') {
        const route = routeMatch[1];
        db.get('SELECT * FROM tvs WHERE route_path = ?', [route], (err, row) => {
          if (err || !row) {
            res.writeHead(404);
            return res.end(safeStringify({ error: 'TV não encontrada' }));
          }
          const tv = {
            ...row,
            filtro: JSON.parse(row.filtro || '{}'),
            layout: JSON.parse(row.layout || '{}'),
            timeline: JSON.parse(row.timeline || '[]')
          };
          res.writeHead(200);
          res.end(safeStringify(tv));
        });
        return;
      }

      if (url === '/api/promocoes' && method === 'GET') {
        getFirebirdOptions(db).then(async options => {
          try {
            const promocoes = await fbModule.getPromocoes(options);
            res.writeHead(200);
            res.end(safeStringify(promocoes));
          } catch (err) {
            res.writeHead(500);
            res.end(safeStringify({ error: 'Erro ao buscar promoções', details: err.message }));
          }
        }).catch(errorMsg => {
          res.writeHead(400);
          res.end(safeStringify({ error: errorMsg }));
        });
        return;
      }

      // ==================================================
      // ===== PRODUTOS (LEMBRANDO QUE NÃO HÁ MAIS JSON)
      // ==================================================
      if (url === '/api/produtos' && method === 'GET') {
         getFirebirdOptions(db).then(async options => {
          try {
            // Removemos o cache temporario local em JSON a pedido do cliente.
            // Agora a busca reflete em tempo real tudo que esta no Firebird para a seleção
            const produtos = await fbModule.getProdutos(options);
            
            // Remove function fields (like blobs) to safely serialize JSON to the client picker
            const safeProdutos = produtos.map(p => {
               const copy = { ...p };
               Object.keys(copy).forEach(k => {
                  if (typeof copy[k] === 'function') {
                      copy[k] = 'TEM_FOTO (' + k + ')'; // Mark it has blob
                  }
               });
               return copy;
            });

            res.writeHead(200);
            res.end(safeStringify(safeProdutos));
          } catch (err) {
            res.writeHead(500);
            res.end(safeStringify({ error: 'Erro ao buscar produtos direto do Firebird', details: err.message }));
          }
        }).catch(errorMsg => {
          res.writeHead(400);
          res.end(safeStringify({ error: errorMsg }));
        });
        return;
      }

      if (url === '/api/produtos-selecionados' && method === 'GET') {
        db.all('SELECT * FROM produtos_selecionados', (err, rows) => {
          if (err) {
            res.writeHead(500);
            return res.end(safeStringify({ error: err.message }));
          }
          res.writeHead(200);
          res.end(safeStringify(rows));
        });
        return;
      }

      if (url === '/api/produtos-selecionados' && method === 'POST') {
        db.serialize(() => {
          db.run('BEGIN TRANSACTION');
          db.run('DELETE FROM produtos_selecionados'); 
          
          const stmt = db.prepare('INSERT INTO produtos_selecionados (id, nome, preco, foto) VALUES (?, ?, ?, ?)');
          
          if (Array.isArray(data)) {
            data.forEach(p => {
              const id = p.PRD_ID || p.prd_id;
              const nome = p.PRD_DESCRICAO || p.prd_descricao || p.nome;
              const preco = p.PRD_PRECO_VENDA || p.prd_preco_venda || p.preco || 0;
              // Ajustado para refletir o caminho persistente
              const foto = (p.PRD_IMAGEM || p.prd_imagem || p.PRD_FOTO || p.prd_foto || p.foto == 'TEM_FOTO') ? 'TEM_FOTO' : null;
              
              stmt.run(String(id), nome, preco, foto);
            });
          }
          
          stmt.finalize();
          db.run('COMMIT', (err) => {
            if (err) {
              res.writeHead(500);
              return res.end(safeStringify({ error: 'Erro ao salvar produtos' }));
            }
            res.writeHead(200);
            res.end(safeStringify({ success: true, message: 'Produtos salvos com sucesso' }));
            
            // FIRE EVENT TO TVs INSTANTLY
            notifyTvs('tv-update', { action: 'produtos-atualizados' });
          });
        });
        return;
      }

      // Endpoint dedicado a baixar a Foto do Firebird sob demanda!
      const photoMatch = url.match(/^\/api\/produtos\/([^/]+)\/foto$/);
      if (photoMatch && method === 'GET') {
        const prodId = photoMatch[1];
        getFirebirdOptions(db).then(options => {
          fbModule.fetchPhoto(options, prodId)
            .then(result => {
              if (result && result.success) {
                const targetFilePath = path.join(__dirname, '../frontend/public/img/produtos', prodId + '.jpg');
                fs.readFile(targetFilePath, (err, fileData) => {
                  if (err) {
                    res.writeHead(404);
                    res.end();
                    return;
                  }
                  res.writeHead(200, { 'Content-Type': 'image/jpeg' });
                  res.end(fileData);
                });
              } else {
                res.writeHead(404);
                res.end();
              }
            })
            .catch(err => {
              res.writeHead(500);
              res.end(safeStringify({ error: err.message }));
            });
        }).catch(err => {
          res.writeHead(500);
          res.end(safeStringify({ error: err.message }));
        });
        return;
      }

      res.writeHead(404);
      res.end(safeStringify({ error: 'Endpoint não encontrado' }));
      
    } catch (error) {
      res.writeHead(500);
      res.end(safeStringify({ error: error.message }));
    }
  });
}

function requestHandler(req, res) {
  const url = req.url.split('?')[0];
  const method = req.method;

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (url.startsWith('/api/')) {
    handleAPI(req, res, url, method);
    return;
  }

  let filePath = path.join(__dirname, '../frontend/public', url === '/' ? 'index.html' : url);

  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      // O arquivo não existe. Vamos verificar se é uma rota de TV.
      const possibleRoute = decodeURIComponent(url.substring(1)); // remove a barra inicial
      const db = getDb();
      if (db && possibleRoute) {
        db.get('SELECT id FROM tvs WHERE route_path = ?', [possibleRoute], (dbErr, row) => {
          if (!dbErr && row) {
            const displayFilePath = path.join(__dirname, '../frontend/public/display.html');
            serveStatic(res, displayFilePath);
            return;
          }
          res.writeHead(404);
          res.end('Not Found');
        });
        return;
      }
    }
    serveStatic(res, filePath);
  });
}

async function startServer(port) {
  await initDatabase();

  server = http.createServer(requestHandler);

  const primaryPromise = new Promise((resolve, reject) => {
    server.listen(port, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });

  // Tenta iniciar o servidor secundário na porta 80. Caso falhe, tenta a porta 81.
  serverShort = http.createServer(requestHandler);
  
  serverShort.once('error', (err) => {
    console.log(`ℹ Não foi possível iniciar o servidor secundário na porta 80: ${err.message}`);
    // Se a porta 80 falhou, tenta a porta 81
    try {
      serverShort = http.createServer(requestHandler);
      serverShort.listen(81, () => {
        shortPort = 81;
        console.log(`✓ Servidor secundário iniciado na porta 81 (acesso curto alternativo)`);
      });
      serverShort.on('error', (err81) => {
        console.log(`ℹ Servidor secundário na porta 81 também não foi iniciado: ${err81.message}`);
        shortPort = null;
        serverShort = null;
      });
    } catch (e) {
      console.log(`ℹ Erro ao tentar abrir porta 81: ${e.message}`);
      shortPort = null;
      serverShort = null;
    }
  });

  try {
    serverShort.listen(80, () => {
      shortPort = 80;
      console.log(`✓ Servidor secundário iniciado na porta 80 (acesso curto)`);
    });
  } catch (err) {
    console.log(`ℹ Erro ao tentar abrir porta 80: ${err.message}`);
  }

  return primaryPromise;
}

function stopServer() {
  if (server) server.close();
  if (serverShort) {
    try {
      serverShort.close();
    } catch (e) {}
  }
  sseClients.forEach(c => c.res.end());
}

module.exports = { startServer, stopServer };