// Doprava: auta v pruzích (fronty seřazené od čela), průjezd křižovatkou po oblouku, přednost,
// výjezdy z budov, přechody pro chodce a chodci.
//
// Úsek se v křižovatce (uzel se 3 a více rameny) zkracuje o „plochu křižovatky“ (e.ta / e.tb),
// do které patří i přechody. Auto stojí na jejím okraji (stopčára) a do křižovatky vjede, až má
// přednost, volnou plochu a místo za křižovatkou. Pak patří do fronty cílového pruhu se záporným
// s a jede po oblouku (c.conn) – nikdy se nepřekryje s jiným autem.

const XW=0.32;   // šířka přechodu pro chodce
// odsazení pruhu od osy úseku doprava ve směru jízdy; k=0 je vnitřní (levý) pruh
function laneOffset(e,d,k){const L=d?e.lb:e.lf;if(e.lb===0||e.lf===0)return -(L*LW)/2+(k+0.5)*LW+(e.sh||0);return RK[e.kind].median/2+(k+0.5)*LW}
// poloha auta v pruhu: x, y, úhel
function lanePose(S,l,lane,s,out){const e=S.edges[l>>1],d=l&1;const u=clamp(d?e.g.len-s:s,0,e.g.len);const p=pointAt(e.g,u,out||{});const off=laneOffset(e,d,lane),sg=d?-1:1;
  return {x:p.x+p.nx*off*sg,y:p.y+p.ny*off*sg,ang:Math.atan2(p.ty*sg,p.tx*sg),u,off}}
// přechod na rameni křižovatky: uzel se 3+ rameny, silnice s chodníkem, hráč ho nezrušil
// přechod na rameni křižovatky: uzel se 3+ rameny bez dálnice, silnice s chodníkem, hráč ho nezrušil,
// rameno je dost dlouhé a nesvírá se sousedním ramenem moc ostře (přechod by ležel na jiné silnici)
function crossOn(S,n,e){if(n.edges.length<3||!RK[e.kind].walk||!RK[e.kind].side||e.ring||n.xOff&&n.xOff.has(e.id))return false;
  if(n.arms.some(a=>S.edges[a.e].kind==="hwy")||n.pass||n.port)return false;
  if(e.g.len<n.rad+0.05+XW+0.5)return false;
  const a=n.arms.find(q=>q.e===e.id);if(!a)return false;for(const b of n.arms){if(b===a)continue;if(a.hx*b.hx+a.hy*b.hy>0.64)return false}
  return true}
// zkrácení úseku na koncích [u a, u b] (plocha křižovatky + přechod), u krátkých úseků poměrně
function edgeTrim(e){let ta=e.ta||0,tb=e.tb||0;const av=Math.max(0.1,e.g.len-0.25);if(ta+tb>av){const f=av/(ta+tb);ta*=f;tb*=f}return [ta,tb]}
function linkIn(S,l){const e=S.edges[l>>1],t=edgeTrim(e);return (l&1)?t[1]:t[0]}
function linkOut(S,l){const e=S.edges[l>>1],t=edgeTrim(e);return e.g.len-((l&1)?t[0]:t[1])}
// stopčára (konec úseku před křižovatkou); -1 = rovné navázání bez křižovatky
// uzel s plochou, kterou auta projíždějí po oblouku: křižovatka, nebo konec silnice s jednosměrkami na pruzích
const isBox=n=>n.edges.length>=3||!!n.endPort;
function stopS(S,l){const n=S.nodes[linkTo(S,l)];if(!isBox(n))return -1;return linkOut(S,l)}
function newVehicle(S,o){const c=Object.assign({id:S.vid++,li:0,s:0,v:0,lane:0,len:o.truck?0.8:0.5,state:"exit",wait:0,sid:0,dead:false,ang:0,firstExit:true,conn:null},o);S.cars.push(c);return c}
function qOf(S,c){const l=c.links[c.li];return S.edges[l>>1].q[l&1][c.lane]}
function removeQ(S,c){const q=qOf(S,c);if(!q)return;const k=q.indexOf(c);if(k>=0)q.splice(k,1)}
function insertQ(q,c){let i=0;while(i<q.length&&q[i].s>=c.s)i++;q.splice(i,0,c)}
const turnOf=(S,l,nl)=>{const n=S.nodes[linkTo(S,l)];const t=(n.turns.get(l)||[]).find(x=>x.link===nl);return t?t.turn:0};
// spojení pruhů na konci odkazu l
function lcOf(S,l){const n=S.nodes[linkTo(S,l)];return n.lc?n.lc.get(l):null}
// pruhy odkazu li, ze kterých auto dojede dál po své trase (s výhledem přes další uzly)
function goodLanes(S,links,li,depth){const l=links[li],L=linkLanes(S,l),nl=links[li+1];const all=[];for(let k=0;k<L;k++)all.push(k);if(nl===undefined)return all;
  const lc=lcOf(S,l);if(!lc||lc.length!==L)return all;
  const g=all.filter(k=>lc[k].some(x=>x.link===nl));if(!g.length)return all;
  if(depth>0){const nx=goodLanes(S,links,li+1,depth-1);
    // nejlepší jsou pruhy, které vedou přímo do dobrého pruhu dalšího úseku; jinak ty, které k němu vedou nejblíž
    let best=99;const ds=g.map(k=>{let m=99;for(const x of lc[k])if(x.link===nl)for(const y of nx)m=Math.min(m,Math.abs(x.lane-y));best=Math.min(best,m);return m});
    return g.filter((k,i)=>ds[i]===best)}
  return g}
