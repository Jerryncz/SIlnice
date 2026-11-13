// Ovládání: nástroje, kreslení silnic s přichytáváním, posun a přiblížení mapy.

function local(e){const r=cv.getBoundingClientRect();return[e.clientX-r.left,e.clientY-r.top]}
// přichycení: nejdřív ve zvolené výšce, pak v ostatních (silnice ze země může stoupat na most)
function snapAny(x,y,pref){const order=[pref,0,1,2].filter((v,k,a)=>a.indexOf(v)===k);
  for(const l of order){const s=snapPoint(S,x,y,l);if(s.type!=="free")return s}return {type:"free",x:Math.floor(x)+0.5,y:Math.floor(y)+0.5,lvl:pref}}
function angleSnap(sx,sy,wx,wy,free){if(free)return [wx,wy];const dx=wx-sx,dy=wy-sy,L=Math.hypot(dx,dy);if(L<0.3)return [sx,sy];
  const a=Math.round(Math.atan2(dy,dx)/(Math.PI/4))*(Math.PI/4);const ux=Math.round(Math.cos(a)),uy=Math.round(Math.sin(a));
  const diag=ux!==0&&uy!==0;const k=Math.max(1,Math.round(diag?(dx*ux+dy*uy)/2:(dx*ux+dy*uy)));return [sx+ux*k,sy+uy*k]}
function endSnap(sx,sy,wx,wy,shift){const raw=snapAny(wx,wy,UI.level);if(raw.type!=="free"&&Math.hypot(raw.x-sx,raw.y-sy)>0.5)return raw;const [ex,ey]=angleSnap(sx,sy,wx,wy,shift);const s=snapAny(ex,ey,UI.level);
  if(s.type!=="free"&&Math.hypot(s.x-ex,s.y-ey)<0.6)return s;return {type:"free",x:shift?Math.floor(ex)+0.5:ex,y:shift?Math.floor(ey)+0.5:ey,lvl:UI.level}}
function laneSide(e,wx,wy,u){if(e.lf===0||e.lb===0)return undefined;const p=pointAt(e.g,u);return (wx-p.x)*p.nx+(wy-p.y)*p.ny>=0?0:1}
function dirName(e,dir){if(dir===undefined)return"";const p=pointAt(e.g,e.g.len/2);const hx=dir?-p.tx:p.tx,hy=dir?-p.ty:p.ty;return" (směr "+COMPASS(hx,hy)+")"}
function planLine(st,en){return planRoad(S,{pts:mkLine(st.x,st.y,en.x,en.y),kind:UI.kind,lanes:UI.lanes,start:st,end:en})}
function planCurve(st,cx,cy,en){return planRoad(S,{pts:mkBezier(st.x,st.y,cx,cy,en.x,en.y),kind:UI.kind,lanes:UI.lanes,start:st,end:en})}
function refreshPlan(){const d=UI.draw;if(!d)return;const m=UI.mouse;
  if(d.tool==="line"&&d.start){d.end=endSnap(d.start.x,d.start.y,m.wx,m.wy,m.shift);UI.plan=Math.hypot(d.end.x-d.start.x,d.end.y-d.start.y)>0.5?planLine(d.start,d.end):null}
  else if(d.tool==="curve"){if(d.stage===1){d.ghost=[d.start.x,d.start.y,Math.floor(m.wx)+0.5,Math.floor(m.wy)+0.5];UI.plan=null}
    else if(d.stage===2){const en=snapAny(m.wx,m.wy,UI.level);const e2=en.type==="free"?{type:"free",x:Math.floor(m.wx)+0.5,y:Math.floor(m.wy)+0.5,lvl:UI.level}:en;d.end=e2;
      d.ghost=[d.start.x,d.start.y,d.cx,d.cy,e2.x,e2.y];UI.plan=planCurve(d.start,d.cx,d.cy,e2)}}
  else if(d.tool==="round"){const r=Math.max(1.5,Math.round(Math.hypot(m.wx-d.cx,m.wy-d.cy)*2)/2);d.r=r;UI.plan=planRoundabout(S,d.cx,d.cy,r)}}
