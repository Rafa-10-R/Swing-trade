# Swing Trade Pessoal — v6

PWA para Android, publicada pelo GitHub Pages.

## Alterações v6
- Aba inicial renomeada para **Resumo**.
- Plano do próximo pregão com classificação por ativo: Comprar, Vender ou Acompanhar.
- Quantidade compartilhada entre Resumo, Comparativo e Simulação do Ativo.
- Painel Resumo com os campos correspondentes às colunas C:U da aba Geral da planilha.
- Comparativo com até seis ativos e primeira coluna congelada sem sobrepor as colunas de valores.
- Histórico Yahoo Finance solicita também a sessão da data atual; a vela D-0 só é incluída quando a sessão regular está encerrada. Durante o pregão, o último fechamento confirmado permanece como base.

## Atualização
Substitua `index.html`, `app.js` e `sw.js` na raiz do repositório GitHub Pages e faça Commit Changes. O cache passa a `swingtrade-shell-v6`.

## Limitações
A fonte gratuita Yahoo Finance é não oficial e pode atrasar ou falhar. O D-0 só fica disponível após o fechamento confirmado e atualização do provedor; antes disso, o aplicativo não usa uma vela intradiária incompleta como fechamento.
