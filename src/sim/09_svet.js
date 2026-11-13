// Svět: vytvoření mapy, krok simulace, každosekundové úlohy, problémy pro hráče.

function createSim(seed){
  const R=mulberry32(seed);
  const S={R,seed,version:GAME_VERSION,terrain:new Uint8Array(N),zone:new Uint8Array(N),role:new Uint8Array(N),bld:new Array(N).fill(null),
    roadCnt:new Uint16Array(N),bridgeCnt:new Uint16Array(N),cellG:new Array(N).fill(null),cellB:new Array(N).fill(null),
    nodes:[],edges:[],towns:[],buildings:[],cars:[],exiting:[],entering:[],walkers:[],gates:[],returns:new Heap(),reroute:[],rings:[],work:[],zones:[],regrow:[],problems:[],log:[],dirty:[],
    money:2000,time:0,trips:0,transits:0,exported:0,cancelled:0,turnedAway:0,earned:0,income:0,
    netDirty:true,usedNames:new Set(),secAcc:0,svcTick:0,homesteadAcc:0,congTick:0,pTick:0,zoneTick:0,nextId:1,netVer:0,lastJamAny:-99,vid:0,sid:0,curDay:1};
  genTerrain(S);
  for(let k=0;k<3;k++)makeGate(S);
  for(let k=0;k<10;k++)seedSettlement(S);
  computeNet(S);updateTownStats(S);
  let best=null,bd=1e9;for(let a=0;a<S.towns.length;a++)for(let b=a+1;b<S.towns.length;b++){const d=Math.hypot(S.towns[a].cx-S.towns[b].cx,S.towns[a].cy-S.towns[b].cy);if(d<bd){bd=d;best=[S.towns[a],S.towns[b]]}}
  if(best){oldRoad(S,best[0],best[1]);computeNet(S);updateTownStats(S);for(let k=0;k<5;k++){growTown(S,best[0],true);growTown(S,best[1],true);computeNet(S);updateTownStats(S)}}
  S.log=[];addLog(S,"Krajina má "+S.towns.length+" osad a "+S.gates.length+" dálnice do světa. Spoj je silnicemi.",-1);
  if(best)addLog(S,"Stará cesta spojuje obce "+best[0].name+" a "+best[1].name+".",best[0].homes[0].front);
  for(let k=0;k<600;k++)step(S,STEP);
  S.money=2000;S.trips=0;S.cancelled=0;S.turnedAway=0;S.earned=0;S.income=0;
  return S}
function genTerrain(S){const R=S.R;
  const f1=valueNoise(R,11),f2=valueNoise(R,4),l1=valueNoise(R,13);
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){const i=y*W+x;const n=f1(x,y)*0.72+f2(x,y)*0.28;if(n>0.62)S.terrain[i]=FOREST;if(l1(x,y)<0.13)S.terrain[i]=WATER}
  const rivers=1+(R()<0.6?1:0);
  for(let r=0;r<rivers;r++){let rx=Math.floor(W*(0.2+R()*0.6));for(let y=0;y<H;y++){S.terrain[y*W+rx]=WATER;if(R()<0.4&&rx+1<W)S.terrain[y*W+rx+1]=WATER;const q=R();if(q<0.27&&rx>6)rx--;else if(q>0.73&&rx<W-7)rx++;S.terrain[y*W+rx]=WATER}}
  const blob=(t,count)=>{for(let k=0;k<count;k++){let cx,cy,tries=0;do{cx=6+Math.floor(R()*(W-12));cy=6+Math.floor(R()*(H-12));tries++}while(S.terrain[cy*W+cx]===WATER&&tries<50);
    const rad=1.6+R()*1.4;for(let y=Math.floor(cy-rad);y<=cy+rad;y++)for(let x=Math.floor(cx-rad);x<=cx+rad;x++){if(x<0||y<0||x>=W||y>=H)continue;const i=y*W+x;if(S.terrain[i]===WATER)continue;if(Math.hypot(x-cx,y-cy)<=rad&&R()<0.85)S.terrain[i]=t}}};
  blob(ROCK,6);blob(ORE,4)}
