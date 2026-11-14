// Vykreslování: terén z mezipaměti, silnice po vrstvách (zem, most, vysoký most), budovy, auta, chodci, noc, popisky, náhled.

function edgeLayer(e){const m=Math.max(S.nodes[e.a].lvl,S.nodes[e.b].lvl);return m<0.5?0:m<1.5?1:2}
function edgeCache(e){if(e._g!==e.g||e._mv!==S.netVer){e._g=e.g;e._mv=S.netVer;e._m=new Map();e._be=null}return e._m}
function edgePath(e){const m=edgeCache(e);let p=m.get("c");if(p)return p;p=new Path2D();const q=e.g.pts;p.moveTo(q[0],q[1]);for(let k=2;k<q.length;k+=2)p.lineTo(q[k],q[k+1]);m.set("c",p);return p}
function nodeR(n){return n.edges.length>=3?n.rad:0.05}
// dvojice dálničních ramen, která uzlem napojení z boku plynule prochází (svodidla a čáry pokračují)
function passPair(n){if(n._ppv===S.netVer)return n._pp;n._ppv=S.netVer;n._pp=null;
  if(n.edges.length>=3&&n.eff==="merge"){const h=n.arms.filter(a=>S.edges[a.e].kind==="hwy");if(h.length===2&&h[0].hx*h[1].hx+h[0].hy*h[1].hy<-0.7)n._pp=new Set([h[0].e,h[1].e])}
  else if(n.pass)n._pp=new Set(n.pass);
  return n._pp}
// plynulé navázání konce úseku na jiný úsek (dva úseky v uzlu, nebo dálnice přes napojení): pokos
function joinAt(e,atA){const nd=S.nodes[atA?e.a:e.b];let oid=-1;
  if(nd.edges.length===2)oid=nd.edges[0]===e.id?nd.edges[1]:nd.edges[0];else{const pp=passPair(nd);if(pp&&pp.has(e.id))for(const id of pp)if(id!==e.id)oid=id}
  const o=S.edges[oid];if(!o||o.dead||o===e)return null;
  if((atA?e.pa:e.pb)||(o.a===nd.id?o.pa:o.pb))return null;   // napojení na pruh není plynulé navázání os
  const same=atA?o.b===nd.id:o.a===nd.id;const k=atA?0:e.g.n-1,ko=o.a===nd.id?0:o.g.n-1;
  const n1x=e.g.nx[k],n1y=e.g.ny[k],sg=same?1:-1,n2x=o.g.nx[ko]*sg,n2y=o.g.ny[ko]*sg;let mx=n1x+n2x,my=n1y+n2y;const ml=Math.hypot(mx,my)||1;mx/=ml;my/=ml;
  const cos=Math.max(0.35,mx*n1x+my*n1y);return {o,same,nd,mx,my,cos}}
function endPt(e,atA,off,j){const k=atA?0:e.g.n-1,q=e.g.pts;if(j)return [j.nd.x+j.mx*off/j.cos,j.nd.y+j.my*off/j.cos];return [q[2*k]+e.g.nx[k]*off,q[2*k+1]+e.g.ny[k]*off]}
// šířka vozovky v bodech úseku [vpravo, vlevo]; u napojení na užší úsek se plynule zúží (náběh pruhu)
function bandExt(e){edgeCache(e);if(e._be)return e._be;const g=e.g,n=g.n,R=new Float32Array(n).fill(e.er),L=new Float32Array(n).fill(e.el);const be={R,L,ta:null,tb:null,ja:joinAt(e,true),jb:joinAt(e,false)};
  for(const atA of [true,false]){const j=atA?be.ja:be.jb;if(!j||j.nd.edges.length>=3)continue;const o=j.o;
    const tr=j.same?o.er:o.el,tl=j.same?o.el:o.er;if(tr>=e.er-1e-3&&tl>=e.el-1e-3)continue;
    const T=Math.min(1.6,g.len*0.45);const t={R:Math.min(tr,e.er),L:Math.min(tl,e.el),T};if(atA)be.ta=t;else be.tb=t;
    for(let k=0;k<n;k++){const d=atA?g.cum[k]:g.len-g.cum[k];if(d>=T)continue;const f=1-d/T,sm=f*f*(3-2*f);R[k]=Math.min(R[k],e.er+(t.R-e.er)*sm);L[k]=Math.min(L[k],e.el+(t.L-e.el)*sm)}}
  e._be=be;return be}
