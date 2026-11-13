// Služby, kanceláře, školy, průmysl a nákladní doprava, provoz z vnějšího světa, zóny.

function cellFlow(S,c){const ids=S.cellG[c];if(!ids)return 0;let f=0;for(const id of ids)f=Math.max(f,S.edges[id].flow);return f}
function serviceNear(S,type,i,r){return S.buildings.some(s=>s.type===type&&distT(s.front,i)<r)}
function placeServiceAt(S,type,road,town){if(!frontEdgeAt(S,road))return null;
  for(let d=0;d<4;d++){const f=NB[road*4+d];if(!freeForBuild(S,f))continue;
    for(const cells of SVC_SHAPES[type]){const tiles=fitShape(S,f,road,cells,null);
      if(tiles){const b=createBuilding(S,type,town,tiles,f,KIND[type].name);if(!b.access){demolishBuilding(S,b,true);continue}return b}}}
  return null}
function placeServiceNear(S,type,town,cx,cy,radius,minFlow,edge){
  const cands=[];
  forCells(cx,cy,radius,i=>{if(!frontEdgeAt(S,i))return;const f=cellFlow(S,i);if(f<minFlow)return;
    const d=Math.hypot(wxOf(i)-cx,wyOf(i)-cy);if(d>radius)return;cands.push([(f+5)*(edge?0.4+d/radius:1/(1+d*0.3))+S.R()*4,i])});
  cands.sort((a,b)=>b[0]-a[0]);
  for(let k=0;k<Math.min(25,cands.length);k++){const b=placeServiceAt(S,type,cands[k][1],town);if(b)return b}
  return null}
// kolik polí (4 buňky = 1 pole) suroviny je v okolí r polí
function resNear(S,i,t,r){let n=0;forCells(wxOf(i),wyOf(i),r,j=>{if(S.terrain[j]===t)n++});return n/4}
function serviceCheck(S){
  const busy=[];for(let i=0;i<N;i++){if(!S.cellG[i])continue;const f=cellFlow(S,i);if(f>=30&&frontEdgeAt(S,i))busy.push(i)}
  for(let n=0;n<Math.min(8,busy.length);n++){const i=busy[Math.floor(S.R()*busy.length)];const [t,d]=nearestTown(S,wxOf(i),wyOf(i));const f=cellFlow(S,i);
    if(f>=45&&!serviceNear(S,"gas",i,9)&&S.R()<0.25){const near=t&&d<townRadius(t)+4;const b=placeServiceAt(S,"gas",i,near?t:null);if(b){addLog(S,"Nová pumpa u rušné silnice"+(t?" poblíž obce "+t.name:""),b.front);continue}}
    let deg=0;const e=frontEdgeAt(S,i);if(e){deg=Math.max(S.nodes[e.a].edges.length,S.nodes[e.b].edges.length)}
    if(d>=10&&S.towns.length<30&&S.R()<(deg>=3?0.2:0.05)){const fr=freeNeighbor(S,i);if(fr>=0){const nt=foundTown(S,fr,true);if(nt)addLog(S,"U rušné silnice vznikla osada "+nt.name,fr)}}}
  for(let k=0;k<14;k++){const i=Math.floor(S.R()*N);if(!frontEdgeAt(S,i))continue;const [t,d]=nearestTown(S,wxOf(i),wyOf(i));
    if(!t||d>26||t.pop<20||!t.comps.has(edgeComp(S,frontEdgeAt(S,i).id)))continue;
    for(const [type,res,min] of [["logging",FOREST,8],["quarry",ROCK,4],["mine",ORE,4]]){
      if(resNear(S,i,res,3)<min||serviceNear(S,type,i,10)||S.R()>0.25)continue;
      const b=placeServiceAt(S,type,i,t);if(b){addLog(S,KIND[type].name+" u obce "+t.name+": silnice přivedla práci",b.front);break}}}
  for(const [type,needs,minPop] of [["sawmill",["logging"],30],["steel",["mine","quarry"],50]]){
    for(const src of S.buildings){if(src.type!==needs[0]||!src.access)continue;const cid=edgeComp(S,src.access.e);
      if(S.buildings.some(b=>b.type===type&&b.access&&edgeComp(S,b.access.e)===cid))continue;
      if(!needs.every(n=>S.buildings.some(b=>b.type===n&&b.access&&edgeComp(S,b.access.e)===cid)))continue;if(S.R()>0.3)continue;
      let tb=null,td=1e9;for(const t of S.towns){if(t.pop<minPop||!t.comps.has(cid))continue;const d=Math.hypot(t.cx-wxOf(src.front),t.cy-wyOf(src.front));if(d<td){td=d;tb=t}}
      if(!tb)continue;const near=industryCluster(S,tb);const b=near?placeServiceNear(S,type,tb,near[0],near[1],6,0,false):placeServiceNear(S,type,tb,tb.cx,tb.cy,townRadius(tb)+5,0,true);
      if(b){addLog(S,KIND[type].name+" u obce "+tb.name,b.front);break}}}
  for(const t of S.towns){if(!t.accessList.length)continue;
    const cnt=type=>S.buildings.reduce((a,s)=>a+(s.town===t&&s.type===type?1:0),0);const r=townRadius(t);let b;
    if(t.pop>=24&&cnt("pub")<1+Math.floor(t.pop/160)&&S.R()<0.3){if(b=placeServiceNear(S,"pub",t,t.cx,t.cy,r+1,0,false))addLog(S,t.name+": otevřela se hospoda s parkovištěm",b.front)}
    if(t.pop>=40&&cnt("shop")<Math.max(1,Math.floor(t.pop/130))&&S.R()<0.25){if(b=placeServiceNear(S,"shop",t,t.cx,t.cy,r+1,10,false))addLog(S,t.name+": nový obchod s parkovištěm",b.front)}
    if(t.kids>=20&&!S.buildings.some(s=>s.type==="school"&&Math.hypot(wxOf(s.front)-t.cx,wyOf(s.front)-t.cy)<14)&&S.R()<0.3){if(b=placeServiceNear(S,"school",t,t.cx,t.cy,r+2,0,false))addLog(S,t.name+": otevřela se škola",b.front)}
    if(t.pop>=70&&t.jobless>4&&cnt("office")<1+Math.floor(t.pop/120)&&S.R()<0.25){if(b=placeServiceNear(S,"office",t,t.cx,t.cy,r*0.8+1,0,false))addLog(S,t.name+": vyrostla kancelářská budova",b.front)}
    if(t.pop>=90&&!S.buildings.some(s=>s.type==="mall"&&Math.hypot(wxOf(s.front)-t.cx,wyOf(s.front)-t.cy)<14)&&S.R()<0.2){if(b=placeServiceNear(S,"mall",t,t.cx,t.cy,r+3,40,true))addLog(S,"U obce "+t.name+" postavili nákupní centrum",b.front)}
    if((t.pop>=150||(t.world&&t.pop>=100))&&!S.buildings.some(s=>s.type==="hyper"&&Math.hypot(wxOf(s.front)-t.cx,wyOf(s.front)-t.cy)<25)&&S.R()<0.12){if(b=placeServiceNear(S,"hyper",t,t.cx,t.cy,r+5,30,true))addLog(S,"U obce "+t.name+" vyrostla obchodní zóna",b.front)}}
  for(const s of S.buildings){if(!KIND[s.type]||!KIND[s.type].pull)continue;const over=s.overflow-s.overflowSeen;
    if(over>=3&&!S.buildings.some(p=>p.type==="park"&&distT(p.front,s.front)<7)){const p=placeServiceNear(S,"park",s.town,wxOf(s.front),wyOf(s.front),5,0,false);
      if(p){s.overflowSeen=s.overflow;addLog(S,(s.town?s.town.name+": ":"")+"parkoviště nestačí, vyrostl parkovací dům",p.front)}}
    else if(over>0&&S.R()<0.1)s.overflowSeen++}}
