// Silniční síť: uzly (křižovatky, konce, body na kruhu) a úseky mezi nimi.
// Úsek má druh, počty pruhů lf (směr a→b) a lb (b→a), geometrii a úroveň danou uzly.

function edgeWidth(e){const K=RK[e.kind];return (e.lf+e.lb)*LW+K.median+2*K.side}
function lvlAt(S,e,u){const a=S.nodes[e.a].lvl,b=S.nodes[e.b].lvl;return a+(b-a)*clamp(u/(e.g.len||1),0,1)}
function addNode(S,x,y,lvl){const n={id:S.nodes.length,x,y,lvl,edges:[],ctl:0,mainManual:null,light:null,ring:false,gate:-1,dead:false,
  turns:new Map(),arms:[],eff:"none",mainEdges:null,armLast:new Map(),comp:-1};S.nodes.push(n);return n}
function findNode(S,x,y,lvl,r){let best=null,bd=r;for(const n of S.nodes){if(n.dead||Math.abs(n.lvl-lvl)>=0.5)continue;const d=Math.hypot(n.x-x,n.y-y);if(d<bd){bd=d;best=n}}return best}
function edgesNear(S,x,y,r){const out=new Set();for(let cy=Math.floor(y-r);cy<=Math.floor(y+r);cy++)for(let cx=Math.floor(x-r);cx<=Math.floor(x+r);cx++){const c=cellAt(cx+0.5,cy+0.5);if(c<0)continue;
  const a=S.cellG[c],b=S.cellB[c];if(a)for(const id of a)out.add(id);if(b)for(const id of b)out.add(id)}return [...out].map(id=>S.edges[id]).filter(e=>!e.dead)}

function rasterEdge(S,e,add){
  if(add){const g=new Set(),b=new Set();const r=e.w/2+0.22;const p=e.g.pts;
    for(let k=0;k<e.g.n;k++){const x=p[2*k],y=p[2*k+1],lv=lvlAt(S,e,e.g.cum[k]);
      for(let cy=Math.floor(y-r);cy<=Math.floor(y+r);cy++)for(let cx=Math.floor(x-r);cx<=Math.floor(x+r);cx++){if(cx<0||cy<0||cx>=W||cy>=H)continue;
        if(Math.hypot(cx+0.5-x,cy+0.5-y)<=r+0.08)(lv<0.5?g:b).add(cy*W+cx)}}
    for(const c of b)if(g.has(c))b.delete(c);
    e.cellsG=[...g];e.cellsB=[...b];
    for(const c of e.cellsG){(S.cellG[c]||(S.cellG[c]=[])).push(e.id);S.roadCnt[c]++;const t=S.terrain[c];if(t===FOREST||t===ROCK||t===ORE){S.terrain[c]=GRASS;S.dirty.push(c)}}
    for(const c of e.cellsB){(S.cellB[c]||(S.cellB[c]=[])).push(e.id);S.bridgeCnt[c]++}}
  else{for(const c of e.cellsG){const a=S.cellG[c];if(a){const k=a.indexOf(e.id);if(k>=0)a.splice(k,1);if(!a.length)S.cellG[c]=null}S.roadCnt[c]--}
    for(const c of e.cellsB){const a=S.cellB[c];if(a){const k=a.indexOf(e.id);if(k>=0)a.splice(k,1);if(!a.length)S.cellB[c]=null}S.bridgeCnt[c]--}
    e.cellsG=[];e.cellsB=[]}}
function buildQueues(e){e.q=[[],[]];for(let k=0;k<e.lf;k++)e.q[0].push([]);for(let k=0;k<e.lb;k++)e.q[1].push([])}
function addEdge(S,a,b,kind,pts,lf,lb,opts){opts=opts||{};
  const e={id:S.edges.length,a:a.id,b:b.id,kind,lf,lb,g:geom(pts),ring:!!opts.ring,auto:!!opts.auto,gateEdge:!!opts.gate,dead:false,
    q:null,cong:[0,0],flow:0,passes:0,cellsG:[],cellsB:[],born:S.time};
  buildQueues(e);e.w=edgeWidth(e);a.dead=false;b.dead=false;
  S.edges.push(e);a.edges.push(e.id);b.edges.push(e.id);
  rasterEdge(S,e,true);topoNode(S,a);topoNode(S,b);S.netDirty=true;return e}
