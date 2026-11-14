// Silniční síť: uzly (křižovatky, konce, body na kruhu, ruční rozdělení) a úseky mezi nimi.
// Úsek má druh, počty pruhů lf (směr a→b, vpravo od osy) a lb (b→a, vlevo), geometrii a úroveň danou uzly.
// Pruhy se počítají po směrech zvlášť, takže silnice může mít na jedné straně pruh navíc.

// rozsah vozovky od osy: [vpravo, vlevo] včetně chodníku
function edgeExt(e){const K=RK[e.kind];if(e.lf===0||e.lb===0){const h=(e.lf+e.lb)*LW/2+K.side;return [h,h]}const m=K.median/2+K.side;return [m+e.lf*LW,m+e.lb*LW]}
function edgeWidth(e){const x=edgeExt(e);return x[0]+x[1]}
function setWidth(e){const x=edgeExt(e);e.er=x[0];e.el=x[1];e.w=x[0]+x[1]}
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
    q:null,cong:[0,0],flow:0,passes:0,cellsG:[],cellsB:[],born:S.time,owState:opts.owState||0,pa:!!opts.pa,pb:!!opts.pb};
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
  const e1=addEdge(S,a,n,e.kind,pa,e.lf,e.lb,Object.assign(edgeProps(e),{pa:e.pa})),e2=addEdge(S,n,b,e.kind,pb,e.lf,e.lb,Object.assign(edgeProps(e),{pb:e.pb}));
  if(e.xw){e1.xw=e.xw.filter(x=>x.u<u-0.3);e2.xw=e.xw.filter(x=>x.u>u+0.3).map(x=>({u:x.u-u}))}
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
  const ne=addEdge(S,a,b,e1.kind,pts,m.lf,m.lb,{auto:e1.auto&&e2.auto,owState:e1.owState,pa:r1?e1.pb:e1.pa,pb:r2?e2.pa:e2.pb});
  const L1=e1.g.len,L2=e2.g.len;
  const xs=[];for(const x of e1.xw||[])xs.push({u:r1?L1-x.u:x.u});for(const x of e2.xw||[])xs.push({u:L1+(r2?L2-x.u:x.u)});if(xs.length)ne.xw=xs;
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
    const cur=has(c.links[i0]);if(cur&&c.state==="drive"){removeQ(S,c);leaveBox(S,c)}
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
  const port=atA?e.pa:e.pb;const z=port?pointAt(g,atA?0:g.len):n;const bx=z.x,by=z.y;
  const p=pointAt(g,u);let hx=p.x-bx,hy=p.y-by;const l=Math.hypot(hx,hy)||1;hx/=l;hy/=l;
  // vzdálenější směr ramene: strana, na kterou plynulá odbočka odchází (u tečného napojení je blízký směr skoro rovný)
  const uf=atA?Math.min(2.5,g.len*0.45):Math.max(g.len-2.5,g.len*0.55);const pf=pointAt(g,uf);let sx=pf.x-bx,sy=pf.y-by;const lf=Math.hypot(sx,sy)||1;sx/=lf;sy/=lf;
  return {e:eid,hx,hy,sx,sy,port:!!port,ox:bx-n.x,oy:by-n.y,inLink:eid*2+(atA?1:0),outLink:eid*2+(atA?0:1),axis:Math.abs(hx)>=Math.abs(hy)?0:1}}
const linkLanes=(S,l)=>{const e=S.edges[l>>1];return (l&1)?e.lb:e.lf};
const linkFrom=(S,l)=>{const e=S.edges[l>>1];return (l&1)?e.b:e.a};
const linkTo=(S,l)=>{const e=S.edges[l>>1];return (l&1)?e.a:e.b};
// silnice, která uzlem plynule prochází, a z boku jsou napojené jen jednosměrky / nájezdy (odbočky):
// dvojice průběžných ramen, jinak null. Taková silnice má přednost a kreslí se vcelku.
function sideJoinPair(S,n){if(n.edges.length<3||n.ring)return null;let best=null,bd=-0.9;
  for(let i=0;i<n.arms.length;i++)for(let j=i+1;j<n.arms.length;j++){const a=n.arms[i],b=n.arms[j];const d=a.hx*b.hx+a.hy*b.hy;const ea=S.edges[a.e],eb=S.edges[b.e];
    if(!(d<bd)||ea.kind!==eb.kind&&!(RK[ea.kind].oneway&&RK[eb.kind].oneway))continue;
    if(a.port||b.port)continue;
    if(!(linkLanes(S,a.inLink)&&linkLanes(S,b.outLink)||linkLanes(S,b.inLink)&&linkLanes(S,a.outLink)))continue;
    bd=d;best=[a.e,b.e]}
  if(!best)return null;for(const a of n.arms){if(best.includes(a.e))continue;const e=S.edges[a.e];if(!(RK[e.kind].oneway||e.lf===0||e.lb===0))return null}
  return best}
