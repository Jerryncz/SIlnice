// Příjezdy k budovám a parkoviště (docs/PARKOVISTE.md).
//
// Každá budova má jeden příjezd: kus od okraje silnice k budově. Auto z pruhu zahne na příjezd a dál jede
// po cestě (c.path) – nikdy ne „skrz“ budovu nebo napříč parkovištěm.
//   - Budova s parkovištěm (buňky R_LOT u silnice): z obdélníku parkoviště se složí rozvržení z modulů
//     (uličky, stání, místo pro zásobování, zeleň). Vjezd je hrdlo příčné uličky; místo na silnici
//     naproti hrdlu je b.access. Auto jede: pruh → okraj silnice → hrdlo → příčná ulička → ulička → stání.
//   - Budova bez parkoviště: příjezd od okraje silnice ke dveřím (b.drive), auto u dveří zmizí.
// Cesty mají vpravo jízdu: na obousměrných uličkách se protijedoucí míjejí, za sebou jedoucí na sebe čekají.

const LOT_A=0.5,LOT_SW=0.27,LOT_RD=0.5;   // šířka uličky, šířka a hloubka stání (pole)
const LOT_KEEP=0.12;                       // odsazení jízdy vpravo od osy uličky

// obdélník parkoviště v buňkách; když buňky obdélník netvoří, ořízne se okraj s nejvíc dírami
function lotRect(S,b){const cells=b.tiles.filter(j=>S.role[j]===R_LOT);if(!cells.length)return null;const has=new Set(cells);
  let x0=1e9,x1=-1,y0=1e9,y1=-1;for(const j of cells){const x=tx(j),y=ty(j);x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y)}
  for(let g=0;g<60;g++){if(x1<x0||y1<y0)return null;const miss=[0,0,0,0];let tot=0;
    for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)if(!has.has(y*W+x)){tot++;if(x===x0)miss[0]++;if(x===x1)miss[1]++;if(y===y0)miss[2]++;if(y===y1)miss[3]++}
    if(!tot)break;const k=miss.indexOf(Math.max(...miss));if(k===0)x0++;else if(k===1)x1--;else if(k===2)y0++;else y1--}
  if(x1<x0||y1<y0)return null;return {x0,x1,y0,y1}}
// strany obdélníku: d = směr od silnice dovnitř, p = podél silnice, O = roh na straně silnice
function lotFrames(r){const X0=r.x0*CS,X1=(r.x1+1)*CS,Y0=r.y0*CS,Y1=(r.y1+1)*CS;
  return [{id:0,d:[0,1],p:[1,0],O:[X0,Y0],Wd:X1-X0,D:Y1-Y0},{id:1,d:[0,-1],p:[1,0],O:[X0,Y1],Wd:X1-X0,D:Y1-Y0},
          {id:2,d:[1,0],p:[0,1],O:[X0,Y0],Wd:Y1-Y0,D:X1-X0},{id:3,d:[-1,0],p:[0,1],O:[X1,Y0],Wd:Y1-Y0,D:X1-X0}]}
// převod souřadnic rámu parkoviště na mapu; f.F nese rám, aby šel stav uložit (03_stav.js)
const frameW=F=>{const f=(dep,lat)=>[F.O[0]+F.d[0]*dep+F.p[0]*lat,F.O[1]+F.d[1]*dep+F.p[1]*lat];f.F=F;return f};
// bod napojení na silnici pro hrdlo v bodě T (okraj pozemku), směr ven -d: {e,u,side,x,y,E} nebo null
function roadAt(S,T,d){const ox=T[0]-d[0]*0.25,oy=T[1]-d[1]*0.25;const c=cellAt(ox,oy);if(c<0||!S.cellG[c])return null;let best=null;
  for(const e of edgesNear(S,ox,oy,1)){if(e.dead||!RK[e.kind].front||e.ring||!isGroundEdge(S,e))continue;
    const r=nearestOn(e.g,T[0],T[1]);const ext=Math.max(e.er,e.el);if(r.d>ext+0.9)continue;
    // ne v ploše křižovatky; na rovném navázání úseků stačí kousek od konce
    const tr=edgeTrim(e),m0=tr[0]>0?tr[0]+0.3:0.06,m1=tr[1]>0?tr[1]+0.3:0.06;
    // slepý konec silnice před pozemkem: vjezd navazuje přímo na konec
    const dead=n=>S.nodes[n].edges.length===1&&S.nodes[n].gate<0;let u=r.u;
    if(u<m0){if(!dead(e.a)||m0>e.g.len-m1)continue;u=m0}else if(u>e.g.len-m1){if(!dead(e.b)||m0>e.g.len-m1)continue;u=e.g.len-m1}
    const p=pointAt(e.g,u);const vx=T[0]-p.x,vy=T[1]-p.y,vl=Math.hypot(vx,vy)||1;if((vx*d[0]+vy*d[1])/vl<0.55)continue;   // silnice je opravdu před pozemkem
    if(best&&r.d>=best.dist)continue;const side=(vx*p.nx+vy*p.ny)>=0?1:-1;const off=side>0?e.er:-e.el;
    const E=u!==r.u?[p.x+vx/vl*Math.min(vl,ext*0.8),p.y+vy/vl*Math.min(vl,ext*0.8)]:[p.x+p.nx*off,p.y+p.ny*off];
    best={e,u,side,x:p.x,y:p.y,E,dist:r.d}}
  return best}