function removeEdge(S,e){if(e.dead)return;killOnEdge(S,e.id);rasterEdge(S,e,false);e.dead=true;
  for(const nid of [e.a,e.b]){const n=S.nodes[nid];n.edges=n.edges.filter(x=>x!==e.id);if(!n.edges.length&&n.gate<0)n.dead=true;else topoNode(S,n)}
  S.netDirty=true}
function splitEdge(S,e,u){
  if(u<0.3)return S.nodes[e.a];if(e.g.len-u<0.3)return S.nodes[e.b];
  const q=pointAt(e.g,u),lv=lvlAt(S,e,u),n=addNode(S,q.x,q.y,lv);n.ring=e.ring;
  const [pa,pb]=splitPts(e.g,u);const a=S.nodes[e.a],b=S.nodes[e.b];
  const kind=e.kind,lf=e.lf,lb=e.lb,props={ring:e.ring,auto:e.auto,gate:e.gateEdge};
  removeEdge(S,e);pa[pa.length-2]=n.x;pa[pa.length-1]=n.y;pb[0]=n.x;pb[1]=n.y;
  addEdge(S,a,n,kind,pa,lf,lb,props);addEdge(S,n,b,kind,pb,lf,lb,props);return n}
// uzel v daném místě: existující uzel, rozdělený úsek, nebo nový uzel
function resolvePoint(S,x,y,lvl){const n=findNode(S,x,y,lvl,0.32);if(n)return n;
  let best=null,bd=0.09,bu=0;for(const e of edgesNear(S,x,y,1)){const r=nearestOn(e.g,x,y);if(Math.abs(lvlAt(S,e,r.u)-lvl)>=0.5)continue;if(r.d<bd){bd=r.d;best=e;bu=r.u}}
  if(best)return splitEdge(S,best,bu);return addNode(S,x,y,lvl)}

// rameno uzlu: směr ven podél úseku, příjezdový a odjezdový směr (link = id úseku*2 + směr)
function armOf(S,n,eid){const e=S.edges[eid];const atA=e.a===n.id;const g=e.g;const u=atA?Math.min(0.5,g.len*0.3):Math.max(g.len-0.5,g.len*0.7);
  const p=pointAt(g,u);let hx=p.x-n.x,hy=p.y-n.y;const l=Math.hypot(hx,hy)||1;hx/=l;hy/=l;
  return {e:eid,hx,hy,inLink:eid*2+(atA?1:0),outLink:eid*2+(atA?0:1),axis:Math.abs(hx)>=Math.abs(hy)?0:1}}
const linkLanes=(S,l)=>{const e=S.edges[l>>1];return (l&1)?e.lb:e.lf};
const linkFrom=(S,l)=>{const e=S.edges[l>>1];return (l&1)?e.b:e.a};
const linkTo=(S,l)=>{const e=S.edges[l>>1];return (l&1)?e.a:e.b};
function topoNode(S,n){
  n.arms=n.edges.map(id=>armOf(S,n,id));const deg=n.arms.length;
  const hw=n.arms.filter(a=>S.edges[a.e].kind==="hwy").length;
  n.turns=new Map();
  for(const ai of n.arms){if(!linkLanes(S,ai.inLink))continue;const list=[];const hix=-ai.hx,hiy=-ai.hy;const ei=S.edges[ai.e];
    for(const ao of n.arms){if(!linkLanes(S,ao.outLink))continue;const eo=S.edges[ao.e];
      if(ao.e===ai.e&&deg>1)continue;
      const cr=hix*ao.hy-hiy*ao.hx,dt=hix*ao.hx+hiy*ao.hy;
      const turn=ao.e===ai.e?2:(cr>0.35?1:cr<-0.35?-1:0);
      if(ei.kind==="hwy"&&eo.kind==="hwy"&&dt<0.3)continue;
      if(ei.kind==="hwy"&&eo.kind==="ramp"&&hw>=2&&cr<0.05)continue;
      if(ei.kind==="ramp"&&eo.kind==="hwy"&&hw>=2&&(ai.hx*(-ao.hy)+ai.hy*ao.hx)<0.05)continue;
      if(n.ring&&!ei.ring&&!eo.ring)continue;
      list.push({link:ao.outLink,turn})}
    n.turns.set(ai.inLink,list)}
  n.mainEdges=null;
  if(n.ring&&n.arms.some(a=>S.edges[a.e].ring))n.eff="ring";
  else if(deg<3)n.eff="none";
  else if(hw){n.eff="merge";n.mainEdges=new Set(n.arms.filter(a=>S.edges[a.e].kind==="hwy").map(a=>a.e))}
  else if(n.ctl===3)n.eff="light";
  else if(n.ctl===1)n.eff="right";
  else if(n.ctl===2&&n.mainManual&&n.mainManual.every(id=>n.edges.includes(id))){n.eff="main";n.mainEdges=new Set(n.mainManual)}
  else{const rk=n.arms.map(a=>{const e=S.edges[a.e];return RK[e.kind].rank*8+e.lf+e.lb});const mx=Math.max(...rk);const top=n.arms.filter((a,k)=>rk[k]===mx);
    if(top.length===2&&rk.some(r=>r<mx)){n.eff="main";n.mainEdges=new Set(top.map(a=>a.e))}else n.eff="right"}
  if(n.eff==="light"){if(!n.light)n.light={axis:0,t:0,amber:false}}else n.light=null}

