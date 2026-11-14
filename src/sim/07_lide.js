// Lidé: domácnosti (děti, dospělí, senioři), denní program, cesty pěšky a autem, návraty domů.

function hourOf(S){return (DAY_START_HOUR+S.time/DAY*24)%24}
function dayOf(S){return Math.floor((DAY_START_HOUR+S.time/DAY*24)/24)+1}
const H2S=h=>h/24*DAY;
function newDay(S,b){const nonHO=b.workers-b.ho;b.tCommute=Math.ceil(nonHO/2);b.cPer=b.tCommute?nonHO/b.tCommute:0;
  b.tSchool=b.kids>0?Math.ceil(b.kids/3):0;b.kPer=b.tSchool?b.kids/b.tSchool:0;b.tShop=Math.round(b.adults*0.3+S.R()*0.8);
  b.tSenior=b.seniors>0?Math.ceil(b.seniors/2):0;b.tVisit=S.R()<0.45?1:0;
  b.tLeisure=(b.kids>0&&S.R()<0.6?1:0)+(S.R()<0.25+0.05*b.adults?1:0)}
function entEp(S,x){if(!x||x.dead)return null;if(x.isGate)return {node:x.node};if(!x.access)return null;return x.access}
function entXY(S,x){if(x.isGate){const n=S.nodes[x.node];return [n.x,n.y]}return [wxOf(x.front),wyOf(x.front)]}
function entComp(S,x){if(x.isGate)return S.nodes[x.node].comp;return x.access?edgeComp(S,x.access.e):-1}
function entDist(S,a,b){const [ax,ay]=entXY(S,a),[bx,by]=entXY(S,b);return Math.hypot(ax-bx,ay-by)}

function startTrip(S,tr){
  const fromEp=entEp(S,tr.from),toEp=entEp(S,tr.to);if(!fromEp||!toEp)return false;
  if(tr.mode==="walk"){if(tr.from.isGate||tr.to.isGate||S.walkers.length>=MAX_WALKERS)tr.mode="car";
    else{const p=findPath(S,fromEp,toEp,true);if(p&&p.len<10){const l0=p.links[0],lz=p.links[p.links.length-1];
      const w={id:S.vid++,links:p.links,li:0,s:p.s0,sEnd:p.sEnd,trip:tr,ph:tr.from.front!==undefined?"out":"road",t:0,speed:tr.purpose==="senior"?0.38:0.5,
        sd:sdOf(l0,fromEp.side||1),goalSd:sdOf(lz,toEp.side||1),xAt:-1,queue:null,cur:null,dead:false,kid:tr.purpose==="school"};
      S.walkers.push(w);if(w.ph==="road")planFinal(S,w);return true}tr.mode="car"}}
  if(S.cars.length>=MAX_CARS)return false;
  const p=findPath(S,fromEp,toEp);if(!p)return false;
  const c=newVehicle(S,{links:p.links,s:p.s0,sEnd:p.sEnd,trip:tr,startEp:fromEp,goalEp:toEp,truck:!!tr.truck,color:tr.color,start:S.time,free:p.len/BASE_SPEED,firstExit:!tr.ret&&!tr.truck});
  clampTrip(S,c);c.lane=chooseLane(S,c,0);
  if(tr.from.isGate){const l=c.links[0];const q=S.edges[l>>1].q[l&1][c.lane];const rear=q[q.length-1];
    if(rear&&rear.s<c.len+0.3){c.dead=true;c.state="gone";return false}c.s=0;q.push(c);c.state="drive";c.sid=S.sid}
  else{const fb=tr.from;let i=tr.spot;if(i===undefined&&isHome(fb)&&fb.type==="flat"&&lotLayout(S,fb))i=homeCars(fb)-1;
    const lay=i!==undefined&&i>=0?lotLayout(S,fb):null;
    // vyjetí z místa na parkovišti po uličce, pak čeká u vjezdu jako dřív
    if(lay&&i<lay.spots.length){c.path=spotPath(lay,i).reverse();c.plen=pathLen(c.path);c.ps=0;c.state="unpark";if(fb.spotUsed&&!isHome(fb)){fb.spotUsed[i]=c;c.spotB=fb;c.spot=i}S.unparking.push(c)}
    else S.exiting.push(c)}
  if(tr.customer&&tr.to.cap>0&&!tr.reserved){tr.to.incoming++;tr.reserved=true}
  return true}
