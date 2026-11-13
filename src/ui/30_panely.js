// Panely: hlavička, Co řešit, kronika, výběr na mapě s akcemi, volby nástroje, potvrzení bourání.

function phaseName(h){if(h>=5.5&&h<9)return"ranní špička";if(h>=9&&h<12)return"dopoledne";if(h>=12&&h<15)return"poledne";if(h>=15&&h<18.5)return"odpolední špička";if(h>=18.5&&h<22)return"večer";return"noc"}
let lastProbKey="",lastLogLen=-1,lastLogTop=null,lastOptsKey="";
function updateUI(){
  $("sMoney").textContent=fmt(S.money)+" Kč";const inc=$("sIncome");inc.textContent=(S.income>=0?"+":"")+fmt(S.income)+" Kč/min";inc.className=S.income<0?"neg":"";
  let pop=0;for(const t of S.towns)pop+=t.pop;$("sPop").textContent=fmt(pop);
  $("sMove").textContent=fmt(S.cars.length)+" aut · "+fmt(S.walkers.length)+" pěšky";
  const h=hourOf(S);$("sDayL").textContent="Den "+dayOf(S);$("sClock").textContent=hhmm(h);$("sPhase").textContent=phaseName(h);
  const P=S.problems;const serious=P.filter(p=>p.sev>0).length;const cnt=$("probCount");cnt.textContent=serious;cnt.className="count"+(serious?"":" zero");
  const key=P.map(p=>p.text).join("|");if(key!==lastProbKey){lastProbKey=key;
    $("problems").innerHTML=P.length?P.map((p,k)=>`<li><button data-p="${k}"><span class="dot" style="background:${p.sev===2?"var(--bad)":p.sev===1?"var(--warn)":"var(--accent)"}"></span><span><span class="t">${esc(p.text)}</span><span class="h">${esc(p.hint)}</span></span></button></li>`).join(""):`<li class="empty">Nic nehoří. Krajina žije sama.</li>`}
  if(S.log.length!==lastLogLen||S.log[0]!==lastLogTop){lastLogLen=S.log.length;lastLogTop=S.log[0];
    $("log").innerHTML=S.log.slice(0,50).map((e,k)=>`<li><button data-l="${k}"><span>den ${e.day} ${hhmm(e.hour||0)}</span><span>${esc(e.text)}</span></button></li>`).join("")}
  updateSel();updateOpts()}
$("problems").addEventListener("click",e=>{const b=e.target.closest("[data-p]");if(!b)return;const p=S.problems[+b.dataset.p];if(p)focusXY(p.x,p.y)});
$("log").addEventListener("click",e=>{const b=e.target.closest("[data-l]");if(!b)return;const l=S.log[+b.dataset.l];if(l&&l.tile>=0)focusXY(tx(l.tile)+0.5,ty(l.tile)+0.5)});

// ---- volby nástroje ----
const TOOL_HINT={line:"Táhni po mapě. Silnice se drží 0°, 45° a 90°, Shift = libovolný úhel. Konec u jiné silnice ji napojí, tah po silnici ji přestaví.",
  curve:"Klikni začátek, pak bod, kterým oblouk směřuje, a konec. Pravý klik zruší.",
  round:"Táhni od středu: velikost kruhu je na tobě. Silnice, které kruh protne, se na něj napojí.",
  lane:"Klikni na polovinu silnice: přidá pruh v tom směru. Tahem podél silnice jen na kus úseku (vznikne náběh). Shift ubírá.",
  split:"Klikni na silnici: rozdělí úsek, aby šel kus přestavět nebo rozšířit zvlášť. Klik na značku rozdělení úseky zase spojí.",oneway:"Klikni na úsek: obousměrná → jednosměrka → opačný směr → obousměrná.",
  junction:"Klikni na křižovatku: přepíná přednost zprava, hlavní silnici a semafor.",erase:"Táhni přes silnice nebo budovy. Tah začatý na budově bourá budovy (za peníze).",
  zone:"Táhni přes pole, kde se nesmí stavět. Tahem přes šrafy uzávěru zrušíš.",hand:"Táhni mapou, klikni pro výběr."};
