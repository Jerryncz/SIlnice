// Vykreslování: terén z mezipaměti, silnice po vrstvách (zem, most, vysoký most), budovy, auta, chodci, noc, popisky, náhled.

function edgeLayer(e){const m=Math.max(S.nodes[e.a].lvl,S.nodes[e.b].lvl);return m<0.5?0:m<1.5?1:2}
function edgePath(e){if(e._g===e.g&&e._p)return e._p;const p=new Path2D(),q=e.g.pts;p.moveTo(q[0],q[1]);for(let k=2;k<q.length;k+=2)p.lineTo(q[k],q[k+1]);e._p=p;e._g=e.g;e._m=new Map();return p}
function nodeR(n){let r=0.05;if(n.edges.length>=3)for(const a of n.arms)r=Math.max(r,S.edges[a.e].w/2);return r}
function offsetPath(e,off,trimA,trimB){edgePath(e);const key=off.toFixed(3)+"|"+trimA.toFixed(2)+"|"+trimB.toFixed(2);let p=e._m.get(key);if(p)return p;
  const g=e.g,q=g.pts;p=new Path2D();let started=false;
  for(let k=0;k<g.n;k++){const u=g.cum[k];if(u<trimA||u>g.len-trimB)continue;const x=q[2*k]+g.nx[k]*off,y=q[2*k+1]+g.ny[k]*off;if(!started){p.moveTo(x,y);started=true}else p.lineTo(x,y)}
  e._m.set(key,p);return p}
function asphaltColor(e){if(overlay){const c=Math.max(e.cong[0],e.cong[1]);if(e.flow>3||c>0.05)return c<0.35?colors.good:c<0.7?colors.warn:colors.bad}
  return e.kind==="street"?colors.street:(e.kind==="hwy"||e.kind==="ramp")?colors.hwy:colors.road}
