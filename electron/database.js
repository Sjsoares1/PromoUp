const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

let db;

function initDatabase() {
  return new Promise((resolve, reject) => {
    const dbPath = path.join(__dirname, '../promoup.db');
    
    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        reject(err);
        return;
      }

      db.serialize(() => {
        // Firebird config table
        db.run(`
          CREATE TABLE IF NOT EXISTS firebird_config (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            host TEXT DEFAULT 'localhost',
            caminho_banco TEXT NOT NULL,
            porta INTEGER DEFAULT 3050,
            user TEXT DEFAULT 'SYSDBA',
            password TEXT DEFAULT 'masterkey',
            dll_path TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // TVs table
        db.run(`
          CREATE TABLE IF NOT EXISTS tvs (
            id TEXT PRIMARY KEY,
            nome TEXT NOT NULL,
            route_path TEXT NOT NULL UNIQUE,
            filtro TEXT DEFAULT '{}',
            layout TEXT DEFAULT '{}',
            timeline TEXT DEFAULT '[]',
            ativa INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // Tabela de Produtos Selecionados (do ERP)
        db.run(`
          CREATE TABLE IF NOT EXISTS produtos_selecionados (
            id TEXT PRIMARY KEY,
            nome TEXT NOT NULL,
            preco REAL,
            foto TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // NOVA TABELA: Configurações de exibição da TV
        db.run(`
          CREATE TABLE IF NOT EXISTS tv_configuracoes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tv_id TEXT NOT NULL,
            tipo TEXT NOT NULL, -- 'cardapio' ou 'promocao'
            produtos TEXT, -- JSON com IDs dos produtos selecionados
            ativa INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (tv_id) REFERENCES tvs (id) ON DELETE CASCADE
          )
        `, (err) => {
          if (err) reject(err);
          else {
            console.log('✓ Banco de dados SQLite inicializado com sucesso');
            resolve();
          }
        });
      });
    });
  });
}

function getDb() { return db; }
module.exports = { initDatabase, getDb };