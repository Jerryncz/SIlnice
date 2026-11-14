// Uzly a křižovatky: ramena, pravidla přednosti, spojení pruhů (n.lc), místa napojení na pruh.

function armOf(S,n,eid){const e=S.edges[eid];const atA=e.a===n.id;const g=e.g;const u=atA?Math.min(0.5,g.len*0.3):Math.max(g.len-0.5,g.len*0.7);
  const port=atA?e.pa:e.pb;const z=port?pointAt(g,atA?0:g.len):n;const bx=z.x,by=z.y;
  const p=pointAt(g,u);let hx=p.x-bx,hy=p.y-by;const l=Math.hypot(hx,hy)||1;hx/=l;hy/=l;
  // vzdálenější směr ramene: strana, na kterou plynulá odbočka odchází (u tečného napojení je blízký směr skoro rovný)
  const uf=atA?Math.min(2.5,g.len*0.45):Math.max(g.len-2.5,g.len*0.55);const pf=pointAt(g,uf);let sx=pf.x-bx,sy=pf.y-by;const lf=Math.hypot(sx,sy)||1;sx/=lf;sy/=lf;
  return {e:eid,hx,hy,sx,sy,port:!!port,ox:bx-n.x,oy:by-n.y,inLink:eid*2+(atA?1:0),outLink:eid*2+(atA?0:1),axis:Math.abs(hx)>=Math.abs(hy)?0:1}}
const linkLanes=(S,l)=>{const e=S.edges[l>>1];return (l&1)?e.lb:e.lf};
const linkFrom=(S,l)=>{const e=S.edges[l>>1];return (l&1)?e.b:e.a};
const linkTo=(S,l)=>{const e=S.edges[l>>1];return (l&1)?e.a:e.b};
// silnice, která uzlem plynule prochází, a z boku jsou napojené jen jednosměrky / nájezdy (odbočky):
// dvojice průběžných ramen, jinak null. Taková silnice má přednost a kreslí se vcelku.
function sideJoinPair(S,n){if(n.edges.length<3||n.ring)return null;let best=null,bd=-0.9;
  for(let i=0;i<n.arms.length;i++)for(let j=i+1;j<n.arms.length;j++){const a=n.arms[i],b=n.arms[j];const d=a.hx*b.hx+a.hy*b.hy;const ea=S.edges[a.e],eb=S.edges[b.e];
    if(!(d<bd)||ea.kind!==eb.kind&&!(RK[ea.kind].oneway&&RK[eb.kind].oneway))continue;
    if(a.port||b.port)continue;
    if(!(linkLanes(S,a.inLink)&&linkLanes(S,b.outLink)||linkLanes(S,b.inLink)&&linkLanes(S,a.outLink)))continue;
    bd=d;best=[a.e,b.e]}
  if(!best)return null;for(const a of n.arms){if(best.includes(a.e))continue;const e=S.edges[a.e];if(!(RK[e.kind].oneway||e.lf===0||e.lb===0))return null}
  return best}
// místa napojení na pruh: v uzlu, kde úsek přibírá nebo ztrácí krajní pruh (konec odbočovacího pruhu,
// začátek připojovacího). Silnice začatá tady vede z toho pruhu: {x, y, dir (směr jízdy), node}
function lanePorts(S,n){const out=[];if(n.dead||n.edges.length!==2||n.ring)return out;const A=n.arms[0],B=n.arms[1];if(A.hx*B.hx+A.hy*B.hy>-0.9)return out;
  const side=(arm)=>{const e=S.edges[arm.e],atA=e.a===n.id;return {e,out:atA?e.id*2:e.id*2+1,in:atA?e.id*2+1:e.id*2,R:atA?e.lf:e.lb,L:atA?e.lb:e.lf,len:e.g.len}};
  for(const [P,Q,ap] of [[A,B,A],[B,A,B]]){const p=side(P),q=side(Q);
    // provoz z Q do P na straně vpravo od směru ven do P
    if(p.R>q.L&&p.R>0){const ps=lanePose(S,p.out,p.R-1,0);out.push({x:ps.x,y:ps.y,dir:[ap.hx,ap.hy],node:n.id,entry:true})}
    else if(q.L>p.R&&q.L>0){const ps=lanePose(S,q.in,q.L-1,q.len);out.push({x:ps.x,y:ps.y,dir:[ap.hx,ap.hy],node:n.id,entry:false})}}
  return out}
