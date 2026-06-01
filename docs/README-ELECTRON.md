# PromoUp Desktop - Aplicação Electron

Sistema de gestão comercial e exibição digital de promoções em televisões conectadas.

## 🚀 Tecnologias

- **Electron** - Aplicação desktop multiplataforma
- **Node.js puro** - Backend sem frameworks
- **SQLite** - Banco de dados local em arquivo
- **HTML/CSS/JavaScript puro** - Frontend sem frameworks

## 📁 Estrutura do Projeto

```
/
├── electron/                 # Backend Electron (Node.js)
│   ├── main.js              # Processo principal Electron
│   ├── preload.js          # Ponte IPC
│   ├── server.js           # Servidor HTTP Node.js (porta 9090)
│   ├── database.js         # Gerenciador SQLite
│   └── firebird.js         # Módulo de conexão Firebird
├── public/                   # Frontend HTML/CSS/JS (legado)
│   ├── index.html          # Dashboard
│   ├── firebird.html       # Configuração Firebird
│   ├── tvs.html            # Lista de TVs
│   ├── wizard.html         # Cadastro de TV
│   ├── display.html        # Visualização pública
│   ├── css/style.css       # Estilos globais
│   └── js/                 # Scripts JavaScript
├── frontend/                 # Frontend React (moderno)
│   ├── src/                # Componentes React
│   └── package.json        # Dependências React
├── package.json             # Configuração Electron
├── promoup.db              # Banco SQLite (criado automaticamente)
└── docs/                   # Documentação
```

> **Nota:** O backend Python (FastAPI) foi removido. O Electron é agora o único backend.

## 🔧 Instalação

```bash
cd /app
yarn install
```

## ▶️ Executar

### Modo Produção
```bash
yarn start
```

### Modo Desenvolvimento (com DevTools)
```bash
yarn dev
```

### Testar apenas o servidor
```bash
node test-server.js
```

## 📡 APIs Disponíveis

### Status
- `GET /api/status` - Status do sistema

### Configuração Firebird
- `GET /api/firebird-config` - Obter configuração
- `POST /api/firebird-config` - Salvar configuração

### Televisões
- `GET /api/tvs` - Listar todas as TVs
- `POST /api/tvs` - Criar nova TV
- `GET /api/tvs/:id` - Obter TV por ID
- `PUT /api/tvs/:id` - Atualizar TV
- `DELETE /api/tvs/:id` - Deletar TV
- `GET /api/tvs/route/:route` - Obter TV por rota

### Promoções (Mock)
- `GET /api/promocoes` - Listar promoções mockadas

### Produtos (Mock)
- `GET /api/produtos` - Listar produtos mockados

## 🖥️ Funcionalidades

### Dashboard
- Visualização de status em tempo real
- TVs ativas, promoções e status do servidor
- Ações rápidas para navegação

### Configuração Firebird
- Caminho do banco de dados
- Porta de conexão
- Caminho da DLL fbclient

### Gestão de TVs
- Listar TVs cadastradas
- Cadastrar nova TV (nome, rota, filtro, layout)
- Editar TV existente
- Deletar TV
- Abrir visualização pública

### Visualização Pública
- Exibição fullscreen para TVs
- Grid de promoções
- Layout customizável (cor de fundo, fonte)
- Acesso via URL: `display.html?tv=nome_rota`

## 🎨 Design

- Interface moderna e minimalista
- Cores: Slate 900 (sidebar), Blue 600 (accent), Slate 50 (background)
- Tipografia: Plus Jakarta Sans (headings), Inter (body), JetBrains Mono (code)
- Responsivo e acessível

## 🗄️ Banco de Dados

SQLite com 2 tabelas:

### firebird_config
- id, caminho_banco, porta, dll_path, created_at

### tvs
- id, nome, route_path, filtro (JSON), layout (JSON), timeline (JSON), ativa, created_at

## 📝 Notas

- Servidor roda na porta **9090** internamente
- Servidor aceita conexões de qualquer máquina na rede (binding em 0.0.0.0:9090)
- Dados persistidos em `promoup.db`
- Promoções e produtos estão mockados (preparado para integração Firebird)
- Hot reload automático no modo desenvolvimento

## 🌐 Acesso Remoto

O servidor Electron está configurado para aceitar conexões de outras máquinas na rede local.

### Configuração

- O servidor faz binding em `0.0.0.0:9090` (todas as interfaces)
- **CORS configurado com lista de origens específicas** (não mais `'*'`)

### Lista de Origens Permitidas

| Origem | Descrição |
|--------|------------|
| `http://localhost:3000` | Servidor de desenvolvimento React |
| `http://127.0.0.1:3000` | Servidor React alternativo |
| `http://localhost:9090` | Servidor Electron (mesmo host) |
| Sem origem | Postman/testes (sem header Origin) |

### Adicionar Nova Origem

Para adicionar um novo IP ou domínio à lista de origens permitidas, edite o arquivo `electron/server.js`:

```javascript
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:9090',
  'http://192.168.1.100:3000'  // Novo IP da rede
];
```

### Acessando de Outras Máquinas

Para acessar de TVs ou outros dispositivos na rede:

```
http://<IP-DO-SERVIDOR>:9090
```

Exemplo: `http://192.168.1.100:9090`

### Configurando o Frontend React

No frontend React, defina a variável de ambiente:

```env
REACT_APP_BACKEND_URL=http://192.168.1.100:9090
```

Ou use o valor padrão `http://localhost:9090` para desenvolvimento local.

## 🚦 Status Atual

✅ Aplicação desktop Electron funcional  
✅ Backend Node.js puro com SQLite  
✅ Frontend HTML/CSS/JS puro  
✅ Dashboard completo  
✅ Configuração Firebird  
✅ Gestão de TVs (CRUD)  
✅ Visualização pública  
✅ APIs REST completas  

## 🔜 Próximos Passos

- Integração real com Firebird
- Sistema de timeline com múltiplos conteúdos
- Upload de arquivos (vídeos/fotos)
- Empacotamento para distribuição (Windows/Mac/Linux)
