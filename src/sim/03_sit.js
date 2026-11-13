// Silniční síť: uzly (křižovatky, konce, body na kruhu, ruční rozdělení) a úseky mezi nimi.
// Úsek má druh, počty pruhů lf (směr a→b, vpravo od osy) a lb (b→a, vlevo), geometrii a úroveň danou uzly.
// Pruhy se počítají po směrech zvlášť, takže silnice může mít na jedné straně pruh navíc.

// rozsah vozovky od osy: [vpravo, vlevo] včetně chodníku
function edgeExt(e){const K=RK[e.kind];if(e.lf===0||e.lb===0){const h=(e.lf+e.lb)*LW/2+K.side;return [h,h]}const m=K.median/2+K.side;return [m+e.lf*LW,m+e.lb*LW]}
function edgeWidth(e){const x=edgeExt(e);return x[0]+x[1]}
function setWidth(e){const x=edgeExt(e);e.er=x[0];e.el=x[1];e.w=x[0]+x[1]}
function lvlAt(S,e,u){const a=S.nodes[e.a].lvl,b=S.nodes[e.b].lvl;return a+(b-a)*clamp(u/(e.g.len||1),0,1)}
function addNode(S,x,y,lvl){const n={id:S.nodes.length,x,y,lvl,edges:[],ctl:0,mainManual:null,light:null,ring:0,gate:-1,dead:false,keep:false,rad:0,
  turns:new Map(),arms:[],eff:"none",mainEdges:null,armLast:new Map(),comp:-1};S.nodes.push(n);return n}
function findNode(S,x,y,lvl,r){let best=null,bd=r;for(const n of S.nodes){if(n.dead||Math.abs(n.lvl-lvl)>=0.5)continue;const d=Math.hypot(n.x-x,n.y-y);if(d<bd){bd=d;best=n}}return best}
function edgesNear(S,x,y,r){const out=new Set();for(let cy=Math.floor(y-r);cy<=Math.floor(y+r);cy++)for(let cx=Math.floor(x-r);cx<=Math.floor(x+r);cx++){const c=cellAt(cx+0.5,cy+0.5);if(c<0)continue;
  const a=S.cellG[c],b=S.cellB[c];if(a)for(const id of a)out.add(id);if(b)for(const id of b)out.add(id)}return [...out].map(id=>S.edges[id]).filter(e=>!e.dead)}
function netChanged(S){S.netDirty=true;S.netVer=(S.netVer||0)+1}