function chooseLane(S,c,li){const g=goodLanes(S,c.links,li,2);if(c.state==="drive"&&li===c.li&&g.includes(c.lane))return c.lane;return g[g.length-1]}
// přeřazení do sousedního pruhu t, když je vedle místo
function laneShift(S,e,d,c,t){const q2=e.q[d][t];if(!q2)return false;
  for(const o of q2){const dz=o.s-c.s,need=(o.len+c.len)/2+0.12;if(Math.abs(dz)<need)return false;if(dz<0){if(o.v>0.3&&-dz<need+0.25)return false;break}}
  c.lcD=Math.sign(t-c.lane);c.lane=t;insertQ(q2,c);c.lcT=1.0;c.zip=0;return true}
// dvě auta vedle sebe, každé chce do pruhu toho druhého: vymění si pruhy (průplet)
function laneSwap(S,e,d,c,i,t){const k=c.lane,q=e.q[d][k],q2=e.q[d][t];if(!q2||q[i]!==c)return false;
  for(let j=0;j<q2.length;j++){const o=q2[j];if(o.s<c.s-0.5)break;if(Math.abs(o.s-c.s)>0.5||o.conn||o.lcT>0||!o.need||o.needL!==c.needL||o.need.includes(t))continue;
    let b=o.need[0];for(const x of o.need)if(Math.abs(x-t)<Math.abs(b-t))b=x;if(Math.sign(b-t)!==Math.sign(k-t))continue;
    const fit=(qq,m,x)=>{const up=qq[m-1],dn=qq[m+1];return (!up||up.s-x.s>=(up.len+x.len)/2+0.1)&&(!dn||x.s-dn.s>=(dn.len+x.len)/2+0.1)};
    if(!fit(q2,j,c)||!fit(q,i,o))continue;
    q[i]=o;q2[j]=c;o.lane=k;c.lane=t;c.lcD=Math.sign(t-k);o.lcD=-c.lcD;o.lcT=c.lcT=1.0;o.zip=c.zip=0;o.sid=c.sid;return true}
  return false}
function armApproaching(S,a,d){const e=S.edges[a.e],lanes=e.q[a.inLink&1];if(!lanes)return false;const so=linkOut(S,a.inLink);for(const q of lanes){const f=q[0];if(f&&so-f.s<d)return true}return false}
// přednost podle pravidla křižovatky (po 3,5 s čekání se přednost pustí, plocha křižovatky se hlídá vždy)
function permit(S,c,l,nl,turn){
  const n=S.nodes[linkTo(S,l)];const eff=n.eff;if(eff==="none")return true;
  if(eff!=="light"&&c.wait>3.5)return true;
  const myArm=n.arms.find(a=>a.inLink===l);
  switch(eff){
    case"light":{if(n.light.amber||!myArm||myArm.axis!==n.light.axis)return false;
      // odbočení vlevo dává přednost protijedoucím
      if(turn===-1&&c.wait<6)for(const a of n.arms){if(a===myArm||a.axis!==myArm.axis||!linkLanes(S,a.inLink))continue;if(a.hx*myArm.hx+a.hy*myArm.hy<-0.5&&armApproaching(S,a,1.5))return false}
      return true}
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
    if(Math.hypot(cn.x3-p.x3,cn.y3-p.y3)<0.18||Math.hypot(cn.x0-p.x0,cn.y0-p.y0)<0.18)return false}
  return true}
