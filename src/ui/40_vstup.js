// Ovládání: nástroje, stavění silnic (druh, tvar, výška) s přichytáváním, posun a přiblížení mapy.

function local(e){const r=cv.getBoundingClientRect();return[e.clientX-r.left,e.clientY-r.top]}
// přichycení: uzel, bod na silnici (ve zvolené výšce, pak v ostatních); volný bod na střed pole
function snapAny(x,y,pref,raw){const order=[pref,0,1,2].filter((v,k,a)=>a.indexOf(v)===k);
  if(UI.tool==="build"){for(const l of order){const p=snapPort(S,x,y,l);if(p)return p}}   // konec / začátek pruhu má přednost
  for(const l of order){const s=snapPoint(S,x,y,l);if(s.type!=="free")return s}return {type:"free",x:raw?x:Math.floor(x)+0.5,y:raw?y:Math.floor(y)+0.5,lvl:pref}}
// směr silnice v bodě přichycení (úhly se pak drží vůči ní, ne vůči mřížce)
function baseAngle(sn){if(sn.type==="edge"){const e=S.edges[sn.edge];const p=pointAt(e.g,sn.u);return Math.atan2(p.ty,p.tx)}
  if(sn.type==="node"){const n=S.nodes[sn.node];if(n.arms.length)return Math.atan2(n.arms[0].hy,n.arms[0].hx)}return null}
function angleSnap(st,wx,wy,free){const sx=st.x,sy=st.y;if(free)return [wx,wy];const dx=wx-sx,dy=wy-sy,L=Math.hypot(dx,dy);if(L<0.3)return [sx,sy];
  const base=baseAngle(st);
  if(base===null){const a=Math.round(Math.atan2(dy,dx)/(Math.PI/4))*(Math.PI/4);const ux=Math.round(Math.cos(a)),uy=Math.round(Math.sin(a));
    const diag=ux!==0&&uy!==0;const k=Math.max(1,Math.round(diag?(dx*ux+dy*uy)/2:(dx*ux+dy*uy)));return [sx+ux*k,sy+uy*k]}
  const a=base+Math.round((Math.atan2(dy,dx)-base)/(Math.PI/4))*(Math.PI/4);const len=Math.max(0.5,Math.round(L*2)/2);return [sx+Math.cos(a)*len,sy+Math.sin(a)*len]}
function endSnap(st,wx,wy,shift){const raw=snapAny(wx,wy,UI.level);if(raw.type!=="free"&&Math.hypot(raw.x-st.x,raw.y-st.y)>0.5)return raw;const [ex,ey]=angleSnap(st,wx,wy,shift);const s=snapAny(ex,ey,UI.level);
  if(s.type!=="free"&&Math.hypot(s.x-ex,s.y-ey)<0.6)return s;const g=baseAngle(st)===null&&!shift;return {type:"free",x:g?Math.floor(ex)+0.5:ex,y:g?Math.floor(ey)+0.5:ey,lvl:UI.level}}
function laneSide(e,wx,wy,u){if(e.lf===0||e.lb===0)return undefined;const p=pointAt(e.g,u);return (wx-p.x)*p.nx+(wy-p.y)*p.ny>=0?0:1}
function dirName(e,dir){if(dir===undefined)return"";const p=pointAt(e.g,e.g.len/2);const hx=dir?-p.tx:p.tx,hy=dir?-p.ty:p.ty;return" (směr "+COMPASS(hx,hy)+")"}
const spec=(pts,st,en)=>({pts,kind:UI.kind,lanes:UI.lanes,start:st,end:en,level:UI.level});
function planLine(st,en){return planRoad(S,spec(mkLine(st.x,st.y,en.x,en.y),st,en))}
function planCurve(st,cx,cy,en){return planRoad(S,spec(mkBezier(st.x,st.y,cx,cy,en.x,en.y),st,en))}
// směr, kterým z bodu napojení vyrazit: z boku silnice kolmo, z konce silnice jejím směrem
function tanFor(sn,ox,oy){const tx=ox-sn.x,ty=oy-sn.y,tl=Math.hypot(tx,ty)||1;
  if(sn.port)return sn.entry?[-sn.dir[0],-sn.dir[1]]:[sn.dir[0],sn.dir[1]];   // z pruhu ve směru jízdy, do pruhu ve směru jízdy
  const toward=(x,y)=>{const s=x*tx+y*ty>=0?1:-1;return [x*s,y*s]};
  if(sn.type==="edge"){const e=S.edges[sn.edge];const p=pointAt(e.g,sn.u);return toward(p.nx,p.ny)}
  if(sn.type==="node"){const n=S.nodes[sn.node];
    if(n.arms.length===1)return [-n.arms[0].hx,-n.arms[0].hy];
    if(n.arms.length===2){let x=n.arms[0].hx-n.arms[1].hx,y=n.arms[0].hy-n.arms[1].hy;const l=Math.hypot(x,y)||1;return toward(-y/l,x/l)}}
  return [tx/tl,ty/tl]}