function drawRoadLayer(list,layer){const z=cam.z;ctx.lineCap="round";ctx.lineJoin="round";
  if(layer>0){ctx.save();ctx.translate(0.16,0.26);ctx.strokeStyle="rgba(0,0,0,.22)";for(const e of list){ctx.lineWidth=e.w+0.2;ctx.stroke(edgePath(e))}ctx.restore()}
  for(const e of list){ctx.strokeStyle=layer>0?colors["bridge-edge"]:(e.kind==="hwy"||e.kind==="ramp")?colors["hwy-edge"]:colors["road-edge"];ctx.lineWidth=e.w+(layer>0?0.16:Math.max(0.08,1.6/z));ctx.stroke(edgePath(e))}
  for(const e of list){const K=RK[e.kind];if(!K.side)continue;ctx.strokeStyle=colors.sidewalk;ctx.lineWidth=e.w;ctx.stroke(edgePath(e))}
  for(const e of list){const K=RK[e.kind];ctx.strokeStyle=asphaltColor(e);ctx.lineWidth=e.w-2*K.side;ctx.stroke(edgePath(e))}
  for(const e of list){const K=RK[e.kind];if(!K.median||e.lb===0||e.lf===0)continue;ctx.strokeStyle=e.kind==="blvd"?colors.median:colors["hwy-edge"];ctx.lineWidth=e.kind==="blvd"?K.median-0.06:Math.max(0.04,K.median*0.35);
    ctx.lineCap="butt";ctx.stroke(offsetPath(e,0,nodeR(S.nodes[e.a]),nodeR(S.nodes[e.b])));ctx.lineCap="round"}
  if(z<9)return;
  ctx.lineCap="butt";const lw=Math.max(0.03,1.1/z);
  for(const e of list){const K=RK[e.kind];const ta=nodeR(S.nodes[e.a])+0.05,tb=nodeR(S.nodes[e.b])+0.05;if(e.g.len-ta-tb<0.2)continue;
    const one=e.lf===0||e.lb===0;
    if(!one){if(!K.median){ctx.strokeStyle=colors.mark;ctx.lineWidth=lw;ctx.setLineDash(e.lf>=2?[]:[0.22,0.16]);ctx.stroke(offsetPath(e,0,ta,tb))}
      else if(e.kind==="hwy"){ctx.strokeStyle=colors.mark;ctx.lineWidth=lw;ctx.setLineDash([]);ctx.stroke(offsetPath(e,K.median/2,ta,tb));ctx.stroke(offsetPath(e,-K.median/2,ta,tb))}
      ctx.strokeStyle=colors.lane;ctx.lineWidth=lw;ctx.setLineDash([0.18,0.2]);
      for(let k=1;k<e.lf;k++)ctx.stroke(offsetPath(e,K.median/2+k*LW,ta,tb));
      for(let k=1;k<e.lb;k++)ctx.stroke(offsetPath(e,-(K.median/2+k*LW),ta,tb))}
    else{const L=e.lf+e.lb;ctx.strokeStyle=colors.lane;ctx.lineWidth=lw;ctx.setLineDash([0.18,0.2]);for(let k=1;k<L;k++)ctx.stroke(offsetPath(e,-(L*LW)/2+k*LW,ta,tb))}
    if(e.kind==="hwy"){ctx.setLineDash([]);ctx.strokeStyle=colors.lane;const ow=e.w/2-0.04;ctx.stroke(offsetPath(e,ow,ta,tb));ctx.stroke(offsetPath(e,-ow,ta,tb))}}
  ctx.setLineDash([]);ctx.lineCap="round";
  if(z>=13){ctx.fillStyle=colors.accent;for(const e of list){if(!(e.lf===0||e.lb===0)||e.ring||e.g.len<1.2)continue;const fwd=e.lf>0;
    for(let u=0.6;u<e.g.len-0.4;u+=2.4){const p=pointAt(e.g,u);const dx=fwd?p.tx:-p.tx,dy=fwd?p.ty:-p.ty,s=0.13;
      ctx.beginPath();ctx.moveTo(p.x+dx*s,p.y+dy*s);ctx.lineTo(p.x-dx*s*0.7+dy*s*0.7,p.y-dy*s*0.7-dx*s*0.7);ctx.lineTo(p.x-dx*s*0.7-dy*s*0.7,p.y-dy*s*0.7+dx*s*0.7);ctx.closePath();ctx.fill()}}}}
function drawNodes(layer){const z=cam.z;if(z<8)return;
  for(const n of S.nodes){if(n.dead||n.edges.length<3)continue;if((n.lvl<0.5?0:n.lvl<1.5?1:2)!==layer)continue;if(!inView(n.x,n.y,2))continue;const r=nodeR(n);
    if(n.eff==="light"){const L=n.light;for(const a of n.arms){if(!linkLanes(S,a.inLink))continue;const e=S.edges[a.e];const rx=a.hy,ry=-a.hx;const px=n.x+a.hx*(r+0.12)+rx*(e.w/2*0.6),py=n.y+a.hy*(r+0.12)+ry*(e.w/2*0.6);
      const col=L&&L.axis===a.axis?(L.amber?colors.warn:colors.good):colors.bad;ctx.fillStyle="#15181a";ctx.beginPath();ctx.arc(px,py,0.12,0,Math.PI*2);ctx.fill();ctx.fillStyle=col;ctx.beginPath();ctx.arc(px,py,0.08,0,Math.PI*2);ctx.fill()}}
    else if(n.eff==="main"||n.eff==="merge"){for(const a of n.arms){if(n.mainEdges.has(a.e)||!linkLanes(S,a.inLink))continue;const e=S.edges[a.e];const rx=a.hy,ry=-a.hx;const px=n.x+a.hx*(r+0.22)+rx*(e.w/2+0.05),py=n.y+a.hy*(r+0.22)+ry*(e.w/2+0.05),s=0.13;
      ctx.fillStyle="#fff";ctx.strokeStyle="#c03a2b";ctx.lineWidth=0.045;ctx.beginPath();ctx.moveTo(px-s,py-s*0.7);ctx.lineTo(px+s,py-s*0.7);ctx.lineTo(px,py+s*0.9);ctx.closePath();ctx.fill();ctx.stroke()}}}}