function rasterEdge(S,e,add){
  if(add){const g=new Set(),b=new Set();const r=Math.max(e.er,e.el)+0.22;const p=e.g.pts;
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
  const e={id:S.edges.length,a:a.id,b:b.id,kind,lf,lb,g:geom(pts),ring:opts.ring||0,auto:!!opts.auto,gateEdge:!!opts.gate,dead:false,
    q:null,cong:[0,0],flow:0,passes:0,cellsG:[],cellsB:[],born:S.time,owState:opts.owState||0};
  buildQueues(e);setWidth(e);a.dead=false;b.dead=false;
  S.edges.push(e);a.edges.push(e.id);b.edges.push(e.id);
  rasterEdge(S,e,true);topoNode(S,a);topoNode(S,b);netChanged(S);return e}
// quiet = auta a chodce už přenesl remapEdges, nic se neruší
function removeEdge(S,e,quiet){if(e.dead)return;if(!quiet)killOnEdge(S,e.id);rasterEdge(S,e,false);e.dead=true;
  for(const nid of [e.a,e.b]){const n=S.nodes[nid];n.edges=n.edges.filter(x=>x!==e.id);if(!n.edges.length&&n.gate<0)n.dead=true;else topoNode(S,n)}
  netChanged(S)}
const edgeProps=e=>({ring:e.ring,auto:e.auto,gate:e.gateEdge,owState:e.owState});
// rozdělí úsek v bodě u; auta a chodci zůstanou, kde jsou. Vrací uzel a oba nové kusy.
function splitEdgeR(S,e,u,keep){
  if(u<0.3)return {node:S.nodes[e.a],e1:null,e2:e};if(e.g.len-u<0.3)return {node:S.nodes[e.b],e1:e,e2:null};
  const q=pointAt(e.g,u),lv=lvlAt(S,e,u),n=addNode(S,q.x,q.y,lv);n.ring=e.ring;n.keep=!!keep;
  const [pa,pb]=splitPts(e.g,u);const a=S.nodes[e.a],b=S.nodes[e.b];
  pa[pa.length-2]=n.x;pa[pa.length-1]=n.y;pb[0]=n.x;pb[1]=n.y;
  const e1=addEdge(S,a,n,e.kind,pa,e.lf,e.lb,edgeProps(e)),e2=addEdge(S,n,b,e.kind,pb,e.lf,e.lb,edgeProps(e));
  remapEdges(S,new Map([[e.id,[{e:e1,u0:0,u1:u,off:0,rev:false},{e:e2,u0:u,u1:e.g.len,off:0,rev:false}]]]));
  removeEdge(S,e,true);return {node:n,e1,e2}}
function splitEdge(S,e,u,keep){return splitEdgeR(S,e,u,keep).node}
// uzel v daném místě: existující uzel, rozdělený úsek, nebo nový uzel
function resolvePoint(S,x,y,lvl){const n=findNode(S,x,y,lvl,0.32);if(n)return n;
  let best=null,bd=0.09,bu=0;for(const e of edgesNear(S,x,y,1)){const r=nearestOn(e.g,x,y);if(Math.abs(lvlAt(S,e,r.u)-lvl)>=0.5)continue;if(r.d<bd){bd=r.d;best=e;bu=r.u}}
  if(best)return splitEdge(S,best,bu);return addNode(S,x,y,lvl)}

// ---- spojování navazujících úseků ----
// tečna úseku v uzlu, směrem ven z uzlu
function tanOut(e,atA){const g=e.g;if(atA){const p=pointAt(g,0);return [p.tx,p.ty]}const p=pointAt(g,g.len);return [-p.tx,-p.ty]}
function canMerge(S,n){if(n.dead||n.keep||n.gate>=0||n.ring||n.edges.length!==2)return null;
  const e1=S.edges[n.edges[0]],e2=S.edges[n.edges[1]];if(e1===e2||e1.ring||e2.ring||e1.gateEdge||e2.gateEdge||e1.kind!==e2.kind)return null;
  const r1=e1.b!==n.id,r2=e2.a!==n.id; // r1: e1 vede z n ven (je otočený vůči směru a→n)
  const a=S.nodes[r1?e1.b:e1.a],b=S.nodes[r2?e2.a:e2.b];if(a===b)return null;
  if(Math.abs(a.lvl-n.lvl)>0.01||Math.abs(b.lvl-n.lvl)>0.01)return null;
  const f1=r1?e1.lb:e1.lf,b1=r1?e1.lf:e1.lb,f2=r2?e2.lb:e2.lf,b2=r2?e2.lf:e2.lb;if(f1!==f2||b1!==b2)return null;
  const t1=tanOut(e1,e1.a===n.id),t2=tanOut(e2,e2.a===n.id);if(t1[0]*t2[0]+t1[1]*t2[1]>-0.995)return null;
  return {e1,e2,a,b,r1,r2,lf:f1,lb:b1}}
function mergeAt(S,n){const m=canMerge(S,n);if(!m)return null;const {e1,e2,a,b,r1,r2}=m;
  const p1=r1?reversePts(e1.g.pts):e1.g.pts.slice(),p2=r2?reversePts(e2.g.pts):e2.g.pts;
  const pts=cleanPts(p1.concat(p2.slice(2)));
  const ne=addEdge(S,a,b,e1.kind,pts,m.lf,m.lb,{auto:e1.auto&&e2.auto,owState:e1.owState});
  const L1=e1.g.len,L2=e2.g.len;
  remapEdges(S,new Map([[e1.id,[{e:ne,u0:0,u1:L1,off:0,rev:r1}]],[e2.id,[{e:ne,u0:0,u1:L2,off:L1,rev:r2}]]]));
  removeEdge(S,e1,true);removeEdge(S,e2,true);return ne}
// po stavbě nebo úpravě spojí rovně navazující úseky stejného druhu v zadaných uzlech
function tidyNodes(S,nodes){for(const n of nodes)if(n&&!n.dead)mergeAt(S,n)}

// ---- přenos aut, chodců a vjezdů na nové úseky ----
// map: id starého úseku → kusy [{e, u0, u1, off, rev}] seřazené podle u0; kus kryje staré u0..u1,
// nová poloha = off + (rev ? u1-u : u-u0)
function remapEdges(S,map){
  const has=l=>map.has(l>>1);
  const pieceAt=(ps,u)=>{let k=0;while(k<ps.length-1&&u>ps[k].u1)k++;return ps[k]};
  const nu=(p,u)=>clamp(p.off+(p.rev?p.u1-u:u-p.u0),0,p.e.g.len);
  const linkOf=(p,d)=>p.e.id*2+(d^(p.rev?1:0));
  const uOf=(l,s)=>{const e=S.edges[l>>1];return clamp((l&1)?e.g.len-s:s,0,e.g.len)};
  const sOn=(l,u)=>{const L=S.edges[l>>1].g.len;return (l&1)?L-u:u};
  const mapEp=ep=>{if(!ep||ep.e===undefined||!map.has(ep.e))return ep;const ps=map.get(ep.e),p=pieceAt(ps,ep.u);
    return {e:p.e.id,u:nu(p,ep.u),side:p.rev?-ep.side:ep.side,x:ep.x,y:ep.y}};
  // přepíše trasu od indexu i0 (s = poloha na něm), sEnd = cíl na posledním odkazu
  const rewrite=(links,i0,s,sEnd)=>{const out=[];let ns=s,nEnd=sEnd;const last=links.length-1;
    for(let k=i0;k<=last;k++){const l=links[k];
      if(!has(l)){if(out[out.length-1]!==l)out.push(l);continue}
      const ps=map.get(l>>1),d=l&1;let list=d?[...ps].reverse():ps.slice();
      if(k===i0){const u=uOf(l,s),p=pieceAt(ps,u),i=list.indexOf(p);if(i>0)list=list.slice(i);ns=sOn(linkOf(p,d),nu(p,u))}
      if(k===last){const u=uOf(l,sEnd),p=pieceAt(ps,u),i=list.indexOf(p);if(i>=0)list=list.slice(0,i+1);nEnd=sOn(linkOf(p,d),nu(p,u))}
      for(const p of list){const nl=linkOf(p,d);if(out[out.length-1]!==nl)out.push(nl)}}
    return {out,ns,nEnd}};
  const touches=(links,i0)=>{for(let k=i0;k<links.length;k++)if(has(links[k]))return true;return false};
  for(const c of S.cars){if(c.dead||(c.state!=="drive"&&c.state!=="exit"))continue;
    c.startEp=mapEp(c.startEp);c.goalEp=mapEp(c.goalEp);
    const i0=c.state==="drive"?c.li:0;if(!touches(c.links,i0))continue;
    const cur=has(c.links[i0]);if(cur&&c.state==="drive")removeQ(S,c);
    const r=rewrite(c.links,i0,c.s,c.sEnd);
    c.links=c.links.slice(0,i0).concat(r.out);c.s=r.ns;c.sEnd=r.nEnd;
    if(cur){const l=c.links[i0];const L=linkLanes(S,l);if(!L){if(c.state==="drive")c.state="exit";killVehicle(S,c);continue}
      c.lane=Math.min(c.lane,L-1);if(c.state==="drive")insertQ(S.edges[l>>1].q[l&1][c.lane],c)}}
  for(const w of S.walkers){if(w.dead||!touches(w.links,w.li))continue;const r=rewrite(w.links,w.li,w.s,w.sEnd);w.links=w.links.slice(0,w.li).concat(r.out);w.s=r.ns;w.sEnd=r.nEnd}
  for(const b of S.buildings)if(b.access&&map.has(b.access.e))b.access=mapEp(b.access);
  for(const [oid,ps] of map){const old=S.edges[oid];
    for(const nid of [old.a,old.b]){const n=S.nodes[nid];if(!n.mainManual||!n.mainManual.includes(oid))continue;
      const p=ps.find(p=>p.e.a===nid||p.e.b===nid);n.mainManual=n.mainManual.map(id=>id===oid&&p?p.e.id:id)}}}

// rameno uzlu: směr ven podél úseku, příjezdový a odjezdový směr (link = id úseku*2 + směr)
function armOf(S,n,eid){const e=S.edges[eid];const atA=e.a===n.id;const g=e.g;const u=atA?Math.min(0.5,g.len*0.3):Math.max(g.len-0.5,g.len*0.7);
  const p=pointAt(g,u);let hx=p.x-n.x,hy=p.y-n.y;const l=Math.hypot(hx,hy)||1;hx/=l;hy/=l;
  return {e:eid,hx,hy,inLink:eid*2+(atA?1:0),outLink:eid*2+(atA?0:1),axis:Math.abs(hx)>=Math.abs(hy)?0:1}}
const linkLanes=(S,l)=>{const e=S.edges[l>>1];return (l&1)?e.lb:e.lf};
const linkFrom=(S,l)=>{const e=S.edges[l>>1];return (l&1)?e.b:e.a};
const linkTo=(S,l)=>{const e=S.edges[l>>1];return (l&1)?e.a:e.b};
function topoNode(S,n){
  n.arms=n.edges.map(id=>armOf(S,n,id));const deg=n.arms.length;
  const isH=e=>e.kind==="hwy";
  const hw=n.arms.filter(a=>isH(S.edges[a.e])).length;
  n.rad=0;if(deg>=3)for(const a of n.arms){const e=S.edges[a.e];n.rad=Math.max(n.rad,e.er,e.el)}
  n.turns=new Map();
  for(const ai of n.arms){if(!linkLanes(S,ai.inLink))continue;const list=[];const hix=-ai.hx,hiy=-ai.hy;const ei=S.edges[ai.e];
    for(const ao of n.arms){if(!linkLanes(S,ao.outLink))continue;const eo=S.edges[ao.e];
      if(ao.e===ai.e&&deg>1)continue;
      const cr=hix*ao.hy-hiy*ao.hx,dt=hix*ao.hx+hiy*ao.hy;
      const turn=ao.e===ai.e?2:(cr>0.35?1:cr<-0.35?-1:0);
      if(isH(ei)&&isH(eo)&&dt<0.3)continue;
      if(hw>=2){ // napojení z boku dálnice: sjet jen vpravo, najet jen ve směru jízdy, dálnici nepřejet
        if(isH(ei)&&!isH(eo)&&cr<0.05)continue;
        if(!isH(ei)&&isH(eo)&&(ai.hx*(-ao.hy)+ai.hy*ao.hx)<0.05)continue;
        if(!isH(ei)&&!isH(eo))continue}
      if(n.ring&&!ei.ring&&!eo.ring)continue;
      list.push({link:ao.outLink,turn})}
    n.turns.set(ai.inLink,list)}
  n.mainEdges=null;
  if(n.ring&&n.arms.some(a=>S.edges[a.e].ring))n.eff="ring";
  else if(deg<3)n.eff="none";
  else if(hw){n.eff="merge";n.mainEdges=new Set(n.arms.filter(a=>isH(S.edges[a.e])).map(a=>a.e))}
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
  if(kind!=="hwy")return null;
  if(sn.type==="edge"&&S.edges[sn.edge].ring||sn.type==="node"&&S.nodes[sn.node].ring)return "Dálnice nemůže vést do kruhového objezdu.";
  return null}
function cellsAlong(S,g,w,lvlFn){const r=w/2+0.22,set=new Set();const p=g.pts;
  for(let k=0;k<g.n;k++){if(lvlFn(g.cum[k])>=0.5)continue;const x=p[2*k],y=p[2*k+1];
    for(let cy=Math.floor(y-r);cy<=Math.floor(y+r);cy++)for(let cx=Math.floor(x-r);cx<=Math.floor(x+r);cx++){if(cx<0||cy<0||cx>=W||cy>=H)continue;if(Math.hypot(cx+0.5-x,cy+0.5-y)<=r+0.08)set.add(cy*W+cx)}}
  return [...set]}
function bldOn(S,cells){const dem=new Set();for(const c of cells)if(S.bld[c])dem.add(S.bld[c]);return [...dem]}
function roadCostPerTile(kind,lanes,lvl){const K=RK[kind];return (K.cost+K.laneCost*Math.max(0,lanes-K.lanes))*(1+1.6*lvl)}
// kolik nové trasy vede po existující silnici ve stejné výšce a stejným směrem
function roadCover(S,g0,lvlFn,trimA,trimB){const segs=new Map();let cov=0,tot=0;const st=0.2;
  const us=[];for(let u=0.1;u<g0.len-0.05;u+=st)us.push(u);
  const inner=us.filter(u=>u>=trimA&&u<=g0.len-trimB);const list=inner.length>=3?inner:us;
  for(const u of list){tot++;const p=pointAt(g0,u);let best=null,bd=0.3;
    for(const e of edgesNear(S,p.x,p.y,0.6)){const r=nearestOn(e.g,p.x,p.y);if(r.d>=bd)continue;if(Math.abs(lvlAt(S,e,r.u)-lvlFn(u))>=0.5)continue;
      const q=pointAt(e.g,r.u);const dot=q.tx*p.tx+q.ty*p.ty;if(Math.abs(dot)<0.9)continue;bd=r.d;best={e,u:r.u,dot}}
    if(!best)continue;cov++;let s=segs.get(best.e.id);if(!s){s={e:best.e,u0:1e9,u1:-1e9,same:0};segs.set(best.e.id,s)}
    s.u0=Math.min(s.u0,best.u);s.u1=Math.max(s.u1,best.u);s.same+=best.dot>0?1:-1}
  return {frac:tot?cov/tot:0,len:cov*st,segs:[...segs.values()]}}
function newLanesFor(e,kind,lanes,same){const K=RK[kind];if(K.oneway)return same?[lanes,0]:[0,lanes];return [lanes,lanes]}
function planRoad(S,spec){
  const K=RK[spec.kind];const lanes=clamp(spec.lanes||K.lanes,K.min,K.max);
  const plan={ok:false,msg:"",cost:0,demolish:[],junctions:[],spec,lanes,bad:null,start:spec.start,end:spec.end};
  let g0=geom(spec.pts);plan.g=g0;
  if(g0.len<0.8){plan.msg="Silnice je moc krátká.";return plan}
  for(let k=0;k<g0.n;k++){const x=g0.pts[2*k],y=g0.pts[2*k+1];if(x<0||y<0||x>W||y>H){plan.msg="Silnice nesmí vést mimo mapu.";return plan}}
  const la=spec.start.lvl,lb=spec.end.lvl,lvlNew=u=>la+(lb-la)*u/g0.len;
  for(const sn of [spec.start,spec.end]){const err=checkJoin(S,sn,spec.kind);if(err){plan.msg=err;plan.bad=sn;return plan}}
  if(spec.start.type==="node"&&spec.end.type==="node"&&spec.start.node===spec.end.node){plan.msg="Začátek a konec jsou stejný bod.";return plan}
  // táhne po existující silnici → přestavba místo druhé silnice přes první
  if(!spec.auto){const cv=roadCover(S,g0,lvlNew,spec.start.type==="free"?0:0.6,spec.end.type==="free"?0:0.6);
    if(cv.frac>=0.8)return planRebuild(S,plan,cv);
    if(cv.len>=1.5){plan.msg="Tady už silnice vede. Táhni po celém úseku, který chceš přestavět, nebo veď silnici jinudy.";return plan}}
  for(const e of S.edges){if(e.dead||!bbOverlap(e.g.bb,g0.bb,0.1))continue;
    for(const x of polyInter(g0,e.g)){
      if(x.ua<0.45&&joinedTo(S,spec.start,e))continue;if(g0.len-x.ua<0.45&&joinedTo(S,spec.end,e))continue;
      const l1=lvlNew(x.ua),l2=lvlAt(S,e,x.ub);if(Math.abs(l1-l2)>=0.5)continue;
      if(e.kind==="hwy"||spec.kind==="hwy"){plan.msg="Dálnici nejde křížit v úrovni. Zvol most.";plan.bad={x:x.x,y:x.y};return plan}
      plan.junctions.push({ua:x.ua,x:x.x,y:x.y,lvl:l2})}}
  plan.junctions.sort((a,b)=>a.ua-b.ua);
  plan.junctions=plan.junctions.filter((j,k,a)=>k===0||j.ua-a[k-1].ua>0.4);
  // volný konec těsně za jinou silnicí: konec se posune na ni, nezůstane pahýl
  const J=plan.junctions;
  if(spec.end.type==="free"&&J.length&&g0.len-J[J.length-1].ua<0.6){const j=J.pop();g0=geom(subPts(g0,0,j.ua));plan.end={type:"edge",x:j.x,y:j.y,lvl:j.lvl}}
  if(spec.start.type==="free"&&J.length&&J[0].ua<0.6){const j=J.shift();const u0=j.ua;g0=geom(subPts(g0,u0,g0.len));for(const q of J)q.ua-=u0;plan.start={type:"edge",x:j.x,y:j.y,lvl:j.lvl}}
  plan.g=g0;if(g0.len<0.5){plan.msg="Silnice je moc krátká.";return plan}
  const w=lanes*(K.oneway?1:2)*LW+K.median+2*K.side;
  const lvlFix=u=>la+(lb-la)*u/g0.len;
  const cells=cellsAlong(S,g0,w,lvlFix);let water=0,rough=0;
  for(const c of cells){if(S.terrain[c]===WATER)water++;else if(S.terrain[c]!==GRASS)rough++}
  const dem=bldOn(S,cells);for(const b of dem)if(b.gateLock){plan.msg="Tady stavět nejde.";return plan}
  plan.demolish=dem;plan.cells=cells;
  const avgLvl=(la+lb)/2;
  plan.roadCost=Math.round(g0.len*roadCostPerTile(spec.kind,lanes,avgLvl)+water*(spec.kind==="hwy"?20:8)+rough*3);
  plan.demolishCost=plan.demolish.reduce((s,b)=>s+demolishCost(b),0);
  plan.cost=spec.auto?0:plan.roadCost+plan.demolishCost;
  plan.ok=true;return plan}
function planRebuild(S,plan,cv){const sp=plan.spec,K=RK[sp.kind],lanes=plan.lanes;
  const segs=[];let cost=0;const cells=new Set();let change=false;
  for(const s of cv.segs){const e=s.e;if(s.u1-s.u0<0.4)continue;
    if(e.gateEdge){plan.msg="Dálnici do světa přestavět nejde.";return plan}
    if(e.ring){plan.msg="Kruhový objezd přestavíš výběrem (Ruka) nebo nástrojem Pruhy.";return plan}
    let u0=s.u0<1?0:s.u0-0.1,u1=e.g.len-s.u1<1?e.g.len:s.u1+0.1;
    const [lf,lb]=newLanesFor(e,sp.kind,lanes,s.same>=0);
    if(e.kind!==sp.kind||e.lf!==lf||e.lb!==lb)change=true;
    const len=u1-u0,lvl=lvlAt(S,e,(u0+u1)/2);
    cost+=Math.max(0,Math.round(len*(roadCostPerTile(sp.kind,Math.max(lf,lb),lvl)-roadCostPerTile(e.kind,Math.max(e.lf,e.lb),lvl))));
    const x=edgeExt({kind:sp.kind,lf,lb});const g=geom(subPts(e.g,u0,u1));for(const c of cellsAlong(S,g,2*Math.max(x[0],x[1]),u=>lvlAt(S,e,u0+u)))cells.add(c);
    segs.push({e,u0,u1,lf,lb})}
  if(!segs.length){plan.msg="Tady už silnice vede.";return plan}
  if(!change){plan.msg="Tady už taková silnice je.";return plan}
  plan.rebuild=segs;plan.junctions=[];plan.demolish=bldOn(S,cells);
  for(const b of plan.demolish)if(b.gateLock){plan.msg="Tady stavět nejde.";return plan}
  plan.roadCost=cost;plan.demolishCost=plan.demolish.reduce((s,b)=>s+demolishCost(b),0);plan.cost=plan.roadCost+plan.demolishCost;plan.ok=true;return plan}
// vybere kus úseku u0..u1: případně ho na koncích rozdělí, vrací prostřední úsek
function cutSection(S,e,u0,u1,keep){let t=e;
  if(u1<e.g.len-0.3){const r=splitEdgeR(S,t,u1,keep);t=r.e1||t}
  if(u0>0.3){const r=splitEdgeR(S,t,u0,keep);t=r.e2||t}
  return t}
function commitRoad(S,plan){
  if(!plan.ok)return {ok:false,msg:plan.msg};
  if(!plan.spec.auto&&S.money<plan.cost)return {ok:false,msg:"Málo peněz v pokladně."};
  S.money-=plan.cost;
  for(const b of plan.demolish)if(!b.dead)demolishBuilding(S,b,true);
  const sp=plan.spec;
  if(plan.rebuild){const touched=[];
    for(const s of plan.rebuild){if(s.e.dead)continue;const t=cutSection(S,s.e,s.u0,s.u1);
      reshapeEdge(S,t,()=>{t.kind=sp.kind;t.lf=s.lf;t.lb=s.lb;t.owState=0});touched.push(S.nodes[t.a],S.nodes[t.b])}
    tidyNodes(S,touched);return {ok:true,edges:[],rebuilt:true}}
  const g0=plan.g,K=RK[sp.kind],lanes=plan.lanes;
  const seq=[{u:0,node:resolvePoint(S,plan.start.x,plan.start.y,plan.start.lvl)}];
  for(const j of plan.junctions)seq.push({u:j.ua,node:resolvePoint(S,j.x,j.y,j.lvl)});
  seq.push({u:g0.len,node:resolvePoint(S,plan.end.x,plan.end.y,plan.end.lvl)});
  const made=[];
  for(let k=0;k<seq.length-1;k++){const A=seq[k],B=seq[k+1];if(A.node===B.node||B.u-A.u<0.05)continue;
    const pts=subPts(g0,A.u,B.u);pts[0]=A.node.x;pts[1]=A.node.y;pts[pts.length-2]=B.node.x;pts[pts.length-1]=B.node.y;
    made.push(addEdge(S,A.node,B.node,sp.kind,pts,lanes,K.oneway?0:lanes,{auto:sp.auto}))}
  tidyNodes(S,seq.map(q=>q.node));
  return {ok:true,edges:made.filter(e=>!e.dead)}}
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
  const w=lanes*LW+0.24;const cells=cellsAlong(S,g,w,()=>0);
  plan.demolish=bldOn(S,cells);plan.cells=cells;
  plan.roadCost=Math.round(g.len*roadCostPerTile("road",lanes,0)*1.2+20);plan.demolishCost=plan.demolish.reduce((s,b)=>s+demolishCost(b),0);
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
    const pts=mkArc(cx,cy,r,A.a,a1);made.push(addEdge(S,A.n,B.n,"road",pts,lanes,0,{ring:rid}))}
  for(const f of full)topoNode(S,f.n);
  S.rings.push({id:rid,cx,cy,r});
  return {ok:true,edges:made}}
