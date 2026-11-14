// Parkoviště: ulička (páteř od vjezdu a řady uliček) a jednotlivá místa. Auto zajede po uličce na volné
// místo a odjíždí zase po ní. Místa se přidělují (b.spotUsed), takže dvě auta nikdy nestojí na jednom.

const isParkRole=(b,r)=>r===R_LOT||r===R_GAR||(r===R_YARD&&KIND[b.type]&&KIND[b.type].industry);
// rozvržení parkoviště podle vjezdu: místa po buňkách, uličky mezi dvojicemi řad
function lotLayout(S,b){if(!b.access||b.dead)return null;const key=b.access.e+":"+b.access.u.toFixed(2);if(b._lk===key)return b.lay;b._lk=key;b.lay=null;
  const cells=b.tiles.filter(j=>isParkRole(b,S.role[j]));if(!cells.length)return null;
  const ax=b.access.x,ay=b.access.y;let dx=wxOf(b.front)-ax,dy=wyOf(b.front)-ay;
  const d=Math.abs(dx)>=Math.abs(dy)?[Math.sign(dx)||1,0]:[0,Math.sign(dy)||1],p=[-d[1],d[0]];
  const loc=cells.map(j=>{const cx=wxOf(j),cy=wyOf(j);return {j,x:cx,y:cy,dep:Math.round(((cx-ax)*d[0]+(cy-ay)*d[1])*2)/2,lat:Math.round(((cx-ax)*p[0]+(cy-ay)*p[1])*2)/2}});
  // Stavebnice (docs/PARKOVISTE.md): obdélník parkoviště se od budovy k silnici plní moduly
  //   dvouřadý = stání, ulička, stání (1,5 pole), jednořadý = stání a ulička (1 pole), zbytek je zeleň.
  // Uličky spojuje příčná ulička na straně vjezdu (od dvou uliček i druhá naproti), ta vede k silnici.
  // Podniky se zákazníky mají u budovy vedle příčné uličky místo pro zásobování.
  const deps=loc.map(q=>q.dep),lts=loc.map(q=>q.lat);const d0=Math.min(...deps)-0.25,d1=Math.max(...deps)+0.25,l0=Math.min(...lts)-0.25,l1=Math.max(...lts)+0.25;
  const D=d1-d0,Wd=l1-l0,SW=0.27,A=0.5;const W2=(dep,lat)=>[ax+d[0]*dep+p[0]*lat,ay+d[1]*dep+p[1]*lat];
  const spots=[],aisles=[],bays=[],green=[],trees=[];const side=Math.abs(l0)<=Math.abs(l1)?-1:1;const xc=side<0?l0+A/2:l1-A/2;
  const pull=!isHome(b)&&KIND[b.type]&&!!KIND[b.type].pull;
  const spot=(dep,lat,ang,ad,hw,along,truck)=>{const q=W2(dep,lat);spots.push({x:q[0],y:q[1],ang,ad,lat,dep,hw,along,truck:!!truck})};
  let nMod=0;const k=Math.floor((D+1e-6)/1.5),rem=D-k*1.5,single=rem>=1-1e-6;
  if(Wd<1.6||(!k&&!single)){ // úzký pozemek: jen ulička od silnice, stání po jedné straně
    const lc=side<0?(l0+A+l1)/2:(l0+l1-A)/2,n=Math.max(1,Math.floor(D/SW)),pt=D/n,sg=side<0?1:-1;
    if(Wd-A>=0.4)for(let i=0;i<n;i++)spot(d0+(i+0.5)*pt,lc,Math.atan2(p[1]*sg,p[0]*sg),d0+(i+0.5)*pt,pt/2,"p");
    else for(let i=0;i<Math.max(1,Math.floor(D/0.5));i++)spot(d0+(i+0.5)*0.5,xc,Math.atan2(d[1],d[0]),d0+(i+0.5)*0.5,0.25,"p");
    aisles.push({a:[d0-0.3,xc],b:[d1-0.05,xc],w:A});nMod=1}
  else{const ais=[];let y=d1;for(let i=0;i<k;i++){ais.push({y:y-0.75,dn:true});y-=1.5}if(single){ais.push({y:y-0.75,dn:false});y-=1}
    nMod=ais.length;const two=ais.length>=2&&Wd>=2.4,xr=side<0?l1-A/2:l0+A/2;
    const lo=side<0?l0+A+0.04:(two?l0+A+0.04:l0+0.02),hi=side<0?(two?l1-A-0.04:l1-0.02):l1-A-0.04;const n=Math.max(1,Math.floor((hi-lo)/SW)),pt=(hi-lo)/n;
    const bayN=pull&&n>=6?3:0;
    ais.forEach((q,i)=>{for(const up of [true,false]){if(!up&&!q.dn)continue;const rd=q.y+(up?0.5:-0.5);
        for(let jx=0;jx<n;jx++){if(bayN&&i===0&&up&&(side<0?jx<bayN:jx>=n-bayN))continue;spot(rd,lo+(jx+0.5)*pt,Math.atan2(d[1]*(up?1:-1),d[0]*(up?1:-1)),q.y,pt/2,"d")}}
      aisles.push({a:[q.y,xc],b:[q.y,two?xr:(side<0?hi:lo)],w:A})});
    aisles.push({a:[d0-0.3,xc],b:[ais[0].y,xc],w:A});if(two)aisles.push({a:[ais[ais.length-1].y,xr],b:[ais[0].y,xr],w:A});
    if(bayN){const bl=side<0?lo+bayN*pt/2:hi-bayN*pt/2,bd=ais[0].y+0.5;bays.push({dep:bd,lat:bl,hd:0.25,hl:bayN*pt/2});spot(bd,bl,Math.atan2(p[1]*side,p[0]*side),ais[0].y,bayN*pt/2,"p",true)}
    if(y-d0>0.2){const g0=side<0?l0+A+0.1:l0+0.1,g1=side<0?l1-0.1:l1-A-0.1;green.push({d0:d0+0.08,d1:y-0.06,l0:g0,l1:g1});for(let x=g0+0.4;x<g1-0.2;x+=1.1)trees.push(W2((d0+y)/2,x))}}
  if(!spots.length)return null;
  // nejdřív místa blízko vjezdu; místa pro zásobování na konec
  spots.sort((u,v)=>(u.truck-v.truck)||(Math.abs(u.ad-d0)+Math.abs(u.lat-xc)*0.6)-(Math.abs(v.ad-d0)+Math.abs(v.lat-xc)*0.6));
  const lay={spots,aisles,bays,green,trees,d,p,ax,ay,W:W2,first:d0-0.3,xc,mods:nMod,carSpots:spots.filter(q=>!q.truck).length};
  // kapacita parkoviště nepřesáhne počet vyznačených míst
  if(b.cap0===undefined)b.cap0=b.cap;if(!isHome(b)&&!(KIND[b.type]&&KIND[b.type].industry))b.cap=Math.min(b.cap0,lay.carSpots);
  // rozvržení se změnilo (jiný vjezd): zaparkovaná a přijíždějící auta dostanou místa znovu
  const old=b.spotUsed;b.lay=lay;b.spotUsed=new Array(spots.length).fill(null);
  if(old){let nx=0;const take=()=>{while(nx<spots.length&&(b.spotUsed[nx]||spots[nx].truck))nx++;return nx<spots.length?nx:-1};
    for(const pe of b.parked||[]){if(pe.spot===undefined)continue;const i=take();if(i<0)pe.spot=undefined;else{pe.spot=i;b.spotUsed[i]=pe}}
    for(const c of S.cars){if(c.dead||c.spotB!==b)continue;const i=take();if(i<0)c.spotB=null;else{c.spot=i;b.spotUsed[i]=c}}}
  return lay}
