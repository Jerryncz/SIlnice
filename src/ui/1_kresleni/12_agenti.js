// Auta a chodci: poloha podle stavu, kreslení, blinkry.

function drawCarAt(x,y,ang,color,truck,cargo){const l=truck?0.62:0.4,w=truck?0.24:0.2;ctx.save();ctx.translate(x,y);ctx.rotate(ang);ctx.fillStyle=color;ctx.fillRect(-l/2,-w/2,l,w);
  if(truck&&cargo){ctx.fillStyle=GOODS[cargo].color;ctx.fillRect(-l/2+0.03,-w/2+0.03,l*0.6,w-0.06)}
  ctx.fillStyle="rgba(255,255,255,.7)";ctx.fillRect(l/2-l*0.22,-w/2,l*0.16,w);ctx.restore()}
const _p={};
const doorXY=b=>b&&b.drive?b.drive.door:b&&b.front!==undefined?[wxOf(b.front),wyOf(b.front)]:null;
function carPose(c){
  // předjíždění: posun do protisměru a zpět
  if(c.state==="overtake"&&c.ov){const e=S.edges[c.ov.e];if(!e||e.dead)return null;const l=e.id*2+c.ov.dir,q=lanePose(S,l,c.lane,c.s);const d=c.ov.dir;
    const o1=laneOffset(e,d,c.lane),o2=-laneOffset(e,1-d,0),f=Math.sin(Math.PI*c.ov.t),off=(o2-o1)*f;const sg=d?-1:1;const p=pointAt(e.g,clamp(d?e.g.len-c.s:c.s,0,e.g.len));
    return {x:q.x+p.nx*off*sg,y:q.y+p.ny*off*sg,ang:q.ang-0.35*Math.cos(Math.PI*c.ov.t)*Math.sign(o2-o1)*(c.ov.t<0.98?1:0),lvl:lvlAt(S,e,q.u),L:edgeLayer(e)}}
  if((c.state==="enter"||c.state==="unpark")&&c.path){const q=pathPose(c.path,c.ps);return {x:q.x,y:q.y,ang:q.ang,lvl:0}}
  if(c.state==="exit"){const l=c.links[0],e=S.edges[l>>1];if(!e||e.dead)return null;const d=l&1;const u=d?e.g.len-c.s:c.s;const p=pointAt(e.g,clamp(u,0,e.g.len),_p);
    if(c.ux!==undefined)return {x:c.ux,y:c.uy,ang:c.uang!==undefined?c.uang:Math.atan2(p.y-c.uy,p.x-c.ux),lvl:0};
    return {x:p.x,y:p.y,ang:0,lvl:0}}
  const l=c.links[c.li],e=S.edges[l>>1];if(!e||e.dead)return null;const d=l&1;
  if(c.conn&&c.s<c.conn.s1){const cn=c.conn,t=clamp((c.s-cn.s0)/cn.len,0,1);const q=bez(cn,t);c._o=laneOffset(e,d,c.lane);return {x:q[0],y:q[1],ang:bezTan(cn,t),lvl:S.nodes[cn.node].lvl}}
  const u=clamp(d?e.g.len-c.s:c.s,0,e.g.len);const p=pointAt(e.g,u,_p);
  // boční posun do nového pruhu plynule
  const off0=laneOffset(e,d,c.lane);if(c._o===undefined||Math.abs(c._o-off0)>0.9)c._o=off0;else c._o+=(off0-c._o)*0.18;
  const off=c._o,sg=d?-1:1;const m=cornerShift(e,u,off*sg);return {x:p.x+p.nx*off*sg+m[0],y:p.y+p.ny*off*sg+m[1],ang:Math.atan2(p.ty*sg,p.tx*sg),lvl:lvlAt(S,e,u),L:edgeLayer(e)}}
// chodec na své cestě, kousek vpravo od osy chodníku (protijdoucí se míjejí)
function walkerPose(w){if(!w.path)return null;const q=pathPose(w.path,w.s);const o=w.state==="walk"?PED_KEEP:0;return [q.x-Math.sin(q.ang)*o,q.y+Math.cos(q.ang)*o]}
function drawVehicles(layer){if(cam.z<3)return;const blinkOn=((performance.now()/380)|0)%2===0;
  for(const c of S.cars){if(c.dead)continue;const q=carPose(c);if(!q)continue;const L=q.L!==undefined?q.L:q.lvl<0.5?0:q.lvl<1.5?1:2;if(L!==layer||!inView(q.x,q.y,1))continue;
    if(cam.z<6){ctx.fillStyle=c.trip&&c.trip.truck?"#3b4148":c.color;ctx.fillRect(q.x-0.2,q.y-0.2,0.4,0.4);continue}
    drawCarAt(q.x,q.y,q.ang,c.trip&&c.trip.truck?"#3b4148":c.color,c.trip&&c.trip.truck,c.trip&&c.trip.cargo)
    if(cam.z>=10&&c.state==="drive"&&blinkOn){let sg=0;if(c.conn)sg=c.conn.turn===2?-1:c.conn.turn;else if(c.lcT>0&&c.lcD)sg=c.lcD;
      else{const l=c.links[c.li],nl=c.links[c.li+1];if(nl!==undefined){const e=S.edges[l>>1];if(e&&e.g.len-c.s<3.5){const t=turnOf(S,l,nl);sg=t===2?-1:t}}}
      if(sg){const tr=c.trip&&c.trip.truck,l=tr?0.62:0.4,w=tr?0.24:0.2,ca=Math.cos(q.ang),sa=Math.sin(q.ang);ctx.fillStyle="#ff9d1c";
        for(const f of [l/2-0.04,-l/2+0.04]){ctx.beginPath();ctx.arc(q.x+ca*f-sa*sg*w/2,q.y+sa*f+ca*sg*w/2,0.055,0,Math.PI*2);ctx.fill()}}}}
  if(layer===0&&cam.z>=8){for(const w of S.walkers){if(w.dead)continue;const q=walkerPose(w);if(!q)continue;const [x,y]=q;if(!inView(x,y,1))continue;
    ctx.fillStyle=w.kid?"#e0752d":w.trip.purpose==="senior"?"#7a6aa8":"#3b4a5a";ctx.beginPath();ctx.arc(x,y,w.kid?0.06:0.075,0,Math.PI*2);ctx.fill()}}}