const ringEdges=(S,rid)=>S.edges.filter(e=>!e.dead&&e.ring===rid);

// ---- úpravy úseku ----
// změní druh nebo pruhy úseku; auta zůstanou ve svých pruzích (krajní pruh se sloučí), hard = otočení směru
function reshapeEdge(S,e,fn,hard){
  if(hard)killOnEdge(S,e.id);
  const on=[];if(!hard)for(const c of S.cars){if(c.dead)continue;const l=c.state==="drive"?c.links[c.li]:c.state==="exit"?c.links[0]:-1;if(l>=0&&(l>>1)===e.id){if(c.state==="drive")removeQ(S,c);on.push(c)}}
  rasterEdge(S,e,false);fn();buildQueues(e);setWidth(e);rasterEdge(S,e,true);topoNode(S,S.nodes[e.a]);topoNode(S,S.nodes[e.b]);netChanged(S);
  for(const c of on){const l=c.state==="drive"?c.links[c.li]:c.links[0];const L=linkLanes(S,l);if(!L){killVehicle(S,c);continue}
    c.lane=Math.min(c.lane,L-1);if(c.state==="drive")insertQ(e.q[l&1][c.lane],c)}
  if(!hard){for(const c of S.cars){if(c.dead)continue;for(let k=c.li+1;k<c.links.length;k++)if((c.links[k]>>1)===e.id&&!linkLanes(S,c.links[k])){S.reroute.push(c);break}}
    if(!RK[e.kind].walk)for(const w of S.walkers){if(w.dead)continue;for(let k=w.li;k<w.links.length;k++)if((w.links[k]>>1)===e.id){w.dead=true;walkerArrived(S,w,true);break}}}}