// cesta z vjezdu (bod na silnici) na místo i
function spotPath(lay,i){const s=lay.spots[i],W=lay.W;return [[lay.ax,lay.ay],W(lay.first,0),W(lay.first,lay.xc),W(s.ad,lay.xc),W(s.ad,s.lat),[s.x,s.y]]}
function pathLen(pts){let L=0;for(let k=1;k<pts.length;k++)L+=Math.hypot(pts[k][0]-pts[k-1][0],pts[k][1]-pts[k-1][1]);return L}
function pathPose(pts,s){for(let k=1;k<pts.length;k++){const a=pts[k-1],b=pts[k],l=Math.hypot(b[0]-a[0],b[1]-a[1]);if(s<=l||k===pts.length-1){const t=l?clamp(s/l,0,1):1;return {x:a[0]+(b[0]-a[0])*t,y:a[1]+(b[1]-a[1])*t,ang:Math.atan2(b[1]-a[1],b[0]-a[0])}}s-=l}
  const z=pts[pts.length-1];return {x:z[0],y:z[1],ang:0}}
// volné místo: nákladní auto jen místo pro zásobování, osobní jen běžné stání
function freeSpot(S,b,truck){const lay=lotLayout(S,b);if(!lay)return -1;for(let i=0;i<b.spotUsed.length;i++)if(!b.spotUsed[i]&&lay.spots[i].truck===!!truck)return i;return -1}
function releaseSpot(b,i,owner){if(b&&b.spotUsed&&i>=0&&i<b.spotUsed.length&&(!owner||b.spotUsed[i]===owner))b.spotUsed[i]=null}
// místa obsazená u bytovky: auta obyvatel, kteří jsou doma (jen vzhled)
function homeCars(b){if(b.type!=="flat"||!b.lay)return 0;return Math.min(b.lay.carSpots,Math.round(Math.max(0,b.pop-b.away)/4))}