// místa napojení na pruh: v uzlu, kde úsek přibírá nebo ztrácí krajní pruh (konec odbočovacího pruhu,
// začátek připojovacího). Silnice začatá tady vede z toho pruhu: {x, y, dir (směr jízdy), node}
function lanePorts(S,n){const out=[];if(n.dead||n.edges.length!==2||n.ring)return out;const A=n.arms[0],B=n.arms[1];if(A.hx*B.hx+A.hy*B.hy>-0.9)return out;
  const side=(arm)=>{const e=S.edges[arm.e],atA=e.a===n.id;return {e,out:atA?e.id*2:e.id*2+1,in:atA?e.id*2+1:e.id*2,R:atA?e.lf:e.lb,L:atA?e.lb:e.lf,len:e.g.len}};
  for(const [P,Q,ap] of [[A,B,A],[B,A,B]]){const p=side(P),q=side(Q);
    // provoz z Q do P na straně vpravo od směru ven do P
    if(p.R>q.L&&p.R>0){const ps=lanePose(S,p.out,p.R-1,0);out.push({x:ps.x,y:ps.y,dir:[ap.hx,ap.hy],node:n.id,entry:true})}
    else if(q.L>p.R&&q.L>0){const ps=lanePose(S,q.in,q.L-1,q.len);out.push({x:ps.x,y:ps.y,dir:[ap.hx,ap.hy],node:n.id,entry:false})}}
  return out}
function snapPort(S,x,y,lvl){let best=null,bd=0.45;for(const n of S.nodes){if(n.dead||n.edges.length!==2||Math.abs(n.lvl-lvl)>=0.5||Math.abs(n.x-x)>2||Math.abs(n.y-y)>2)continue;
  for(const p of lanePorts(S,n)){const d=Math.hypot(p.x-x,p.y-y);if(d<bd){bd=d;best={type:"node",node:n.id,x:p.x,y:p.y,lvl:n.lvl,port:true,dir:p.dir,entry:p.entry}}}}return best}
