# Plugins e Extensibilidade

O Firebird Core Framework oferece um sistema robusto de plugins que permite estender sua funcionalidade e interceptar eventos importantes do ciclo de vida da aplicação. Os plugins são componentes que podem ser registrados no framework para adicionar comportamentos personalizados em diferentes momentos do processo.

## Hooks Disponíveis

Os plugins podem implementar diversos hooks para interceptar eventos do framework:

- `init(core)`: Chamado durante a inicialização do plugin, recebe uma referência ao core do framework
- `beforeConnect(config)`: Executado antes de estabelecer uma conexão com o banco de dados
- `afterConnect(connection)`: Executado após estabelecer uma conexão com sucesso
- `beforeQuery(query)`: Executado antes de executar uma query, recebendo informações sobre a query
- `afterQuery(result)`: Executado após executar uma query com sucesso, recebendo o resultado
- `onError(error)`: Executado quando ocorre um erro em qualquer parte do processo
- `beforeDisconnect()`: Executado antes de desconectar do banco de dados
- `destroy()`: Executado durante a destruição do plugin para limpeza de recursos

## Exemplo Prático: Plugin de Auditoria (AuditPlugin)

A seguir, apresentamos um exemplo prático de um plugin de auditoria que registra o tempo de execução de cada query:

```typescript
import { PluginInterface } from '../interfaces/PluginInterface';

/**
 * Plugin de auditoria que registra o tempo de execução de cada query
 */
export class AuditPlugin implements PluginInterface {
  public name: string = 'AuditPlugin';
  public version: string = '1.0.0';

  /**
   * Inicializa o plugin com referência ao core
   * @param core - Referência ao core do framework
   * @returns Promise<void>
   */
  async init(core: any): Promise<void> {
    console.log('AuditPlugin inicializado');
  }

  /**
   * Executado antes de estabelecer uma conexão
   * @param config - Configuração de conexão
   * @returns Promise<void>
   */
  async beforeConnect(config: any): Promise<void> {
    // Não faz nada específico neste exemplo
  }

  /**
   * Executado após estabelecer uma conexão
   * @param connection - Objeto de conexão
   * @returns Promise<void>
   */
  async afterConnect(connection: any): Promise<void> {
    console.log('Conexão estabelecida com sucesso');
  }

  /**
   * Executado antes de executar uma query - inicia a medição de tempo
   * @param query - Objeto de query contendo sql, bindings, etc.
   * @returns Promise<void>
   */
  async beforeQuery(query: any): Promise<void> {
    // Inicia a medição de tempo para esta query
    console.time(`Query: ${query.sql.substring(0, 50)}...`);
  }

  /**
   * Executado após executar uma query - finaliza a medição de tempo
   * @param result - Resultado da query
   * @returns Promise<void>
   */
  async afterQuery(result: any): Promise<void> {
    // Finaliza a medição de tempo e exibe o resultado
    console.timeEnd(`Query: ${result && result.command ? result.command : 'Desconhecida'}...`);
  }

  /**
   * Executado antes de desconectar
   * @returns Promise<void>
   */
  async beforeDisconnect(): Promise<void> {
    console.log('Desconectando...');
  }

  /**
   * Executado quando ocorre um erro
   * @param error - Objeto de erro
   * @returns Promise<void>
   */
  async onError(error: any): Promise<void> {
    console.error('Erro capturado pelo AuditPlugin:', error.message);
  }

  /**
   * Executado durante a destruição do plugin
   * @returns Promise<void>
   */
  async destroy(): Promise<void> {
    console.log('AuditPlugin sendo destruído');
  }
}
```

## Como Registrar um Plugin

Para registrar um plugin no framework, basta utilizar o método `use()` do core:

```typescript
import { FirebirdCore } from 'firebird-core-framework';
import { AuditPlugin } from './plugins/AuditPlugin'; // Caminho para o seu plugin

// Cria uma instância do core
const core = new FirebirdCore({
  host: 'localhost',
  port: 3050,
  database: './database.fdb',
  user: 'SYSDBA',
  password: 'masterkey'
});

// Registra o plugin de auditoria
core.use(new AuditPlugin());

// Inicializa o framework
await core.initialize();

// Agora todas as queries executadas serão auditadas
const result = await core.executeQuery('SELECT * FROM usuarios');
```

## Boas Práticas de Desenvolvimento de Plugins

1. **Sempre implemente os métodos assíncronos**: Todos os hooks do plugin são assíncronos e devem retornar Promises.

2. **Tratamento de erros**: Evite lançar exceções nos hooks, pois isso pode interferir no funcionamento normal do framework. Em vez disso, registre os erros ou trate-os adequadamente.

3. **Performance**: Plugins executam em pontos críticos do framework, então mantenha as operações leves para não impactar negativamente no desempenho.

4. **Recursos**: Libere recursos apropriadamente no método `destroy()` para evitar vazamentos de memória.

5. **Nome único**: Dê nomes únicos aos seus plugins para facilitar a identificação e depuração.

Com esse sistema de plugins, o Firebird Core Framework oferece uma maneira poderosa e flexível de estender suas funcionalidades sem modificar o código base do framework.