// skupina úseků, kterých se úprava týká: kruhový objezd celý, jinak jen úsek
const editGroup=(S,e)=>e.ring?ringEdges(S,e.ring):[e];
function lanesAfter(e,delta,dir){const K=RK[e.kind];
  if(e.lf===0||e.lb===0){const n=e.lf+e.lb+delta;const mn=K.oneway||e.ring?K.min:1,mx=e.ring?3:K.oneway?K.max:K.max*2;if(n<mn||n>mx)return null;return e.lf?[n,0]:[0,n]}
  const lf=e.lf+(dir===undefined||dir===0?delta:0),lb=e.lb+(dir===undefined||dir===1?delta:0);
  if(lf<K.min||lb<K.min||lf>K.max||lb>K.max)return null;return [lf,lb]}
// pruh navíc nebo méně; dir = jen jeden směr (0 = a→b), range = jen část úseku [u0,u1]
function planLanes(S,e,delta,dir,range){const grp=editGroup(S,e);const items=[];let cost=0;const cells=new Set();
  if(e.gateEdge)return {ok:false,msg:"Dálnici do světa měnit nejde."};
  if(e.ring)range=null;
  if(range){range=[Math.max(0,Math.min(range[0],range[1])),Math.min(e.g.len,Math.max(range[0],range[1]))];if(range[0]<0.5)range[0]=0;if(e.g.len-range[1]<0.5)range[1]=e.g.len;if(range[1]-range[0]<0.8)range=null}
  for(const x of grp){const nl=lanesAfter(x,delta,x.lf===0||x.lb===0?undefined:dir);if(!nl)return {ok:false,msg:delta>0?"Víc pruhů tady nejde.":"Méně pruhů už nejde."};
    const u0=range?range[0]:0,u1=range?range[1]:x.g.len;const ext=edgeExt({kind:x.kind,lf:nl[0],lb:nl[1]});
    const g=range?geom(subPts(x.g,u0,u1)):x.g;for(const c of cellsAlong(S,g,2*Math.max(ext[0],ext[1]),u=>lvlAt(S,x,u0+u)))cells.add(c);
    const added=Math.max(0,nl[0]-x.lf)+Math.max(0,nl[1]-x.lb);cost+=Math.round((u1-u0)*RK[x.kind].laneCost*added*0.5);items.push({e:x,lf:nl[0],lb:nl[1]})}
  const dem=bldOn(S,cells);if(delta>0)cost+=dem.reduce((s,b)=>s+demolishCost(b),0);else cost=0;
  return {ok:true,e,items,delta,dir,range,cost,demolish:dem,lanesPlan:true}}
