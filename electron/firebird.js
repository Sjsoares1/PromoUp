const Firebird = require('node-firebird');

const fbModule = {
  // Testa se a conexão com o banco está viva
  testConnection: (options) => {
    return new Promise((resolve, reject) => {
      Firebird.attach(options, (err, db) => {
        if (err) {
          return resolve({ success: false, message: err.message });
        }
        db.query("SELECT 'OK' as status FROM RDB$DATABASE", (err, result) => {
          db.detach();
          if (err) {
            return resolve({ success: false, message: err.message });
          }
          resolve({ success: true, message: 'Conexão Firebird estabelecida com sucesso' });
        });
      });
    });
  },

  // Busca OFICIAL de Produtos na TB_PRODUTO (Sem o "S" no final)
  getProdutos: (options) => {
    return new Promise((resolve, reject) => {
      Firebird.attach(options, (err, db) => {
        if (err) {
          return reject(new Error('Erro ao conectar no Firebird: ' + err.message));
        }
        
        // 👇 AQUI ESTÁ A CORREÇÃO: TB_PRODUTO no singular
        db.query('SELECT * FROM TB_PRODUTO', (err, result) => {
          db.detach(); // Sempre desconectar após a query
          
          if (err) {
            return reject(new Error('Erro ao executar a busca na TB_PRODUTO: ' + err.message));
          }
          
          resolve(result); // Retorna os dados purinhos do seu ERP
        });
      });
    });
  },

  // Busca OFICIAL de Promoções
  getPromocoes: (options) => {
    return new Promise((resolve, reject) => {
      Firebird.attach(options, (err, db) => {
        if (err) {
          return reject(new Error('Erro ao conectar no Firebird: ' + err.message));
        }
        
        // ATENÇÃO: Se a sua tabela de promoções tiver outro nome no ERP, altere aqui!
        db.query('SELECT * FROM TB_PROMOCAO', (err, result) => {
          db.detach();
          
          if (err) {
            return reject(new Error('Erro ao buscar as promoções: ' + err.message));
          }
          
          resolve(result);
        });
      });
    });
  }
};

module.exports = fbModule;