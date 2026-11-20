# Swing Trade Pessoal — versão 3

PWA pessoal para análise de ações e Units da B3, com histórico diário, IBOV como benchmark, comparação e simulação de retorno por quantidade.

## Publicação
Enviar os arquivos desta pasta para a raiz do repositório GitHub Pages, substituindo os arquivos existentes. Publicar pela branch `main` e pasta `/ (root)`.

## Atualizações
`index.html` carrega `app.js?v=20261120-3`; `sw.js` usa cache versionado `swingtrade-static-v3-20261120-3` e remove caches anteriores na ativação.

## Regras da aba Geral reproduzidas
- Janela: 119 cotações mais recentes; indicadores I:N calculados sobre 118 observações com pregão anterior disponível.
- I = abertura / fechamento anterior - 1.
- J = máxima / fechamento anterior - 1.
- K = 1 - mínima / fechamento anterior.
- L = máxima do dia / mínima do pregão anterior - 1.
- M = fechamento / mínima do dia - 1.
- N = máxima / abertura - 1.
- O = máxima do dia - mínima do pregão anterior.
- P = ação e IBOV com retorno diário negativo na mesma data.
- Q = L < 2% e M do pregão seguinte (anterior na ordem cronológica da planilha) < 0,7%.
- R = I < 0 e N < 0,7%.
- Compra = último fechamento × (1 - média K escolhida na regra de projeção). O Excel original não usa uma única janela: HAPV3 usa K de 7 dias; AMER3 e MGLU3 usam K de 3 dias; AERI3 usa K de 30 dias; RAPT4, LWSA3, GGBR4, EZTC3, B3SA3 e ENJU3 usam K somente positiva. Para tickers novos, o app inicia em K de 7 dias e permite alterar entre K de 3, 7, 30, somente positivas ou geral.
- Venda = mínima mais recente × (1 + média L somente positiva), conforme D132.
- LPA 3 dias = média de O dos três pregões mais recentes.
- Quantidade sugerida segue a tabela de faixas de preço da coluna Qtd da aba Geral.
- Pontuação soma contagens I:N, pontuação de lucratividade, risco pelo preço, notícias, tendência de mercado e proximidade de máxima/mínima de 52 semanas.

## IBOV
O IBOV é carregado como benchmark padrão, aparece no ranking geral e já vem pré-selecionado no comparativo.

## Simulação
A quantidade sugerida pode ser alterada. O preço esperado de venda é editável e inicia no preço projetado de venda. Resultado bruto = (preço de venda esperado - último fechamento) × quantidade. Não inclui taxas ou tributos.

## Fontes e limitações
Cadastro de ativos: brapi; histórico: Yahoo Finance via proxy CORS, com fallback brapi quando disponível. A disponibilidade e cobertura dessas fontes gratuitas não são garantidas. O IBOV é carregado como benchmark padrão. Confirmar cotações com a corretora.

## Histórico I:S (réplica da planilha)
A tabela histórica agora calcula I:S em todos os pregões retornados, com a série em ordem decrescente (D-1 para trás):
- I = Abertura / fechamento do pregão anterior - 1
- J = Máxima / fechamento do pregão anterior - 1
- K = 1 - Mínima / fechamento do pregão anterior
- L = Máxima do dia / mínima do pregão anterior - 1
- M = Fechamento / mínima do próprio dia - 1
- N = Máxima / abertura do próprio dia - 1
- O = Máxima do dia - mínima do pregão anterior (R$)
- P = "Sim" quando ação e IBOV caem no mesmo pregão
- Q = "Sim" quando L < 2% e M do pregão seguinte na tabela < 0,7%
- R = "Sim" quando I < 0% e N < 0,7%
- S = Máxima - mínima do próprio dia (R$)

Formatação condicional reproduzida: I e J em vermelho quando < 0; K em verde quando < 0; L em vermelho quando < 2%; M e N em vermelho quando < 0,7%. As células com P/Q/R verdadeiros recebem destaque verde tipográfico no app.
