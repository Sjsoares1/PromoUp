# Integração Web com ExpressAdapter

O Firebird Core Framework oferece integração nativa com frameworks web através do `ExpressAdapter`, que implementa o padrão definido pela interface `AdapterInterface`. Este capítulo explica como integrar o framework com aplicações Express.js, configurar middlewares de segurança e utilizar as rotas padrão para monitoramento.

## Configurando o ExpressAdapter

O `ExpressAdapter` é responsável por integrar o Firebird Core Framework com uma aplicação Express.js. Ele adiciona automaticamente as funcionalidades necessárias para operação do framework em uma aplicação web.

```typescript
import express from 'express';
import { FirebirdCore } from 'firebird-core-framework';
import { ExpressAdapter } from 'firebird-core-framework/src/adapters/ExpressAdapter';

// Inicializar o core
const core = new FirebirdCore({
  // Configurações do Firebird Core
});

await core.initialize();

// Criar aplicação Express
const app = express();

// Integrar o Firebird Core com o Express
const adapter = new ExpressAdapter(core);
adapter.applyTo(app);

app.listen(3000, () => {
  console.log('Aplicação rodando na porta 3000');
});
```

## Middlewares de Segurança

O `ExpressAdapter` inclui automaticamente middlewares de segurança essenciais para proteger sua aplicação. Quando o método `applyTo()` é chamado, o método `addSecurityMiddlewares()` é executado primeiro, adicionando os seguintes recursos:

1. **Parser JSON com limite**: Define um limite de 10MB para requisições JSON para prevenir ataques de negação de serviço
2. **Proteção contra manipulação de cabeçalhos**: Normaliza o cabeçalho `x-forwarded-for` para prevenir falsificação de IP

### Adicionando Middlewares Personalizados Antes do Adapter

É possível adicionar middlewares de segurança personalizados antes do `ExpressAdapter` para garantir que eles sejam executados antes das rotas do framework:

```typescript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { FirebirdCore } from 'firebird-core-framework';
import { ExpressAdapter } from 'firebird-core-framework/src/adapters/ExpressAdapter';

const core = new FirebirdCore({
  // Configurações do Firebird Core
});

await core.initialize();

const app = express();

// Middlewares de segurança personalizados (executados antes do adapter)
app.use(cors()); // Permite requisições de outros domínios
app.use(helmet()); // Define cabeçalhos de segurança HTTP

// Middleware de rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100 // Limite de 100 requisições por janela
});
app.use(limiter);

// Outros middlewares personalizados
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Integrar o Firebird Core com o Express (depois dos middlewares personalizados)
const adapter = new ExpressAdapter(core);
adapter.applyTo(app); // Os middlewares de segurança do adapter são adicionados aqui

app.listen(3000, () => {
  console.log('Aplicação rodando na porta 3000');
});
```

A ordem de execução é importante: os middlewares personalizados são executados primeiro, seguidos pelos middlewares de segurança do adapter, e finalmente as rotas do framework.

## Rotas Padrão do Framework

O `ExpressAdapter` registra automaticamente duas rotas principais que facilitam o monitoramento e a operação da aplicação:

### Rota `/health` (GET)

A rota `/health` é utilizada para verificações de saúde da aplicação e pode ser usada para monitoramento de uptime (Health Checks):

```typescript
// Exemplo de resposta da rota /health
{
  "status": "ok",
  "connected": true,
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

- `status`: Indica o estado geral da aplicação ("ok" ou "error")
- `connected`: Indica se o Firebird Core está conectado ao banco de dados
- `timestamp`: Momento exato da verificação

#### Uso para Monitoramento de Uptime

Esta rota é ideal para serviços de monitoramento de uptime como:

- Load balancers para verificar a disponibilidade do serviço
- Ferramentas de monitoramento como Pingdom, UptimeRobot ou Datadog
- Kubernetes readiness/liveness probes
- Scripts de monitoramento customizados

Exemplo de uso com curl:
```bash
curl -X GET http://localhost:3000/health
```

### Rota `/query` (POST)

A rota `/query` permite a execução de consultas SQL diretamente através de requisições HTTP:

```typescript
// Exemplo de requisição para /query
{
  "sql": "SELECT * FROM usuarios WHERE id = ?",
  "bindings": [123]
}

// Exemplo de resposta
{
  "rows": [
    { "id": 123, "nome": "João Silva" }
  ]
}
```

**Importante**: Esta rota deve ser protegida adequadamente em ambiente de produção, pois permite a execução direta de consultas SQL.

## Extensibilidade

O `ExpressAdapter` foi projetado para ser extensível. O método `setupCoreRoutes()` é um ponto de extensão futuro onde podem ser adicionadas rotas específicas do core:

```typescript
class CustomExpressAdapter extends ExpressAdapter {
  setupCoreRoutes(app: any): void {
    // Adicionar rotas customizadas do core
    app.get('/custom-endpoint', (req, res) => {
      res.json({ message: 'Rota customizada' });
    });
    
    // Chamar o comportamento padrão
    super.setupCoreRoutes(app);
  }
}
```

## Considerações de Segurança

Ao integrar o Firebird Core Framework com aplicações web, considere:

1. **Proteja a rota `/query`**: Em ambientes de produção, restrinja o acesso à rota `/query` usando autenticação e autorização adequadas
2. **Configure middlewares de segurança**: Use bibliotecas como `helmet`, `cors` e `express-rate-limit`
3. **Valide entradas**: Sempre valide e sanitize entradas antes de passar para consultas SQL
4. **Monitore acessos**: Implemente logging e monitoramento para detectar acessos suspeitos
5. **Use HTTPS**: Sempre utilize HTTPS em ambientes de produção

Com essas práticas, você pode integrar com segurança o Firebird Core Framework com suas aplicações web e aproveitar as funcionalidades de monitoramento e consulta disponíveis.