// ---- chodci: síť chodníků a přechodů (S.ped) ----
// Chodník po každé straně silnice je dráha. Na konci úseku u křižovatky končí na úrovni přechodu; rohy
// křižovatky spojuje oblouk kolem obrubníku, přechod je dráha napříč ramenem. Přes Uličku a Ulici se smí
// přejít i bez přechodu (místa po 2 polích a na rameni křižovatky), přes ostatní silnice jen po přechodu.
// Chodec hledá cestu po této síti a jde po ní; na přechodu čeká, až může, a auta mu pak dají přednost.
// Nikdo nechodí po vozovce mimo přechody a nikdo nemizí: po změně sítě si chodec najde cestu znovu.

const PED_KEEP=0.03,PED_GAP=0.14;
const FREE_X=k=>k==="alley"||k==="street";          // druhy silnic, přes které se smí přejít i mimo přechod
const pedEdge=e=>!e.dead&&RK[e.kind].walk&&RK[e.kind].side>0;
// osa chodníku: odsazení od osy silnice (+ vpravo ve směru a→b)
function swOff(e,sg){const s=RK[e.kind].side;return sg>0?e.er-s/2:-(e.el-s/2)}
function swPt(e,u,sg){const p=pointAt(e.g,clamp(u,0,e.g.len));const o=swOff(e,sg);return [p.x+p.nx*o,p.y+p.ny*o]}
function swPts(e,u0,u1,sg){const g=e.g,o=swOff(e,sg),out=[];const lo=Math.min(u0,u1),hi=Math.max(u0,u1);
  const at=u=>{const p=pointAt(g,clamp(u,0,g.len));return [p.x+p.nx*o,p.y+p.ny*o]};out.push(at(lo));for(let k=0;k<g.n;k++){if(g.cum[k]>lo+1e-6&&g.cum[k]<hi-1e-6){const nx=g.nx[k],ny=g.ny[k];out.push([g.pts[2*k]+nx*o,g.pts[2*k+1]+ny*o])}}out.push(at(hi));
  if(u1<u0)out.reverse();return out}