function planConnect(st,en){const d=Math.hypot(en.x-st.x,en.y-st.y);if(d<0.8)return null;const k=Math.max(0.6,d*0.42);
  const a=tanFor(st,en.x,en.y),b=tanFor(en,st.x,st.y);
  return planRoad(S,spec(mkCubic(st.x,st.y,st.x+a[0]*k,st.y+a[1]*k,en.x+b[0]*k,en.y+b[1]*k,en.x,en.y),st,en))}
function refreshPlan(){const d=UI.draw;if(!d)return;const m=UI.mouse;
  if(d.tool==="line"&&d.start){d.end=endSnap(d.start,m.wx,m.wy,m.shift);UI.plan=Math.hypot(d.end.x-d.start.x,d.end.y-d.start.y)>0.5?planLine(d.start,d.end):null}
  else if(d.tool==="curve"){if(d.stage===1){d.ghost=[d.start.x,d.start.y,Math.floor(m.wx)+0.5,Math.floor(m.wy)+0.5];UI.plan=null}
    else if(d.stage===2){const en=snapAny(m.wx,m.wy,UI.level,m.shift);d.end=en;d.ghost=[d.start.x,d.start.y,d.cx,d.cy,en.x,en.y];UI.plan=planCurve(d.start,d.cx,d.cy,en)}}
  else if(d.tool==="connect"&&d.stage===1){const en=snapAny(m.wx,m.wy,UI.level,m.shift);d.end=en;UI.plan=planConnect(d.start,en)}
  else if(d.tool==="branch"&&d.start){const en=snapAny(m.wx,m.wy,UI.level,m.shift);d.end=en;UI.plan=planBranch(S,d.start,en,UI.kind,UI.lanes)}
  else if(d.tool==="round"){const r=Math.max(1.5,Math.round(Math.hypot(m.wx-d.cx,m.wy-d.cy)*2)/2);d.r=r;UI.plan=planRoundabout(S,d.cx,d.cy,r,UI.kind,UI.lanes)}}
function finishBuild(plan,label){if(!plan)return;runPlan(plan,plan.template?commitTemplate:plan.branch?commitBranch:plan.round?commitRoundabout:commitRoad,label);if(!(plan.demolish&&plan.demolish.length&&plan.ok))UI.plan=null}
function kindLabel(){return RK[UI.kind].name+(UI.level?" ("+LEVEL_NAMES[UI.level].toLowerCase()+")":"")}
const ptrs=new Map();let pan=null,pinch=null,stroke=null,moved=false,downXY=null;
cv.addEventListener("pointerdown",e=>{cv.setPointerCapture(e.pointerId);const [sx,sy]=local(e);ptrs.set(e.pointerId,{x:sx,y:sy});
  if(!$("confirm").hidden){return}
  if(ptrs.size===2){stroke=null;pan=null;UI.laneDrag=null;if(UI.draw&&UI.draw.tool!=="curve"&&UI.draw.tool!=="connect"){UI.draw=null;UI.plan=null}const [a,b]=[...ptrs.values()];pinch={d:Math.hypot(a.x-b.x,a.y-b.y),cx:(a.x+b.x)/2,cy:(a.y+b.y)/2};return}
  if(ptrs.size>2)return;moved=false;downXY=[sx,sy];
  const [wx,wy]=toWorld(sx,sy);UI.mouse.wx=wx;UI.mouse.wy=wy;UI.mouse.shift=e.shiftKey;
  if(e.button===1||e.button===2||UI.tool==="hand"){pan={x:sx,y:sy,cx:cam.x,cy:cam.y,btn:e.button};return}
  const t=UI.tool;
  if(t==="build"&&!UI.rebuild){const sh=UI.shape;
    if(sh==="line"){UI.draw={tool:"line",start:snapAny(wx,wy,UI.level,e.shiftKey)};refreshPlan()}
    else if(sh==="curve"){if(!UI.draw||UI.draw.tool!=="curve")UI.draw={tool:"curve",stage:0}}
    else if(sh==="connect"){if(!UI.draw||UI.draw.tool!=="connect")UI.draw={tool:"connect",stage:0}}
    else if(sh==="round"){UI.draw={tool:"round",cx:Math.round(wx*2)/2,cy:Math.round(wy*2)/2};refreshPlan()}
    else if(sh==="branch"){const s=snapAny(wx,wy,UI.level);UI.draw={tool:"branch",start:s.type==="edge"?s:null};if(!UI.draw.start){toast("Odbočka začíná na silnici mimo křižovatku");UI.draw=null}else refreshPlan()}}
  else if(t==="lane"){const h=hitTest(wx,wy);if(h&&h.type==="edge"){const ed=S.edges[h.id];const r=nearestOn(ed.g,wx,wy);UI.laneDrag={e:h.id,u0:r.u,u1:r.u,dir:laneSide(ed,wx,wy,r.u),rem:e.shiftKey}}else UI.laneDrag=null;UI.laneHover=null}
  else if(t==="erase"||t==="zone"){const h=hitTest(wx,wy);stroke={tool:t,mode:t==="erase"?(h&&h.type==="bld"?"bld":"road"):(S.zone[cellAt(wx,wy)]?"clear":"set"),spent:0,done:new Set()};applyStroke(wx,wy)}});