function finishBuild(plan,label){if(!plan)return;runPlan(plan,plan.round?commitRoundabout:commitRoad,label);if(!(plan.demolish&&plan.demolish.length&&plan.ok))UI.plan=null}
function kindLabel(){return RK[UI.kind].name+(UI.level?" ("+LEVEL_NAMES[UI.level].toLowerCase()+")":"")}
const ptrs=new Map();let pan=null,pinch=null,stroke=null,moved=false,downXY=null;
cv.addEventListener("pointerdown",e=>{cv.setPointerCapture(e.pointerId);const [sx,sy]=local(e);ptrs.set(e.pointerId,{x:sx,y:sy});
  if(!$("confirm").hidden){return}
  if(ptrs.size===2){stroke=null;pan=null;UI.laneDrag=null;if(UI.draw&&UI.draw.tool!=="curve"){UI.draw=null;UI.plan=null}const [a,b]=[...ptrs.values()];pinch={d:Math.hypot(a.x-b.x,a.y-b.y),cx:(a.x+b.x)/2,cy:(a.y+b.y)/2};return}
  if(ptrs.size>2)return;moved=false;downXY=[sx,sy];
  const [wx,wy]=toWorld(sx,sy);UI.mouse.wx=wx;UI.mouse.wy=wy;UI.mouse.shift=e.shiftKey;
  if(e.button===1||e.button===2||UI.tool==="hand"){pan={x:sx,y:sy,cx:cam.x,cy:cam.y,btn:e.button};return}
  const t=UI.tool;
  if(t==="line"){UI.draw={tool:"line",start:snapAny(wx,wy,UI.level)};refreshPlan()}
  else if(t==="curve"){if(!UI.draw||UI.draw.tool!=="curve"){UI.draw={tool:"curve",stage:0}}}
  else if(t==="round"){UI.draw={tool:"round",cx:Math.round(wx*2)/2,cy:Math.round(wy*2)/2};refreshPlan()}
  else if(t==="lane"){const h=hitTest(wx,wy);if(h&&h.type==="edge"){const ed=S.edges[h.id];const r=nearestOn(ed.g,wx,wy);UI.laneDrag={e:h.id,u0:r.u,u1:r.u,dir:laneSide(ed,wx,wy,r.u),rem:e.shiftKey}}else UI.laneDrag=null;UI.laneHover=null}
  else if(t==="erase"||t==="zone"){const h=hitTest(wx,wy);stroke={tool:t,mode:t==="erase"?(h&&h.type==="bld"?"bld":"road"):(S.zone[cellAt(wx,wy)]?"clear":"set"),spent:0,done:new Set()};applyStroke(wx,wy)}});
function applyStroke(wx,wy){const st=stroke;if(!st)return;
  if(st.tool==="zone"){const c=cellAt(wx,wy);if(c>=0&&!S.roadCnt[c])S.zone[c]=st.mode==="set"?1:0;return}
  const h=hitTest(wx,wy);if(!h)return;
  if(st.mode==="bld"&&h.type==="bld"){if(st.done.has(h.b))return;st.done.add(h.b);const r=demolishBuilding(S,h.b,false);if(r.ok)st.spent+=r.cost;else if(!st.warned){st.warned=true;toast(r.msg)}}
  else if(st.mode==="road"&&h.type==="edge"){if(st.done.has(h.id))return;st.done.add(h.id);const r=eraseEdge(S,S.edges[h.id]);if(!r.ok&&!st.warned){st.warned=true;toast(r.msg)}}}
cv.addEventListener("pointermove",e=>{const [sx,sy]=local(e);const p=ptrs.get(e.pointerId);if(p){if(downXY&&Math.hypot(downXY[0]-sx,downXY[1]-sy)>4)moved=true;p.x=sx;p.y=sy}
  UI.mouse.x=sx;UI.mouse.y=sy;UI.mouse.in=true;UI.mouse.shift=e.shiftKey;
  if(pinch&&ptrs.size===2){const [a,b]=[...ptrs.values()];const d=Math.hypot(a.x-b.x,a.y-b.y),cx=(a.x+b.x)/2,cy=(a.y+b.y)/2;cam.x-=cx-pinch.cx;cam.y-=cy-pinch.cy;zoomAt(cx,cy,d/Math.max(1,pinch.d));pinch={d,cx,cy};return}
  if(pan){cam.x=pan.cx-(sx-pan.x);cam.y=pan.cy-(sy-pan.y);clampCam();return}
  const [wx,wy]=toWorld(sx,sy);UI.mouse.wx=wx;UI.mouse.wy=wy;
  const h=hitTest(wx,wy);const key=h?h.type+(h.id!==undefined?h.id:h.b?h.b.id:h.c):"";if(key!==UI.hoverKey){UI.hoverKey=key;UI.hover=h;UI.selDirty=true}
  if(UI.draw)refreshPlan();
  if(UI.tool==="lane"){if(UI.laneDrag){const ed=S.edges[UI.laneDrag.e];if(ed&&!ed.dead)UI.laneDrag.u1=nearestOn(ed.g,wx,wy).u}
    else{UI.laneHover=null;if(h&&h.type==="edge"){const ed=S.edges[h.id];const r=nearestOn(ed.g,wx,wy);UI.laneHover={e:h.id,u0:0,u1:0,dir:laneSide(ed,wx,wy,r.u),rem:e.shiftKey}}}}
  if(UI.tool==="split"){UI.splitHover=null;if(h&&h.type==="edge"){const ed=S.edges[h.id];UI.splitHover={e:h.id,u:nearestOn(ed.g,wx,wy).u}}}
  if(stroke)applyStroke(wx,wy)});