// kde chodník u uzlu končí (vzdálenost od uzlu): u křižovatky na úrovni přechodu, jinak u uzlu
function swEnd(S,e,atA){const n=S.nodes[atA?e.a:e.b];if(n.edges.length<3)return 0;const a=n.arms.find(q=>q.e===e.id);return (a?a.cut:n.rad)+0.05+XW/2}
function buildPed(S){const P={nodes:[],links:[],sw:new Map(),ver:S.netVer};
  const node=(x,y)=>{P.nodes.push({id:P.nodes.length,x,y,ls:[]});return P.nodes.length-1};
  const link=(a,b,pts,kind,ex)=>{if(a===b)return null;const L=Object.assign({id:P.links.length,a,b,pts,len:Math.max(0.01,pathLen(pts)),kind},ex||{});P.links.push(L);P.nodes[a].ls.push(L.id);P.nodes[b].ls.push(L.id);return L};
  for(const e of S.edges){if(!pedEdge(e))continue;
    let ua=swEnd(S,e,true),ub=e.g.len-swEnd(S,e,false);if(ub<ua){const m=(ua+ub)/2;ua=m;ub=m}
    const st=[ua,ub];if(e.xw)for(const x of e.xw)if(x.u>ua+0.1&&x.u<ub-0.1)st.push(x.u);
    if(FREE_X(e.kind))for(let u=ua+1;u<ub-0.5;u+=2)st.push(u);
    st.sort((a,b)=>a-b);const us=st.filter((u,i)=>i===0||u-st[i-1]>0.05);
    for(const sg of [1,-1]){const list=us.map(u=>{const q=swPt(e,u,sg);return {u,node:node(q[0],q[1])}});
      for(let i=1;i<list.length;i++)link(list[i-1].node,list[i].node,swPts(e,list[i-1].u,list[i].u,sg),"walk",{e:e.id});
      P.sw.set(e.id*2+(sg>0?0:1),list)}
    const R=P.sw.get(e.id*2),L=P.sw.get(e.id*2+1);
    for(let i=0;i<us.length;i++){const u=us[i];if(i===0||i===us.length-1)continue;const zeb=e.xw&&e.xw.some(x=>Math.abs(x.u-u)<0.06);
      link(R[i].node,L[i].node,[[P.nodes[R[i].node].x,P.nodes[R[i].node].y],[P.nodes[L[i].node].x,P.nodes[L[i].node].y]],zeb?"zebra":"free",{eid:e.id,u,node:-1})}}
  // rohy a přechody u uzlů
  const end=(e,atA,sg)=>{const l=P.sw.get(e.id*2+(sg>0?0:1));return l?(atA?l[0]:l[l.length-1]):null};
  for(const n of S.nodes){if(n.dead)continue;const arms=n.arms.filter(a=>pedEdge(S.edges[a.e])).sort((a,b)=>Math.atan2(a.hy,a.hx)-Math.atan2(b.hy,b.hx));const m=arms.length;if(!m)continue;
    // strana chodníku vpravo / vlevo při pohledu z uzlu ven
    const side=(a,right)=>{const e=S.edges[a.e],out=e.a===n.id;const sg=(right?1:-1)*(out?1:-1);return {e,atA:out,sg,st:end(e,out,sg)}};
    if(m===1&&n.edges.length===1){const a=arms[0],r=side(a,true),l=side(a,false);if(!r.st||!l.st)continue;
      // slepý konec: obejít kolem konce silnice
      const e=a.e!==undefined?S.edges[a.e]:null,rad=Math.max(e.er,e.el)-RK[e.kind].side/2,ang=Math.atan2(-a.hy,-a.hx),pts=[];
      const ra=Math.atan2(P.nodes[r.st.node].y-n.y,P.nodes[r.st.node].x-n.x);let la=Math.atan2(P.nodes[l.st.node].y-n.y,P.nodes[l.st.node].x-n.x);
      let d=la-ra;while(d<=0)d+=Math.PI*2;if(Math.abs(d-Math.PI*2)<1e-3)d=Math.PI;const mid=ra+d/2;let dd=d;if(Math.cos(mid-ang)<0)dd=d-Math.PI*2;
      for(let i=0;i<=8;i++){const t=ra+dd*i/8;pts.push([n.x+Math.cos(t)*rad,n.y+Math.sin(t)*rad])}
      pts[0]=[P.nodes[r.st.node].x,P.nodes[r.st.node].y];pts[pts.length-1]=[P.nodes[l.st.node].x,P.nodes[l.st.node].y];link(r.st.node,l.st.node,pts,"walk");continue}
    for(let i=0;i<m;i++){const A=arms[i],B=arms[(i+1)%m];if(m===1)break;const ar=side(A,true),bl=side(B,false);if(!ar.st||!bl.st)continue;
      const pa=[P.nodes[ar.st.node].x,P.nodes[ar.st.node].y],pb=[P.nodes[bl.st.node].x,P.nodes[bl.st.node].y];
      // oblouk kolem rohu: přes průsečík os obou chodníků (když se potkají před uzlem)
      const oa=Math.abs(swOff(ar.e,ar.sg)),ob=Math.abs(swOff(bl.e,bl.sg));
      const P0=[n.x-A.hy*oa,n.y+A.hx*oa],Q0=[n.x+B.hy*ob,n.y-B.hx*ob];const den=A.hx*B.hy-A.hy*B.hx;let ctrl=null;
      if(Math.abs(den)>0.04){const dx=Q0[0]-P0[0],dy=Q0[1]-P0[1];const t=(dx*B.hy-dy*B.hx)/den,s=(dx*A.hy-dy*A.hx)/den;if(t>0&&s>0)ctrl=[P0[0]+A.hx*t,P0[1]+A.hy*t]}
      const pts=[pa];if(ctrl){for(let k=1;k<8;k++){const t=k/8,u=1-t;pts.push([u*u*pa[0]+2*u*t*ctrl[0]+t*t*pb[0],u*u*pa[1]+2*u*t*ctrl[1]+t*t*pb[1]])}}pts.push(pb);
      link(ar.st.node,bl.st.node,pts,"walk")}
    // přechod přes rameno křižovatky (zebra), u Uličky a Ulice i bez zebry
    if(n.edges.length>=3)for(const a of arms){const e=S.edges[a.e];const r=side(a,true),l=side(a,false);if(!r.st||!l.st)continue;
      const zeb=crossOn(S,n,e);if(!zeb&&!FREE_X(e.kind))continue;
      link(r.st.node,l.st.node,[[P.nodes[r.st.node].x,P.nodes[r.st.node].y],[P.nodes[l.st.node].x,P.nodes[l.st.node].y]],zeb?"zebra":"free",{eid:e.id,node:n.id,u:r.st.u})}}
  return P}