function makeGate(S){
  const edges=[0,1,2,3].sort(()=>S.R()-0.5);
  for(const e of edges){if(S.gates.some(g=>g.edge===e))continue;
    for(let tries=0;tries<40;tries++){
      const along=e<2?8+Math.floor(S.R()*(H-16)):10+Math.floor(S.R()*(W-20));
      const x0=e===0?0:e===1?W-1:along,y0=e<2?along:e===2?0:H-1;const inward=e===0?0:e===1?1:e===2?2:3;
      let ok=true;for(let s=0;s<8;s++){const i=(y0+DY[inward]*s)*W+x0+DX[inward]*s;if(S.terrain[i]===WATER||S.roadCnt[i]){ok=false;break}}if(!ok)continue;
      const ax=x0+0.5-DX[inward]*0.5,ay=y0+0.5-DY[inward]*0.5,bx=x0+0.5+DX[inward]*7,by=y0+0.5+DY[inward]*7;
      const A=addNode(S,ax,ay,0),B=addNode(S,bx,by,0);
      const free=GATE_NAMES.filter(n=>!S.gates.some(g=>g.name===n));const name=free[Math.floor(S.R()*free.length)];
      const g={id:S.gates.length,isGate:true,name,edge:e,node:A.id,inward,color:"#5b6470",exported:0,visitors:0,trAcc:0,tuAcc:0,dead:false,cap:0,parked:[],incoming:0};
      A.gate=g.id;S.gates.push(g);addEdge(S,A,B,"hwy",mkLine(ax,ay,bx,by),2,2,{gate:true});return g}}
  return null}
function seedSettlement(S){
  for(let tries=0;tries<500;tries++){const x=5+Math.floor(S.R()*(W-10)),y=5+Math.floor(S.R()*(H-10));const i=y*W+x;
    if(!freeForBuild(S,i)||S.terrain[i]!==GRASS&&S.terrain[i]!==FOREST)continue;if(S.towns.some(t=>Math.hypot(t.cx-x,t.cy-y)<14))continue;
    const d=Math.floor(S.R()*4);const r0=NB[i*4+d];if(r0<0||!freeForBuild(S,r0))continue;
    const pd=d<2?[2,3]:[0,1];const a=NB[r0*4+pd[0]],b=NB[r0*4+pd[1]];if(a<0||b<0||!freeForBuild(S,a)||!freeForBuild(S,b))continue;
    const ax=tx(a)+0.5,ay=ty(a)+0.5,bx=tx(b)+0.5,by=ty(b)+0.5;
    const r=buildRoad(S,{pts:mkLine(ax,ay,bx,by),kind:"street",lanes:1,start:{type:"free",x:ax,y:ay,lvl:0},end:{type:"free",x:bx,y:by,lvl:0},auto:true});
    if(!r.ok)continue;if(!freeForBuild(S,i)){continue}
    const t=foundTown(S,i,false);if(!t.homes[0].access){demolishBuilding(S,t.homes[0],true);continue}return true}
  return false}
function gridPath(S,a,b){
  const g=new Float32Array(N).fill(Infinity),prev=new Int32Array(N).fill(-1),closed=new Uint8Array(N);const hp=new Heap();g[a]=0;hp.push(a,0);
  while(hp.size){const i=hp.pop();if(closed[i])continue;closed[i]=1;if(i===b)break;
    for(let d=0;d<4;d++){const j=NB[i*4+d];if(j<0||closed[j]||S.bld[j])continue;const c=S.roadCnt[j]?0.6:S.terrain[j]===WATER?5:S.terrain[j]===GRASS?1:1.6;
      const ng=g[i]+c+(prev[i]>=0&&(i-prev[i])!==(j-i)?0.4:0);if(ng<g[j]){g[j]=ng;prev[j]=i;hp.push(j,ng+(Math.abs(tx(j)-tx(b))+Math.abs(ty(j)-ty(b)))*0.6)}}}
  if(!closed[b])return null;const p=[];for(let i=b;i>=0;i=prev[i]){p.push(i);if(i===a)break}return p.reverse()}
// cesta po políčkách → rovné úseky mezi rohy
function cellsToCorners(path){const out=[path[0]];for(let k=1;k<path.length-1;k++){const d1=path[k]-path[k-1],d2=path[k+1]-path[k];if(d1!==d2)out.push(path[k])}out.push(path[path.length-1]);return out}
function buildCellPath(S,path,kind,auto){const pts=cellsToCorners(path);let ok=true;
  for(let k=0;k<pts.length-1;k++){const ax=tx(pts[k])+0.5,ay=ty(pts[k])+0.5,bx=tx(pts[k+1])+0.5,by=ty(pts[k+1])+0.5;
    const st=snapPoint(S,ax,ay,0),en=snapPoint(S,bx,by,0);const r=buildRoad(S,{pts:mkLine(st.x,st.y,en.x,en.y),kind,lanes:RK[kind].lanes,start:st,end:en,auto});if(!r.ok)ok=false}
  return ok}
