// Doprava: auta v pruzích (fronty seřazené od čela), průjezd křižovatkou po oblouku, přednost,
// výjezdy z budov, přechody pro chodce a chodci.
//
// Úsek se v křižovatce (uzel se 3 a více rameny) zkracuje o „plochu křižovatky“ (e.ta / e.tb),
// do které patří i přechody. Auto stojí na jejím okraji (stopčára) a do křižovatky vjede, až má
// přednost, volnou plochu a místo za křižovatkou. Pak patří do fronty cílového pruhu se záporným
// s a jede po oblouku (c.conn) – nikdy se nepřekryje s jiným autem.

const XW=0.32;   // šířka přechodu pro chodce
// odsazení pruhu od osy úseku doprava ve směru jízdy; k=0 je vnitřní (levý) pruh
function laneOffset(e,d,k){const L=d?e.lb:e.lf;if(e.lb===0||e.lf===0)return -(L*LW)/2+(k+0.5)*LW;return RK[e.kind].median/2+(k+0.5)*LW}
// poloha auta v pruhu: x, y, úhel
function lanePose(S,l,lane,s,out){const e=S.edges[l>>1],d=l&1;const u=clamp(d?e.g.len-s:s,0,e.g.len);const p=pointAt(e.g,u,out||{});const off=laneOffset(e,d,lane),sg=d?-1:1;
  return {x:p.x+p.nx*off*sg,y:p.y+p.ny*off*sg,ang:Math.atan2(p.ty*sg,p.tx*sg),u,off}}
// přechod na rameni křižovatky: uzel se 3+ rameny, silnice s chodníkem, hráč ho nezrušil
// přechod na rameni křižovatky: uzel se 3+ rameny bez dálnice, silnice s chodníkem, hráč ho nezrušil,
// rameno je dost dlouhé a nesvírá se sousedním ramenem moc ostře (přechod by ležel na jiné silnici)
function crossOn(S,n,e){if(n.edges.length<3||!RK[e.kind].walk||!RK[e.kind].side||e.ring||n.xOff&&n.xOff.has(e.id))return false;
  if(n.arms.some(a=>S.edges[a.e].kind==="hwy"))return false;
  if(e.g.len<n.rad+0.05+XW+0.5)return false;
  const a=n.arms.find(q=>q.e===e.id);if(!a)return false;for(const b of n.arms){if(b===a)continue;if(a.hx*b.hx+a.hy*b.hy>0.64)return false}
  return true}
// zkrácení úseku na koncích [u a, u b] (plocha křižovatky + přechod), u krátkých úseků poměrně
function edgeTrim(e){let ta=e.ta||0,tb=e.tb||0;const av=Math.max(0.1,e.g.len-0.25);if(ta+tb>av){const f=av/(ta+tb);ta*=f;tb*=f}return [ta,tb]}
function linkIn(S,l){const e=S.edges[l>>1],t=edgeTrim(e);return (l&1)?t[1]:t[0]}
function linkOut(S,l){const e=S.edges[l>>1],t=edgeTrim(e);return e.g.len-((l&1)?t[0]:t[1])}
// stopčára (konec úseku před křižovatkou); -1 = rovné navázání bez křižovatky
function stopS(S,l){const n=S.nodes[linkTo(S,l)];if(n.edges.length<3)return -1;return linkOut(S,l)}
function newVehicle(S,o){const c=Object.assign({id:S.vid++,li:0,s:0,v:0,lane:0,len:o.truck?0.8:0.5,state:"exit",wait:0,sid:0,dead:false,ang:0,firstExit:true,conn:null},o);S.cars.push(c);return c}
function qOf(S,c){const l=c.links[c.li];return S.edges[l>>1].q[l&1][c.lane]}
function removeQ(S,c){const q=qOf(S,c);if(!q)return;const k=q.indexOf(c);if(k>=0)q.splice(k,1)}
function insertQ(q,c){let i=0;while(i<q.length&&q[i].s>=c.s)i++;q.splice(i,0,c)}
const turnOf=(S,l,nl)=>{const n=S.nodes[linkTo(S,l)];const t=(n.turns.get(l)||[]).find(x=>x.link===nl);return t?t.turn:0};
// pruh na odkazu li: podle příštího odbočení, jinak podle příjezdu (zprava do krajního pruhu, rovně zůstat v pruhu)
function chooseLane(S,c,li){const l=c.links[li],L=linkLanes(S,l);if(L<=1)return 0;
  const nl=c.links[li+1];
  if(nl===undefined)return L-1;
  const turn=turnOf(S,l,nl);if(turn===-1||turn===2)return 0;if(turn===1)return L-1;
  const pl=li>0?c.links[li-1]:undefined;
  if(pl!==undefined&&c.state==="drive"){const pe=S.edges[pl>>1],ce=S.edges[l>>1];
    if(pe.kind!=="hwy"&&ce.kind==="hwy")return L-1;
    const et=turnOf(S,pl,l);if(et===1)return L-1;if(et===-1)return 0;
    return clamp(c.lane,0,L-1)}
  const q=S.edges[l>>1].q[l&1];let best=0,bn=1e9;for(let k=0;k<L;k++){const r=q[k][q[k].length-1];const free=r?r.s:99;if(-free+q[k].length<bn){bn=-free+q[k].length;best=k}}return best}