function pedNet(S){if(!S.ped||S.ped.ver!==S.netVer)S.ped=buildPed(S);return S.ped}
// místo budovy na chodníku: chodník na straně budovy u vjezdu, dveře
function pedEnd(S,b){if(!b||b.isGate||b.dead||!b.access)return null;const e=S.edges[b.access.e];if(!e||!pedEdge(e))return null;
  const sg=b.access.side>0?1:-1;const door=b.drive?b.drive.door:[wxOf(b.front),wyOf(b.front)];return {e,u:b.access.u,sg,door,p:swPt(e,b.access.u,sg)}}
// hledání cesty (A*): z budovy do budovy po chodnících; null, když cesta není nebo je delší než maxLen
function pedRoute(S,from,to,maxLen){const P=pedNet(S);const A=pedEnd(S,from),B=pedEnd(S,to);if(!A||!B)return null;
  // dočasné uzly na chodníku u obou budov
  const tmp=[],tl=[];const tnode=(x,y)=>{const id=P.nodes.length+tmp.length;tmp.push({id,x,y,ls:[]});return id};
  const N=id=>id<P.nodes.length?P.nodes[id]:tmp[id-P.nodes.length];
  const tlink=(a,b,pts,kind,ex)=>{const L=Object.assign({id:P.links.length+tl.length,a,b,pts,len:Math.max(0.01,pathLen(pts)),kind},ex||{});tl.push(L);N(a).ls.push(L.id);N(b).ls.push(L.id);return L};
  const LK=id=>id<P.links.length?P.links[id]:tl[id-P.links.length];
  const attach=E=>{const id=tnode(E.p[0],E.p[1]);const list=P.sw.get(E.e.id*2+(E.sg>0?0:1));if(!list||!list.length)return id;
    let i=0;while(i<list.length-1&&list[i+1].u<E.u)i++;const a=list[i],b=list[Math.min(i+1,list.length-1)];
    for(const s of a===b?[a]:[a,b])tlink(id,s.node,swPts(E.e,E.u,s.u,E.sg),"walk",{e:E.e.id});
    // přes Uličku a Ulici se smí přejít rovnou u budovy
    if(FREE_X(E.e.kind)){const o=P.sw.get(E.e.id*2+(E.sg>0?1:0));if(o&&o.length){const q=swPt(E.e,E.u,-E.sg);const id2=tnode(q[0],q[1]);let j=0;while(j<o.length-1&&o[j+1].u<E.u)j++;
      for(const s of [o[j],o[Math.min(j+1,o.length-1)]])tlink(id2,s.node,swPts(E.e,E.u,s.u,-E.sg),"walk",{e:E.e.id});tlink(id,id2,[E.p,q],"free",{eid:E.e.id,u:E.u,node:-1})}}
    return id};
  const sa=attach(A),sb=attach(B);
  // stejný úsek a strana: rovnou
  const total=P.nodes.length+tmp.length,g=new Float64Array(total).fill(1e9),prev=new Int32Array(total).fill(-1),done=new Uint8Array(total);
  const tx=N(sb).x,ty=N(sb).y;const heap=[];const push=(v,f)=>{heap.push([f,v]);let i=heap.length-1;while(i>0){const p=(i-1)>>1;if(heap[p][0]<=heap[i][0])break;[heap[p],heap[i]]=[heap[i],heap[p]];i=p}};
  const pop=()=>{const top=heap[0],last=heap.pop();if(heap.length){heap[0]=last;let i=0;for(;;){const l=2*i+1,r=l+1;let m=i;if(l<heap.length&&heap[l][0]<heap[m][0])m=l;if(r<heap.length&&heap[r][0]<heap[m][0])m=r;if(m===i)break;[heap[m],heap[i]]=[heap[i],heap[m]];i=m}}return top};
  g[sa]=0;push(sa,Math.hypot(N(sa).x-tx,N(sa).y-ty));let found=false;
  while(heap.length){const [,v]=pop();if(done[v])continue;done[v]=1;if(v===sb){found=true;break}if(g[v]>maxLen)break;
    for(const lid of N(v).ls){const L=LK(lid);const w=L.a===v?L.b:L.a;const c=g[v]+L.len+(L.kind==="zebra"?0.25:L.kind==="free"?0.5:0);
      if(c<g[w]){g[w]=c;prev[w]=lid;push(w,c+Math.hypot(N(w).x-tx,N(w).y-ty))}}}
  // úklid dočasných propojení
  for(const L of tl){for(const id of [L.a,L.b])if(id<P.nodes.length){const ls=P.nodes[id].ls;const k=ls.indexOf(L.id);if(k>=0)ls.splice(k,1)}}
  if(!found)return null;
  const seq=[];let v=sb;while(v!==sa){const L=LK(prev[v]);seq.push(L);v=L.a===v?L.b:L.a}seq.reverse();
  const pts=[A.door,A.p],spans=[];v=sa;
  for(const L of seq){let q=L.pts;if(L.a!==v)q=q.slice().reverse();const s0=pathLen(pts);for(let i=1;i<q.length;i++)pts.push(q[i]);
    if(L.kind!=="walk")spans.push({s0,s1:pathLen(pts),kind:L.kind,eid:L.eid,node:L.node!==undefined?L.node:-1,u:L.u});v=L.a===v?L.b:L.a}
  pts.push(B.door);const len=pathLen(pts);if(len>maxLen*1.4)return null;return {pts,spans,len}}

