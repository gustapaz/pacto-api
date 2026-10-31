# Segurança e limites

Até 32 campos por contrato, 20 exemplos, 32 KiB JSON, tipos string/integer/number/boolean. DSL própria, sem JSON Schema arbitrário, refs, arrays ou objetos aninhados. Ausência é diferente de null.

O stream conta bytes reais e cancela ao ultrapassar 32 KiB, mesmo sem Content-Length. O servidor valida tipos, propriedades e limites. Não aceita corpo comprimido, execução de código do usuário ou arquivos persistidos.

Origin de navegador deve coincidir com o serviço; clientes sem Origin continuam aceitos. Isso não é autenticação nem impede chamadas por scripts externos. Não há cookies, contas ou credenciais públicas de administrador.

Respostas incluem no-store, nosniff, Referrer-Policy e request IDs. Erros não expõem stacks ou entradas. A aplicação não registra payloads; a infraestrutura pode registrar metadados. Use somente dados sintéticos, nunca informações pessoais, credenciais ou políticas reais sensíveis.

Não há rate limit global ou defesa DDoS própria. Trabalho e memória por chamada são limitados; cotas e disponibilidade dependem do provedor. Nenhum cartão, faturamento, trial ou plano pago foi ativado. Sem SLA ou garantia de gratuidade permanente.

engine/Contract.res implementa comparação e validação com records e arrays tipados. O build compila ReScript para Contract.res.js; o arquivo gerado é ignorado pelo Git e recriado na CI. JavaScript valida o contrato e converte exemplos para descritores tipados. As decisões de compatibilidade e os erros dos exemplos vêm do motor ReScript. Não há JSON Schema remoto, refs ou avaliação de código.

Os testes comprovam comportamentos delimitados; não certificam ausência universal de vulnerabilidades.