function updateOpts(){const t=UI.tool,K=RK[UI.kind];const key=[t,UI.kind,UI.lanes,UI.level,UI.draw&&UI.draw.r].join("|");if(key===lastOptsKey)return;lastOptsKey=key;
  let html="";
  if(t==="line"||t==="curve"){
    html+=`<div class="grp"><span class="lbl">Druh</span>${ROAD_KINDS.map(k=>`<button data-kind="${k}" aria-pressed="${UI.kind===k}">${RK[k].name}<small>${RK[k].cost} Kč</small></button>`).join("")}</div>`;
    html+=`<div class="grp"><span class="lbl">Pruhy${K.oneway?"":" v každém směru"}</span><button data-lanes="-1" ${UI.lanes<=K.min?"disabled":""}>−</button><span class="num">${UI.lanes}</span><button data-lanes="1" ${UI.lanes>=K.max?"disabled":""}>+</button></div>`;
    html+=`<div class="grp"><span class="lbl">Výška</span>${LEVEL_NAMES.map((n,k)=>`<button data-level="${k}" aria-pressed="${UI.level===k}">${n}</button>`).join("")}</div>`}
  html+=`<div class="grp"><span class="hint">${esc(TOOL_HINT[t]||"")}${t==="round"&&UI.draw&&UI.draw.r?" Poloměr "+UI.draw.r.toFixed(1)+" pole.":""}</span></div>`;
  $("opts").innerHTML=html}
$("opts").addEventListener("click",e=>{const b=e.target.closest("button");if(!b||b.disabled)return;
  if(b.dataset.kind){UI.kind=b.dataset.kind;const K=RK[UI.kind];UI.lanes=K.lanes}
  if(b.dataset.lanes){const K=RK[UI.kind];UI.lanes=clamp(UI.lanes+(+b.dataset.lanes),K.min,K.max)}
  if(b.dataset.level)UI.level=+b.dataset.level;
  lastOptsKey="";updateOpts();refreshPlan()});

// ---- potvrzení ----
function askConfirm(text,goLabel,onGo){$("confirmText").textContent=text;$("confirmGo").textContent=goLabel;$("confirm").hidden=false;UI.pending=onGo}
function hideConfirm(){$("confirm").hidden=true;UI.pending=null;UI.plan=null}
$("confirmGo").addEventListener("click",()=>{const f=UI.pending;hideConfirm();if(f)f()});
$("confirmNo").addEventListener("click",hideConfirm);
function bldCountText(n){return n+(n===1?" budovu":n<5?" budovy":" budov")}
// provede plán; když by se bouralo, nejdřív se zeptá
function runPlan(plan,commit,what){
  if(!plan.ok){toast(plan.msg);return}
  const go=()=>{const r=commit(S,plan);if(!r.ok)toast(r.msg);else{toast(what+(plan.cost?" za "+fmt(plan.cost)+" Kč":""));UI.selDirty=true}};
  if(plan.demolish&&plan.demolish.length){askConfirm(`${what} vede přes ${bldCountText(plan.demolish.length)}. Zbourat je a postavit za ${fmt(plan.cost)} Kč?`,"Postavit a zbourat",go);UI.keepPlan=plan}
  else go()}