function snapPort(S,x,y,lvl){let best=null,bd=0.45;for(const n of S.nodes){if(n.dead||n.edges.length!==2||Math.abs(n.lvl-lvl)>=0.5||Math.abs(n.x-x)>2||Math.abs(n.y-y)>2)continue;
  for(const p of lanePorts(S,n)){const d=Math.hypot(p.x-x,p.y-y);if(d<bd){bd=d;best={type:"node",node:n.id,x:p.x,y:p.y,lvl:n.lvl,port:true,dir:p.dir,entry:p.entry}}}}return best}
// skutečný začátek každého ramene křižovatky (a.cut, vzdálenost od uzlu): kde se okraj ramene (i s chodníkem)
// potká s okrajem sousedního ramene, plus zaoblení obrubníku. Šikmé rameno má začátek dál než kolmé.
const CURB=0.18;
function armCuts(S,n,deg){for(const a of n.arms){a.cut=0;a.corner=null}n.rad=0;if(deg<3)return;
  const arms=[...n.arms].sort((a,b)=>Math.atan2(a.hy,a.hx)-Math.atan2(b.hy,b.hx));const m=arms.length;
  const wid=a=>{const e=S.edges[a.e],out=e.a===n.id;return [out?e.er:e.el,out?e.el:e.er]};   // [vpravo, vlevo] při pohledu z uzlu ven
  for(let i=0;i<m;i++){const A=arms[i],B=arms[(i+1)%m];if(A===B)continue;const wa=wid(A)[0],wb=wid(B)[1];
    const P=[n.x-A.hy*wa,n.y+A.hx*wa],Q=[n.x+B.hy*wb,n.y-B.hx*wb];const den=A.hx*B.hy-A.hy*B.hx;if(Math.abs(den)<0.04)continue;
    const dx=Q[0]-P[0],dy=Q[1]-P[1];const t=(dx*B.hy-dy*B.hx)/den,s=(dx*A.hy-dy*A.hx)/den;if(t<=0||s<=0)continue;
    A.cut=Math.max(A.cut,t);B.cut=Math.max(B.cut,s);A.corner=[P[0]+A.hx*t,P[1]+A.hy*t]}
  for(const a of arms){const e=S.edges[a.e];a.cut=Math.min(a.cut+CURB,8,e.g.len*0.45);n.rad=Math.max(n.rad,a.cut)}}
