# Swing Trade Pessoal — v8

## Alterações
- Beta calculado pelo app: covariância dos retornos diários ajustados da ação dividida pela variância dos retornos diários do IBOV, usando até 252 pregões coincidentes (mínimo de 30 observações).
- Persistência principal em IndexedDB, com migração automática do estado existente em localStorage.
- Solicitação de armazenamento persistente pelo navegador (`navigator.storage.persist()`), quando suportada.
- Exportação do Resumo em imagem JPEG responsiva, com cards por ativo e destaque verde para compra e vermelho para venda.
- Backup JSON exportável e restauração de backup.
- Resumo com células de compra em verde e venda em vermelho.
- Cache atualizado para v8.

## Persistência: limite importante
IndexedDB não é o cache do Service Worker e permanece após fechar/reabrir o app e após limpar apenas arquivos/imagens em cache. Se o usuário selecionar “limpar dados do site”, “limpar armazenamento” ou desinstalar/apagar dados do navegador, os dados locais podem ser removidos. Para sobreviver a isso e sincronizar entre dispositivos é necessário banco remoto com autenticação; o backup JSON é a proteção disponível nesta versão.

## Publicação
Substitua `index.html`, `app.js` e `sw.js` na raiz do GitHub Pages e faça commit. Faça um backup JSON após a atualização.
