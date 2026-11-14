// Editor silnic (nástroj Upravit): posunout křižovatku nebo konec, přepojit konec úseku jinam,
// ohnout úsek, posunout hranici přídavného pruhu. Každá úprava se nejdřív naplánuje (náhled, cena,
// bourání, důvod odmítnutí) a pak provede. Upravený úsek se nahradí novým se stejným druhem, pruhy,
// přechody a ručními spojeními; auta a vjezdy se přenesou (remapEdges), chodci si najdou novou cestu.

const EDIT_FIX=0.5;                               // přestavba upraveného úseku: podíl ceny nové silnice
const EDIT_ANG=Math.cos(18*Math.PI/180);          // nejostřejší dovolený úhel dvou ramen v uzlu

function editEdgeOk(S,e){if(!e||e.dead)return "Úsek už neexistuje.";if(e.ring)return "Kruhový objezd se upravuje jen celý (postav ho znovu).";
  if(e.gateEdge)return "Dálnici do světa upravit nejde.";if(e.a===e.b)return "Smyčku upravit nejde.";return null}
function editNodeOk(S,n){if(!n||n.dead)return "Uzel už neexistuje.";if(n.ring)return "Uzel kruhového objezdu se neposouvá.";if(n.gate>=0)return "Okraj mapy posunout nejde.";
  for(const id of n.edges){const m=editEdgeOk(S,S.edges[id]);if(m)return m}return null}

// posune konec lomené čáry o dx, dy; posun slábne k druhému konci (tvar oblouku zůstane)
function deformPts(pts,atA,dx,dy){const g=geom(pts),out=[];
  for(let k=0;k<g.n;k++){const f=g.cum[k]/(g.len||1),w=atA?1-f:f;out.push(pts[2*k]+dx*w,pts[2*k+1]+dy*w)}return cleanPts(out)}
// oblouk mezi konci úseku, který prochází bodem px, py (uprostřed); blízko spojnice = rovně
function bendThrough(pts,px,py){const ax=pts[0],ay=pts[1],bx=pts[pts.length-2],by=pts[pts.length-1];
  const ch=Math.hypot(bx-ax,by-ay)||1,off=Math.abs((px-ax)*(by-ay)-(py-ay)*(bx-ax))/ch;
  if(off<0.12)return mkLine(ax,ay,bx,by);
  const cx=2*px-(ax+bx)/2,cy=2*py-(ay+by)/2;
  return cleanPts(mkCubic(ax,ay,ax+(cx-ax)*2/3,ay+(cy-ay)*2/3,bx+(cx-bx)*2/3,by+(cy-by)*2/3,bx,by))}
// tečna ven z uzlu na začátku (atA) nebo konci geometrie
function tanEnd(g,atA){const p=pointAt(g,atA?0:g.len);return atA?[p.tx,p.ty]:[-p.tx,-p.ty]}