function topoNode(S,n){
  n.arms=n.edges.map(id=>armOf(S,n,id));const deg=n.arms.length;
  const isH=e=>e.kind==="hwy";
  const hw=n.arms.filter(a=>isH(S.edges[a.e])).length;
  n.pass=sideJoinPair(S,n);
  // konec silnice, na jehož pruhy jsou napojené jednosměrky (jediné rameno bez napojení na pruh)
  n.endPort=!n.ring&&deg>=2&&n.arms.filter(a=>!a.port).length===1;
  n.port=!!(n.pass&&n.arms.every(a=>n.pass.includes(a.e)||a.port))||n.endPort;
  armCuts(S,n,deg);
  // plocha křižovatky na každém rameni až do jeho skutečného začátku (+ přechod)
  for(const a of n.arms){const e=S.edges[a.e];const sb=deg>=3||n.endPort?(n.port?0.3:a.cut+0.05+(crossOn(S,n,e)?XW:0)):0;if(e.a===n.id)e.ta=sb;if(e.b===n.id)e.tb=sb}
  cornerMiters(S,n);
  n.turns=new Map();
  for(const ai of n.arms){if(!linkLanes(S,ai.inLink))continue;const list=[];const hix=-ai.hx,hiy=-ai.hy;const ei=S.edges[ai.e];
    for(const ao of n.arms){if(!linkLanes(S,ao.outLink))continue;const eo=S.edges[ao.e];
      if(ao.e===ai.e&&deg>1)continue;
      const cr=hix*ao.hy-hiy*ao.hx,dt=hix*ao.hx+hiy*ao.hy;
      const turn=ao.e===ai.e?2:(cr>0.35?1:cr<-0.35?-1:0);
      if(isH(ei)&&isH(eo)&&dt<0.3)continue;
      // napojení na pruh: sjet jen z pásu, na jehož pravém okraji sjezd začíná, najet jen do pásu, kde nájezd končí
      if(ao.port&&(dt<0.3||hix*ao.oy-hiy*ao.ox<0.02))continue;
      if(ai.port&&(dt<0.3||ao.hx*ai.oy-ao.hy*ai.ox<0.02))continue;
      if(hw>=2){ // napojení z boku dálnice: sjet jen vpravo, najet jen ve směru jízdy, dálnici nepřejet
        if(isH(ei)&&!isH(eo)&&!ao.port&&(hix*ao.sy-hiy*ao.sx)<0.02)continue;
        if(!isH(ei)&&isH(eo)&&!ai.port&&(ai.sx*(-ao.hy)+ai.sy*ao.hx)<0.02)continue;
        if(!isH(ei)&&!isH(eo))continue}
      if(n.ring&&!ei.ring&&!eo.ring)continue;
      list.push({link:ao.outLink,turn})}
    n.turns.set(ai.inLink,list)}
  n.mainEdges=null;
  if(n.ring&&n.arms.some(a=>S.edges[a.e].ring))n.eff="ring";
  else if(deg<3)n.eff="none";
  else if(hw){n.eff="merge";n.mainEdges=new Set(n.arms.filter(a=>isH(S.edges[a.e])).map(a=>a.e))}
  else if(n.ctl===3)n.eff="light";
  else if(n.ctl===1)n.eff="right";
  else if(n.ctl===2&&n.mainManual&&n.mainManual.every(id=>n.edges.includes(id))){n.eff="main";n.mainEdges=new Set(n.mainManual)}
  else if(n.pass){n.eff="main";n.mainEdges=new Set(n.pass)}   // jednosměrka napojená z boku dává přednost
  else{const rk=n.arms.map(a=>{const e=S.edges[a.e];return RK[e.kind].rank*8+e.lf+e.lb});const mx=Math.max(...rk);const top=n.arms.filter((a,k)=>rk[k]===mx);
    if(top.length===2&&rk.some(r=>r<mx)){n.eff="main";n.mainEdges=new Set(top.map(a=>a.e))}else n.eff="right"}
  if(n.eff==="light"){if(!n.light)n.light={axis:0,t:0,amber:false}}else n.light=null;
  laneLinks(S,n)}
