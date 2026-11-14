// Mapa: uzávěry, noc, popisky, výběr, náhled stavby a celkové vykreslení.

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
// výběr auta / chodce kliknutím (nástroj Ruka)
function pickMover(x,y){let best=null,bd=0.32;for(const c of S.cars){if(c.dead)continue;const q=carPose(c);if(!q)continue;const d=Math.hypot(q.x-x,q.y-y);if(d<bd){bd=d;best={type:"car",c}}}
  if(cam.z>=8)for(const w of S.walkers){if(w.dead)continue;const q=walkerPose(w);if(!q)continue;const d=Math.hypot(q[0]-x,q[1]-y);if(d<Math.min(bd,0.2)){bd=d;best={type:"walker",w}}}
  return best}
// trasy k výběru: auto / chodec (jeho trasa), budova (kdo jede sem modře a odtud oranžově), úsek (všichni, kdo přes něj mají trasu)
let traceTick=0;
function drawTrace(){const t=UI.pinned;if(!t||!(t.type==="car"||t.type==="walker"||t.type==="bld"||t.type==="edge"))return;const ts=traceSet(t);if((traceTick++%30)===0)UI.selDirty=true;if(!ts.length)return;
  const acc=[new Map(),new Map(),new Map()];   // sem / odtud / už projeto
  for(const q of ts){const m=q.m,li=m.li||0;if(!m.links)continue;for(let k=0;k<m.links.length;k++){const id=m.links[k]>>1;const M=k<li?acc[2]:acc[q.cls];M.set(id,(M.get(id)||0)+1)}}
  ctx.lineCap="round";ctx.lineJoin="round";const cols=["#1f6fe0","#e0752d","#1f6fe0"],al=[0.75,0.75,0.25];
  for(const k of [2,1,0]){ctx.strokeStyle=cols[k];ctx.globalAlpha=al[k];for(const [id,n] of acc[k]){const e=S.edges[id];if(!e||e.dead)continue;ctx.lineWidth=Math.min(0.6,0.12+0.035*n)+(k===1?0:0.04);ctx.stroke(edgePath(e))}}
  // chodci: jejich cesta po chodnících a přechodech (plně před nimi, slabě za nimi)
  ctx.lineWidth=0.07;for(const q of ts){if(q.car||!q.m.path)continue;const w=q.m;ctx.strokeStyle=cols[q.cls];
    for(const [a,b,al2] of [[0,w.s,0.25],[w.s,w.plen,0.85]]){if(b-a<0.01)continue;ctx.globalAlpha=al2;ctx.beginPath();const p0=pathPose(w.path,a);ctx.moveTo(p0.x,p0.y);let c=0;for(let i=1;i<w.path.length;i++){const l=Math.hypot(w.path[i][0]-w.path[i-1][0],w.path[i][1]-w.path[i-1][1]);c+=l;if(c>a&&c<b)ctx.lineTo(w.path[i][0],w.path[i][1])}const p1=pathPose(w.path,b);ctx.lineTo(p1.x,p1.y);ctx.stroke()}}
  ctx.globalAlpha=1;ctx.lineWidth=Math.max(0.05,2/cam.z);
  const mark=(b,col)=>{if(!b||b.isGate||b.dead||b.front===undefined)return;ctx.strokeStyle=col;ctx.beginPath();ctx.arc(wxOf(b.front),wyOf(b.front),0.45,0,Math.PI*2);ctx.stroke()};
  const ends=new Set();for(const q of ts){const tr=q.m.trip;if(!tr)continue;if(t.type!=="bld"||q.cls===1){if(!ends.has(tr.to)){ends.add(tr.to);mark(tr.to,"#1f6fe0")}}if(t.type!=="bld"||q.cls===0){if(!ends.has(tr.from)){ends.add(tr.from);mark(tr.from,"#e0752d")}}
    const p=q.car?carPose(q.m):null,w=q.car?null:walkerPose(q.m);const x=p?p.x:w?w[0]:null,y=p?p.y:w?w[1]:null;if(x!==null&&(ts.length<=60)){ctx.strokeStyle="#111";ctx.beginPath();ctx.arc(x,y,q.car?0.32:0.16,0,Math.PI*2);ctx.stroke()}}}