// kontrola nových tvarů. items: [{e, pts, la, lb, ja, jb}], ja/jb = napojení konce {node} / {edge, u} / null (volný konec);
// skip = id nahrazovaných úseků. Vrací null, nebo {msg, bad}.
function editCheck(S,items,skip){
  for(const it of items){const g=it.g=geom(it.pts);
    if(g.len<0.8)return {msg:"Úsek by byl moc krátký.",bad:{x:g.pts[0],y:g.pts[1]}};
    for(let k=0;k<g.n;k++){const x=g.pts[2*k],y=g.pts[2*k+1];if(x<0.2||y<0.2||x>MW-0.2||y>MH-0.2)return {msg:"Silnice nesmí vést mimo mapu.",bad:{x,y}}}}
  const lv=(it,u)=>it.la+(it.lb-it.la)*clamp(u/(it.g.len||1),0,1);
  // průsečík u konce s tím, na co je konec napojený, se nepočítá
  const joined=(it,u,x)=>{for(const [d,j] of [[u,it.ja],[it.g.len-u,it.jb]]){if(!j||d>0.45)continue;
    if(j.node!==undefined&&(x.a===j.node||x.b===j.node))return true;if(j.edge!==undefined&&x.id===j.edge)return true}return false};
  const same=(p,q)=>p&&q&&p.node!==undefined&&p.node===q.node;
  for(let i=0;i<items.length;i++){const it=items[i],g=it.g;
    for(const x of S.edges){if(x.dead||skip.has(x.id)||!bbOverlap(x.g.bb,g.bb,0.1))continue;
      for(const p of polyInter(g,x.g)){if(joined(it,p.ua,x))continue;const d=Math.abs(lv(it,p.ua)-lvlAt(S,x,p.ub));if(d>=0.9)continue;
        return {msg:d>0.1?"Tady by byl most moc nízko.":"Úsek by křížil jinou silnici. Novou křižovatku postav nástrojem Stavět.",bad:{x:p.x,y:p.y}}}}
    for(let j=i+1;j<items.length;j++){const o=items[j];if(!bbOverlap(o.g.bb,g.bb,0.1))continue;
      for(const p of polyInter(g,o.g)){
        const ea=p.ua<0.45?it.ja:g.len-p.ua<0.45?it.jb:null,eb=p.ub<0.45?o.ja:o.g.len-p.ub<0.45?o.jb:null;
        if(same(ea,eb))continue;if(Math.abs(lv(it,p.ua)-lv(o,p.ub))>=0.9)continue;
        return {msg:"Úseky by se křížily.",bad:{x:p.x,y:p.y}}}}
    // vedl by po jiné silnici
    let run=0;for(let u=0.6;u<g.len-0.6;u+=0.25){const q=pointAt(g,u);let on=false;
      for(const x of edgesNear(S,q.x,q.y,0.6)){if(skip.has(x.id))continue;const r=nearestOn(x.g,q.x,q.y);if(r.d>0.35)continue;
        if(Math.abs(lvlAt(S,x,r.u)-lv(it,u))>=0.5)continue;const t=pointAt(x.g,r.u);if(Math.abs(t.tx*q.tx+t.ty*q.ty)<0.9)continue;on=true;break}
      run=on?run+0.25:0;if(run>=1)return {msg:"Úsek by vedl po jiné silnici.",bad:{x:q.x,y:q.y}}}
    // volný konec nesmí ležet na jiné silnici
    for(const [atA,j] of [[true,it.ja],[false,it.jb]]){if(j)continue;const q=pointAt(g,atA?0:g.len),l0=atA?it.la:it.lb;
      for(const x of edgesNear(S,q.x,q.y,1.5)){if(skip.has(x.id))continue;const r=nearestOn(x.g,q.x,q.y);if(Math.abs(lvlAt(S,x,r.u)-l0)>=0.5)continue;
        if(r.d<Math.max(x.er,x.el)+0.3)return {msg:"Konec by ležel na jiné silnici. Pusť ho přímo na ni, napojí se.",bad:{x:q.x,y:q.y}}}}}
  // úhly ramen v uzlech: nové rameno nesmí být k jinému ostřeji než 18°, pokud tam tak ostré nebylo už dřív
  // (napojení na pruh vede souběžně se silnicí, to se nepočítá)
  const ends=[];for(const it of items)for(const atA of [true,false]){const j=atA?it.ja:it.jb;if(!j||(atA?it.pa:it.pb))continue;
    const same0=j.node!==undefined&&j.node===(atA?it.e.a:it.e.b);ends.push({j,atA,it,t:tanEnd(it.g,atA),t0:same0?tanOut(it.e,atA):null})}
  const dot=(p,q)=>p[0]*q[0]+p[1]*q[1];
  for(const a of ends){const others=[];
    for(const b of ends)if(b!==a&&(same(a.j,b.j)||a.j.edge!==undefined&&b.j.edge===a.j.edge&&Math.abs(a.j.u-b.j.u)<0.3))others.push(b);
    if(a.j.node!==undefined){const n=S.nodes[a.j.node];for(const id of n.edges){if(skip.has(id))continue;const x=S.edges[id];if(x.a===n.id?x.pa:x.pb)continue;const t=tanOut(x,x.a===n.id);others.push({t,t0:t})}}
    else if(a.j.edge!==undefined){const x=S.edges[a.j.edge],p=pointAt(x.g,a.j.u);others.push({t:[p.tx,p.ty],t0:null},{t:[-p.tx,-p.ty],t0:null})}
    for(const b of others){const d=dot(a.t,b.t),d0=a.t0&&b.t0?dot(a.t0,b.t0):-2;
      if(d>EDIT_ANG&&d>d0+0.002){const g=a.it.g,q=pointAt(g,a.atA?0:g.len);return {msg:"Ramena v uzlu by se překrývala, úhel je moc ostrý.",bad:{x:q.x,y:q.y}}}}}
  return null}