function commitLanes(S,p){if(!p.ok)return p;if(S.money<p.cost)return {ok:false,msg:"Málo peněz v pokladně."};S.money-=p.cost;for(const b of p.demolish)if(!b.dead)demolishBuilding(S,b,true);
  const touched=[];
  for(const it of p.items){if(it.e.dead)continue;const t=p.range?cutSection(S,it.e,p.range[0],p.range[1]):it.e;
    reshapeEdge(S,t,()=>{t.lf=it.lf;t.lb=it.lb});touched.push(S.nodes[t.a],S.nodes[t.b])}
  tidyNodes(S,touched);return {ok:true}}
function kindLanes(e,kind){const K=RK[kind];const l=clamp(Math.max(e.lf,e.lb),K.min,K.max);
  if(K.oneway){const n=clamp(e.lf+e.lb>0&&(e.lf===0||e.lb===0)?e.lf+e.lb:l,K.min,K.max);return e.lf===0?[0,n]:[n,0]}
  if(e.ring)return [clamp(e.lf,1,3),0];
  if(e.lb===0||e.lf===0){const n=clamp(e.lf+e.lb,K.min,K.max*2);return e.lf===0?[0,n]:[n,0]}
  return [clamp(e.lf,K.min,K.max),clamp(e.lb,K.min,K.max)]}