function drawRings(){for(const R of S.rings){if(!R.edges.some(id=>!S.edges[id].dead))continue;if(!inView(R.cx,R.cy,R.r+1))continue;const w=S.edges[R.edges.find(id=>!S.edges[id].dead)].w;
  ctx.fillStyle=colors.median;ctx.beginPath();ctx.arc(R.cx,R.cy,Math.max(0.2,R.r-w/2-0.06),0,Math.PI*2);ctx.fill()}}
function inView(x,y,m){const z=cam.z;return x*z>cam.x-m*z&&x*z<cam.x+vw+m*z&&y*z>cam.y-m*z&&y*z<cam.y+vh+m*z}
function edgeVisible(e){const b=e.g.bb,z=cam.z;return !(b[2]*z<cam.x-20||b[0]*z>cam.x+vw+20||b[3]*z<cam.y-20||b[1]*z>cam.y+vh+20)}

// ---- budovy ----
function shade(hex,f){const n=parseInt(hex.slice(1),16);let r=n>>16,g=(n>>8)&255,b=n&255;return`rgb(${Math.min(255,Math.round(r*f))},${Math.min(255,Math.round(g*f))},${Math.min(255,Math.round(b*f))})`}
function mergedRect(j,b,inset){const x=tx(j),y=ty(j),lot=isLotRole(S.role[j]);
  const same=d=>{const n=NB[j*4+d];return n>=0&&S.bld[n]===b&&isLotRole(S.role[n])===lot};
  const l=same(1)?0:inset,r=same(0)?0:inset,t=same(3)?0:inset,bo=same(2)?0:inset;return[x+l,y+t,1-l-r,1-t-bo]}
function bCenter(b,f){let sx=0,sy=0,n=0;for(const j of b.tiles)if(!f||f(S.role[j])){sx+=tx(j);sy+=ty(j);n++}if(!n)return bCenter(b);return[sx/n+0.5,sy/n+0.5]}
function drawSign(x,y,r,color,letter,square){ctx.fillStyle=color;ctx.beginPath();if(square)ctx.rect(x-r,y-r,2*r,2*r);else ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
  if(cam.z>=9){ctx.fillStyle="#fff";ctx.font=`500 ${(r*(letter.length>1?0.95:1.2)).toFixed(3)}px "IBM Plex Mono", monospace`;ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(letter,x,y+r*0.08)}}