function releaseVehicle(S,c){if(c.spotB){releaseSpot(c.spotB,c.spot,c);c.spotB=null}const tr=c.trip;if(!tr)return;
  if(tr.reserved){tr.to.incoming--;tr.reserved=false}
  if(tr.cargo&&tr.cargoTo){if(tr.cargoTo.isTown)tr.cargoTo.matInc--;else if(tr.cargoTo.inc)tr.cargoTo.inc[tr.cargo]--;tr.cargoTo=null}
  if(tr.truck&&tr.ind&&tr.ind.trucks!==undefined&&!tr.truckDone){tr.ind.trucks--;tr.truckDone=true}
  // lidé z odstraněného auta „dojdou“ pěšky, aby nikdo nezmizel
  if(!tr.truck&&!tr.handled)handleArrival(S,tr,"walk",null,true)}
function exitFailed(S,c){S.cancelled++;const tr=c.trip;c.dead=true;c.state="gone";
  if(tr.reserved){tr.to.incoming--;tr.reserved=false}
  if(tr.home&&tr.home.isTown===undefined&&tr.home.town){const t=tr.home.town;t.exitFail+=1;t.exitTile=tr.home.front}
  if(isHome(tr.from))tr.from.away-=tr.group;tr.handled=true}
function canArrive(S,c){const tr=c.trip;const to=tr.to;if(!to||to.dead)return true;if(tr.customer&&!tr.ret&&to.cap>0&&!c.truck&&to.parked.length>=to.cap)return false;return true}
function lotFailed(S,c){const tr=c.trip,to=tr.to;to.overflow++;to.ofRecent+=1;S.turnedAway++;if(tr.reserved){to.incoming--;tr.reserved=false}
  const back={purpose:"return",ret:true,from:to,to:tr.home,home:tr.home,group:tr.group,mode:"car",color:tr.color};
  const l=c.links[c.li],e=S.edges[l>>1];const homeEp=entEp(S,tr.home);
  const p=homeEp?findPath(S,{e:e.id,u:clamp((l&1)?e.g.len-c.s:c.s,0,e.g.len),dirs:[l&1]},homeEp):null;
  if(!p||p.links[0]!==l){c.dead=true;c.state="gone";if(isHome(tr.home))tr.home.away-=tr.group;tr.handled=true;return}
  c.trip=back;c.goalEp=homeEp;c.links=p.links;c.li=0;const lz=p.links[p.links.length-1];c.sEnd=clamp(p.sEnd,linkIn(S,lz)+0.3,Math.max(linkIn(S,lz)+0.3,linkOut(S,lz)-0.3));if(p.links.length===1)c.sEnd=Math.max(c.sEnd,c.s);c.wait=0;insertQ(e.q[l&1][c.lane],c)}
function arriveVehicle(S,c){c.dead=true;c.state="gone";handleArrival(S,c.trip,"car",c,false);if(c.spotB){releaseSpot(c.spotB,c.spot,c);c.spotB=null}}
function walkerArrived(S,w,aborted){handleArrival(S,w.trip,"walk",null,aborted)}
function handleArrival(S,tr,mode,c,silent){
  if(tr.handled)return;tr.handled=true;const to=tr.to;
  if(tr.reserved){to.incoming--;tr.reserved=false}
  if(tr.truck){if(c)deliverCargo(S,tr);if(!tr.truckDone&&tr.ind&&tr.ind.trucks!==undefined){tr.ind.trucks--;tr.truckDone=true}
    if(!tr.back&&!to.isGate&&tr.ind&&!tr.ind.dead&&c){const back={purpose:"truck",truck:true,back:true,from:to,to:tr.ind,ind:tr.ind,color:tr.color,mode:"car"};
      if(startTrip(S,back))tr.ind.trucks++;else back.truckDone=true}
    return}
  if(to.isGate){if(!silent){if(tr.purpose==="transit"){S.transits++;S.money+=2;S.earned+=2}else{S.money+=1;S.earned+=1}}
    if(tr.purpose==="visit"&&!tr.ret)S.returns.push({tr,mode:"car"},S.time+H2S(2+S.R()*3));
    else if(tr.ret&&isHome(tr.home))tr.home.away-=tr.group;return}
  if(tr.ret){if(isHome(to))to.away-=tr.group;if(!silent){S.money+=1;S.earned+=1}return}
  if(to.dead){if(isHome(tr.home))tr.home.away-=tr.group;return}
  if(!silent){S.trips++;const pay=1+Math.floor((c?c.links.length:2)/4);S.money+=pay;S.earned+=pay;
    if(c&&tr.home&&tr.home.town){const t=tr.home.town;const ratio=(S.time-c.start)/Math.max(0.5,c.free);t.delay+=(clamp(ratio,0.5,6)-t.delay)*0.1}
    const K=KIND[to.type];if(K&&K.pay&&tr.customer){S.money+=K.pay;S.earned+=K.pay}}
  if(mode==="car"&&!silent){const pe={home:tr.home,color:tr.color,spot:c&&c.spotB===to?c.spot:undefined};to.parked.push(pe);if(pe.spot!==undefined){to.spotUsed[pe.spot]=pe;c.spotB=null}}
  if(tr.purpose==="commute"){to.staff+=tr.group;to.staffInc-=tr.group}else if(tr.purpose==="school")to.kidsIn+=tr.group;else to.guests+=tr.group;
  to.visits++;
  const h=hourOf(S);let dur;
  switch(tr.purpose){case"commute":{const e=15+S.R()*2.5;dur=e>h?e-h:0.4+S.R()*0.6;break}
    case"school":{const e=13+S.R()*2;dur=e>h?e-h:0.3+S.R()*0.4;break}
    case"senior":dur=1+S.R();break;case"visit":dur=1.5+S.R()*1.5;break;case"leisure":dur=0.6+S.R()*1.2;break;case"tourist":dur=1+S.R()*2;break;
    default:dur=to.type==="pub"?1+S.R()*1.5:0.5+S.R()*0.7}
  S.returns.push({tr,mode:mode==="car"&&!silent?"car":"walk"},S.time+H2S(dur))}
