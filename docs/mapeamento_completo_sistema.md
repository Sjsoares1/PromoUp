# Mapeamento e Arquitetura do Sistema PromoUp

Este documento apresenta uma visão detalhada da arquitetura do **PromoUp**, mapeando cada pasta, arquivo, conexão e funcionalidade do sistema. Ele serve como um guia técnico para entender onde estão localizados o frontend e o backend, como eles se comunicam e qual o papel de cada componente na aplicação.

---

## 1. Visão Geral da Arquitetura
O **PromoUp** é um sistema de Gestão de Promoções e Exibição Digital (Digital Signage) para TVs de estabelecimentos comerciais. Ele é projetado para operar como uma aplicação desktop que gerencia telas de exibição (TVs) conectadas em rede local e sincroniza dados com um banco de dados ERP comercial (Firebird).

A aplicação utiliza o **Electron** como container desktop. A arquitetura segue um modelo cliente-servidor interno:
* **Backend**: Um servidor HTTP leve construído em Node.js puro, rodando de forma embutida dentro do processo do Electron.
* **Frontend**: Uma interface construída em HTML, CSS e JavaScript Vanilla (puro).

---

## 2. Onde Fica o Frontend e o Backend?

### **Backend (`/electron`)**
* **Localização**: Pasta `electron/` na raiz do projeto.
* **Tecnologia**: Node.js (sem frameworks pesados como Express para garantir leveza e velocidade).
* **Bancos de Dados**:
  1. **SQLite local (`promoup.db`)**: Utilizado para persistência de dados de controle interno do sistema (como configurações do Firebird, cadastro de televisões, produtos marcados para exibição e vinculações de TV).
  2. **Firebird ERP (externo/remoto)**: Conecta-se diretamente ao banco de dados do ERP do cliente via driver `node-firebird` para buscar a tabela de produtos (`TB_PRODUTO`) e a tabela de promoções (`TB_PROMOCAO`).
* **Serviços**:
  * **Servidor HTTP**: Escuta na porta `9090` (vinculado em `0.0.0.0` para aceitar conexões externas de TVs na rede local). Serve os arquivos estáticos da pasta `frontend/public` e expõe a API de dados REST.
  * **Server-Sent Events (SSE)**: Mantém um canal ativo em tempo real com as TVs abertas na rede para disparar atualizações de preços ou layouts sem necessidade de dar refresh na página.

### **Frontend (`/frontend/public`)**
* **Localização**: Pasta `frontend/public/`.
* **Tecnologia**: HTML5, CSS3 Vanilla e JavaScript Vanilla (ES6+).
* **Serviço**: É inteiramente servido de forma estática pelo servidor HTTP Node do backend na porta `9090`.
* **Comunicação**: Comunica-se com o backend utilizando chamadas assíncronas `fetch` para os endpoints da API (`http://localhost:9090/api/...`) e usa a ponte IPC (`window.electronAPI`) para acessar recursos nativos do sistema operacional, como caixas de diálogo de arquivos.

> **Nota sobre o diretório `frontend/src`**: Existe uma estrutura legada/em rascunho de React na pasta `frontend/src`. Contudo, **esta estrutura não está sendo compilada ou consumida no fluxo atual da aplicação**. A aplicação ativa roda 100% sob a pasta `frontend/public/` com HTML/JS puro.

---

## 3. Conexões e Fluxo de Comunicação (Como Eles Estão Ligados)

O diagrama abaixo ilustra como as peças do sistema se conectam:

```mermaid
graph TD
    subgraph Frontend (HTML/CSS/JS)
        UI[Páginas HTML - public/] -->|Requisições Fetch| API_URL[config.js]
        UI -->|Preload IPC| Bridge[preload.js]
    end

    subgraph Backend (Node.js/Electron)
        Bridge -->|IPC Handlers| Main[main.js]
        Main -->|Gerencia Janelas| Display[Janela de Exibição]
        Main -->|Inicia| Server[server.js]
        Server -->|MIME & Static Files| UI
        Server -->|Leitura/Escrita SQL| DB[database.js]
        Server -->|Conexão ERP| FB[firebird.js]
    end

    subgraph Persistência
        DB -->|Tabelas SQLite| SQLite[(promoup.db)]
        FB -->|Importar Produtos/Preços| Firebird[(Banco ERP Firebird)]
    end
```