function armApproaching(S,a,d){const e=S.edges[a.e],lanes=e.q[a.inLink&1];if(!lanes)return false;const so=linkOut(S,a.inLink);for(const q of lanes){const f=q[0];if(f&&so-f.s<d)return true}return false}
// přednost podle pravidla křižovatky (po 3,5 s čekání se přednost pustí, plocha křižovatky se hlídá vždy)
function permit(S,c,l,nl){
  const n=S.nodes[linkTo(S,l)];const eff=n.eff;if(eff==="none")return true;
  if(c.wait>3.5)return true;
  const myArm=n.arms.find(a=>a.inLink===l);
  switch(eff){
    case"light":return !n.light.amber&&myArm&&myArm.axis===n.light.axis;
    case"ring":if(S.edges[l>>1].ring)return true;return !n.arms.some(a=>a.inLink!==l&&S.edges[a.e].ring&&linkLanes(S,a.inLink)&&armApproaching(S,a,1.1));
    case"merge":if(S.edges[l>>1].kind==="hwy")return true;return !n.arms.some(a=>a.inLink!==l&&S.edges[a.e].kind==="hwy"&&linkLanes(S,a.inLink)&&armApproaching(S,a,1.8));
    case"main":if(n.mainEdges.has(l>>1))return true;return !n.arms.some(a=>a.inLink!==l&&n.mainEdges.has(a.e)&&linkLanes(S,a.inLink)&&armApproaching(S,a,1.4));
    case"right":{if(!myArm)return true;const hx=-myArm.hx,hy=-myArm.hy,rx=-hy,ry=hx;
      for(const a of n.arms){if(a===myArm||!linkLanes(S,a.inLink))continue;if(a.hx*rx+a.hy*ry>0.55&&armApproaching(S,a,1.3))return false}return true}}
  return true}
// oblouk přes křižovatku: kubická Bézierova křivka mezi koncem pruhu a začátkem cílového pruhu
function mkConn(a,b){const d=Math.hypot(b.x-a.x,b.y-a.y),k=d*0.42;const c={x0:a.x,y0:a.y,x1:a.x+Math.cos(a.ang)*k,y1:a.y+Math.sin(a.ang)*k,x2:b.x-Math.cos(b.ang)*k,y2:b.y-Math.sin(b.ang)*k,x3:b.x,y3:b.y};
  let len=0,px=c.x0,py=c.y0;for(let i=1;i<=8;i++){const q=bez(c,i/8);len+=Math.hypot(q[0]-px,q[1]-py);px=q[0];py=q[1]}c.len=Math.max(0.05,len);return c}