// obrys vozovky rozšířený o d na obě strany; na plynulých spojích pokos
function bandPath(e,d){const m=edgeCache(e);const key="b"+d.toFixed(3);let p=m.get(key);if(p)return p;const be=bandExt(e),g=e.g,q=g.pts;p=new Path2D();
  const pt=(k,off)=>k===0&&be.ja?endPt(e,true,off,be.ja):k===g.n-1&&be.jb?endPt(e,false,off,be.jb):[q[2*k]+g.nx[k]*off,q[2*k+1]+g.ny[k]*off];
  for(let k=0;k<g.n;k++){const r=Math.max(0.01,be.R[k]+d),a=pt(k,r);if(k)p.lineTo(a[0],a[1]);else p.moveTo(a[0],a[1])}
  for(let k=g.n-1;k>=0;k--){const l=Math.max(0.01,be.L[k]+d),a=pt(k,-l);p.lineTo(a[0],a[1])}p.closePath();m.set(key,p);return p}
// stín mostu: posun roste s výškou, u rampy tedy plynule od nuly
function shadowPath(e){const m=edgeCache(e);let p=m.get("sh");if(p)return p;const be=bandExt(e),g=e.g,q=g.pts;p=new Path2D();const pts=[];
  for(let k=0;k<g.n;k++){const lv=lvlAt(S,e,g.cum[k]);const r=be.R[k]+0.1;pts.push([q[2*k]+g.nx[k]*r+0.16*lv,q[2*k+1]+g.ny[k]*r+0.26*lv])}
  for(let k=g.n-1;k>=0;k--){const lv=lvlAt(S,e,g.cum[k]);const l=be.L[k]+0.1;pts.push([q[2*k]-g.nx[k]*l+0.16*lv,q[2*k+1]-g.ny[k]*l+0.26*lv])}
  pts.forEach((a,i)=>i?p.lineTo(a[0],a[1]):p.moveTo(a[0],a[1]));p.closePath();m.set("sh",p);return p}
// vodorovná značka: kolik z konce vynechat, když v náběhu pruh končí
function markTrim(e,o,atA){const be=bandExt(e),t=atA?be.ta:be.tb;if(!t)return 0;const lim=(o>0?t.R:t.L)-RK[e.kind].side;return Math.abs(o)>lim-0.03?t.T:0}
// konec značení u uzlu: u křižovatky za přechodem, na plynulém spoji nic
function markEnd(e,atA){const be=bandExt(e);if(atA?be.ja:be.jb)return 0;const n=S.nodes[atA?e.a:e.b];if(n.edges.length>=3){const t=edgeTrim(e);return (atA?t[0]:t[1])+0.02}return 0.05}
function offsetPath(e,off,trimA,trimB){const m=edgeCache(e);trimA+=markTrim(e,off,true);trimB+=markTrim(e,off,false);const key=off.toFixed(3)+"|"+trimA.toFixed(2)+"|"+trimB.toFixed(2);let p=m.get(key);if(p)return p;
  const g=e.g,q=g.pts,be=bandExt(e);p=new Path2D();let started=false;
  for(let k=0;k<g.n;k++){const u=g.cum[k];if(u<trimA-1e-6||u>g.len-trimB+1e-6)continue;
    const a=k===0&&be.ja&&trimA<1e-6?endPt(e,true,off,be.ja):k===g.n-1&&be.jb&&trimB<1e-6?endPt(e,false,off,be.jb):[q[2*k]+g.nx[k]*off,q[2*k+1]+g.ny[k]*off];
    if(!started){if(u>trimA+1e-3&&k>0){const s0=pointAt(g,trimA);p.moveTo(s0.x+s0.nx*off,s0.y+s0.ny*off);p.lineTo(a[0],a[1])}else p.moveTo(a[0],a[1]);started=true}else p.lineTo(a[0],a[1])}
  if(started&&trimB>1e-3){const s1=pointAt(g,g.len-trimB);p.lineTo(s1.x+s1.nx*off,s1.y+s1.ny*off)}
  m.set(key,p);return p}