function planKind(S,e,kind){if(e.gateEdge)return {ok:false,msg:"Dálnici do světa měnit nejde."};if(kind===e.kind)return {ok:false,msg:"Úsek už je tohoto druhu."};
  if(e.ring&&(kind==="hwy"||kind==="ramp"))return {ok:false,msg:"Kruhový objezd může být ulice, silnice nebo bulvár."};
  const K=RK[kind];const grp=editGroup(S,e);const items=[];let cost=0;const cells=new Set();
  for(const x of grp){const [lf,lb]=kindLanes(x,kind);const ext=edgeExt({kind,lf,lb});
    for(const c of cellsAlong(S,x.g,2*Math.max(ext[0],ext[1]),u=>lvlAt(S,x,u)))cells.add(c);
    cost+=Math.max(0,Math.round(x.g.len*(K.cost-RK[x.kind].cost)));items.push({e:x,lf,lb})}
  const dem=bldOn(S,cells);cost+=dem.reduce((s,b)=>s+demolishCost(b),0);
  return {ok:true,e,kind,items,cost,demolish:dem,kindPlan:true}}
function commitKind(S,p){if(!p.ok)return p;if(S.money<p.cost)return {ok:false,msg:"Málo peněz v pokladně."};S.money-=p.cost;for(const b of p.demolish)if(!b.dead)demolishBuilding(S,b,true);
  const touched=[];for(const it of p.items){if(it.e.dead)continue;const t=it.e;reshapeEdge(S,t,()=>{t.kind=p.kind;t.lf=it.lf;t.lb=it.lb});touched.push(S.nodes[t.a],S.nodes[t.b])}
  tidyNodes(S,touched);return {ok:true}}
