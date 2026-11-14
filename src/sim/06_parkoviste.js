// Parkoviště: ulička (páteř od vjezdu a řady uliček) a jednotlivá místa. Auto zajede po uličce na volné
// místo a odjíždí zase po ní. Místa se přidělují (b.spotUsed), takže dvě auta nikdy nestojí na jednom.

const isParkRole=(b,r)=>r===R_LOT||r===R_GAR||(r===R_YARD&&KIND[b.type]&&KIND[b.type].industry);
// rozvržení parkoviště podle vjezdu: místa po buňkách, uličky mezi dvojicemi řad
function lotLayout(S,b){if(!b.access)return null;const key=b.access.e+":"+b.access.u.toFixed(2);if(b._lk===key)return b.lay;b._lk=key;b.lay=null;
  const cells=b.tiles.filter(j=>isParkRole(b,S.role[j]));if(!cells.length)return null;
  const ax=b.access.x,ay=b.access.y;let dx=wxOf(b.front)-ax,dy=wyOf(b.front)-ay;
  const d=Math.abs(dx)>=Math.abs(dy)?[Math.sign(dx)||1,0]:[0,Math.sign(dy)||1],p=[-d[1],d[0]];
  const loc=cells.map(j=>{const cx=wxOf(j),cy=wyOf(j);return {j,x:cx,y:cy,dep:Math.round(((cx-ax)*d[0]+(cy-ay)*d[1])*2)/2,lat:Math.round(((cx-ax)*p[0]+(cy-ay)*p[1])*2)/2}});
  // sloupce kolmo k silnici: místa – ulička – ulička – místa (obousměrná ulička), u tří sloupců místa – ulička – místa,
  // u dvou ulička – místa; od silnice vede vjezd rovnou do uličky
  const cols=[...new Set(loc.map(q=>q.lat))].sort((a,b)=>a-b),kind=new Map(),alOf=new Map(),aisles=[];let i=0;const n=cols.length;
  const setA=(ss,as)=>{const c=as.reduce((t,v)=>t+v,0)/as.length;for(const v of as)kind.set(v,"a");for(const v of ss){kind.set(v,"s");alOf.set(v,c)}aisles.push({lat:c,w:as.length*0.5})};
  while(n-i>=4){setA([cols[i],cols[i+3]],[cols[i+1],cols[i+2]]);i+=4}
  if(n-i===3)setA([cols[i],cols[i+2]],[cols[i+1]]);else if(n-i===2)setA([cols[i+1]],[cols[i]]);else if(n-i===1&&!aisles.length){kind.set(cols[i],"s");alOf.set(cols[i],cols[i]-0.5);aisles.push({lat:cols[i]-0.5,w:0.5})}
  const W2=(dep,lat)=>[ax+d[0]*dep+p[0]*lat,ay+d[1]*dep+p[1]*lat];
  const deps=loc.map(q=>q.dep),first=Math.min(...deps)-0.45,last=Math.max(...deps)+0.2;
  const spots=loc.filter(q=>kind.get(q.lat)==="s").map(q=>{const a=alOf.get(q.lat);const sg=q.lat>a?1:-1;return {x:q.x,y:q.y,ang:Math.atan2(p[1]*sg,p[0]*sg),al:a,lat:q.lat,dep:q.dep}});
  if(!spots.length)return null;
  spots.sort((u,v)=>Math.abs(u.al)*2+u.dep-(Math.abs(v.al)*2+v.dep));
  for(const a of aisles){const ds=loc.filter(q=>Math.abs(alOf.get(q.lat)-a.lat)<0.01||Math.abs(q.lat-a.lat)<0.26).map(q=>q.dep);a.d1=ds.length?Math.max(...ds)+0.2:last}
  const lay={spots,aisles,d,p,ax,ay,W:W2,first,last,l0:Math.min(0,...aisles.map(a=>a.lat)),l1:Math.max(0,...aisles.map(a=>a.lat))};
  // kapacita parkoviště nepřesáhne počet vyznačených míst
  if(b.cap0===undefined)b.cap0=b.cap;if(!isHome(b)&&!(KIND[b.type]&&KIND[b.type].industry))b.cap=Math.min(b.cap0,spots.length);
  b.lay=lay;if(!b.spotUsed||b.spotUsed.length!==spots.length)b.spotUsed=new Array(spots.length).fill(null);return lay}
// cesta z vjezdu (bod na silnici) na místo i
function spotPath(lay,i){const s=lay.spots[i],W=lay.W;return [[lay.ax,lay.ay],W(lay.first,0),W(lay.first,s.al),W(s.dep,s.al),[s.x,s.y]]}
function pathLen(pts){let L=0;for(let k=1;k<pts.length;k++)L+=Math.hypot(pts[k][0]-pts[k-1][0],pts[k][1]-pts[k-1][1]);return L}
function pathPose(pts,s){for(let k=1;k<pts.length;k++){const a=pts[k-1],b=pts[k],l=Math.hypot(b[0]-a[0],b[1]-a[1]);if(s<=l||k===pts.length-1){const t=l?clamp(s/l,0,1):1;return {x:a[0]+(b[0]-a[0])*t,y:a[1]+(b[1]-a[1])*t,ang:Math.atan2(b[1]-a[1],b[0]-a[0])}}s-=l}
  const z=pts[pts.length-1];return {x:z[0],y:z[1],ang:0}}
function freeSpot(S,b){const lay=lotLayout(S,b);if(!lay)return -1;for(let i=0;i<b.spotUsed.length;i++)if(!b.spotUsed[i])return i;return -1}
function releaseSpot(b,i,owner){if(b&&b.spotUsed&&i>=0&&i<b.spotUsed.length&&(!owner||b.spotUsed[i]===owner))b.spotUsed[i]=null}
// místa obsazená u bytovky: auta obyvatel, kteří jsou doma (jen vzhled)
function homeCars(b){if(b.type!=="flat"||!b.lay)return 0;return Math.min(b.lay.spots.length,Math.round(Math.max(0,b.pop-b.away)/4))}
