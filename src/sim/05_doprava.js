// Doprava: auta v pruzích (fronty seřazené od čela), přednost v uzlech, výjezdy z budov, chodci.

// odsazení pruhu od osy úseku doprava ve směru jízdy; k=0 je vnitřní (levý) pruh
function laneOffset(e,d,k){const L=d?e.lb:e.lf;if(e.lb===0||e.lf===0)return -(L*LW)/2+(k+0.5)*LW;return RK[e.kind].median/2+(k+0.5)*LW}
// poloha auta v pruhu: x, y, úhel
function lanePose(S,l,lane,s,out){const e=S.edges[l>>1],d=l&1;const u=clamp(d?e.g.len-s:s,0,e.g.len);const p=pointAt(e.g,u,out||{});const off=laneOffset(e,d,lane),sg=d?-1:1;
  return {x:p.x+p.nx*off*sg,y:p.y+p.ny*off*sg,ang:Math.atan2(p.ty*sg,p.tx*sg),u,off}}
// stopčára před řízenou křižovatkou (-1 = bez zastavení)
function stopS(S,l){const n=S.nodes[linkTo(S,l)];if(n.eff==="none")return -1;const len=S.edges[l>>1].g.len;return Math.max(Math.min(0.15,len*0.5),len-n.rad-0.12)}
function newVehicle(S,o){const c=Object.assign({id:S.vid++,li:0,s:0,v:0,lane:0,len:o.truck?0.8:0.5,state:"exit",wait:0,sid:0,dead:false,ang:0,firstExit:true},o);S.cars.push(c);return c}
function qOf(S,c){const l=c.links[c.li];return S.edges[l>>1].q[l&1][c.lane]}
function removeQ(S,c){const q=qOf(S,c);if(!q)return;const k=q.indexOf(c);if(k>=0)q.splice(k,1)}
function insertQ(q,c){let i=0;while(i<q.length&&q[i].s>=c.s)i++;q.splice(i,0,c)}
function chooseLane(S,c,li){const l=c.links[li],L=linkLanes(S,l);if(L<=1)return 0;
  const nl=c.links[li+1];if(nl===undefined)return L-1;
  const n=S.nodes[linkTo(S,l)];const t=(n.turns.get(l)||[]).find(x=>x.link===nl);const turn=t?t.turn:0;
  if(turn===-1||turn===2)return 0;if(turn===1)return L-1;
  const q=S.edges[l>>1].q[l&1];let best=0,bn=1e9;for(let k=0;k<L;k++){const r=q[k][q[k].length-1];const free=r?r.s:99;if(-free+q[k].length<bn){bn=-free+q[k].length;best=k}}return best}
function armApproaching(S,a,d){const e=S.edges[a.e],lanes=e.q[a.inLink&1];if(!lanes)return false;for(const q of lanes){const f=q[0];if(f&&e.g.len-f.s<d)return true}return false}
function permit(S,c,l,nl){
  const n=S.nodes[linkTo(S,l)];const eff=n.eff;if(eff==="none")return true;
  const t=S.time,ignore=c.wait>3.5;
  if(eff!=="light"){for(const [k,tm] of n.armLast){if(k!==l&&t-tm<0.42&&c.wait<6)return false}}
  if(ignore)return true;
  const myArm=n.arms.find(a=>a.inLink===l);
  switch(eff){
    case"light":return !n.light.amber&&myArm&&myArm.axis===n.light.axis;
    case"ring":if(S.edges[l>>1].ring)return true;return !n.arms.some(a=>a.inLink!==l&&S.edges[a.e].ring&&linkLanes(S,a.inLink)&&armApproaching(S,a,1.1));
    case"merge":if(S.edges[l>>1].kind==="hwy")return true;return !n.arms.some(a=>a.inLink!==l&&S.edges[a.e].kind==="hwy"&&linkLanes(S,a.inLink)&&armApproaching(S,a,1.8));
    case"main":if(n.mainEdges.has(l>>1))return true;return !n.arms.some(a=>a.inLink!==l&&n.mainEdges.has(a.e)&&linkLanes(S,a.inLink)&&armApproaching(S,a,1.4));
    case"right":{if(!myArm)return true;const hx=-myArm.hx,hy=-myArm.hy,rx=-hy,ry=hx;
      for(const a of n.arms){if(a===myArm||!linkLanes(S,a.inLink))continue;if(a.hx*rx+a.hy*ry>0.55&&armApproaching(S,a,1.3))return false}return true}}
  return true}
