// Obce, budovy a jejich vjezdy, domácnosti, růst obcí a uličky, které si obce staví samy.

function freeForBuild(S,j){return j>=0&&!S.roadCnt[j]&&!S.bridgeCnt[j]&&!S.bld[j]&&S.terrain[j]!==WATER&&!S.zone[j]}
function frontEdgeAt(S,c){const ids=S.cellG[c];if(!ids)return null;for(const id of ids){const e=S.edges[id];if(!e.dead&&RK[e.kind].front&&!e.ring)return e}return null}
function townRadius(t){return 2.5+Math.sqrt(t.tileCount)*1.05}
function nearestTown(S,x,y){let b=null,bd=1e9;for(const t of S.towns){const d=Math.hypot(t.cx-x,t.cy-y);if(d<bd){bd=d;b=t}}return [b,bd]}
function nextName(S,roadBorn){
  if(roadBorn){for(const n of ROAD_NAMES)if(!S.usedNames.has(n)){S.usedNames.add(n);return n}}
  const free=NAMES.filter(n=>!S.usedNames.has(n));const n=free.length?free[Math.floor(S.R()*free.length)]:"Nová Ves "+S.towns.length;S.usedNames.add(n);return n}
function newTown(S,x,y,roadBorn){const t={id:S.nextId++,isTown:true,name:nextName(S,roadBorn),cx:x,cy:y,color:ROOFS[S.towns.length%ROOFS.length],homes:[],g:0,
  delay:1,cancel:0,rate:0,reach:0,jam:0,pop:0,tileCount:0,accessList:[],comps:new Set(),born:S.time,milestone:0,lastJamLog:-99,flats:0,
  material:0,matInc:0,noSpace:0,exitFail:0,exitTile:-1,streets:0,world:false,jobless:0,noSchool:0,why:[],kids:0,workers:0,employed:0};S.towns.push(t);return t}
function fillHousehold(S,b){const p=b.pop,flat=b.type==="flat";let kids=0,sen=0;for(let k=0;k<p;k++){const r=S.R();if(r<(flat?0.17:0.24))kids++;else if(r<(flat?0.33:0.40))sen++}
  b.kids=kids;b.seniors=sen;b.adults=p-kids-sen;b.workers=Math.round(b.adults*0.9);b.ho=0;for(let k=0;k<b.workers;k++)if(S.R()<0.15)b.ho++}
function createBuilding(S,type,town,tiles,front,name){
  const b={id:S.nextId++,type,town,name,tiles:tiles.map(q=>q[0]),front,access:null,pop:0,cap:0,parked:[],incoming:0,visits:0,overflow:0,overflowSeen:0,ofRecent:0,
    born:S.time,dead:false,staff:0,staffInc:0,guests:0,kidsIn:0,away:0};
  let lots=0;
  for(const [j,r] of tiles){if(S.terrain[j]!==GRASS){S.terrain[j]=GRASS;S.dirty.push(j)}S.bld[j]=b;
    S.role[j]=type==="house"?R_HOUSE:type==="flat"?R_FLAT:ROLE_OF[r];if(r==="p"||r==="f"||r==="y")lots++}
  const K=KIND[type];
  if(type==="house"){b.pop=housePop(b.tiles.length);fillHousehold(S,b)}
  else if(type==="flat"){b.pop=10*b.tiles.length;fillHousehold(S,b)}
  else if(type==="park")b.cap=K.cap;
  else b.cap=Math.max(lots*K.slots,type==="office"?b.tiles.length*3:0);
  b.jobs=jobsOf(b);if(type==="house"&&b.tiles.length>=3)b.jobs=b.tiles.length; // statky dávají práci na poli
  if(K&&K.industry){b.stock={};b.inc={};b.out=0;b.prod=0;b.trucks=0;b.work=0;b.short=null;b.res=null;b.resT=-99;b.made=0;b.color=K.color}
  if(isHome(b))newDay(S,b);
  S.buildings.push(b);if(isHome(b)&&town){town.homes.push(b);town.pop+=b.pop;town.tileCount+=b.tiles.length}
  refreshAccess(S,b);return b}