function bez(c,t){const u=1-t,a=u*u*u,b=3*u*u*t,d=3*u*t*t,e=t*t*t;return [a*c.x0+b*c.x1+d*c.x2+e*c.x3,a*c.y0+b*c.y1+d*c.y2+e*c.y3]}
function bezTan(c,t){const u=1-t;return Math.atan2(3*u*u*(c.y1-c.y0)+6*u*t*(c.y2-c.y1)+3*t*t*(c.y3-c.y2),3*u*u*(c.x1-c.x0)+6*u*t*(c.x2-c.x1)+3*t*t*(c.x3-c.x2))}
// smí auto vjet do plochy křižovatky? (žádný křížící se průjezd, přechody volné)
function boxFree(S,n,l,nl,lane,cn){
  if(n.xBusy){const a=n.xBusy.get(l>>1),b=n.xBusy.get(nl>>1);if(a>0||b>0)return false}
  for(const o of n.box){if(o.dead||!o.conn||o.conn.node!==n.id)continue;if(o.conn.from===l)continue;if(o.conn.to===nl&&o.lane===lane)continue;
    const p=o.conn;const x=segInter(cn.x0,cn.y0,cn.x3,cn.y3,p.x0,p.y0,p.x3,p.y3);
    if(x){const pr=(o.s-p.s0)/p.len;if(pr<x[1]+0.2)return false}   // jiné auto ještě místem křížení neprojelo
    if(Math.hypot(cn.x3-p.x3,cn.y3-p.y3)<0.3||Math.hypot(cn.x0-p.x0,cn.y0-p.y0)<0.3)return false}
  return true}
// pruhy, do kterých smí auto vjet: povinný pruh kvůli odbočení, jinak preferovaný a pak ostatní
function laneOptions(S,c,li){const l=c.links[li],L=linkLanes(S,l);const pref=chooseLane(S,c,li);if(L<=1)return [0];
  const nl=c.links[li+1];if(nl!==undefined){const t=turnOf(S,l,nl);if(t!==0)return [pref]}
  const o=[pref];for(let d=1;d<L;d++){if(pref-d>=0)o.push(pref-d);if(pref+d<L)o.push(pref+d)}return o}
function tryTransition(S,c,l){
  const nl=c.links[c.li+1];const e2=S.edges[nl>>1];if(!e2||e2.dead){killVehicle(S,c);return true}
  const n=S.nodes[linkTo(S,l)];
  if(!permit(S,c,l,nl))return false;
  for(const lane of laneOptions(S,c,c.li+1)){const q=e2.q[nl&1][lane];if(!q){killVehicle(S,c);return true}
    const rear=q[q.length-1];
    if(n.edges.length<3){ // rovné navázání úseků: auto jen pokračuje
      const over=Math.max(0,c.s-S.edges[l>>1].g.len);
      if(rear&&rear.s-(rear.len+c.len)/2-0.12<over)continue;
      c.li++;c.lane=lane;c.s=over;q.push(c);c.sid=S.sid;e2.passes++;c.wait=0;return true}
    const sIn=linkIn(S,nl);
    // za křižovatkou musí být místo pro celé auto, jinak by v ní uvízlo
    if(rear&&rear.s-rear.len/2-0.12<sIn+c.len/2+0.02)continue;
    const a=lanePose(S,l,c.lane,c.s),b=lanePose(S,nl,lane,sIn);const cn=mkConn(a,b);
    if(!boxFree(S,n,l,nl,lane,cn))continue;
    cn.node=n.id;cn.from=l;cn.to=nl;cn.s0=sIn-cn.len;cn.s1=sIn;
    c.li++;c.lane=lane;c.s=cn.s0;c.conn=cn;q.push(c);n.box.push(c);c.sid=S.sid;e2.passes++;c.wait=0;return true}
  return false}
function leaveBox(S,c){if(!c.conn)return;const n=S.nodes[c.conn.node];const k=n.box.indexOf(c);if(k>=0)n.box.splice(k,1);c.conn=null}
// dojel k cíli: zajede do vjezdu (domy, parkoviště), u hranice mapy rovnou zmizí
function startEnter(S,c,l){const to=c.trip&&c.trip.to;leaveBox(S,c);
  if(!to||to.isGate||to.dead||to.front===undefined){c.state="arrived";arriveVehicle(S,c);return}
  const p=lanePose(S,l,c.lane,c.s);c.state="enter";c.t=0;c.ex=p.x;c.ey=p.y;c.eang=p.ang;
  // na parkoviště: rezervované místo a cesta po uličce
  const lay=lotLayout(S,to);if(lay){let i=-1;if(isHome(to)){if(to.type==="flat")i=Math.min(lay.spots.length-1,homeCars(to))}else{i=freeSpot(S,to);if(i>=0){to.spotUsed[i]=c;c.spotB=to;c.spot=i}}
    if(i>=0){c.path=[[p.x,p.y],...spotPath(lay,i)];c.plen=pathLen(c.path);c.ps=0}}
  S.entering.push(c)}
