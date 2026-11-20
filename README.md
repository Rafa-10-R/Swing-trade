# Swing Trade Pessoal — versão 2026.11.20.2

PWA pessoal para Android. Cadastro pesquisável de ações ordinárias e Units da B3; histórico diário; projeções e comparação.

## Publicação no GitHub Pages
Envie os arquivos da pasta para a raiz do repositório, substituindo os anteriores. Em Settings > Pages, publique `main` / `/ (root)`.

## Fontes e limitações
- Cadastro de ações/Units: `brapi.dev/api/quote/list` sem token, filtrando `type=stock` e `subType=stock|unit`.
- Histórico: Yahoo Finance Chart API via `proxy.cors.dev`, ticker `.SA`, período de três anos, candles diários e filtro D-1.
- Fallback: endpoint histórico brapi gratuito, quando disponível; a cobertura/intervalo pode ser limitada.
- IBOV: Yahoo Finance `^BVSP` via o mesmo proxy.
- Não há garantia de cobertura completa ou disponibilidade de provedores gratuitos. O app sinaliza erros e não inventa cotações.

## Metodologia
A janela de indicadores segue a estrutura do Excel: 119 cotações recentes e contagens/estatísticas sobre 118 observações comparáveis. Projeções de compra/venda, cenários, pontuação, quantidades e comparativo são calculados no cliente. Beta é estimado por covariância dos retornos diários da ação contra IBOV (até 252 observações); o Excel original tinha beta digitado manualmente, portanto esse campo não é uma reprodução literal.

## Atualização
`sw.js` usa cache versionado e rede primeiro para os arquivos do app; remove caches antigos e solicita atualização do Service Worker. `app.js` tem query string de versão. Depois do commit, feche e reabra o PWA ou atualize a página.
