# Atualização do Sistema de Conexão com Banco de Dados Firebird

Este documento detalha a reestruturação da lógica de conexão entre o backend da aplicação **PromoUp** e os bancos de dados Firebird (como os do ERP cliente). A atualização focou em remover dependências externas e modernizar a arquitetura de acesso a dados.

## 1. O que motivou a mudança?

Anteriormente, o sistema utilizava um script intermediário escrito em **Python** (`firebird_bridge.py`) para se comunicar com o banco de dados. O backend (Electron/Node) disparava processos do sistema operacional para rodar esse script sempre que precisava ler produtos ou testar a conexão.

**Problemas gerados pela abordagem antiga:**
* **Dependência do Sistema Operacional**: Exigia que o ambiente do cliente tivesse o Python instalado e configurado no `PATH`.
* **Erro de "Alias" do Windows 10/11**: Máquinas sem Python disparavam o comportamento padrão do Windows de abrir a Microsoft Store bloqueando a execução da aplicação de forma silenciosa ou com mensagens confusas ("Python não foi encontrado").
* **Mascaramento de Erros de Rede**: Mensagens críticas do banco de dados (como bloqueios de firewall, senhas erradas, portas incorretas) se perdiam na conversão de logs, dificultando o suporte.

---

## 2. As Alterações Realizadas

A conexão foi inteiramente refatorada para rodar de forma **nativa** dentro do próprio Node.js (que já acompanha o Electron), utilizando o pacote NPM `node-firebird`.

### Modificações Técnicas:
1. **Remoção de Arquivos**:
   * Foi deletado o script `electron/firebird_bridge.py`. A aplicação não usa mais nenhum processo externo via linguagem Python.
2. **Reescrita do Módulo Principal**:
   * O arquivo `electron/firebird.js` foi reescrito. As chamadas `spawn('python', ...)` foram trocadas por chamadas de rede da API nativa do `node-firebird` via TCP.
3. **Tratamento de BLOBs (Imagens)**:
   * O método de download das fotos dos produtos (campo `PRD_FOTO`) agora é lido em formato de *Buffer* direto no Node.js e gravado em disco via `fs.writeFileSync`, o que é muito mais rápido e seguro que passar bytes pelo `stdout` de um subprocesso.
4. **Melhoria no Diagnóstico de Erros**:
   * O código que exibe o erro (`catch`) foi reforçado para capturar objetos literais, strings ou exceções do Firebird e convertê-los de forma legível para o front-end (exibindo `"ECONNREFUSED"`, portas erradas, etc.).

---

## 3. Como o Sistema Funciona Agora

Agora toda a comunicação é via TCP puro, o que garante a portabilidade e independência do sistema. 

**Fluxo de Comunicação atualizado:**

1. O usuário clica em "Testar Conexão" no Frontend.
2. A requisição HTTP bate em `electron/server.js` na rota `/api/firebird-test`.
3. O servidor chama a função `fbModule.testConnection(options)` no novo `firebird.js`.
4. O `firebird.js` utiliza a biblioteca para abrir uma conexão **TCP** direto com a porta configurada (ex: `3050` ou `3055`) sem necessitar da instalação do software cliente da Firebird (`fbclient.dll`).
5. A resposta retorna em frações de segundos para a interface.

> [!IMPORTANT]
> Como o sistema não utiliza mais arquivos locais (DLLs e ponte em Python) e conversa diretamente via TCP, é vital confirmar qual a **Porta** em que a instância do Firebird do cliente está "escutando". Por exemplo, o Firebird 5.0 ou instâncias customizadas de ERPs podem utilizar a porta `3055` em vez da padrão `3050`.

---

## 4. Nova Estrutura de Diretórios (Backend)

Com a alteração, a estrutura interna fica muito mais limpa.

```text
PromoUp/
├── electron/
│   ├── database.js     (Gerencia o SQLite local)
│   ├── firebird.js     (Conexão NATIVA com o ERP via node-firebird)
│   ├── main.js         (Controle de janelas do Electron)
│   └── server.js       (APIs internas do sistema)
├── frontend/
│   └── ...             (Interface de usuário não precisou ser alterada)
└── node_modules/
    ├── node-firebird/  (Driver nativo Node que substituiu o Python)
    └── ...
```

O PromoUp agora é totalmente **Self-Contained** (autossuficiente), o que facilita a distribuição do `.exe` do instalador para qualquer máquina sem medo de problemas com bibliotecas do sistema.