// ---- plánování a stavba silnice ----
function snapPoint(S,x,y,lvl){
  const n=findNode(S,x,y,lvl,0.55);if(n)return {type:"node",node:n.id,x:n.x,y:n.y,lvl:n.lvl};
  let best=null,bd=0.45;for(const e of edgesNear(S,x,y,1.5)){const r=nearestOn(e.g,x,y);const lv=lvlAt(S,e,r.u);if(Math.abs(lv-lvl)>=0.5)continue;if(r.d<bd){bd=r.d;best={type:"edge",edge:e.id,u:r.u,x:r.x,y:r.y,lvl:lv}}}
  if(best)return best;return {type:"free",x:Math.floor(x)+0.5,y:Math.floor(y)+0.5,lvl}}
function joinedTo(S,sn,e){return sn.type==="edge"&&sn.edge===e.id||sn.type==="node"&&(e.a===sn.node||e.b===sn.node)}
function checkJoin(S,sn,kind){
  if(sn.type==="edge"){const e=S.edges[sn.edge];if(e.kind==="hwy"&&kind!=="ramp"&&kind!=="hwy")return "Na dálnici se napojíš jen nájezdem.";if(e.ring&&(kind==="hwy"))return "Dálnice nemůže vést do kruhového objezdu."}
  if(sn.type==="node"){const n=S.nodes[sn.node];const kinds=n.arms.map(a=>S.edges[a.e].kind);
    if((kinds.includes("hwy")||kind==="hwy")&&n.edges.length+1>=3&&[...kinds,kind].some(k=>k!=="hwy"&&k!=="ramp"))return "Na dálnici se napojíš jen nájezdem."}
  return null}
function cellsAlong(S,g,w,lvlFn){const r=w/2+0.22,set=new Set();const p=g.pts;
  for(let k=0;k<g.n;k++){if(lvlFn(g.cum[k])>=0.5)continue;const x=p[2*k],y=p[2*k+1];
    for(let cy=Math.floor(y-r);cy<=Math.floor(y+r);cy++)for(let cx=Math.floor(x-r);cx<=Math.floor(x+r);cx++){if(cx<0||cy<0||cx>=W||cy>=H)continue;if(Math.hypot(cx+0.5-x,cy+0.5-y)<=r+0.08)set.add(cy*W+cx)}}
  return [...set]}
