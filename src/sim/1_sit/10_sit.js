// Silniční síť: uzly (křižovatky, konce, body na kruhu, ruční rozdělení) a úseky mezi nimi.
// Úsek má druh, počty pruhů lf (směr a→b, vpravo od osy) a lb (b→a, vlevo), geometrii a úroveň danou uzly.
// Pruhy se počítají po směrech zvlášť, takže silnice může mít na jedné straně pruh navíc.

// rozsah vozovky od osy: [vpravo, vlevo] včetně chodníku
function edgeExt(e){const K=RK[e.kind];if(e.lf===0||e.lb===0){const h=(e.lf+e.lb)*LW/2+K.side,s=(e.sh||0)*(e.lf?1:-1);return [h+s,h-s]}const m=K.median/2+K.side;return [m+e.lf*LW,m+e.lb*LW]}
function edgeWidth(e){const x=edgeExt(e);return x[0]+x[1]}
function setWidth(e){if(e.lf>0&&e.lb>0)e.sh=0;const x=edgeExt(e);e.er=x[0];e.el=x[1];e.w=x[0]+x[1]}
function lvlAt(S,e,u){const a=S.nodes[e.a].lvl,b=S.nodes[e.b].lvl;return a+(b-a)*clamp(u/(e.g.len||1),0,1)}
function addNode(S,x,y,lvl){const n={id:S.nodes.length,x,y,lvl,edges:[],ctl:0,mainManual:null,light:null,ring:0,gate:-1,dead:false,keep:false,rad:0,box:[],xOff:null,xBusy:null,
  turns:new Map(),arms:[],eff:"none",mainEdges:null,armLast:new Map(),comp:-1};S.nodes.push(n);return n}
function findNode(S,x,y,lvl,r){let best=null,bd=r;for(const n of S.nodes){if(n.dead||Math.abs(n.lvl-lvl)>=0.5)continue;const d=Math.hypot(n.x-x,n.y-y);if(d<bd){bd=d;best=n}}return best}
function edgesNear(S,x,y,r){const out=new Set();forCells(x,y,r,c=>{const a=S.cellG[c],b=S.cellB[c];if(a)for(const id of a)out.add(id);if(b)for(const id of b)out.add(id)});
  return [...out].map(id=>S.edges[id]).filter(e=>!e.dead)}
function netChanged(S){S.netDirty=true;S.netVer=(S.netVer||0)+1}

// buňky, které vozovka zabírá: pás vpravo er a vlevo el od osy (+ okraj m), na koncích kruh
// vrací {g: buňky na zemi, b: buňky pod mostem}
const RMARG=0.2;
function bandCells(S,g,er,el,lvlFn,m){m=m===undefined?RMARG:m;const G=new Set(),B=new Set();const p=g.pts,R=Math.max(er,el)+m;
  // vzorky po 0,2 pole (i dlouhé rovné kusy bez mezilehlých bodů)
  const us=[];for(let u=0;u<g.len;u+=0.2)us.push(u);us.push(g.len);const q={};
  for(let k=0;k<us.length;k++){pointAt(g,us[k],q);const x=q.x,y=q.y,nx=q.nx,ny=q.ny,dx=ny,dy=-nx,lv=lvlFn(us[k]);const end=k===0||k===us.length-1;
    forCells(x,y,R+0.3,c=>{const px=wxOf(c)-x,py=wyOf(c)-y;const al=px*dx+py*dy,of=px*nx+py*ny;
      if(Math.abs(al)<=0.2&&of<=er+m&&of>=-el-m||end&&Math.hypot(px,py)<=R)(lv<0.5?G:B).add(c)})}
  for(const c of B)if(G.has(c))B.delete(c);return {g:G,b:B}}