// ---- chodec ----
function newWalker(S,tr,route){const w={id:S.vid++,trip:tr,path:route.pts,spans:route.spans,si:0,s:0,plen:pathLen(route.pts),state:"walk",t:0,wait:0,
  speed:tr.purpose==="senior"?0.38:0.5,dead:false,kid:tr.purpose==="school",held:null};S.walkers.push(w);return w}
function walkerEnd(S,w,aborted){if(w.dead)return;w.dead=true;if(aborted)S.pedAborted=(S.pedAborted||0)+1;else S.pedDone=(S.pedDone||0)+1;releaseCross(S,w);walkerArrived(S,w,aborted)}
function releaseCross(S,w){const x=w.held;if(!x)return;w.held=null;
  if(x.node>=0){const n=S.nodes[x.node];if(n&&n.xBusy)n.xBusy.set(x.eid,Math.max(0,(n.xBusy.get(x.eid)||0)-1))}
  else{const e=S.edges[x.eid];if(e&&e.mbusy){const k=e.mbusy.indexOf(x.u);if(k>=0)e.mbusy.splice(k,1)}}}
function holdCross(S,w,x){w.held=x;if(x.node>=0){const n=S.nodes[x.node];if(!n.xBusy)n.xBusy=new Map();n.xBusy.set(x.eid,(n.xBusy.get(x.eid)||0)+1)}
  else{const e=S.edges[x.eid];(e.mbusy||(e.mbusy=[])).push(x.u)}}
// smí chodec vstoupit do vozovky? zebra: žádné auto zrovna ramenem neprojíždí křižovatku a nestojí na přechodu;
// bez zebry (Ulička, Ulice): navíc mezera mezi přijíždějícími auty
function canCross(S,x,strict){const e=S.edges[x.eid];if(!e||e.dead)return true;
  if(x.node>=0){const n=S.nodes[x.node];if(n&&!n.dead)for(const o of n.box){if(o.dead||!o.conn||o.conn.node!==n.id)continue;if((o.conn.from>>1)===x.eid||(o.conn.to>>1)===x.eid)return false}}
  const u=x.u!==undefined?x.u:0,gap=strict?(x.kind==="zebra"?0.15:1.1):0;
  for(let d=0;d<2;d++){const sx=d?e.g.len-u:u;for(const q of e.q[d])for(const c of q){if(c.s>sx-c.len/2-gap&&c.s<sx+c.len/2+0.15)return false}}
  return true}
