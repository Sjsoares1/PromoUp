# Consultas e Transações no Firebird Core Framework

Este documento descreve como trabalhar com consultas e transações no Firebird Core Framework, cobrindo o Select Builder, transações e segurança contra injeção SQL.

## 1. Select Builder

O Select Builder é uma funcionalidade que facilita a construção de consultas SELECT de forma segura e intuitiva. Ele utiliza o método `executeSelect` para executar consultas parametrizadas com cláusulas WHERE, LIMIT, OFFSET e ORDER BY.

### Método executeSelect

```typescript
async executeSelect(
  tableName: string, 
  conditions?: Record<string, any>, 
  options?: SelectOptions
): Promise<any>
```

**Parâmetros:**
- `tableName`: Nome da tabela para consulta
- `conditions`: Condições WHERE como objeto chave-valor (opcional)
- `options`: Opções de paginação e ordenação (opcional)

### Exemplo de uso com WHERE

```typescript
// Consultar usuários com condição WHERE
const usuarios = await queryService.executeSelect('usuarios', {
  ativo: true,
  cidade: 'São Paulo'
});
```

### Exemplo de uso com paginação (LIMIT e OFFSET)

```typescript
// Consultar produtos com paginação
const produtos = await queryService.executeSelect('produtos', {}, {
  limit: 10,    // Limitar a 10 registros
  offset: 20    // Pular os primeiros 20 registros (página 3, considerando 10 por página)
});
```

### Exemplo de uso com ordenação (ORDER BY)

```typescript
// Consultar pedidos ordenados por data
const pedidos = await queryService.executeSelect('pedidos', {
  status: 'pendente'
}, {
  orderBy: {
    field: 'data_criacao',
    direction: 'desc'  // Ordenar do mais recente para o mais antigo
  }
});
```

### Combinação de todas as opções

```typescript
// Consulta completa combinando WHERE, LIMIT, OFFSET e ORDER BY
const relatorio = await queryService.executeSelect('vendas', {
  data_venda: '2023-12-01',
  status: 'concluido'
}, {
  limit: 50,
  offset: 100,
  orderBy: {
    field: 'valor_total',
    direction: 'desc'
  }
});
```

## 2. Transações

Transações garantem que um conjunto de operações seja executado como uma única unidade atômica. Se qualquer operação dentro da transação falhar, todas as alterações são revertidas automaticamente.

### Método executeTransaction

```typescript
async executeTransaction(
  queries: Array<{ sql: string; bindings?: any[] | object }>
): Promise<any>
```

**Parâmetro:**
- `queries`: Array de objetos contendo SQL e bindings para cada consulta

### Exemplo de transação: Inserir Venda + Inserir Itens

```typescript
try {
  // Definir as consultas da transação
  const queries = [
    // Inserir venda
    {
      sql: 'INSERT INTO vendas (cliente_id, data_venda, valor_total) VALUES (?, ?, ?)',
      bindings: [123, new Date(), 250.00]
    },
    // Obter ID da venda recém-inserida
    {
      sql: 'SELECT MAX(id) as id FROM vendas WHERE cliente_id = ?',
      bindings: [123]
    },
    // Inserir itens da venda
    {
      sql: 'INSERT INTO itens_venda (venda_id, produto_id, quantidade, preco_unitario) VALUES (?, ?, ?, ?)',
      bindings: [/* ID da venda */, 456, 2, 125.00]
    }
  ];

  // Executar transação
  const results = await queryService.executeTransaction(queries);
  
  console.log('Transação concluída com sucesso:', results);
} catch (error) {
  console.error('Erro na transação - todas as operações foram revertidas:', error);
}
```

### Importância da atomicidade

No exemplo acima, se a inserção do item da venda falhar por algum motivo, a venda principal também será revertida automaticamente. Isso garante a consistência dos dados, pois não teremos itens de venda associados a uma venda que não existe.

## 3. Segurança

O Firebird Core Framework implementa proteção automática contra injeção SQL em todas as operações de consulta.

### Proteção contra SQL Injection

- **Validação automática**: Todas as consultas passam por um processo de validação que verifica padrões comuns de injeção SQL
- **Parâmetros parametrizados**: O uso de bindings impede que entradas do usuário sejam interpretadas como código SQL
- **Restrição de palavras-chave**: Consultas contendo palavras-chave perigosas (como DROP, TRUNCATE, ALTER, CREATE) são rejeitadas

### Exemplo de proteção em ação

```typescript
// Esta chamada é segura mesmo com entrada do usuário
const resultado = await queryService.executeSelect('usuarios', {
  nome: req.body.nome_usuario  // Mesmo que contenha caracteres especiais, é seguro
});

// Ou com executeQuery usando bindings:
const resultado = await queryService.executeQuery(
  'SELECT * FROM usuarios WHERE nome = ? AND ativo = ?',
  [req.body.nome_usuario, 1]  // Valores são passados como bindings, não concatenados à SQL
);
```

### Tipos de proteção implementada

1. **Validação de palavras-chave perigosas**: Impede operações destrutivas em consultas SELECT
2. **Detecção de padrões de injeção**: Identifica e rejeita padrões comuns de SQL injection
3. **Bindings parametrizados**: Garante que valores sejam tratados como dados, não como código SQL

Essas medidas garantem que mesmo entradas maliciosas do usuário não consigam comprometer o banco de dados.