function rasterEdge(S,e,add){
  if(add){const r=bandCells(S,e.g,e.er,e.el,u=>lvlAt(S,e,u));
    e.cellsG=[...r.g];e.cellsB=[...r.b];
    for(const c of e.cellsG){(S.cellG[c]||(S.cellG[c]=[])).push(e.id);S.roadCnt[c]++;const t=S.terrain[c];if(t===FOREST||t===ROCK||t===ORE){S.terrain[c]=GRASS;S.dirty.push(c)}}
    for(const c of e.cellsB){(S.cellB[c]||(S.cellB[c]=[])).push(e.id);S.bridgeCnt[c]++}}
  else{for(const c of e.cellsG){const a=S.cellG[c];if(a){const k=a.indexOf(e.id);if(k>=0)a.splice(k,1);if(!a.length)S.cellG[c]=null}S.roadCnt[c]--}
    for(const c of e.cellsB){const a=S.cellB[c];if(a){const k=a.indexOf(e.id);if(k>=0)a.splice(k,1);if(!a.length)S.cellB[c]=null}S.bridgeCnt[c]--}
    e.cellsG=[];e.cellsB=[]}}
function buildQueues(e){e.q=[[],[]];for(let k=0;k<e.lf;k++)e.q[0].push([]);for(let k=0;k<e.lb;k++)e.q[1].push([])}
function addEdge(S,a,b,kind,pts,lf,lb,opts){opts=opts||{};
  const e={id:S.edges.length,a:a.id,b:b.id,kind,lf,lb,g:geom(pts),ring:opts.ring||0,auto:!!opts.auto,gateEdge:!!opts.gate,dead:false,
    q:null,cong:[0,0],flow:0,passes:0,cellsG:[],cellsB:[],born:S.time,owState:opts.owState||0,pa:!!opts.pa,pb:!!opts.pb,sh:opts.sh||0};
  buildQueues(e);setWidth(e);a.dead=false;b.dead=false;
  S.edges.push(e);a.edges.push(e.id);b.edges.push(e.id);
  rasterEdge(S,e,true);topoNode(S,a);topoNode(S,b);netChanged(S);return e}
// quiet = auta a chodce už přenesl remapEdges, nic se neruší
function removeEdge(S,e,quiet){if(e.dead)return;if(!quiet)killOnEdge(S,e.id);rasterEdge(S,e,false);e.dead=true;
  for(const nid of [e.a,e.b]){const n=S.nodes[nid];n.edges=n.edges.filter(x=>x!==e.id);if(!n.edges.length&&n.gate<0)n.dead=true;else topoNode(S,n)}
  netChanged(S)}
const edgeProps=e=>({ring:e.ring,auto:e.auto,gate:e.gateEdge,owState:e.owState,sh:e.sh||0});
// rozdělí úsek v bodě u; auta a chodci zůstanou, kde jsou. Vrací uzel a oba nové kusy.
function splitEdgeR(S,e,u,keep){
  if(u<0.3)return {node:S.nodes[e.a],e1:null,e2:e};if(e.g.len-u<0.3)return {node:S.nodes[e.b],e1:e,e2:null};
  const q=pointAt(e.g,u),lv=lvlAt(S,e,u),n=addNode(S,q.x,q.y,lv);n.ring=e.ring;n.keep=!!keep;
  const [pa,pb]=splitPts(e.g,u);const a=S.nodes[e.a],b=S.nodes[e.b];
  pa[pa.length-2]=n.x;pa[pa.length-1]=n.y;pb[0]=n.x;pb[1]=n.y;
  const e1=addEdge(S,a,n,e.kind,pa,e.lf,e.lb,Object.assign(edgeProps(e),{pa:e.pa})),e2=addEdge(S,n,b,e.kind,pb,e.lf,e.lb,Object.assign(edgeProps(e),{pb:e.pb}));
  if(e.xw){e1.xw=e.xw.filter(x=>x.u<u-0.3);e2.xw=e.xw.filter(x=>x.u>u+0.3).map(x=>({u:x.u-u}))}
  if(e.uc){e1.uc=[null,e.uc[1]];e2.uc=[e.uc[0],null]}   // ruční spojení pruhů zůstanou u svých křižovatek
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
  const f1=r1?e1.lb:e1.lf,b1=r1?e1.lf:e1.lb,f2=r2?e2.lb:e2.lf,b2=r2?e2.lf:e2.lb;if(f1!==f2||b1!==b2||Math.abs((e1.sh||0)-(e2.sh||0))>1e-6)return null;
  const t1=tanOut(e1,e1.a===n.id),t2=tanOut(e2,e2.a===n.id);if(t1[0]*t2[0]+t1[1]*t2[1]>-0.995)return null;
  return {e1,e2,a,b,r1,r2,lf:f1,lb:b1}}
