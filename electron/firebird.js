const Firebird = require('node-firebird');
const fs = require('fs');
const path = require('path');

// Função auxiliar para mapear as configurações
function getOptions(config) {
  return {
    host: config.host || '127.0.0.1',
    port: config.porta || config.port || 3050,
    database: config.caminho_banco || config.database,
    user: config.user || 'SYSDBA',
    password: config.password || 'masterkey',
    lowercase_keys: false, // Mantém os nomes das colunas como no banco (ex: PRD_NOME)
    role: null,
    pageSize: 4096,
  };
}

const fbModule = {
  // Testa se a conexão com o banco está viva
  testConnection: (options) => {
    return new Promise((resolve) => {
      Firebird.attach(getOptions(options), function(err, db) {
        if (err) {
          const errMsg = err.message || (typeof err === 'string' ? err : JSON.stringify(err));
          return resolve({ success: false, message: errMsg || 'Erro desconhecido ao conectar' });
        }
        db.query('SELECT current_timestamp as "status" FROM RDB$DATABASE', function(err, result) {
          db.detach();
          if (err) {
            const errMsg = err.message || (typeof err === 'string' ? err : JSON.stringify(err));
            resolve({ success: false, message: errMsg || 'Erro desconhecido ao testar' });
          } else {
            resolve({ success: true, message: 'Conexão nativa estabelecida com sucesso' });
          }
        });
      });
    });
  },

  // Busca OFICIAL de Produtos na TB_PRODUTO
  getProdutos: (options) => {
    return new Promise((resolve, reject) => {
      Firebird.attach(getOptions(options), function(err, db) {
        if (err) return reject(new Error(err.message));
        
        db.query('SELECT PRD_ID, CAST(PRD_DESCRICAO AS VARCHAR(1000) CHARACTER SET OCTETS) AS PRD_DESCRICAO, PRD_PRECO_VENDA, PRD_IMAGEM FROM TB_PRODUTO', function(err, result) {
          db.detach();
          if (err) return reject(new Error(err.message));
          
          try {
            const produtos = result.map(row => {
              const newRow = {};
              Object.keys(row).forEach(key => {
                let val = row[key];
                
                if (typeof val === 'function') {
                  newRow[key] = 'TEM_FOTO';
                } else if (key === 'PRD_DESCRICAO' && Buffer.isBuffer(val)) {
                  // Decodifica usando latin1 para preservar caracteres especiais como Ã, Ó, etc (WIN1252/ISO8859_1)
                  newRow[key] = val.toString('latin1');
                } else if (Buffer.isBuffer(val)) {
                  // Transforma buffer em string se possível
                  newRow[key] = val.toString('utf8');
                } else {
                  newRow[key] = val;
                }
              });
              return newRow;
            });
            resolve(produtos);
          } catch (e) {
            reject(new Error('Falha ao processar dados dos produtos: ' + e.message));
          }
        });
      });
    });
  },

  // Busca OFICIAL de Promoções
  getPromocoes: (options) => {
    return new Promise((resolve, reject) => {
      Firebird.attach(getOptions(options), function(err, db) {
        if (err) return reject(new Error(err.message));
        
        db.query('SELECT * FROM TB_PROMOCAO', function(err, result) {
          db.detach();
          if (err) return reject(new Error(err.message));
          
          try {
            const cleanResult = result.map(row => {
              const newRow = {};
              for (let key in row) {
                const val = row[key];
                if (typeof val === 'function') {
                  newRow[key] = 'TEM_FOTO';
                } else if (Buffer.isBuffer(val)) {
                  newRow[key] = val.toString('utf8');
                } else {
                  newRow[key] = val;
                }
              }
              return newRow;
            });
            resolve(cleanResult);
          } catch (e) {
            reject(new Error('Falha ao processar dados das promoções: ' + e.message));
          }
        });
      });
    });
  },

  // Extrai a foto de um produto e salva no disco
  fetchPhoto: (options, prodId) => {
    return new Promise((resolve, reject) => {
      Firebird.attach(getOptions(options), function(err, db) {
        if (err) return resolve({ success: false, error: err.message });
        
        db.query('SELECT PRD_IMAGEM FROM TB_PRODUTO WHERE PRD_ID = ?', [prodId], function(err, result) {
          if (err) {
            db.detach();
            return resolve({ success: false, error: err.message });
          }
          
          if (result && result.length > 0 && result[0].PRD_IMAGEM) {
            const photoData = result[0].PRD_IMAGEM;
            
            const processBlob = (blobBuffer) => {
              try {
                const targetPath = path.join(__dirname, '../frontend/public/img/produtos');
                if (!fs.existsSync(targetPath)) {
                  fs.mkdirSync(targetPath, { recursive: true });
                }
                const photoFilename = `${prodId}.jpg`;
                fs.writeFileSync(path.join(targetPath, photoFilename), blobBuffer);
                db.detach();
                resolve({ success: true, filename: photoFilename });
              } catch (e) {
                db.detach();
                resolve({ success: false, error: 'Erro ao salvar a foto: ' + e.message });
              }
            };

            if (typeof photoData === 'function') {
              // Lendo o BLOB de forma assíncrona
              photoData(function(err, name, e) {
                if (err) {
                  db.detach();
                  return resolve({ success: false, error: err.message });
                }
                let buffers = [];
                e.on('data', function(chunk) {
                  buffers.push(chunk);
                });
                e.once('end', function() {
                  processBlob(Buffer.concat(buffers));
                });
              });
            } else if (Buffer.isBuffer(photoData)) {
              processBlob(photoData);
            } else {
              db.detach();
              resolve({ success: false, error: "Formato de foto não suportado." });
            }
          } else {
            db.detach();
            resolve({ success: false, error: "Foto não encontrada" });
          }
        });
      });
    });
  }
};

module.exports = fbModule;