function applyStroke(wx,wy){const st=stroke;if(!st)return;
  // uzávěra po celých polích (2 × 2 buňky)
  if(st.tool==="zone"){const ux=Math.floor(wx),uy=Math.floor(wy);if(ux<0||uy<0||ux>=MW||uy>=MH)return;const c=unitCell(ux,uy);for(const j of [c,c+1,c+W,c+W+1])if(!S.roadCnt[j])S.zone[j]=st.mode==="set"?1:0;return}
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
  if(UI.tool==="build"&&!UI.rebuild&&UI.shape==="template"&&!UI.pending){const k=Math.round(wx*4)+","+Math.round(wy*4);if(k!==UI.tplKey){UI.tplKey=k;UI.plan=planTemplate(S,UI.tpl,wx,wy,UI.kind,UI.lanes)}}
  UI.snapHint=UI.tool==="build"&&!UI.rebuild&&UI.shape!=="template"?(UI.draw&&UI.draw.end?UI.draw.end:snapAny(wx,wy,UI.level)):null;
  if(UI.tool==="lane"){if(UI.laneDrag){const ed=S.edges[UI.laneDrag.e];if(ed&&!ed.dead)UI.laneDrag.u1=nearestOn(ed.g,wx,wy).u}
    else{UI.laneHover=null;if(h&&h.type==="edge"){const ed=S.edges[h.id];const r=nearestOn(ed.g,wx,wy);UI.laneHover={e:h.id,u0:0,u1:0,dir:laneSide(ed,wx,wy,r.u),rem:e.shiftKey}}}}
  if(UI.tool==="split"||UI.tool==="cross"){UI.splitHover=null;if(h&&h.type==="edge"){const ed=S.edges[h.id];UI.splitHover={e:h.id,u:nearestOn(ed.g,wx,wy).u}}}
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
  if(t==="build"&&UI.rebuild){if(moved)return;const h=hitTest(wx,wy);
    if(h&&h.type==="edge")runPlan(planKind(S,S.edges[h.id],UI.kind,UI.lanes),commitKind,"Přestavěno na "+RK[UI.kind].name.toLowerCase());else toast("Klikni na silnici, kterou chceš přestavět");UI.selDirty=true;return}
  if(t==="build"&&!UI.rebuild&&UI.shape==="template"&&!moved){const P=planTemplate(S,UI.tpl,wx,wy,UI.kind,UI.lanes);if(P.ok)finishBuild(P,"Křižovatka "+P.name.toLowerCase());else toast(P.msg);UI.selDirty=true;return}
  if(t==="build"&&d){
    if(d.tool==="line"){if(UI.plan)finishBuild(UI.plan,kindLabel());UI.draw=null;if(!UI.pending)UI.plan=null}
    else if(d.tool==="round"){if(UI.plan)finishBuild(UI.plan,"Kruhový objezd");UI.draw=null;if(!UI.pending)UI.plan=null}
    else if(d.tool==="branch"){if(UI.plan)finishBuild(UI.plan,UI.plan.exit?"Odbočka":"Nájezd");UI.draw=null;if(!UI.pending)UI.plan=null}
    else if(d.tool==="curve"){
      if(d.stage===0){d.start=snapAny(wx,wy,UI.level,e.shiftKey);d.stage=1;refreshPlan()}
      else if(d.stage===1){d.cx=Math.floor(wx)+0.5;d.cy=Math.floor(wy)+0.5;d.stage=2;refreshPlan()}
      else{refreshPlan();if(UI.plan)finishBuild(UI.plan,kindLabel()+" obloukem");UI.draw=null;if(!UI.pending)UI.plan=null}}
    else if(d.tool==="connect"){
      if(d.stage===0){d.start=snapAny(wx,wy,UI.level,e.shiftKey);d.stage=1;refreshPlan()}
      else{refreshPlan();if(UI.plan)finishBuild(UI.plan,kindLabel()+" napojena");else toast("Druhý bod je moc blízko");UI.draw=null;if(!UI.pending)UI.plan=null}}
    UI.selDirty=true;return}
  if(t==="lane"){const L=UI.laneDrag;UI.laneDrag=null;if(!L){if(!moved)toast("Klikni na silnici");UI.selDirty=true;return}const ed=S.edges[L.e];if(!ed||ed.dead)return;
    const rem=e.shiftKey||L.rem;const range=Math.abs(L.u1-L.u0)>=0.8?[L.u0,L.u1]:null;
    runPlan(planLanes(S,ed,rem?-1:1,L.dir,range),commitLanes,(rem?"Pruh ubrán":"Pruh přidán")+(range?" na kusu úseku":"")+dirName(ed,L.dir));return}
  if(moved){UI.selDirty=true;return}
  const h=hitTest(wx,wy);
  if(t==="split"){if(h&&h.type==="node"&&S.nodes[h.id].keep){const r=unsplit(S,S.nodes[h.id]);toast(r.msg)}
    else if(h&&h.type==="edge"){const ed=S.edges[h.id];const r=splitAt(S,ed,nearestOn(ed.g,wx,wy).u);toast(r.ok?"Úsek rozdělen. Kus teď přestavíš zvlášť.":r.msg)}else toast("Klikni na silnici")}
  else if(t==="cross"){if(h&&h.type==="edge"){const ed=S.edges[h.id];const u=nearestOn(ed.g,wx,wy).u;const tr=edgeTrim(ed);
      let r;if(u<tr[0]+0.6&&S.nodes[ed.a].edges.length>=3)r=toggleCross(S,S.nodes[ed.a],ed);else if(ed.g.len-u<tr[1]+0.6&&S.nodes[ed.b].edges.length>=3)r=toggleCross(S,S.nodes[ed.b],ed);else r=toggleMidCross(S,ed,u);
      toast(r.ok?(r.on?"Přechod přidán":"Přechod zrušen"):r.msg)}else toast("Klikni na silnici: u křižovatky přepneš přechod, jinde ho přidáš")}
  else if(t==="arrow"){if(h&&h.type==="edge"){const ed=S.edges[h.id];const r=nearestOn(ed.g,wx,wy),p=pointAt(ed.g,r.u);const d=r.u>ed.g.len/2?0:1;
      const L=d?ed.lb:ed.lf;if(!L)toast("Tímhle směrem se tu ke křižovatce nejede.");else{const off=((wx-p.x)*p.nx+(wy-p.y)*p.ny)*(d?-1:1);let k=0;for(let i=1;i<L;i++)if(Math.abs(laneOffset(ed,d,i)-off)<Math.abs(laneOffset(ed,d,k)-off))k=i;
        const q=cycleArrow(S,ed,d,k);toast(q.ok?q.state:q.msg)}}else toast("Klikni na pruh před křižovatkou")}
  else if(t==="junction"){if(h&&h.type==="node"){const n=S.nodes[h.id];let next=(n.ctl+1)%4;let pair=null;
      if(next===2){let best=null,bd=2;for(let i=0;i<n.arms.length;i++)for(let j=i+1;j<n.arms.length;j++){const a=n.arms[i],b=n.arms[j];const dt=a.hx*b.hx+a.hy*b.hy;if(dt<bd){bd=dt;best=[a.e,b.e]}}pair=best}
      const r=setControl(S,n,next,pair);toast(r.ok?["Automaticky","Přednost zprava","Hlavní silnice","Semafor"][next]:r.msg);UI.pinned=h}else toast("Klikni na křižovatku")}
  UI.selDirty=true}