// ---- spojení pruhů v uzlu: z každého pruhu každého příjezdu seznam {link, lane, turn, free} ----
// Rovně se pruhy párují podle polohy (pruh pokračuje tam, kde na něj navazuje jiný), vlevo se jede
// z vnitřních pruhů, vpravo z krajních. Spojení nastavená hráčem (e.uc[směr][pruh] = [{h: směr cílového ramene,
// m: cílový pruh}], nástroj Spojení) platí místo samočinných. Pruh bez pokračování (konec přídavného pruhu)
// nemá žádné spojení: auto se musí přeřadit. Odbočení, ke kterému žádné spojení nevede, nejde ani naplánovat.
function laneLinks(S,n){n.lc=new Map();n.lm=new Map();const deg=n.arms.length,cnt=new Map(),late=[];const TOL=LW*0.55;
  for(const ai of n.arms){const l=ai.inLink,L=linkLanes(S,l);if(!L)continue;const ei=S.edges[ai.e],d=l&1;const exits=n.turns.get(l)||[];
    const lc=[];for(let k=0;k<L;k++)lc.push([]);
    const add=(k,x,m)=>{if(!lc[k].some(q=>q.link===x.link&&q.lane===m))lc[k].push({link:x.link,lane:m,turn:x.turn,free:false})};
    const pin=[];for(let k=0;k<L;k++)pin.push(lanePose(S,l,k,ei.g.len));
    const Sx=exits.filter(x=>x.turn===0),Lx=exits.filter(x=>x.turn===-1||x.turn===2),Rx=exits.filter(x=>x.turn===1);
    const geo=Sx.map(x=>{const M=linkLanes(S,x.link);const po=[];for(let m=0;m<M;m++)po.push(lanePose(S,x.link,m,0));
      return {x,M,po,byK:pin.map(a=>{let bm=0,bd=1e9;po.forEach((b,m)=>{const dd=Math.hypot(a.x-b.x,a.y-b.y);if(dd<bd){bd=dd;bm=m}});return {m:bm,d:bd}})}});
    const through=deg<3||n.port;const user=null;
    const ov=!through&&ei.uc&&ei.uc[d]&&ei.uc[d].length===L?ei.uc[d]:null;
    if(ov){for(let k=0;k<L;k++)for(const q of ov[k]){const x=exitByDir(S,n,exits,q.h);if(x)add(k,x,Math.min(q.m,linkLanes(S,x.link)-1))}n.lc.set(l,lc);continue}
    const al=[];for(let k=0;k<L;k++)al.push(geo.some(G=>G.byK[k].d<TOL));
    const anyAl=al.some(v=>v);
    // samočinné šipky
    const mask=new Array(L).fill(0);
    if(Sx.length){for(let k=0;k<L;k++)if(al[k]||!anyAl)mask[k]|=2;if(Lx.length)mask[0]|=1;if(Rx.length)mask[L-1]|=4;
      if(!through&&L>=3){const need=1+(Lx.length?1:0)+(Rx.length?1:0);if(L>=need){if(Lx.length)mask[0]=1;if(Rx.length)mask[L-1]=4}}
      if(!through){const f=al.indexOf(true),la=al.lastIndexOf(true);for(let k=0;k<L;k++){if(mask[k])continue;if(k>la&&Rx.length)mask[k]=4;else if(k<f&&Lx.length)mask[k]=1;else mask[k]=2}}}
    else if(Lx.length&&Rx.length){for(let k=0;k<L;k++){if(k<=Math.floor((L-1)/2))mask[k]|=1;if(k>=Math.ceil((L-1)/2))mask[k]|=4}}
    else{const b=Lx.length?1:4;for(let k=0;k<L;k++)mask[k]=b}
    if(user)for(let k=0;k<L;k++)if(user[k])mask[k]=user[k];
    // rovně: podle polohy
    for(const G of geo){G.ks=[];for(let k=0;k<L;k++)if(mask[k]&2)G.ks.push(k);
      for(const k of G.ks)if(user&&user[k]||G.byK[k].d<TOL||!anyAl||!through&&!al[k])add(k,G.x,G.byK[k].m)}
    late.push({lc,geo,pin,add,L});
    // vlevo z vnitřních pruhů, vpravo z krajních
    for(const x of Lx){const M=linkLanes(S,x.link);let i=0;for(let k=0;k<L;k++)if(mask[k]&1){if(x.turn===2&&i>0)break;add(k,x,Math.min(i,M-1));i++}if(!i)add(0,x,0)}
    for(const x of Rx){const M=linkLanes(S,x.link);let i=0;for(let k=L-1;k>=0;k--)if(mask[k]&4){add(k,x,M-1-Math.min(i,M-1));i++}if(!i)add(L-1,x,M-1)}
    n.lc.set(l,lc)}
  // pruh za uzlem, do kterého zatím nic nevede (pruh navíc), dostane spojení z nejbližšího pruhu
  const fed=new Set();for(const lc of n.lc.values())for(const r of lc)for(const q of r)fed.add(q.link*16+q.lane);
  for(const A of late)for(const G of A.geo){for(let m=0;m<G.M;m++){if(fed.has(G.x.link*16+m))continue;let bk=-1,bd=1e9;
      for(const k of (G.ks.length?G.ks:A.pin.map((_,k)=>k))){const dd=Math.hypot(A.pin[k].x-G.po[m].x,A.pin[k].y-G.po[m].y);if(dd<bd){bd=dd;bk=k}}
      if(bk>=0&&bd<LW*1.6){A.add(bk,G.x,m);fed.add(G.x.link*16+m)}}
    if(!A.lc.some(r=>r.some(q=>q.link===G.x.link))){let bk=0;for(let k=1;k<A.L;k++)if(G.byK[k].d<G.byK[bk].d)bk=k;A.add(bk,G.x,G.byK[bk].m)}}
  for(const [l,lc] of n.lc){n.lm.set(l,lc.map(r=>r.reduce((b,q)=>b|(q.turn===0?2:q.turn===1?4:1),0)));
    for(const r of lc)for(const q of r){const key=q.link*16+q.lane;cnt.set(key,(cnt.get(key)||0)+1)}}
  // spojení, které nikomu nekříží cestu (pokračování pruhu přes napojení): jede bez dávání přednosti
  const soft=deg<3||n.pass||n.port;if(soft)for(const lc of n.lc.values())for(const r of lc)for(const q of r)if(q.turn===0&&cnt.get(q.link*16+q.lane)===1)q.free=true;
  // odbočení bez spojení se z hledání cest vyřadí (n.turnsAll zůstane pro nástroj Spojení)
  n.turnsAll=n.turns;n.turns=new Map();for(const [l,list] of n.turnsAll){const lc=n.lc.get(l);n.turns.set(l,lc?list.filter(x=>lc.some(r=>r.some(q=>q.link===x.link))):list)}}
