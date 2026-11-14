// Plánování a stavba silnic: přichycení, profil výšky, křížení, napojení jednosměrek na pruh.

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
  if(sn.type==="node"){const n=S.nodes[sn.node];if(!n||n.dead||n.ring||n.gate>=0)return null;
    // konec silnice: jednosměrka se napojí na pruhy toho směru – podle kurzoru na jeden pruh, nebo mezi pruhy (vede pak do obou)
    const np=n.arms.filter(a=>!a.port);
    if(np.length===1&&(n.edges.length===1||n.endPort)){const a=np[0],e0=S.edges[a.e];if(e0.ring||e0.gateEdge||isRampEdge(S,e0))return null;
      const T0=entry?[a.hx,a.hy]:[-a.hx,-a.hy];if((vx*T0[0]+vy*T0[1])/vl*(entry?1:-1)>0.4)return null;
      const link=entry?a.outLink:a.inLink,L=linkLanes(S,link);if(!L)return null;const s0=entry?0:e0.g.len,kk=Math.min(k,L);
      const cand=[];for(let j=0;j+kk<=L;j++){const p0=lanePose(S,link,j,s0),p1=lanePose(S,link,j+kk-1,s0);cand.push([(p0.x+p1.x)/2,(p0.y+p1.y)/2])}
      for(let j=0;j+kk<L;j++)cand.push([(cand[j][0]+cand[j+1][0])/2,(cand[j][1]+cand[j+1][1])/2]);   // mezi pruhy
      const cx=sn.cx!==undefined?sn.cx:cand[0][0],cy=sn.cy!==undefined?sn.cy:cand[0][1];let b=cand[0],bd=1e9;for(const q of cand){const dd=Math.hypot(q[0]-cx,q[1]-cy);if(dd<bd){bd=dd;b=q}}
      return {entry,k,x:b[0],y:b[1],Td:T0,ax:n.x,ay:n.y,lvl:n.lvl,add:false,endJoin:true,cost:0,demolish:[]}}
    if(n.edges.length<2)return null;
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
  const fake={kind:e.kind,lf:e.lf,lb:e.lb,sh:one?(e.sh||0)+(La-L)*LW/2:0};if(d)fake.lb=La;else fake.lf=La;
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
  if(J.Td&&!J.endJoin&&n.edges.length===2&&!n.endPort){const want=J.entry?-1:1;
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
      const l1=lvlNew(x.ua),l2=lvlAt(S,e,x.ub);if(Math.abs(l1-l2)>=0.9)continue;
      if(Math.abs(l1-l2)>0.1){plan.msg="Tady je most moc nízko. Pod mostem nebo nad silnicí se dá projet až tam, kde je celé patro místa.";plan.bad={x:x.x,y:x.y};return plan}
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
