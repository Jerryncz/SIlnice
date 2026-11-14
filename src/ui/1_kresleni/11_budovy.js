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
// příjezdy: pás od okraje silnice k hrdlu parkoviště nebo ke dveřím (stejná geometrie, po které auta jezdí)
function drawDriveways(vis){ctx.lineCap="butt";ctx.strokeStyle=colors.lot;
  for(const b of vis){const dr=b.drive;if(!dr||!b.access)continue;const w=b.lay?LOT_A:isHome(b)?0.24:0.42;ctx.lineWidth=w;
    const dx=dr.T[0]-dr.E[0],dy=dr.T[1]-dr.E[1],l=Math.hypot(dx,dy)||1;ctx.beginPath();ctx.moveTo(dr.E[0]-dx/l*0.12,dr.E[1]-dy/l*0.12);ctx.lineTo(dr.T[0]+dx/l*0.02,dr.T[1]+dy/l*0.02);ctx.stroke()}
  ctx.lineCap="round"}
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
      else if(r===R_LOT){if(!b.lay){ctx.fillStyle="#bcd3a6";ctx.fillRect(...mergedRect(j,b,0.04))}}
      else if(r===R_GARDEN){const x=tx(j)*CS,y=ty(j)*CS;ctx.fillStyle="#c9dcb2";ctx.fillRect(x+0.02,y+0.02,CS-0.04,CS-0.04);
        if(z>=8&&((tx(j)*7+ty(j)*13)%5===0)){ctx.fillStyle="#86ad6e";ctx.beginPath();ctx.arc(x+0.25,y+0.25,0.14,0,Math.PI*2);ctx.fill()}}
      else if(r===R_DRIVE){const x=tx(j)*CS,y=ty(j)*CS;ctx.fillStyle=colors.lot;ctx.fillRect(x+0.1,y,CS-0.2,CS)}
      else{const q=mergedRect(j,b,0.04);ctx.fillStyle=r===R_YARD?(b.type==="school"?"rgba(201,149,42,.28)":shade(K.color,1.9).replace(/rgb\((\d+),(\d+),(\d+)\)/,(m,a,b2,c)=>`rgba(${a},${b2},${c},.55)`)):colors.lot;ctx.fillRect(...q);
        const x=tx(j)*CS,y=ty(j)*CS;
        if(r===R_YARD&&AMEN_YARD[b.type]){AMEN_YARD[b.type](j,b,q,x,y,z)}
        if(r===R_FORE){ctx.fillStyle=colors.canopy;ctx.globalAlpha=0.75;ctx.fillRect(x+0.04,y+0.04,0.42,0.42);ctx.globalAlpha=1;if((tx(j)+ty(j))%2===0){ctx.fillStyle=KIND.gas.color;ctx.fillRect(x+0.2,y+0.12,0.1,0.26)}}
        if(r===R_YARD&&K.out&&z>=10&&j===b.tiles.find(t=>S.role[t]===R_YARD)){const n=Math.min(4,Math.ceil(b.out/2));ctx.fillStyle=GOODS[K.out].color;for(let s=0;s<n;s++)ctx.fillRect(x+0.08+s*0.18,y+0.15,0.13,0.28)}}}
    if(b.type==="flat"&&b.access){const fx=wxOf(b.front),fy=wyOf(b.front);const dx=b.access.x-fx,dy=b.access.y-fy,l=Math.hypot(dx,dy)||1;
      ctx.fillStyle="rgba(10,12,10,.85)";ctx.save();ctx.translate(fx+dx/l*0.16,fy+dy/l*0.16);ctx.rotate(Math.atan2(dy,dx));ctx.fillRect(-0.08,-0.17,0.16,0.34);ctx.restore()}
    if(b.lay)drawLot(b);
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
// zaparkovaná auta na svých místech; u bytovek auta obyvatel, kteří jsou doma
function drawParked(x0,y0,x1,y1){if(cam.z<6)return;for(const b of S.buildings){const x=tx(b.front),y=ty(b.front);if(x<x0-6||x>x1+6||y<y0-6||y>y1+6)continue;
  // auto obyvatel na stání u domu, když je někdo doma
  if(b.drive&&b.drive.stall&&isHome(b)&&b.pop-b.away>0.5){const st=b.drive.stall;drawCarAt(st[0],st[1],b.drive.ang,shade(b.town?b.town.color:"#888888",0.7),false,null)}
  const lay=lotLayout(S,b);if(!lay)continue;
  if(b.type==="flat"){const n=homeCars(b);const col=b.town?b.town.color:"#888";for(let k=0;k<n;k++){const s=lay.spots[k];drawCarAt(s.x,s.y,s.ang,shade(col,0.75+((k*37)%5)*0.1),false,null)}continue}
  for(const pe of b.parked){if(pe.spot===undefined)continue;const s=lay.spots[pe.spot];if(s)drawCarAt(s.x,s.y,s.ang,pe.color,false,null)}}}