// výjezd z uzlu ve směru h (směr ramene ven z uzlu)
function exitByDir(S,n,exits,h){let best=null,bd=0.85;for(const x of exits){const a=n.arms.find(q=>q.outLink===x.link);if(!a)continue;const d=a.hx*h[0]+a.hy*h[1];if(d>bd){bd=d;best=x}}return best}
const armDirOut=(n,link)=>{const a=n.arms.find(q=>q.outLink===link);return a?[a.hx,a.hy]:[0,0]};
// ---- nástroj Spojení: hráč přidává a ruší spojení pruh → pruh ----
const connNodeOk=n=>n&&!n.dead&&n.edges.length>=3&&!n.port&&!n.ring;
// spojení příjezdu l převezme jako ruční (podle současných), aby šlo upravit
function connMaterialize(S,n,l){const e=S.edges[l>>1],d=l&1;if(!e.uc)e.uc=[null,null];if(e.uc[d]&&e.uc[d].length===linkLanes(S,l))return e.uc[d];
  const lc=n.lc.get(l)||[];e.uc[d]=lc.map(r=>r.map(q=>({h:armDirOut(n,q.link),m:q.lane})));return e.uc[d]}
function connApply(S,n){topoNode(S,n);netChanged(S);
  // auta, která už nemají jak pokračovat, si najdou jinou cestu
  for(const c of S.cars){if(c.dead)continue;c.needLi=-1;for(let k=Math.max(0,c.li);k<c.links.length-1;k++){if(linkTo(S,c.links[k])!==n.id)continue;const list=n.turns.get(c.links[k])||[];if(!list.some(x=>x.link===c.links[k+1])){S.reroute.push(c);break}}}}
function connAdd(S,n,l,k,nl,m){if(!connNodeOk(n))return {ok:false,msg:"Spojení jde upravit jen v křižovatce."};
  const all=n.turnsAll&&n.turnsAll.get(l)||[];if(!all.some(x=>x.link===nl))return {ok:false,msg:"Tímhle směrem se z tohoto ramene jet nesmí."};
  if(k<0||k>=linkLanes(S,l)||m<0||m>=linkLanes(S,nl))return {ok:false,msg:"Tady pruh není."};
  const ov=connMaterialize(S,n,l),h=armDirOut(n,nl);if(ov[k].some(q=>q.h[0]*h[0]+q.h[1]*h[1]>0.85&&q.m===m))return {ok:false,msg:"Toto spojení už je."};
  ov[k].push({h,m});connApply(S,n);return {ok:true}}
function connRemove(S,n,l,k,nl,m){if(!connNodeOk(n))return {ok:false,msg:"Spojení jde upravit jen v křižovatce."};
  const ov=connMaterialize(S,n,l),h=armDirOut(n,nl);const i=ov[k].findIndex(q=>q.h[0]*h[0]+q.h[1]*h[1]>0.85&&q.m===m);if(i<0)return {ok:false,msg:"Toto spojení není."};
  ov[k].splice(i,1);connApply(S,n);return {ok:true}}
function connReset(S,n){for(const a of n.arms){const e=S.edges[a.e];if(e.uc)e.uc[a.inLink&1]=null}connApply(S,n);return {ok:true}}
const connCustom=(S,n)=>n.arms.some(a=>{const e=S.edges[a.e];return e.uc&&e.uc[a.inLink&1]})