function walkerReroute(S,w){const to=w.trip&&w.trip.to;const P=pedNet(S);
  // nejbližší bod chodníku k chodci, odtud nová cesta
  const q=pathPose(w.path,w.s);let best=null,bd=0.6;
  for(const L of P.links){if(L.kind!=="walk")continue;for(let i=1;i<L.pts.length;i++){const a=L.pts[i-1],b=L.pts[i];const dx=b[0]-a[0],dy=b[1]-a[1],l2=dx*dx+dy*dy||1;const t=clamp(((q.x-a[0])*dx+(q.y-a[1])*dy)/l2,0,1);const d=Math.hypot(a[0]+dx*t-q.x,a[1]+dy*t-q.y);if(d<bd){bd=d;best={L,i,t}}}}
  if(!best||!to)return false;const e=S.edges[best.L.e];if(!e)return false;
  const r=nearestOn(e.g,q.x,q.y);const sg=((q.x-r.x)*pointAt(e.g,r.u).nx+(q.y-r.y)*pointAt(e.g,r.u).ny)>=0?1:-1;
  const fake={access:{e:e.id,u:r.u,side:sg},drive:{door:[q.x,q.y]},dead:false};const route=pedRoute(S,fake,to,16);if(!route)return false;
  releaseCross(S,w);w.path=route.pts;w.spans=route.spans;w.si=0;w.s=0;w.plen=pathLen(w.path);w.state="walk";return true}
function updateWalkers(S,dt){const P=pedNet(S);
  // po změně sítě si chodci najdou cestu znovu (kdo nemůže, dojde po své cestě)
  if(S.pedSeen!==P.ver){S.pedSeen=P.ver;for(const w of S.walkers)if(!w.dead&&w.state!=="cross")walkerReroute(S,w)}
  // mřížka pro hlídání odstupu
  const grid=new Map(),key=(x,y)=>((x*2)|0)*4096+((y*2)|0);const pose=new Map();
  for(const w of S.walkers){if(w.dead)continue;const q=pathPose(w.path,w.s);pose.set(w,q);const k=key(q.x,q.y);let a=grid.get(k);if(!a)grid.set(k,a=[]);a.push(w)}
  const blocked=(w,q)=>{const ca=Math.cos(q.ang),sa=Math.sin(q.ang);for(let gx=-1;gx<=1;gx++)for(let gy=-1;gy<=1;gy++){const a=grid.get(key(q.x+gx*0.5,q.y+gy*0.5));if(!a)continue;
      for(const o of a){if(o===w)continue;const p=pose.get(o);const dx=p.x-q.x,dy=p.y-q.y;const ah=dx*ca+dy*sa;if(ah<=0||ah>PED_GAP)continue;if(Math.abs(-dx*sa+dy*ca)>0.06)continue;if(Math.cos(p.ang-q.ang)<0.3)continue;return true}}return false};
  for(let k=S.walkers.length-1;k>=0;k--){const w=S.walkers[k];
    if(!w.dead){const sp=w.spans[w.si];
      if(w.state==="wait"){w.wait+=dt;
        // na přechodu se zebrou si chodec po 3 s přednost vyžádá, bez zebry čeká na mezeru
        if(canCross(S,sp,true)||sp.kind==="zebra"&&w.wait>3&&canCross(S,sp,false)){holdCross(S,w,sp);w.state="cross";w.wait=0}}
      else{const lim=w.state==="cross"?sp.s1:sp?sp.s0:w.plen;
        const q=pose.get(w);let v=w.speed;if(w.state==="walk"&&q&&(w.bw||0)<1.5&&blocked(w,q)){v=0;w.bw=(w.bw||0)+dt}else w.bw=0;
        w.s=Math.min(lim,w.s+v*dt);
        if(w.state==="walk"&&sp&&w.s>=sp.s0-1e-6){w.state="wait";w.wait=0}
        else if(w.state==="cross"&&w.s>=sp.s1-1e-6){releaseCross(S,w);S.xCount=(S.xCount||0)+1;w.si++;w.state="walk"}
        if(w.s>=w.plen-1e-6&&!w.spans[w.si])walkerEnd(S,w,false)}}
    if(w.dead){S.walkers[k]=S.walkers[S.walkers.length-1];S.walkers.pop()}}}