function drawBuildings(x0,y0,x1,y1){const ins=0.13,z=cam.z;
  const vis=S.buildings.filter(b=>{const x=tx(b.front),y=ty(b.front);return x>=x0-4&&x<=x1+4&&y>=y0-4&&y<=y1+4});
  ctx.lineCap="round";ctx.strokeStyle=colors.lot;ctx.lineWidth=0.22;
  for(const b of vis){if(!b.access||!isHome(b))continue;ctx.beginPath();ctx.moveTo(tx(b.front)+0.5,ty(b.front)+0.5);ctx.lineTo(b.access.x,b.access.y);ctx.stroke()}
  ctx.lineWidth=0.5;for(const b of vis){if(!b.access||isHome(b))continue;ctx.beginPath();ctx.moveTo(tx(b.front)+0.5,ty(b.front)+0.5);ctx.lineTo(b.access.x,b.access.y);ctx.stroke()}
  ctx.fillStyle="rgba(0,0,0,.18)";
  for(const b of vis)for(const j of b.tiles){if(isLotRole(S.role[j]))continue;const q=mergedRect(j,b,ins);ctx.fillRect(q[0]+0.07,q[1]+0.1,q[2],q[3])}
  for(const b of vis){const K=KIND[b.type];
    for(const j of b.tiles){const r=S.role[j];
      if(r===R_HOUSE){ctx.fillStyle=b.town?b.town.color:"#888";ctx.fillRect(...mergedRect(j,b,ins))}
      else if(r===R_FLAT){const q=mergedRect(j,b,ins*0.6);ctx.fillStyle=shade(b.town?b.town.color:"#888888",0.62);ctx.fillRect(...q);
        if(z>=10){ctx.fillStyle="rgba(255,236,170,.8)";const x=tx(j),y=ty(j);for(let a=0;a<2;a++)for(let c=0;c<2;c++)ctx.fillRect(x+0.26+a*0.32,y+0.26+c*0.32,0.14,0.14)}}
      else if(r===R_BLD){const q=mergedRect(j,b,ins);ctx.fillStyle=b.type==="office"?shade(K.color,1):K.industry?shade(K.color,0.9):K.color;ctx.fillRect(...q);
        if(b.type==="office"&&z>=10){ctx.fillStyle="rgba(210,230,255,.55)";const x=tx(j),y=ty(j);for(let a=0;a<3;a++)ctx.fillRect(x+0.2+a*0.22,y+0.22,0.12,0.56)}}
      else if(r===R_GAR){const q=mergedRect(j,b,ins*0.6);ctx.fillStyle=colors["road-edge"];ctx.fillRect(...q);ctx.fillStyle=colors.lot;ctx.fillRect(q[0]+0.08,q[1]+0.08,q[2]-0.16,q[3]-0.16)}
      else{const q=mergedRect(j,b,0.04);ctx.fillStyle=r===R_YARD?(b.type==="school"?"rgba(201,149,42,.28)":shade(K.color,1.9).replace(/rgb\((\d+),(\d+),(\d+)\)/,(m,a,b2,c)=>`rgba(${a},${b2},${c},.55)`)):colors.lot;ctx.fillRect(...q);
        const x=tx(j),y=ty(j);
        if(r===R_LOT&&z>=9){ctx.strokeStyle=colors["lot-line"];ctx.lineWidth=Math.max(0.03,1/z);ctx.beginPath();ctx.moveTo(x+0.5,y+0.12);ctx.lineTo(x+0.5,y+0.88);ctx.moveTo(x+0.12,y+0.5);ctx.lineTo(x+0.88,y+0.5);ctx.stroke()}
        if(r===R_FORE){ctx.fillStyle=colors.canopy;ctx.globalAlpha=0.75;ctx.fillRect(x+0.14,y+0.14,0.72,0.72);ctx.globalAlpha=1;ctx.fillStyle=KIND.gas.color;ctx.fillRect(x+0.44,y+0.3,0.12,0.4)}
        if(r===R_YARD&&K.out&&z>=10){const n=Math.min(4,Math.ceil(b.out/2));ctx.fillStyle=GOODS[K.out].color;for(let s=0;s<n;s++)ctx.fillRect(x+0.15+s*0.18,y+0.55,0.13,0.28)}}}
    if(b.type==="flat"&&b.access){const fx=tx(b.front)+0.5,fy=ty(b.front)+0.5;const dx=b.access.x-fx,dy=b.access.y-fy,l=Math.hypot(dx,dy)||1;
      ctx.fillStyle="rgba(10,12,10,.85)";ctx.save();ctx.translate(fx+dx/l*0.36,fy+dy/l*0.36);ctx.rotate(Math.atan2(dy,dx));ctx.fillRect(-0.08,-0.17,0.16,0.34);ctx.restore()}
    if(K){if(b.type==="park"){const [x,y]=bCenter(b);drawSign(x,y,0.36,colors.sign,"P",true)}
      else{const [x,y]=bCenter(b,r=>r===R_BLD);drawSign(x,y,b.type==="mall"||b.type==="hyper"||b.type==="steel"?0.46:0.36,shade(K.color,0.8),K.letter,false)}}}}
function lotSlots(b){const out=[];for(const j of b.tiles){const r=S.role[j];const x=tx(j),y=ty(j);
  if(r===R_LOT||r===R_YARD||r===R_GAR){for(const [a,c] of[[0.27,0.27],[0.73,0.27],[0.27,0.73],[0.73,0.73]])out.push([x+a,y+c])}
  else if(r===R_FORE){for(const a of[0.27,0.73])out.push([x+a,y+0.5])}}return out}
