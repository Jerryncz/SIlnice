// Úpravy sítě: kruhový objezd, pruhy, druh, přednost, rozdělení, přechody, bourání, souvislost sítě.

// ---- kruhový objezd ----
// turbo = pruhy se v kruhu stáčejí jako spirála a nepřejíždí se (R99)
const RING_MAX=6;
function planRoundabout(S,cx,cy,r,kind,lanes,turbo){kind=kind||"road";
  const plan={ok:false,msg:"",cost:0,demolish:[],cx,cy,r,round:true,kind,turbo:!!turbo};
  if(r<1.4){plan.msg="Kruhový objezd je moc malý.";return plan}
  {const L=clamp(lanes||(r>=3?2:1),1,RING_MAX),rmin=Math.ceil((L*LW/2+RK[kind].side+0.7)*2)/2;if(r<rmin){plan.msg="Na "+L+" "+(L<5?"pruhy":"pruhů")+" musí mít kruh poloměr aspoň "+rmin.toFixed(1)+" pole.";return plan}}
  if(cx-r<0.5||cy-r<0.5||cx+r>MW-0.5||cy+r>MH-0.5){plan.msg="Kruhový objezd se nevejde na mapu.";return plan}
  const pts=mkArc(cx,cy,r,0,Math.PI*2);const g=geom(pts);plan.g=g;lanes=clamp(lanes||(r>=3?2:1),1,RING_MAX);plan.lanes=lanes;
  plan.cross=[];
  for(const e of S.edges){if(e.dead||!bbOverlap(e.g.bb,g.bb,0.2))continue;
    const xs=polyInter(g,e.g).filter(x=>lvlAt(S,e,x.ub)<0.5);
    if(xs.length&&e.gateEdge){plan.msg="Kruhový objezd nejde postavit na dálnici do světa.";return plan}
    for(const x of xs)plan.cross.push({x:x.x,y:x.y})}
  const cells=cellsAlong(S,g,edgeExt({kind,lf:lanes,lb:0}),()=>0);
  plan.demolish=bldOn(S,cells);plan.cells=cells;
  plan.roadCost=Math.round(g.len*roadCostPerTile(kind,lanes,0)*1.2+20);plan.demolishCost=plan.demolish.reduce((s,b)=>s+demolishCost(b),0);
  plan.cost=plan.roadCost+plan.demolishCost;plan.ok=true;return plan}
function commitRoundabout(S,plan){
  if(!plan.ok)return {ok:false,msg:plan.msg};if(S.money<plan.cost)return {ok:false,msg:"Málo peněz v pokladně."};
  S.money-=plan.cost;for(const b of plan.demolish)if(!b.dead)demolishBuilding(S,b,true);
  const {cx,cy,r}=plan;const ringNodes=[];const rid=S.rings.length+1;
  for(const x of plan.cross){const n=resolvePoint(S,x.x,x.y,0);ringNodes.push(n)}
  for(const e of [...S.edges]){if(e.dead)continue;const m=pointAt(e.g,e.g.len/2);if(Math.hypot(m.x-cx,m.y-cy)<r-0.2&&lvlAt(S,e,e.g.len/2)<0.5){
    const da=Math.hypot(S.nodes[e.a].x-cx,S.nodes[e.a].y-cy),db=Math.hypot(S.nodes[e.b].x-cx,S.nodes[e.b].y-cy);if(da<r+0.1&&db<r+0.1)removeEdge(S,e)}}
  let list=ringNodes.filter(n=>!n.dead).map(n=>({n,a:Math.atan2(n.y-cy,n.x-cx)}));
  const uniq=[];for(const q of list.sort((p,q)=>p.a-q.a))if(!uniq.some(u=>u.n===q.n))uniq.push(q);list=uniq;
  const full=[];const addAt=a=>{const n=addNode(S,cx+Math.cos(a)*r,cy+Math.sin(a)*r,0);full.push({n,a})};
  if(!list.length){for(let k=0;k<4;k++)addAt(k*Math.PI/2)}
  else{for(let k=0;k<list.length;k++){full.push(list[k]);const a0=list[k].a,a1=k+1<list.length?list[k+1].a:list[0].a+Math.PI*2;const gap=a1-a0;const extra=Math.floor(gap/(Math.PI/2.2));
    for(let m=1;m<=extra;m++)addAt(a0+gap*m/(extra+1))}}
  full.sort((p,q)=>p.a-q.a);
  for(const f of full){f.n.ring=rid;f.n.keep=false;f.n.x=cx+Math.cos(f.a)*r;f.n.y=cy+Math.sin(f.a)*r}
  const lanes=plan.lanes,made=[];
  for(let k=0;k<full.length;k++){const A=full[k],B=full[(k-1+full.length)%full.length];let a1=B.a;if(a1>=A.a)a1-=Math.PI*2;
    const pts=mkArc(cx,cy,r,A.a,a1);made.push(addEdge(S,A.n,B.n,plan.kind||"road",pts,lanes,0,{ring:rid,turbo:plan.turbo}))}
  for(const f of full)topoNode(S,f.n);
  S.rings.push({id:rid,cx,cy,r,turbo:plan.turbo});
  for(const f of full)topoNode(S,f.n);netChanged(S);
  return {ok:true,edges:made}}
