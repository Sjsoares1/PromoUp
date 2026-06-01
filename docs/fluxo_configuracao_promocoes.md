# Proposta: Tela de Configuração de Promoções e Vínculo com TV

Esta proposta detalha a criação de um novo módulo para gerenciar o que cada TV exibe, permitindo transformar produtos do banco SQLite em "Cardápios" ou "Promoções de Item".

---

## 1. Fluxo de Funcionamento Sugerido

### Passo 1: Cadastro da TV
O usuário utiliza o `wizard.html` atual. Após clicar em "Salvar TV", em vez de voltar para a lista de TVs, o sistema redireciona automaticamente para a nova tela: `configurar_promocoes.html?tvId=[ID_DA_TV]`.

### Passo 2: Seleção do Tipo de Exibição
Na nova tela, o usuário escolhe:
- **Modo Cardápio (Menu Board)**: Exibição padrão de produtos com preços.
- **Modo Promoção de Item**: Destaque para um ou poucos itens com design de oferta (ex: "Leve 2 Pague 1" ou "Preço Especial").

### Passo 3: Seleção de Produtos
O sistema carrega a lista de `produtos_selecionados` (do SQLite). O usuário marca quais produtos participarão desta configuração específica para a TV selecionada.

### Passo 4: Persistência
Os dados são salvos no SQLite, vinculados ao `id` da TV.

---

## 2. Alterações Necessárias

### Banco de Dados (SQLite)
Precisamos decidir onde salvar esse vínculo.
- **Opção A**: Usar a coluna `timeline` já existente na tabela `tvs` para salvar o JSON da configuração.
- **Opção B (Recomendada)**: Criar uma nova tabela `tv_configuracoes` para permitir múltiplas promoções agendadas no futuro.

### Backend (Node.js/Server.js)
- Novos endpoints:
    - `POST /api/tvs/:id/configuracao`: Salva a configuração da TV.
    - `GET /api/tvs/:id/configuracao`: Busca a configuração ativa.

### Frontend
- **Nova Tela**: `configurar_promocoes.html` e `js/configurar_promocoes.js`.
- **Ajuste no Wizard**: Alterar `wizard.js` para redirecionar após o sucesso.

---

## 3. Visual da Nova Tela (Mockup Mental)
1. **Cabeçalho**: "Configurando TV: [Nome da TV]"
2. **Toggle/Botões**: [Cardápio] [Promoção]
3. **Lista de Produtos**: Grid com fotos e checkboxes (puxados do SQLite).
4. **Botão**: [Finalizar e Ativar na TV]

---

## 4. Próximos Passos
Após sua aprovação deste fluxo, irei:
1. Criar a nova tabela no banco de dados.
2. Desenhar a interface `configurar_promocoes.html` com estética Premium.
3. Implementar a lógica de salvamento e o redirecionamento automático.

**O que você acha deste fluxo? Alguma alteração na ordem das ações?**