function drawCarAt(x,y,ang,color,truck,cargo){const l=truck?0.62:0.4,w=truck?0.24:0.2;ctx.save();ctx.translate(x,y);ctx.rotate(ang);ctx.fillStyle=color;ctx.fillRect(-l/2,-w/2,l,w);
  if(truck&&cargo){ctx.fillStyle=GOODS[cargo].color;ctx.fillRect(-l/2+0.03,-w/2+0.03,l*0.6,w-0.06)}
  ctx.fillStyle="rgba(255,255,255,.7)";ctx.fillRect(l/2-l*0.22,-w/2,l*0.16,w);ctx.restore()}
const _p={};
function carPose(c){
  if(c.state==="exit"){const l=c.links[0],e=S.edges[l>>1];if(!e||e.dead)return null;const d=l&1;const u=d?e.g.len-c.s:c.s;const p=pointAt(e.g,clamp(u,0,e.g.len),_p);
    const tr=c.trip&&c.trip.from;const bx=tr&&tr.front!==undefined?tx(tr.front)+0.5:p.x,by=tr&&tr.front!==undefined?ty(tr.front)+0.5:p.y;
    return {x:p.x+(bx-p.x)*0.55,y:p.y+(by-p.y)*0.55,ang:Math.atan2(p.y-by,p.x-bx),lvl:0}}
  const l=c.links[c.li],e=S.edges[l>>1];if(!e||e.dead)return null;const d=l&1;const u=clamp(d?e.g.len-c.s:c.s,0,e.g.len);const p=pointAt(e.g,u,_p);
  const off=laneOffset(e,d,c.lane);const sg=d?-1:1;return {x:p.x+p.nx*off*sg,y:p.y+p.ny*off*sg,ang:Math.atan2(p.ty*sg,p.tx*sg),lvl:lvlAt(S,e,u)}}
function drawVehicles(layer){if(cam.z<3)return;
  for(const c of S.cars){if(c.dead)continue;const q=carPose(c);if(!q)continue;const L=q.lvl<0.5?0:q.lvl<1.5?1:2;if(L!==layer||!inView(q.x,q.y,1))continue;
    if(cam.z<6){ctx.fillStyle=c.trip&&c.trip.truck?"#3b4148":c.color;ctx.fillRect(q.x-0.2,q.y-0.2,0.4,0.4);continue}
    drawCarAt(q.x,q.y,q.ang,c.trip&&c.trip.truck?"#3b4148":c.color,c.trip&&c.trip.truck,c.trip&&c.trip.cargo)}
  if(layer===0&&cam.z>=8){for(const w of S.walkers){if(w.dead)continue;const l=w.links[w.li],e=S.edges[l>>1];if(!e||e.dead)continue;const d=l&1;const u=clamp(d?e.g.len-w.s:w.s,0,e.g.len);
    if(lvlAt(S,e,u)>=0.5)continue;const p=pointAt(e.g,u,_p);const off=(e.w/2-RK[e.kind].side/2)*w.side;const x=p.x+p.nx*off,y=p.y+p.ny*off;if(!inView(x,y,1))continue;
    ctx.fillStyle=w.kid?"#e0752d":w.trip.purpose==="senior"?"#7a6aa8":"#3b4a5a";ctx.beginPath();ctx.arc(x,y,w.kid?0.06:0.075,0,Math.PI*2);ctx.fill()}}}
function drawParked(x0,y0,x1,y1){if(cam.z<6)return;for(const b of S.buildings){if(!b.parked.length||isHome(b))continue;const x=tx(b.front),y=ty(b.front);if(x<x0-4||x>x1+4||y<y0-4||y>y1+4)continue;
  const sl=lotSlots(b);if(!sl.length)continue;for(let k=0;k<Math.min(b.parked.length,sl.length);k++){const s=sl[k];drawCarAt(s[0],s[1],Math.PI/2,b.parked[k].color,false,null)}}}