function asphaltColor(e){if(overlay){const c=Math.max(e.cong[0],e.cong[1]);if(e.flow>3||c>0.05)return c<0.35?colors.good:c<0.7?colors.warn:colors.bad}
  return e.kind==="street"||e.kind==="alley"?colors.street:(e.kind==="hwy"||e.kind==="ramp")?colors.hwy:colors.road}
// kotouč v uzlu: plocha křižovatky a slepý konec (plynulé spoje mají pokos)
function nodeDiscs(list){const seen=new Set(),out=[];
  for(const e of list)for(const atA of [true,false]){const nid=atA?e.a:e.b;if(seen.has(nid))continue;seen.add(nid);const n=S.nodes[nid];if(n.dead)continue;
    const arms=n.edges.map(id=>S.edges[id]);let main=arms[0];for(const a of arms)if(a.w>main.w)main=a;
    if(n.port&&n.edges.length>=2)continue;
    if(n.edges.length>=3){if(passPair(n))continue;out.push({x:n.x,y:n.y,r:n.rad,e:main,side:Math.max(...arms.map(a=>RK[a.kind].side)),node:n});continue}
    if(n.edges.length===1){const a=arms[0],be=bandExt(a),k=a.a===nid?0:a.g.n-1;const R=be.R[k],L=be.L[k],sh=(R-L)/2;out.push({x:n.x+a.g.nx[k]*sh,y:n.y+a.g.ny[k]*sh,r:(R+L)/2,e:a,side:RK[a.kind].side})}}
  return out}
// plocha křižovatky podle ramen: rohy ramen na okraji plochy, mezi sousedními rameny oblouk
// (u rovné strany křižovatky tvaru T zůstane rovná hrana)
function nodePoly(n,d){const key=n._pv===S.netVer?n._pk:null;if(!key){n._pv=S.netVer;n._pk=new Map()}const k=d.toFixed(3);let p=n._pk.get(k);if(p)return p;
  const arms=[...n.arms].sort((a,b)=>Math.atan2(a.hy,a.hx)-Math.atan2(b.hy,b.hx));const R=n.rad,c=[];
  for(const a of arms){const e=S.edges[a.e];const out=e.a===n.id;const er=(out?e.er:e.el)+d,el=(out?e.el:e.er)+d;const rx=-a.hy,ry=a.hx;
    const cut=a.cut!==undefined?a.cut:R;const bx=n.x+a.hx*cut,by=n.y+a.hy*cut;c.push({L:[bx-rx*el,by-ry*el],Rt:[bx+rx*er,by+ry*er],h:[a.hx,a.hy]})}
  p=new Path2D();p.moveTo(c[0].L[0],c[0].L[1]);
  for(let i=0;i<c.length;i++){const A=c[i],B=c[(i+1)%c.length];p.lineTo(A.Rt[0],A.Rt[1]);
    // průsečík pravého okraje ramene A s levým okrajem ramene B
    const den=A.h[0]*B.h[1]-A.h[1]*B.h[0];let ctrl=null;
    if(Math.abs(den)>0.08){const t=((B.L[0]-A.Rt[0])*B.h[1]-(B.L[1]-A.Rt[1])*B.h[0])/den;const ix=A.Rt[0]+A.h[0]*t,iy=A.Rt[1]+A.h[1]*t;if(Math.hypot(ix-n.x,iy-n.y)<R*2.2+0.5&&t<0.2)ctrl=[ix,iy]}
    if(ctrl)p.quadraticCurveTo(ctrl[0],ctrl[1],B.L[0],B.L[1]);else p.lineTo(B.L[0],B.L[1])}
  p.closePath();n._pk.set(k,p);return p}