function setKind(S,e,kind){return commitKind(S,planKind(S,e,kind))}
function cycleOneway(S,e){if(e.ring)return {ok:false,msg:"Kruhový objezd je jednosměrný sám."};if(e.gateEdge)return {ok:false,msg:"Dálnici do světa měnit nejde."};
  const K=RK[e.kind];const two=e.lb>0&&e.lf>0;const flip=!two&&e.lf>0&&(e.owState===1||K.oneway);
  reshapeEdge(S,e,()=>{
    if(two){e.lf=e.lf+e.lb;e.lb=0;e.owState=1}
    else if(e.lf===0){e.lf=e.lb;e.lb=0;e.owState=2}
    else if(flip){const t=e.a;e.a=e.b;e.b=t;e.g=geom(reversePts(e.g.pts));e.owState=2;
      for(const nid of [e.a,e.b])S.nodes[nid].armLast.clear();
      for(const b of S.buildings)if(b.access&&b.access.e===e.id)b.access={e:e.id,u:e.g.len-b.access.u,side:-b.access.side,x:b.access.x,y:b.access.y}}
    else{const l=Math.max(K.min,Math.ceil(e.lf/2));e.lf=l;e.lb=l;e.owState=0}},flip);
  const st=e.lb===0?(e.owState===2?"Jednosměrka opačně":"Jednosměrka"):"Obousměrná";
  tidyNodes(S,[S.nodes[e.a],S.nodes[e.b]]);
  return {ok:true,state:st}}