// ---- rozvržení parkoviště (stavebnice) v místních souřadnicích: dep 0 = okraj u silnice, D = u budovy ----
function buildLot(S,b,F,xc){const A=LOT_A,SW=LOT_SW,W2=frameW(F),D=F.D,Wd=F.Wd;
  const spots=[],aisles=[],bays=[],green=[],trees=[];const pull=!isHome(b)&&lotBays(b.type);
  const spines=[xc];
  // intervaly napříč (lat) mimo pásy uliček
  const free=(sp)=>{const bands=sp.map(s=>[s-A/2-0.03,s+A/2+0.03]).sort((u,v)=>u[0]-v[0]);const out=[];let a=0.02;for(const q of bands){if(q[0]-a>0.2)out.push([a,q[0]]);a=Math.max(a,q[1])}if(Wd-0.02-a>0.2)out.push([a,Wd-0.02]);return out};
  const add=(o)=>{spots.push(Object.assign({truck:false},o))};
  let mods=0;const k=Math.floor((D+1e-6)/1.5),rem=D-k*1.5,single=rem>=1-1e-6;
  if(Wd<1.6||(!k&&!single)){ // úzký pozemek: ulička od silnice k budově, stání kolmo k ní po stranách
    aisles.push({a:[0,xc],b:[D-0.05,xc],w:A});mods=1;
    for(const iv of free(spines)){const w=iv[1]-iv[0];if(w<0.42)continue;const lat=iv[0]<xc?iv[1]-Math.min(w,LOT_RD)/2:iv[0]+Math.min(w,LOT_RD)/2;
      const n=Math.max(1,Math.floor((D-0.1)/SW)),pt=(D-0.1)/n,sg=lat>xc?1:-1;
      for(let i=0;i<n;i++){const dep=0.05+(i+0.5)*pt;add({dep,lat,ad:dep,al:xc,ang:Math.atan2(F.p[1]*sg,F.p[0]*sg),hw:pt/2,along:"p"})}}}
  else{const ais=[];let y=D;for(let i=0;i<k;i++){ais.push({y:y-0.75,dn:true});y-=1.5}if(single){ais.push({y:y-0.75,dn:false});y-=1}
    mods=ais.length;
    // druhá příčná ulička na opačném kraji, když je hrdlo u kraje, jsou aspoň dvě uličky a místo
    const atEdge=xc<A||xc>Wd-A,xr=xc<Wd/2?Wd-A/2:A/2;const two=atEdge&&ais.length>=2&&Wd>=2.4;if(two)spines.push(xr);
    const ivs=free(spines);let lo=Wd,hi=0;for(const iv of ivs){lo=Math.min(lo,iv[0]);hi=Math.max(hi,iv[1])}
    // místo pro zásobování: u budovy vedle hrdlové uličky
    let bay=null;if(pull){const iv=ivs.find(q=>q[0]>=xc)||ivs[ivs.length-1];const n0=Math.floor((iv[1]-iv[0])/SW);
      if(n0>=6){const near=iv[0]>=xc?iv[0]:iv[1]-3*(iv[1]-iv[0])/n0;bay={l0:near,l1:near+3*(iv[1]-iv[0])/n0}}}
    ais.forEach((q,i)=>{for(const up of [true,false]){if(!up&&!q.dn)continue;const rd=q.y+(up?0.5:-0.5),sg=up?1:-1;
        for(const iv of ivs){const n=Math.floor((iv[1]-iv[0])/SW);if(n<1)continue;const pt=(iv[1]-iv[0])/n;
          for(let jx=0;jx<n;jx++){const lat=iv[0]+(jx+0.5)*pt;if(bay&&i===0&&up&&lat>bay.l0&&lat<bay.l1)continue;
            add({dep:rd,lat,ad:q.y,al:lat,ang:Math.atan2(F.d[1]*sg,F.d[0]*sg),hw:pt/2,along:"d"})}}}
      aisles.push({a:[q.y,Math.max(0,Math.min(lo,...spines.map(v=>v-A/2)))],b:[q.y,Math.min(Wd,Math.max(hi,...spines.map(v=>v+A/2)))],w:A})});
    aisles.push({a:[0,xc],b:[Math.min(D,ais[0].y+A/2),xc],w:A});if(two)aisles.push({a:[ais[ais.length-1].y-A/2,xr],b:[Math.min(D,ais[0].y+A/2),xr],w:A});
    if(bay){const bl=(bay.l0+bay.l1)/2,bd=ais[0].y+0.5;bays.push({dep:bd,lat:bl,hd:0.25,hl:(bay.l1-bay.l0)/2});
      const sg=bl>xc?1:-1;add({dep:bd,lat:bl,ad:ais[0].y,al:bl-sg*0.3,ang:Math.atan2(F.p[1]*sg,F.p[0]*sg),hw:(bay.l1-bay.l0)/2,along:"p",truck:true})}
    // zbytek hloubky u silnice: zeleň (mimo hrdlovou uličku)
    if(y>0.25)for(const iv of free([xc])){green.push({d0:0.06,d1:y-0.06,l0:iv[0]+0.04,l1:iv[1]-0.04});for(let x=iv[0]+0.45;x<iv[1]-0.25;x+=1.1)trees.push(W2(y/2,x))}}
  if(!spots.length)return null;
  // nejdřív místa blízko vjezdu; místa pro zásobování na konec
  const cost=s=>s.ad+Math.abs(s.al-xc)*0.6;spots.sort((u,v)=>(u.truck-v.truck)||cost(u)-cost(v));
  for(const s of spots){const q=W2(s.dep,s.lat);s.x=q[0];s.y=q[1]}
  return {spots,aisles,bays,green,trees,F,W:W2,xc,D,Wd,mods,carSpots:spots.filter(q=>!q.truck).length,key:F.id+":"+xc.toFixed(2)}}

