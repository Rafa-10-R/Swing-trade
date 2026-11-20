# Swing Trade Pessoal — PWA Android

Aplicativo web instalável (PWA), pensado para uso pessoal. Interface em português.

## Executar / instalar

1. Hospede o conteúdo desta pasta em um endereço HTTPS (por exemplo, GitHub Pages).
2. Abra o endereço no Chrome do Android.
3. Menu ⋮ → **Instalar app** ou **Adicionar à tela inicial**.
4. Na primeira utilização, conecte à internet para carregar cotações e manchetes.

Também é possível testar `index.html` em navegador desktop, mas a instalação PWA exige HTTPS (ou localhost).

## Fonte de dados gratuita

O histórico diário é consultado no endpoint não oficial Yahoo Finance Chart (`query1.finance.yahoo.com/v8/finance/chart`) por meio do proxy CORS público `proxy.cors.dev`. Não exige token, mas não é API oficial, não oferece SLA e pode mudar, atrasar ou bloquear consultas. São solicitados três anos de candles diários e descartado o candle da data atual para respeitar D-1. A lista é mantida no armazenamento local do navegador.

Notícias: Google News RSS via proxy CORS. O indicador de sentimento é uma heurística de palavras-chave e permanece editável.

## Observação importante sobre fidelidade

O Excel original tem fórmulas estruturadas por planilha, inclusive dependências de abas externas/ausentes no comparativo (por exemplo, CSAN3, AZUL4, RADL3, PETZ3, KLBN11 e RENT3), parâmetros manuais, campos com dados de terceiros e fórmulas de matriz. O app implementa os cálculos reproduzíveis identificados nas abas de ativo (janela de 119 observações, indicadores I:S, médias 3/7/30, lucro, risco, pontuação e projeções) e reconstrói o comparativo para até quatro tickers carregados. Campos de notícias/tendência/beta/52 semanas são editáveis.

Não é possível afirmar equivalência integral, célula a célula, com o arquivo: o comparativo original contém vínculos para abas que não existem no arquivo enviado e parte dos inputs manuais não tem uma regra automatizável. Consulte e valide os resultados contra o Excel antes de qualquer uso operacional.

## Arquivos

- `index.html`: interface
- `app.js`: dados, cálculos e interação
- `manifest.webmanifest`, `sw.js`, `icon.svg`: instalação e cache

Uso pessoal. Não constitui recomendação financeira.
