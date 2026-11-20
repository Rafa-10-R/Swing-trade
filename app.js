/* Swing Trade Pessoal — build 2026.11.20.3 */
const $=id=>document.getElementById(id);
const fmt=(n,d=2)=>Number.isFinite(Number(n))?Number(n).toLocaleString('pt-BR',{minimumFractionDigits:d,maximumFractionDigits:d}):'—';
const pct=n=>Number.isFinite(Number(n))?(Number(n)*100).toFixed(2).replace('.',',')+'%':'—';
const money=n=>Number.isFinite(Number(n))?'R$ '+fmt(n):'—';
const STORE='swingtrade-v3-state', DB_NAME='swingtrade-personal-db', DB_VERSION=1;
let state={tickers:[],data:{},active:null,compare:[],news:[],ibov:null,overrides:{},assets:[],tradePlan:{}};
try{state={...state,...JSON.parse(localStorage.getItem(STORE)||'{}')}}catch{}
if(!Array.isArray(state.compare))state.compare=[];state.compare=state.compare.filter(t=>t!=='IBOV'&&state.tickers.includes(t)).slice(0,6);
let dbPromise=null;
function openStateDB(){if(!('indexedDB'in window))return Promise.reject(Error('IndexedDB indisponível'));if(!dbPromise)dbPromise=new Promise((resolve,reject)=>{const req=indexedDB.open(DB_NAME,DB_VERSION);req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains('appState'))db.createObjectStore('appState',{keyPath:'id'})};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)});return dbPromise}
async function persistState(){try{const db=await openStateDB();await new Promise((resolve,reject)=>{const tx=db.transaction('appState','readwrite');tx.objectStore('appState').put({id:'main',savedAt:Date.now(),state});tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error)});try{localStorage.setItem(STORE,JSON.stringify({tickers:state.tickers,active:state.active,compare:state.compare,tradePlan:state.tradePlan,overrides:state.overrides,projectionRules:state.projectionRules,simulations:state.simulations,assets:state.assets,assetsAt:state.assetsAt}))}catch{} }catch(e){console.warn('Persistência IndexedDB:',e)}}
function save(){persistState()}
async function restoreStateDB(){try{const db=await openStateDB();const record=await new Promise((resolve,reject)=>{const tx=db.transaction('appState','readonly');const req=tx.objectStore('appState').get('main');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)});if(record?.state)state={...state,...record.state};else await persistState();if(!Array.isArray(state.tickers))state.tickers=[];if(!Array.isArray(state.compare))state.compare=[];state.compare=state.compare.filter(t=>t!=='IBOV'&&state.tickers.includes(t)).slice(0,6);try{if(navigator.storage?.persist)await navigator.storage.persist()}catch{} }catch(e){console.warn('Não foi possível abrir IndexedDB:',e)}}
const proxy='https://proxy.cors.dev/';
const yahoo='https://query1.finance.yahoo.com';
const brapi='https://brapi.dev/api';
const todaySP=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo'}).format(new Date());
const addDays=(s,n)=>{const d=new Date(s+'T12:00:00-03:00');d.setDate(d.getDate()+n);return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo'}).format(d)};
function isSessionClosed(meta){const end=meta?.currentTradingPeriod?.regular?.end;if(end&&Number(end)*1000<=Date.now())return true;const clock=new Intl.DateTimeFormat('en-GB',{timeZone:'America/Sao_Paulo',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date());return meta?.marketState==='CLOSED'||meta?.marketState==='POST'||clock>='18:30';}
const epoch=s=>Math.floor(new Date(s+'T00:00:00-03:00').getTime()/1000);
const dateSP=ts=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(ts*1000));
async function getJSON(url){const r=await fetch(proxy+url,{credentials:'omit',cache:'no-store'});if(!r.ok)throw Error(`Consulta indisponível (${r.status})`);return r.json()}
function safeText(s){return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function sum(a){return a.reduce((s,v)=>s+(Number.isFinite(v)?v:0),0)}
function avg(a){const x=a.filter(Number.isFinite);return x.length?sum(x)/x.length:NaN}
function count(a,fn){return a.filter(fn).length}
function qty(p){return p<=2?2000:p<=4?1100:p<=7?600:p<=10?400:p<=15?300:p<=30?200:100}
function band(x){return x>=1.3?'Muito Alto':x>=1.15?'Alto':x>=1?'Neutro':x>=.8?'Baixo':'Muito Baixo'}
function riskPts(s){return ({'Muito Baixo':-10,'Baixo':-5,'Neutro':0,'Alto':5,'Muito Alto':10})[s]??0}
const ORIGINAL_BUY_RULES={HAPV3:'k7',AMER3:'k3',MGLU3:'k3',RAPT4:'kp',LWSA3:'kp',GGBR4:'kp',EZTC3:'kp',B3SA3:'kp',AERI3:'k30',ENJU3:'kp'};
function buyRule(t){return state.projectionRules?.[t]||ORIGINAL_BUY_RULES[t]||'k7'}
function buyRuleValue(m,rule){return ({k3:m.k3,k7:m.k7,k30:m.k30,kp:m.kp,kg:m.kg})[rule]??m.k7}

// Cadastro completo de ações ordinárias, preferenciais e units listado pela brapi (sem token).
async function loadUniverse(force=false){
 if(!force&&state.assets?.length&&Date.now()-(state.assetsAt||0)<86400000)return state.assets;
 setStatus('generalStatus','Carregando cadastro de ações e Units da B3…');
 const urls=[`${brapi}/quote/list?type=stock&subType=stock&limit=2000&sortBy=name&sortOrder=asc`,`${brapi}/quote/list?type=stock&subType=unit&limit=2000&sortBy=name&sortOrder=asc`];
 const results=await Promise.all(urls.map(getJSON));
 const all=results.flatMap(j=>j.stocks||[]).filter(x=>x.stock&&/^[A-Z]{4}[0-9]{1,2}$/.test(x.stock));
 const unique=[...new Map(all.map(x=>[x.stock,{ticker:x.stock,name:x.longName||x.name||x.stock,sector:x.sector||'',subType:x.subType||'stock'}])).values()].sort((a,b)=>a.ticker.localeCompare(b.ticker));
 if(!unique.length)throw Error('A lista de ativos da B3 veio vazia. Tente novamente.');
 state.assets=unique;state.assetsAt=Date.now();save();return unique;
}
function setStatus(id,msg){const el=$(id);if(el)el.textContent=msg}
function showSearchResults(inputId,resultsId,items){const box=$(resultsId);if(!box)return;box.innerHTML=items.length?items.slice(0,30).map(x=>`<button type="button" class="suggestion" data-pick="${safeText(x.ticker)}" data-input="${inputId}"><b>${safeText(x.ticker)}</b><span>${safeText(x.name)}</span></button>`).join(''):'<div class="suggestion muted">Nenhum ativo encontrado no cadastro carregado.</div>';box.classList.remove('hide');box.querySelectorAll('[data-pick]').forEach(b=>b.onclick=()=>{const inp=$(b.dataset.input);inp.value=b.dataset.pick;box.classList.add('hide');if(inputId==='tickerInput')add(b.dataset.pick);else add(b.dataset.pick)});}
function setupSearch(inputId,resultsId){const el=$(inputId);if(!el)return;el.addEventListener('input',()=>{const q=el.value.trim().toUpperCase();if(q.length<1){$(resultsId)?.classList.add('hide');return}const items=(state.assets||[]).filter(x=>x.ticker.includes(q)||x.name.toUpperCase().includes(q));showSearchResults(inputId,resultsId,items)});el.addEventListener('focus',()=>{if(el.value.trim().length){const q=el.value.trim().toUpperCase();showSearchResults(inputId,resultsId,(state.assets||[]).filter(x=>x.ticker.includes(q)||x.name.toUpperCase().includes(q)))}})}

async function yahooHistory(ticker){
 const symbol=encodeURIComponent(ticker+'.SA'),today=todaySP(),end=epoch(addDays(today,1)),d=new Date();d.setFullYear(d.getFullYear()-3);const start=epoch(new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo'}).format(d));
 const j=await getJSON(`${yahoo}/v8/finance/chart/${symbol}?period1=${start}&period2=${end}&interval=1d&events=div%2Csplits`);
 const r=j.chart?.result?.[0];if(!r)throw Error(j.chart?.error?.description||'Histórico não localizado no Yahoo Finance.');
 const q=r.indicators.quote[0],adj=r.indicators.adjclose?.[0]?.adjclose||[];
 const includeToday=isSessionClosed(r.meta);return (r.timestamp||[]).map((ts,i)=>({date:dateSP(ts),open:q.open?.[i],high:q.high?.[i],low:q.low?.[i],close:q.close?.[i],adjClose:adj[i]??q.close?.[i],volume:q.volume?.[i]??0})).filter(x=>(x.date<today||(x.date===today&&includeToday))&&[x.open,x.high,x.low,x.close].every(Number.isFinite)).sort((a,b)=>b.date.localeCompare(a.date));
}
async function brapiHistoryFallback(ticker){
 // O endpoint gratuito sem chave tem cobertura limitada a alguns símbolos e a janela histórica depende do plano.
 const j=await getJSON(`${brapi}/quote/${encodeURIComponent(ticker)}?range=3mo&interval=1d`);const r=j.results?.[0];const h=r?.historicalDataPrice||[];
 return h.map(x=>({date:typeof x.date==='number'?dateSP(x.date):String(x.date).slice(0,10),open:x.open,high:x.high,low:x.low,close:x.close,adjClose:x.adjustedClose??x.close,volume:x.volume??0})).filter(x=>x.date<todaySP()&&[x.open,x.high,x.low,x.close].every(Number.isFinite)).sort((a,b)=>b.date.localeCompare(a.date));
}
async function history(ticker){let rows,error;try{rows=await yahooHistory(ticker)}catch(e){error=e}if(!rows?.length){try{rows=await brapiHistoryFallback(ticker)}catch(e){throw Error(`${ticker}: histórico indisponível nas fontes gratuitas. Yahoo: ${error?.message||'sem dados'}. brapi: ${e.message}`)}}if(rows.length<30)throw Error(`${ticker}: foram retornados apenas ${rows.length} pregões. O app exige pelo menos 30 para calcular os indicadores.`);return rows}

function compute(ticker,rows,ibovRows){
 // Reprodução das fórmulas do Excel: 119 cotações; indicadores I:N/O calculados para a janela da planilha.
 const base=rows.slice(0,119),ibMap=new Map((ibovRows||[]).map((r,i,arr)=>[r.date,{row:r,prev:arr[i+1]}]));
 // I:S reproduzem as fórmulas da tabela histórica do Excel. A série é descendente (D-1 para trás),
 // portanto referências à linha seguinte representam o pregão imediatamente anterior.
 const daily=rows.map((r,i)=>{const prev=rows[i+1],ib=ibMap.get(r.date),ibRet=ib?.prev?ib.row.close/ib.prev.close-1:NaN;return {...r,G:prev?r.close/prev.close-1:NaN,I:prev?r.open/prev.close-1:NaN,J:prev?r.high/prev.close-1:NaN,K:prev?1-r.low/prev.close:NaN,L:prev?r.high/prev.low-1:NaN,M:r.close/r.low-1,N:r.high/r.open-1,O:prev?r.high-prev.low:NaN,P:!!(prev&&Number.isFinite(ibRet)&&r.close/prev.close-1<0&&ibRet<0),Q:false,R:false,S:r.high-r.low}});
 daily.forEach((r,i)=>{const next=daily[i+1];r.Q=Number.isFinite(r.L)&&Number.isFinite(next?.M)&&r.L<.02&&next.M<.007;r.R=Number.isFinite(r.I)&&Number.isFinite(r.N)&&r.I<0&&r.N<.007});
 const sample=daily.slice(0,118),I=count(sample,r=>r.I<0),J=count(sample,r=>r.J<0),K=-count(sample,r=>r.K<0),L=count(sample,r=>r.L<.02),M=count(sample,r=>r.M<.007),N=count(sample,r=>r.N<.007),O=avg(sample.map(r=>r.O)),P=count(sample,r=>r.P),Q=count(sample,r=>r.Q),R=count(sample,r=>r.R),S=avg(sample.map(r=>r.S));
 const k=sample.map(r=>r.K),l=sample.map(r=>r.L),o=sample.map(r=>r.O),g=sample.map(r=>r.G);
 const k3=avg(k.slice(0,3)),k7=avg(k.slice(0,7)),k30=avg(k.slice(0,30)),kp=avg(k.filter(v=>v>0)),kg=avg(k);
 const l3=avg(l.slice(0,3)),l7=avg(l.slice(0,7)),l30=avg(l.slice(0,30)),lp=avg(l.filter(v=>v>0)),lg=avg(l);
 const globalK=avg([k3,k7,k30,kp,kg]),globalL=avg([l3,l7,l30,lp,lg]);
 const last=base[0].close,low=base[0].low,high=base[0].high,avgClose=avg(base.map(r=>r.close));
 const d138=avg(o.slice(0,3)),e139=O;
 const ideal=last>=100?5.7:last>=90?5:last>=80?4.2:last>=70?3.8:last>=60?3.5:last>=50?2.9:last>=40?2.7:last>=30?2.3:last>=20?1.5:last>=10?.9:last>=5?.5:.1;
 const e137=e139>=ideal?-2:2,e138=d138>=e139?-2:2,profitScore=e137+e138;
 const priceRisk=band(last/avgClose),ov=state.overrides[ticker]||{};
 const news=ov.news&&ov.news!=='auto'?ov.news:newsBand(ticker),trend=ov.trend&&ov.trend!=='auto'?ov.trend:marketTrend();
 const max52=Number(ov.high52)||Math.max(...rows.slice(0,252).map(r=>r.high)),min52=Number(ov.low52)||Math.min(...rows.slice(0,252).map(r=>r.low));
 const nearHigh=last>=max52-max52*.02?5:0,nearLow=last<=min52+min52*.02?-5:0;
 const method=buyRule(ticker),buy=last*(1-buyRuleValue({k3,k7,k30,kp,kg},method)),sell=low*(1+lp),positiveL=l.slice(0,57).filter(v=>v>0),pess=low+(positiveL.length?Math.min(...positiveL)*low:0),neutral=low+d138,opt=sell;
 const score=I+J+K+L+M+N+profitScore+riskPts(priceRisk)+(news==='Alto'?5:news==='Baixo'?-5:0)+riskPts(trend)+nearHigh+nearLow;
 const betaResult=calcBeta(rows,ibovRows),beta=betaResult.value;
 const metrics={last,I,J,K,L,M,N,O,P,Q,R,S,k3,k7,k30,kp,kg,l3,l7,l30,lp,lg,globalK,globalL,d138,e139,ideal,e137,e138,profitScore,priceRisk,news,trend,max52,min52,nearHigh,nearLow,score,buy,sell,buyMethod:method,buyBase:buyRuleValue({k3,k7,k30,kp,kg},method),pess,neutral,opt,qty:qty(last),lpa3:d138,avgClose,weekly:sum(g.slice(0,5)),dailyVariation:sum(g.slice(0,119)),amp3:avg(sample.slice(0,30).map(r=>r.S)),ampWeekly:avg(sample.slice(0,33).map(r=>r.S)),ampGeneral:S,max30:Math.max(...g.slice(0,30).filter(Number.isFinite)),min30:Math.min(...g.slice(0,30).filter(Number.isFinite)),maxRange30:Math.max(...l.slice(0,30).filter(Number.isFinite)),probOpen:I/sample.length,probHighBelowOpen:R/(I||1),probHighBelowLowPrev:count(sample,r=>r.L<0)/sample.length,probHighBelowPrev:J/sample.length,probFollowIBOV:P/(count((ibovRows||[]).slice(0,118),r=>r.G<0)||1),probCloseLow:count(sample,r=>Math.abs(r.M)<1e-10)/sample.length,probNextLow:Q/(M||1),beta,betaObservations:betaResult.observations,betaPeriodDays:betaResult.periodDays};
 return {ticker,rows,calc:daily,metrics,updated:new Date().toISOString(),source:rows.length>=500?'Yahoo Finance (3 anos ou mais)':'Fonte alternativa gratuita (histórico limitado)'};
}
function calcBeta(rows,ibovRows){if(!ibovRows?.length)return {value:NaN,observations:0,periodDays:0};const map=new Map(ibovRows.map((r,i)=>[r.date,{r,prev:ibovRows[i+1]}]));const pairs=[];for(let i=0;i<rows.length-1;i++){const a=rows[i],b=rows[i+1],ib=map.get(a.date);if(!ib?.prev)continue;const x=a.adjClose&&b.adjClose?a.adjClose/b.adjClose-1:a.close/b.close-1,y=ib.r.close/ib.prev.close-1;if(Number.isFinite(x)&&Number.isFinite(y))pairs.push([x,y])}if(pairs.length<30)return {value:NaN,observations:pairs.length,periodDays:pairs.length};const mx=avg(pairs.map(p=>p[0])),my=avg(pairs.map(p=>p[1])),cov=avg(pairs.map(p=>(p[0]-mx)*(p[1]-my))),v=avg(pairs.map(p=>(p[1]-my)**2));return {value:v?cov/v:NaN,observations:pairs.length,periodDays:pairs.length}}
function newsBand(t){const headlines=state.news.filter(n=>!t||n.title.toUpperCase().includes(t));const text=headlines.map(n=>n.title).join(' ').toLowerCase();if(!text)return 'Neutro';const pos=['lucro','alta','cresce','recorde','positivo','aprova','ganho','expansão','compra','supera','otimismo','dividendo','recompra'];const neg=['prejuízo','queda','baixa','perda','risco','investigação','multa','dívida','rebaix','crise','negativo','fraude','recuperação judicial','despenca'];const s=pos.reduce((a,w)=>a+(text.split(w).length-1),0)-neg.reduce((a,w)=>a+(text.split(w).length-1),0);return s>0?'Alto':s<0?'Baixo':'Neutro'}
function marketTrend(){if(!state.ibov?.metrics)return 'Neutro';const m=state.ibov.metrics;const s=(m.weekly>0?1:-1)+(m.priceRisk==='Muito Baixo'||m.priceRisk==='Baixo'?1:m.priceRisk==='Muito Alto'||m.priceRisk==='Alto'?-1:0)+(newsBand('')==='Alto'?1:newsBand('')==='Baixo'?-1:0);return s>=2?'Alto':s===1?'Neutro':s===-1?'Baixo':s<=-2?'Muito Baixo':'Neutro'}
async function loadTicker(t,force=false){t=t.toUpperCase().trim();if(!/^[A-Z]{4}[0-9]{1,2}$/.test(t))throw Error('Selecione um ticker de ação ou Unit válido.');if(!force&&state.data[t]&&Date.now()-new Date(state.data[t].updated).getTime()<3600000)return state.data[t];const rows=await history(t);const a=compute(t,rows,state.ibov?.rows||[]);state.data[t]=a;save();return a}
async function loadIbov(){const rows=await yahooHistoryIndex();state.ibov=compute('IBOV',rows,rows);save();return state.ibov}
async function yahooHistoryIndex(){const d=new Date();d.setFullYear(d.getFullYear()-3);const today=todaySP(),start=epoch(new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo'}).format(d)),end=epoch(addDays(today,1));const j=await getJSON(`${yahoo}/v8/finance/chart/%5EBVSP?period1=${start}&period2=${end}&interval=1d`);const r=j.chart?.result?.[0];if(!r)throw Error('IBOV indisponível');const q=r.indicators.quote[0];const includeToday=isSessionClosed(r.meta);return r.timestamp.map((ts,i)=>({date:dateSP(ts),open:q.open[i],high:q.high[i],low:q.low[i],close:q.close[i],volume:q.volume[i]??0})).filter(x=>(x.date<today||(x.date===today&&includeToday))&&[x.open,x.high,x.low,x.close].every(Number.isFinite)).sort((a,b)=>b.date.localeCompare(a.date))}
async function loadNews(){try{const u='https://news.google.com/rss/search?q='+encodeURIComponent('B3 ações bolsa brasileira Ibovespa')+'&hl=pt-BR&gl=BR&ceid=BR:pt-419';const r=await fetch(proxy+u,{credentials:'omit',cache:'no-store'});if(!r.ok)throw Error();const xml=new DOMParser().parseFromString(await r.text(),'text/xml');state.news=[...xml.querySelectorAll('item')].slice(0,25).map(x=>({title:x.querySelector('title')?.textContent||'',link:x.querySelector('link')?.textContent||'',date:x.querySelector('pubDate')?.textContent||'',source:x.querySelector('source')?.textContent||'Google News'}));save();renderNews()}catch(e){setStatus('newsFeed','Não foi possível atualizar notícias automaticamente. Classificação neutra até nova consulta.') }}


function renderRanking(){
 const entries=state.tickers.map(t=>state.data[t]).filter(Boolean).sort((a,b)=>b.metrics.score-a.metrics.score);
 const root=$('rankingCards');
 if(root){
  root.innerHTML=entries.map(a=>{
   const t=a.ticker,m=a.metrics,close=a.rows[0].close,p=state.tradePlan?.[t]||{side:'review',qty:m.qty},q=Number(p.qty??m.qty)||0;
   const side=p.side||'review',sideLabel=side==='buy'?'COMPRA':side==='sell'?'VENDA':'ACOMPANHAR',sideClass=side==='buy'?'summary-buy':side==='sell'?'summary-sell':'summary-watch';
   const potential=side==='buy'?q*(m.sell-m.buy):side==='sell'?q*(m.sell-close):NaN;
   const target=side==='buy'?m.buy:side==='sell'?m.sell:NaN;
   return `<article class="asset-summary-card ${sideClass}">
    <div class="summary-card-head"><div><strong class="summary-ticker">${safeText(t)}</strong><span class="summary-date">Fechamento ${safeText(a.rows[0].date)}</span></div><span class="operation-pill">${sideLabel}</span></div>
    <div class="summary-kpis"><div><span>Fechamento</span><b>${money(close)}</b></div><div><span>Pontuação</span><b>${fmt(m.score,0)}</b></div><div><span>LPA · 3 dias</span><b>${money(m.lpa3)}</b></div><div><span>Quantidade</span><b>${fmt(q,0)}</b></div></div>
    <div class="summary-prices"><div class="price-box buy-box"><span>Compra provável</span><b>${money(m.buy)}</b><small>${pct(m.buy/close-1)}</small></div><div class="price-box sell-box"><span>Venda provável</span><b>${money(m.sell)}</b><small>${pct(m.sell/close-1)}</small></div></div>
    <div class="summary-bottom"><span>${side==='buy'?'Investimento ao preço de compra':side==='sell'?'Valor estimado da venda':'Preço de referência da operação'}</span><b>${side==='buy'?money(q*m.buy):side==='sell'?money(q*m.sell):'—'}</b></div>
    <div class="summary-bottom"><span>${side==='buy'?'Resultado potencial compra → venda':side==='sell'?'Resultado vs. fechamento atual':'Beta · IBOV'}</span><b class="${Number.isFinite(potential)?(potential>=0?'good':'danger'):''}">${Number.isFinite(potential)?money(potential):fmt(m.beta,3)}</b></div>
   </article>`;
  }).join('')||'<div class="summary-empty">Nenhum ativo carregado. Pesquise e adicione ações para montar seu resumo.</div>';
 }
 $('watchlist').innerHTML=state.tickers.map(t=>`<span class="watch-chip"><b>${safeText(t)}</b><button type="button" aria-label="Remover ${safeText(t)}" data-remove-watch="${safeText(t)}">×</button></span>`).join('')||'<span class="muted small">Nenhum ativo selecionado. Pesquise acima e toque em Adicionar.</span>';
 document.querySelectorAll('[data-remove-watch]').forEach(b=>b.onclick=()=>removeTicker(b.dataset.removeWatch));
 renderPlan();renderCompareSelectors();
}

function renderPlan(){
 const tbody=$('planTable')?.querySelector('tbody');if(!tbody)return;
 const entries=state.tickers.map(t=>state.data[t]).filter(Boolean).sort((a,b)=>a.ticker.localeCompare(b.ticker));
 if(!entries.length){tbody.innerHTML='<tr><td colspan="9" class="muted">Carregue ações para montar o plano do próximo pregão.</td></tr>';return}
 state.tradePlan=state.tradePlan||{};
 tbody.innerHTML=entries.map(a=>{
  const t=a.ticker,m=a.metrics,close=a.rows[0].close,p=state.tradePlan[t]||{side:'review',qty:m.qty};
  const target=p.side==='sell'?m.sell:m.buy,ret=target/close-1,profit=(Number(p.qty)||0)*(target-close);
  return `<tr><td><b>${safeText(t)}</b><div class="tiny muted">${safeText(a.rows[0].date)}</div></td><td><select class="input plan-select" data-side="${safeText(t)}"><option value="review" ${p.side==='review'?'selected':''}>Acompanhar</option><option value="buy" ${p.side==='buy'?'selected':''}>Comprar</option><option value="sell" ${p.side==='sell'?'selected':''}>Vender</option></select></td><td><input class="input plan-qty" type="number" min="0" step="1" inputmode="numeric" data-planqty="${safeText(t)}" value="${Number(p.qty)||0}"></td><td>${money(close)}</td><td>${money(m.buy)}</td><td class="${m.buy<close?'good':'danger'}">${pct(m.buy/close-1)}</td><td>${money(m.sell)}</td><td class="${m.sell>close?'good':'danger'}">${pct(m.sell/close-1)}</td><td>${p.side==='review'?'—':money(profit)} <span class="tiny muted">(${pct(ret)})</span></td></tr>`
 }).join('');
 document.querySelectorAll('[data-side]').forEach(el=>el.onchange=()=>{const t=el.dataset.side;state.tradePlan[t]={...(state.tradePlan[t]||{}),side:el.value,qty:state.tradePlan[t]?.qty??state.data[t].metrics.qty};save();renderRanking()});
 document.querySelectorAll('[data-planqty]').forEach(el=>el.onchange=()=>{const t=el.dataset.planqty;state.tradePlan[t]={...(state.tradePlan[t]||{}),qty:Math.max(0,Math.floor(Number(el.value)||0))};save();renderRanking()});
}


function renderSimulation(a){const qEl=$('simQty'),pEl=$('simPrice'),out=$('simResults');if(!qEl||!pEl||!out)return;const t=a.ticker,sim=state.simulations?.[t]||{},plan=state.tradePlan?.[t]||{};qEl.value=plan.qty??sim.qty??a.metrics.qty;pEl.value=sim.price??a.metrics.sell;const draw=()=>{const q=Math.max(0,Math.floor(Number(qEl.value)||0)),p=Number(pEl.value),buy=a.rows[0].close,invest=q*buy,proceeds=q*p,profit=proceeds-invest,ret=buy>0?p/buy-1:NaN;state.simulations=state.simulations||{};state.simulations[t]={...(state.simulations[t]||{}),price:p};state.tradePlan=state.tradePlan||{};state.tradePlan[t]={...(state.tradePlan[t]||{}),qty:q};save();out.innerHTML=[['Investimento estimado',money(invest)],['Valor na venda',money(proceeds)],['Resultado bruto',`<span class="${profit>=0?'good':'danger'}">${money(profit)}</span>`],['Retorno',`<span class="${profit>=0?'good':'danger'}">${pct(ret)}</span>`]].map(([l,v])=>`<div class="metric"><label>${l}</label><strong>${v}</strong></div>`).join('')};qEl.oninput=draw;pEl.oninput=draw;draw()}
function openAsset(t){const a=state.data[t];if(!a)return;state.active=t;save();$('assetInput').value=t;$('assetContent').classList.remove('hide');$('assetStatus').textContent=`${a.rows.length} pregões · ${a.source} · atualizado ${new Date(a.updated).toLocaleString('pt-BR')}`;$('assetTicker').textContent=t;$('assetDate').textContent='Último fechamento confirmado: '+a.rows[0].date+' · '+(a.rows[0].date===todaySP()?'D-0':'último pregão concluído')+' · '+a.rows.length+' observações';$('assetScore').textContent=a.metrics.score+' pontos';const m=a.metrics;$('assetMetrics').innerHTML=[['Último fechamento',money(a.rows[0].close)],['Pontuação geral',m.score+' pts'],['Preço de compra',money(m.buy)],['Preço de venda',money(m.sell)],['Lucro médio / ação (3d)',money(m.lpa3)],['Quantidade sugerida',m.qty.toLocaleString('pt-BR')],['Variação semanal',pct(m.weekly)],['Risco pelo preço',m.priceRisk]].map(([l,v])=>`<div class="metric"><label>${l}</label><strong>${v}</strong></div>`).join('');drawChart(a);$('chartStart').textContent=a.rows.at(-1).date;$('chartEnd').textContent=a.rows[0].date;$('historyTable').querySelector('tbody').innerHTML=a.calc.map(r=>{const cells=[['I',r.I,pct(r.I),r.I<0],['J',r.J,pct(r.J),r.J<0],['K',r.K,pct(r.K),r.K<0],['L',r.L,pct(r.L),r.L<.02],['M',r.M,pct(r.M),r.M<.007],['N',r.N,pct(r.N),r.N<.007],['O',r.O,money(r.O),false],['P',r.P,r.P?'Sim':'',false],['Q',r.Q,r.Q?'Sim':'',false],['R',r.R,r.R?'Sim':'',false],['S',r.S,money(r.S),false]];return `<tr><td>${r.date}</td><td>${money(r.close)}</td><td>${money(r.open)}</td><td>${money(r.high)}</td><td>${money(r.low)}</td><td>${Number(r.volume).toLocaleString('pt-BR')}</td><td>${pct(r.G)}</td>${cells.map(([col,val,text,flag])=>`<td class="${flag?(col==='K'?'cf-green':'cf-red'):(['P','Q','R'].includes(col)&&val?'signal':'')}">${text||'—'}</td>`).join('')}</tr>`}).join('');$('projections').innerHTML=[['Pessimista',m.pess],['Neutro',m.neutral],['Otimista',m.opt],['Compra estimada',m.buy],['Venda estimada',m.sell],['Amplitude média (3d)',m.d138]].map(([l,v])=>`<div class="metric"><label>${l}</label><strong>${money(v)}</strong><span class="small">${pct(v/a.rows[0].close-1)}</span></div>`).join('');renderSimulation(a);const ruleSelect=$('buyRuleSelect');if(ruleSelect){ruleSelect.value=m.buyMethod;ruleSelect.onchange=()=>{state.projectionRules=state.projectionRules||{};state.projectionRules[t]=ruleSelect.value;const updated=compute(t,a.rows,state.ibov?.rows||[]);state.data[t]=updated;save();renderRanking();openAsset(t)}}const rows=[['I · Abertura x último anterior',m.I],['J · Máxima x último anterior',m.J],['K · Mínima x último anterior',m.K],['L · Máxima x mínima anterior',m.L],['M · Último x mínima do dia',m.M],['N · Máxima x abertura',m.N],['O · Amplitude média',m.O],['P · Queda acompanhando IBOV',m.P],['Q · Máxima abaixo no dia seguinte',m.Q],['R · Abertura e máxima',m.R],['Média K (3/7/30/positivos/geral)',[m.k3,m.k7,m.k30,m.kp,m.kg].map(pct).join(' / ')],['Média L (3/7/30/positivos/geral)',[m.l3,m.l7,m.l30,m.lp,m.lg].map(pct).join(' / ')],['Média global K (base da projeção de compra)',pct(m.globalK)],['Média global L (base da projeção de venda)',pct(m.globalL)],['Amplitude diária (3d / semanal / geral)',[m.amp3,m.ampWeekly,m.ampGeneral].map(money).join(' / ')],['Prob. abertura < fechamento anterior',pct(m.probOpen)],['Prob. máxima abaixo no dia seguinte',pct(m.probNextLow)],['Notícias',m.news],['Tendência IBOV',m.trend],[`Beta estimado (${m.betaObservations||0} pregões coincidentes)`,fmt(m.beta,3)],['Máxima 52 semanas',money(m.max52)],['Mínima 52 semanas',money(m.min52)]];$('indicators').innerHTML=rows.map(([l,v])=>`<tr><td>${l}</td><td>${typeof v==='number'&&Math.abs(v)<=1?pct(v):v}</td></tr>`).join('');const ov=state.overrides[t]||{};$('newsOverride').value=ov.news||'auto';$('trendOverride').value=ov.trend||'auto';$('high52').value=ov.high52??'';$('low52').value=ov.low52??'';switchTab('ativo')}
function drawChart(a){const values=a.rows.slice().reverse().map(r=>r.close),min=Math.min(...values),max=Math.max(...values),w=700,h=160,p=8;const pts=values.map((v,i)=>[p+i/(values.length-1)*(w-2*p),h-p-(v-min)/(max-min||1)*(h-2*p)]);const d=pts.map((q,i)=>(i?'L':'M')+q[0].toFixed(1)+' '+q[1].toFixed(1)).join(' ');$('chartLine').setAttribute('d',d);$('chartArea').setAttribute('d',d+` L ${w-p} ${h-p} L ${p} ${h-p} Z`)}
function renderCompareSelectors(){
 const loaded=state.tickers.filter(t=>state.data[t]);
 // Até seis ações são selecionáveis; IBOV é acrescentado automaticamente como benchmark.
 state.compare=(Array.isArray(state.compare)?state.compare:[]).filter(t=>t!=='IBOV'&&loaded.includes(t)).slice(0,6);
 $('compareSelectors').innerHTML=Array.from({length:6},(_,i)=>`<select class="input" data-compare="${i}" aria-label="Ativo ${i+1}"><option value="">${i<2?'Selecionar ativo '+(i+1):'Adicionar ativo '+(i+1)}</option>${loaded.map(t=>`<option ${state.compare[i]===t?'selected':''} value="${safeText(t)}">${safeText(t)}</option>`).join('')}</select>`).join('');
 document.querySelectorAll('[data-compare]').forEach(s=>s.onchange=()=>{
  const i=Number(s.dataset.compare),v=s.value;
  if(v&&state.compare.some((x,j)=>x===v&&j!==i)){s.value=state.compare[i]||'';return}
  if(v)state.compare[i]=v;else state.compare[i]='';
  state.compare=state.compare.filter(Boolean).slice(0,6);save();renderCompareSelectors();
 });
 renderCompare();
}
function compareColor(value,values,goodHigh=true){
 const nums=values.filter(Number.isFinite);if(!Number.isFinite(value)||nums.length<2)return '';
 const min=Math.min(...nums),max=Math.max(...nums);if(max===min)return 'background:#fff0b3;color:#202938';
 let t=(value-min)/(max-min);if(!goodHigh)t=1-t;
 const stops=[[248,105,107],[255,235,132],[99,190,123]];if(!goodHigh)stops.reverse();
 const seg=t<=.5?0:1,local=t<=.5?t*2:(t-.5)*2,a=stops[seg],b=stops[seg+1];
 const c=a.map((v,i)=>Math.round(v+(b[i]-v)*local));return `background:rgb(${c.join(',')});color:#202938`;
}
function renderCompare(){
 const stocks=state.compare.filter(t=>state.tickers.includes(t)&&state.data[t]).slice(0,6);const list=[...stocks,...(state.ibov?.metrics?['IBOV']:[])];
 if(!list.length){$('compareTable').innerHTML='<tbody><tr><td class="muted">Carregue ativos para comparar.</td></tr></tbody>';return}
 const get=t=>t==='IBOV'?state.ibov:state.data[t],m=t=>get(t).metrics;
 const defs=[
  ['Pontuação geral',x=>x.score,'number',false],['LPA (3 dias)',x=>x.lpa3,'money',null],['Quantidade',x=>null,'qty',null],
  ['Compra · Preço',x=>x.buy,'money',null],['Compra · %',x=>x.buyPct??(x.buy/x.last-1),'pct',null],
  ['Venda · Preço',x=>x.sell,'money',null],['Venda · %',x=>x.sellPct??(x.sell/x.last-1),'pct',null],
  ['Aber < Últ',x=>x.probOpen,'pct',false],['Máx < Aber',x=>x.probHighBelowOpen,'pct',false],
  ['Máx < Mín (últ)',x=>x.probHighBelowLowPrev,'pct',false],['Máx < Últ',x=>x.probHighBelowPrev,'pct',false],
  ['Queda = IBOV',x=>x.probFollowIBOV,'pct',false],['Beta · período completo',x=>x.beta,'number',null],
  ['Últ = Mín',x=>x.probCloseLow,'pct',true],['Máx < Mín (próx dia)',x=>x.probNextLow,'pct',false],
  ['Var. geral (intradia)',x=>x.dailyVariation,'pct',false],['Variação semanal',x=>x.weekly,'pct',false],
  ['Preço · classificação',x=>x.priceRisk,'text',null],['Tendência de mercado',x=>x.trend,'text',null]
 ];
 const fmtValue=(v,type)=>type==='money'?money(v):type==='pct'?pct(v):type==='number'?fmt(v,2):safeText(v??'—');
 const header=`<thead><tr><th>Informação · aba Geral</th>${list.map(t=>`<th>${safeText(t==='IBOV'?'IBOV · Benchmark':t)}</th>`).join('')}<th>Média</th></tr></thead>`;
 let body='';
 for(const [label,fn,type,goodHigh] of defs){
  if(type==='qty'){
   body+=`<tr><th>${label}</th>${list.map(t=>{const def=m(t).qty||0;state.tradePlan=state.tradePlan||{};const q=state.tradePlan[t]?.qty??def;return `<td>${t==='IBOV'?'—':`<input class="compare-qty" type="number" min="0" step="1" data-qty="${safeText(t)}" value="${q}">`}</td>`}).join('')}<td>—</td></tr>`;continue;
  }
  const vals=list.map(t=>fn(m(t))),numeric=vals.map(v=>typeof v==='number'&&Number.isFinite(v)?v:NaN),stockNumeric=stocks.map(t=>{const v=fn(m(t));return typeof v==='number'&&Number.isFinite(v)?v:NaN}),mean=avg(stockNumeric);
  const cells=vals.map((v,i)=>{let style='';if(list[i]!=='IBOV'&&type==='text'&&typeof v==='string')style=/Muito Alto|Alto/.test(v)?'background:#f8d7da;color:#842029':/Muito Baixo|Baixo/.test(v)?'background:#d1e7dd;color:#0f5132':'background:#fff0b3;color:#202938';else if(list[i]!=='IBOV'&&type!=='text'&&goodHigh!==null)style=compareColor(numeric[i],stockNumeric,goodHigh);return `<td style="${style}">${fmtValue(v,type)}</td>`}).join('');
  body+=`<tr><th>${label}</th>${cells}<td><b>${Number.isFinite(mean)?fmtValue(mean,type):'—'}</b></td></tr>`;
 }
 const qtyList=list.map(t=>t==='IBOV'?0:(state.tradePlan?.[t]?.qty??m(t).qty));
 const totalProfit=list.map((t,i)=>t==='IBOV'?NaN:(qtyList[i]/100)*m(t).lpa3);
 body+=`<tr><th>Lucro médio p/ total de ações compradas</th>${list.map((t,i)=>`<td style="${compareColor(totalProfit[i],totalProfit,true)}">${Number.isFinite(totalProfit[i])?money(totalProfit[i]):'—'}</td>`).join('')}<td>${money(avg(totalProfit))}</td></tr>`;
 body+=`<tr class="section-row"><th colspan="${list.length+2}">Simulação de retorno · quantidade selecionada por ativo</th></tr>`;
 body+=`<tr><th>Investimento ao último fechamento</th>${list.map((t,i)=>`<td>${t==='IBOV'?'—':money(qtyList[i]*get(t).rows[0].close)}</td>`).join('')}<td>—</td></tr>`;
 body+=`<tr><th>Retorno bruto ao preço projetado de venda</th>${list.map((t,i)=>{if(t==='IBOV')return '<td>—</td>';const a=get(t),v=qtyList[i]*(a.metrics.sell-a.rows[0].close);return `<td style="${compareColor(v,list.map((x,j)=>x==='IBOV'?NaN:qtyList[j]*(get(x).metrics.sell-get(x).rows[0].close)),true)}">${money(v)}</td>`}).join('')}<td>—</td></tr>`;
 body+=`<tr class="section-row"><th colspan="${list.length+2}">Fechamento · resumo inferior da aba Geral</th></tr>`;
 body+=`<tr><th>Último fechamento</th>${list.map(t=>`<td>${money(get(t).rows[0].close)}</td>`).join('')}<td>—</td></tr>`;
 body+=`<tr><th>Variação do último pregão</th>${list.map(t=>`<td>${pct(get(t).rows[0].close/get(t).rows[1]?.close-1)}</td>`).join('')}<td>—</td></tr>`;
 const extra30=[['Maior variação (30 dias)',x=>x.max30,true],['Menor variação (30 dias)',x=>x.min30,true],['Maior máxima x mínima (30 dias)',x=>x.maxRange30,true]];
 for(const [label,fn,good] of extra30){const vv=list.map(t=>fn(m(t)));body+=`<tr><th>${label}</th>${vv.map(v=>`<td style="${compareColor(v,vv,good)}">${pct(v)}</td>`).join('')}<td>${pct(avg(vv))}</td></tr>`}
 $('compareTable').innerHTML=header+'<tbody>'+body+'</tbody>';
 document.querySelectorAll('[data-qty]').forEach(el=>el.onchange=()=>{const t=el.dataset.qty;state.tradePlan=state.tradePlan||{};state.tradePlan[t]={...(state.tradePlan[t]||{}),qty:Math.max(0,Math.floor(Number(el.value)||0))};save();renderCompare();renderPlan();renderRanking()});
}
function renderNews(){if(!$('newsFeed'))return;if(!state.news.length){$('newsFeed').textContent='Nenhuma manchete disponível.';return}$('newsFeed').innerHTML=state.news.map(n=>`<div class="news"><a href="${safeText(n.link)}" target="_blank" rel="noopener">${safeText(n.title)}</a><div class="small muted">${safeText(n.source)} · ${safeText(n.date)}</div></div>`).join('')}
function renderIbov(){if(!state.ibov)return;const m=state.ibov.metrics,r=state.ibov.rows[0];$('ibovMetrics').innerHTML=[['IBOV último',fmt(r.close,0)],['Variação semanal',pct(m.weekly)],['Risco pelo preço',m.priceRisk],['Tendência',marketTrend()]].map(([l,v])=>`<div class="metric"><label>${l}</label><strong>${v}</strong></div>`).join('');$('ibovStatus').textContent='Último pregão: '+r.date+' · histórico '+state.ibov.rows.length+' pregões'}

function summaryExportRows(){return state.tickers.map(t=>state.data[t]).filter(Boolean).map(a=>{const p=state.tradePlan?.[a.ticker]||{side:'review',qty:a.metrics.qty},q=Number(p.qty??a.metrics.qty)||0,m=a.metrics,close=a.rows[0].close,side=p.side||'review';return {ticker:a.ticker,side,qty:q,close,buy:m.buy,buyPct:m.buy/close-1,sell:m.sell,sellPct:m.sell/close-1,score:m.score,lpa:m.lpa3,beta:m.beta,profit:side==='buy'?q*(m.sell-m.buy):side==='sell'?q*(m.sell-close):NaN,investment:side==='buy'?q*m.buy:side==='sell'?q*close:NaN,date:a.rows[0].date}})}
async function exportSummaryJPEG(){
 const rows=summaryExportRows();if(!rows.length){alert('Carregue pelo menos um ativo antes de exportar.');return}
 const W=1200,pad=48,gap=24,cols=rows.length===1?1:2,cardW=(W-pad*2-gap*(cols-1))/cols,cardH=390,headH=150,footH=72,totalH=pad+headH+Math.ceil(rows.length/cols)*(cardH+gap)+footH;
 const canvas=document.createElement('canvas');canvas.width=W;canvas.height=totalH;const ctx=canvas.getContext('2d');if(!ctx){alert('Seu navegador não conseguiu preparar a imagem JPEG.');return}
 ctx.fillStyle='#0b1220';ctx.fillRect(0,0,W,totalH);
 const rr=(x,y,w,h,r,fill,stroke)=>{ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.stroke()}};
 ctx.fillStyle='#eef4fb';ctx.font='bold 42px system-ui';ctx.fillText('Swing Trade · Resumo operacional',pad,pad+42);
 ctx.fillStyle='#9aabc0';ctx.font='22px system-ui';ctx.fillText('Plano para o próximo pregão · '+new Date().toLocaleDateString('pt-BR'),pad,pad+82);
 ctx.fillStyle='#9aabc0';ctx.font='18px system-ui';ctx.fillText('Preços projetados com base no último fechamento disponível. Valores brutos, sem custos e impostos.',pad,pad+118);
 rows.forEach((r,i)=>{const x=pad+(i%cols)*(cardW+gap),y=pad+headH+Math.floor(i/cols)*(cardH+gap),buy=r.side==='buy',sell=r.side==='sell',accent=buy?'#36c98f':sell?'#ff6b75':'#69a9ff',label=buy?'COMPRA':sell?'VENDA':'ACOMPANHAR';rr(x,y,cardW,cardH,22,'#121d2e','#26364d');rr(x+18,y+18,cardW-36,64,14,buy?'#123b32':sell?'#49252e':'#1b2b40');ctx.fillStyle='#eef4fb';ctx.font='bold 30px system-ui';ctx.fillText(r.ticker,x+38,y+60);ctx.textAlign='right';ctx.fillStyle=accent;ctx.font='bold 22px system-ui';ctx.fillText(label,x+cardW-38,y+58);ctx.textAlign='left';
  const items=[['Fechamento',money(r.close)],['Quantidade',fmt(r.qty,0)],['Pontuação',fmt(r.score,0)],['LPA · 3 dias',money(r.lpa)],['Compra provável',money(r.buy)+'  ('+pct(r.buyPct)+')'],['Venda provável',money(r.sell)+'  ('+pct(r.sellPct)+')'],[buy?'Investimento estimado':sell?'Valor de referência':'Beta · IBOV',buy||sell?money(r.investment):fmt(r.beta,3)],[buy?'Resultado compra → venda':sell?'Resultado vs. fechamento':'Data-base',Number.isFinite(r.profit)?money(r.profit):r.date]];
  items.forEach((it,j)=>{const yy=y+122+j*31;ctx.fillStyle='#9aabc0';ctx.font='18px system-ui';ctx.fillText(it[0],x+28,yy);ctx.fillStyle='#eef4fb';ctx.font='bold 19px system-ui';ctx.textAlign='right';ctx.fillText(it[1],x+cardW-28,yy);ctx.textAlign='left'});
  rr(x+20,y+cardH-48,cardW-40,8,4,accent);
 });
 ctx.fillStyle='#9aabc0';ctx.font='18px system-ui';ctx.fillText('Uso pessoal · Não constitui recomendação financeira · Confira as cotações na corretora.',pad,totalH-30);
 try{const dataUrl=canvas.toDataURL('image/jpeg',.94);if(!dataUrl.startsWith('data:image/jpeg'))throw Error('O navegador não conseguiu codificar a imagem em JPEG.');const a=document.createElement('a');a.href=dataUrl;a.download='swing-trade-resumo-'+todaySP()+'.jpg';a.style.display='none';document.body.appendChild(a);a.click();a.remove();const status=$('exportStatus');if(status)status.textContent='JPEG gerado. Se o download não iniciar automaticamente, toque e segure a imagem que será aberta para salvá-la.';}catch(e){console.error(e);alert('Não foi possível gerar o JPEG: '+e.message)}
}

function switchTab(tab){document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));['geral','ativo','comparativo','regras'].forEach(x=>$('view-'+x).classList.toggle('hide',x!==tab));if(tab==='comparativo')renderCompareSelectors()}
document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>switchTab(b.dataset.tab));
function removeTicker(t){
 state.tickers=state.tickers.filter(x=>x!==t);
 state.compare=(state.compare||[]).filter(x=>x!==t);
 if(state.active===t)state.active=null;
 save();renderRanking();renderCompareSelectors();
 if(state.tickers.length===0)setStatus('generalStatus','Nenhum ativo selecionado. Pesquise e adicione ações para começar.');
}
async function add(t){t=t.toUpperCase().trim();if(!t)return;try{setStatus('generalStatus',`Consultando histórico de ${t}…`);const a=await loadTicker(t,true);if(!state.tickers.includes(t))state.tickers.push(t);if(!state.compare.includes(t)&&state.compare.length<6)state.compare.push(t);save();renderRanking();openAsset(t);setStatus('generalStatus',`${t} carregado: ${a.rows.length} pregões. Fonte: ${a.source}.`)}catch(e){setStatus('generalStatus',e.message)}}
$('addTicker').onclick=()=>add($('tickerInput').value);$('tickerInput').onkeydown=e=>{if(e.key==='Enter')add(e.target.value)};$('loadAsset').onclick=()=>add($('assetInput').value);$('refreshAsset').onclick=async()=>{if(state.active)try{const a=await loadTicker(state.active,true);renderRanking();openAsset(a.ticker)}catch(e){setStatus('assetStatus',e.message)}};
$('refreshAll').onclick=async()=>{setStatus('generalStatus','Atualizando cadastro, IBOV e ativos…');try{await loadUniverse(true)}catch(e){setStatus('generalStatus','Cadastro indisponível: '+e.message)}try{await loadIbov()}catch(e){setStatus('ibovStatus',e.message)}for(const t of state.tickers){try{await loadTicker(t,true)}catch(e){console.warn(t,e)}}renderRanking();setStatus('generalStatus','Atualização concluída. Os ativos são selecionáveis pelo cadastro pesquisável da B3.')};
$('refreshNews')?.addEventListener('click',loadNews);
$('exportJPEG')?.addEventListener('click',exportSummaryJPEG);
$('exportBackup')?.addEventListener('click',()=>{const blob=new Blob([JSON.stringify({format:'swingtrade-backup-v1',exportedAt:new Date().toISOString(),state},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='swing-trade-backup-'+todaySP()+'.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000)});
$('importBackupFile')?.addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;try{const obj=JSON.parse(await file.text()),incoming=obj.state||obj;if(!incoming||!Array.isArray(incoming.tickers)||!incoming.data)throw Error('Arquivo de backup inválido.');state={...state,...incoming};await persistState();renderRanking();if(state.active&&state.data[state.active])openAsset(state.active);alert('Backup restaurado com sucesso.')}catch(err){alert('Não foi possível restaurar: '+err.message)}finally{e.target.value=''}});
$('saveOverrides').onclick=()=>{const t=state.active;if(!t)return;state.overrides[t]={news:$('newsOverride').value,trend:$('trendOverride').value,high52:Number($('high52').value)||null,low52:Number($('low52').value)||null};const a=state.data[t];state.data[t]=compute(t,a.rows,state.ibov?.rows||[]);save();renderRanking();openAsset(t)};
setupSearch('tickerInput','tickerResults');setupSearch('assetInput','assetResults');
renderRanking();renderNews();
if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js?v=20261120-9',{updateViaCache:'none'}).then(r=>r.update()).catch(()=>{});
(async()=>{await restoreStateDB();renderRanking();try{await loadUniverse();setStatus('generalStatus',`Cadastro B3 carregado: ${state.assets.length} ações e Units disponíveis. Pesquise por ticker ou empresa.`)}catch(e){setStatus('generalStatus','Não foi possível carregar o cadastro B3. Toque em Atualizar para tentar novamente. '+e.message)}try{if(!state.ibov)await loadIbov();renderIbov()}catch(e){setStatus('ibovStatus','IBOV ainda não carregado: '+e.message)}await loadNews();for(const t of state.tickers){try{if(state.data[t]?.rows?.length){state.data[t]=compute(t,state.data[t].rows,state.ibov?.rows||[]);save()}else await loadTicker(t)}catch(e){console.warn(t,e)}}renderRanking();if(state.active&&state.data[state.active])openAsset(state.active);$('syncState').textContent='Cadastro B3 + histórico híbrido';})();