function tryExit(S,c){const l=c.links[0];const e=S.edges[l>>1];if(e.dead){killVehicle(S,c);return true}
  const q=e.q[l&1][c.lane];if(!q){killVehicle(S,c);return true}
  for(const o of q){if(o.s>c.s+o.len/2+c.len/2+0.25)continue;if(o.s<c.s-1.1)break;return false}
  insertQ(q,c);c.state="drive";c.sid=S.sid;c.wait=0;e.passes++;return true}
// auto, které stojí déle než nastavený limit, to vzdá (zablokovaná síť)
function giveUp(S,c){const p=c.state==="drive"?lanePose(S,c.links[c.li],c.lane,c.s):null;
  if(p){S.stuck.push({x:p.x,y:p.y,t:S.time});if(S.stuck.length>60)S.stuck.shift()}S.stuckN++;
  leaveBox(S,c);c.state="gone";c.dead=true;releaseVehicle(S,c)}
function updateVehicles(S,dt){
  const sid=++S.sid,lim=S.cfg.stuck;
  for(let k=S.exiting.length-1;k>=0;k--){const c=S.exiting[k];if(c.dead||c.state!=="exit"){S.exiting.splice(k,1);continue}
    if(tryExit(S,c)){S.exiting.splice(k,1);continue}
    c.wait+=dt;if(c.firstExit&&c.wait>8){S.exiting.splice(k,1);exitFailed(S,c)}
    else if(!c.firstExit&&lim>0&&c.wait>Math.max(8,lim)){S.exiting.splice(k,1);c.dead=true;c.state="gone";releaseVehicle(S,c)}}
  for(let k=S.entering.length-1;k>=0;k--){const c=S.entering[k];if(c.dead||c.state!=="enter"){S.entering.splice(k,1);continue}
    if(c.path){c.ps+=dt*1.2;c.t=c.ps/c.plen}else c.t+=dt/0.8;if(c.t>=1){S.entering.splice(k,1);arriveVehicle(S,c)}}
  for(let k=S.unparking.length-1;k>=0;k--){const c=S.unparking[k];if(c.dead||c.state!=="unpark"){S.unparking.splice(k,1);continue}
    c.ps+=dt*1.2;if(c.ps>=c.plen){S.unparking.splice(k,1);if(c.spotB){releaseSpot(c.spotB,c.spot,c);c.spotB=null}const z=c.path[c.path.length-2]||c.path[c.path.length-1];c.ux=z[0];c.uy=z[1];c.state="exit";c.wait=0;S.exiting.push(c)}}
  for(const e of S.edges){if(e.dead)continue;const len=e.g.len,vb=BASE_SPEED*RK[e.kind].speed*(e.ring?0.75:1);const mb=e.mbusy&&e.mbusy.length?e.mbusy:null;
    for(let d=0;d<2;d++){const lanes=e.q[d];if(!lanes.length)continue;const l=e.id*2+d;const box=S.nodes[d?e.a:e.b].edges.length>=3;const sOut=box?linkOut(S,l):len;
      for(let k=0;k<lanes.length;k++){const q=lanes[k];let leader=null;
        for(let i=0;i<q.length;){const c=q[i];
          if(c.sid===sid){leader=c;i++;continue}c.sid=sid;
          const last=c.li===c.links.length-1;
          let limit=leader?leader.s-(leader.len+c.len)/2-0.12:(last?c.sEnd:(box?sOut-c.len/2-0.04:len+0.3));
          if(mb)for(const u of mb){const sx=d?len-u:u;if(c.s+c.len/2<sx-0.05)limit=Math.min(limit,sx-0.28-c.len/2)}
          const vt=vb*(c.truck?0.8:1);let ns=Math.min(c.s+vt*dt,limit);if(ns<c.s)ns=c.s;
          c.v=(ns-c.s)/dt;if(c.v<0.1*vt)c.wait+=dt;else if(!leader)c.wait=0;else c.wait=Math.max(0,c.wait-dt);
          c.s=ns;
          if(c.conn&&c.s>=c.conn.s1+c.len/2)leaveBox(S,c);
          if(lim>0&&c.wait>lim){(q[i]===c&&q.splice(i,1));giveUp(S,c);continue}
          if(!leader){
            if(last&&c.s>=c.sEnd-0.03){if(canArrive(S,c)){(q[i]===c&&q.splice(i,1));startEnter(S,c,l);continue}
              else if(c.wait>4){(q[i]===c&&q.splice(i,1));lotFailed(S,c);continue}}
            else if(!last&&c.s>=(box?sOut-c.len/2-0.04:len)-0.03){if(tryTransition(S,c,l)){(q[i]===c&&q.splice(i,1));continue}}}
          leader=c;i++}}}}}