function refreshAccess(S,b){
  if(b.access){const e=S.edges[b.access.e];if(e&&!e.dead&&RK[e.kind].front&&!e.ring){for(let d=0;d<4;d++){const n=NB[b.front*4+d];if(n>=0&&S.cellG[n]&&S.cellG[n].includes(e.id))return}}}
  b.access=null;
  const order=[...b.tiles].sort((p,q)=>(isLotRole(S.role[q])?1:0)-(isLotRole(S.role[p])?1:0));
  for(const j of order)for(let d=0;d<4;d++){const n=NB[j*4+d];if(n<0)continue;const e=frontEdgeAt(S,n);if(!e)continue;
    const cx=tx(j)+0.5,cy=ty(j)+0.5;const r=nearestOn(e.g,cx,cy);if(r.d>e.w/2+1.4)continue;const u=clamp(r.u,0.06,e.g.len-0.06);const p=pointAt(e.g,u);
    const side=((cx-p.x)*p.nx+(cy-p.y)*p.ny)>=0?1:-1;b.front=j;b.access={e:e.id,u,side,x:p.x,y:p.y};return}}
function fitShape(S,f,r,cells,town){
  const dvx=tx(f)-tx(r),dvy=ty(f)-ty(r);
  const anchors=cells.filter(c=>c[1]===0);
  const mirrors=S.R()<0.5?[1,-1]:[-1,1];
  for(const m of mirrors){const sux=-dvy*m,suy=dvx*m;
    for(const a of anchors){const out=[];let ok=true;
      for(const c of cells){const u=c[0]-a[0],v=c[1];const x=tx(f)+u*sux+v*dvx,y=ty(f)+u*suy+v*dvy;
        if(x<0||y<0||x>=W||y>=H){ok=false;break}const j=y*W+x;if(!freeForBuild(S,j)){ok=false;break}
        if(town&&nearestTown(S,x+0.5,y+0.5)[0]!==town){ok=false;break}out.push([j,c[2]||"h"])}
      if(ok){const fi=out.findIndex(q=>q[0]===f);if(fi>0){const q=out.splice(fi,1)[0];out.unshift(q)}return out}}}
  return null}
function foundTown(S,front,roadBorn){const t=newTown(S,tx(front)+0.5,ty(front)+0.5,roadBorn);const b=createBuilding(S,"house",t,[[front,"h"]],front,HOUSE_SHAPES[0].name);
  if(!b.access){}S.netDirty=true;return t}
function updateTownStats(S){
  for(const b of S.buildings)refreshAccess(S,b);
  for(const t of S.towns){t.accessList=[];t.comps=new Set();let pop=0,tiles=0,kids=0,workers=0;
    for(const b of t.homes){pop+=b.pop;tiles+=b.tiles.length;kids+=b.kids;workers+=b.workers-b.ho;if(b.access){t.accessList.push(b);t.comps.add(edgeComp(S,b.access.e))}}
    t.pop=pop;t.tileCount=tiles;t.kids=kids;t.workers=workers;t.world=S.gates.some(g=>t.comps.has(S.nodes[g.node].comp))}}
function shares(a,b){for(const c of a)if(b.has(c))return true;return false}
function calcRates(S){
  for(const t of S.towns){t.why=[];
    if(!t.accessList.length){t.rate=0;t.reach=0;t.jam=0;t.why.push("nemá silnici");continue}
    let reach=0;for(const o of S.towns){if(o===t||!shares(o.comps,t.comps))continue;reach+=o.pop/(1+Math.hypot(o.cx-t.cx,o.cy-t.cy)/12)}
    for(const g of S.gates){const n=S.nodes[g.node];if(!t.comps.has(n.comp))continue;reach+=150/(1+Math.hypot(n.x-t.cx,n.y-t.cy)/40)}
    const r=townRadius(t)+4;let svc=0;for(const s of S.buildings)if(!isHome(s)&&Math.hypot(tx(s.front)-t.cx,ty(s.front)-t.cy)<=r)svc++;
    let rate=0.012+0.012*Math.log2(1+reach/15)+0.005*Math.min(svc,5);
    const jam=clamp((t.delay-1.35)/1.2,0,1),cf=clamp(t.cancel/3,0,1),ef=clamp(t.exitFail/2,0,1);
    const jobF=t.workers>0?clamp(1-t.jobless/Math.max(4,t.workers*0.5),0.3,1):1;
    rate*=(1-0.85*jam)*(1-0.6*cf)*(1-0.7*ef)*jobF;rate*=Math.max(0.1,1-t.pop/450);rate*=1+0.4*Math.min(1,t.material/3);
    t.rate=rate;t.reach=reach;t.jam=Math.max(jam,cf,ef);
    if(ef>0.3)t.why.push("auta nemůžou vyjet z domů");if(jam>0.3)t.why.push("pomalé cesty kvůli zácpám");
    if(jobF<0.8)t.why.push("lidé nemají práci");if(t.noSpace>=3)t.why.push("nemá kam růst");if(reach<6)t.why.push("málo spojení s okolím");
    if(t.pop>=380)t.why.push("je skoro plná")}}
