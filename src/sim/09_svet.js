// Svět: vytvoření mapy, krok simulace, každosekundové úlohy, problémy pro hráče.

function createSim(seed){
  const R=mulberry32(seed);
  const S={R,seed,version:GAME_VERSION,terrain:new Uint8Array(N),zone:new Uint8Array(N),role:new Uint8Array(N),bld:new Array(N).fill(null),
    roadCnt:new Uint16Array(N),bridgeCnt:new Uint16Array(N),cellG:new Array(N).fill(null),cellB:new Array(N).fill(null),
    nodes:[],edges:[],towns:[],buildings:[],cars:[],exiting:[],entering:[],walkers:[],gates:[],returns:new Heap(),reroute:[],rings:[],work:[],zones:[],regrow:[],problems:[],log:[],dirty:[],
    money:2000,time:0,trips:0,transits:0,exported:0,cancelled:0,turnedAway:0,earned:0,income:0,
    netDirty:true,usedNames:new Set(),secAcc:0,svcTick:0,homesteadAcc:0,congTick:0,pTick:0,zoneTick:0,nextId:1,netVer:0,cfg:{stuck:40},stuck:[],stuckN:0,lastJamAny:-99,vid:0,sid:0,curDay:1};
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
// terén se tvoří po polích (2 × 2 buňky), aby les a voda měly stejnou hrubost jako dřív
function genTerrain(S){const R=S.R;const T=new Uint8Array(MW*MH);
  const f1=valueNoise(R,11),f2=valueNoise(R,4),l1=valueNoise(R,13);
  for(let y=0;y<MH;y++)for(let x=0;x<MW;x++){const i=y*MW+x;const n=f1(x,y)*0.72+f2(x,y)*0.28;if(n>0.62)T[i]=FOREST;if(l1(x,y)<0.13)T[i]=WATER}
  const rivers=1+(R()<0.6?1:0);
  for(let r=0;r<rivers;r++){let rx=Math.floor(MW*(0.2+R()*0.6));for(let y=0;y<MH;y++){T[y*MW+rx]=WATER;if(R()<0.4&&rx+1<MW)T[y*MW+rx+1]=WATER;const q=R();if(q<0.27&&rx>6)rx--;else if(q>0.73&&rx<MW-7)rx++;T[y*MW+rx]=WATER}}
  const blob=(t,count)=>{for(let k=0;k<count;k++){let cx,cy,tries=0;do{cx=6+Math.floor(R()*(MW-12));cy=6+Math.floor(R()*(MH-12));tries++}while(T[cy*MW+cx]===WATER&&tries<50);
    const rad=1.6+R()*1.4;for(let y=Math.floor(cy-rad);y<=cy+rad;y++)for(let x=Math.floor(cx-rad);x<=cx+rad;x++){if(x<0||y<0||x>=MW||y>=MH)continue;const i=y*MW+x;if(T[i]===WATER)continue;if(Math.hypot(x-cx,y-cy)<=rad&&R()<0.85)T[i]=t}}};
  blob(ROCK,6);blob(ORE,4);
  for(let i=0;i<N;i++){const ux=Math.floor(tx(i)/2),uy=Math.floor(ty(i)/2);S.terrain[i]=T[uy*MW+ux]}
  // okraje lesa a vody se na jemné síti trochu rozvlní
  for(let i=0;i<N;i++){const t=S.terrain[i];if(t!==FOREST)continue;for(let d=0;d<4;d++){const n=NB[i*4+d];if(n>=0&&S.terrain[n]===GRASS&&R()<0.12){S.terrain[i]=GRASS;break}}}}
function makeGate(S){
  const edges=[0,1,2,3].sort(()=>S.R()-0.5);
  for(const e of edges){if(S.gates.some(g=>g.edge===e))continue;
    for(let tries=0;tries<40;tries++){
      const along=e<2?8+Math.floor(S.R()*(MH-16)):10+Math.floor(S.R()*(MW-20));
      const x0=e===0?0:e===1?MW-1:along,y0=e<2?along:e===2?0:MH-1;const inward=e===0?0:e===1?1:e===2?2:3;
      let ok=true;for(let s=0;s<8;s++){const c=cellAt(x0+0.5+DX[inward]*s,y0+0.5+DY[inward]*s);if(S.terrain[c]===WATER||S.roadCnt[c]){ok=false;break}}if(!ok)continue;
      const ax=x0+0.5-DX[inward]*0.5,ay=y0+0.5-DY[inward]*0.5,bx=x0+0.5+DX[inward]*7,by=y0+0.5+DY[inward]*7;
      const A=addNode(S,ax,ay,0),B=addNode(S,bx,by,0);
      const free=GATE_NAMES.filter(n=>!S.gates.some(g=>g.name===n));const name=free[Math.floor(S.R()*free.length)];
      const g={id:S.gates.length,isGate:true,name,edge:e,node:A.id,inward,color:"#5b6470",exported:0,visitors:0,trAcc:0,tuAcc:0,dead:false,cap:0,parked:[],incoming:0};
      A.gate=g.id;S.gates.push(g);addEdge(S,A,B,"hwy",mkLine(ax,ay,bx,by),2,2,{gate:true});return g}}
  return null}
// pole (jednotka silnice) je volné, když jsou volné všechny jeho čtyři buňky
function unitFree(S,ux,uy){if(ux<0||uy<0||ux>=MW||uy>=MH)return false;const c=unitCell(ux,uy);for(const j of [c,c+1,c+W,c+W+1])if(!freeForBuild(S,j))return false;return true}
function seedSettlement(S){
  for(let tries=0;tries<500;tries++){const x=5+Math.floor(S.R()*(MW-10)),y=5+Math.floor(S.R()*(MH-10));
    const c0=unitCell(x,y);if(!unitFree(S,x,y)||S.terrain[c0]!==GRASS&&S.terrain[c0]!==FOREST)continue;if(S.towns.some(t=>Math.hypot(t.cx-x-0.5,t.cy-y-0.5)<14))continue;
    const d=Math.floor(S.R()*4);const rx=x+DX[d],ry=y+DY[d];if(!unitFree(S,rx,ry))continue;
    const ax=rx+0.5-(d<2?0:1),ay=ry+0.5-(d<2?1:0),bx=rx+0.5+(d<2?0:1),by=ry+0.5+(d<2?1:0);
    if(!unitFree(S,Math.floor(ax),Math.floor(ay))||!unitFree(S,Math.floor(bx),Math.floor(by)))continue;
    const r=buildRoad(S,{pts:mkLine(ax,ay,bx,by),kind:"street",lanes:1,start:{type:"free",x:ax,y:ay,lvl:0},end:{type:"free",x:bx,y:by,lvl:0},auto:true});
    if(!r.ok)continue;
    // domek: volná buňka u silnice co nejblíž zamýšlenému poli
    let front=-1,bd=1e9;forCells(x+0.5,y+0.5,1.2,i=>{if(!freeForBuild(S,i))return;let near=false;for(let k=0;k<4;k++){const n=NB[i*4+k];if(n>=0&&frontEdgeAt(S,n))near=true}if(!near)return;const dd=Math.hypot(wxOf(i)-x-0.5,wyOf(i)-y-0.5);if(dd<bd){bd=dd;front=i}});
    if(front<0)continue;const t=foundTown(S,front,false);if(t)return true}
  return false}
// cesta po polích (jednotkách) mezi dvěma body světa
function gridPath(S,ax,ay,bx,by){const UN=MW*MH;const a=Math.floor(ay)*MW+Math.floor(ax),b=Math.floor(by)*MW+Math.floor(bx);
  const g=new Float32Array(UN).fill(Infinity),prev=new Int32Array(UN).fill(-1),closed=new Uint8Array(UN);const hp=new Heap();g[a]=0;hp.push(a,0);
  const info=u=>{const c=unitCell(u%MW,(u/MW)|0);let road=0,bld=false,water=0;for(const j of [c,c+1,c+W,c+W+1]){if(S.roadCnt[j])road++;if(S.bld[j])bld=true;if(S.terrain[j]===WATER)water++}return {road,bld,water,t:S.terrain[c]}};
  while(hp.size){const i=hp.pop();if(closed[i])continue;closed[i]=1;if(i===b)break;const ix=i%MW,iy=(i/MW)|0;
    for(let d=0;d<4;d++){const jx=ix+DX[d],jy=iy+DY[d];if(jx<0||jy<0||jx>=MW||jy>=MH)continue;const j=jy*MW+jx;if(closed[j])continue;const q=info(j);if(q.bld&&j!==b)continue;
      const c=q.road>=2?0.6:q.water?5:q.t===GRASS?1:1.6;
      const ng=g[i]+c+(prev[i]>=0&&(i-prev[i])!==(j-i)?0.4:0);if(ng<g[j]){g[j]=ng;prev[j]=i;hp.push(j,ng+(Math.abs(jx-b%MW)+Math.abs(jy-((b/MW)|0)))*0.6)}}}
  if(!closed[b])return null;const p=[];for(let i=b;i>=0;i=prev[i]){p.push(i);if(i===a)break}return p.reverse()}
// cesta po polích → rovné úseky mezi rohy
function cellsToCorners(path){const out=[path[0]];for(let k=1;k<path.length-1;k++){const d1=path[k]-path[k-1],d2=path[k+1]-path[k];if(d1!==d2)out.push(path[k])}out.push(path[path.length-1]);return out}
// staví jen kusy cesty mimo existující silnice (po silnici se nestaví druhá)
function buildCellPath(S,path,kind,auto){let ok=true;const pt=u=>[u%MW+0.5,((u/MW)|0)+0.5];
  const onRoad=u=>{const [x,y]=pt(u);const c=cellAt(x,y);return S.roadCnt[c]>0};
  const seg=run=>{const pts=cellsToCorners(run);
    for(let k=0;k<pts.length-1;k++){const [ax,ay]=pt(pts[k]),[bx,by]=pt(pts[k+1]);
      const st=snapPoint(S,ax,ay,0),en=snapPoint(S,bx,by,0);if(st.type==="free"){st.x=ax;st.y=ay}if(en.type==="free"){en.x=bx;en.y=by}
      const r=buildRoad(S,{pts:mkLine(st.x,st.y,en.x,en.y),kind,lanes:RK[kind].lanes,start:st,end:en,auto});if(!r.ok)ok=false}};
  let k=0;
  while(k<path.length-1){if(onRoad(path[k])&&onRoad(path[k+1])){k++;continue}
    let j=k+1;while(j<path.length-1&&!onRoad(path[j]))j++;
    seg(path.slice(k,j+1));k=j}
  return ok}
function oldRoad(S,A,B){const ea=A.homes[0].access,eb=B.homes[0].access;if(!ea||!eb)return;
  const p=gridPath(S,ea.x,ea.y,eb.x,eb.y);if(p)buildCellPath(S,p,"road",true)}

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
  const cxy=c=>[wxOf(c),wyOf(c)];
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
    for(let i=0;i<N&&done<1;i+=13){if(S.terrain[i]!==t)continue;if(serviceNear(S,type,i,12))continue;add(0,name,"Postav k nim silnici z obce. Vznikne "+KIND[type].name.toLowerCase()+" a práce pro lidi.",...cxy(i));done++}}}
  P.sort((a,b)=>b.sev-a.sev);S.problems=P.slice(0,8)}
function addLog(S,text,tile){S.log.unshift({day:dayOf(S),hour:hourOf(S),text,tile:tile===undefined?-1:tile});if(S.log.length>80)S.log.pop()}