function killVehicle(S,c){if(c.dead)return;if(c.state==="drive")removeQ(S,c);leaveBox(S,c);c.dead=true;c.state="gone";releaseVehicle(S,c)}
// poloha startu a cíle auta leží mimo plochu křižovatek
function clampTrip(S,c){const l0=c.links[0],lz=c.links[c.links.length-1];const h=c.len/2+0.05;c.s=clamp(c.s,linkIn(S,l0)+h,Math.max(linkIn(S,l0)+h,linkOut(S,l0)-h));c.sEnd=clamp(c.sEnd,linkIn(S,lz)+h,Math.max(linkIn(S,lz)+h,linkOut(S,lz)-h));if(c.links.length===1)c.sEnd=Math.max(c.sEnd,c.s)}
function rerouteVehicle(S,c){
  if(c.state==="exit"){const p=findPath(S,c.startEp,c.goalEp);if(!p){killVehicle(S,c);return}c.links=p.links;c.s=p.s0;c.sEnd=p.sEnd;c.li=0;clampTrip(S,c);c.lane=chooseLane(S,c,0);return}
  const l=c.links[c.li],e=S.edges[l>>1];if(e.dead){killVehicle(S,c);return}
  const u=(l&1)?e.g.len-c.s:c.s;const p=findPath(S,{e:e.id,u:clamp(u,0,e.g.len),dirs:[l&1]},c.goalEp);
  if(!p||p.links[0]!==l){killVehicle(S,c);return}
  c.links=p.links;c.li=0;const lz=p.links[p.links.length-1];c.sEnd=clamp(p.sEnd,linkIn(S,lz)+0.3,Math.max(linkIn(S,lz)+0.3,linkOut(S,lz)-0.3));if(p.links.length===1)c.sEnd=Math.max(c.sEnd,c.s)}
function killOnEdge(S,eid){
  for(const c of S.cars){if(c.dead)continue;
    if(c.state==="drive"&&(c.links[c.li]>>1)===eid){removeQ(S,c);leaveBox(S,c);c.state="gone";c.dead=true;releaseVehicle(S,c);continue}
    if(c.state==="exit"&&(c.links[0]>>1)===eid){c.dead=true;c.state="gone";releaseVehicle(S,c);continue}
    for(let k=c.li;k<c.links.length;k++)if((c.links[k]>>1)===eid){c.rerouteFrom=eid;S.reroute.push(c);break}}
  for(const w of S.walkers){if(w.dead)continue;for(let k=w.li;k<w.links.length;k++)if((w.links[k]>>1)===eid){walkerEnd(S,w,true);break}}}
function updateCongestion(S,dt){const a=Math.min(1,dt*0.6);
  for(const e of S.edges){if(e.dead)continue;for(let d=0;d<2;d++){const L=d?e.lb:e.lf;if(!L){e.cong[d]=0;continue}let n=0;for(const q of e.q[d])n+=q.length;
    const cap=Math.max(1,e.g.len*L/0.62);e.cong[d]+=(Math.min(1.5,n/cap)-e.cong[d])*a}}}
function updateLights(S,dt){
  for(const n of S.nodes){if(n.eff!=="light"||!n.light)continue;const L=n.light;L.t+=dt;
    const q=[false,false];for(const a of n.arms)if(linkLanes(S,a.inLink)&&armApproaching(S,a,1.6))q[a.axis]=true;
    if(L.amber){if(L.t>1.2){L.amber=false;L.axis^=1;L.t=0}}
    else if(L.t>4&&q[L.axis^1]&&(!q[L.axis]||L.t>14)){L.amber=true;L.t=0}}}

