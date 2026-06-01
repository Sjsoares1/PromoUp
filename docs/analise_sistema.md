# Análise do Sistema PromoUp - Módulo de TV (Digital Signage)

## 1. Visão Geral da Arquitetura Atual
O sistema PromoUp utiliza **Electron** como container desktop, rodando um frontend em HTML/JS baunilha (Vanilla) e comunicando-se com um servidor HTTP em Node.js (via módulo `http` padrão do Node.js). 
O backend se conecta tanto a um banco **SQLite local** (para configurações, TVs e salvamento de cardápios locais) quanto a um banco **Firebird externo/remoto** (geralmente o banco do ERP) via `node-firebird`.

## 2. Pontos Positivos (O Que Há de Bom)

1.  **Arquitetura Leve e Independente**: O uso de servidor Node embutido com sqlite local rodando independente do processo principal de UI garante que a aplicação não trave facilmente e que o envio de dados via `fetch()` seja fácil.
2.  **Sincronização com ERP**: A conexão com Firebird já está feita de modo assíncrono.
3.  **Persistência Offline Base**: Existe um conceito já rodando para salvar configurações localmente com segurança (`firebird_config`, `tvs`, `produtos_selecionados`).
4.  **Sistema Flexível de TV**: As TVs recebem um `route_path` único, o que permite que várias TVs diferentes conectem na mesma aplicação através da rede local exibindo conteúdos diferentes.

## 3. Pontos Negativos (O Que Pode Ser Melhorado)

1.  **Falta de Desacoplamento entre Renderização e Gerenciamento**: No `display.html` atual, o layout e os dados estão muito simples. É um visual focado apenas no texto e num grid básico de blocos brancos, o que não remete à **impressão "Premium"** exigida pela experiência de Digital Signage moderno.
2.  **Integração Pobre entre "Cardápio" e a "TV"**: Os produtos são salvos em `produtos_selecionados` via `produtos.js`, contudo `display.html` chama a rota `/api/promocoes` (que vai ao Firebird e busca só promoções). Isso gera confusão. Falta um modo flexível onde a TV mostre as *Promoções do ERP* e/ou o *Cardápio de Produtos Selecionados*.
3.  **Falta de Animações (Auto-Play)**: TVs operam passivamente (sem click). A página precisa rolar a cada 10~15 segundos ou transformar itens em um carrosel para expor todo o cardápio sem que um funcionário interaja com a TV. Nenhum desses recursos existe nativamente.
4.  **Tipografia e Cores**: O design padrão das "promocoes" não chama a atenção do cliente e as fontes poderiam ser atualizadas ou receber um peso maior (estilo Fast Food: *Big, Bold, Vibrant*).

## 4. O Que Falta para Funcionar Estilo "Burger King"?

Para criar uma verdadeira sensação de *Menu Board Digital* (Painel Burger King/McDonald's), as seguintes alterações são necessárias:

### No Backend (Servidor Node)
- [x] O endpoint para puxar `produtos_selecionados` da API já existe, mas a TV precisa consumi-lo. Idealmente, a tela pode buscar as *duas coisas* e alternar, ou focar primeiro no "Cardápio".

### No Frontend (Display de TV)
- [x] **Visual Vibrante**: Fundo em tons ricos (Vermelho vibrante, Amarelo tostado, ou Preto elegante), com tipografia extremamente pesada e de fácil leitura de longe.
- [x] **Tratamento de Imagens**: Precisa exibir de forma grande e clara a imagem do lanche/produto. Como no momento é tudo local, criaremos uma estrutura de **placeholders estéticos e dinâmicos** pra teste ou preenchimento de imagens geradas no disco.
- [x] **Estrutura em Slider (Carrosel Automatizado)**: Quando os itens são muitos, dividimos de 4 ou 6 itens dinâmicos por tela (slide), e a cada *x* segundos o código Javascript realiza as transições de fade-in das imagens ou rola a barra automaticamente, mantendo um menu infinito e vivo.

### Status da Implementação de Teste
Iremos agora atualizar o `display.html` para incorporar esse novo visual e animação para comprovar a viabilidade dessa experiência de exibição!