function editCost(S,items){let c=0;for(const it of items){const e=it.e;c+=it.g.len*roadCostPerTile(e.kind,Math.max(e.lf,e.lb),(it.la+it.lb)/2)*EDIT_FIX}return Math.round(c)}
// dokončí plán: kontrola, buňky k zbourání, cena
function editFinish(S,plan,items,skip){plan.items=items;const err=editCheck(S,items,skip);for(const it of items)if(!it.g)it.g=geom(it.pts);
  if(err){plan.msg=err.msg;plan.bad=err.bad;return plan}
  const cells=new Set();for(const it of items){for(const c of cellsAlong(S,it.g,edgeExt(it.e),u=>it.la+(it.lb-it.la)*clamp(u/(it.g.len||1),0,1)))cells.add(c)}
  const dem=bldOn(S,cells);for(const b of dem)if(b.gateLock){plan.msg="Tady stavět nejde.";return plan}
  plan.demolish=dem;plan.roadCost=plan.roadCost!==undefined?plan.roadCost:editCost(S,items);
  plan.cost=plan.roadCost+dem.reduce((s,b)=>s+demolishCost(b),0);plan.ver=S.netVer;plan.ok=true;return plan}
const editPlan=(edit,o)=>Object.assign({ok:false,msg:"",cost:0,demolish:[],edit},o);
const endJ=(S,e,atA)=>({node:atA?e.a:e.b});

// ---- ohnout úsek: střed úseku se táhne do bodu x, y ----
function planBend(S,e,x,y){const plan=editPlan("bend",{e});const m=editEdgeOk(S,e);if(m){plan.msg=m;return plan}
  if(e.g.len<1.6){plan.msg="Úsek je na ohnutí moc krátký.";return plan}
  if(nearestOn(e.g,x,y).d<0.06){plan.msg="Úsek už tudy vede.";plan.same=true;return plan}
  const pts=bendThrough(e.g.pts,x,y);
  return editFinish(S,plan,[{e,pts,la:S.nodes[e.a].lvl,lb:S.nodes[e.b].lvl,ja:endJ(S,e,true),jb:endJ(S,e,false),pa:e.pa,pb:e.pb}],new Set([e.id]))}

// ---- posunout křižovatku nebo konec: všechny úseky v uzlu se na jeho konci posunou ----
function planMove(S,n,x,y){const plan=editPlan("move",{n,x,y});const m=editNodeOk(S,n);if(m){plan.msg=m;return plan}
  const dx=x-n.x,dy=y-n.y;if(Math.hypot(dx,dy)<0.05){plan.msg="Uzel je na stejném místě.";plan.same=true;return plan}
  const o=findNode(S,x,y,n.lvl,0.6);if(o&&o!==n){plan.msg="Na tom místě už uzel je.";plan.bad={x,y};return plan}
  const items=[],skip=new Set();
  for(const id of n.edges){const e=S.edges[id];skip.add(id);
    items.push({e,pts:deformPts(e.g.pts,e.a===n.id,dx,dy),la:S.nodes[e.a].lvl,lb:S.nodes[e.b].lvl,ja:endJ(S,e,true),jb:endJ(S,e,false),pa:e.pa,pb:e.pb})}
  // uzel sám nesmí ležet na jiné silnici
  for(const xe of edgesNear(S,x,y,1.5)){if(skip.has(xe.id))continue;const r=nearestOn(xe.g,x,y);if(Math.abs(lvlAt(S,xe,r.u)-n.lvl)>=0.5)continue;
    if(r.d<Math.max(xe.er,xe.el)+0.3){plan.msg="Uzel by ležel na jiné silnici.";plan.bad={x,y};plan.items=items;for(const it of items)it.g=geom(it.pts);return plan}}
  return editFinish(S,plan,items,skip)}