// ---- příjezd budovy: najde vjezd (u parkoviště hrdlo, jinak buňku u silnice) a nastaví b.access, b.front, b.drive ----
function refreshAccess(S,b){
  const old=b.access;b.access=null;b.drive=null;
  const R=lotRect(S,b);
  if(R){let best=null;
    for(const F of lotFrames(R)){if(F.D<1-1e-6)continue;const W2=frameW(F);
      // hrdlo u kraje (blíž ke středu silnice), nebo kde je silnice jen uprostřed
      const cands=[LOT_A/2,F.Wd-LOT_A/2];for(let l=0.25;l<F.Wd;l+=0.5)cands.push(l);
      for(let ci=0;ci<cands.length;ci++){const xc=cands[ci],T=W2(0,xc);const ra=roadAt(S,T,F.d);if(!ra)continue;
        const sc=ra.dist+(ci<2?0:0.6)+(old&&old.e===ra.e.id?0:0.05);if(!best||sc<best.sc)best={sc,F,xc,ra,T}}}
    if(best){const {F,xc,ra,T}=best;const key=F.id+":"+xc.toFixed(2);
      if(!b.lay||b.lay.key!==key||b.lotR!==R.x0+","+R.x1+","+R.y0+","+R.y1){const lay=buildLot(S,b,F,xc);setLay(S,b,lay);b.lotR=R.x0+","+R.x1+","+R.y0+","+R.y1}
      if(b.lay){b.access={e:ra.e.id,u:ra.u,side:ra.side,x:ra.x,y:ra.y};b.front=cellAt(T[0]+F.d[0]*0.25,T[1]+F.d[1]*0.25);
        const W2=b.lay.W;b.drive={E:ra.E,T,door:W2(b.lay.D,xc)};return}}}
  if(b.lay)setLay(S,b,null);
  // dům s příjezdem (buňky d): od silnice po příjezdu na stání (nebo do garáže g)
  const drv=b.tiles.filter(j=>S.role[j]===R_DRIVE);
  for(const j of drv)for(let dd=0;dd<4;dd++){const n=NB[j*4+dd];if(n<0)continue;const e=frontEdgeAt(S,n);if(!e)continue;
    const cx=wxOf(j),cy=wyOf(j);const r=nearestOn(e.g,cx,cy);if(r.d>Math.max(e.er,e.el)+0.8)continue;const tr=edgeTrim(e);if(r.u<tr[0]+0.2||r.u>e.g.len-tr[1]-0.2)continue;
    const p=pointAt(e.g,r.u);const side=((cx-p.x)*p.nx+(cy-p.y)*p.ny)>=0?1:-1;const off=side>0?e.er:-e.el;const E=[p.x+p.nx*off,p.y+p.ny*off];
    // řetěz buněk příjezdu směrem od silnice
    const ox=cx-wxOf(n),oy=cy-wyOf(n);const chain=[[cx,cy]];let c=j,end=null;
    for(let k=0;k<12;k++){const nx=cellAt(wxOf(c)+ox,wyOf(c)+oy);if(nx<0||S.bld[nx]!==b)break;const r2=S.role[nx];if(r2===R_DRIVE){chain.push([wxOf(nx),wyOf(nx)]);c=nx;continue}if(r2===R_GAR){end=[wxOf(nx),wyOf(nx)];chain.push(end)}break}
    const T=[cx-ox*0.5,cy-oy*0.5];
    // dveře: buňka domu nejblíž stání, na její hraně
    let door=null,bd=1e9;const st=chain[chain.length-1];for(const q of b.tiles){const r3=S.role[q];if(r3!==R_HOUSE&&r3!==R_FLAT)continue;const d=Math.hypot(wxOf(q)-st[0],wyOf(q)-st[1]);if(d<bd){bd=d;door=[wxOf(q)+(st[0]-wxOf(q))*0.45,wyOf(q)+(st[1]-wyOf(q))*0.45]}}
    b.front=j;b.access={e:e.id,u:r.u,side,x:p.x,y:p.y};b.drive={E,T,door:door||st,chain,stall:end?null:st,garage:!!end,ang:Math.atan2(oy,ox)};return}
  // budova bez parkoviště: buňka budovy u silnice, příjezd kolmo ke dveřím
  const order=[...b.tiles].sort((p,q)=>(q===b.front?1:0)-(p===b.front?1:0));
  for(const j of order)for(let dd=0;dd<4;dd++){const n=NB[j*4+dd];if(n<0)continue;const e=frontEdgeAt(S,n);if(!e)continue;
    const cx=wxOf(j),cy=wyOf(j);const r=nearestOn(e.g,cx,cy);if(r.d>Math.max(e.er,e.el)+0.8)continue;const u=clamp(r.u,0.06,e.g.len-0.06);const p=pointAt(e.g,u);
    const side=((cx-p.x)*p.nx+(cy-p.y)*p.ny)>=0?1:-1;const off=side>0?e.er:-e.el;const E=[p.x+p.nx*off,p.y+p.ny*off];
    // dveře na okraji buňky směrem k silnici
    const ox=wxOf(n)-cx,oy=wyOf(n)-cy;const door=[cx+ox*0.5,cy+oy*0.5];
    b.front=j;b.access={e:e.id,u,side,x:p.x,y:p.y};b.drive={E,T:door,door};return}}