function growTown(S,t,force){
  if(!t.accessList.length&&!force)return;
  if(t.homes.length>=10&&S.R()<0.12&&densify(S,t))return;
  const r=townRadius(t),R0=Math.ceil(r)+1;const cand=[];
  for(let y=Math.floor(t.cy)-R0;y<=t.cy+R0;y++)for(let x=Math.floor(t.cx)-R0;x<=t.cx+R0;x++){
    if(x<0||y<0||x>=W||y>=H)continue;const i=y*W+x;const e=frontEdgeAt(S,i);if(!e)continue;
    for(let d=0;d<4;d++){const f=NB[i*4+d];if(!freeForBuild(S,f))continue;const fd=Math.hypot(tx(f)+0.5-t.cx,ty(f)+0.5-t.cy);if(fd>r+0.5)continue;
      if(nearestTown(S,tx(f)+0.5,ty(f)+0.5)[0]!==t)continue;
      let adj=0;for(let k=0;k<4;k++){const n=NB[f*4+k];if(n>=0&&S.bld[n]&&S.bld[n].town===t)adj++}
      cand.push({f,r:i,d:fd,w:(1+Math.min(e.flow,80)/25)*(1+adj*0.4)/(1+fd*0.5)*(S.terrain[f]===GRASS?1:0.5)})}}
  for(let attempt=0;attempt<6&&cand.length;attempt++){
    const c=pickW(S,cand,q=>q.w);cand.splice(cand.indexOf(c),1);
    let shape;if(t.pop>=60&&c.d<r*0.55&&S.R()<0.35)shape=pickW(S,FLAT_SHAPES,s=>s.w);else shape=pickW(S,HOUSE_SHAPES.filter(s=>!s.min||t.pop>=s.min),s=>s.w);
    const flat=FLAT_SHAPES.includes(shape);let tiles=fitShape(S,c.f,c.r,shape.cells,t);
    if(!tiles&&shape.cells.length>1){shape=HOUSE_SHAPES[0];tiles=fitShape(S,c.f,c.r,shape.cells,t)}
    if(!tiles)continue;const isFlat=flat&&shape!==HOUSE_SHAPES[0];
    const b=createBuilding(S,isFlat?"flat":"house",t,tiles,c.f,shape.name);if(!b.access){demolishBuilding(S,b,true);continue}
    t.noSpace=0;t.material=Math.max(0,t.material-0.3);
    if(isFlat){t.flats++;if(t.flats===1)addLog(S,t.name+": první bytový dům s podzemní garáží",c.f)}
    const m=[50,100,200,400].find(v=>t.pop>=v&&t.milestone<v);if(m){t.milestone=m;if(S.time>25)addLog(S,t.name+" má už "+m+" obyvatel",c.f)}
    if(t.homes.length%7===0&&S.R()<0.6)buildTownStreet(S,t);
    return}
  t.noSpace++;if(!force&&t.pop>=6)buildTownStreet(S,t)}
function densify(S,t){const r=townRadius(t)*0.5;const c=t.homes.filter(h=>h.type==="house"&&h.tiles.length<=2&&Math.hypot(tx(h.front)+0.5-t.cx,ty(h.front)+0.5-t.cy)<=r&&h.access);
  if(!c.length)return false;const h=c[Math.floor(S.R()*c.length)];h.type="flat";h.name="Bytový dům";const np=10*h.tiles.length;t.pop+=np-h.pop;h.pop=np;fillHousehold(S,h);newDay(S,h);for(const j of h.tiles)S.role[j]=R_FLAT;t.flats++;
  if(t.flats===1)addLog(S,t.name+": první bytový dům s podzemní garáží",h.front);return true}