// ---- chodci po chodnících a přes přechody ----
// w.sd = strana chodníku vůči směru chůze (+1 vpravo); přes silnici chodí jen po přechodech:
// v křižovatce přes přechody ramen, k domu na druhé straně po přechodu v úseku (nebo u cíle, když žádný není)
const sdOf=(l,side)=>side*((l&1)?-1:1);
function walkerEnd(S,w,aborted){if(w.dead)return;w.dead=true;releaseCross(S,w);walkerArrived(S,w,aborted)}
function releaseCross(S,w){const x=w.cur;if(!x||!x.held)return;x.held=false;
  if(x.node>=0){const n=S.nodes[x.node];if(n.xBusy)n.xBusy.set(x.eid,Math.max(0,(n.xBusy.get(x.eid)||0)-1))}
  else{const e=S.edges[x.eid];if(e.mbusy){const k=e.mbusy.indexOf(x.u);if(k>=0)e.mbusy.splice(k,1)}}}
// chodník u uzlu na rameni (směr ven h), strana sg (+1 = vpravo od směru ven)
function walkPt(S,n,a,dist,sg){const e=S.edges[a.e];const ext=Math.max(e.er,e.el)-RK[e.kind].side/2;const px=-a.hy,py=a.hx;return [n.x+a.hx*dist+px*ext*sg,n.y+a.hy*dist+py*ext*sg]}
// plán přechodů v uzlu: ramena, která chodec cestou z l do nl přejde, a nová strana
function walkerTurn(S,w,l,nl,wantSd){const n=S.nodes[linkTo(S,l)];
  if(n.edges.length<3){if((nl>>1)===(l>>1))return {sd:-w.sd,items:[]};return {sd:w.sd,items:[]}}
  const arms=[...n.arms].sort((p,q)=>Math.atan2(p.hy,p.hx)-Math.atan2(q.hy,q.hx));const m=arms.length;
  const iA=arms.findIndex(a=>a.e===(l>>1)),iB=arms.findIndex(a=>a.e===(nl>>1));if(iA<0||iB<0)return {sd:w.sd,items:[]};
  const between=(st)=>{const o=[];let i=(iA+st+m)%m;let g=0;while(i!==iB&&g++<m){o.push(arms[i]);i=(i+st+m)%m}return o};
  const dir=w.sd>0?-1:1;
  const keep=iA===iB?[]:between(dir),flip=iA===iB?[arms[iA]]:[arms[iA],...between(-dir)];
  const ok=list=>list.every(a=>crossOn(S,n,S.edges[a.e]));
  const opts=[{list:keep,sd:w.sd},{list:flip,sd:-w.sd}].map(o=>({...o,valid:ok(o.list)}));
  let pick=null;if(wantSd!==undefined)pick=opts.find(o=>o.sd===wantSd&&o.valid);
  if(!pick){const v=opts.filter(o=>o.valid);pick=(v.length?v:opts).sort((p,q)=>p.list.length-q.list.length)[0]}
  const items=[];const base=n.rad+0.05+XW/2;
  // chodec stojí na rohu ramene A na své straně
  const aA=arms[iA];let cur=walkPt(S,n,aA,base+XW,w.sd>0?-1:1);
  for(const a of pick.list){const e=S.edges[a.e];const p1=walkPt(S,n,a,base,1),p2=walkPt(S,n,a,base,-1);
    const d1=Math.hypot(p1[0]-cur[0],p1[1]-cur[1]),d2=Math.hypot(p2[0]-cur[0],p2[1]-cur[1]);const [s,t]=d1<=d2?[p1,p2]:[p2,p1];
    items.push({x0:s[0],y0:s[1],x1:t[0],y1:t[1],node:n.id,eid:e.id,zebra:crossOn(S,n,e)});cur=t}
  return {sd:pick.sd,items}}
// přejít úsek v místě s (přechod v úseku nebo u cíle)
function midCross(S,w,l,s){const e=S.edges[l>>1];const u=clamp((l&1)?e.g.len-s:s,0,e.g.len);const p=pointAt(e.g,u);const sd=RK[e.kind].side/2;
  const a=[p.x+p.nx*(e.er-sd),p.y+p.ny*(e.er-sd)],b=[p.x-p.nx*(e.el-sd),p.y-p.ny*(e.el-sd)];const fromRight=sdOf(l,w.sd)>0;
  const [s0,s1]=fromRight?[a,b]:[b,a];return {x0:s0[0],y0:s0[1],x1:s1[0],y1:s1[1],node:-1,eid:e.id,u,zebra:false}}