function topoNode(S,n){
  n.arms=n.edges.map(id=>armOf(S,n,id));const deg=n.arms.length;
  const isH=e=>e.kind==="hwy";
  const hw=n.arms.filter(a=>isH(S.edges[a.e])).length;
  n.pass=sideJoinPair(S,n);
  n.port=!!(n.pass&&n.arms.every(a=>n.pass.includes(a.e)||a.port));
  n.rad=0;if(deg>=3)for(const a of n.arms){const e=S.edges[a.e];n.rad=Math.max(n.rad,e.er,e.el)}
  // plocha křižovatky na každém rameni (+ přechod)
  for(const a of n.arms){const e=S.edges[a.e];const sb=deg>=3?(n.port?0.3:n.rad+0.05+(crossOn(S,n,e)?XW:0)):0;if(e.a===n.id)e.ta=sb;if(e.b===n.id)e.tb=sb}
  n.turns=new Map();
  for(const ai of n.arms){if(!linkLanes(S,ai.inLink))continue;const list=[];const hix=-ai.hx,hiy=-ai.hy;const ei=S.edges[ai.e];
    for(const ao of n.arms){if(!linkLanes(S,ao.outLink))continue;const eo=S.edges[ao.e];
      if(ao.e===ai.e&&deg>1)continue;
      const cr=hix*ao.hy-hiy*ao.hx,dt=hix*ao.hx+hiy*ao.hy;
      const turn=ao.e===ai.e?2:(cr>0.35?1:cr<-0.35?-1:0);
      if(isH(ei)&&isH(eo)&&dt<0.3)continue;
      // napojení na pruh: sjet jen z pásu, na jehož pravém okraji sjezd začíná, najet jen do pásu, kde nájezd končí
      if(ao.port&&(dt<0.3||hix*ao.oy-hiy*ao.ox<0.02))continue;
      if(ai.port&&(dt<0.3||ao.hx*ai.oy-ao.hy*ai.ox<0.02))continue;
      if(hw>=2){ // napojení z boku dálnice: sjet jen vpravo, najet jen ve směru jízdy, dálnici nepřejet
        if(isH(ei)&&!isH(eo)&&!ao.port&&(hix*ao.sy-hiy*ao.sx)<0.02)continue;
        if(!isH(ei)&&isH(eo)&&!ai.port&&(ai.sx*(-ao.hy)+ai.sy*ao.hx)<0.02)continue;
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
  else if(n.pass){n.eff="main";n.mainEdges=new Set(n.pass)}   // jednosměrka napojená z boku dává přednost
  else{const rk=n.arms.map(a=>{const e=S.edges[a.e];return RK[e.kind].rank*8+e.lf+e.lb});const mx=Math.max(...rk);const top=n.arms.filter((a,k)=>rk[k]===mx);
    if(top.length===2&&rk.some(r=>r<mx)){n.eff="main";n.mainEdges=new Set(top.map(a=>a.e))}else n.eff="right"}
  if(n.eff==="light"){if(!n.light)n.light={axis:0,t:0,amber:false}}else n.light=null;
  laneLinks(S,n)}
// ---- spojení pruhů v uzlu: z každého pruhu každého příjezdu seznam {link, lane, turn, free} ----
// Rovně se pruhy párují podle polohy (pruh pokračuje tam, kde na něj navazuje jiný), vlevo se jede
// z vnitřních pruhů, vpravo z krajních. Šipky od hráče (e.arw[směr][pruh], bity 1 vlevo, 2 rovně, 4 vpravo)
// mají přednost. Pruh bez pokračování (konec přídavného pruhu) nemá žádné spojení: auto se musí přeřadit.
function laneLinks(S,n){n.lc=new Map();n.lm=new Map();const deg=n.arms.length,cnt=new Map(),late=[];const TOL=LW*0.55;
  for(const ai of n.arms){const l=ai.inLink,L=linkLanes(S,l);if(!L)continue;const ei=S.edges[ai.e],d=l&1;const exits=n.turns.get(l)||[];
    const lc=[];for(let k=0;k<L;k++)lc.push([]);
    const add=(k,x,m)=>{if(!lc[k].some(q=>q.link===x.link&&q.lane===m))lc[k].push({link:x.link,lane:m,turn:x.turn,free:false})};
    const pin=[];for(let k=0;k<L;k++)pin.push(lanePose(S,l,k,ei.g.len));
    const Sx=exits.filter(x=>x.turn===0),Lx=exits.filter(x=>x.turn===-1||x.turn===2),Rx=exits.filter(x=>x.turn===1);
    const geo=Sx.map(x=>{const M=linkLanes(S,x.link);const po=[];for(let m=0;m<M;m++)po.push(lanePose(S,x.link,m,0));
      return {x,M,po,byK:pin.map(a=>{let bm=0,bd=1e9;po.forEach((b,m)=>{const dd=Math.hypot(a.x-b.x,a.y-b.y);if(dd<bd){bd=dd;bm=m}});return {m:bm,d:bd}})}});
    const through=deg<3||n.port;const user=!through&&ei.arw&&ei.arw[d]&&ei.arw[d].length===L?ei.arw[d]:null;
    const al=[];for(let k=0;k<L;k++)al.push(geo.some(G=>G.byK[k].d<TOL));
    const anyAl=al.some(v=>v);
    // samočinné šipky
    const mask=new Array(L).fill(0);
    if(Sx.length){for(let k=0;k<L;k++)if(al[k]||!anyAl)mask[k]|=2;if(Lx.length)mask[0]|=1;if(Rx.length)mask[L-1]|=4;
      if(!through){const f=al.indexOf(true),la=al.lastIndexOf(true);for(let k=0;k<L;k++){if(mask[k])continue;if(k>la&&Rx.length)mask[k]=4;else if(k<f&&Lx.length)mask[k]=1;else mask[k]=2}}}
    else if(Lx.length&&Rx.length){for(let k=0;k<L;k++){if(k<=Math.floor((L-1)/2))mask[k]|=1;if(k>=Math.ceil((L-1)/2))mask[k]|=4}}
    else{const b=Lx.length?1:4;for(let k=0;k<L;k++)mask[k]=b}
    if(user)for(let k=0;k<L;k++)if(user[k])mask[k]=user[k];
    // rovně: podle polohy
    for(const G of geo){G.ks=[];for(let k=0;k<L;k++)if(mask[k]&2)G.ks.push(k);
      for(const k of G.ks)if(user&&user[k]||G.byK[k].d<TOL||!anyAl||!through&&!al[k])add(k,G.x,G.byK[k].m)}
    late.push({lc,geo,pin,add,L});
    // vlevo z vnitřních pruhů, vpravo z krajních
    for(const x of Lx){const M=linkLanes(S,x.link);let i=0;for(let k=0;k<L;k++)if(mask[k]&1){if(x.turn===2&&i>0)break;add(k,x,Math.min(i,M-1));i++}if(!i)add(0,x,0)}
    for(const x of Rx){const M=linkLanes(S,x.link);let i=0;for(let k=L-1;k>=0;k--)if(mask[k]&4){add(k,x,M-1-Math.min(i,M-1));i++}if(!i)add(L-1,x,M-1)}
    n.lc.set(l,lc)}
  // pruh za uzlem, do kterého zatím nic nevede (pruh navíc), dostane spojení z nejbližšího pruhu
  const fed=new Set();for(const lc of n.lc.values())for(const r of lc)for(const q of r)fed.add(q.link*16+q.lane);
  for(const A of late)for(const G of A.geo){for(let m=0;m<G.M;m++){if(fed.has(G.x.link*16+m))continue;let bk=-1,bd=1e9;
      for(const k of (G.ks.length?G.ks:A.pin.map((_,k)=>k))){const dd=Math.hypot(A.pin[k].x-G.po[m].x,A.pin[k].y-G.po[m].y);if(dd<bd){bd=dd;bk=k}}
      if(bk>=0&&bd<LW*1.6){A.add(bk,G.x,m);fed.add(G.x.link*16+m)}}
    if(!A.lc.some(r=>r.some(q=>q.link===G.x.link))){let bk=0;for(let k=1;k<A.L;k++)if(G.byK[k].d<G.byK[bk].d)bk=k;A.add(bk,G.x,G.byK[bk].m)}}
  for(const [l,lc] of n.lc){n.lm.set(l,lc.map(r=>r.reduce((b,q)=>b|(q.turn===0?2:q.turn===1?4:1),0)));
    for(const r of lc)for(const q of r){const key=q.link*16+q.lane;cnt.set(key,(cnt.get(key)||0)+1)}}
  // spojení, které nikomu nekříží cestu (pokračování pruhu přes napojení): jede bez dávání přednosti
  const soft=deg<3||n.pass;if(soft)for(const lc of n.lc.values())for(const r of lc)for(const q of r)if(q.turn===0&&cnt.get(q.link*16+q.lane)===1)q.free=true}
// šipky pruhu od hráče: postupně další možnost; null = zpět na samočinné
function arrowOptions(S,e,d){const l=e.id*2+d,n=S.nodes[linkTo(S,l)];if(!n||n.edges.length<3||n.port||n.ring)return null;const ex=n.turns.get(l)||[];
  const has=[ex.some(x=>x.turn===-1||x.turn===2)?1:0,ex.some(x=>x.turn===0)?2:0,ex.some(x=>x.turn===1)?4:0];const bits=has.filter(b=>b);if(bits.length<2)return null;
  const out=[0];for(let m=1;m<8;m++){if((m&~(has[0]|has[1]|has[2]))!==0)continue;if(m===5&&has[1])continue;out.push(m)}return out}
function cycleArrow(S,e,d,k){const L=d?e.lb:e.lf;if(k<0||k>=L)return {ok:false,msg:"Tady pruh není."};const opts=arrowOptions(S,e,d);if(!opts)return {ok:false,msg:"Šipky jdou měnit jen před křižovatkou s více směry."};
  if(L<2)return {ok:false,msg:"Jediný pruh jede všemi směry. Přidej pruh nástrojem Pruhy."};
  if(!e.arw)e.arw=[null,null];if(!e.arw[d]||e.arw[d].length!==L)e.arw[d]=new Array(L).fill(0);
  const cur=e.arw[d][k];e.arw[d][k]=opts[(opts.indexOf(cur)+1)%opts.length];if(e.arw[d].every(v=>!v))e.arw[d]=null;
  const n=S.nodes[linkTo(S,e.id*2+d)];topoNode(S,n);netChanged(S);for(const c of S.cars)if(!c.dead)c.needLi=-1;
  const v=e.arw[d]?e.arw[d][k]:0;return {ok:true,state:v?"Šipka: "+[v&1?"vlevo":"",v&2?"rovně":"",v&4?"vpravo":""].filter(x=>x).join(" + "):"Šipka: samočinně"}}

// ---- plánování a stavba silnice ----
function snapPoint(S,x,y,lvl){
  const n=findNode(S,x,y,lvl,0.55);if(n)return {type:"node",node:n.id,x:n.x,y:n.y,lvl:n.lvl};
  let best=null,bd=0.45;for(const e of edgesNear(S,x,y,1.5)){if(isRampEdge(S,e))continue;const r=nearestOn(e.g,x,y);const lv=lvlAt(S,e,r.u);if(Math.abs(lv-lvl)>=0.5)continue;if(r.d<bd){bd=r.d;best={type:"edge",edge:e.id,u:r.u,x:r.x,y:r.y,lvl:lv}}}
  if(best)return best;return {type:"free",x:Math.floor(x)+0.5,y:Math.floor(y)+0.5,lvl}}
const RAMP=3;   // délka rampy mostu na jednu výškovou úroveň (pole)
const isRampEdge=(S,e)=>Math.abs(S.nodes[e.a].lvl-S.nodes[e.b].lvl)>0.01;
function joinedTo(S,sn,e){return sn.type==="edge"&&sn.edge===e.id||sn.type==="node"&&(e.a===sn.node||e.b===sn.node)}
function checkJoin(S,sn,kind){
  if(kind!=="hwy")return null;
  return null}
// buňky na zemi, které by silnice o šířce ext=[vpravo, vlevo] zabrala
function cellsAlong(S,g,ext,lvlFn){return [...bandCells(S,g,ext[0],ext[1],lvlFn).g]}
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
// ---- napojení jednosměrky na pruh ----
// Jednosměrka (nebo nájezd), která končí nebo začíná na boku průběžné silnice, se napojí na krajní pruh:
// silnice dostane připojovací (za nájezdem) nebo odbočovací (před sjezdem) pruh AUX polí a jednosměrka
// z něj plynule vychází. Kde pruh přidat nejde, napojí se na stávající krajní pruh.
const AUX=5;
function throughNbr(S,e,atA){const n=S.nodes[atA?e.a:e.b];let o=null;if(n.edges.length===2)o=S.edges[n.edges[0]===e.id?n.edges[1]:n.edges[0]];else if(n.pass&&n.pass.includes(e.id))o=S.edges[n.pass[0]===e.id?n.pass[1]:n.pass[0]];return o&&o!==e?{o,n}:null}
// o kolik pruhů má úsek ve směru d víc než sousední úseky téže silnice (přídavné pruhy)
function auxCount(S,e,d){const L=d?e.lb:e.lf;let m=L;for(const atA of [true,false]){const t=throughNbr(S,e,atA);if(!t)continue;const o=t.o;const same=atA?o.b===t.n.id:o.a===t.n.id;const ol=(same?d:1-d)?o.lb:o.lf;if(ol>0)m=Math.min(m,ol)}return L-m}
// rozsah přídavného pruhu na úseku e od bodu u: za nájezdem po směru jízdy, před sjezdem proti směru
function auxRange(e,u,d,entry){const up=entry?(d?[u-AUX,u]:[u,u+AUX]):(d?[u,u+AUX]:[u-AUX,u]);return [clamp(up[0],0,e.g.len),clamp(up[1],0,e.g.len)]}
// průběžný uzel (dva úseky rovně za sebou, nebo silnice s napojením z boku): úsek po směru jízdy T (entry) nebo proti (sjezd)
function throughArm(S,n,T,entry){let pair=null;if(n.edges.length===2&&n.arms[0].hx*n.arms[1].hx+n.arms[0].hy*n.arms[1].hy<-0.9)pair=n.arms;else if(n.pass)pair=n.arms.filter(a=>n.pass.includes(a.e));
  if(!pair||pair.length!==2)return null;for(const a of pair){if((a.hx*T[0]+a.hy*T[1])*(entry?1:-1)<0.7)continue;const link=entry?a.outLink:a.inLink;if(!linkLanes(S,link))return null;const e=S.edges[a.e];return {e,d:link&1,u:e.a===n.id?0:e.g.len}}return null}
// vyplatí se pruh na rozsahu r? krátký jen tehdy, když na konci navazuje už rozšířený úsek (průplet)
function auxFits(S,e,d,r,entry){const len=r[1]-r[0];if(len>=1.2)return true;if(len<0.8)return false;const atA=entry?d===1:d===0;const t=throughNbr(S,e,atA);if(!t)return false;
  const o=t.o,same=atA?o.b===t.n.id:o.a===t.n.id,od=same?d:1-d;return (od?o.lb:o.lf)>(d?e.lb:e.lf)}
function joinInfo(S,sn,pts,atStart,k){
  if(!sn||sn.type==="free")return null;const g=geom(pts);if(g.len<1.5)return null;
  const z=pointAt(g,atStart?0:g.len),far=pointAt(g,atStart?Math.min(6,g.len*0.5):Math.max(g.len-6,g.len*0.5));
  const vx=far.x-z.x,vy=far.y-z.y,vl=Math.hypot(vx,vy)||1;const entry=!atStart;
  const okDir=(T)=>{const side=(vx*-T[1]+vy*T[0])/vl,al=(vx*T[0]+vy*T[1])/vl;return side>0.02&&(entry?al<0.4:al>-0.4)};
  let e,u,d,T=null,atNode=false;
  if(sn.type==="node"){const n=S.nodes[sn.node];if(!n||n.dead||n.ring||n.gate>=0||n.edges.length<2)return null;
    for(const a of n.arms){const t=[a.hx,a.hy];if(!okDir(t))continue;const r=throughArm(S,n,t,entry);if(r){e=r.e;u=r.u;d=r.d;T=t;atNode=true;break}}
    if(!T)return null}
  else if(sn.type==="edge"){e=S.edges[sn.edge];if(!e||e.dead)return null;u=sn.u;if(u<0.8||u>e.g.len-0.8)return null}
  else return null;
  if(e.ring||e.gateEdge||isRampEdge(S,e))return null;
  const p=pointAt(e.g,u);const one=e.lf===0||e.lb===0;
  if(!T){d=one?(e.lf>0?0:1):(vx*p.nx+vy*p.ny>=0?0:1);const sg0=d?-1:1;T=[p.tx*sg0,p.ty*sg0];if(!okDir(T))return null}
  const sg=d?-1:1,L=d?e.lb:e.lf;if(!L)return null;let La=L,add=false,cost=0,dem=[];
  if(!auxCount(S,e,d)&&lanesAfter(e,k,one?undefined:d)){const r=auxRange(e,u,d,entry);
    if(auxFits(S,e,d,r,entry)){const lp=planLanes(S,e,k,one?undefined:d,r);if(lp.ok){La=L+k;add=true;cost=lp.cost;dem=lp.demolish}}}
  const fake={kind:e.kind,lf:e.lf,lb:e.lb};if(d)fake.lb=La;else fake.lf=La;
  const kk=Math.min(k,La),off=(laneOffset(fake,d,La-kk)+laneOffset(fake,d,La-1))/2;
  return {entry,k,d,one,add,x:p.x+p.nx*off*sg,y:p.y+p.ny*off*sg,Td:T,ax:p.x,ay:p.y,lvl:sn.lvl,cost,demolish:dem}}
// konec trasy se ohne tak, aby do místa napojení přišel ve směru pruhu
function bendPts(pts,atStart,J){const g=geom(pts);let B=Math.min(3.2,g.len*0.45);const rx=-J.Td[1],ry=J.Td[0],lim=Math.min(g.len*0.7,9);
  for(let u=1.2;u<=lim;u+=0.4){const q=pointAt(g,atStart?u:g.len-u);const lat=(q.x-J.x)*rx+(q.y-J.y)*ry,al=((q.x-J.x)*J.Td[0]+(q.y-J.y)*J.Td[1])*(atStart?1:-1);B=u;if(lat>=0.55+al*0.12&&u>=Math.min(2.4,g.len*0.45))break}
  if(atStart){const q=pointAt(g,B);const k=Math.max(0.3,Math.hypot(q.x-J.x,q.y-J.y)*0.4);return cleanPts(mkCubic(J.x,J.y,J.x+J.Td[0]*k,J.y+J.Td[1]*k,q.x-q.tx*k,q.y-q.ty*k,q.x,q.y).concat(subPts(g,B,g.len).slice(2)))}
  const q=pointAt(g,g.len-B);const k=Math.max(0.3,Math.hypot(q.x-J.x,q.y-J.y)*0.4);return cleanPts(subPts(g,0,g.len-B).concat(mkCubic(q.x,q.y,q.x+q.tx*k,q.y+q.ty*k,J.x-J.Td[0]*k,J.y-J.Td[1]*k,J.x,J.y).slice(2)))}
// při stavbě: přidá pruh (když v místě ještě není) a vrátí uzel napojení
function applyJoin(S,J){
  let n=findNode(S,J.ax,J.ay,J.lvl,0.2);
  if(J.add){let e=null,u=0,d=J.d;
    if(n){const r=n.edges.length>=2?throughArm(S,n,J.Td,J.entry):null;if(r){e=r.e;u=r.u;d=r.d}}
    else{let bd=0.12;for(const x of edgesNear(S,J.ax,J.ay,1)){const r=nearestOn(x.g,J.ax,J.ay);if(Math.abs(lvlAt(S,x,r.u)-J.lvl)>=0.5)continue;if(r.d<bd){bd=r.d;e=x;u=r.u}}
      if(e&&(u<0.8||u>e.g.len-0.8))e=null}
    if(e&&!e.ring&&!e.gateEdge&&!isRampEdge(S,e)&&!auxCount(S,e,d)){const r=auxRange(e,u,d,J.entry);
      if(auxFits(S,e,d,r,J.entry)){const lp=planLanes(S,e,J.k,(e.lf===0||e.lb===0)?undefined:d,r);if(lp.ok){lp.cost=0;lp.demolish=lp.demolish.filter(b=>!b.dead);commitLanes(S,lp);n=findNode(S,J.ax,J.ay,J.lvl,0.2)}}}}
  n=n||resolvePoint(S,J.ax,J.ay,J.lvl);
  // nájezd uvnitř už existujícího přídavného pruhu: zbytek pruhu před nájezdem (za sjezdem) se zruší, pruh je průpletový
  if(J.Td&&n.edges.length===2){const want=J.entry?-1:1;
    for(const a of n.arms){if((a.hx*J.Td[0]+a.hy*J.Td[1])*want<0.7)continue;const e=S.edges[a.e];if(e.ring||e.gateEdge||e.g.len>AUX+0.6)continue;
      const d=J.entry?(a.inLink&1):(a.outLink&1);const far=S.nodes[e.a===n.id?e.b:e.a];if(far.edges.length!==2||auxCount(S,e,d)<J.k)continue;
      const o=S.edges[far.edges[0]===e.id?far.edges[1]:far.edges[0]];const od=(e.a===far.id?o.b===far.id:o.a===far.id)?d:1-d;if(((od?o.lb:o.lf)||99)>=(d?e.lb:e.lf))continue;
      const one=e.lf===0||e.lb===0;const lp=planLanes(S,e,-J.k,one?undefined:d);if(lp.ok){lp.cost=0;commitLanes(S,lp);n=findNode(S,J.ax,J.ay,J.lvl,0.2)||resolvePoint(S,J.ax,J.ay,J.lvl)}}}
  return n}
function planRoad(S,spec){
  const K=RK[spec.kind];
  let jS=null,jE=null;
  const jn=spec.auto?(spec.join||""):"se";
  if(K.oneway&&jn){const kl=clamp(spec.lanes||K.lanes,K.min,K.max);spec=Object.assign({},spec);
    if(jn.includes("s")){jS=joinInfo(S,spec.start,spec.pts,true,kl);if(jS)spec.pts=bendPts(spec.pts,true,jS)}
    if(jn.includes("e")){jE=joinInfo(S,spec.end,spec.pts,false,kl);if(jE)spec.pts=bendPts(spec.pts,false,jE)}}const lanes=clamp(spec.lanes||K.lanes,K.min,K.max);
  const plan={ok:false,msg:"",cost:0,demolish:[],junctions:[],spec,lanes,bad:null,start:spec.start,end:spec.end};
  let g0=geom(spec.pts);plan.g=g0;
  if(g0.len<0.8){plan.msg="Silnice je moc krátká.";return plan}
  for(let k=0;k<g0.n;k++){const x=g0.pts[2*k],y=g0.pts[2*k+1];if(x<0||y<0||x>MW||y>MH){plan.msg="Silnice nesmí vést mimo mapu.";return plan}}
  const la=spec.start.lvl,lb=spec.end.lvl;
  // výškový profil: zvolená výška uprostřed, rampy RAMP polí na každou úroveň u konců v jiné výšce
  const prof=len=>{const L=spec.level;if(L===undefined||L===null||Math.abs(la-L)<0.01&&Math.abs(lb-L)<0.01)return {r1:0,r2:0,fn:u=>la+(lb-la)*u/(len||1),ramp:u=>Math.abs(la-lb)>0.01};
    const r1=RAMP*Math.abs(L-la),r2=RAMP*Math.abs(L-lb);
    return {r1,r2,L,fn:u=>u<r1?la+(L-la)*u/r1:u>len-r2?L+(lb-L)*(u-(len-r2))/r2:L,ramp:u=>u<r1||u>len-r2}};
  let P=prof(g0.len);
  if(P.r1+P.r2>0&&P.r1+P.r2>g0.len-0.4){plan.msg="Na most je potřeba aspoň "+Math.ceil(P.r1+P.r2+0.4)+" polí (rampa "+RAMP+" pole na každou výšku).";return plan}
  const lvlNew=u=>P.fn(u);
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
      if(isRampEdge(S,e)){plan.msg="Na rampu mostu se napojit nejde. Napoj se na jejím konci.";plan.bad={x:x.x,y:x.y};return plan}
      if(P.ramp(x.ua)&&Math.abs(l1-Math.round(l1))>0.01){plan.msg="Rampa mostu nemůže křížit jinou silnici. Prodluž most.";plan.bad={x:x.x,y:x.y};return plan}
      plan.junctions.push({ua:x.ua,x:x.x,y:x.y,lvl:l2})}}
  plan.junctions.sort((a,b)=>a.ua-b.ua);
  plan.junctions=plan.junctions.filter((j,k,a)=>k===0||j.ua-a[k-1].ua>0.4);
  // volný konec těsně za jinou silnicí: konec se posune na ni, nezůstane pahýl
  const J=plan.junctions;
  if(spec.end.type==="free"&&J.length&&g0.len-J[J.length-1].ua<0.6){const j=J.pop();g0=geom(subPts(g0,0,j.ua));plan.end={type:"edge",x:j.x,y:j.y,lvl:j.lvl}}
  if(spec.start.type==="free"&&J.length&&J[0].ua<0.6){const j=J.shift();const u0=j.ua;g0=geom(subPts(g0,u0,g0.len));for(const q of J)q.ua-=u0;plan.start={type:"edge",x:j.x,y:j.y,lvl:j.lvl}}
  plan.g=g0;if(g0.len<0.5){plan.msg="Silnice je moc krátká.";return plan}
  P=prof(g0.len);plan.ramps=[P.r1,P.r2,P.L];const lvlFix=u=>P.fn(u);
  const cells=cellsAlong(S,g0,edgeExt({kind:spec.kind,lf:lanes,lb:K.oneway?0:lanes}),lvlFix);let water=0,rough=0;
  for(const c of cells){if(S.terrain[c]===WATER)water++;else if(S.terrain[c]!==GRASS)rough++}
  const dem=bldOn(S,cells);for(const b of dem)if(b.gateLock){plan.msg="Tady stavět nejde.";return plan}
  plan.demolish=dem;plan.cells=cells;
  let avgLvl=0;for(let k=0;k<=10;k++)avgLvl+=lvlFix(g0.len*k/10)/11;
  plan.roadCost=Math.round(g0.len*roadCostPerTile(spec.kind,lanes,avgLvl)+(water*(spec.kind==="hwy"?20:8)+rough*3)/4);
  plan.demolishCost=plan.demolish.reduce((s,b)=>s+demolishCost(b),0);
  plan.cost=spec.auto?0:plan.roadCost+plan.demolishCost;
  plan.joinS=jS;plan.joinE=jE;
  for(const J of [jS,jE])if(J){plan.cost+=J.cost;for(const b of J.demolish)if(!plan.demolish.includes(b))plan.demolish.push(b)}
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
    const g=geom(subPts(e.g,u0,u1));for(const c of cellsAlong(S,g,edgeExt({kind:sp.kind,lf,lb}),u=>lvlAt(S,e,u0+u)))cells.add(c);
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
      reshapeEdge(S,t,()=>{t.kind=sp.kind;t.lf=s.lf;t.lb=s.lb;t.owState=0;if(!RK[sp.kind].walk||!RK[sp.kind].side)t.xw=null});touched.push(S.nodes[t.a],S.nodes[t.b])}
    tidyNodes(S,touched);return {ok:true,edges:[],rebuilt:true}}
  const g0=plan.g,K=RK[sp.kind],lanes=plan.lanes;
  const nS=plan.joinS?applyJoin(S,plan.joinS):null,nE=plan.joinE?applyJoin(S,plan.joinE):null;
  const seq=[{u:0,node:nS||resolvePoint(S,plan.start.x,plan.start.y,plan.start.lvl),port:!!nS}];
  for(const j of plan.junctions)seq.push({u:j.ua,node:resolvePoint(S,j.x,j.y,j.lvl)});
  // začátek a konec ramp mostu
  const rp=plan.ramps||[0,0];
  for(const u of [rp[0],g0.len-rp[1]]){if(u<=0.05||u>=g0.len-0.05||(u===rp[0]&&!rp[0])||(u===g0.len-rp[1]&&!rp[1]))continue;const q=pointAt(g0,u);seq.push({u,node:resolvePoint(S,q.x,q.y,rp[2])})}
  seq.push({u:g0.len,node:nE||resolvePoint(S,plan.end.x,plan.end.y,plan.end.lvl),port:!!nE});
  seq.sort((a,b)=>a.u-b.u);
  const made=[];
  for(let k=0;k<seq.length-1;k++){const A=seq[k],B=seq[k+1];if(A.node===B.node||B.u-A.u<0.05)continue;
    const pts=subPts(g0,A.u,B.u);if(!A.port){pts[0]=A.node.x;pts[1]=A.node.y}if(!B.port){pts[pts.length-2]=B.node.x;pts[pts.length-1]=B.node.y}
    made.push(addEdge(S,A.node,B.node,sp.kind,pts,lanes,K.oneway?0:lanes,{auto:sp.auto,pa:A.port,pb:B.port}))}
  tidyNodes(S,seq.map(q=>q.node));
  return {ok:true,edges:made.filter(e=>!e.dead)}}