// nové rozvržení: zaparkovaná a přijíždějící auta dostanou místa znovu (jiný tvar = jiné indexy)
function setLay(S,b,lay){const had=b.lay;b.lay=lay;
  if(b.cap0===undefined)b.cap0=b.cap;if(!isHome(b))b.cap=lay?lay.carSpots:b.cap0;
  b.spotUsed=lay?new Array(lay.spots.length).fill(null):null;
  if(!had)return;let nx=0;const take=()=>{if(!lay)return -1;while(nx<lay.spots.length&&(b.spotUsed[nx]||lay.spots[nx].truck))nx++;return nx<lay.spots.length?nx:-1};
  for(const pe of b.parked||[]){if(pe.spot===undefined)continue;const i=take();if(i<0)pe.spot=undefined;else{pe.spot=i;b.spotUsed[i]=pe}}
  for(const c of S.cars){if(c.dead||c.spotB!==b)continue;const i=take();if(i<0)c.spotB=null;else{c.spot=i;b.spotUsed[i]=c}}}
function lotLayout(S,b){return b&&!b.dead&&b.access?b.lay||null:null}

// ---- cesty po příjezdu a parkovišti ----
// cesta od okraje silnice na místo i (nebo k budově, když i<0)
function lotPath(S,b,i){const dr=b.drive;if(!dr)return null;const lay=b.lay;
  if(!lay)return dr.chain?[dr.E,dr.T,...dr.chain]:[dr.E,dr.door];const W2=lay.W,xc=lay.xc;
  if(i<0||i>=lay.spots.length)return [dr.E,dr.T,W2(lay.D-0.25,xc)];
  const s=lay.spots[i];return [dr.E,dr.T,W2(s.ad,xc),W2(s.ad,s.al),[s.x,s.y]]}