// obec si postaví uličku kolmo od existující silnice; když narazí na jinou silnici, propojí je
function buildTownStreet(S,t){
  const r=townRadius(t)+2,R0=Math.ceil(r);const opts=[];
  for(let y=Math.floor(t.cy)-R0;y<=t.cy+R0;y++)for(let x=Math.floor(t.cx)-R0;x<=t.cx+R0;x++){
    if(x<0||y<0||x>=W||y>=H)continue;const i=y*W+x;const e=frontEdgeAt(S,i);if(!e||e.kind==="blvd")continue;
    const cx=x+0.5,cy=y+0.5;const nr=nearestOn(e.g,cx,cy);if(nr.d>0.2)continue;const p=pointAt(e.g,nr.u);
    if(nr.u<0.6||e.g.len-nr.u<0.6)continue;
    for(let d=0;d<4;d++){if(Math.abs(p.tx*DX[d]+p.ty*DY[d])>0.3)continue;
      let c=i,len=0,loop=null;
      while(len<6){const n=NB[c*4+d];if(n<0)break;
        if(S.roadCnt[n]){if(len>=1){const e2=frontEdgeAt(S,n);if(e2)loop=n}break}
        if(!freeForBuild(S,n))break;const nx=tx(n)+0.5,ny=ty(n)+0.5;if(Math.hypot(nx-t.cx,ny-t.cy)>r+2||nearestTown(S,nx,ny)[0]!==t)break;
        let side=false;for(const q of d<2?[2,3]:[0,1]){const s=NB[n*4+q];if(s>=0&&S.roadCnt[s])side=true}if(side)break;
        c=n;len++}
      if(len>=3||loop!==null&&len>=1)opts.push({x0:cx,y0:cy,x1:tx(loop!==null?loop:c)+0.5,y1:ty(loop!==null?loop:c)+0.5,loop:loop!==null,w:(loop!==null?2.5:1)*len/(1+Math.hypot(cx-t.cx,cy-t.cy)*0.3)})}}
  if(!opts.length)return false;
  for(let tries=0;tries<4&&opts.length;tries++){const o=pickW(S,opts,q=>q.w);opts.splice(opts.indexOf(o),1);
    const st=snapPoint(S,o.x0,o.y0,0),en=o.loop?snapPoint(S,o.x1,o.y1,0):{type:"free",x:o.x1,y:o.y1,lvl:0};
    const plan=planRoad(S,{pts:mkLine(st.x,st.y,en.x,en.y),kind:"street",lanes:1,start:st,end:en,auto:true});
    if(!plan.ok||plan.demolish.length)continue;commitRoad(S,plan);t.streets++;t.noSpace=0;
    if(t.streets===1)addLog(S,t.name+": obec si postavila uličku",cellAt(o.x0,o.y0));
    return true}
  return false}
function roadsideHomestead(S){
  let best=null,bs=-1;
  for(let k=0;k<80;k++){const i=Math.floor(S.R()*N);const e=frontEdgeAt(S,i);if(!e)continue;const [t,d]=nearestTown(S,tx(i)+0.5,ty(i)+0.5);if(d<10)continue;
    const f=freeNeighbor(S,i);if(f<0)continue;const sc=e.flow+S.R()*20;if(sc>bs){bs=sc;best=f}}
  if(best!==null){const t=foundTown(S,best,false);addLog(S,"U silnice se usadil nový domek: "+t.name,best)}}
function freeNeighbor(S,i){const c=[];for(let d=0;d<4;d++){const j=NB[i*4+d];if(freeForBuild(S,j))c.push(j)}return c.length?c[Math.floor(S.R()*c.length)]:-1}
function demolishCost(b){return(b.type==="house"?40:b.type==="flat"?100:KIND[b.type].demolish)*b.tiles.length}
function demolishBuilding(S,b,free){
  if(b.dead)return {ok:true};const cost=free?0:demolishCost(b);if(S.money<cost)return {ok:false,msg:"Na zbourání chybí peníze ("+cost+" Kč)."};
  S.money-=cost;b.dead=true;
  for(const c of S.cars){if(c.dead)continue;if(c.trip&&(c.trip.to===b||c.trip.from===b&&c.state==="exit"))killVehicle(S,c)}
  for(const j of b.tiles){S.bld[j]=null;S.role[j]=0}
  S.buildings.splice(S.buildings.indexOf(b),1);
  const t=b.town;if(t&&isHome(b)){t.homes.splice(t.homes.indexOf(b),1);t.pop-=b.pop;t.tileCount-=b.tiles.length;
    if(!t.homes.length){S.towns.splice(S.towns.indexOf(t),1);for(const s of S.buildings)if(s.town===t)s.town=null;addLog(S,t.name+" zanikla, zbourán poslední dům",b.front)}}
  return {ok:true,cost}}
