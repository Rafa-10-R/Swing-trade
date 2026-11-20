# Swing Trade Pessoal — v7

## Alterações
- Removida a aba visível "Notícias / IBOV". O IBOV continua sendo carregado e exibido automaticamente como benchmark no comparativo e nas métricas de mercado.
- Até seis ações/Units selecionáveis no comparativo; IBOV é uma coluna adicional fixa e não consome uma das seis vagas.
- Comparativo mostra somente os ativos selecionados na lista global; a lista de ativos pode ser gerenciada no Resumo.
- Remoção de um ativo na lista global o retira também do Resumo, do seletor de comparação e das demais telas que dependem da lista monitorada.
- Colunas dos ativos centralizadas; primeira coluna congelada com fundo opaco e rolagem horizontal independente.
- Escalas de cores recalculadas somente entre os ativos selecionados; o IBOV e a média não influenciam as cores dos papéis.
- Service Worker/cache atualizado para v7.

## Publicação
Substitua index.html, app.js e sw.js na raiz do GitHub Pages e faça commit.