function drawZones(x0,y0,x1,y1){if(!zonePattern)return;ctx.save();ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle=zonePattern;const z=cam.z;
  for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)if(S.zone[y*W+x])ctx.fillRect(x*z-cam.x,y*z-cam.y,z,z);ctx.restore()}
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
    const tw=ctx.measureText(txt).width+12;const bx=clamp(x-tw/2,-cam.x+4,W*z-cam.x-tw-4),by=clamp(y-fs*0.8,-cam.y+4,H*z-cam.y-fs*1.7);
    ctx.fillStyle=colors.sign;ctx.fillRect(bx,by,tw,fs*1.55);ctx.fillStyle="#fff";ctx.textBaseline="middle";ctx.textAlign="left";ctx.fillText(txt,bx+6,by+fs*0.8);ctx.textAlign="center";ctx.textBaseline="bottom"}}
function strokeTarget(t,col,extra){if(!t)return;const z=cam.z;ctx.strokeStyle=col;ctx.lineWidth=Math.max(0.06,2/z);
  if(t.type==="edge"){const e=S.edges[t.id];if(!e||e.dead)return;ctx.globalAlpha=0.45;ctx.lineCap="round";ctx.lineWidth=e.w+0.2;ctx.stroke(edgePath(e));ctx.globalAlpha=1}
  else if(t.type==="node"){const n=S.nodes[t.id];if(!n||n.dead)return;ctx.beginPath();ctx.arc(n.x,n.y,nodeR(n)+0.15,0,Math.PI*2);ctx.stroke()}
  else if(t.type==="bld"){if(t.b.dead)return;for(const j of t.b.tiles)ctx.strokeRect(tx(j)+0.05,ty(j)+0.05,0.9,0.9)}
  else if(t.type==="cell")ctx.strokeRect(tx(t.c)+0.05,ty(t.c)+0.05,0.9,0.9)}
function drawPreview(){const P=UI.plan;const z=cam.z;
  if(UI.draw&&UI.draw.ghost){const g=UI.draw.ghost;ctx.strokeStyle=colors.accent;ctx.lineWidth=Math.max(0.05,1.5/z);ctx.setLineDash([0.2,0.15]);ctx.beginPath();ctx.moveTo(g[0],g[1]);for(let k=2;k<g.length;k+=2)ctx.lineTo(g[k],g[k+1]);ctx.stroke();ctx.setLineDash([])}
  if(!P)return;
  if(P.g){ctx.lineCap="round";ctx.lineJoin="round";const p=new Path2D();const q=P.g.pts;p.moveTo(q[0],q[1]);for(let k=2;k<q.length;k+=2)p.lineTo(q[k],q[k+1]);
    const w=P.round?(P.lanes*LW+0.24):P.spec?(P.lanes*(RK[P.spec.kind].oneway?1:2)*LW+RK[P.spec.kind].median+2*RK[P.spec.kind].side):0.6;
    ctx.globalAlpha=0.55;ctx.strokeStyle=P.ok?colors.accent:colors.bad;ctx.lineWidth=w;ctx.stroke(p);ctx.globalAlpha=1}
  if(P.demolish)for(const b of P.demolish){ctx.fillStyle="rgba(192,58,43,.45)";for(const j of b.tiles)ctx.fillRect(tx(j),ty(j),1,1)}
  if(P.junctions){ctx.fillStyle=colors.accent;for(const j of P.junctions){ctx.beginPath();ctx.arc(j.x,j.y,0.16,0,Math.PI*2);ctx.fill()}}
  if(P.bad&&P.bad.x!==undefined){ctx.strokeStyle=colors.bad;ctx.lineWidth=0.08;ctx.beginPath();ctx.arc(P.bad.x,P.bad.y,0.5,0,Math.PI*2);ctx.stroke()}}