function mergeAt(S,n){const m=canMerge(S,n);if(!m)return null;const {e1,e2,a,b,r1,r2}=m;
  const p1=r1?reversePts(e1.g.pts):e1.g.pts.slice(),p2=r2?reversePts(e2.g.pts):e2.g.pts;
  const pts=cleanPts(p1.concat(p2.slice(2)));
  const ne=addEdge(S,a,b,e1.kind,pts,m.lf,m.lb,{auto:e1.auto&&e2.auto,owState:e1.owState,sh:e1.sh||0,pa:r1?e1.pb:e1.pa,pb:r2?e2.pa:e2.pb});
  const L1=e1.g.len,L2=e2.g.len;
  const xs=[];for(const x of e1.xw||[])xs.push({u:r1?L1-x.u:x.u});for(const x of e2.xw||[])xs.push({u:L1+(r2?L2-x.u:x.u)});if(xs.length)ne.xw=xs;
  if(e1.uc||e2.uc)ne.uc=[e2.uc?e2.uc[r2?1:0]:null,e1.uc?e1.uc[r1?0:1]:null];
  remapEdges(S,new Map([[e1.id,[{e:ne,u0:0,u1:L1,off:0,rev:r1}]],[e2.id,[{e:ne,u0:0,u1:L2,off:L1,rev:r2}]]]));
  removeEdge(S,e1,true);removeEdge(S,e2,true);return ne}
// po stavbě nebo úpravě spojí rovně navazující úseky stejného druhu v zadaných uzlech
function tidyNodes(S,nodes){for(const n of nodes)if(n&&!n.dead)mergeAt(S,n)}

// ---- přenos aut, chodců a vjezdů na nové úseky ----
// map: id starého úseku → kusy [{e, u0, u1, off, rev}] seřazené podle u0; kus kryje staré u0..u1,
// nová poloha = off + (rev ? u1-u : u-u0)·k (k = poměr délek, když se úsek natáhne nebo zkrátí; jinak 1)
function remapEdges(S,map){
  const has=l=>map.has(l>>1);
  const pieceAt=(ps,u)=>{let k=0;while(k<ps.length-1&&u>ps[k].u1)k++;return ps[k]};
  const nu=(p,u)=>clamp(p.off+(p.rev?p.u1-u:u-p.u0)*(p.k||1),0,p.e.g.len);
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
    const cur=has(c.links[i0]);if(cur&&c.state==="drive"){removeQ(S,c);leaveBox(S,c)}
    const r=rewrite(c.links,i0,c.s,c.sEnd);
    c.links=c.links.slice(0,i0).concat(r.out);c.s=r.ns;c.sEnd=r.nEnd;
    if(cur){const l=c.links[i0];const L=linkLanes(S,l);if(!L){if(c.state==="drive")c.state="exit";killVehicle(S,c);continue}
      c.lane=Math.min(c.lane,L-1);if(c.state==="drive")insertQ(S.edges[l>>1].q[l&1][c.lane],c)}}
  for(const b of S.buildings)if(b.access&&map.has(b.access.e))b.access=mapEp(b.access);
  for(const [oid,ps] of map){const old=S.edges[oid];
    for(const nid of [old.a,old.b]){const n=S.nodes[nid];if(!n.mainManual||!n.mainManual.includes(oid))continue;
      const p=ps.find(p=>p.e.a===nid||p.e.b===nid);n.mainManual=n.mainManual.map(id=>id===oid&&p?p.e.id:id)}}}

// rameno uzlu: směr ven podél úseku, příjezdový a odjezdový směr (link = id úseku*2 + směr)