// nástroj Spojení: zvýrazněné křižovatky, u vybrané křivky spojení, konce a začátky pruhů
function drawConnTool(){if(UI.tool!=="conn")return;const z=cam.z;
  ctx.lineWidth=Math.max(0.04,1.5/z);for(const n of S.nodes){if(!connNodeOk(n)||n.id===UI.connNode||!inView(n.x,n.y,2))continue;ctx.strokeStyle=connCustom(S,n)?colors.accent:"rgba(31,95,174,.4)";ctx.beginPath();ctx.arc(n.x,n.y,Math.max(0.3,n.rad*0.7),0,Math.PI*2);ctx.stroke()}
  const n=UI.connNode!=null?S.nodes[UI.connNode]:null;if(!connNodeOk(n))return;
  const pal=["#1f6fe0","#e0752d","#2e9e5b","#b03fb0","#c9a227","#d23c3c"];const ai=new Map();n.arms.forEach((a,i)=>ai.set(a.inLink,i));
  ctx.lineCap="round";ctx.lineWidth=Math.max(0.035,1.6/z);
  for(const q of connCurves(n)){ctx.strokeStyle=pal[ai.get(q.l)%pal.length];ctx.globalAlpha=0.85;const c=q.c;ctx.beginPath();ctx.moveTo(c.x0,c.y0);ctx.bezierCurveTo(c.x1,c.y1,c.x2,c.y2,c.x3,c.y3);ctx.stroke()}
  ctx.globalAlpha=1;const mk=connMarks(n);
  for(const q of mk.ins){ctx.fillStyle=pal[ai.get(q.l)%pal.length];ctx.beginPath();ctx.arc(q.x,q.y,0.075,0,Math.PI*2);ctx.fill()}
  ctx.strokeStyle="#1d2420";ctx.lineWidth=Math.max(0.025,1/z);for(const q of mk.outs){ctx.fillStyle="#fff";ctx.beginPath();ctx.arc(q.x,q.y,0.07,0,Math.PI*2);ctx.fill();ctx.stroke()}
  const d=UI.connDrag;if(d){const a=mk.ins.find(q=>q.l===d.l&&q.k===d.k);if(a){ctx.strokeStyle=colors.accent;ctx.lineWidth=Math.max(0.04,2/z);ctx.setLineDash([0.12,0.08]);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(d.x,d.y);ctx.stroke();ctx.setLineDash([])}}}
function drawPreview(){drawConnTool();const P=UI.plan;const z=cam.z;
  if(UI.tool==="lane"&&(UI.laneDrag||UI.laneHover))drawLaneHint(UI.laneDrag||UI.laneHover);
  // místa napojení na pruh (konce přidaných pruhů)
  if(UI.tool==="build"&&!UI.rebuild&&z>=8){ctx.fillStyle=colors.accent;ctx.globalAlpha=0.55;for(const n of S.nodes){if(n.dead||n.edges.length!==2||!inView(n.x,n.y,1))continue;for(const p of lanePorts(S,n)){ctx.beginPath();ctx.arc(p.x,p.y,0.09,0,Math.PI*2);ctx.fill()}}ctx.globalAlpha=1}
  // kurzor: křížek na ose budoucí silnice (střed pole), u silnice kroužek přichycení
  if(UI.snapHint&&UI.mouse.in){const q=UI.snapHint;ctx.strokeStyle=colors.accent;ctx.lineWidth=Math.max(0.05,2/z);ctx.beginPath();
    if(q.ext){ctx.save();ctx.setLineDash([0.18,0.14]);ctx.globalAlpha=0.7;ctx.moveTo(q.ext.x,q.ext.y);ctx.lineTo(q.x,q.y);ctx.stroke();ctx.restore();ctx.beginPath();const s=0.2;ctx.moveTo(q.x-s,q.y-s);ctx.lineTo(q.x+s,q.y+s);ctx.moveTo(q.x-s,q.y+s);ctx.lineTo(q.x+s,q.y-s)}
    else if(q.mid){const s=0.3;ctx.moveTo(q.x,q.y-s);ctx.lineTo(q.x+s*0.87,q.y+s*0.5);ctx.lineTo(q.x-s*0.87,q.y+s*0.5);ctx.closePath()}
    else if(q.perp){const e=S.edges[q.edge],p=e&&!e.dead?pointAt(e.g,q.u):null;if(p){let nx=p.nx,ny=p.ny;const st=UI.draw&&UI.draw.start;if(st&&(st.x-q.x)*nx+(st.y-q.y)*ny<0){nx=-nx;ny=-ny}const s=0.32;ctx.moveTo(q.x+nx*s,q.y+ny*s);ctx.lineTo(q.x+nx*s+p.tx*s,q.y+ny*s+p.ty*s);ctx.lineTo(q.x+p.tx*s,q.y+p.ty*s);ctx.moveTo(q.x+nx*s*2.2,q.y+ny*s*2.2);ctx.lineTo(q.x,q.y);ctx.lineTo(q.x+p.tx*s*2.2,q.y+p.ty*s*2.2)}}
    else if(q.type==="free"){const s=0.28;ctx.moveTo(q.x-s,q.y);ctx.lineTo(q.x+s,q.y);ctx.moveTo(q.x,q.y-s);ctx.lineTo(q.x,q.y+s)}else ctx.arc(q.x,q.y,q.port?0.16:q.type==="node"?0.3:0.18,0,Math.PI*2);ctx.stroke()}
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
  drawTrace();drawPreview();
  if(flash){const age=(performance.now()-flash.t)/1000;if(age>2.4)flash=null;else{ctx.strokeStyle=colors.accent;ctx.globalAlpha=Math.max(0,1-age/2.4);ctx.lineWidth=3/z;ctx.beginPath();ctx.arc(flash.x,flash.y,0.8+age*1.2,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1}}
  drawLabels();drawCursorLabel()}