// ---- výběr ----
const COMPASS=(hx,hy)=>{const a=Math.atan2(-hy,hx)*180/Math.PI;const n=["V","SV","S","SZ","Z","JZ","J","JV"];return n[((Math.round(a/45)%8)+8)%8]};
function growthLabel(t){if(!t.accessList.length)return"bez silnice";if(t.jam>0.4)return"brzdí ji zácpy";if(t.rate>0.04)return"roste rychle";if(t.rate>0.018)return"roste";if(t.rate>0.005)return"roste pomalu";return"stojí"}
function selHTML(t){const acts=[];let title,sub="",rows=[],why=null,ok=false;const A=(label,act,pressed,group)=>acts.push({label,act,pressed,group});
  if(t.type==="edge"){const e=S.edges[t.id];if(!e||e.dead)return"";const K=RK[e.kind];const lv=Math.max(S.nodes[e.a].lvl,S.nodes[e.b].lvl);
    title=(e.ring?"Kruhový objezd · "+K.name.toLowerCase():K.name)+(lv>=1.5?" · vysoký most":lv>=0.5?" · most":"");
    const one=e.lf===0||e.lb===0;const pr=n=>n+" "+(n===1?"pruh":n<5?"pruhy":"pruhů");const mid=pointAt(e.g,e.g.len/2);const c0=COMPASS(mid.tx,mid.ty),c1=COMPASS(-mid.tx,-mid.ty);
    sub=one?pr(e.lf+e.lb)+", jednosměrně":e.lf===e.lb?pr(e.lf)+" v každém směru":pr(e.lf)+" směr "+c0+", "+pr(e.lb)+" směr "+c1;if(e.auto)sub+=" · postavila obec";
    const c=Math.max(e.cong[0],e.cong[1]);rows.push(["Provoz",fmt(e.flow)+" aut/min"],["Vytížení",Math.round(Math.min(1,c)*100)+" %"],["Délka",e.g.len.toFixed(1)+" polí"]);
    if(e.gateEdge){const g=S.gates.find(g=>S.nodes[g.node].edges.includes(e.id));if(g){title="Dálnice do města "+g.name;rows.push(["Turisté",fmt(g.visitors)],["Vývoz",fmt(g.exported)+" Kč"]);
      if(!S.towns.some(tt=>tt.comps.has(S.nodes[g.node].comp)))why="Zatím vede do prázdna. Na konci ji napoj silnicí, nebo k ní postav nájezd."}}
    if(c>0.75)why="Tvoří se tu kolona. Pomůže pruh navíc, objížďka nebo úprava křižovatky na konci úseku.";
    if(!e.gateEdge){for(const k of ROAD_KINDS)if(k!==e.kind&&!(e.ring&&(k==="hwy"||k==="ramp")))A(RK[k].name,"kind:"+k,false,e.ring?"Celý kruh změnit na":"Změnit na");
      if(one){A("Přidat pruh","lane:1",false,"Pruhy");A("Ubrat pruh","lane:-1",false,"Pruhy")}
      else{A("+ oba směry","lane:1",false,"Pruhy");A("− oba směry","lane:-1",false,"Pruhy");A("+ směr "+c0,"lane:1:0",false,"Pruhy");A("− směr "+c0,"lane:-1:0",false,"Pruhy");A("+ směr "+c1,"lane:1:1",false,"Pruhy");A("− směr "+c1,"lane:-1:1",false,"Pruhy")}
      if(!e.ring)A(one?"Změnit směr / obousměrně":"Jednosměrka","ow",false,"Pruhy")}
    if(!e.gateEdge)A("Zbourat úsek","erase",false,"Úsek")}
  else if(t.type==="node"&&S.nodes[t.id]&&S.nodes[t.id].keep&&S.nodes[t.id].edges.length===2){title="Rozdělení úseku";sub="úseky se samy nespojí, každý jde přestavět zvlášť";A("Spojit úseky","unsplit",false,"Úsek")}
  else if(t.type==="node"){const n=S.nodes[t.id];if(!n||n.dead)return"";
    title=n.ring?"Vjezd na kruhový objezd":n.eff==="merge"?"Napojení na dálnici":n.gate>=0?"Hranice mapy":"Křižovatka";
    const names={none:"bez řízení",right:"přednost zprava",main:"hlavní silnice",light:"semafor",ring:"přednost má kruh",merge:"z boku jen vpravo, vjíždějící dává přednost dálnici"};sub=names[n.eff]||"";
    let waiting=0;for(const a of n.arms){const e=S.edges[a.e];const lanes=e.q[a.inLink&1];if(!lanes)continue;for(const q of lanes)for(const c of q)if(c.wait>1.5&&e.g.len-c.s<2)waiting++}
    rows.push(["Ramen",String(n.arms.length)],["Čekající auta",String(waiting)]);
    if(n.eff==="main"&&n.mainEdges){const arms=n.arms.filter(a=>n.mainEdges.has(a.e));rows.push(["Hlavní směr",arms.map(a=>COMPASS(a.hx,a.hy)).join("–")])}
    if(waiting>=3)why="Auta tu čekají. Zkus semafor, jinou hlavní silnici, nebo celou křižovatku nahraď kruhovým objezdem.";
    if(!n.ring&&n.eff!=="merge"&&n.edges.length>=3){A("Automaticky","ctl:0",n.ctl===0,"Pravidlo");A("Přednost zprava","ctl:1",n.ctl===1,"Pravidlo");A("Semafor 60 Kč","ctl:3",n.ctl===3,"Pravidlo");
      for(let i=0;i<n.arms.length;i++)for(let j=i+1;j<n.arms.length;j++){const a=n.arms[i],b=n.arms[j];const pair=[a.e,b.e];const pr=n.ctl===2&&n.mainManual&&n.mainManual.includes(a.e)&&n.mainManual.includes(b.e);
        A("Hlavní "+COMPASS(a.hx,a.hy)+"–"+COMPASS(b.hx,b.hy),"main:"+pair.join(","),pr,"Hlavní silnice")}}}
  else if(t.type==="bld"){const b=t.b;if(b.dead)return"";const K=KIND[b.type];
    if(isHome(b)){const tw=b.town;title=b.name;sub="obec "+tw.name+" · "+fmt(tw.pop)+" obyvatel · "+growthLabel(tw);
      rows.push(["Bydlí tu",`${b.kids} dětí, ${b.adults} dospělých, ${b.seniors} seniorů`],["Pracuje z domu",String(b.ho)],["Teď mimo domov",String(Math.max(0,Math.round(b.away)))]);
      rows.push(["Cesty zdržené o",tw.accessList.length?Math.round(Math.max(0,tw.delay-1)*100)+" %":"–"]);
      if(tw.why&&tw.why.length)why="Růst obce brzdí: "+tw.why.join(", ")+".";else{why="Obec se rozvíjí bez potíží.";ok=true}
      if(!b.access)why="Dům ztratil vjezd na silnici.";}
    else{title=K.name;sub=b.town?"obec "+b.town.name:"u silnice";
      if(b.jobs)rows.push(["Pracuje tu",fmt(b.staff)+" / "+fmt(b.jobs)]);
      if(b.type==="school")rows.push(["Žáků",fmt(b.kidsIn)+" / "+KIND.school.kids]);
      if(K.pull)rows.push(["Zákazníci teď",fmt(b.guests)],["Parkoviště",b.parked.length+" / "+b.cap]);
      if(K.industry){rows.push(["Ve skladu",b.out+" fůr "+GOODS[K.out].name]);if(K.need)for(const g in K.need)rows.push(["Na skladě "+GOODS[g].name,String(b.stock[g]||0)]);if(K.res!==undefined)rows.push(["Zásoba v okolí",(b.res||0)+" polí"]);rows.push(["Vyrobeno",fmt(b.made)+" fůr"]);
        const m={workers:"Nemá pracovníky. Napoj ho silnicí na obec.",night:"V noci se nepracuje.",nodest:"Nemá kam vozit. Napoj ho na dálnici do světa nebo na odběratele.",full:"Plný sklad. Výrobky nemá kdo odebrat.",input:"Čeká na suroviny.",res:"Okolí je vytěžené.",road:"Nemá silnici."};
        if(b.short)why=m[b.short];else{why="Vyrábí.";ok=true}}
      if(K.pull&&b.ofRecent>1)why="Parkoviště nestačí, auta čekají na silnici.";
      if(!b.access)why="Budova ztratila vjezd na silnici."}
    A("Zbourat "+fmt(demolishCost(b))+" Kč","demolish",false,"Budova")}
  else if(t.type==="cell"){const i=t.c,k=S.terrain[i];title=["Louka","Voda","Les","Skály","Ložisko železné rudy"][k];if(S.zone[i])sub="stavební uzávěra";
    for(const kk of ["street","road","blvd","hwy"])rows.push([RK[kk].name,fmt(roadCostPerTile(kk,RK[kk].lanes,0)+(k===WATER?(kk==="hwy"?20:8):k!==GRASS?3:0))+" Kč/pole"]);
    const [tw,d]=nearestTown(S,tx(i)+0.5,ty(i)+0.5);if(tw)rows.push(["Nejbližší obec",tw.name+", "+Math.round(d)+" polí"]);
    if(k===ROCK||k===ORE)why="Silnice sem z obce přivede "+(k===ROCK?"lom":"důl")+".";else if(k===FOREST)why="Silnice k lesu přivede těžbu dřeva.";
    A(S.zone[i]?"Zrušit uzávěru":"Stavební uzávěra","zone:"+(S.zone[i]?0:1),false,"Pole")}
  else return"";
  let groups="",cur=null;for(const a of acts){if(a.group!==cur){cur=a.group;groups+=`<span class="lbl">${esc(cur)}</span>`}groups+=`<button data-act="${a.act}" aria-pressed="${a.pressed?"true":"false"}">${esc(a.label)}</button>`}
  return`<span class="pin">${UI.pinned?"vybráno · Esc":"klikni Rukou pro výběr"}</span><h3>${esc(title)}</h3>${sub?`<div class="sub">${esc(sub)}</div>`:""}
    <div class="rows">${rows.map(r=>`<span>${esc(r[0])}</span><b>${esc(r[1])}</b>`).join("")}</div>${why?`<p class="why${ok?" ok":""}">${esc(why)}</p>`:""}${acts.length?`<div class="acts">${groups}</div>`:""}`}
