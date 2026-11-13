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
  const same=atA?o.b===nd.id:o.a===nd.id;const k=atA?0:e.g.n-1,ko=o.a===nd.id?0:o.g.n-1;
  const n1x=e.g.nx[k],n1y=e.g.ny[k],sg=same?1:-1,n2x=o.g.nx[ko]*sg,n2y=o.g.ny[ko]*sg;let mx=n1x+n2x,my=n1y+n2y;const ml=Math.hypot(mx,my)||1;mx/=ml;my/=ml;
  const cos=Math.max(0.35,mx*n1x+my*n1y);return {o,same,nd,mx,my,cos}}
function endPt(e,atA,off,j){const k=atA?0:e.g.n-1,q=e.g.pts;if(j)return [j.nd.x+j.mx*off/j.cos,j.nd.y+j.my*off/j.cos];return [q[2*k]+e.g.nx[k]*off,q[2*k+1]+e.g.ny[k]*off]}
// šířka vozovky v bodech úseku [vpravo, vlevo]; u napojení na užší úsek se plynule zúží (náběh pruhu)
function bandExt(e){edgeCache(e);if(e._be)return e._be;const g=e.g,n=g.n,R=new Float32Array(n).fill(e.er),L=new Float32Array(n).fill(e.el);const be={R,L,ta:null,tb:null,ja:joinAt(e,true),jb:joinAt(e,false)};
  for(const atA of [true,false]){const j=atA?be.ja:be.jb;if(!j)continue;const o=j.o;
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
    if(n.edges.length>=3){if(passPair(n))continue;out.push({x:n.x,y:n.y,r:n.rad,e:main,side:Math.max(...arms.map(a=>RK[a.kind].side)),node:n});continue}
    if(n.edges.length===1){const a=arms[0],be=bandExt(a),k=a.a===nid?0:a.g.n-1;const R=be.R[k],L=be.L[k],sh=(R-L)/2;out.push({x:n.x+a.g.nx[k]*sh,y:n.y+a.g.ny[k]*sh,r:(R+L)/2,e:a,side:RK[a.kind].side})}}
  return out}
// plocha křižovatky podle ramen: rohy ramen na okraji plochy, mezi sousedními rameny oblouk
// (u rovné strany křižovatky tvaru T zůstane rovná hrana)
function nodePoly(n,d){const key=n._pv===S.netVer?n._pk:null;if(!key){n._pv=S.netVer;n._pk=new Map()}const k=d.toFixed(3);let p=n._pk.get(k);if(p)return p;
  const arms=[...n.arms].sort((a,b)=>Math.atan2(a.hy,a.hx)-Math.atan2(b.hy,b.hx));const R=n.rad,c=[];
  for(const a of arms){const e=S.edges[a.e];const out=e.a===n.id;const er=(out?e.er:e.el)+d,el=(out?e.el:e.er)+d;const rx=-a.hy,ry=a.hx;
    const bx=n.x+a.hx*R,by=n.y+a.hy*R;c.push({L:[bx-rx*el,by-ry*el],Rt:[bx+rx*er,by+ry*er],h:[a.hx,a.hy]})}
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
      const d=n.rad+0.05+XW/2;const u=atA?d:e.g.len-d;if(u<0||u>e.g.len)continue;const p=pointAt(e.g,u);zebra(p.x,p.y,p.tx,p.ty,e.er-K.side,e.el-K.side,n.xBusy&&n.xBusy.get(e.id)>0)}
    if(e.xw)for(const x of e.xw){const p=pointAt(e.g,x.u);zebra(p.x,p.y,p.tx,p.ty,e.er-K.side,e.el-K.side,e.mbusy&&e.mbusy.some(u=>Math.abs(u-x.u)<0.05))}}}
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
      ctx.strokeStyle=colors.lane;ctx.lineWidth=lw;ctx.setLineDash([0.18,0.2]);
      for(let k=1;k<e.lf;k++)ctx.stroke(offsetPath(e,K.median/2+k*LW,ta,tb));
      for(let k=1;k<e.lb;k++)ctx.stroke(offsetPath(e,-(K.median/2+k*LW),ta,tb))}
    else{const L=e.lf+e.lb;ctx.strokeStyle=colors.lane;ctx.lineWidth=lw;ctx.setLineDash([0.18,0.2]);for(let k=1;k<L;k++)ctx.stroke(offsetPath(e,-(L*LW)/2+k*LW,ta,tb))}
    if(e.kind==="hwy"){ctx.setLineDash([]);ctx.strokeStyle=colors.lane;ctx.stroke(offsetPath(e,e.er-0.04,ta,tb));ctx.stroke(offsetPath(e,-(e.el-0.04),ta,tb))}}
  ctx.setLineDash([]);
  drawCrossings(list);
  ctx.lineCap="round";
  if(z>=13){ctx.fillStyle=colors.accent;for(const e of list){if(!(e.lf===0||e.lb===0)||e.ring||e.g.len<1.2)continue;const fwd=e.lf>0;
    for(let u=0.6;u<e.g.len-0.4;u+=2.4){const p=pointAt(e.g,u);const dx=fwd?p.tx:-p.tx,dy=fwd?p.ty:-p.ty,s=0.13;
      ctx.beginPath();ctx.moveTo(p.x+dx*s,p.y+dy*s);ctx.lineTo(p.x-dx*s*0.7+dy*s*0.7,p.y-dy*s*0.7-dx*s*0.7);ctx.lineTo(p.x-dx*s*0.7-dy*s*0.7,p.y-dy*s*0.7+dx*s*0.7);ctx.closePath();ctx.fill()}}}
  // ruční rozdělení úseku: krátká příčná čárka
  if(z>=8){ctx.strokeStyle=colors.accent;ctx.lineWidth=Math.max(0.05,1.6/z);for(const e of list)for(const nid of [e.a,e.b]){const n=S.nodes[nid];if(!n.keep||n.edges[0]!==e.id)continue;
    const k=e.a===nid?0:e.g.n-1;const nx=e.g.nx[k],ny=e.g.ny[k];ctx.beginPath();ctx.moveTo(n.x+nx*(e.er+0.12),n.y+ny*(e.er+0.12));ctx.lineTo(n.x-nx*(e.el+0.12),n.y-ny*(e.el+0.12));ctx.stroke()}}}