function endPtr(e){const [sx,sy]=local(e);const had=ptrs.has(e.pointerId);ptrs.delete(e.pointerId);
  if(pinch){if(ptrs.size<2)pinch=null;return}
  if(!had)return;
  if(pan){const click=!moved;const btn=pan.btn;pan=null;
    if(click&&btn===2){if(UI.draw){UI.draw=null;UI.plan=null}else UI.pinned=null;UI.selDirty=true}
    else if(click&&UI.tool==="hand"){const [wx,wy]=toWorld(sx,sy);UI.pinned=hitTest(wx,wy);UI.selDirty=true}
    return}
  const [wx,wy]=toWorld(sx,sy);const t=UI.tool,d=UI.draw;
  if(stroke){if(stroke.spent)toast("Zbouráno za "+fmt(stroke.spent)+" Kč");stroke=null;return}
  if(t==="line"&&d&&d.tool==="line"){if(UI.plan)finishBuild(UI.plan,kindLabel());UI.draw=null;if(!UI.pending)UI.plan=null}
  else if(t==="round"&&d&&d.tool==="round"){if(UI.plan)finishBuild(UI.plan,"Kruhový objezd");UI.draw=null;if(!UI.pending)UI.plan=null}
  else if(t==="curve"&&d&&d.tool==="curve"){
    if(d.stage===0){d.start=snapAny(wx,wy,UI.level);d.stage=1;refreshPlan()}
    else if(d.stage===1){d.cx=Math.floor(wx)+0.5;d.cy=Math.floor(wy)+0.5;d.stage=2;refreshPlan()}
    else{refreshPlan();if(UI.plan)finishBuild(UI.plan,kindLabel()+" obloukem");UI.draw=null;if(!UI.pending)UI.plan=null}}
  else if(t==="lane"){const L=UI.laneDrag;UI.laneDrag=null;if(!L){if(!moved)toast("Klikni na silnici");UI.selDirty=true;return}const ed=S.edges[L.e];if(!ed||ed.dead)return;
    const rem=e.shiftKey||L.rem;const range=Math.abs(L.u1-L.u0)>=0.8?[L.u0,L.u1]:null;
    runPlan(planLanes(S,ed,rem?-1:1,L.dir,range),commitLanes,(rem?"Pruh ubrán":"Pruh přidán")+(range?" na kusu úseku":"")+dirName(ed,L.dir))}
  else if(!moved){const h=hitTest(wx,wy);
    if(t==="split"){if(h&&h.type==="node"&&S.nodes[h.id].keep){const r=unsplit(S,S.nodes[h.id]);toast(r.ok?r.msg:r.msg)}
      else if(h&&h.type==="edge"){const ed=S.edges[h.id];const r=splitAt(S,ed,nearestOn(ed.g,wx,wy).u);toast(r.ok?"Úsek rozdělen. Kus teď přestavíš zvlášť.":r.msg)}else toast("Klikni na silnici")}
    else if(t==="oneway"){if(h&&h.type==="edge"){const r=cycleOneway(S,S.edges[h.id]);toast(r.ok?r.state:r.msg)}else toast("Klikni na silnici")}
    else if(t==="junction"){if(h&&h.type==="node"){const n=S.nodes[h.id];let next=(n.ctl+1)%4;let pair=null;
        if(next===2){let best=null,bd=2;for(let i=0;i<n.arms.length;i++)for(let j=i+1;j<n.arms.length;j++){const a=n.arms[i],b=n.arms[j];const dt=a.hx*b.hx+a.hy*b.hy;if(dt<bd){bd=dt;best=[a.e,b.e]}}pair=best}
        const r=setControl(S,n,next,pair);toast(r.ok?["Automaticky","Přednost zprava","Hlavní silnice","Semafor"][next]:r.msg);UI.pinned=h}else toast("Klikni na křižovatku")}}
  UI.selDirty=true}