// přepne typ kruhového objezdu (Běžný / Turbo): změní se jen samočinná spojení a přejíždění v kruhu
function setRingType(S,rid,turbo){const R=S.rings.find(q=>q.id===rid);if(!R)return {ok:false,msg:"Kruhový objezd nenalezen."};R.turbo=!!turbo;
  const ns=new Set();for(const e of ringEdges(S,rid)){e.turbo=!!turbo;ns.add(e.a);ns.add(e.b)}for(const id of ns)topoNode(S,S.nodes[id]);netChanged(S);
  return {ok:true,msg:turbo?"Turbo: pruhy se stáčejí, v kruhu se nepřejíždí":"Běžný: v kruhu se přejíždí mezi pruhy"}}
const ringEdges=(S,rid)=>S.edges.filter(e=>!e.dead&&e.ring===rid);

// ---- úpravy úseku ----
// změní druh nebo pruhy úseku; auta zůstanou ve svých pruzích (krajní pruh se sloučí), hard = otočení směru
function reshapeEdge(S,e,fn,hard){
  if(hard)killOnEdge(S,e.id);
  const on=[];if(!hard)for(const c of S.cars){if(c.dead)continue;const l=c.state==="drive"?c.links[c.li]:c.state==="exit"?c.links[0]:-1;if(l>=0&&(l>>1)===e.id){if(c.state==="drive")removeQ(S,c);on.push(c)}}
  rasterEdge(S,e,false);fn();buildQueues(e);setWidth(e);rasterEdge(S,e,true);topoNode(S,S.nodes[e.a]);topoNode(S,S.nodes[e.b]);netChanged(S);
  for(const c of on){const l=c.state==="drive"?c.links[c.li]:c.links[0];const L=linkLanes(S,l);if(!L){killVehicle(S,c);continue}
    c.lane=clamp(c.lane+(e._lsh||0),0,L-1);if(c.state==="drive")insertQ(e.q[l&1][c.lane],c)}
  e._lsh=0;
  if(!hard){for(const c of S.cars){if(c.dead)continue;for(let k=c.li+1;k<c.links.length;k++)if((c.links[k]>>1)===e.id&&!linkLanes(S,c.links[k])){S.reroute.push(c);break}}}}
// skupina úseků, kterých se úprava týká: kruhový objezd celý, jinak jen úsek
const editGroup=(S,e)=>e.ring?ringEdges(S,e.ring):[e];
function lanesAfter(e,delta,dir){const K=RK[e.kind];
  if(e.lf===0||e.lb===0){const n=e.lf+e.lb+delta;const mn=K.oneway||e.ring?K.min:1,mx=e.ring?RING_MAX:K.oneway?K.max:K.max*2;if(n<mn||n>mx)return null;return e.lf?[n,0]:[0,n]}
  const lf=e.lf+(dir===undefined||dir===0?delta:0),lb=e.lb+(dir===undefined||dir===1?delta:0);
  if(lf<K.min||lb<K.min||lf>K.max||lb>K.max)return null;return [lf,lb]}
// pruh navíc nebo méně; dir = jen jeden směr (0 = a→b), range = jen část úseku [u0,u1]
function planLanes(S,e,delta,dir,range){const grp=editGroup(S,e);const items=[];let cost=0;const cells=new Set();
  if(e.gateEdge)return {ok:false,msg:"Dálnici do světa měnit nejde."};
  if(e.ring)range=null;
  if(range){range=[Math.max(0,Math.min(range[0],range[1])),Math.min(e.g.len,Math.max(range[0],range[1]))];if(range[0]<0.5)range[0]=0;if(e.g.len-range[1]<0.5)range[1]=e.g.len;if(range[1]-range[0]<0.8)range=null}
  for(const x of grp){const nl=lanesAfter(x,delta,x.lf===0||x.lb===0?undefined:dir);if(!nl)return {ok:false,msg:delta>0?"Víc pruhů tady nejde.":"Méně pruhů už nejde."};
    const u0=range?range[0]:0,u1=range?range[1]:x.g.len;const ext=edgeExt({kind:x.kind,lf:nl[0],lb:nl[1],sh:(x.lf===0||x.lb===0)&&!x.ring?(x.sh||0)+(dir===1?-1:1)*delta*LW/2:0});
    const g=range?geom(subPts(x.g,u0,u1)):x.g;for(const c of cellsAlong(S,g,ext,u=>lvlAt(S,x,u0+u)))cells.add(c);
    const added=Math.max(0,nl[0]-x.lf)+Math.max(0,nl[1]-x.lb);cost+=Math.round((u1-u0)*RK[x.kind].laneCost*added*0.5);
    const one1=(x.lf===0||x.lb===0)&&!x.ring,left=one1&&dir===1;items.push({e:x,lf:nl[0],lb:nl[1],sh:one1?(x.sh||0)+(left?-1:1)*delta*LW/2:0,lsh:left?delta:0})}
  const dem=bldOn(S,cells);if(delta>0)cost+=dem.reduce((s,b)=>s+demolishCost(b),0);else cost=0;
  return {ok:true,e,items,delta,dir,range,cost,demolish:dem,lanesPlan:true}}