// auto na stopčáře: smí vjet do křižovatky? (přednost a místo za křižovatkou)
function clearNode(S,c,l){const nl=c.links[c.li+1];const e2=S.edges[nl>>1];if(!e2||e2.dead)return true;
  if(!permit(S,c,l,nl))return false;
  const lane=chooseLane(S,c,c.li+1);const q=e2.q[nl&1][lane];if(!q)return true;const rear=q[q.length-1];
  if(rear&&rear.s<c.len+0.25&&c.wait<8)return false;
  S.nodes[linkTo(S,l)].armLast.set(l,S.time);return true}
function tryTransition(S,c,l){
  const nl=c.links[c.li+1];const e2=S.edges[nl>>1];if(e2.dead){killVehicle(S,c);return true}
  if(!c.cleared&&!permit(S,c,l,nl))return false;
  const lane=chooseLane(S,c,c.li+1);const q=e2.q[nl&1][lane];if(!q){killVehicle(S,c);return true}
  const rear=q[q.length-1];const over=Math.max(0,c.s-S.edges[l>>1].g.len);
  if(rear&&rear.s<(rear.len+c.len)/2+0.12+over&&c.wait<8)return false;
  if(!c.cleared)S.nodes[linkTo(S,l)].armLast.set(l,S.time);
  c.li++;c.lane=lane;c.cleared=false;c.s=rear?Math.max(0,Math.min(over,rear.s-(rear.len+c.len)/2-0.12)):over;q.push(c);c.sid=S.sid;e2.passes++;c.wait=0;return true}
// dojel k cíli: zajede do vjezdu (domy, parkoviště), u hranice mapy rovnou zmizí
function startEnter(S,c,l){const to=c.trip&&c.trip.to;
  if(!to||to.isGate||to.dead||to.front===undefined){c.state="arrived";arriveVehicle(S,c);return}
  const p=lanePose(S,l,c.lane,c.s);c.state="enter";c.t=0;c.ex=p.x;c.ey=p.y;c.eang=p.ang;S.entering.push(c)}
function tryExit(S,c,force){const l=c.links[0];const e=S.edges[l>>1];if(e.dead){killVehicle(S,c);return true}
  const q=e.q[l&1][c.lane];if(!q){killVehicle(S,c);return true}
  if(!force)for(const o of q){if(o.s>c.s+0.7)continue;if(o.s<c.s-1.1)break;return false}
  insertQ(q,c);c.state="drive";c.sid=S.sid;c.wait=0;e.passes++;return true}
function updateVehicles(S,dt){
  const sid=++S.sid;
  for(let k=S.exiting.length-1;k>=0;k--){const c=S.exiting[k];if(c.dead||c.state!=="exit"){S.exiting.splice(k,1);continue}
    if(tryExit(S,c,!c.firstExit&&c.wait>6)){S.exiting.splice(k,1);continue}
    c.wait+=dt;if(c.firstExit&&c.wait>8){S.exiting.splice(k,1);exitFailed(S,c)}}
  for(let k=S.entering.length-1;k>=0;k--){const c=S.entering[k];if(c.dead||c.state!=="enter"){S.entering.splice(k,1);continue}
    c.t+=dt/0.8;if(c.t>=1){S.entering.splice(k,1);arriveVehicle(S,c)}}
  for(const e of S.edges){if(e.dead)continue;const len=e.g.len,vb=BASE_SPEED*RK[e.kind].speed*(e.ring?0.75:1);
    for(let d=0;d<2;d++){const lanes=e.q[d];if(!lanes.length)continue;const l=e.id*2+d;
      for(let k=0;k<lanes.length;k++){const q=lanes[k];let leader=null;
        for(let i=0;i<q.length;){const c=q[i];
          if(c.sid===sid){leader=c;i++;continue}c.sid=sid;
          const last=c.li===c.links.length-1;
          const limit=leader?leader.s-(leader.len+c.len)/2-0.12:(last?c.sEnd:len+0.3);
          const vt=vb*(c.truck?0.8:1);let ns=Math.min(c.s+vt*dt,limit);if(ns<c.s)ns=c.s;
          if(!last&&!c.cleared){const st=stopS(S,l);
            if(st>=0){if(c.s>st+0.02)c.cleared=true; // už stojí v křižovatce (síť se změnila pod ním)
              else if(ns>=st-0.03){if(!leader&&clearNode(S,c,l))c.cleared=true;else ns=Math.max(c.s,Math.min(ns,st))}}}
          c.v=(ns-c.s)/dt;if(c.v<0.1*vt)c.wait+=dt;else if(!leader)c.wait=0;else c.wait=Math.max(0,c.wait-dt);
          c.s=ns;
          if(!leader){
            if(last&&c.s>=c.sEnd-0.03){if(canArrive(S,c)){q.splice(i,1);startEnter(S,c,l);continue}
              else if(c.wait>4){q.splice(i,1);lotFailed(S,c);continue}}
            else if(!last&&c.s>=len-0.03){if(tryTransition(S,c,l)){q.splice(i,1);continue}}}
          leader=c;i++}}}}}