cv.addEventListener("pointerup",endPtr);cv.addEventListener("pointercancel",e=>{ptrs.delete(e.pointerId);pan=null;pinch=null;stroke=null;UI.laneDrag=null});
cv.addEventListener("pointerleave",()=>{UI.mouse.in=false;if(!stroke&&!pan){UI.hover=null;UI.hoverKey="";UI.selDirty=true}});
cv.addEventListener("contextmenu",e=>e.preventDefault());
cv.addEventListener("wheel",e=>{e.preventDefault();const [sx,sy]=local(e);zoomAt(sx,sy,Math.pow(1.0015,-e.deltaY));if(UI.draw)refreshPlan()},{passive:false});
function setTool(t){UI.tool=t;UI.draw=null;UI.plan=null;UI.laneDrag=null;UI.laneHover=null;UI.splitHover=null;document.querySelectorAll("[data-tool]").forEach(b=>b.setAttribute("aria-pressed",b.dataset.tool===t));cv.classList.toggle("pan",t==="hand");lastOptsKey="";updateOpts()}
function setSpeed(s){speed=s;document.querySelectorAll("[data-speed]").forEach(b=>b.setAttribute("aria-pressed",+b.dataset.speed===s))}
document.querySelectorAll("[data-tool]").forEach(b=>b.addEventListener("click",()=>setTool(b.dataset.tool)));
document.querySelectorAll("[data-speed]").forEach(b=>b.addEventListener("click",()=>setSpeed(+b.dataset.speed)));
$("ovl").addEventListener("click",()=>{overlay=!overlay;$("ovl").setAttribute("aria-pressed",overlay)});
$("newMap").addEventListener("click",()=>{S=createSim((Math.random()*1e9)|0);UI.pinned=null;UI.hover=null;UI.draw=null;UI.plan=null;hideConfirm();readColors();fit();lastLogLen=-1;lastProbKey="";updateUI()});
$("helpBtn").addEventListener("click",()=>{$("help").hidden=false});$("helpClose").addEventListener("click",()=>{$("help").hidden=true});
$("help").addEventListener("click",e=>{if(e.target.id==="help")$("help").hidden=true});
let prevSpeed=1;const keysDown=new Set();
window.addEventListener("keydown",e=>{if(e.target.closest&&e.target.closest("input,textarea"))return;
  const m={"1":"line","2":"curve","3":"round","4":"lane","5":"oneway","6":"junction","7":"erase","8":"zone","9":"hand"};
  if(m[e.key])setTool(m[e.key]);
  else if(e.key==="r"||e.key==="R")setTool("split");
  else if(e.key===" "){e.preventDefault();if(speed){prevSpeed=speed;setSpeed(0)}else setSpeed(prevSpeed||1)}
  else if(e.key==="v"||e.key==="V")$("ovl").click();
  else if(e.key==="q"||e.key==="Q"){UI.level=Math.max(0,UI.level-1);lastOptsKey="";updateOpts();refreshPlan()}
  else if(e.key==="e"||e.key==="E"){UI.level=Math.min(2,UI.level+1);lastOptsKey="";updateOpts();refreshPlan()}
  else if(e.key==="Escape"){if(!$("confirm").hidden)hideConfirm();else if(UI.draw){UI.draw=null;UI.plan=null}else UI.pinned=null;$("help").hidden=true;UI.selDirty=true}
  else if(e.key==="Shift"){UI.mouse.shift=true;if(UI.draw)refreshPlan()}
  else if(e.key.startsWith("Arrow")){e.preventDefault();keysDown.add(e.key)}
  else if(e.key==="+"||e.key==="=")zoomAt(vw/2,vh/2,1.2);else if(e.key==="-")zoomAt(vw/2,vh/2,1/1.2)});
window.addEventListener("keyup",e=>{keysDown.delete(e.key);if(e.key==="Shift"){UI.mouse.shift=false;if(UI.draw)refreshPlan()}});
