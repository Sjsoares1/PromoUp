# Análise Geral do Sistema PromoUp

Este documento apresenta uma varredura sistêmica completa do atual estado do projeto PromoUp (Desktop Electron + Módulo TV), detalhando a arquitetura, as funcionalidades operacionais, débitos técnicos estruturais e fluxos que exigem atenção.

---

## 1. Arquitetura Atual (A Duplicidade de Frontends)

Ao auditar a estrutura do projeto, notou-se um cenário de "Arquitetura Híbrida/Em Transição". 

*   **O Backend** (`/electron`): É um servidor Node.js embarcado super leve e funcional. Ele gerencia as rotas através de requisições nativas `http` em `server.js` e se conecta a dois tipos de banco de dados (`sqlite3` local para configurações e `node-firebird` para buscar os produtos do ERP).
*   **O Frontend Ativo** (`/frontend/public`): A aplicação *de fato* carregada pelo Electron via `main.js` é o painel em **HTML/JS puro (Vanilla)**. O Electron abre a URL `http://localhost:9090/firebird.html` quando você inicia a plataforma (`yarn start`).
*   **O Frontend Desativado / Em Construção** (`/frontend/src`): Existe um projeto inteiro construído em React + Tailwind CSS (com páginas robustas como `Dashboard.js`, `TVWizard.js` e componentes avançados criados com `shadcn/ui` ou similares no `components.json`). Contudo, **esse código Moderno em React não está sendo compilado nem consumido pelo Electron!**

---

## 2. O Que Está Funcionando Bem (Pontos Fortes)

1.  **Motor do Servidor Electron (`server.js`)**: O servidor Node expõe as APIs locais (`/api/tvs`, `/api/produtos`, `/api/promocoes`) com sucesso e lida com o banco SQLite e o DB remoto Firebird sem bloquear a tela do aplicativo.
2.  **Display da TV ("Digital Signage Premium")**: A interface `display.html` foi recém reformulada. Ela possui um roteamento que puxa os produtos selecionados e as promoções do Firebird, misturando-os em um carrosel com transições dinâmicas a cada 10 segundos, design e tipografia arrojada (Oswald/Montserrat).
3.  **Configuração de Banco de Dados**: A interface *Vanilla* de configuração de Firebird (`firebird.html`/`firebird.js`) se comunica corretamente com o Node (inclusive agora suporta "Explorador de Arquivos" para o `.fdb` e para a `fbclient.dll`).
4.  **Seleção e Persistência de TV**: O gerenciamento de endpoints CRUD (Criar, Ler, Atualizar) para a TV no SQLite está rodando 100%.

---

## 3. O Que Está Faltando / Apresenta Débito Técnico

**A. Duplicação de Arquivos e Lógica ("produtos_temp.json" vs SQLite)**
*   No `server.js`, a rotina de salvar produtos cria os dados no SQLite (`produtos_selecionados`) de modo profissional, mas as rotas `/api/produtos/sync` e `/api/produtos/clear` forçam a construção de um arquivo local redundante `produtos_temp.json`. 
*   *Melhoria Necessária*: O json deve ser abandonado completamente. Todas as transações do "menu que o cliente vê as promoções" devem focar unicamente nas tabelas do SQLite (para os "selecionados/estáticos") ou consultar a cache do Firebird em memória.

**B. Comunicação TV-Servidor (Ausência de WebSockets)**
*   Hoje a TV (`display.html`) tem um `setInterval` que atualiza (dá *refresh* total) na página a cada 5 minutos para saber se os produtos mudaram.
*   *Melhoria Necessária*: Para um comportamento Premium de Painel, deve-se trocar o refresh forçado por `WebSockets` ou `Server-Sent Events (SSE)`. Quando você alterar um preço no Admin, a TV deve aplicar "fade-out" -> "fade-in" em tempo real no milissegundo seguinte.

**C. Imagens dos Lanches via Banco de Dados Restrito**
*   Atualmente, as imagens (Placeholders) estão chumbadas como `sample_product.png` com fallback visual. Nós identificamos no código que o sistema lê a flag `PRD_FOTO` indicando "TEM_FOTO", mas não retorna nem empacota a BLOB da imagem para a rota.
*   *Melhoria Necessária*: O backend `firebird.js` precisa ser ajustado para pegar o binário (blob/base64) da imagem do banco, salvar na pasta `public/img` do sistema com o ID do lanche, e linkar no retorno do endpoint da `/api/produtos`.

---

## 4. O Que Precisa de Ação Estratégica (O "Elefante na Sala")

**O Dilema do Frontend (React x Vanilla):**

A grande decisão deste projeto está no Front-end de Administração:
*   A equipe iniciou um sistema lindo usando o **React + Tailwind** na raiz.
*   Mas todo o funcionamento que conecta no backend funciona pelas páginas **HTML simples** (e o `main.js` do Electron ignora o React).

**O Caminho a Seguir:**
1.  **OPÇÃO 1 (Modo Rápido)**: Deletar tudo ligado ao React (pasta `/src`, tailwind configs) e focar em deixar o visual do HTML Vanilla incrivelmente bonito.
2.  **OPÇÃO 2 (Modo Escalável)**: Trocar o apontamento do Electron. Usar `npm start` (ou craco/react-scripts) na pasta React concorrentemente, rotear a visualização do Electron para chamar a SPA do React (`http://localhost:3000`), migrar o form do Firebird para a `FirebirdConfig.js` que já existe lá perdida e compilar o build React para produção no empacotamento.

> Ao prosseguir nas próximas atualizações do PromoUp, é recomendável limpar a ponte React vs Vanilla e implementar o fetch dinâmico das fotos do banco de dados (o payload verdadeiro das `bloks` de imagem) para que a TV atualize 100% de ponta a ponta sem qualquer edição em arquivos!