// auto ve špatném pruhu u křižovatky: pojede tam, kam jeho pruh vede, a najde si odtud novou cestu
function missTurn(S,c,l,row){
  for(const x of [...row].sort((a,b)=>Math.abs(a.turn)-Math.abs(b.turn))){const xe=S.edges[x.link>>1];if(!xe||xe.dead||!c.goalEp)continue;
    const p=findPath(S,{e:xe.id,u:(x.link&1)?xe.g.len:0,dirs:[x.link&1]},c.goalEp);if(!p||p.links[0]!==x.link)continue;
    c.links=c.links.slice(0,c.li+1).concat(p.links);const lz=p.links[p.links.length-1];c.sEnd=clamp(p.sEnd,linkIn(S,lz)+0.3,Math.max(linkIn(S,lz)+0.3,linkOut(S,lz)-0.3));
    c.needLi=-1;S.missed=(S.missed||0)+1;return x}
  return null}
function tryTransition(S,c,l){
  let nl=c.links[c.li+1];let e2=S.edges[nl>>1];if(!e2||e2.dead){killVehicle(S,c);return true}
  const n=S.nodes[linkTo(S,l)];const lc=lcOf(S,l);const row=lc&&lc[c.lane]||null;
  let cands=row?row.filter(x=>x.link===nl):[{link:nl,lane:chooseLane(S,c,c.li+1),turn:0,free:false}];
  if(!cands.length){ // špatný pruh: chvíli čeká na místo vedle, pak odbočku mine
    if(c.wait<1.5)return false;
    const x=missTurn(S,c,l,row);
    if(x){cands=[x];nl=x.link;e2=S.edges[nl>>1]}
    else{const g=goodLanes(S,c.links,c.li,0);let b=g[0];for(const k of g)if(Math.abs(k-c.lane)<Math.abs(b-c.lane))b=k;cands=(lc[b]||[]).filter(q=>q.link===nl);if(!cands.length)cands=[{link:nl,lane:0,turn:0,free:false}]}}
  if(cands.length>1){const nx=goodLanes(S,c.links,c.li+1,1);cands=[...cands].sort((a,b)=>(nx.includes(a.lane)?0:1)-(nx.includes(b.lane)?0:1)||Math.abs(a.lane-c.lane)-Math.abs(b.lane-c.lane))}
  let pm=null;
  for(const x of cands){const lane=x.lane;const q=e2.q[nl&1][lane];if(!q)continue;
    if(!x.free){if(pm===null)pm=permit(S,c,l,nl,x.turn);if(!pm)continue}
    const rear=q[q.length-1];
    if(!isBox(n)){ // rovné navázání úseků: auto jen pokračuje
      const over=Math.max(0,c.s-S.edges[l>>1].g.len);
      if(rear&&rear.s-(rear.len+c.len)/2-0.12<over)continue;
      c.li++;c.lane=lane;c.s=over;q.push(c);c.sid=S.sid;e2.passes++;c.wait=0;c.zip=0;return true}
    const sIn=linkIn(S,nl);
    // za křižovatkou musí být místo pro celé auto, jinak by v ní uvízlo
    if(rear&&rear.s-rear.len/2-0.12<sIn+c.len/2+0.02)continue;
    const a=lanePose(S,l,c.lane,c.s),b=lanePose(S,nl,lane,sIn);const cn=mkConn(a,b);
    if(!boxFree(S,n,l,nl,lane,cn))continue;
    cn.node=n.id;cn.from=l;cn.to=nl;cn.s0=sIn-cn.len;cn.s1=sIn;
    cn.turn=x.turn;c.li++;c.lane=lane;c.s=cn.s0;c.conn=cn;q.push(c);n.box.push(c);c.sid=S.sid;e2.passes++;c.wait=0;c.zip=0;return true}
  return false}