// jízda vpravo: vnitřní body cesty posunuté doprava od směru jízdy (první a poslední bod zůstanou)
function keepRight(pts,off){const n=pts.length;if(n<3)return pts;const out=[pts[0]];
  for(let i=1;i<n-1;i++){const a=pts[i-1],p=pts[i],c=pts[i+1];let l1=Math.hypot(p[0]-a[0],p[1]-a[1])||1,l2=Math.hypot(c[0]-p[0],c[1]-p[1])||1;
    const n1=[-(p[1]-a[1])/l1,(p[0]-a[0])/l1],n2=[-(c[1]-p[1])/l2,(c[0]-p[0])/l2];let mx=n1[0]+n2[0],my=n1[1]+n2[1];const ml=Math.hypot(mx,my);
    if(ml<1e-6){out.push(p);continue}mx/=ml;my/=ml;const k=off/Math.max(0.5,mx*n1[0]+my*n1[1]);out.push([p[0]+mx*k,p[1]+my*k])}
  out.push(pts[n-1]);return out}
// cesta auta při příjezdu: z pruhu [x,y] na místo / k budově; při odjezdu obráceně až na okraj silnice
function enterPath(S,b,i,from){const p=lotPath(S,b,i);if(!p)return null;return keepRight([from,...p],LOT_KEEP)}
function leavePath(S,b,i){const p=lotPath(S,b,i);if(!p)return null;const r=p.slice().reverse();
  // za okrajem silnice pomocný bod, aby i okraj (místo čekání) byl posunutý vpravo
  const z=r[r.length-1],y=r[r.length-2],l=Math.hypot(z[0]-y[0],z[1]-y[1])||1;r.push([z[0]+(z[0]-y[0])/l*0.3,z[1]+(z[1]-y[1])/l*0.3]);
  const q=keepRight(r,LOT_KEEP);q.pop();return q}
function pathLen(pts){let L=0;for(let k=1;k<pts.length;k++)L+=Math.hypot(pts[k][0]-pts[k-1][0],pts[k][1]-pts[k-1][1]);return L}
function pathPose(pts,s){for(let k=1;k<pts.length;k++){const a=pts[k-1],b=pts[k],l=Math.hypot(b[0]-a[0],b[1]-a[1]);if(s<=l||k===pts.length-1){const t=l?clamp(s/l,0,1):1;return {x:a[0]+(b[0]-a[0])*t,y:a[1]+(b[1]-a[1])*t,ang:Math.atan2(b[1]-a[1],b[0]-a[0])}}s-=l}
  const z=pts[pts.length-1];return {x:z[0],y:z[1],ang:0}}
// volné místo: nákladní auto jen místo pro zásobování, osobní jen běžné stání
function freeSpot(S,b,truck){const lay=lotLayout(S,b);if(!lay)return -1;for(let i=0;i<b.spotUsed.length;i++)if(!b.spotUsed[i]&&lay.spots[i].truck===!!truck)return i;return -1}
function releaseSpot(b,i,owner){if(b&&b.spotUsed&&i>=0&&i<b.spotUsed.length&&(!owner||b.spotUsed[i]===owner))b.spotUsed[i]=null}
// místa obsazená u bytovky: auta obyvatel, kteří jsou doma (jen vzhled, místa se nezamlouvají)
function homeCars(b){if(b.type!=="flat"||!b.lay)return 0;return Math.min(b.lay.carSpots,Math.round(Math.max(0,b.pop-b.away)/4))}

// ---- pohyb po příjezdu a parkovišti: za sebou jedoucí auta si drží odstup ----
function lotOwner(c){return c.state==="enter"?c.trip&&c.trip.to:c.trip&&c.trip.from}
function moveOnPath(S,c,dt,others){const ns=Math.min(c.plen,c.ps+dt*1.2);const q=pathPose(c.path,ns);const ca=Math.cos(q.ang),sa=Math.sin(q.ang);
  if((c.lotW||0)<3)for(const o of others){if(o===c||o.dead)continue;const po=pathPose(o.path,o.ps);const dx=po.x-q.x,dy=po.y-q.y;
    if(dx*dx+dy*dy>0.2)continue;const ah=dx*ca+dy*sa,lat=-dx*sa+dy*ca;if(ah>0&&ah<0.42&&Math.abs(lat)<0.16){c.lotW=(c.lotW||0)+dt;return}}
  c.lotW=0;c.ps=ns}