// ---- přepojit konec úseku: konec atA se odpojí od svého uzlu a napojí na cíl sn (uzel, místo na silnici, nebo volné místo) ----
function planReconnect(S,e,atA,sn){const plan=editPlan("reconnect",{e,atA,sn});const m=editEdgeOk(S,e);if(m){plan.msg=m;return plan}
  const n=S.nodes[atA?e.a:e.b],far=S.nodes[atA?e.b:e.a];if(n.gate>=0){plan.msg="Konec u okraje mapy přepojit nejde.";return plan}
  if(Math.abs((sn.lvl||0)-n.lvl)>0.01){plan.msg="Konec musí zůstat ve stejné výšce.";return plan}
  let tx=sn.x,ty=sn.y,j=null;
  if(sn.type==="edge"){const x=S.edges[sn.edge];
    if(!x||x.dead||x===e){plan.msg="Na vlastní úsek se napojit nejde.";return plan}
    if(isRampEdge(S,x)){plan.msg="Na rampu mostu se napojit nejde. Napoj se na jejím konci.";return plan}
    if(x.gateEdge){plan.msg="Na dálnici do světa se napoj až za okrajem mapy.";return plan}
    if(sn.u<0.5)sn={type:"node",node:x.a,x:S.nodes[x.a].x,y:S.nodes[x.a].y,lvl:S.nodes[x.a].lvl};
    else if(x.g.len-sn.u<0.5)sn={type:"node",node:x.b,x:S.nodes[x.b].x,y:S.nodes[x.b].y,lvl:S.nodes[x.b].lvl};
    else{if(x.kind==="hwy"||e.kind==="hwy"){plan.msg="Dálnici nejde křížit ani napojit v úrovni.";return plan}j={edge:x.id,u:sn.u};const p=pointAt(x.g,sn.u);tx=p.x;ty=p.y}}
  if(sn.type==="node"){const t=S.nodes[sn.node];
    if(t===n){plan.msg="Konec je pořád napojený tady.";plan.same=true;return plan}if(t===far){plan.msg="Úsek by začínal i končil v jednom uzlu.";return plan}
    if(t.gate>=0){plan.msg="K okraji mapy se napojit nejde.";return plan}
    if(t.edges.some(id=>{const x=S.edges[id];return x.a===far.id||x.b===far.id})){plan.msg="Tyhle dva uzly už silnice spojuje.";return plan}
    j={node:t.id};tx=t.x;ty=t.y}
  plan.sn=sn;plan.tx=tx;plan.ty=ty;
  const ex=e.g.pts[atA?0:e.g.pts.length-2],ey=e.g.pts[atA?1:e.g.pts.length-1];
  const pts=deformPts(e.g.pts,atA,tx-ex,ty-ey);if(atA){pts[0]=tx;pts[1]=ty}else{pts[pts.length-2]=tx;pts[pts.length-1]=ty}
  const fj={node:far.id};
  return editFinish(S,plan,[{e,pts,la:atA?n.lvl:far.lvl,lb:atA?far.lvl:n.lvl,ja:atA?j:fj,jb:atA?fj:j,pa:atA?false:e.pa,pb:atA?e.pb:false}],new Set([e.id]))}

// ---- posunout hranici přídavného pruhu (nebo jiný průběžný uzel mezi dvěma různými úseky) po silnici ----
function slideInfo(S,n){if(!n||n.dead||n.ring||n.gate>=0||n.edges.length!==2)return null;
  const e1=S.edges[n.edges[0]],e2=S.edges[n.edges[1]];if(e1===e2||editEdgeOk(S,e1)||editEdgeOk(S,e2))return null;
  if((e1.a===n.id?e1.pa:e1.pb)||(e2.a===n.id?e2.pa:e2.pb))return null;
  const t1=tanOut(e1,e1.a===n.id),t2=tanOut(e2,e2.a===n.id);if(t1[0]*t2[0]+t1[1]*t2[1]>-0.94)return null;
  const f1=S.nodes[e1.a===n.id?e1.b:e1.a],f2=S.nodes[e2.a===n.id?e2.b:e2.a];if(f1===f2)return null;
  if(Math.abs(f1.lvl-n.lvl)>0.01||Math.abs(f2.lvl-n.lvl)>0.01)return null;
  const r1=e1.a===n.id,r2=e2.b===n.id;   // r1: e1 vede z n ven; r2: e2 vede do n
  const p1=r1?reversePts(e1.g.pts):e1.g.pts.slice(),p2=r2?reversePts(e2.g.pts):e2.g.pts;
  const g=geom(cleanPts(p1.concat(p2.slice(2))));
  const cut=(f,e)=>{const a=f.arms.find(q=>q.e===e.id);return a&&a.cut||0};
  return {n,e1,e2,f1,f2,r1,r2,g,L1:e1.g.len,lo:cut(f1,e1)+0.8,hi:g.len-cut(f2,e2)-0.8}}
