# Configuração do Firebird Core Framework

Este documento descreve a interface `FirebirdConfig` e suas opções de configuração, com foco especial nas configurações do pool de conexões que são fundamentais para aplicações em alta carga.

## Interface FirebirdConfig

A interface `FirebirdConfig` define todas as opções de configuração para conexão com o banco de dados Firebird:

```typescript
interface FirebirdConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  clientLibPath?: string;           // Caminho customizado para a biblioteca do Firebird (opcional)
  pool?: PoolConfig;
  options?: Record<string, any>;
}
```

### Propriedades principais

- `host`: Endereço do servidor Firebird (padrão: 'localhost')
- `port`: Porta do servidor Firebird (padrão: 3050)
- `username`: Nome de usuário para autenticação
- `password`: Senha para autenticação
- `database`: Caminho completo ou nome do banco de dados
- `clientLibPath`: Caminho customizado para a biblioteca do Firebird (opcional)
- `pool`: Configurações do pool de conexões (opcional)
- `options`: Opções adicionais específicas do driver (opcional)

## Carregamento de Biblioteca Customizada (fbclient)

Por padrão, o framework tenta carregar a biblioteca cliente do Firebird (fbclient.dll no Windows ou libfbclient.so no Linux) a partir do sistema. Em alguns ambientes ou cenários específicos, pode ser necessário especificar uma versão específica da biblioteca para evitar conflitos ou garantir compatibilidade.

Para isso, utilize a propriedade `clientLibPath` na configuração:

```typescript
import { FirebirdCore } from 'firebird-core-framework';
import path from 'path';

const db = new FirebirdCore({
    host: 'localhost',
    database: '/dados/banco.fdb',
    // Apontando para uma DLL específica para evitar conflitos
    clientLibPath: path.join(__dirname, 'bin', 'fbclient.dll'),
    // ...
});
```

Essa abordagem é especialmente útil quando você precisa garantir que sua aplicação utilize uma versão específica da biblioteca cliente do Firebird, como quando está empacotando sua aplicação com uma versão específica da biblioteca ou quando há conflitos com versões instaladas no sistema.

## Configuração do Pool de Conexões

As opções de pool são críticas para o desempenho e estabilidade da aplicação, especialmente em ambientes de alta carga. O pool gerencia a reutilização de conexões com o banco de dados, evitando a sobrecarga de criar e destruir conexões constantemente.

### Interface PoolConfig

```typescript
interface PoolConfig {
  min?: number;                // Número mínimo de conexões no pool
  max?: number;                // Número máximo de conexões no pool
  acquireTimeoutMillis?: number;     // Tempo limite em milissegundos para obter uma conexão do pool
  createTimeoutMillis?: number;      // Tempo limite em milissegundos para criar uma nova conexão
  destroyTimeoutMillis?: number;     // Tempo limite em milissegundos para destruir uma conexão
  idleTimeoutMillis?: number;        // Tempo máximo em milissegundos que uma conexão pode ficar ociosa
  reapIntervalMillis?: number;       // Intervalo em milissegundos para verificar conexões ociosas
  createRetryIntervalMillis?: number; // Intervalo em milissegundos entre tentativas de criação de conexão
  validate?: (connection: any) => boolean; // Função para validar se uma conexão é válida
  afterCreate?: (connection: any) => any;  // Função chamada após a criação de uma conexão
  maxConnectionLifetimeMillis?: number;    // Tempo máximo de vida útil de uma conexão em milissegundos
  maxConnectionLifetimeJitterMillis?: number; // Jitter para tempo máximo de vida útil em milissegundos
  propagateCreateError?: boolean; // Se erros de criação devem ser propagados
}

## Propriedades do Pool Suportadas (Whitelist)

O pool de conexões suporta as seguintes propriedades que são validadas e sanitizadas internamente:

| Propriedade | Tipo | Descrição |
|-------------|------|-----------|
| `min` | `number` | Número mínimo de conexões mantidas no pool |
| `max` | `number` | Número máximo de conexões permitidas no pool |
| `acquireTimeoutMillis` | `number` | Tempo limite em milissegundos para obter uma conexão do pool |
| `createTimeoutMillis` | `number` | Tempo limite em milissegundos para criar uma nova conexão |
| `destroyTimeoutMillis` | `number` | Tempo limite em milissegundos para destruir uma conexão |
| `idleTimeoutMillis` | `number` | Tempo máximo em milissegundos que uma conexão pode ficar ociosa |
| `reapIntervalMillis` | `number` | Intervalo em milissegundos para verificar e limpar conexões ociosas |
| `createRetryIntervalMillis` | `number` | Intervalo em milissegundos entre tentativas de criação de conexão |
| `validate` | `(connection: any) => boolean` | Função para validar se uma conexão é válida antes de ser usada |
| `afterCreate` | `(connection: any) => any` | Função chamada imediatamente após a criação de uma conexão |
| `maxConnectionLifetimeMillis` | `number` | Tempo máximo de vida útil de uma conexão em milissegundos |
| `maxConnectionLifetimeJitterMillis` | `number` | Jitter adicional aleatório para o tempo máximo de vida útil |
| `propagateCreateError` | `boolean` | Indica se erros durante a criação de conexão devem ser propagados |

## Nota de Compatibilidade (Legacy Support)

Para manter compatibilidade com versões anteriores, as seguintes propriedades antigas ainda são aceitas e serão convertidas internamente para seus equivalentes modernos:

| Propriedade Antiga | Convertida Para |
|------------------|------------------|
| `acquireTimeout` | `acquireTimeoutMillis` |
| `createTimeout` | `createTimeoutMillis` |
| `destroyTimeout` | `destroyTimeoutMillis` |
| `idleTimeout` | `idleTimeoutMillis` |
| `reapInterval` | `reapIntervalMillis` |
| `createRetryInterval` | `createRetryIntervalMillis` |

Esta conversão automática garante que configurações antigas continuem funcionando enquanto você gradualmente atualiza para os nomes de propriedades padronizados.

É recomendado utilizar os nomes de propriedades modernos (`*Millis`) para novas implementações, pois representam com mais clareza que os valores devem ser especificados em milissegundos.
}
```