// ulička parkoviště: páteř od vjezdu a uličky mezi řadami míst
// parkoviště podle rozvržení: zeleň, uličky, stání s čarami, místo pro zásobování, stromy
function drawLot(b){const lay=b.lay;if(!lay||!b.access)return;const W=lay.W;let a,z;const line=(d0,l0,d1,l1)=>{a=W(d0,l0);z=W(d1,l1);ctx.moveTo(a[0],a[1]);ctx.lineTo(z[0],z[1])};
  const rect=(d0,l0,d1,l1)=>{const q=[W(d0,l0),W(d0,l1),W(d1,l1),W(d1,l0)];ctx.beginPath();q.forEach((v,i)=>i?ctx.lineTo(v[0],v[1]):ctx.moveTo(v[0],v[1]));ctx.closePath()};
  ctx.fillStyle="#bcd3a6";rect(0,0,lay.D,lay.Wd);ctx.fill();
  ctx.fillStyle=colors.lot;for(const s of lay.spots){if(s.along==="d")rect(s.dep-LOT_RD/2,s.lat-s.hw,s.dep+LOT_RD/2,s.lat+s.hw);else rect(s.dep-s.hw,s.lat-LOT_RD/2,s.dep+s.hw,s.lat+LOT_RD/2);ctx.fill()}
  ctx.strokeStyle=colors.lot;ctx.lineCap="butt";for(const q of lay.aisles){ctx.lineWidth=q.w;ctx.beginPath();line(q.a[0],q.a[1],q.b[0],q.b[1]);ctx.stroke()}
  ctx.lineCap="butt";
  for(const q of lay.bays){ctx.fillStyle="rgba(224,184,58,.45)";rect(q.dep-q.hd,q.lat-q.hl,q.dep+q.hd,q.lat+q.hl);ctx.fill();if(cam.z>=12){ctx.strokeStyle="#d8a92a";ctx.lineWidth=0.035;ctx.stroke();ctx.beginPath();for(let t=-q.hl+0.12;t<q.hl;t+=0.16)line(q.dep-q.hd,q.lat+t,q.dep+q.hd,q.lat+t+0.1);ctx.stroke()}}
  if(cam.z>=10){ctx.strokeStyle=colors["lot-line"];ctx.lineWidth=0.025;ctx.beginPath();for(const s of lay.spots){if(s.truck)continue;
      if(s.along==="d")for(const dl of [-s.hw,s.hw])line(s.dep-LOT_RD/2+0.02,s.lat+dl,s.dep+LOT_RD/2-0.02,s.lat+dl);else for(const dl of [-s.hw,s.hw])line(s.dep+dl,s.lat-LOT_RD/2+0.02,s.dep+dl,s.lat+LOT_RD/2-0.02)}ctx.stroke()}
  if(cam.z>=8){ctx.fillStyle="#6f9a5c";for(const t of lay.trees){ctx.beginPath();ctx.arc(t[0],t[1],0.16,0,Math.PI*2);ctx.fill()}}
  ctx.lineCap="round"}