function fillDiscs(discs,d,colorFn,minSide){for(const q of discs){if(minSide&&!q.side)continue;const dd=d-(minSide===false?q.side:0);ctx.fillStyle=colorFn(q.e);
  if(q.node&&q.node.arms.length>=3){ctx.fill(nodePoly(q.node,dd));continue}
  const r=q.r+dd;if(r<=0.01)continue;ctx.beginPath();ctx.arc(q.x,q.y,r,0,Math.PI*2);ctx.fill()}}
// zebra přes vozovku: střed (x,y), směr silnice (tx,ty), šířky vpravo/vlevo
function zebra(x,y,tx,ty,er,el,busy){const nx=-ty,ny=tx;ctx.fillStyle=busy?colors.warn:colors["road-edge"];ctx.globalAlpha=busy?0.8:0.55;
  for(let o=-el+0.07;o<=er-0.05;o+=0.11){const cx=x+nx*o,cy=y+ny*o;ctx.save();ctx.translate(cx,cy);ctx.rotate(Math.atan2(ty,tx));ctx.fillRect(-XW*0.42,-0.03,XW*0.84,0.06);ctx.restore()}ctx.globalAlpha=1}
function drawCrossings(list){const z=cam.z;if(z<9)return;const seen=new Set();
  for(const e of list){const K=RK[e.kind];
    for(const atA of [true,false]){const n=S.nodes[atA?e.a:e.b];if(!crossOn(S,n,e))continue;const key=n.id+"|"+e.id+(atA?"a":"b");if(seen.has(key))continue;seen.add(key);
      const arm=n.arms.find(q=>q.e===e.id);const d=(arm?arm.cut:n.rad)+0.05+XW/2;const u=atA?d:e.g.len-d;if(u<0||u>e.g.len)continue;const p=pointAt(e.g,u);zebra(p.x,p.y,p.tx,p.ty,e.er-K.side,e.el-K.side,n.xBusy&&n.xBusy.get(e.id)>0)}
    if(e.xw)for(const x of e.xw){const p=pointAt(e.g,x.u);zebra(p.x,p.y,p.tx,p.ty,e.er-K.side,e.el-K.side,e.mbusy&&e.mbusy.some(u=>Math.abs(u-x.u)<0.05))}}}