### **1. Inicialização do Sistema (Startup)**
1. O executável do Electron inicia rodando o arquivo principal [electron/main.js](file:///d:/projetos/promocao/PromoUp/electron/main.js).
2. O `main.js` chama o método `startServer` do arquivo [electron/server.js](file:///d:/projetos/promocao/PromoUp/electron/server.js).
3. O `server.js` chama o `initDatabase` em [electron/database.js](file:///d:/projetos/promocao/PromoUp/electron/database.js) para assegurar que as tabelas necessárias no SQLite local `promoup.db` foram criadas, e em seguida inicia o servidor HTTP na porta `9090`.
4. O `main.js` cria a janela principal do Electron carregando a URL de configuração inicial: `http://localhost:9090/firebird.html`.

### **2. IPC Bridge (Comunicação Segura de Arquivos)**
1. O frontend não possui privilégios de sistema operacional para vasculhar o disco rígido diretamente. Para isso, usa o [electron/preload.js](file:///d:/projetos/promocao/PromoUp/electron/preload.js), que define uma ponte segura através do objeto global `window.electronAPI`.
2. Quando o usuário clica para buscar o banco de dados `.fdb` na tela de configuração, o script [frontend/public/js/firebird.js](file:///d:/projetos/promocao/PromoUp/frontend/public/js/firebird.js) aciona `window.electronAPI.selectFile()`.
3. O `preload.js` envia um sinal IPC para o `main.js` (`dialog:openFile`), que exibe a tela do Windows Explorer nativa. O arquivo escolhido é devolvido pelo mesmo fluxo ao formulário do frontend.

### **3. Consumo de APIs REST**
1. Todas as páginas HTML importam o script [frontend/public/config.js](file:///d:/projetos/promocao/PromoUp/frontend/public/config.js), que detecta dinamicamente a URL e define a variável global `window.APP_CONFIG.API_URL` apontando para `http://<IP-DO-COMPUTADOR>:9090/api`.
2. As ações do usuário (sincronizar produtos, criar TV, salvar exibições) geram requisições `fetch` do frontend para o roteador de APIs dentro de `server.js`.

### **4. Sincronização em Tempo Real (SSE)**
1. A página exibida na TV ([frontend/public/display.html](file:///d:/projetos/promocao/PromoUp/frontend/public/display.html)) abre uma conexão persistente do tipo Server-Sent Events com a rota `/api/events` no backend.
2. O backend armazena o canal aberto de cada TV ativa na rede no array de conexões `sseClients`.
3. Quando o administrador salva modificações nos produtos do cardápio em [produtos.html](file:///d:/projetos/promocao/PromoUp/frontend/public/produtos.html), a rota `POST /api/produtos-selecionados` do backend grava os dados no SQLite e executa `notifyTvs('tv-update', { action: 'produtos-atualizados' })`.
4. Sem precisar recarregar a tela inteira (`F5`), o JavaScript em `display.html` captura o sinal pelo stream e atualiza o carrossel de exibição com as novas informações instantaneamente.

---

## 4. Estrutura Completa de Pastas e Arquivos

```text
PromoUp/
├── docs/                      # Pasta de documentações do sistema
│   ├── node_firebird/         # Guias do driver node-firebird
│   │   ├── 01_configuration.md
│   │   ├── 02_queries_and_transactions.md
│   │   ├── 03_plugins.md
│   │   └── 04_web_integration.md
│   ├── README-ELECTRON.md     # Visão geral rápida para desenvolvimento
│   ├── analise_geral_sistema.md# Varredura sistêmica de arquitetura e débitos
│   ├── analise_sistema.md     # Análise visual e técnica do Módulo TV
│   ├── fluxo_configuracao_promocoes.md # Proposta das telas de vínculos de TV
│   └── mapeamento_completo_sistema.md  # [ESTE ARQUIVO] Documento mestre do sistema
├── electron/                  # Backend da aplicação (Node.js)
│   ├── database.js            # Inicialização e queries da tabela SQLite local
│   ├── firebird.js            # Conectividade e buscas no banco relacional do ERP
│   ├── main.js                # Arquivo principal do Electron (Janelas e IPC)
│   ├── preload.js             # Segurança e ponte de comunicação frontend-backend
│   └── server.js              # Servidor HTTP de arquivos estáticos, rotas e SSE
├── frontend/                  # Diretório do Frontend
│   ├── plugins/               # Extensões para webpack e saúde de código
│   │   ├── health-check/
│   │   └── visual-edits/
│   └── public/                # Código do Frontend Vanilla (HTML/CSS/JS)
│       ├── css/               # Estilos da interface administrativa e televisões
│       │   ├── dashboard-new.css
│       │   └── style.css
│       ├── img/               # Imagens e ícones estáticos
│       ├── js/                # Comportamento dinâmico de cada página do painel
│       │   ├── config_promo.js# Script de seleção de modo e itens por TV
│       │   ├── dashboard.js   # Script de contagem e status do painel inicial
│       │   ├── firebird.js    # Conexão, salvamento e teste do ERP Firebird
│       │   ├── produtos.js    # Seleção de produtos do ERP para o SQLite
│       │   ├── tvs.js         # Listagem, caminhos URL e exclusão de TVs
│       │   └── wizard.js      # Cadastro e edição de perfil de TVs
│       ├── config.js          # Configuração global de apontamento da API
│       ├── config_promo.html  # Interface de amarração da TV com seus produtos
│       ├── display.html       # Tela pública de exibição na TV (Vitrine/Menu)
│       ├── firebird.html      # Interface de configurações do ERP Firebird
│       ├── index.html         # Dashboard/Painel de Controle administrativo
│       ├── produtos.html      # Vitrine de produtos importados do ERP
│       ├── tvs.html           # Lista de TVs ativas cadastradas
│       └── wizard.html        # Formulário para criar/editar TVs
├── package.json               # Dependências do projeto e scripts de execução
├── promoup.db                 # Banco de dados SQLite local
├── test-apis.js               # Utilitário de testes manuais da API
└── yarn.lock                  # Lockfile de dependências Yarn
```

---

## 5. Detalhamento de Cada Arquivo e Funcionalidade

### **A. Backend (`/electron`)**

#### 1. [main.js](file:///d:/projetos/promocao/PromoUp/electron/main.js)
* **Funcionalidade**: Ponto de partida da aplicação. Gerencia o ciclo de vida do Electron (inicialização, fechamento, destruição de janelas).
* **Principais Funções**:
  * `createWindow()`: Instancia a janela principal com resoluções de design pré-definidas e carrega `preload.js`.
  * `startServer(serverPort)`: Dispara o servidor local na porta `9090` e trata erros em caso de falhas na porta.
  * **IPC Handlers**:
    * `get-port`: Informa a porta HTTP ativa para os renderizadores.
    * `open-display-window`: Abre uma nova BrowserWindow nativa e dedicada, sem bordas (`frame: false`) e em tela cheia (`fullscreen: true`), direcionando para a rota de visualização de TV.
    * `dialog:openFile`: Aciona o sistema operacional para abrir uma janela de diálogo permitindo a escolha de arquivos nativos `.fdb` ou `.dll`.

#### 2. [preload.js](file:///d:/projetos/promocao/PromoUp/electron/preload.js)
* **Funcionalidade**: Fornece um barramento seguro isolando o contexto. O frontend acessa APIs nativas exclusivamente através do objeto exposto na janela global (`window.electronAPI`).
* **Ações Expostas**:
  * `getPort()`: Invoca o manipulador IPC para obter a porta do servidor.
  * `openDisplayWindow(tvRoute)`: Solicita a criação da janela de TV para a rota fornecida.
  * `selectFile(options)`: Abre o seletor de arquivos com filtros específicos (ex: arquivos `.dll` ou `.fdb`).

#### 3. [server.js](file:///d:/projetos/promocao/PromoUp/electron/server.js)
* **Funcionalidade**: Servidor HTTP e API REST do sistema. Gerencia toda a lógica de roteamento de dados, salvamento no SQLite local e conexões ativas de TV.
* **Módulos Utilizados**: `http`, `fs`, `path`, `database.js` e `firebird.js`.
* **Rotas da API**:
  * `GET /api/events`: Canal Server-Sent Events (SSE). Envia mensagens silenciosas para as TVs atualizarem seus layouts.
  * `GET /api/status`: Retorna o total de TVs cadastradas, produtos selecionados na vitrine e o status geral.
  * `GET/POST /api/firebird-config`: Lê ou insere/atualiza as credenciais de acesso ao banco Firebird do ERP.
  * `GET/POST /api/tvs`: Lista ou cria TVs.
  * `GET/PUT/DELETE /api/tvs/:id`: Detalha, atualiza os dados visuais/filtros ou apaga uma TV cadastrada.
  * `POST /api/tvs/:id/configuracao`: Define os produtos selecionados para aparecerem na TV específica e define se ela opera em Modo Cardápio ou Modo Promoção.
  * `GET /api/tvs/:id/configuracao`: Busca as configurações ativas daquela TV específica.
  * `GET /api/tvs/route/:route`: Retorna os dados cadastrados de uma TV com base em sua rota amigável da URL.
  * `GET /api/promocoes`: Executa a consulta no ERP Firebird e traz as promoções ativas na tabela `TB_PROMOCAO`.
  * `GET /api/produtos`: Executa a busca no ERP Firebird na tabela `TB_PRODUTO` e envia a lista completa para o frontend.
  * `GET/POST /api/produtos-selecionados`: Lê ou grava a seleção de produtos da vitrine no banco SQLite local.
  * `GET /api/produtos/:id/foto`: Endpoint responsável por fazer o stream do binário (BLOB) da imagem do produto direto do Firebird. Ele cria um cache local do arquivo na pasta `frontend/public/img/produtos/:id.jpg` para otimizar exibições posteriores e responde à requisição transmitindo a imagem.

#### 4. [database.js](file:///d:/projetos/promocao/PromoUp/electron/database.js)
* **Funcionalidade**: Conecta ao SQLite no arquivo local `promoup.db` e estrutura as tabelas do sistema na inicialização.
* **Tabelas Criadas**:
  * `firebird_config`: Caminho do banco do ERP, porta, dll do cliente, usuário, senha, host.
  * `tvs`: ID, nome da TV, rota amigável, filtros, layout (JSON contendo cores e fontes), timeline e se está ativa.
  * `produtos_selecionados`: ID do produto, nome, preço, indicador de foto.
  * `tv_configuracoes`: ID incremental, ID da TV, tipo de exibição ('cardapio' ou 'promocao'), JSON com IDs dos produtos selecionados e status ativo.

#### 5. [firebird.js](file:///d:/projetos/promocao/PromoUp/electron/firebird.js)
* **Funcionalidade**: Módulo isolado de conexão física com o Firebird do cliente.
* **Principais Métodos**:
  * `testConnection(options)`: Abre uma conexão temporária e executa um SELECT rápido na RDB$DATABASE para atestar que o banco do ERP está acessível.
  * `getProdutos(options)`: Executa a query `SELECT * FROM TB_PRODUTO` e retorna os dados brutos.
  * `getPromocoes(options)`: Executa a query `SELECT * FROM TB_PROMOCAO` para as promoções.

---

### **B. Frontend (`/frontend/public`)**

#### 1. [config.js](file:///d:/projetos/promocao/PromoUp/frontend/public/config.js)
* **Funcionalidade**: Carregado de forma global nas tags `<head>` de todas as páginas do painel administrativo e TV.
* **Lógica**: Detecta o hostname atual (evitando problemas de IPs na rede local) e define o objeto global `window.APP_CONFIG.API_URL` apontando para a porta do backend local (`9090`).

#### 2. [index.html](file:///d:/projetos/promocao/PromoUp/frontend/public/index.html) e [js/dashboard.js](file:///d:/projetos/promocao/PromoUp/frontend/public/js/dashboard.js)
* **Funcionalidade**: Página inicial do Painel Administrativo.
* **Lógica**: `dashboard.js` realiza requisições periódicas a `/api/status` a cada 5 segundos para preencher dinamicamente os contadores do painel (TVs ativas, total de promoções, etc.) e indicar se o servidor backend está online ou offline.

#### 3. [firebird.html](file:///d:/projetos/promocao/PromoUp/frontend/public/firebird.html) e [js/firebird.js](file:///d:/projetos/promocao/PromoUp/frontend/public/js/firebird.js)
* **Funcionalidade**: Permite configurar e testar a conexão com o banco de dados Firebird.
* **Lógica**: Utiliza caixas de diálogo nativas abertas pelo Electron para capturar caminhos de arquivo no computador local. Envia os parâmetros via `POST /api/firebird-config` e permite executar testes de rede via `POST /api/firebird-test`.

#### 4. [tvs.html](file:///d:/projetos/promocao/PromoUp/frontend/public/tvs.html) e [js/tvs.js](file:///d:/projetos/promocao/PromoUp/frontend/public/js/tvs.js)
* **Funcionalidade**: Lista todas as TVs cadastradas no sistema SQLite.
* **Lógica**:
  * Renderiza cartões contendo informações da TV, status (Ativo/Inativo) e a URL completa necessária para o navegador da TV acessar o painel (`http://<IP-DO-SERVER>:9090/display.html?tv=rota_amigavel`).
  * Oferece atalhos de gerenciamento (botões de edição, vincular produtos, exclusão e visualização de tela cheia).

#### 5. [wizard.html](file:///d:/projetos/promocao/PromoUp/frontend/public/wizard.html) e [js/wizard.js](file:///d:/projetos/promocao/PromoUp/frontend/public/js/wizard.js)
* **Funcionalidade**: Tela de formulário de cadastro ou modificação de TVs.
* **Lógica**:
  * Ao carregar, verifica se existe o parâmetro de ID na URL (`wizard.html?id=...`). Se existir, entra em modo de edição carregando as informações atuais da TV via `/api/tvs/:id`.
  * Se for uma nova TV, faz um `POST /api/tvs`. Caso contrário, envia um `PUT /api/tvs/:id`.
  * Ao salvar com sucesso, redireciona o usuário de forma automática para a tela de configurações de exibição daquela TV (`config_promo.html?tvId=ID_GERADO`).

#### 6. [config_promo.html](file:///d:/projetos/promocao/PromoUp/frontend/public/config_promo.html) e [js/config_promo.js](file:///d:/projetos/promocao/PromoUp/frontend/public/js/config_promo.js)
* **Funcionalidade**: Gerencia a lógica do que será renderizado especificamente na televisão vinculada.
* **Lógica**:
  * Permite escolher o modo de visualização: **Modo Cardápio** ou **Modo Promoção**.
  * Carrega e lista em cartões com checkbox todos os produtos que estão no SQLite local.
  * O usuário marca os produtos específicos desta TV e envia os dados via `POST /api/tvs/:tvId/configuracao` para salvar no SQLite.

#### 7. [produtos.html](file:///d:/projetos/promocao/PromoUp/frontend/public/produtos.html) e [js/produtos.js](file:///d:/projetos/promocao/PromoUp/frontend/public/js/produtos.js)
* **Funcionalidade**: Permite selecionar quais produtos do ERP Firebird estarão visíveis/disponíveis no catálogo do SQLite da aplicação (vitrine local).
* **Lógica**:
  * Puxa todos os produtos do ERP (`GET /api/produtos`) e todos os que já estão selecionados localmente (`GET /api/produtos-selecionados`).
  * Agrupa ambos no JavaScript para criar uma tabela unificada com opções de caixa de marcação.
  * Exibe um indicador visual (ícone de câmera) para os lanches que possuem fotos cadastradas no ERP.
  * Ao clicar em "Salvar", envia um `POST /api/produtos-selecionados` contendo a lista dos marcados. O servidor atualiza o banco SQLite e notifica as TVs em rede via SSE no mesmo instante.

#### 8. [display.html](file:///d:/projetos/promocao/PromoUp/frontend/public/display.html) (Script Inline)
* **Funcionalidade**: A interface "Menu Board" ou "Vitrine Digital" que roda nas TVs. É projetada com fontes grandes, contraste de alto impacto e transições automáticas.
* **Lógica**:
  * Captura o parâmetro `?tv=rota_amigavel` da URL de acesso.
  * Consulta `GET /api/tvs/route/:route` para carregar as informações estéticas da TV (Nome do cabeçalho e cor de fundo personalizada).
  * Faz chamadas assíncronas para carregar a lista de produtos selecionados e as promoções ativas do ERP.
  * Limita a renderização a **6 lanches por tela**. Caso existam mais de 6 produtos selecionados, divide os produtos em páginas (slides) e executa transições horizontais suaves a cada 10 segundos.
  * Atualiza uma barra de progresso visual no rodapé para indicar o tempo restante do slide atual.
  * Mantém o canal Server-Sent Events aberto. Se receber a mensagem `produtos-atualizados` ou `tv-updated`, atualiza os produtos e as cores em tempo real sem piscar a tela do monitor.

---

## 6. Fluxos de Dados e Sincronização

Abaixo estão descritos os três principais fluxos operacionais de persistência do sistema:

### **Fluxo A: Configuração de Integração ERP**
```text
[Frontend: firebird.html] 
  ──(Caminhos do DB e DLL via IPC Preload)──> [Electron Main Process] (Abre diálogo nativo e retorna caminho)
[Frontend: js/firebird.js] 
  ──(POST /api/firebird-config com dados)──> [Backend: server.js]
                                                 └─(Grava credenciais no SQLite local)──> [SQLite: firebird_config]
```

### **Fluxo B: Seleção de Produtos do Cardápio**
```text
[Frontend: produtos.html]
  ──(GET /api/produtos)──> [Backend: server.js]
                               └─(Lê credenciais SQLite)──> [SQLite: firebird_config]
                               └─(Acessa ERP com node-firebird)──> [ERP Firebird] (Retorna lista completa)
  ──(Marca os itens desejados e clica em Salvar)──>
[Frontend: js/produtos.js]
  ──(POST /api/produtos-selecionados com IDs)──> [Backend: server.js]
                                                     ├─(Deleta seleção antiga e grava novos itens no SQLite)──> [SQLite: produtos_selecionados]
                                                     └─(Dispara notificação aos clientes ativos)──> [SSE: /api/events] ──> [Frontend: display.html] (TV recarrega vitrine)
```

### **Fluxo C: Exibição na TV (Digital Signage)**
```text
[Smart TV/Monitor: Acessa URL display.html?tv=sala]
  ──(GET /api/tvs/route/sala)──> [Backend: server.js]
                                     └─(Lê TV por rota amigável no SQLite)──> [SQLite: tvs]
  ──(GET /api/produtos-selecionados)──> [Backend: server.js]
                                             └─(Busca produtos salvos na vitrine)──> [SQLite: produtos_selecionados]
  ──(GET /api/produtos/:id/foto)──> [Backend: server.js]
                                         ├─(Verifica se foto existe em cache local)──> Sim: Retorna do disco
                                         └─Não: (Busca BLOB do Firebird)──> [ERP Firebird] ──> (Salva cache .jpg no disco e retorna foto)
  ──(Abre EventSource para tempo real)──> [Backend: server.js (SSE: /api/events)]
```