function planSlide(S,n,x,y){const plan=editPlan("slide",{n});const I=slideInfo(S,n);if(!I){plan.msg="Tenhle uzel se po silnici posunout nedá.";return plan}
  if(I.hi<I.lo){plan.msg="Úsek je na posun moc krátký.";return plan}
  const L=I.g.len,s=clamp(Math.round(nearestOn(I.g,x,y).u*4)/4,I.lo,I.hi);plan.I=I;plan.s=s;
  if(Math.abs(s-I.L1)<0.1){plan.msg="Hranice pruhu je na stejném místě.";plan.same=true;return plan}
  const pa=subPts(I.g,0,s),pb=subPts(I.g,s,L);
  const items=[{e:I.e1,pts:I.r1?reversePts(pa):pa},{e:I.e2,pts:I.r2?reversePts(pb):pb}];for(const it of items){it.la=it.lb=n.lvl;it.g=geom(it.pts)}
  plan.items=items;
  // platí se jen kus, o který se širší úsek prodlouží
  const grow=s>I.L1?I.e1:I.e2,shrink=grow===I.e1?I.e2:I.e1,d=Math.abs(s-I.L1);
  const pt=e=>roadCostPerTile(e.kind,Math.max(e.lf,e.lb),n.lvl);plan.roadCost=Math.round(d*Math.max(0,pt(grow)-pt(shrink)));
  const gg=geom(subPts(I.g,Math.min(s,I.L1),Math.max(s,I.L1)));const dem=bldOn(S,cellsAlong(S,gg,edgeExt(grow),()=>n.lvl));
  for(const b of dem)if(b.gateLock){plan.msg="Tady stavět nejde.";return plan}
  plan.demolish=dem;plan.cost=plan.roadCost+dem.reduce((q,b)=>q+demolishCost(b),0);plan.ver=S.netVer;plan.ok=true;return plan}

// ---- provedení ----
// nový úsek místo e se stejnými vlastnostmi; poloha aut se přepočítá poměrem délek
function replaceEdge(S,e,pts,A,B,o){o=o||{};const L=e.g.len;
  const ne=addEdge(S,A,B,e.kind,pts,e.lf,e.lb,Object.assign(edgeProps(e),{pa:o.pa!==undefined?o.pa:e.pa,pb:o.pb!==undefined?o.pb:e.pb}));
  const k=ne.g.len/(L||1);ne.flow=e.flow;ne.passes=e.passes;ne.cong=e.cong.slice();ne.born=e.born;
  if(e.xw)ne.xw=e.xw.map(x=>({u:x.u*k})).filter(x=>x.u>0.6&&x.u<ne.g.len-0.6);
  if(e.uc)ne.uc=[o.dropB?null:e.uc[0],o.dropA?null:e.uc[1]];
  remapEdges(S,new Map([[e.id,[{e:ne,u0:0,u1:L,off:0,rev:false,k}]]]));removeEdge(S,e,true);return ne}
// kusy pro remapEdges: starý úsek leží na společné dráze σ = sA + sa·u, nový úsek q má polohu B + b·σ na σ ∈ [s0, s1]
function railPieces(len,sA,sa,news){const out=[];const lo=Math.min(sA,sA+sa*len),hi=Math.max(sA,sA+sa*len);
  for(const q of news){const s0=Math.max(q.s0,lo),s1=Math.min(q.s1,hi);if(s1-s0<1e-6)continue;
    const ua=(s0-sA)*sa,ub=(s1-sA)*sa,u0=Math.min(ua,ub),u1=Math.max(ua,ub),pos=u=>q.B+q.b*(sA+sa*u),rev=sa*q.b<0;
    out.push({e:q.e,u0,u1,off:rev?pos(u1):pos(u0),rev})}
  return out.sort((a,b)=>a.u0-b.u0)}