function industryCluster(S,t){let sx=0,sy=0,n=0;for(const b of S.buildings){if(!KIND[b.type]||!KIND[b.type].industry)continue;if(Math.hypot(wxOf(b.front)-t.cx,wyOf(b.front)-t.cy)>townRadius(t)+14)continue;sx+=wxOf(b.front);sy+=wyOf(b.front);n++}
  return n?[sx/n,sy/n]:null}
function countRes(S,b,t){let n=0;forCells(wxOf(b.front),wyOf(b.front),4,j=>{if(S.terrain[j]===t)n++});return Math.floor(n/4)}
function deplete(S,b,t){const p=t===FOREST?0.3:0.04;if(S.R()>p)return;
  const c=[];forCells(wxOf(b.front),wyOf(b.front),4,i=>{if(S.terrain[i]===t&&!S.roadCnt[i]&&!S.bld[i])c.push(i)});
  for(let k=0;k<4&&c.length;k++){const i=c.splice(Math.floor(S.R()*c.length),1)[0];S.terrain[i]=GRASS;S.dirty.push(i);if(t===FOREST)S.regrow.push({i,t:S.time+300})}b.res=Math.max(0,(b.res||1)-1)}
function industryTick(S){
  for(const b of S.buildings){const K=KIND[b.type];if(!K||!K.industry)continue;
    const work=Math.min(1,b.staff/Math.max(1,b.jobs));b.work=work;b.short=null;
    if(!b.access){b.short="road";continue}
    if(K.res!==undefined){if(b.res===null||S.time-b.resT>10){b.res=countRes(S,b,K.res);b.resT=S.time}if(b.res===0)b.short="res";else if(b.out<8)b.prod+=0.07*work}
    else{const ok=Object.keys(K.need).every(g=>(b.stock[g]||0)>=K.need[g]);if(!ok)b.short="input";else if(b.out<8)b.prod+=K.rate*work}
    if(work===0&&!b.short){const h=hourOf(S);b.short=h>=7&&h<16?"workers":"night"}
    while(b.prod>=1){b.prod-=1;if(K.need)for(const g in K.need)b.stock[g]-=K.need[g];b.out++;b.made++;if(K.res!==undefined)deplete(S,b,K.res)}
    if(b.out>=1&&b.trucks<2){const dst=findCargoDest(S,b,K.out);if(dst){if(spawnTruck(S,b,K.out,dst))b.out--}else if(b.out>=8)b.short=b.short||"full";else if(!b.short)b.short="nodest"}}}