function buildRoad(S,spec){const p=planRoad(S,spec);if(!p.ok)return {ok:false,msg:p.msg,plan:p};const r=commitRoad(S,p);r.plan=p;return r}

// ---- kruhový objezd ----
function planRoundabout(S,cx,cy,r,kind,lanes){kind=kind||"road";
  const plan={ok:false,msg:"",cost:0,demolish:[],cx,cy,r,round:true,kind};
  if(r<1.4){plan.msg="Kruhový objezd je moc malý.";return plan}
  if(cx-r<0.5||cy-r<0.5||cx+r>MW-0.5||cy+r>MH-0.5){plan.msg="Kruhový objezd se nevejde na mapu.";return plan}
  const pts=mkArc(cx,cy,r,0,Math.PI*2);const g=geom(pts);plan.g=g;lanes=clamp(lanes||(r>=3?2:1),1,3);plan.lanes=lanes;
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
    const pts=mkArc(cx,cy,r,A.a,a1);made.push(addEdge(S,A.n,B.n,plan.kind||"road",pts,lanes,0,{ring:rid}))}
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
    if(!RK[e.kind].walk)for(const w of S.walkers){if(w.dead)continue;for(let k=w.li;k<w.links.length;k++)if((w.links[k]>>1)===e.id){walkerEnd(S,w,true);break}}}}
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
    const g=range?geom(subPts(x.g,u0,u1)):x.g;for(const c of cellsAlong(S,g,ext,u=>lvlAt(S,x,u0+u)))cells.add(c);
    const added=Math.max(0,nl[0]-x.lf)+Math.max(0,nl[1]-x.lb);cost+=Math.round((u1-u0)*RK[x.kind].laneCost*added*0.5);items.push({e:x,lf:nl[0],lb:nl[1]})}
  const dem=bldOn(S,cells);if(delta>0)cost+=dem.reduce((s,b)=>s+demolishCost(b),0);else cost=0;
  return {ok:true,e,items,delta,dir,range,cost,demolish:dem,lanesPlan:true}}
function commitLanes(S,p){if(!p.ok)return p;if(S.money<p.cost)return {ok:false,msg:"Málo peněz v pokladně."};S.money-=p.cost;for(const b of p.demolish)if(!b.dead)demolishBuilding(S,b,true);
  const touched=[];
  for(const it of p.items){if(it.e.dead)continue;const t=p.range?cutSection(S,it.e,p.range[0],p.range[1]):it.e;
    reshapeEdge(S,t,()=>{t.lf=it.lf;t.lb=it.lb});touched.push(S.nodes[t.a],S.nodes[t.b])}
  tidyNodes(S,touched);return {ok:true}}
function kindLanes(e,kind,lanes){const K=RK[kind];const one=e.lf===0||e.lb===0;
  if(e.ring)return [clamp(lanes||e.lf,1,3),0];
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
  reshapeEdge(S,e,()=>{if(e.lf===0){e.lf=e.lb;e.lb=0}else{const t=e.a;e.a=e.b;e.b=t;const tp=e.pa;e.pa=e.pb;e.pb=tp;e.g=geom(reversePts(e.g.pts));
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
