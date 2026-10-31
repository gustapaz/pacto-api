# Arquitetura

Objetivo: estudar mude o contrato. entenda o impacto.

HTTP -> validação -> motor ReScript 11 -> JSON.

engine/Contract.res implementa comparação e validação com records e arrays tipados. O build compila ReScript para Contract.res.js; o arquivo gerado é ignorado pelo Git e recriado na CI. JavaScript valida o contrato e converte exemplos para descritores tipados. As decisões de compatibilidade e os erros dos exemplos vêm do motor ReScript. Não há JSON Schema remoto, refs ou avaliação de código.

A análise é direcional: objetos aceitos por before devem continuar aceitos por after. Contratos são objetos planos fechados; campos extras são inválidos, required tem padrão false e null não equivale a ausência. Tipos: string, integer, number e boolean. integer pode ampliar para number. Enum e maxLength só existem para string; min/max só para numéricos, com limites inteiros em integer. maxLength usa unidades UTF-16. Sem enum significa string livre; enum explícito precisa ser não vazio. O comparador é conservador e pode sinalizar risco sem existir uma regressão concreta (por exemplo, reduzir maxLength quando o enum já era curto). Por isso retorna potentially_breaking, nunca uma prova universal de quebra. /probe testa somente os exemplos fornecidos e não prova compatibilidade total.

server/http.mjs cuida de leitura limitada, headers, erros e OpenAPI. server/service.mjs define operações/contratos. server/meta.mjs contém exemplos sintéticos. app/playground.tsx é apenas cliente HTTP. tests inclui casos de domínio e integração real.

Não existem filas, banco, cron ou integrações sem função no domínio. Nenhuma persistência é prometida. 200 cenários de ampliação preservam exemplos aceitos. Testes verificam direção, campos fechados, tipos, limites, enum, null, UTF-16 e a distinção entre risco conservador e regressão concreta.