function auxOf(e,d){const m=edgeCache(e);const key="ax"+d;let v=m.get(key);if(v===undefined){v=auxCount(S,e,d);m.set(key,v)}return v}
function laneDash(aux,lw){if(aux){ctx.lineWidth=lw*2.2;ctx.setLineDash([0.1,0.1])}else{ctx.lineWidth=lw;ctx.setLineDash([0.18,0.2])}}
// šipky řazení na pruzích před křižovatkou (bity 1 vlevo, 2 rovně, 4 vpravo)
function drawLaneArrows(layer){const z=cam.z;if(z<13)return;ctx.lineCap="round";ctx.lineJoin="round";
  for(const n of S.nodes){if(n.dead||n.edges.length<3||n.port||n.ring||!n.lm)continue;if((n.lvl<0.5?0:n.lvl<1.5?1:2)!==layer)continue;if(!inView(n.x,n.y,3))continue;
    for(const a of n.arms){const l=a.inLink,L=linkLanes(S,l),ms=n.lm.get(l);if(!L||!ms)continue;const e=S.edges[a.e];const user=e.uc&&e.uc[l&1];if(L<2&&!user)continue;
      const st=stopS(S,l);if(st<0||st<1.1)continue;
      for(let k=0;k<L;k++){const m=ms[k];if(!m)continue;const p=lanePose(S,l,k,st-0.55);const fx=Math.cos(p.ang),fy=Math.sin(p.ang),rx=-fy,ry=fx;const P=(f,r)=>[p.x+fx*f+rx*r,p.y+fy*f+ry*r];
        ctx.strokeStyle=user&&user[k]?colors.accent:colors["road-edge"];ctx.fillStyle=ctx.strokeStyle;ctx.lineWidth=0.032;
        const head=(f,r,df,dr)=>{const a0=P(f+df*0.07,r+dr*0.07),a1=P(f-dr*0.045,r+df*0.045),a2=P(f+dr*0.045,r-df*0.045);ctx.beginPath();ctx.moveTo(a0[0],a0[1]);ctx.lineTo(a1[0],a1[1]);ctx.lineTo(a2[0],a2[1]);ctx.closePath();ctx.fill()};
        const line=(...q)=>{ctx.beginPath();q.forEach((v,i)=>{const w=P(v[0],v[1]);i?ctx.lineTo(w[0],w[1]):ctx.moveTo(w[0],w[1])});ctx.stroke()};
        if(m&2){line([-0.2,0],[0.13,0]);head(0.13,0,1,0)}else line([-0.2,0],[-0.02,0]);
        if(m&1){line([-0.02,0],[0.02,-0.03],[0.02,-0.075]);head(0.02,-0.075,0,-1)}
        if(m&4){line([-0.02,0],[0.02,0.03],[0.02,0.075]);head(0.02,0.075,0,1)}}}}}