cv.addEventListener("pointerup",endPtr);cv.addEventListener("pointercancel",e=>{ptrs.delete(e.pointerId);pan=null;pinch=null;stroke=null;UI.laneDrag=null});
cv.addEventListener("pointerleave",()=>{UI.mouse.in=false;UI.snapHint=null;if(!stroke&&!pan){UI.hover=null;UI.hoverKey="";UI.selDirty=true}});
cv.addEventListener("contextmenu",e=>e.preventDefault());
cv.addEventListener("wheel",e=>{e.preventDefault();const [sx,sy]=local(e);zoomAt(sx,sy,Math.pow(1.0015,-e.deltaY));if(UI.draw)refreshPlan()},{passive:false});
function setTool(t){UI.tool=t;UI.draw=null;UI.plan=null;UI.laneDrag=null;UI.laneHover=null;UI.splitHover=null;UI.snapHint=null;document.querySelectorAll("[data-tool]").forEach(b=>b.setAttribute("aria-pressed",b.dataset.tool===t));cv.classList.toggle("pan",t==="hand");lastOptsKey="";updateOpts()}
function setShape(sh){UI.shape=sh;if(UI.tool!=="build")setTool("build");UI.draw=null;UI.plan=null;UI.tplKey="";lastOptsKey="";updateOpts()}
function setSpeed(s){speed=s;document.querySelectorAll("[data-speed]").forEach(b=>b.setAttribute("aria-pressed",+b.dataset.speed===s))}
document.querySelectorAll("[data-tool]").forEach(b=>b.addEventListener("click",()=>setTool(b.dataset.tool)));
document.querySelectorAll("[data-speed]").forEach(b=>b.addEventListener("click",()=>setSpeed(+b.dataset.speed)));
$("ovl").addEventListener("click",()=>{overlay=!overlay;$("ovl").setAttribute("aria-pressed",overlay)});
// nastavení: kdy to zaseknuté auto vzdá (pamatuje si prohlížeč)
let stuckPref=40;try{const v=localStorage.getItem("osady.stuck");if(v!==null&&!isNaN(+v))stuckPref=+v}catch(err){}
function applySettings(){S.cfg.stuck=stuckPref;document.querySelectorAll("[data-stuck]").forEach(b=>b.setAttribute("aria-pressed",+b.dataset.stuck===stuckPref))}
document.querySelectorAll("[data-stuck]").forEach(b=>b.addEventListener("click",()=>{stuckPref=+b.dataset.stuck;try{localStorage.setItem("osady.stuck",String(stuckPref))}catch(err){}applySettings()}));
document.querySelectorAll("[data-money]").forEach(b=>b.addEventListener("click",()=>{S.money+=+b.dataset.money;addLog(S,"Test: přidáno "+fmt(+b.dataset.money)+" Kč",-1);toast("Přidáno "+fmt(+b.dataset.money)+" Kč");updateUI()}));
$("newMap").addEventListener("click",()=>{S=createSim((Math.random()*1e9)|0);applySettings();UI.pinned=null;UI.hover=null;UI.draw=null;UI.plan=null;hideConfirm();readColors();fit();lastLogLen=-1;lastProbKey="";updateUI()});
$("helpBtn").addEventListener("click",()=>{$("help").hidden=false});$("helpClose").addEventListener("click",()=>{$("help").hidden=true});
$("help").addEventListener("click",e=>{if(e.target.id==="help")$("help").hidden=true});
let prevSpeed=1;const keysDown=new Set();
window.addEventListener("keydown",e=>{if(e.target.closest&&e.target.closest("input,textarea"))return;
  const m={"1":"build","2":"lane","3":"junction","4":"cross","5":"split","6":"erase","7":"zone","8":"hand","9":"arrow"};const shp={a:"line",s:"curve",d:"round",f:"connect",g:"branch",h:"template"};
  const k=e.key.toLowerCase();
  if(m[e.key])setTool(m[e.key]);
  else if(shp[k]&&!e.ctrlKey&&!e.metaKey)setShape(shp[k]);
  else if(e.key===" "){e.preventDefault();if(speed){prevSpeed=speed;setSpeed(0)}else setSpeed(prevSpeed||1)}
  else if(k==="v")$("ovl").click();
  else if(k==="q"){UI.level=Math.max(0,UI.level-1);lastOptsKey="";updateOpts();refreshPlan()}
  else if(k==="e"){UI.level=Math.min(2,UI.level+1);lastOptsKey="";updateOpts();refreshPlan()}
  else if(e.key==="Escape"){if(!$("confirm").hidden)hideConfirm();else if(UI.draw){UI.draw=null;UI.plan=null}else UI.pinned=null;$("help").hidden=true;UI.selDirty=true}
  else if(e.key==="Shift"){UI.mouse.shift=true;if(UI.draw)refreshPlan()}
  else if(e.key.startsWith("Arrow")){e.preventDefault();keysDown.add(e.key)}
  else if(e.key==="+"||e.key==="=")zoomAt(vw/2,vh/2,1.2);else if(e.key==="-")zoomAt(vw/2,vh/2,1/1.2)});
window.addEventListener("keyup",e=>{keysDown.delete(e.key);if(e.key==="Shift"){UI.mouse.shift=false;if(UI.draw)refreshPlan()}});