function decPresence(tr){const place=tr.to;if(place.isGate)return;if(tr.purpose==="commute")place.staff-=tr.group;else if(tr.purpose==="school")place.kidsIn-=tr.group;else place.guests-=tr.group}
function processReturns(S){let guard=0;
  while(S.returns.size&&S.returns.peekP()<=S.time&&guard++<300){const r=S.returns.pop();const tr=r.tr,place=tr.to,home=tr.home;
    let mode=r.mode,k=-1;if(mode==="car"&&!place.isGate){k=place.parked.findIndex(p=>p.home===home);if(k<0)mode="walk"}
    const pe=k>=0?place.parked[k]:null;
    const gone=()=>{decPresence(tr);if(k>=0){place.parked.splice(k,1);if(pe&&pe.spot!==undefined)releaseSpot(place,pe.spot,pe)}if(isHome(home))home.away-=tr.group};
    if(!home||home.dead||(!home.isGate&&!home.access)||place.dead){gone();continue}
    const back={purpose:"return",ret:true,from:place,to:home,home,group:tr.group,mode,color:tr.color,spot:pe&&pe.spot!==undefined?pe.spot:undefined};
    if(pe&&pe.spot!==undefined)releaseSpot(place,pe.spot,pe);
    if(startTrip(S,back)){decPresence(tr);if(k>=0)place.parked.splice(k,1)}
    else if(pe&&pe.spot!==undefined&&!place.spotUsed[pe.spot])place.spotUsed[pe.spot]=pe
    else{r.tries=(r.tries||0)+1;if(r.tries<5)S.returns.push(r,S.time+3);else gone()}}}
function due(S,rem,h,dh,a,b){if(rem<=0||h<a||h>=b)return 0;const exp=rem*dh/Math.max(0.05,b-h);let n=Math.floor(exp);if(S.R()<exp-n)n++;return Math.min(n,rem)}
function walkOr(d,lim){return d<lim?"walk":"car"}
function go(S,b,purpose,group,dest,mode,customer){
  const tr={purpose,from:b,to:dest,home:b,group,mode,color:b.town?b.town.color:"#888",customer:!!customer};
  if(purpose==="commute")dest.staffInc+=group;
  b.away+=group;if(!startTrip(S,tr)){b.away-=group;if(purpose==="commute")dest.staffInc-=group;return false}return true}
function goCommute(S,b){const cid=edgeComp(S,b.access.e);const group=Math.max(1,Math.round(b.cPer));const opts=[];
  for(const w of S.work){if(!w.access||edgeComp(S,w.access.e)!==cid)continue;const free=w.jobs-w.staff-w.staffInc;if(free<=0)continue;const d=entDist(S,b,w);if(d>60)continue;opts.push({w,d,wt:free/Math.pow(d+6,1.3)})}
  if(!opts.length){if(b.town)b.town.jobless+=group;return}
  const o=pickW(S,opts,q=>q.wt);if(go(S,b,"commute",group,o.w,walkOr(o.d,5))&&b.town)b.town.employed+=group}