function drawRoadLayer(list,layer){const z=cam.z;ctx.lineCap="round";ctx.lineJoin="round";const discs=nodeDiscs(list);
  // jednosměrky a nájezdy dospod, dálnice navrch: odbočka se pod průběžnou silnici zasune a vychází z jejího okraje
  const ord=e=>e.kind==="hwy"?2:(RK[e.kind].oneway||e.lf===0||e.lb===0)?0:1;list=[...list].sort((a,b)=>ord(a)-ord(b));
  if(layer>0){ctx.fillStyle="rgba(0,0,0,.22)";for(const e of list)ctx.fill(shadowPath(e));ctx.save();ctx.translate(0.16*layer,0.26*layer);fillDiscs(discs,0.1,()=>"rgba(0,0,0,.22)");ctx.restore()}
  const cd=layer>0?0.08:Math.max(0.04,0.8/z);const edgeCol=e=>layer>0?colors["bridge-edge"]:(e.kind==="hwy"||e.kind==="ramp")?colors["hwy-edge"]:colors["road-edge"];
  for(const e of list){ctx.fillStyle=edgeCol(e);ctx.fill(bandPath(e,cd))}fillDiscs(discs,cd,edgeCol);
  ctx.fillStyle=colors.sidewalk;for(const e of list){if(!RK[e.kind].side)continue;ctx.fill(bandPath(e,0))}fillDiscs(discs,0,()=>colors.sidewalk,true);
  for(const e of list){const K=RK[e.kind];ctx.fillStyle=asphaltColor(e);ctx.fill(bandPath(e,-K.side))}fillDiscs(discs,0,asphaltColor,false);
  for(const e of list){const K=RK[e.kind];if(!K.median||e.lb===0||e.lf===0)continue;ctx.strokeStyle=e.kind==="blvd"?colors.median:colors["hwy-edge"];ctx.lineWidth=e.kind==="blvd"?K.median-0.06:Math.max(0.04,K.median*0.35);
    ctx.lineCap="butt";ctx.stroke(offsetPath(e,0,markEnd(e,true),markEnd(e,false)));ctx.lineCap="round"}
  if(z<9)return;
  ctx.lineCap="butt";const lw=Math.max(0.03,1.1/z);
  for(const e of list){const K=RK[e.kind];const ta=markEnd(e,true),tb=markEnd(e,false);if(e.g.len-ta-tb<0.2)continue;
    const one=e.lf===0||e.lb===0;
    if(!one){if(!K.median&&K.line!=="none"){ctx.strokeStyle=colors.mark;ctx.lineWidth=lw;ctx.setLineDash(K.line==="solid"||Math.min(e.lf,e.lb)>=2?[]:[0.22,0.16]);ctx.stroke(offsetPath(e,0,ta,tb))}
      else if(e.kind==="hwy"){ctx.strokeStyle=colors.mark;ctx.lineWidth=lw;ctx.setLineDash([]);ctx.stroke(offsetPath(e,K.median/2,ta,tb));ctx.stroke(offsetPath(e,-K.median/2,ta,tb))}
      ctx.strokeStyle=colors.lane;const af=auxOf(e,0),ab=auxOf(e,1);
      for(let k=1;k<e.lf;k++){laneDash(k>=e.lf-af,lw);ctx.stroke(offsetPath(e,K.median/2+k*LW,ta,tb))}
      for(let k=1;k<e.lb;k++){laneDash(k>=e.lb-ab,lw);ctx.stroke(offsetPath(e,-(K.median/2+k*LW),ta,tb))}}
    else{const L=e.lf+e.lb,ax=auxOf(e,e.lf?0:1),sg=e.lf?1:-1;ctx.strokeStyle=colors.lane;for(let k=1;k<L;k++){laneDash(k>=L-ax,lw);ctx.stroke(offsetPath(e,sg*(-(L*LW)/2+k*LW+(e.sh||0)),ta,tb))}}
    if(e.kind==="hwy"){ctx.setLineDash([]);ctx.strokeStyle=colors.lane;ctx.stroke(offsetPath(e,e.er-0.04,ta,tb));ctx.stroke(offsetPath(e,-(e.el-0.04),ta,tb))}}
  ctx.setLineDash([]);
  drawCrossings(list);drawLaneArrows(layer);
  ctx.lineCap="round";
  if(z>=13){ctx.fillStyle=colors.accent;for(const e of list){if(!(e.lf===0||e.lb===0)||e.ring||e.g.len<1.2)continue;const fwd=e.lf>0;
    for(let u=0.6;u<e.g.len-0.4;u+=2.4){const p=pointAt(e.g,u);const dx=fwd?p.tx:-p.tx,dy=fwd?p.ty:-p.ty,s=0.13;
      ctx.beginPath();ctx.moveTo(p.x+dx*s,p.y+dy*s);ctx.lineTo(p.x-dx*s*0.7+dy*s*0.7,p.y-dy*s*0.7-dx*s*0.7);ctx.lineTo(p.x-dx*s*0.7-dy*s*0.7,p.y-dy*s*0.7+dx*s*0.7);ctx.closePath();ctx.fill()}}}
  // ruční rozdělení úseku: krátká příčná čárka
  if(z>=8){ctx.strokeStyle=colors.accent;ctx.lineWidth=Math.max(0.05,1.6/z);for(const e of list)for(const nid of [e.a,e.b]){const n=S.nodes[nid];if(!n.keep||n.edges[0]!==e.id)continue;
    const k=e.a===nid?0:e.g.n-1;const nx=e.g.nx[k],ny=e.g.ny[k];ctx.beginPath();ctx.moveTo(n.x+nx*(e.er+0.12),n.y+ny*(e.er+0.12));ctx.lineTo(n.x-nx*(e.el+0.12),n.y-ny*(e.el+0.12));ctx.stroke()}}}
