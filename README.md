# Pacto API

Compare contratos de objetos e teste exemplos contra as duas definições. Um motor ReScript tipado identifica ampliações compatíveis e riscos de quebra para produtores de dados.

**Motor: ReScript 11.**

[Demo](https://pacto-api-gustapaz.starrylinen.chatgpt.site) · [Swagger](https://pacto-api-gustapaz.starrylinen.chatgpt.site/docs.html) · [OpenAPI](https://pacto-api-gustapaz.starrylinen.chatgpt.site/api/openapi.json)

## Recursos

A pergunta é direcional: tudo que o contrato anterior aceitava continua aceito pelo novo? Objetos são fechados e planos. O comparador é conservador: aponta riscos potenciais; as sondagens mostram regressões concretas nos exemplos enviados.

Os exemplos são sintéticos. O motor, as regras e as respostas são reais no servidor. Não há serviços externos simulando o processamento.

## Executar localmente

Node.js 24 e npm. O compilador ReScript 11.1.4 está fixado no package.json e gera módulos ES no build.

```sh
npm ci
npm run build
npm start -- --port 5213
```

Abra http://127.0.0.1:5213 e /docs.html. Não precisa de conta cloud, cartão, segredo ou banco. O serviço é stateless: nada precisa sobreviver à requisição, portanto não existem migrações ou persistência prometida.

```sh
npm run build:engine
npm run check
npm run typecheck
npm test
npm run smoke -- http://127.0.0.1:5213
```

35 testes passam sobre o motor real e integração HTTP via TCP, sem mocks do domínio. 200 cenários de ampliação preservam exemplos aceitos. Testes verificam direção, campos fechados, tipos, limites, enum, null, UTF-16 e a distinção entre risco conservador e regressão concreta. A CI instala do lockfile, constrói o motor, verifica formatação e tipos do adaptador/interface, executa testes e compila o Worker. O smoke verifica os exemplos e as duas operações no runtime local ou público.

## API e exemplos

```sh
curl https://pacto-api-gustapaz.starrylinen.chatgpt.site/api/health
curl -X POST https://pacto-api-gustapaz.starrylinen.chatgpt.site/api/v1/compare -H 'Content-Type: application/json' --data-binary @examples/requests/example-1.json
curl -X POST https://pacto-api-gustapaz.starrylinen.chatgpt.site/api/v1/probe -H 'Content-Type: application/json' --data-binary @examples/requests/example-1.json
```

GET /api/v1/examples oferece três entradas sintéticas executáveis. O health executa uma operação real no motor antes de retornar engine_check:true. Todos os endpoints são públicos, sem identidade ou recursos privados persistidos.

Erros usam application/problem+json e request_id, sem stack trace. JSON/UTF-8 inválido: 400; Origin de navegador diferente: 403; rota desconhecida: 404; corpo acima de 32 KiB: 413; mídia/codificação incorreta: 415; contrato inválido: 422.

## Semântica

A análise é direcional: objetos aceitos por before devem continuar aceitos por after. Contratos são objetos planos fechados; campos extras são inválidos, required tem padrão false e null não equivale a ausência. Tipos: string, integer, number e boolean. integer pode ampliar para number. Enum e maxLength só existem para string; min/max só para numéricos, com limites inteiros em integer. maxLength usa unidades UTF-16. Sem enum significa string livre; enum explícito precisa ser não vazio. O comparador é conservador e pode sinalizar risco sem existir uma regressão concreta (por exemplo, reduzir maxLength quando o enum já era curto). Por isso retorna potentially_breaking, nunca uma prova universal de quebra. /probe testa somente os exemplos fornecidos e não prova compatibilidade total.

Até 32 campos por contrato, 20 exemplos, 32 KiB JSON, tipos string/integer/number/boolean. DSL própria, sem JSON Schema arbitrário, refs, arrays ou objetos aninhados. Ausência é diferente de null.

## Arquitetura e operação

[Arquitetura](docs/architecture.md) · [Segurança](docs/security.md)

O núcleo está em engine/Contract.res, server/core.mjs, server/service.mjs. Vinext/React fornece somente o adaptador Worker e a documentação técnica; as regras não são executadas no navegador. Entradas e resultados não são gravados pela aplicação; a página mantém a resposta apenas em memória.

Demo hospedada em Sites, sem cartão, faturamento, trial ou plano pago ativado. GitHub hospeda código e CI; Pages não executa a API. Cotas e disponibilidade dependem da hospedagem, sem SLA ou promessa de gratuidade permanente. Há limite de trabalho por chamada, mas não rate limit global próprio. Use somente dados sintéticos.

Nenhuma variável secreta é necessária. Credenciais de Git/publicação ficam fora do repositório. Consulte .env.example.

## Licença

Código do projeto sob MIT. Dependências mantêm suas licenças. Swagger UI conserva LICENSE e NOTICE em public/swagger; tooling Sites/Vinext preserva avisos em vendor e scripts/vite/sites-vite-plugin.LICENSE.