function drawCursorLabel(){const P=UI.plan;if(!P||!UI.mouse.in)return;ctx.setTransform(dpr,0,0,dpr,0,0);
  let txt;if(!P.ok)txt=P.msg;else{txt=fmt(P.cost)+" Kč";if(P.demolish&&P.demolish.length)txt+=" · zbourá "+P.demolish.length+(P.demolish.length===1?" budovu":P.demolish.length<5?" budovy":" budov");if(P.spec&&P.spec.end&&P.spec.end.lvl>0||P.spec&&P.spec.start&&P.spec.start.lvl>0)txt+=" · "+LEVEL_NAMES[Math.round(Math.max(P.spec.start.lvl,P.spec.end.lvl))].toLowerCase()}
  ctx.font='500 12px "IBM Plex Sans", system-ui, sans-serif';const w=ctx.measureText(txt).width+14;const x=Math.min(vw-w-8,UI.mouse.x+16),y=Math.min(vh-30,UI.mouse.y+16);
  ctx.fillStyle=P.ok?colors.ink:colors.bad;ctx.globalAlpha=0.92;ctx.fillRect(x,y,w,22);ctx.globalAlpha=1;ctx.fillStyle=P.ok?colors.panel:"#fff";ctx.textAlign="left";ctx.textBaseline="middle";ctx.fillText(txt,x+7,y+11)}
function render(){
  for(const i of S.dirty)drawTerrainTile(i);S.dirty.length=0;
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle=colors.outside;ctx.fillRect(0,0,vw,vh);
  ctx.imageSmoothingEnabled=cam.z<TS0;ctx.drawImage(tc,0,0,tc.width,tc.height,-cam.x,-cam.y,W*cam.z,H*cam.z);
  const z=cam.z,x0=Math.max(0,Math.floor(cam.x/z)),y0=Math.max(0,Math.floor(cam.y/z)),x1=Math.min(W-1,Math.floor((cam.x+vw)/z)),y1=Math.min(H-1,Math.floor((cam.y+vh)/z));
  drawZones(x0,y0,x1,y1);
  ctx.setTransform(dpr*z,0,0,dpr*z,-cam.x*dpr,-cam.y*dpr);
  const layers=[[],[],[]];for(const e of S.edges){if(e.dead||!edgeVisible(e))continue;layers[edgeLayer(e)].push(e)}
  drawRoadLayer(layers[0],0);drawRings();drawNodes(0);
  drawBuildings(x0,y0,x1,y1);drawParked(x0,y0,x1,y1);drawVehicles(0);
  for(let L=1;L<3;L++){if(!layers[L].length)continue;drawRoadLayer(layers[L],L);drawNodes(L);drawVehicles(L)}
  const na=nightAlpha();if(na>0){ctx.save();ctx.setTransform(dpr,0,0,dpr,0,0);ctx.globalAlpha=na;ctx.fillStyle=colors.night;ctx.fillRect(0,0,vw,vh);ctx.restore();
    if(z>=7){ctx.fillStyle="rgba(255,214,120,"+(na*2.2).toFixed(2)+")";for(const b of S.buildings){if(!isHome(b)||b.away>=b.pop*0.8)continue;const x=tx(b.front),y=ty(b.front);if(x<x0-1||x>x1+1||y<y0-1||y>y1+1)continue;ctx.fillRect(x+0.38,y+0.38,0.24,0.24)}}}
  ctx.setTransform(dpr*z,0,0,dpr*z,-cam.x*dpr,-cam.y*dpr);
  strokeTarget(UI.pinned,colors.ink);if(UI.hover&&!UI.draw)strokeTarget(UI.hover,colors.accent);
  drawPreview();
  if(flash){const age=(performance.now()-flash.t)/1000;if(age>2.4)flash=null;else{ctx.strokeStyle=colors.accent;ctx.globalAlpha=Math.max(0,1-age/2.4);ctx.lineWidth=3/z;ctx.beginPath();ctx.arc(flash.x,flash.y,0.8+age*1.2,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1}}
  drawLabels();drawCursorLabel()}
