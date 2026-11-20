# Swing Trade PWA — v9

## Alterações desta versão
- Resumo dos ativos em cartões responsivos por ativo, com identificação verde para compra e vermelha para venda.
- Exportação JPEG por canvas, com arquivo .jpg gerado no navegador Android.
- Beta exclusivamente automático, calculado por covariância dos retornos diários ajustados da ação contra o IBOV em todo o período histórico coincidente disponível (mínimo de 30 observações).
- Persistência do estado e dados no IndexedDB, com migração do estado anterior em localStorage.
- Backup JSON e restauração implementados.

## Publicação
Substitua `index.html`, `app.js` e `sw.js` na raiz do repositório GitHub Pages e faça Commit changes. O Service Worker usa cache `swingtrade-shell-v9`.

## Persistência
IndexedDB persiste após fechar o app e limpar apenas o cache. Limpar dados do site/navegador pode apagar IndexedDB; use Backup JSON para proteção e transferência entre aparelhos.

## Beta
Beta = covariância dos retornos diários da ação e do IBOV dividida pela variância dos retornos do IBOV. São usados preços ajustados da ação quando fornecidos pela fonte, alinhados por data com o IBOV.
