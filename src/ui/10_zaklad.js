// Rozhraní: společný stav, kamera, barvy, terén. Soubory v src/ui sdílejí jeden obal (build.js).
const cv=document.getElementById("map"),ctx=cv.getContext("2d");
const $=id=>document.getElementById(id);
const TS0=24,tc=document.createElement("canvas"),tctx=tc.getContext("2d");tc.width=W*TS0;tc.height=H*TS0;
let S=createSim((Math.random()*1e9)|0);
const cam={x:0,y:0,z:10};let vw=0,vh=0,dpr=1,zmin=4;
let colors={},speed=1,overlay=false,zonePattern=null,flash=null;
const UI={tool:"line",kind:"road",lanes:1,level:0,hover:null,pinned:null,draw:null,plan:null,pending:null,mouse:{x:0,y:0,wx:0,wy:0,in:false},selDirty:true};

function readColors(){const cs=getComputedStyle(document.documentElement);
  for(const k of["land","forest","tree","water","water-edge","rock","rock-dot","ore","ore-dot","outside","road","road-edge","sidewalk","street","hwy","hwy-edge","median","mark","lane","bridge-edge","label","halo","good","warn","bad","accent","ink","panel","lot","lot-line","canopy","zone","sign","night"])colors[k]=cs.getPropertyValue("--"+k).trim();
  const p=document.createElement("canvas");p.width=p.height=8;const pc=p.getContext("2d");pc.strokeStyle=colors.zone;pc.globalAlpha=0.55;pc.lineWidth=1.4;
  pc.beginPath();pc.moveTo(0,8);pc.lineTo(8,0);pc.moveTo(-2,2);pc.lineTo(2,-2);pc.moveTo(6,10);pc.lineTo(10,6);pc.stroke();zonePattern=ctx.createPattern(p,"repeat");
  drawTerrainAll()}
function resize(){const r=cv.getBoundingClientRect();vw=r.width;vh=r.height;dpr=window.devicePixelRatio||1;cv.width=Math.round(vw*dpr);cv.height=Math.round(vh*dpr);
  zmin=Math.max(2,Math.min(vw/W,vh/H)*0.9);clampCam()}
function fit(){cam.z=Math.max(zmin,Math.min(vw/W,vh/H));cam.x=(W*cam.z-vw)/2;cam.y=(H*cam.z-vh)/2;
  if(vw<860){const t=[...S.towns].sort((a,b)=>b.pop-a.pop)[0];cam.z=Math.max(cam.z,vh*0.75/H);if(t){cam.x=t.cx*cam.z-vw/2;cam.y=t.cy*cam.z-vh/2}}clampCam()}
function clampCam(){cam.z=clamp(cam.z,zmin,64);const mw=W*cam.z,mh=H*cam.z;
  cam.x=mw<vw?(mw-vw)/2:clamp(cam.x,-vw*0.3,mw-vw*0.7);cam.y=mh<vh?(mh-vh)/2:clamp(cam.y,-vh*0.3,mh-vh*0.7)}
function zoomAt(sx,sy,f){const wx=(sx+cam.x)/cam.z,wy=(sy+cam.y)/cam.z;cam.z=clamp(cam.z*f,zmin,64);cam.x=wx*cam.z-sx;cam.y=wy*cam.z-sy;clampCam()}
function focusXY(x,y){cam.z=Math.max(cam.z,20);cam.x=x*cam.z-vw/2;cam.y=y*cam.z-vh/2;clampCam();flash={x,y,t:performance.now()};UI.pinned=hitTest(x,y);UI.selDirty=true}
const toWorld=(sx,sy)=>[(sx+cam.x)/cam.z,(sy+cam.y)/cam.z];
const fmt=n=>Math.round(n).toLocaleString("cs-CZ");
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const hhmm=h=>String(Math.floor(h)).padStart(2,"0")+":"+String(Math.floor((h%1)*60)).padStart(2,"0");
let toastT=0;function toast(msg){const el=$("toast");el.textContent=msg;el.hidden=false;clearTimeout(toastT);toastT=setTimeout(()=>el.hidden=true,2000)}

function hash(i,k){let h=(i*374761393+k*668265263)|0;h=(h^(h>>>13))*1274126177;return((h^(h>>>16))>>>0)/4294967296}
function drawTerrainTile(i){const c=tctx,T=TS0,x=tx(i)*T,y=ty(i)*T,t=S.terrain[i];
  c.fillStyle=t===WATER?colors.water:t===FOREST?colors.forest:t===ROCK?colors.rock:t===ORE?colors.ore:colors.land;c.fillRect(x,y,T,T);
  if(t===WATER){c.fillStyle=colors["water-edge"];for(let d=0;d<4;d++){const n=NB[i*4+d];if(n>=0&&S.terrain[n]!==WATER){if(d===0)c.fillRect(x+T-2,y,2,T);else if(d===1)c.fillRect(x,y,2,T);else if(d===2)c.fillRect(x,y+T-2,T,2);else c.fillRect(x,y,T,2)}}}
  else if(t===FOREST){c.fillStyle=colors.tree;for(let k=0;k<3;k++){c.beginPath();c.arc(x+T*(0.2+hash(i,k)*0.6),y+T*(0.2+hash(i,k+7)*0.6),T*(0.16+hash(i,k+3)*0.08),0,Math.PI*2);c.fill()}}
  else if(t===ROCK||t===ORE){c.fillStyle=t===ROCK?colors["rock-dot"]:colors["ore-dot"];for(let k=0;k<4;k++){const px=x+T*(0.15+hash(i,k)*0.7),py=y+T*(0.15+hash(i,k+9)*0.7);
    if(t===ROCK){c.beginPath();c.moveTo(px-3,py+2);c.lineTo(px,py-3);c.lineTo(px+3,py+2);c.closePath();c.fill()}else c.fillRect(px-1.8,py-1.8,3.6,3.6)}}}
function drawTerrainAll(){for(let i=0;i<N;i++)drawTerrainTile(i);S.dirty.length=0}

// co je pod kurzorem: uzel, úsek (vyšší úroveň má přednost), budova, nebo pole terénu
function hitTest(x,y){
  let best=null,bd=1e9,bl=-1;
  for(const e of edgesNear(S,x,y,2)){const r=nearestOn(e.g,x,y);const lv=lvlAt(S,e,r.u);if(r.d>e.w/2+0.15)continue;const score=r.d-lv*0.5;if(score<bd){bd=score;best=e;bl=lv}}
  for(const n of S.nodes){if(n.dead||(n.edges.length<3&&n.gate<0&&!n.keep))continue;const d=Math.hypot(n.x-x,n.y-y);let rmax=n.keep&&n.edges.length<3?0.17:0.4;if(n.edges.length>=3)rmax=Math.max(rmax,n.rad);
    if(d<rmax+0.05&&(!best||Math.abs(n.lvl-bl)<0.5))return {type:"node",id:n.id}}
  if(best)return {type:"edge",id:best.id};
  const c=cellAt(x,y);if(c<0)return null;if(S.bld[c])return {type:"bld",b:S.bld[c]};return {type:"cell",c}}