function leaveBox(S,c){if(!c.conn)return;const n=S.nodes[c.conn.node];const k=n.box.indexOf(c);if(k>=0)n.box.splice(k,1);c.conn=null}
// dojel k cíli: z pruhu zahne na příjezd a jede po něm (na parkoviště na zamluvené místo); u hranice mapy zmizí
function startEnter(S,c,l){const to=c.trip&&c.trip.to;leaveBox(S,c);
  if(!to||to.isGate||to.dead||to.front===undefined){c.state="arrived";arriveVehicle(S,c);return}
  const p=lanePose(S,l,c.lane,c.s);let i=-1;const lay=lotLayout(S,to);
  if(lay){if(isHome(to)){if(to.type==="flat")i=Math.min(lay.carSpots-1,homeCars(to))}
    else{i=freeSpot(S,to,!!(c.truck||c.trip&&c.trip.truck));if(i>=0){to.spotUsed[i]=c;c.spotB=to;c.spot=i}}}
  c.path=enterPath(S,to,i,[p.x,p.y]);if(!c.path){c.state="arrived";arriveVehicle(S,c);return}
  c.state="enter";c.plen=pathLen(c.path);c.ps=0;S.entering.push(c)}
function tryExit(S,c){const l=c.links[0];const e=S.edges[l>>1];if(e.dead){killVehicle(S,c);return true}
  const q=e.q[l&1][c.lane];if(!q){killVehicle(S,c);return true}
  for(const o of q){const need=(o.len+c.len)/2+0.12;if(o.s>c.s+need+0.1)continue;if(o.s<c.s-1.1)break;if(o.s<c.s-need&&o.v<0.25)break;return false}
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
  // auta na příjezdech a parkovištích, po budovách (za sebou jedoucí si drží odstup)
  const mv=new Map();for(const c of S.entering.concat(S.unparking)){if(c.dead||!c.path)continue;const b=lotOwner(c);if(!b)continue;let a=mv.get(b);if(!a)mv.set(b,a=[]);a.push(c)}
  for(let k=S.entering.length-1;k>=0;k--){const c=S.entering[k];if(c.dead||c.state!=="enter"){S.entering.splice(k,1);continue}
    moveOnPath(S,c,dt,mv.get(lotOwner(c))||[]);if(c.ps>=c.plen-1e-6){S.entering.splice(k,1);arriveVehicle(S,c)}}
  for(let k=S.unparking.length-1;k>=0;k--){const c=S.unparking[k];if(c.dead||c.state!=="unpark"){S.unparking.splice(k,1);continue}
    moveOnPath(S,c,dt,mv.get(lotOwner(c))||[]);
    if(c.ps>=c.plen-1e-6){S.unparking.splice(k,1);if(c.spotB){releaseSpot(c.spotB,c.spot,c);c.spotB=null}const q=pathPose(c.path,c.plen);c.ux=q.x;c.uy=q.y;c.uang=q.ang;c.state="exit";c.wait=0;S.exiting.push(c)}}
  for(const e of S.edges){if(e.dead)continue;const len=e.g.len,vb=BASE_SPEED*RK[e.kind].speed*(e.ring?0.75:1);const mb=e.mbusy&&e.mbusy.length?e.mbusy:null;
    for(let d=0;d<2;d++){const lanes=e.q[d];if(!lanes.length)continue;const l=e.id*2+d;const box=isBox(S.nodes[d?e.a:e.b]);const sOut=box?linkOut(S,l):len;
      let zl=e.zl&&e.zl[d];if(zl&&zl.length){zl=e.zl[d]=zl.filter(z=>!z.dead&&z.zip&&z.state==="drive"&&z.links[z.li]===l);if(!zl.length)zl=null}else zl=null;
      for(let k=0;k<lanes.length;k++){const q=lanes[k];let leader=null;
        for(let i=0;i<q.length;){const c=q[i];
          if(c.sid===sid){leader=c;i++;continue}c.sid=sid;
          const last=c.li===c.links.length-1;
          let limit=leader?leader.s-(leader.len+c.len)/2-0.12:(last?c.sEnd:(box?sOut-c.len/2-0.04:len+0.3));
          if(zl)for(const z of zl){if(z.zip===k+1&&z!==c&&c.s+c.len/2<z.s-z.len/2+0.05)limit=Math.min(limit,z.s-(z.len+c.len)/2-0.2)}
          if(mb)for(const u of mb){const sx=d?len-u:u;if(c.s+c.len/2<sx-0.05)limit=Math.min(limit,sx-0.28-c.len/2)}
          const vt=vb*(c.truck?0.8:1);let ns=Math.min(c.s+vt*dt,limit);if(ns<c.s)ns=c.s;
          c.v=(ns-c.s)/dt;if(c.v<0.1*vt)c.wait+=dt;else if(!leader)c.wait=0;else c.wait=Math.max(0,c.wait-dt);
          c.s=ns;
          if(c.conn&&c.s>=c.conn.s1+c.len/2)leaveBox(S,c);
          if(c.lcT>0)c.lcT-=dt;
          else if(lanes.length>1&&!c.conn){
            if(c.needLi!==c.li||c.needL!==l){c.need=goodLanes(S,c.links,c.li,2);c.needLi=c.li;c.needL=l}
            const nd=c.need;let t=-1;
            if(!nd.includes(k)){let b=nd[0];for(const x of nd)if(Math.abs(x-k)<Math.abs(b-k))b=x;t=k+Math.sign(b-k)}
            else if(leader&&nd.length>1&&c.v<0.5*vt&&leader.s-c.s<1.2){const gap=leader.s-c.s;
              for(const a of [k+1,k-1]){if(!nd.includes(a))continue;let ga=9;for(const o of lanes[a]){if(o.s>c.s)ga=o.s-c.s;else break}if(ga>gap+1.2){t=a;break}}}
            if(t>=0){if(laneShift(S,e,d,c,t)){(q[i]===c&&q.splice(i,1));continue}
              if(!nd.includes(k)&&laneSwap(S,e,d,c,i,t)){leader=q[i];i++;continue}
              if(!nd.includes(k)&&c.v<0.05&&c.wait>0.8&&!c.zip){c.zip=t+1;if(!e.zl)e.zl=[[],[]];e.zl[d].push(c)}}
            else c.zip=0}
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
  c.links=p.links;c.li=0;c.needLi=-1;const lz=p.links[p.links.length-1];c.sEnd=clamp(p.sEnd,linkIn(S,lz)+0.3,Math.max(linkIn(S,lz)+0.3,linkOut(S,lz)-0.3));if(p.links.length===1)c.sEnd=Math.max(c.sEnd,c.s)}
// auto zváží, jestli není lepší cesta (po stavbě nové silnice, nebo když dlouho stojí); historie trasy zůstává
function replanVehicle(S,c){if(c.dead||c.state!=="drive"||c.conn||!c.goalEp)return false;const l=c.links[c.li],e=S.edges[l>>1];if(!e||e.dead)return false;
  if(c.li<c.links.length-1&&linkOut(S,l)-c.s<2.5)return false;   // těsně před křižovatkou už se neřadí jinam
  const u=(l&1)?e.g.len-c.s:c.s;const p=findPath(S,{e:e.id,u:clamp(u,0,e.g.len),dirs:[l&1]},c.goalEp);if(!p||p.links[0]!==l)return false;
  let same=p.links.length===c.links.length-c.li;if(same)for(let k=0;k<p.links.length;k++)if(p.links[k]!==c.links[c.li+k]){same=false;break}
  if(same)return false;
  // jen když je nová cesta znatelně rychlejší (jinak by se všichni naráz přelili jinam)
  let co=0,cn=0;for(let k=c.li+1;k<c.links.length;k++){const x=S.edges[c.links[k]>>1];if(!x||x.dead){co=1e9;break}co+=linkCost(S,c.links[k])}for(let k=1;k<p.links.length;k++)cn+=linkCost(S,p.links[k]);
  if(cn>co*0.9)return false;
  c.links=c.links.slice(0,c.li).concat(p.links);c.needLi=-1;const lz=p.links[p.links.length-1];c.sEnd=clamp(p.sEnd,linkIn(S,lz)+0.3,Math.max(linkIn(S,lz)+0.3,linkOut(S,lz)-0.3));if(p.links.length===1)c.sEnd=Math.max(c.sEnd,c.s);return true}
function updateReplan(S,dt){
  if(S.rpVer!==S.netVer){S.rpVer=S.netVer;S.rpT=1.5}
  if(S.rpT>0){S.rpT-=dt;if(S.rpT<=0)S.rpQ=S.cars.filter(c=>!c.dead&&c.state==="drive")}
  S.rpJam=(S.rpJam||0)+dt;if(S.rpJam>6&&!(S.rpQ&&S.rpQ.length)){S.rpJam=0;S.rpQ=S.cars.filter(c=>!c.dead&&c.state==="drive"&&c.wait>4)}
  if(S.rpQ&&S.rpQ.length){for(let k=0;k<25&&S.rpQ.length;k++){if(replanVehicle(S,S.rpQ.pop()))S.replanned=(S.replanned||0)+1}}}
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