function roadCostPerTile(kind,lanes,lvl){const K=RK[kind];return (K.cost+K.laneCost*Math.max(0,lanes-K.lanes))*(1+1.6*lvl)}
function planRoad(S,spec){
  const K=RK[spec.kind];const lanes=clamp(spec.lanes||K.lanes,K.min,K.max);
  const plan={ok:false,msg:"",cost:0,demolish:[],junctions:[],spec,lanes,bad:null};
  const g0=geom(spec.pts);plan.g=g0;
  if(g0.len<0.8){plan.msg="Silnice je moc krátká.";return plan}
  for(let k=0;k<g0.n;k++){const x=g0.pts[2*k],y=g0.pts[2*k+1];if(x<0||y<0||x>W||y>H){plan.msg="Silnice nesmí vést mimo mapu.";return plan}}
  const la=spec.start.lvl,lb=spec.end.lvl,lvlNew=u=>la+(lb-la)*u/g0.len;
  for(const sn of [spec.start,spec.end]){const err=checkJoin(S,sn,spec.kind);if(err){plan.msg=err;plan.bad=sn;return plan}}
  if(spec.start.type==="node"&&spec.end.type==="node"&&spec.start.node===spec.end.node){plan.msg="Začátek a konec jsou stejný bod.";return plan}
  for(const e of S.edges){if(e.dead||!bbOverlap(e.g.bb,g0.bb,0.1))continue;
    for(const x of polyInter(g0,e.g)){
      if(x.ua<0.45&&joinedTo(S,spec.start,e))continue;if(g0.len-x.ua<0.45&&joinedTo(S,spec.end,e))continue;
      const l1=lvlNew(x.ua),l2=lvlAt(S,e,x.ub);if(Math.abs(l1-l2)>=0.5)continue;
      if(e.kind==="hwy"||spec.kind==="hwy"){plan.msg="Dálnici nejde křížit v úrovni. Zvol most.";plan.bad={x:x.x,y:x.y};return plan}
      plan.junctions.push({ua:x.ua,x:x.x,y:x.y,lvl:l2})}}
  plan.junctions.sort((a,b)=>a.ua-b.ua);
  plan.junctions=plan.junctions.filter((j,k,a)=>k===0||j.ua-a[k-1].ua>0.4);
  const w=lanes*(K.oneway?1:2)*LW+K.median+2*K.side;
  const cells=cellsAlong(S,g0,w,lvlNew);const dem=new Set();let water=0,rough=0;
  for(const c of cells){const b=S.bld[c];if(b)dem.add(b);if(S.terrain[c]===WATER)water++;else if(S.terrain[c]!==GRASS)rough++}
  for(const b of dem)if(b.gateLock){plan.msg="Tady stavět nejde.";return plan}
  plan.demolish=[...dem];plan.cells=cells;
  const avgLvl=(la+lb)/2;
  plan.roadCost=Math.round(g0.len*roadCostPerTile(spec.kind,lanes,avgLvl)+water*(spec.kind==="hwy"?20:8)+rough*3);
  plan.demolishCost=plan.demolish.reduce((s,b)=>s+demolishCost(b),0);
  plan.cost=spec.auto?0:plan.roadCost+plan.demolishCost;
  plan.ok=true;return plan}
function commitRoad(S,plan){
  if(!plan.ok)return {ok:false,msg:plan.msg};
  if(!plan.spec.auto&&S.money<plan.cost)return {ok:false,msg:"Málo peněz v pokladně."};
  S.money-=plan.cost;
  for(const b of plan.demolish)if(!b.dead)demolishBuilding(S,b,true);
  const sp=plan.spec,g0=plan.g,K=RK[sp.kind],lanes=plan.lanes;
  const seq=[{u:0,node:resolvePoint(S,sp.start.x,sp.start.y,sp.start.lvl)}];
  for(const j of plan.junctions)seq.push({u:j.ua,node:resolvePoint(S,j.x,j.y,j.lvl)});
  seq.push({u:g0.len,node:resolvePoint(S,sp.end.x,sp.end.y,sp.end.lvl)});
  const made=[];
  for(let k=0;k<seq.length-1;k++){const A=seq[k],B=seq[k+1];if(A.node===B.node||B.u-A.u<0.05)continue;
    const pts=subPts(g0,A.u,B.u);pts[0]=A.node.x;pts[1]=A.node.y;pts[pts.length-2]=B.node.x;pts[pts.length-1]=B.node.y;
    made.push(addEdge(S,A.node,B.node,sp.kind,pts,lanes,K.oneway?0:lanes,{auto:sp.auto}))}
  return {ok:true,edges:made}}
function buildRoad(S,spec){const p=planRoad(S,spec);if(!p.ok)return {ok:false,msg:p.msg,plan:p};const r=commitRoad(S,p);r.plan=p;return r}