function updateSel(){const t=UI.pinned||(UI.draw?null:UI.hover);const el=$("sel");if(!t){el.hidden=true;return}const h=selHTML(t);if(!h){el.hidden=true;if(UI.pinned===t)UI.pinned=null;return}el.hidden=false;el.innerHTML=h}
$("sel").addEventListener("click",ev=>{const btn=ev.target.closest("[data-act]");if(!btn)return;const t=UI.pinned||UI.hover;if(!t)return;const a=btn.dataset.act;let r={ok:true};
  if(t.type==="edge"){const e=S.edges[t.id];
    if(a.startsWith("kind:")){runPlan(planKind(S,e,a.slice(5)),commitKind,"Změna druhu silnice");return}
    if(a.startsWith("lane:")){const q=a.split(":");runPlan(planLanes(S,e,+q[1],q[2]===undefined?undefined:+q[2]),commitLanes,"Změna pruhů");return}
    if(a==="ow"){r=cycleOneway(S,e);if(r.ok)toast(r.state)}
    if(a==="erase"){r=eraseEdge(S,e);if(r.ok){toast("Úsek zbourán");UI.pinned=null}}}
  else if(t.type==="node"&&a==="unsplit"){r=unsplit(S,S.nodes[t.id]);if(r.ok){toast(r.msg);UI.pinned=null}}
  else if(t.type==="node"){const n=S.nodes[t.id];if(a.startsWith("ctl:"))r=setControl(S,n,+a.slice(4),null);if(a.startsWith("main:"))r=setControl(S,n,2,a.slice(5).split(",").map(Number))}
  else if(t.type==="bld"&&a==="demolish"){r=demolishBuilding(S,t.b,false);if(r.ok){toast("Zbouráno za "+fmt(r.cost)+" Kč");UI.pinned=null}}
  else if(t.type==="cell"&&a.startsWith("zone:"))S.zone[t.c]=+a.slice(5);
  if(r&&!r.ok)toast(r.msg);UI.selDirty=true;updateSel()});