### Parâmetros do Pool e seu Impacto em Alta Carga

#### `min` (padrão: 2)
- Define o número mínimo de conexões mantidas ativas no pool
- Em alta carga, um valor maior pode reduzir o tempo de espera para obter conexões
- Equilibra a latência inicial com o consumo de recursos

#### `max` (padrão: 10)
- Limite superior de conexões simultâneas com o banco de dados
- Prevenir sobrecarga do servidor Firebird com conexões excessivas
- Em alta carga, este valor deve considerar o limite do servidor e os recursos disponíveis

#### `acquireTimeoutMillis` (padrão: 30000ms)
- Tempo máximo que uma operação aguardará por uma conexão disponível no pool
- Em alta carga, um timeout adequado evita que requisições fiquem bloqueadas indefinidamente
- Pode ajudar a prevenir cascata de falhas em situações de pico

### Benefícios em Alta Carga

1. **Eficiência Recursiva**: O pool reutiliza conexões existentes, reduzindo a sobrecarga de criar novas conexões sob demanda.

2. **Controle de Concorrência**: Limita o número máximo de conexões simultâneas, protegendo o servidor contra sobrecarga.

3. **Disponibilidade**: Mantém um número mínimo de conexões prontas para uso, reduzindo latência em picos de demanda.

4. **Recuperação de Falhas**: Com timeouts configuráveis, permite recuperação rápida de situações temporárias de indisponibilidade.

## Exemplo de Configuração para Alta Carga

Para aplicações que esperam alta concorrência, recomenda-se ajustar os parâmetros do pool:

```typescript
const highLoadConfig: FirebirdConfig = {
  host: 'localhost',
  port: 3050,
  username: 'SYSDBA',
  password: process.env.FIREBIRD_PASSWORD || '',
  database: '/path/to/database.fdb',
  pool: {
    min: 10,                    // Manter 10 conexões ativas no mínimo
    max: 50,                    // Permitir até 50 conexões simultâneas
    acquireTimeoutMillis: 60000,      // Aguardar até 60 segundos por uma conexão
    createTimeoutMillis: 30000,       // Timeout de 30 segundos para criar conexão
    destroyTimeoutMillis: 5000,       // Timeout de 5 segundos para destruir conexão
    idleTimeoutMillis: 300000,        // Conexões ociosas duram até 5 minutos
    reapIntervalMillis: 1000,         // Verificar conexões a cada segundo
    createRetryIntervalMillis: 200,   // Tentar novamente a cada 200ms
    propagateCreateError: false // Não propagar erros de criação
  }
};
```

## Exemplo de Arquivo .env Recomendado

```env
# Configurações básicas do Firebird
FIREBIRD_HOST=localhost
FIREBIRD_PORT=3050
FIREBIRD_USERNAME=SYSDBA
FIREBIRD_PASSWORD=SuaSenhaSegura
FIREBIRD_DATABASE=/caminho/para/seu/banco.fdb

# Configurações do pool (valores padrão podem ser substituídos)
FIREBIRD_POOL_MIN=5
FIREBIRD_POOL_MAX=20
FIREBIRD_POOL_ACQUIRE_TIMEOUT_MILLIS=30000
FIREBIRD_POOL_CREATE_TIMEOUT_MILLIS=30000
FIREBIRD_POOL_DESTROY_TIMEOUT_MILLIS=5000
FIREBIRD_POOL_IDLE_TIMEOUT_MILLIS=600000
```

## Considerações Finais

- Monitore constantemente o uso do pool em produção para ajustar os valores ideais
- Considere o hardware disponível tanto no cliente quanto no servidor
- Teste diferentes configurações em ambiente semelhante ao de produção
- Ajuste gradualmente os valores com base no comportamento real da aplicação