function findCargoDest(S,b,g){const cid=edgeComp(S,b.access.e);let best=null,bs=1e9;
  for(const x of S.buildings){const K=KIND[x.type];if(!K||!K.need||!K.need[g]||!x.access||edgeComp(S,x.access.e)!==cid)continue;if((x.stock[g]||0)+(x.inc[g]||0)>=6)continue;const d=distT(x.front,b.front);if(d<bs){bs=d;best={to:x,ep:x}}}
  if(g==="lumber"||g==="stone")for(const t of S.towns){if(!t.comps.has(cid)||t.material+t.matInc>=6)continue;const l=t.accessList.filter(h=>edgeComp(S,h.access.e)===cid);if(!l.length)continue;
    const d=Math.hypot(t.cx-wxOf(b.front),t.cy-wyOf(b.front))+(g==="stone"?15:5);if(d<bs){bs=d;best={to:t,ep:l[Math.floor(S.R()*l.length)]}}}
  for(const gt of S.gates){const n=S.nodes[gt.node];if(n.comp!==cid)continue;const d=Math.hypot(n.x-wxOf(b.front),n.y-wyOf(b.front))+40;if(d<bs){bs=d;best={to:null,ep:gt}}}
  return best}
function spawnTruck(S,b,g,dst){const tr={purpose:"truck",truck:true,from:b,to:dst.ep,ind:b,cargo:g,cargoTo:dst.to,color:"#3b4148",mode:"car"};
  if(!startTrip(S,tr))return false;b.trucks++;if(dst.to){if(dst.to.isTown)dst.to.matInc++;else dst.to.inc[g]=(dst.to.inc[g]||0)+1}return true}
function deliverCargo(S,tr){const g=tr.cargo,to=tr.cargoTo;if(!g)return;let pay=GOODS[g].pay;
  if(to&&to.isTown){to.matInc--;to.material+=1}else if(to&&to.inc){to.inc[g]--;to.stock[g]=(to.stock[g]||0)+1}
  else if(tr.to.isGate){pay=Math.round(pay*1.5);tr.to.exported+=pay;S.exported+=pay}
  S.money+=pay;S.earned+=pay;tr.cargo=null;tr.cargoTo=null}
function gatesTick(S){const h=hourOf(S),day=S.time/DAY;const dayF=h>=6&&h<22?1:0.25;
  for(const g of S.gates){const n=S.nodes[g.node];const cid=n.comp;if(cid<0)continue;
    if(S.gates.some(o=>o!==g&&S.nodes[o.node].comp===cid)){g.trAcc+=(0.08+Math.min(0.25,day*0.05))*dayF;
      while(g.trAcc>=1){g.trAcc-=1;const others=S.gates.filter(o=>o!==g&&S.nodes[o.node].comp===cid);const o=others[Math.floor(S.R()*others.length)];
        startTrip(S,{purpose:"transit",from:g,to:o,home:g,group:1,mode:"car",color:"#6b7480"})}}
    const svc=S.buildings.filter(s=>KIND[s.type]&&KIND[s.type].pull&&s.access&&edgeComp(S,s.access.e)===cid&&s.cap-s.parked.length-s.incoming>0);
    g.tuAcc+=Math.min(0.6,0.04*svc.length)*dayF;
    while(g.tuAcc>=1){g.tuAcc-=1;if(!svc.length)break;const s=pickW(S,svc,q=>KIND[q.type].pull/Math.pow(Math.hypot(wxOf(q.front)-n.x,wyOf(q.front)-n.y)+20,0.6));
      if(startTrip(S,{purpose:"tourist",from:g,to:s,home:g,group:2,mode:"car",color:"#6b7480",customer:true}))g.visitors+=2}}}
// průmyslové zóny a kancelářské čtvrti: shluky aspoň tří podniků
function computeZones(S){const zones=[];const used=new Set();
  for(const [kind,label,test] of [["ind","Průmyslová zóna",b=>KIND[b.type]&&KIND[b.type].industry],["off","Kancelářská čtvrť",b=>b.type==="office"]]){
    const list=S.buildings.filter(test);
    for(const b of list){if(used.has(b))continue;const group=list.filter(o=>!used.has(o)&&distT(o.front,b.front)<10);if(group.length<3)continue;
      for(const o of group)used.add(o);let sx=0,sy=0;for(const o of group){sx+=wxOf(o.front);sy+=wyOf(o.front)}
      const [t]=nearestTown(S,sx/group.length,sy/group.length);zones.push({kind,name:label+(t?" "+t.name:""),x:sx/group.length,y:sy/group.length,n:group.length})}}
  S.zones=zones}