// ---- kruhový objezd ----
function planRoundabout(S,cx,cy,r){
  const plan={ok:false,msg:"",cost:0,demolish:[],cx,cy,r,round:true};
  if(r<1.4){plan.msg="Kruhový objezd je moc malý.";return plan}
  if(cx-r<0.5||cy-r<0.5||cx+r>W-0.5||cy+r>H-0.5){plan.msg="Kruhový objezd se nevejde na mapu.";return plan}
  const pts=mkArc(cx,cy,r,0,Math.PI*2);const g=geom(pts);plan.g=g;const lanes=r>=3?2:1;plan.lanes=lanes;
  plan.cross=[];
  for(const e of S.edges){if(e.dead||!bbOverlap(e.g.bb,g.bb,0.2))continue;
    const xs=polyInter(g,e.g).filter(x=>lvlAt(S,e,x.ub)<0.5);
    if(xs.length&&e.kind==="hwy"){plan.msg="Kruhový objezd nejde postavit na dálnici.";return plan}
    for(const x of xs)plan.cross.push({x:x.x,y:x.y})}
  const w=lanes*LW+0.24;const cells=cellsAlong(S,g,w,()=>0);const dem=new Set();for(const c of cells){if(S.bld[c])dem.add(S.bld[c])}
  plan.demolish=[...dem];plan.cells=cells;
  plan.roadCost=Math.round(g.len*roadCostPerTile("road",lanes,0)*1.2+20);plan.demolishCost=plan.demolish.reduce((s,b)=>s+demolishCost(b),0);
  plan.cost=plan.roadCost+plan.demolishCost;plan.ok=true;return plan}
function commitRoundabout(S,plan){
  if(!plan.ok)return {ok:false,msg:plan.msg};if(S.money<plan.cost)return {ok:false,msg:"Málo peněz v pokladně."};
  S.money-=plan.cost;for(const b of plan.demolish)if(!b.dead)demolishBuilding(S,b,true);
  const {cx,cy,r}=plan;const ringNodes=[];
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
  for(const f of full){f.n.ring=true;f.n.x=cx+Math.cos(f.a)*r;f.n.y=cy+Math.sin(f.a)*r}
  const lanes=plan.lanes,made=[];
  for(let k=0;k<full.length;k++){const A=full[k],B=full[(k-1+full.length)%full.length];let a1=B.a;if(a1>=A.a)a1-=Math.PI*2;
    const pts=mkArc(cx,cy,r,A.a,a1);made.push(addEdge(S,A.n,B.n,"road",pts,lanes,0,{ring:true}))}
  for(const f of full)topoNode(S,f.n);
  S.rings.push({cx,cy,r,edges:made.map(e=>e.id)});
  return {ok:true,edges:made}}

// ---- úpravy úseku ----
function reshapeEdge(S,e,fn){killOnEdge(S,e.id);rasterEdge(S,e,false);fn();buildQueues(e);e.w=edgeWidth(e);rasterEdge(S,e,true);topoNode(S,S.nodes[e.a]);topoNode(S,S.nodes[e.b]);S.netDirty=true}
function planLanes(S,e,delta){const K=RK[e.kind];const total=e.lf+e.lb,one=e.lf===0||e.lb===0;
  const per=one?total:e.lf;const np=per+delta;if(e.ring)return {ok:false,msg:"Pruhy kruhového objezdu se nemění."};
  if(np<(one&&!K.oneway?Math.max(1,K.min):K.min)||np>(one&&!K.oneway?K.max*2:K.max))return {ok:false,msg:delta>0?"Víc pruhů tady nejde.":"Méně pruhů už nejde."};
  const w=(one?np:np*2)*LW+K.median+2*K.side;const cells=cellsAlong(S,e.g,w,u=>lvlAt(S,e,u));const dem=new Set();for(const c of cells)if(S.bld[c])dem.add(S.bld[c]);
  const cost=delta>0?Math.round(e.g.len*K.laneCost*(one?1:2)*0.5+[...dem].reduce((s,b)=>s+demolishCost(b),0)):0;
  return {ok:true,e,delta,cost,demolish:[...dem],lanesPlan:true}}
function commitLanes(S,p){if(!p.ok)return p;if(S.money<p.cost)return {ok:false,msg:"Málo peněz v pokladně."};S.money-=p.cost;for(const b of p.demolish)if(!b.dead)demolishBuilding(S,b,true);
  const e=p.e;reshapeEdge(S,e,()=>{if(e.lf===0){e.lb+=p.delta}else if(e.lb===0){e.lf+=p.delta}else{e.lf+=p.delta;e.lb+=p.delta}});return {ok:true}}