function drawNodes(layer){const z=cam.z;if(z<8)return;
  for(const n of S.nodes){if(n.dead||n.edges.length<3||n.port)continue;if((n.lvl<0.5?0:n.lvl<1.5?1:2)!==layer)continue;if(!inView(n.x,n.y,2))continue;const r=nodeR(n);
    if(n.eff==="light"){const L=n.light;for(const a of n.arms){if(!linkLanes(S,a.inLink))continue;const e=S.edges[a.e];const rx=a.hy,ry=-a.hx;const ex=e.a===n.id?e.el:e.er;const st=linkOut(S,a.inLink),dd=e.g.len-st;const px=n.x+a.hx*(dd+0.12)+rx*(ex*0.6),py=n.y+a.hy*(dd+0.12)+ry*(ex*0.6);
      const col=L&&L.axis===a.axis?(L.amber?colors.warn:colors.good):colors.bad;ctx.fillStyle="#15181a";ctx.beginPath();ctx.arc(px,py,0.12,0,Math.PI*2);ctx.fill();ctx.fillStyle=col;ctx.beginPath();ctx.arc(px,py,0.08,0,Math.PI*2);ctx.fill()}}
    else if(n.eff==="main"||n.eff==="merge"){for(const a of n.arms){if(n.mainEdges.has(a.e)||!linkLanes(S,a.inLink))continue;const e=S.edges[a.e];const rx=a.hy,ry=-a.hx;const ex=e.a===n.id?e.el:e.er;const dd=e.g.len-linkOut(S,a.inLink);const px=n.x+a.hx*(dd+0.2)+rx*(ex+0.05),py=n.y+a.hy*(dd+0.2)+ry*(ex+0.05),s=0.13;
      ctx.fillStyle="#fff";ctx.strokeStyle="#c03a2b";ctx.lineWidth=0.045;ctx.beginPath();ctx.moveTo(px-s,py-s*0.7);ctx.lineTo(px+s,py-s*0.7);ctx.lineTo(px,py+s*0.9);ctx.closePath();ctx.fill();ctx.stroke()}}
    // stopčáry na příjezdech (před přechodem)
    if(z>=12&&n.eff!=="ring"){ctx.lineWidth=Math.max(0.04,1.4/z);for(const a of n.arms){if(!linkLanes(S,a.inLink))continue;if(n.mainEdges&&n.mainEdges.has(a.e)&&n.eff!=="light")continue;
      const l=a.inLink,st=stopS(S,l);const ek=S.edges[a.e].kind;ctx.strokeStyle=ek==="hwy"||ek==="ramp"?"rgba(255,255,255,.9)":colors["road-edge"];if(st<0)continue;const lanes=linkLanes(S,l);const p0=lanePose(S,l,0,st),p1=lanePose(S,l,lanes-1,st);const hx=Math.cos(p0.ang+Math.PI/2)*LW/2,hy=Math.sin(p0.ang+Math.PI/2)*LW/2;
      ctx.beginPath();ctx.moveTo(p0.x-hx,p0.y-hy);ctx.lineTo(p1.x+hx,p1.y+hy);ctx.stroke()}}}}
function drawRings(list){const w={};for(const e of list)if(e.ring)w[e.ring]=e.w;
  for(const R of S.rings){const rw=w[R.id];if(!rw)continue;if(!inView(R.cx,R.cy,R.r+1))continue;
  ctx.fillStyle=colors.median;ctx.beginPath();ctx.arc(R.cx,R.cy,Math.max(0.2,R.r-rw/2-0.06),0,Math.PI*2);ctx.fill()}}
function inView(x,y,m){const z=cam.z;return x*z>cam.x-m*z&&x*z<cam.x+vw+m*z&&y*z>cam.y-m*z&&y*z<cam.y+vh+m*z}
function edgeVisible(e){const b=e.g.bb,z=cam.z;return !(b[2]*z<cam.x-20||b[0]*z>cam.x+vw+20||b[3]*z<cam.y-20||b[1]*z>cam.y+vh+20)}