function drawNodes(layer){const z=cam.z;if(z<8)return;
  for(const n of S.nodes){if(n.dead||n.edges.length<3)continue;if((n.lvl<0.5?0:n.lvl<1.5?1:2)!==layer)continue;if(!inView(n.x,n.y,2))continue;const r=nodeR(n);
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

// ---- budovy ----
function shade(hex,f){const n=parseInt(hex.slice(1),16);let r=n>>16,g=(n>>8)&255,b=n&255;return`rgb(${Math.min(255,Math.round(r*f))},${Math.min(255,Math.round(g*f))},${Math.min(255,Math.round(b*f))})`}
function mergedRect(j,b,inset){const x=tx(j)*CS,y=ty(j)*CS,lot=isLotRole(S.role[j]);
  const same=d=>{const n=NB[j*4+d];return n>=0&&S.bld[n]===b&&isLotRole(S.role[n])===lot};
  const l=same(1)?0:inset,r=same(0)?0:inset,t=same(3)?0:inset,bo=same(2)?0:inset;return[x+l,y+t,CS-l-r,CS-t-bo]}
function bCenter(b,f){let sx=0,sy=0,n=0;for(const j of b.tiles)if(!f||f(S.role[j])){sx+=wxOf(j);sy+=wyOf(j);n++}if(!n)return bCenter(b);return[sx/n,sy/n]}
function drawSign(x,y,r,color,letter,square){ctx.fillStyle=color;ctx.beginPath();if(square)ctx.rect(x-r,y-r,2*r,2*r);else ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
  if(cam.z>=9){ctx.fillStyle="#fff";ctx.font=`500 ${(r*(letter.length>1?0.95:1.2)).toFixed(3)}px "IBM Plex Mono", monospace`;ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(letter,x,y+r*0.08)}}
function visBuildings(x0,y0,x1,y1){return S.buildings.filter(b=>{const x=tx(b.front),y=ty(b.front);return x>=x0-4&&x<=x1+4&&y>=y0-4&&y<=y1+4})}
// vjezdy se kreslí pod silnice, silnice je překryje
function drawDriveways(vis){ctx.lineCap="round";ctx.strokeStyle=colors.lot;
  ctx.lineWidth=0.22;for(const b of vis){if(!b.access||!isHome(b))continue;ctx.beginPath();ctx.moveTo(wxOf(b.front),wyOf(b.front));ctx.lineTo(b.access.x,b.access.y);ctx.stroke()}
  ctx.lineWidth=0.5;for(const b of vis){if(!b.access||isHome(b))continue;ctx.beginPath();ctx.moveTo(wxOf(b.front),wyOf(b.front));ctx.lineTo(b.access.x,b.access.y);ctx.stroke()}}
function drawBuildings(vis){const ins=0.07,z=cam.z;
  ctx.fillStyle="rgba(0,0,0,.18)";
  for(const b of vis)for(const j of b.tiles){if(isLotRole(S.role[j]))continue;const q=mergedRect(j,b,ins);ctx.fillRect(q[0]+0.05,q[1]+0.07,q[2],q[3])}
  for(const b of vis){const K=KIND[b.type];
    for(const j of b.tiles){const r=S.role[j];
      if(r===R_HOUSE){ctx.fillStyle=b.town?b.town.color:"#888";ctx.fillRect(...mergedRect(j,b,ins))}
      else if(r===R_FLAT){const q=mergedRect(j,b,ins*0.6);ctx.fillStyle=shade(b.town?b.town.color:"#888888",0.62);ctx.fillRect(...q);
        if(z>=10){ctx.fillStyle="rgba(255,236,170,.8)";const x=tx(j)*CS,y=ty(j)*CS;ctx.fillRect(x+0.18,y+0.18,0.14,0.14)}}
      else if(r===R_BLD){const q=mergedRect(j,b,ins);ctx.fillStyle=b.type==="office"?shade(K.color,1):K.industry?shade(K.color,0.9):K.color;ctx.fillRect(...q);
        if(b.type==="office"&&z>=10){ctx.fillStyle="rgba(210,230,255,.55)";const x=tx(j)*CS,y=ty(j)*CS;ctx.fillRect(x+0.1,y+0.08,0.1,0.34);ctx.fillRect(x+0.3,y+0.08,0.1,0.34)}}
      else if(r===R_GAR){const q=mergedRect(j,b,ins*0.6);ctx.fillStyle=colors["road-edge"];ctx.fillRect(...q);ctx.fillStyle=colors.lot;ctx.fillRect(q[0]+0.05,q[1]+0.05,q[2]-0.1,q[3]-0.1)}
      else{const q=mergedRect(j,b,0.04);ctx.fillStyle=r===R_YARD?(b.type==="school"?"rgba(201,149,42,.28)":shade(K.color,1.9).replace(/rgb\((\d+),(\d+),(\d+)\)/,(m,a,b2,c)=>`rgba(${a},${b2},${c},.55)`)):colors.lot;ctx.fillRect(...q);
        const x=tx(j)*CS,y=ty(j)*CS;
        if(r===R_YARD&&AMEN_YARD[b.type]){AMEN_YARD[b.type](j,b,q,x,y,z)}
        if(r===R_LOT&&z>=9){ctx.strokeStyle=colors["lot-line"];ctx.lineWidth=Math.max(0.03,1/z);ctx.beginPath();ctx.moveTo(x+0.02,y+0.06);ctx.lineTo(x+0.02,y+0.44);ctx.stroke()}
        if(r===R_FORE){ctx.fillStyle=colors.canopy;ctx.globalAlpha=0.75;ctx.fillRect(x+0.04,y+0.04,0.42,0.42);ctx.globalAlpha=1;if((tx(j)+ty(j))%2===0){ctx.fillStyle=KIND.gas.color;ctx.fillRect(x+0.2,y+0.12,0.1,0.26)}}
        if(r===R_YARD&&K.out&&z>=10&&j===b.tiles.find(t=>S.role[t]===R_YARD)){const n=Math.min(4,Math.ceil(b.out/2));ctx.fillStyle=GOODS[K.out].color;for(let s=0;s<n;s++)ctx.fillRect(x+0.08+s*0.18,y+0.15,0.13,0.28)}}}
    if(b.type==="flat"&&b.access){const fx=wxOf(b.front),fy=wyOf(b.front);const dx=b.access.x-fx,dy=b.access.y-fy,l=Math.hypot(dx,dy)||1;
      ctx.fillStyle="rgba(10,12,10,.85)";ctx.save();ctx.translate(fx+dx/l*0.16,fy+dy/l*0.16);ctx.rotate(Math.atan2(dy,dx));ctx.fillRect(-0.08,-0.17,0.16,0.34);ctx.restore()}
    if(b.lay||KIND[b.type]||b.type==="flat")drawLot(b);
    if(K){if(b.type==="park"){const [x,y]=bCenter(b);drawSign(x,y,0.36,colors.sign,"P",true)}
      else{const [x,y]=bCenter(b,r=>r===R_BLD);drawSign(x,y,b.type==="mall"||b.type==="hyper"||b.type==="steel"?0.46:0.36,shade(K.color,0.8),K.letter,false)}}}}
// plochy vybavenosti: park se stromy, náměstí s dlažbou a kašnou, hřiště, terasa kavárny, zahrada kostela
const AMEN_YARD={
  parkland:(j,b,q,x,y,z)=>{ctx.fillStyle="#a9cc94";ctx.fillRect(...q);if((tx(j)+ty(j))%2===0){ctx.fillStyle=colors.tree;ctx.beginPath();ctx.arc(x+0.25+(hash(j,1)-0.5)*0.12,y+0.25+(hash(j,2)-0.5)*0.12,0.17,0,Math.PI*2);ctx.fill()}
    else if(z>=10){ctx.fillStyle="rgba(240,232,210,.9)";ctx.fillRect(x+0.2,y,0.1,CS)}},
  square:(j,b,q,x,y,z)=>{ctx.fillStyle="#dcd0b6";ctx.fillRect(...q);if(z>=10){ctx.strokeStyle="rgba(150,135,110,.35)";ctx.lineWidth=0.02;ctx.strokeRect(x+0.02,y+0.02,CS-0.04,CS-0.04)}
    if(j===b.tiles[Math.floor(b.tiles.length/2)]){const [cx,cy]=bCenter(b);ctx.fillStyle="#9fb7c9";ctx.beginPath();ctx.arc(cx,cy,0.32,0,Math.PI*2);ctx.fill();ctx.fillStyle=colors.water;ctx.beginPath();ctx.arc(cx,cy,0.22,0,Math.PI*2);ctx.fill()}},
  playground:(j,b,q,x,y,z)=>{ctx.fillStyle="#ead7a6";ctx.fillRect(...q);if(z>=9){const c=["#d0543a","#3a7ad0","#3aa05a"][j%3];ctx.fillStyle=c;ctx.fillRect(x+0.16,y+0.16,0.18,0.18)}},
  cafe:(j,b,q,x,y,z)=>{ctx.fillStyle="#e3d5c0";ctx.fillRect(...q);if(z>=9){ctx.fillStyle="#9a5b3f";for(const [a,c] of [[0.15,0.15],[0.35,0.35]]){ctx.beginPath();ctx.arc(x+a,y+c,0.07,0,Math.PI*2);ctx.fill()}}},
  church:(j,b,q,x,y,z)=>{ctx.fillStyle="#b9cfa6";ctx.fillRect(...q)}};
// aleje: stromy podél chodníků ulic v obcích
function drawAlleys(list){if(cam.z<6)return;ctx.fillStyle=colors.tree;
  for(const e of list){if(!e.alej||isRampEdge(S,e))continue;for(let u=0.6;u<e.g.len-0.5;u+=1.1){const p=pointAt(e.g,u);for(const sg of [1,-1]){const o=sg>0?e.er+0.13:-(e.el+0.13);ctx.beginPath();ctx.arc(p.x+p.nx*o,p.y+p.ny*o,0.11,0,Math.PI*2);ctx.fill()}}}}
function lotSlots(b){const out=[];for(const j of b.tiles){const r=S.role[j];if(r===R_LOT||r===R_YARD||r===R_GAR||r===R_FORE&&(tx(j)+ty(j))%2)out.push([wxOf(j),wyOf(j)])}return out}
function drawCarAt(x,y,ang,color,truck,cargo){const l=truck?0.62:0.4,w=truck?0.24:0.2;ctx.save();ctx.translate(x,y);ctx.rotate(ang);ctx.fillStyle=color;ctx.fillRect(-l/2,-w/2,l,w);
  if(truck&&cargo){ctx.fillStyle=GOODS[cargo].color;ctx.fillRect(-l/2+0.03,-w/2+0.03,l*0.6,w-0.06)}
  ctx.fillStyle="rgba(255,255,255,.7)";ctx.fillRect(l/2-l*0.22,-w/2,l*0.16,w);ctx.restore()}
const _p={};
const doorXY=b=>b&&b.front!==undefined?[wxOf(b.front),wyOf(b.front)]:null;
function carPose(c){
  if((c.state==="enter"||c.state==="unpark")&&c.path){const q=pathPose(c.path,c.ps);return {x:q.x,y:q.y,ang:q.ang,lvl:0}}
  if(c.state==="exit"){const l=c.links[0],e=S.edges[l>>1];if(!e||e.dead)return null;const d=l&1;const u=d?e.g.len-c.s:c.s;const p=pointAt(e.g,clamp(u,0,e.g.len),_p);
    if(c.ux!==undefined)return {x:c.ux,y:c.uy,ang:Math.atan2(p.y-c.uy,p.x-c.ux),lvl:0};
    const dr=doorXY(c.trip&&c.trip.from)||[p.x,p.y];
    return {x:p.x+(dr[0]-p.x)*0.55,y:p.y+(dr[1]-p.y)*0.55,ang:Math.atan2(p.y-dr[1],p.x-dr[0]),lvl:0}}
  if(c.state==="enter"){const dr=doorXY(c.trip&&c.trip.to)||[c.ex,c.ey];const f=Math.min(1,c.t)*0.72;
    return {x:c.ex+(dr[0]-c.ex)*f,y:c.ey+(dr[1]-c.ey)*f,ang:Math.atan2(dr[1]-c.ey,dr[0]-c.ex),lvl:0}}
  const l=c.links[c.li],e=S.edges[l>>1];if(!e||e.dead)return null;const d=l&1;
  if(c.conn&&c.s<c.conn.s1){const cn=c.conn,t=clamp((c.s-cn.s0)/cn.len,0,1);const q=bez(cn,t);c._o=laneOffset(e,d,c.lane);return {x:q[0],y:q[1],ang:bezTan(cn,t),lvl:S.nodes[cn.node].lvl}}
  const u=clamp(d?e.g.len-c.s:c.s,0,e.g.len);const p=pointAt(e.g,u,_p);
  // boční posun do nového pruhu plynule
  const off0=laneOffset(e,d,c.lane);if(c._o===undefined||Math.abs(c._o-off0)>0.9)c._o=off0;else c._o+=(off0-c._o)*0.18;
  const off=c._o,sg=d?-1:1;return {x:p.x+p.nx*off*sg,y:p.y+p.ny*off*sg,ang:Math.atan2(p.ty*sg,p.tx*sg),lvl:lvlAt(S,e,u),L:edgeLayer(e)}}
function walkerPose(w){
  if(w.ph==="cross"&&w.cur){const x=w.cur,t=x.go?clamp(w.t,0,1):0;return [x.x0+(x.x1-x.x0)*t,x.y0+(x.y1-x.y0)*t]}
  const l=w.links[w.li],e=S.edges[l>>1];if(!e||e.dead)return null;const d=l&1;const u=clamp(d?e.g.len-w.s:w.s,0,e.g.len);
  if(lvlAt(S,e,u)>=0.5)return null;const p=pointAt(e.g,u,_p);const sd=RK[e.kind].side/2;const side=w.sd*(d?-1:1);const off=side>0?e.er-sd:-(e.el-sd);let x=p.x+p.nx*off,y=p.y+p.ny*off;
  if(w.ph==="out"||w.ph==="in"){const dr=doorXY(w.ph==="out"?w.trip.from:w.trip.to);if(dr){const f=w.ph==="out"?1-w.t:w.t;x+=(dr[0]-x)*f*0.85;y+=(dr[1]-y)*f*0.85}}
  return [x,y]}
function drawVehicles(layer){if(cam.z<3)return;
  for(const c of S.cars){if(c.dead)continue;const q=carPose(c);if(!q)continue;const L=q.L!==undefined?q.L:q.lvl<0.5?0:q.lvl<1.5?1:2;if(L!==layer||!inView(q.x,q.y,1))continue;
    if(cam.z<6){ctx.fillStyle=c.trip&&c.trip.truck?"#3b4148":c.color;ctx.fillRect(q.x-0.2,q.y-0.2,0.4,0.4);continue}
    drawCarAt(q.x,q.y,q.ang,c.trip&&c.trip.truck?"#3b4148":c.color,c.trip&&c.trip.truck,c.trip&&c.trip.cargo)}
  if(layer===0&&cam.z>=8){for(const w of S.walkers){if(w.dead)continue;const q=walkerPose(w);if(!q)continue;const [x,y]=q;if(!inView(x,y,1))continue;
    ctx.fillStyle=w.kid?"#e0752d":w.trip.purpose==="senior"?"#7a6aa8":"#3b4a5a";ctx.beginPath();ctx.arc(x,y,w.kid?0.06:0.075,0,Math.PI*2);ctx.fill()}}}
// zaparkovaná auta na svých místech; u bytovek auta obyvatel, kteří jsou doma
function drawParked(x0,y0,x1,y1){if(cam.z<6)return;for(const b of S.buildings){const x=tx(b.front),y=ty(b.front);if(x<x0-6||x>x1+6||y<y0-6||y>y1+6)continue;
  const lay=lotLayout(S,b);if(!lay)continue;
  if(b.type==="flat"){const n=homeCars(b);const col=b.town?b.town.color:"#888";for(let k=0;k<n;k++){const s=lay.spots[k];drawCarAt(s.x,s.y,s.ang,shade(col,0.75+((k*37)%5)*0.1),false,null)}continue}
  for(const pe of b.parked){if(pe.spot===undefined)continue;const s=lay.spots[pe.spot];if(s)drawCarAt(s.x,s.y,s.ang,pe.color,false,null)}}}
// ulička parkoviště: páteř od vjezdu a uličky mezi řadami míst
function drawLot(b){const lay=lotLayout(S,b);if(!lay||cam.z<7)return;const W=lay.W;ctx.strokeStyle=colors["road-edge"];ctx.globalAlpha=0.38;ctx.lineWidth=0.2;ctx.lineCap="butt";ctx.beginPath();
  let a=W(lay.first-0.1,lay.lat0),z=W(lay.last,lay.lat0);ctx.moveTo(a[0],a[1]);ctx.lineTo(z[0],z[1]);
  for(const q of lay.aisles){a=W(q.a,q.l0);z=W(q.a,q.l1);ctx.moveTo(a[0],a[1]);ctx.lineTo(z[0],z[1])}ctx.stroke();ctx.globalAlpha=1;ctx.lineCap="round"}
function drawZones(x0,y0,x1,y1){if(!zonePattern)return;ctx.save();ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle=zonePattern;const z=cam.z;
  const c=z*CS;for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)if(S.zone[y*W+x])ctx.fillRect(x*c-cam.x,y*c-cam.y,c,c);ctx.restore()}
function nightAlpha(){const h=hourOf(S);if(h>=21||h<4.5)return 0.32;if(h>=19)return 0.32*(h-19)/2;if(h<6.5)return 0.32*(6.5-h)/2;return 0}
function drawLabels(){ctx.setTransform(dpr,0,0,dpr,0,0);const z=cam.z,fs=clamp(z*0.75,11,15);ctx.lineJoin="round";ctx.textAlign="center";ctx.textBaseline="bottom";
  for(const t of S.towns){const x=t.cx*z-cam.x,y=(t.cy-0.6)*z-cam.y;if(x<-80||x>vw+80||y<-40||y>vh+40)continue;if(z<6&&t.pop<30)continue;
    ctx.font=`600 ${fs}px "IBM Plex Sans", system-ui, sans-serif`;const txt=t.name+(z>=8?"  "+t.pop:"");
    ctx.lineWidth=4;ctx.strokeStyle=colors.halo;ctx.strokeText(txt,x,y);ctx.fillStyle=colors.label;ctx.fillText(txt,x,y);
    const tw=ctx.measureText(txt).width;ctx.fillStyle=!t.accessList.length?colors["road-edge"]:t.jam>0.4?colors.bad:t.rate>0.018?colors.good:colors.warn;
    ctx.beginPath();ctx.arc(x-tw/2-7,y-fs*0.45,3.2,0,Math.PI*2);ctx.fill()}
  if(z>=5)for(const Z of S.zones){const x=Z.x*z-cam.x,y=Z.y*z-cam.y;if(x<-120||x>vw+120||y<-40||y>vh+40)continue;ctx.font=`600 ${Math.max(10,fs-2)}px "IBM Plex Sans", system-ui, sans-serif`;
    const txt=Z.name.toUpperCase();ctx.lineWidth=4;ctx.strokeStyle=colors.halo;ctx.strokeText(txt,x,y+fs*1.6);ctx.fillStyle=colors.muted||colors.label;ctx.fillStyle=colors.label;ctx.globalAlpha=0.7;ctx.fillText(txt,x,y+fs*1.6);ctx.globalAlpha=1}
  for(const g of S.gates){const n=S.nodes[g.node];const px=-DY[g.inward],py=DX[g.inward];const wx=n.x+DX[g.inward]*3+px*1.8,wy=n.y+DY[g.inward]*3+py*1.8;
    const x=wx*z-cam.x,y=wy*z-cam.y;const txt=(g.edge===0?"← ":g.edge===1?"":g.edge===2?"↑ ":"↓ ")+g.name+(g.edge===1?" →":"");ctx.font=`600 ${fs}px "IBM Plex Sans", system-ui, sans-serif`;
    const tw=ctx.measureText(txt).width+12;const bx=clamp(x-tw/2,-cam.x+4,MW*z-cam.x-tw-4),by=clamp(y-fs*0.8,-cam.y+4,MH*z-cam.y-fs*1.7);
    ctx.fillStyle=colors.sign;ctx.fillRect(bx,by,tw,fs*1.55);ctx.fillStyle="#fff";ctx.textBaseline="middle";ctx.textAlign="left";ctx.fillText(txt,bx+6,by+fs*0.8);ctx.textAlign="center";ctx.textBaseline="bottom"}}
function strokeTarget(t,col,extra){if(!t)return;const z=cam.z;ctx.strokeStyle=col;ctx.lineWidth=Math.max(0.06,2/z);
  if(t.type==="edge"){const e=S.edges[t.id];if(!e||e.dead)return;ctx.globalAlpha=0.45;ctx.fillStyle=col;ctx.fill(bandPath(e,0.1));ctx.globalAlpha=1}
  else if(t.type==="node"){const n=S.nodes[t.id];if(!n||n.dead)return;ctx.beginPath();ctx.arc(n.x,n.y,Math.max(0.3,nodeR(n))+0.15,0,Math.PI*2);ctx.stroke()}
  else if(t.type==="bld"){if(t.b.dead)return;const b=t.b;ctx.beginPath();for(const j of b.tiles){const x=tx(j)*CS,y=ty(j)*CS;for(let d=0;d<4;d++){const n=NB[j*4+d];if(n>=0&&S.bld[n]===b)continue;if(d===0){ctx.moveTo(x+CS,y);ctx.lineTo(x+CS,y+CS)}else if(d===1){ctx.moveTo(x,y);ctx.lineTo(x,y+CS)}else if(d===2){ctx.moveTo(x,y+CS);ctx.lineTo(x+CS,y+CS)}else{ctx.moveTo(x,y);ctx.lineTo(x+CS,y)}}}ctx.stroke()}
  else if(t.type==="cell")ctx.strokeRect(tx(t.c)*CS+0.03,ty(t.c)*CS+0.03,CS-0.06,CS-0.06)}
// pruh, který nástroj Pruhy přidá nebo ubere (strana a případně jen kus úseku)
function drawLaneHint(L){const e=S.edges[L.e];if(!e||e.dead)return;const z=cam.z;let u0=Math.min(L.u0,L.u1),u1=Math.max(L.u0,L.u1);if(u1-u0<0.8){u0=0;u1=e.g.len}
  const sd=RK[e.kind].side,one=e.lf===0||e.lb===0;const o=one||L.dir!==1?e.er-sd+(L.rem?-LW/2:LW/2):-(e.el-sd+(L.rem?-LW/2:LW/2));const g=geom(subPts(e.g,u0,u1));
  const p=new Path2D();for(let k=0;k<g.n;k++){const x=g.pts[2*k]+g.nx[k]*o,y=g.pts[2*k+1]+g.ny[k]*o;if(k)p.lineTo(x,y);else p.moveTo(x,y)}
  ctx.globalAlpha=0.6;ctx.strokeStyle=L.rem?colors.bad:colors.accent;ctx.lineWidth=LW*0.9;ctx.lineCap="butt";ctx.stroke(p);ctx.globalAlpha=1;ctx.lineCap="round"}
function drawPreview(){const P=UI.plan;const z=cam.z;
  if(UI.tool==="lane"&&(UI.laneDrag||UI.laneHover))drawLaneHint(UI.laneDrag||UI.laneHover);
  // místa napojení na pruh (konce přidaných pruhů)
  if(UI.tool==="build"&&!UI.rebuild&&z>=8){ctx.fillStyle=colors.accent;ctx.globalAlpha=0.55;for(const n of S.nodes){if(n.dead||n.edges.length!==2||!inView(n.x,n.y,1))continue;for(const p of lanePorts(S,n)){ctx.beginPath();ctx.arc(p.x,p.y,0.09,0,Math.PI*2);ctx.fill()}}ctx.globalAlpha=1}
  // kurzor: křížek na ose budoucí silnice (střed pole), u silnice kroužek přichycení
  if(UI.snapHint&&UI.mouse.in){const q=UI.snapHint;ctx.strokeStyle=colors.accent;ctx.lineWidth=Math.max(0.05,2/z);ctx.beginPath();
    if(q.type==="free"){const s=0.28;ctx.moveTo(q.x-s,q.y);ctx.lineTo(q.x+s,q.y);ctx.moveTo(q.x,q.y-s);ctx.lineTo(q.x,q.y+s)}else ctx.arc(q.x,q.y,q.port?0.16:q.type==="node"?0.3:0.18,0,Math.PI*2);ctx.stroke()}
  if((UI.tool==="split"||UI.tool==="cross")&&UI.splitHover){const e=S.edges[UI.splitHover.e];if(e&&!e.dead){const p=pointAt(e.g,UI.splitHover.u);ctx.strokeStyle=colors.accent;ctx.lineWidth=Math.max(0.06,2/z);
    ctx.beginPath();ctx.moveTo(p.x+p.nx*(e.er+0.2),p.y+p.ny*(e.er+0.2));ctx.lineTo(p.x-p.nx*(e.el+0.2),p.y-p.ny*(e.el+0.2));ctx.stroke()}}
  if(UI.draw&&UI.draw.ghost){const g=UI.draw.ghost;ctx.strokeStyle=colors.accent;ctx.lineWidth=Math.max(0.05,1.5/z);ctx.setLineDash([0.2,0.15]);ctx.beginPath();ctx.moveTo(g[0],g[1]);for(let k=2;k<g.length;k+=2)ctx.lineTo(g[k],g[k+1]);ctx.stroke();ctx.setLineDash([])}
  if(!P)return;
  if(P.gs){ctx.lineCap="round";ctx.globalAlpha=0.5;ctx.strokeStyle=P.ok?colors.accent:colors.bad;ctx.lineWidth=0.5;for(const g of P.gs){const p=new Path2D();const q=g.pts;p.moveTo(q[0],q[1]);for(let k=2;k<q.length;k+=2)p.lineTo(q[k],q[k+1]);ctx.stroke(p)}ctx.globalAlpha=1}
  if(P.lanes&&P.lanes.ok&&P.lanes.range){const lp=P.lanes;drawLaneHint({e:lp.e.id,u0:lp.range[0],u1:lp.range[1],dir:lp.dir,rem:false})}
  if(P.g&&!P.rebuild&&!P.gs){ctx.lineCap="round";ctx.lineJoin="round";const p=new Path2D();const q=P.g.pts;p.moveTo(q[0],q[1]);for(let k=2;k<q.length;k+=2)p.lineTo(q[k],q[k+1]);
    const w=P.branch?(P.road.lanes*LW+0.2):P.round?(P.lanes*LW+0.24):P.spec?(P.lanes*(RK[P.spec.kind].oneway?1:2)*LW+RK[P.spec.kind].median+2*RK[P.spec.kind].side):0.6;
    ctx.globalAlpha=0.55;ctx.strokeStyle=P.ok?colors.accent:colors.bad;ctx.lineWidth=w;ctx.stroke(p);ctx.globalAlpha=1}
  if(P.rebuild){ctx.globalAlpha=0.5;ctx.fillStyle=colors.accent;for(const r of P.rebuild){if(r.e.dead)continue;const g=geom(subPts(r.e.g,r.u0,r.u1));const ext=edgeExt({kind:P.spec.kind,lf:r.lf,lb:r.lb});
    const p=new Path2D();for(let k=0;k<g.n;k++){const x=g.pts[2*k]+g.nx[k]*ext[0],y=g.pts[2*k+1]+g.ny[k]*ext[0];if(k)p.lineTo(x,y);else p.moveTo(x,y)}for(let k=g.n-1;k>=0;k--)p.lineTo(g.pts[2*k]-g.nx[k]*ext[1],g.pts[2*k+1]-g.ny[k]*ext[1]);p.closePath();ctx.fill(p)}ctx.globalAlpha=1}
  if(P.demolish)for(const b of P.demolish){ctx.fillStyle="rgba(192,58,43,.45)";for(const j of b.tiles)ctx.fillRect(tx(j)*CS,ty(j)*CS,CS,CS)}
  if(P.junctions){ctx.fillStyle=colors.accent;for(const j of P.junctions){ctx.beginPath();ctx.arc(j.x,j.y,0.16,0,Math.PI*2);ctx.fill()}}
  if(P.bad&&P.bad.x!==undefined){ctx.strokeStyle=colors.bad;ctx.lineWidth=0.08;ctx.beginPath();ctx.arc(P.bad.x,P.bad.y,0.5,0,Math.PI*2);ctx.stroke()}}
function drawCursorLabel(){const P=UI.plan;if(!P||!UI.mouse.in)return;ctx.setTransform(dpr,0,0,dpr,0,0);
  let txt;if(!P.ok)txt=P.msg;else{txt=(P.rebuild?"Přestavět · ":"")+fmt(P.cost)+" Kč";if(P.demolish&&P.demolish.length)txt+=" · zbourá "+P.demolish.length+(P.demolish.length===1?" budovu":P.demolish.length<5?" budovy":" budov");if(P.spec&&P.spec.end&&P.spec.end.lvl>0||P.spec&&P.spec.start&&P.spec.start.lvl>0)txt+=" · "+LEVEL_NAMES[Math.round(Math.max(P.spec.start.lvl,P.spec.end.lvl))].toLowerCase()}
  ctx.font='500 12px "IBM Plex Sans", system-ui, sans-serif';const w=ctx.measureText(txt).width+14;const x=Math.min(vw-w-8,UI.mouse.x+16),y=Math.min(vh-30,UI.mouse.y+16);
  ctx.fillStyle=P.ok?colors.ink:colors.bad;ctx.globalAlpha=0.92;ctx.fillRect(x,y,w,22);ctx.globalAlpha=1;ctx.fillStyle=P.ok?colors.panel:"#fff";ctx.textAlign="left";ctx.textBaseline="middle";ctx.fillText(txt,x+7,y+11)}
function render(){
  for(const i of S.dirty)drawTerrainTile(i);S.dirty.length=0;
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle=colors.outside;ctx.fillRect(0,0,vw,vh);
  ctx.imageSmoothingEnabled=cam.z<TS0;ctx.drawImage(tc,0,0,tc.width,tc.height,-cam.x,-cam.y,MW*cam.z,MH*cam.z);
  const z=cam.z,x0=Math.max(0,Math.floor(cam.x/z/CS)),y0=Math.max(0,Math.floor(cam.y/z/CS)),x1=Math.min(W-1,Math.floor((cam.x+vw)/z/CS)),y1=Math.min(H-1,Math.floor((cam.y+vh)/z/CS));
  drawZones(x0,y0,x1,y1);
  ctx.setTransform(dpr*z,0,0,dpr*z,-cam.x*dpr,-cam.y*dpr);
  const layers=[[],[],[]];for(const e of S.edges){if(e.dead||!edgeVisible(e))continue;layers[edgeLayer(e)].push(e)}
  const vis=visBuildings(x0,y0,x1,y1);drawDriveways(vis);
  drawRoadLayer(layers[0],0);drawRings(layers[0]);drawNodes(0);drawAlleys(layers[0]);
  drawBuildings(vis);drawParked(x0,y0,x1,y1);drawVehicles(0);
  for(let L=1;L<3;L++){if(!layers[L].length)continue;drawRoadLayer(layers[L],L);drawNodes(L);drawVehicles(L)}
  const na=nightAlpha();if(na>0){ctx.save();ctx.setTransform(dpr,0,0,dpr,0,0);ctx.globalAlpha=na;ctx.fillStyle=colors.night;ctx.fillRect(0,0,vw,vh);ctx.restore();
    if(z>=7){ctx.fillStyle="rgba(255,214,120,"+(na*2.2).toFixed(2)+")";for(const b of S.buildings){if(!isHome(b)||b.away>=b.pop*0.8)continue;const x=tx(b.front),y=ty(b.front);if(x<x0-1||x>x1+1||y<y0-1||y>y1+1)continue;ctx.fillRect(wxOf(b.front)-0.11,wyOf(b.front)-0.11,0.22,0.22)}}}
  ctx.setTransform(dpr*z,0,0,dpr*z,-cam.x*dpr,-cam.y*dpr);
  strokeTarget(UI.pinned,colors.ink);if(UI.hover&&!UI.draw&&!(UI.tool==="build"&&!UI.rebuild))strokeTarget(UI.hover,colors.accent);
  drawPreview();
  if(flash){const age=(performance.now()-flash.t)/1000;if(age>2.4)flash=null;else{ctx.strokeStyle=colors.accent;ctx.globalAlpha=Math.max(0,1-age/2.4);ctx.lineWidth=3/z;ctx.beginPath();ctx.arc(flash.x,flash.y,0.8+age*1.2,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1}}
  drawLabels();drawCursorLabel()}