function commitLanes(S,p){if(!p.ok)return p;if(S.money<p.cost)return {ok:false,msg:"Málo peněz v pokladně."};S.money-=p.cost;for(const b of p.demolish)if(!b.dead)demolishBuilding(S,b,true);
  const touched=[];
  for(const it of p.items){if(it.e.dead)continue;const t=p.range?cutSection(S,it.e,p.range[0],p.range[1]):it.e;
    t._lsh=it.lsh||0;reshapeEdge(S,t,()=>{t.lf=it.lf;t.lb=it.lb;t.sh=it.sh||0});touched.push(S.nodes[t.a],S.nodes[t.b])}
  tidyNodes(S,touched);return {ok:true}}
function kindLanes(e,kind,lanes){const K=RK[kind];const one=e.lf===0||e.lb===0;
  if(e.ring)return [clamp(lanes||e.lf,1,RING_MAX),0];
  if(K.oneway){const n=clamp(lanes||(one?e.lf+e.lb:e.lf+e.lb),K.min,K.max);return e.lf===0?[0,n]:[n,0]}
  if(lanes)return [clamp(lanes,K.min,K.max),clamp(lanes,K.min,K.max)];
  if(one){const n=clamp(Math.ceil((e.lf+e.lb)/2),K.min,K.max);return [n,n]}
  return [clamp(e.lf,K.min,K.max),clamp(e.lb,K.min,K.max)]}
function planKind(S,e,kind,lanes){if(e.gateEdge)return {ok:false,msg:"Dálnici do světa měnit nejde."};
  const K=RK[kind];const grp=editGroup(S,e);const items=[];let cost=0;const cells=new Set();
  for(const x of grp){const [lf,lb]=kindLanes(x,kind,lanes);const ext=edgeExt({kind,lf,lb});
    for(const c of cellsAlong(S,x.g,ext,u=>lvlAt(S,x,u)))cells.add(c);
    const lv=lvlAt(S,x,x.g.len/2);cost+=Math.max(0,Math.round(x.g.len*(roadCostPerTile(kind,Math.max(lf,lb),lv)-roadCostPerTile(x.kind,Math.max(x.lf,x.lb),lv))));
    if(x.kind!==kind||x.lf!==lf||x.lb!==lb)items.push({e:x,lf,lb})}
  if(!items.length)return {ok:false,msg:"Úsek už takový je."};
  const dem=bldOn(S,cells);cost+=dem.reduce((s,b)=>s+demolishCost(b),0);
  return {ok:true,e,kind,items,cost,demolish:dem,kindPlan:true}}
function commitKind(S,p){if(!p.ok)return p;if(S.money<p.cost)return {ok:false,msg:"Málo peněz v pokladně."};S.money-=p.cost;for(const b of p.demolish)if(!b.dead)demolishBuilding(S,b,true);
  const touched=[];for(const it of p.items){if(it.e.dead)continue;const t=it.e;reshapeEdge(S,t,()=>{t.kind=p.kind;t.lf=it.lf;t.lb=it.lb;if(!RK[p.kind].walk||!RK[p.kind].side)t.xw=null});touched.push(S.nodes[t.a],S.nodes[t.b])}
  tidyNodes(S,touched);return {ok:true}}