function oldRoad(S,A,B){const ea=A.homes[0].access,eb=B.homes[0].access;if(!ea||!eb)return;
  const ca=cellAt(ea.x,ea.y),cb=cellAt(eb.x,eb.y);const p=gridPath(S,ca,cb);if(p)buildCellPath(S,p,"road",true)}

function step(S,dt){
  S.time+=dt;
  if(S.netDirty){computeNet(S);updateTownStats(S)}
  if(S.reroute.length){const list=S.reroute;S.reroute=[];for(const c of list)if(!c.dead)rerouteVehicle(S,c)}
  if(++S.pTick>=15){S.pTick=0;peopleTick(S,dt*15)}
  processReturns(S);
  updateLights(S,dt);updateVehicles(S,dt);updateWalkers(S,dt);
  let w=0;for(let k=0;k<S.cars.length;k++){const c=S.cars[k];if(!c.dead)S.cars[w++]=c}S.cars.length=w;
  if(++S.congTick>=3){S.congTick=0;updateCongestion(S,dt*3)}
  S.secAcc+=dt;if(S.secAcc>=1){S.secAcc-=1;perSecond(S)}
  for(const t of S.towns){t.g+=dt*t.rate;if(t.g>=1){t.g-=1;growTown(S,t,false)}}}
function perSecond(S){
  for(const e of S.edges){if(e.dead)continue;e.flow+=(e.passes*60-e.flow)*0.15;e.passes=0}
  updateTownStats(S);calcRates(S);
  let pop=0;for(const t of S.towns){pop+=t.pop;t.cancel*=0.92;t.exitFail*=0.9;t.jobless*=0.97;t.noSchool*=0.95;t.employed*=0.97;
    if(t.jam>0.5&&S.time-t.lastJamLog>120&&S.time-S.lastJamAny>25&&S.time>25){t.lastJamLog=S.time;S.lastJamAny=S.time;addLog(S,t.name+": zácpy, lidé jezdí méně",t.homes[0].front)}}
  const tax=pop*0.01;S.money+=tax;S.earned+=tax;S.income+=(S.earned*60-S.income)*0.1;S.earned=0;
  for(const b of S.buildings)b.ofRecent*=0.95;
  S.work=S.buildings.filter(b=>b.jobs>0&&b.access);
  industryTick(S);gatesTick(S);
  while(S.regrow.length&&S.regrow[0].t<=S.time){const r=S.regrow.shift();if(!S.roadCnt[r.i]&&!S.bld[r.i]&&S.terrain[r.i]===GRASS){S.terrain[r.i]=FOREST;S.dirty.push(r.i)}}
  if(++S.svcTick>=2){S.svcTick=0;serviceCheck(S);computeProblems(S)}
  if(++S.zoneTick>=10){S.zoneTick=0;computeZones(S)}
  S.homesteadAcc+=1;if(S.homesteadAcc>60&&S.towns.length<24){S.homesteadAcc=0;roadsideHomestead(S)}}