function kindLanes(e,kind){const K=RK[kind];const l=clamp(Math.max(e.lf,e.lb),K.min,K.max);if(K.oneway)return [l,0];if(e.lb===0||e.lf===0)return [clamp(e.lf+e.lb,K.min,K.max*2),0];return [l,l]}
function planKind(S,e,kind){if(e.ring||e.gateEdge)return {ok:false,msg:"Tenhle úsek změnit nejde."};if(kind===e.kind)return {ok:false,msg:"Úsek už je tohoto druhu."};const K=RK[kind];
  for(const nid of [e.a,e.b]){const n=S.nodes[nid];const kinds=n.arms.filter(a=>a.e!==e.id).map(a=>S.edges[a.e].kind).concat([kind]);
    if(kinds.length>=3&&kinds.includes("hwy")&&kinds.some(k=>k!=="hwy"&&k!=="ramp"))return {ok:false,msg:"Dálnice nemůže mít křižovatku. Napoj silnice nájezdem."}}
  const [lf,lb]=kindLanes(e,kind);const w=(lf+lb)*LW+K.median+2*K.side;const cells=cellsAlong(S,e.g,w,u=>lvlAt(S,e,u));const dem=new Set();for(const c of cells)if(S.bld[c])dem.add(S.bld[c]);
  if(kind==="hwy"&&S.buildings.some(b=>b.access&&b.access.e===e.id)){}
  const cost=Math.max(0,Math.round(e.g.len*(K.cost-RK[e.kind].cost)))+[...dem].reduce((s,b)=>s+demolishCost(b),0);
  return {ok:true,e,kind,lf,lb,cost,demolish:[...dem],kindPlan:true}}
function commitKind(S,p){if(!p.ok)return p;if(S.money<p.cost)return {ok:false,msg:"Málo peněz v pokladně."};S.money-=p.cost;for(const b of p.demolish)if(!b.dead)demolishBuilding(S,b,true);
  const e=p.e;reshapeEdge(S,e,()=>{e.kind=p.kind;e.lf=p.lf;e.lb=p.lb});return {ok:true}}
function setKind(S,e,kind){return commitKind(S,planKind(S,e,kind))}
function cycleOneway(S,e){if(e.ring)return {ok:false,msg:"Kruhový objezd je jednosměrný sám."};
  reshapeEdge(S,e,()=>{const K=RK[e.kind];
    if(e.lb>0&&e.lf>0){e.lf=e.lf+e.lb;e.lb=0;e.owState=1}
    else if(e.owState===1||K.oneway){const t=e.a;e.a=e.b;e.b=t;e.g=geom(reversePts(e.g.pts));e.owState=2;
      for(const nid of [e.a,e.b]){const n=S.nodes[nid]}}
    else{const l=Math.max(K.min,Math.ceil(e.lf/2));e.lf=l;e.lb=l;e.owState=0}});
  return {ok:true,state:e.lb===0?(e.owState===2?"Jednosměrka opačně":"Jednosměrka"):"Obousměrná"}}
function setControl(S,n,ctl,pair){if(n.edges.length<3||n.ring)return {ok:false,msg:"Tohle není obyčejná křižovatka."};
  if(n.arms.some(a=>S.edges[a.e].kind==="hwy"))return {ok:false,msg:"Napojení na dálnici se řídí samo."};
  const cost=ctl===3&&n.ctl!==3?60:0;if(S.money<cost)return {ok:false,msg:"Málo peněz v pokladně."};S.money-=cost;
  n.ctl=ctl;n.mainManual=ctl===2?pair:null;topoNode(S,n);return {ok:true}}
function eraseEdge(S,e){if(e.gateEdge)return {ok:false,msg:"Dálnici do světa zbourat nejde."};
  const refund=Math.round(e.g.len*RK[e.kind].cost*0.2);removeEdge(S,e);S.money+=refund;
  if(e.ring){for(const id of [e.a,e.b]){const n=S.nodes[id];if(!n.edges.some(x=>S.edges[x].ring))n.ring=false;topoNode(S,n)}}
  return {ok:true,refund}}
function computeNet(S){
  for(const n of S.nodes)n.comp=-1;let id=0;
  for(const n of S.nodes){if(n.dead||n.comp>=0)continue;const st=[n];n.comp=id;
    while(st.length){const a=st.pop();for(const eid of a.edges){const e=S.edges[eid];const o=S.nodes[e.a===a.id?e.b:e.a];if(o.comp<0){o.comp=id;st.push(o)}}}id++}
  S.netDirty=false}
const edgeComp=(S,eid)=>S.nodes[S.edges[eid].a].comp;