function setKind(S,e,kind){return commitKind(S,planKind(S,e,kind))}
// otočí směr jednosměrky (druh Jednosměrka nebo Nájezd); auta na úseku se zruší
function cycleOneway(S,e){if(e.ring)return {ok:false,msg:"Kruhový objezd je jednosměrný sám."};if(e.gateEdge)return {ok:false,msg:"Dálnici do světa měnit nejde."};
  if(e.lf>0&&e.lb>0)return {ok:false,msg:"Obousměrná silnice. Jednosměrku udělá změna druhu na Jednosměrku."};
  reshapeEdge(S,e,()=>{if(e.lf===0){e.lf=e.lb;e.lb=0}else{const t=e.a;e.a=e.b;e.b=t;const tp=e.pa;e.pa=e.pb;e.pb=tp;e.sh=-(e.sh||0);e.uc=null;e.g=geom(reversePts(e.g.pts));
      for(const b of S.buildings)if(b.access&&b.access.e===e.id)b.access={e:e.id,u:e.g.len-b.access.u,side:-b.access.side,x:b.access.x,y:b.access.y}}
    for(const nid of [e.a,e.b])S.nodes[nid].armLast.clear()},true);
  tidyNodes(S,[S.nodes[e.a],S.nodes[e.b]]);
  return {ok:true,state:"Směr otočen"}}
function setControl(S,n,ctl,pair){if(n.edges.length<3||n.ring)return {ok:false,msg:"Tohle není obyčejná křižovatka."};
  if(n.arms.some(a=>S.edges[a.e].kind==="hwy"))return {ok:false,msg:"Napojení na dálnici se řídí samo."};
  const cost=ctl===3&&n.ctl!==3?60:0;if(S.money<cost)return {ok:false,msg:"Málo peněz v pokladně."};S.money-=cost;
  n.ctl=ctl;n.mainManual=ctl===2?pair:null;topoNode(S,n);return {ok:true}}
// ruční rozdělení úseku (uzel se pak sám nespojí); klik na rozdělení ho zase zruší
function splitAt(S,e,u){if(e.ring)return {ok:false,msg:"Kruhový objezd se nedělí."};if(e.gateEdge)return {ok:false,msg:"Dálnici do světa dělit nejde."};
  if(u<0.5||e.g.len-u<0.5)return {ok:false,msg:"Moc blízko konce úseku."};const r=splitEdgeR(S,e,u,true);return {ok:true,node:r.node}}
function unsplit(S,n){if(!n.keep)return {ok:false,msg:"Tady úsek ručně rozdělený není."};n.keep=false;const ne=mergeAt(S,n);
  return ne?{ok:true,msg:"Úseky spojeny"}:{ok:true,msg:"Úseky se liší druhem nebo pruhy, zůstanou zvlášť."}}
// přechody: na rameni křižovatky se přepínají (jsou tam samy od sebe), v úseku se přidávají a ruší
function toggleCross(S,n,e){if(n.edges.length<3||!RK[e.kind].walk||!RK[e.kind].side||e.ring)return {ok:false,msg:"Tady přechod být nemůže."};
  if(!n.xOff)n.xOff=new Set();let on;if(n.xOff.has(e.id)){n.xOff.delete(e.id);on=true}else{n.xOff.add(e.id);on=false}topoNode(S,n);netChanged(S);return {ok:true,on}}
function toggleMidCross(S,e,u){if(!RK[e.kind].walk||!RK[e.kind].side)return {ok:false,msg:"Na této silnici nejsou chodníky."};
  e.xw=e.xw||[];const k=e.xw.findIndex(x=>Math.abs(x.u-u)<0.6);if(k>=0){e.xw.splice(k,1);netChanged(S);return {ok:true,on:false}}
  const t=edgeTrim(e);if(u<t[0]+0.4||u>e.g.len-t[1]-0.4)return {ok:false,msg:"Přechod dej dál od křižovatky."};
  if(S.money<10)return {ok:false,msg:"Málo peněz v pokladně."};S.money-=10;e.xw.push({u});netChanged(S);return {ok:true,on:true}}
function eraseEdge(S,e){if(e.gateEdge)return {ok:false,msg:"Dálnici do světa zbourat nejde."};
  const refund=Math.round(e.g.len*RK[e.kind].cost*0.2);const ends=[S.nodes[e.a],S.nodes[e.b]];removeEdge(S,e);S.money+=refund;
  if(e.ring){for(const n of ends){if(!n.edges.some(x=>S.edges[x].ring))n.ring=0;topoNode(S,n)}}
  tidyNodes(S,ends);
  return {ok:true,refund}}
function computeNet(S){
  for(const n of S.nodes)n.comp=-1;let id=0;
  for(const n of S.nodes){if(n.dead||n.comp>=0)continue;const st=[n];n.comp=id;
    while(st.length){const a=st.pop();for(const eid of a.edges){const e=S.edges[eid];const o=S.nodes[e.a===a.id?e.b:e.a];if(o.comp<0){o.comp=id;st.push(o)}}}id++}
  S.netDirty=false}
const edgeComp=(S,eid)=>S.nodes[S.edges[eid].a].comp;