function computeProblems(S){const P=[];
  const add=(sev,text,hint,x,y,kind)=>{if(x===undefined||x===null)return;if(P.some(p=>Math.hypot(p.x-x,p.y-y)<5&&p.sev===sev))return;P.push({sev,text,hint,x,y,kind})};
  const cxy=c=>[tx(c)+0.5,ty(c)+0.5];
  for(const t of S.towns){if(!t.homes.length)continue;const [hx,hy]=cxy(t.homes[0].front);
    if(t.exitFail>0.8&&t.exitTile>=0)add(2,t.name+": auta nemůžou vyjet z domů","Silnice u domů je plná. Přidej pruh, jednosměrku nebo objížďku.",...cxy(t.exitTile));
    if(t.accessList.length&&!t.world&&!S.towns.some(o=>o!==t&&shares(o.comps,t.comps))&&t.pop>=8)add(1,t.name+" je odříznutá","Spoj ji silnicí s ostatními obcemi nebo s dálnicí.",hx,hy);
    if(t.jobless>5&&t.pop>=20&&t.jobless>t.workers*0.25&&t.accessList.length)add(1,t.name+": lidé nemají práci","Napoj obec na podniky a obce s prací. Kanceláře vzniknou v obci od 70 obyvatel.",hx,hy);
    if(t.noSchool>3&&t.pop>=20&&t.accessList.length)add(1,t.name+": děti nemají školu","Škola vznikne v obci s dost dětmi. Napoj obec na sousední se školou.",hx,hy);
    if(t.noSpace>=4&&t.pop>=20&&t.accessList.length&&P.filter(p=>p.kind==="space").length<2)add(1,t.name+" nemá kam růst","Postav silnici do volné krajiny nebo zruš uzávěru.",hx,hy,"space")}
  const jams=[];for(const e of S.edges){if(e.dead||e.flow<10)continue;const c=Math.max(e.cong[0],e.cong[1]);if(c>0.8)jams.push([c,e])}
  jams.sort((a,b)=>b[0]-a[0]);
  for(const [c,e] of jams.slice(0,20)){const m=pointAt(e.g,e.g.len/2);const [t]=nearestTown(S,m.x,m.y);add(2,"Kolona"+(t?" u obce "+t.name:""),"Přidej pruh, postav objížďku nebo uprav křižovatku na konci.",m.x,m.y);if(P.length>8)break}
  for(const n of S.nodes){if(n.dead||n.eff==="none"||n.eff==="merge")continue;let waiting=0;for(const a of n.arms){const e=S.edges[a.e];const lanes=e.q[a.inLink&1];if(!lanes)continue;for(const q of lanes){const f=q[0];if(f&&f.wait>3&&e.g.len-f.s<n.rad+0.5)waiting++}}
    if(waiting>=2){const [t]=nearestTown(S,n.x,n.y);add(2,(n.eff==="ring"?"Ucpaný kruhový objezd":"Ucpaná křižovatka")+(t?" u obce "+t.name:""),n.eff==="ring"?"Zvětši kruh, přidej pruh nebo odveď část dopravy jinudy.":"Zkus semafor, kruhový objezd nebo hlavní silnici.",n.x,n.y)}}
  for(const b of S.buildings){const K=KIND[b.type];if(!K)continue;const [bx,by]=cxy(b.front);
    if(K.pull&&b.ofRecent>1.5)add(1,"Plné parkoviště: "+K.name.toLowerCase()+(b.town?" v obci "+b.town.name:""),"Auta čekají na silnici. Parkovací dům vznikne sám; pomůže zbourat dům vedle.",bx,by);
    if(K.industry&&b.short&&b.short!=="night"){const m={workers:["nemá pracovníky","Napoj ho na obec, ze které můžou lidé dojíždět."],nodest:["nemá kam vozit","Napoj ho na dálnici do světa nebo na odběratele."],full:["má plný sklad","Výrobky nemá kdo odebrat. Napoj ho na dálnici do světa."],input:["čeká na suroviny",b.type==="sawmill"?"Potřebuje dřevo: veď silnici k těžbě dřeva.":"Potřebuje rudu i kámen: veď silnici k dolu a lomu."],res:["vytěžil okolí","Zásoby došly. Můžeš ho zbourat."],road:["nemá silnici","Přiveď k němu silnici."]}[b.short];
      if(m)add(b.short==="workers"||b.short==="res"?0:1,K.name+(b.town?" u obce "+b.town.name:"")+" "+m[0],m[1],bx,by)}}
  for(const g of S.gates){const n=S.nodes[g.node];if(!S.towns.some(t=>t.comps.has(n.comp)))add(1,"Dálnice do města "+g.name+" není napojená","Napoj ji nájezdem nebo silnicí na jejím konci: přijedou turisté a průmysl bude moct vyvážet.",n.x+DX[g.inward]*4,n.y+DY[g.inward]*4)}
  if(P.length<6){for(const [t,type,name] of [[ORE,"mine","Ložisko železné rudy"],[ROCK,"quarry","Skály pro lom"]]){let done=0;
    for(let i=0;i<N&&done<1;i+=7){if(S.terrain[i]!==t)continue;if(serviceNear(S,type,i,12))continue;add(0,name,"Postav k nim silnici z obce. Vznikne "+KIND[type].name.toLowerCase()+" a práce pro lidi.",...cxy(i));done++}}}
  P.sort((a,b)=>b.sev-a.sev);S.problems=P.slice(0,8)}
function addLog(S,text,tile){S.log.unshift({day:dayOf(S),hour:hourOf(S),text,tile:tile===undefined?-1:tile});if(S.log.length>80)S.log.pop()}