function setControl(S,n,ctl,pair){if(n.edges.length<3||n.ring)return {ok:false,msg:"Tohle není obyčejná křižovatka."};
  if(n.arms.some(a=>S.edges[a.e].kind==="hwy"))return {ok:false,msg:"Napojení na dálnici se řídí samo."};
  const cost=ctl===3&&n.ctl!==3?60:0;if(S.money<cost)return {ok:false,msg:"Málo peněz v pokladně."};S.money-=cost;
  n.ctl=ctl;n.mainManual=ctl===2?pair:null;topoNode(S,n);return {ok:true}}
// ruční rozdělení úseku (uzel se pak sám nespojí); klik na rozdělení ho zase zruší
function splitAt(S,e,u){if(e.ring)return {ok:false,msg:"Kruhový objezd se nedělí."};if(e.gateEdge)return {ok:false,msg:"Dálnici do světa dělit nejde."};
  if(u<0.5||e.g.len-u<0.5)return {ok:false,msg:"Moc blízko konce úseku."};const r=splitEdgeR(S,e,u,true);return {ok:true,node:r.node}}
function unsplit(S,n){if(!n.keep)return {ok:false,msg:"Tady úsek ručně rozdělený není."};n.keep=false;const ne=mergeAt(S,n);
  return ne?{ok:true,msg:"Úseky spojeny"}:{ok:true,msg:"Úseky se liší druhem nebo pruhy, zůstanou zvlášť."}}
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