function killVehicle(S,c){if(c.dead)return;if(c.state==="drive")removeQ(S,c);c.dead=true;c.state="gone";releaseVehicle(S,c)}
function rerouteVehicle(S,c){
  if(c.state==="exit"){const p=findPath(S,c.startEp,c.goalEp);if(!p){killVehicle(S,c);return}c.links=p.links;c.s=p.s0;c.sEnd=p.sEnd;c.li=0;c.lane=chooseLane(S,c,0);return}
  const l=c.links[c.li],e=S.edges[l>>1];if(e.dead){killVehicle(S,c);return}
  const u=(l&1)?e.g.len-c.s:c.s;const p=findPath(S,{e:e.id,u:clamp(u,0,e.g.len),dirs:[l&1]},c.goalEp);
  if(!p||p.links[0]!==l){killVehicle(S,c);return}
  c.links=p.links;c.li=0;c.sEnd=p.sEnd}
function killOnEdge(S,eid){
  for(const c of S.cars){if(c.dead)continue;
    if(c.state==="drive"&&(c.links[c.li]>>1)===eid){removeQ(S,c);c.state="gone";c.dead=true;releaseVehicle(S,c);continue}
    if(c.state==="exit"&&(c.links[0]>>1)===eid){c.dead=true;c.state="gone";releaseVehicle(S,c);continue}
    for(let k=c.li;k<c.links.length;k++)if((c.links[k]>>1)===eid){c.rerouteFrom=eid;S.reroute.push(c);break}}
  for(const w of S.walkers){if(w.dead)continue;for(let k=w.li;k<w.links.length;k++)if((w.links[k]>>1)===eid){w.dead=true;walkerArrived(S,w,true);break}}}
function updateCongestion(S,dt){const a=Math.min(1,dt*0.6);
  for(const e of S.edges){if(e.dead)continue;for(let d=0;d<2;d++){const L=d?e.lb:e.lf;if(!L){e.cong[d]=0;continue}let n=0;for(const q of e.q[d])n+=q.length;
    const cap=Math.max(1,e.g.len*L/0.62);e.cong[d]+=(Math.min(1.5,n/cap)-e.cong[d])*a}}}
function updateLights(S,dt){
  for(const n of S.nodes){if(n.eff!=="light"||!n.light)continue;const L=n.light;L.t+=dt;
    const q=[false,false];for(const a of n.arms)if(linkLanes(S,a.inLink)&&armApproaching(S,a,1.6))q[a.axis]=true;
    if(L.amber){if(L.t>1.2){L.amber=false;L.axis^=1;L.t=0}}
    else if(L.t>4&&q[L.axis^1]&&(!q[L.axis]||L.t>14)){L.amber=true;L.t=0}}}
// ---- chodci po chodnících ----
function updateWalkers(S,dt){
  for(let k=S.walkers.length-1;k>=0;k--){const w=S.walkers[k];
    if(!w.dead){
      if(w.ph==="out"){w.t+=dt*w.speed/0.7;if(w.t>=1)w.ph="road"}
      else if(w.ph==="in"){w.t+=dt*w.speed/0.7;if(w.t>=1){w.dead=true;walkerArrived(S,w,false)}}
      else{w.s+=w.speed*dt;
        while(!w.dead){const l=w.links[w.li],e=S.edges[l>>1];if(!e||e.dead){w.dead=true;walkerArrived(S,w,true);break}
          const last=w.li===w.links.length-1;
          if(last){if(w.s>=w.sEnd){w.s=w.sEnd;const to=w.trip.to;if(to&&!to.dead&&to.front!==undefined){w.ph="in";w.t=0}else{w.dead=true;walkerArrived(S,w,false)}}break}
          if(w.s>=e.g.len){w.s-=e.g.len;w.li++}else break}}}
    if(w.dead){S.walkers[k]=S.walkers[S.walkers.length-1];S.walkers.pop()}}}