function commitEdit(S,p){if(!p.ok)return {ok:false,msg:p.msg};
  if(p.ver!==S.netVer)return {ok:false,msg:"Silnice se mezitím změnily. Zkus to znovu."};
  if(S.money<p.cost)return {ok:false,msg:"Málo peněz v pokladně."};
  S.money-=p.cost;for(const b of p.demolish)if(!b.dead)demolishBuilding(S,b,true);
  const touched=[],made=[];
  if(p.edit==="bend"){const it=p.items[0],e=it.e;made.push(replaceEdge(S,e,it.pts,S.nodes[e.a],S.nodes[e.b]));touched.push(S.nodes[e.a],S.nodes[e.b])}
  else if(p.edit==="move"){const n=p.n;n.x=p.x;n.y=p.y;
    for(const it of p.items){const e=it.e;if(e.dead)continue;made.push(replaceEdge(S,e,it.pts,S.nodes[e.a],S.nodes[e.b]));touched.push(S.nodes[e.a],S.nodes[e.b])}}
  else if(p.edit==="reconnect"){const it=p.items[0],e=it.e,atA=p.atA,sn=p.sn;const old=S.nodes[atA?e.a:e.b],far=S.nodes[atA?e.b:e.a];
    const t=sn.type==="node"?S.nodes[sn.node]:sn.type==="edge"?splitEdge(S,S.edges[sn.edge],sn.u):addNode(S,p.tx,p.ty,old.lvl);
    const pts=it.pts.slice();if(atA){pts[0]=t.x;pts[1]=t.y}else{pts[pts.length-2]=t.x;pts[pts.length-1]=t.y}
    made.push(replaceEdge(S,e,pts,atA?t:far,atA?far:t,atA?{pa:false,dropA:true}:{pb:false,dropB:true}));touched.push(old,t,far)}
  else if(p.edit==="slide"){const I=p.I,n=p.n,s=p.s,L=I.g.len;const q=pointAt(I.g,s);n.x=q.x;n.y=q.y;
    const it1=p.items[0],it2=p.items[1],e1=I.e1,e2=I.e2;
    const n1=addEdge(S,S.nodes[e1.a],S.nodes[e1.b],e1.kind,it1.pts,e1.lf,e1.lb,Object.assign(edgeProps(e1),{pa:e1.pa,pb:e1.pb}));
    const n2=addEdge(S,S.nodes[e2.a],S.nodes[e2.b],e2.kind,it2.pts,e2.lf,e2.lb,Object.assign(edgeProps(e2),{pa:e2.pa,pb:e2.pb}));
    for(const [o,ne] of [[e1,n1],[e2,n2]]){ne.flow=o.flow;ne.passes=o.passes;ne.cong=o.cong.slice();ne.born=o.born;if(o.uc)ne.uc=[o.uc[0],o.uc[1]]}
    // nové úseky na dráze σ (0 = vzdálený konec e1, L = vzdálený konec e2)
    const news=[{e:n1,s0:0,s1:s,B:I.r1?s:0,b:I.r1?-1:1},{e:n2,s0:s,s1:L,B:I.r2?L:-s,b:I.r2?-1:1}];
    const sig1=I.r1?[I.L1,-1]:[0,1],sig2=I.r2?[I.L1+e2.g.len,-1]:[I.L1,1];
    // přechody uprostřed úseku zůstanou na svém místě silnice
    const xs=[];for(const [o,sg] of [[e1,sig1],[e2,sig2]])for(const x of o.xw||[])xs.push(sg[0]+sg[1]*x.u);
    for(const sx of xs){if(Math.abs(sx-s)<0.6)continue;const nq=news.find(w=>sx>=w.s0&&sx<=w.s1);if(!nq)continue;const u=nq.B+nq.b*sx;(nq.e.xw||(nq.e.xw=[])).push({u})}
    remapEdges(S,new Map([[e1.id,railPieces(e1.g.len,sig1[0],sig1[1],news)],[e2.id,railPieces(e2.g.len,sig2[0],sig2[1],news)]]));
    removeEdge(S,e1,true);removeEdge(S,e2,true);made.push(n1,n2);touched.push(n,I.f1,I.f2)}
  for(const n of touched)if(!n.dead)topoNode(S,n);tidyNodes(S,touched);netChanged(S);
  return {ok:true,edges:made.filter(e=>!e.dead)}}

// úchyty editoru pro úsek e: move / slide (uzel), end (přepojit konec), bend (střed)
function editHandles(S,e){const out=[];if(editEdgeOk(S,e))return out;
  for(const atA of [true,false]){const n=S.nodes[atA?e.a:e.b];
    if(!editNodeOk(S,n))out.push({t:slideInfo(S,n)?"slide":"move",n:n.id,x:n.x,y:n.y});
    if(n.edges.length>=2&&n.gate<0){const tr=edgeTrim(e);const u=atA?Math.min(e.g.len*0.3,tr[0]+0.5):Math.max(e.g.len*0.7,e.g.len-tr[1]-0.5);const p=pointAt(e.g,u);out.push({t:"end",e:e.id,atA,x:p.x,y:p.y})}}
  if(e.g.len>=1.6){const p=pointAt(e.g,e.g.len/2);out.push({t:"bend",e:e.id,x:p.x,y:p.y})}
  return out}