// na posledním úseku: kde přejít na stranu cíle
function planFinal(S,w){const l=w.links[w.li];if(w.li!==w.links.length-1||w.sd===w.goalSd){w.xAt=-1;return}
  const e=S.edges[l>>1];let best=w.sEnd;
  if(e.xw)for(const x of e.xw){const s=(l&1)?e.g.len-x.u:x.u;if(s>=w.s-0.05&&s<=w.sEnd&&s<best)best=s}
  w.xAt=best;w.xZebra=best<w.sEnd}
function canStartCross(S,w,x){
  if(x.node>=0){const n=S.nodes[x.node];for(const o of n.box){if(o.dead||!o.conn||o.conn.node!==n.id)continue;if((o.conn.from>>1)===x.eid||(o.conn.to>>1)===x.eid)return false}return true}
  const e=S.edges[x.eid];for(let d=0;d<2;d++){const sx=d?e.g.len-x.u:x.u;for(const q of e.q[d])for(const c of q){if(c.s>sx-0.45&&c.s<sx+c.len/2+0.2)return false}}return true}
function holdCross(S,x){x.held=true;if(x.node>=0){const n=S.nodes[x.node];if(!n.xBusy)n.xBusy=new Map();n.xBusy.set(x.eid,(n.xBusy.get(x.eid)||0)+1)}
  else{const e=S.edges[x.eid];(e.mbusy||(e.mbusy=[])).push(x.u)}}
function updateWalkers(S,dt){
  for(let k=S.walkers.length-1;k>=0;k--){const w=S.walkers[k];
    if(!w.dead){
      if(w.ph==="out"){w.t+=dt*w.speed/0.7;if(w.t>=1){w.ph="road";planFinal(S,w)}}
      else if(w.ph==="in"){w.t+=dt*w.speed/0.7;if(w.t>=1)walkerEnd(S,w,false)}
      else if(w.ph==="cross"){const x=w.cur;
        // chodec počká na mezeru; po 3 s si přechod „vyžádá“ a auta mu zastaví
        if(!x.go){w.cw=(w.cw||0)+dt;if(canStartCross(S,w,x)){if(!x.held)holdCross(S,x);x.go=true;w.cw=0}else if(!x.held&&w.cw>3)holdCross(S,x)}
        if(x.go){const L=Math.hypot(x.x1-x.x0,x.y1-x.y0)||0.1;w.t+=dt*w.speed/L;
          if(w.t>=1){releaseCross(S,w);S.xCount=(S.xCount||0)+1;w.queue.shift();
            if(w.queue.length){w.cur=w.queue[0];w.t=0}
            else{w.cur=null;w.t=0;if(w.afterIn){const to=w.trip.to;if(to&&!to.dead&&to.front!==undefined)w.ph="in";else walkerEnd(S,w,false)}else{w.ph="road";planFinal(S,w)}}}}}
      else{w.s+=w.speed*dt;
        while(!w.dead&&w.ph==="road"){const l=w.links[w.li],e=S.edges[l>>1];if(!e||e.dead){walkerEnd(S,w,true);break}
          const last=w.li===w.links.length-1;
          if(last&&w.xAt>=0&&w.s>=w.xAt){w.s=w.xAt;const x=midCross(S,w,l,w.s);x.zebra=!!w.xZebra;w.sd=-w.sd;const atEnd=w.xAt>=w.sEnd-0.01;w.xAt=-1;
            w.queue=[x];w.cur=x;w.ph="cross";w.t=0;w.afterIn=atEnd;break}
          if(last){if(w.s>=w.sEnd){w.s=w.sEnd;const to=w.trip.to;if(to&&!to.dead&&to.front!==undefined){w.ph="in";w.t=0}else walkerEnd(S,w,false)}break}
          if(w.s>=e.g.len){const nl=w.links[w.li+1];const r=walkerTurn(S,w,l,nl,w.li+1===w.links.length-1?w.goalSd:undefined);
            w.s-=e.g.len;w.li++;w.sd=r.sd;
            if(r.items.length){w.queue=r.items;w.cur=r.items[0];w.ph="cross";w.t=0;w.afterIn=false;w.carry=w.s;w.s=0;break}
            planFinal(S,w)}
          else break}}}
    if(w.dead){S.walkers[k]=S.walkers[S.walkers.length-1];S.walkers.pop()}}}