function goSchool(S,b){const cid=edgeComp(S,b.access.e);let best=null,bd=30;
  for(const s of S.buildings){if(s.type!=="school"||!s.access||edgeComp(S,s.access.e)!==cid||s.kidsIn>=KIND.school.kids)continue;const d=entDist(S,b,s);if(d<bd){bd=d;best=s}}
  const group=Math.max(1,Math.round(b.kPer));if(!best){if(b.town)b.town.noSchool+=group;return}go(S,b,"school",group,best,walkOr(bd,8))}
function goShop(S,b,purpose,h){const cid=edgeComp(S,b.access.e);const opts=[];
  for(const s of S.buildings){const K=KIND[s.type];if(!K||!K.pull||!s.access||edgeComp(S,s.access.e)!==cid)continue;if(K.evening&&h<16&&purpose!=="senior")continue;if(K.seniorOnly&&purpose!=="senior")continue;const d=entDist(S,b,s);
    if(purpose==="senior"&&d>15)continue;opts.push({s,d,wt:K.pull/Math.pow(d+8,purpose==="senior"?1.6:0.9)})}
  if(!opts.length)return;const o=pickW(S,opts,q=>q.wt);go(S,b,purpose,purpose==="senior"?1:Math.min(2,b.adults),o.s,walkOr(o.d,purpose==="senior"?6:5),true)}
// vycházka pěšky: děti na hřiště, dospělí do parku a na náměstí
function goLeisure(S,b){const cid=edgeComp(S,b.access.e);const kids=b.kids>0&&S.R()<0.6;const opts=[];
  for(const s of S.buildings){const K=KIND[s.type];if(!K||!K.leisure||!s.access||edgeComp(S,s.access.e)!==cid)continue;if(kids?K.leisure==="adults":K.leisure==="kids")continue;
    const d=entDist(S,b,s);if(d>9)continue;opts.push({s,d,wt:1/(d+2)})}
  if(!opts.length)return;const o=pickW(S,opts,q=>q.wt);go(S,b,"leisure",kids?Math.min(2,b.kids):1,o.s,"walk")}
function goVisit(S,b){const t=b.town;if(!t)return;const cid=edgeComp(S,b.access.e);
  const gates=S.gates.filter(g=>S.nodes[g.node].comp===cid);if(gates.length&&S.R()<0.35){go(S,b,"visit",1,gates[Math.floor(S.R()*gates.length)],"car");return}
  const towns=S.towns.filter(o=>o!==t&&o.comps.has(cid)&&o.accessList.length);if(!towns.length)return;const o=pickW(S,towns,q=>q.pop/Math.pow(Math.hypot(q.cx-t.cx,q.cy-t.cy)+6,1.4));
  const dest=o.accessList[Math.floor(S.R()*o.accessList.length)];go(S,b,"visit",1,dest,walkOr(entDist(S,b,dest),5))}
function peopleTick(S,dtR){
  const h=hourOf(S),dh=dtR/DAY*24;const day=dayOf(S);
  if(day!==S.curDay&&h>=4&&h<5){S.curDay=day;for(const b of S.buildings)if(isHome(b))newDay(S,b)}
  for(const b of S.buildings){if(!isHome(b)||!b.access)continue;let n;
    if((n=due(S,b.tCommute,h,dh,5.5,9)))for(let k=0;k<n;k++){b.tCommute--;goCommute(S,b)}
    if((n=due(S,b.tSchool,h,dh,7,8)))for(let k=0;k<n;k++){b.tSchool--;goSchool(S,b)}
    if((n=due(S,b.tSenior,h,dh,9,12)))for(let k=0;k<n;k++){b.tSenior--;goShop(S,b,"senior",h)}
    if((n=due(S,b.tShop,h,dh,15.5,20.5)))for(let k=0;k<n;k++){b.tShop--;goShop(S,b,"shop",h)}
    if((n=due(S,b.tLeisure,h,dh,14,19.5)))for(let k=0;k<n;k++){b.tLeisure--;goLeisure(S,b)}
    if((n=due(S,b.tVisit,h,dh,10,19)))for(let k=0;k<n;k++){b.tVisit--;goVisit(S,b)}}}
