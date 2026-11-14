// Odbočky a nájezdy, vzory mimoúrovňových křižovatek (kosodélník, čtyřlístek).
// Všechno se skládá z běžných kroků sítě: pruh na kusu úseku (planLanes) a silnice (planRoad).

const BRANCH_LANE=4;   // délka odbočovacího / připojovacího pruhu (pole)
// druh odbočky: jednosměrný druh ze stavění, jinak nájezd u dálnice a jednosměrka u silnice
function branchKind(main,kind){if(RK[kind].oneway)return kind;return main.kind==="hwy"?"ramp":"oneway"}
// odbočka (tah ve směru jízdy) nebo nájezd (tah proti směru jízdy) z bodu na silnici sn do bodu en
function planBranch(S,sn,en,kind,lanes){
  const plan={ok:false,msg:"",cost:0,demolish:[],branch:true};
  if(!sn||sn.type!=="edge"){plan.msg="Začni na silnici mimo křižovatku.";return plan}
  const e=S.edges[sn.edge];if(e.ring||e.gateEdge||isRampEdge(S,e)){plan.msg="Tady odbočka začít nemůže.";return plan}
  const p=pointAt(e.g,sn.u);const vx=en.x-p.x,vy=en.y-p.y,L=Math.hypot(vx,vy);if(L<2){plan.msg="Táhni dál od silnice.";return plan}
  const one=e.lf===0||e.lb===0;const side=vx*p.nx+vy*p.ny>=0?1:-1;
  const dir=one?(e.lf>0?0:1):(side>0?0:1);const T=dir?[-p.tx,-p.ty]:[p.tx,p.ty];
  const exit=vx*T[0]+vy*T[1]>=0;
  const bk=branchKind(e,kind),K=RK[bk];const bl=clamp(lanes||1,K.min,K.max);
  const k=Math.max(0.8,L*0.42);let pts,st,end;
  if(exit){let ex=en.x-(p.x+T[0]*L*0.5),ey=en.y-(p.y+T[1]*L*0.5);const l=Math.hypot(ex,ey)||1;ex/=l;ey/=l;
    pts=mkCubic(p.x,p.y,p.x+T[0]*k,p.y+T[1]*k,en.x-ex*k,en.y-ey*k,en.x,en.y);st={type:"edge",edge:e.id,u:sn.u,x:p.x,y:p.y,lvl:sn.lvl};end=en}
  else{let sx=p.x-T[0]*L*0.5-en.x,sy=p.y-T[1]*L*0.5-en.y;const l=Math.hypot(sx,sy)||1;sx/=l;sy/=l;
    pts=mkCubic(en.x,en.y,en.x+sx*k,en.y+sy*k,p.x-T[0]*k,p.y-T[1]*k,p.x,p.y);st=en;end={type:"edge",edge:e.id,u:sn.u,x:p.x,y:p.y,lvl:sn.lvl}}
  const rp=planRoad(S,{pts,kind:bk,lanes:bl,start:st,end});if(!rp.ok){plan.msg=rp.msg;plan.bad=rp.bad;plan.g=rp.g;return plan}
  plan.ok=true;plan.road=rp;plan.g=rp.g;plan.spec=rp.spec;plan.exit=exit;plan.laneNote=!(exit?rp.joinS:rp.joinE)||!(exit?rp.joinS:rp.joinE).add;
  plan.demolish=rp.demolish;plan.cost=rp.cost;return plan}
function commitBranch(S,plan){if(!plan.ok)return {ok:false,msg:plan.msg};if(S.money<plan.cost)return {ok:false,msg:"Málo peněz v pokladně."};return commitRoad(S,plan.road)}

// ---- vzory mimoúrovňových křižovatek ----
// místní souřadnice: x podél dálnice (T), y napříč (N); +N strana jede ve směru +T (jízda vpravo)
function hwyFrame(S,x,y){let best=null,bd=0.6;for(const e of edgesNear(S,x,y,1.5)){if(e.kind!=="hwy"||isRampEdge(S,e)||S.nodes[e.a].lvl>0.01)continue;const r=nearestOn(e.g,x,y);if(r.d<bd){bd=r.d;best={e,r}}}
  if(!best)return null;const p=pointAt(best.e.g,best.r.u);const hw=Math.max(best.e.er,best.e.el);
  return {P:[p.x,p.y],T:[p.tx,p.ty],N:[p.nx,p.ny],hw,e:best.e}}
const TEMPLATES={diamond:{name:"Kosodélník"},clover:{name:"Čtyřlístek"},trumpet:{name:"Trubka"}};
// díly vzoru v místních souřadnicích: {pts:[x,y,...], a:{x,y,l}, b:{x,y,l}, road, level, join}
// join: na kterém konci se rampa napojuje na pruh ("s" začátek, "e" konec); jinak obyčejná křižovatka
function templateParts(type,hw){const parts=[];const cub=(A,ta,B,tb)=>{const d=Math.hypot(B[0]-A[0],B[1]-A[1]),k=Math.max(0.8,d*0.42);return mkCubic(A[0],A[1],A[0]+ta[0]*k,A[1]+ta[1]*k,B[0]-tb[0]*k,B[1]-tb[1]*k,B[0],B[1])};
  const join=(...ls)=>{const o=[];for(const l of ls){const s=o.length?2:0;for(let i=s;i<l.length;i++)o.push(l[i])}return o};
  const E=[1,0],Wd=[-1,0],Sd=[0,1],Nd=[0,-1],hp=Math.PI/2;
  if(type==="diamond"){const J=hw+3.4,X=11,D=Math.ceil(J+4);
    parts.push({road:true,a:{x:0,y:-D,l:0},b:{x:0,y:D,l:0},level:1,pts:mkLine(0,-D,0,D)});
    parts.push({join:"s",a:{x:-X,y:0,l:0},b:{x:0,y:J,l:1},pts:cub([-X,0],E,[0,J],E)});      // sjezd ze směru +T
    parts.push({join:"e",a:{x:0,y:J,l:1},b:{x:X,y:0,l:0},pts:cub([0,J],E,[X,0],E)});        // nájezd ve směru +T
    parts.push({join:"s",a:{x:X,y:0,l:0},b:{x:0,y:-J,l:1},pts:cub([X,0],Wd,[0,-J],Wd)});    // sjezd ze směru -T
    parts.push({join:"e",a:{x:0,y:-J,l:1},b:{x:-X,y:0,l:0},pts:cub([0,-J],Wd,[-X,0],Wd)});  // nájezd ve směru -T
    return {parts,span:X+6,size:Math.max(X,D)}}
  if(type==="trumpet"){const R=4.5,h=hw+0.9,D=Math.ceil(hw+4.5),Yb=hw+4.3,cy=-(h+R),Xn=D+4,ys=D+2;
    // silnice končí u dálnice: most na druhou stranu, tam smyčka (z dálnice) a vnější rampa (na dálnici)
    parts.push({road:true,a:{x:0,y:D,l:0},b:{x:0,y:-Yb,l:0},level:1,pts:mkLine(0,D,0,-Yb)});
    parts.push({road:true,a:{x:0,y:D,l:0},b:{x:0,y:D+8,l:0},pts:mkLine(0,D,0,D+8)});
    parts.push({join:"s",a:{x:-R+2.5,y:0,l:0},b:{x:0,y:-Yb,l:0},pts:join(cub([-R+2.5,0],Wd,[-R,-h],Wd),mkArc(-R,cy,R,hp,2*Math.PI),mkLine(0,cy,0,-Yb))});   // -T → silnice (smyčka)
    const P1=[-R,cy-R-1.9],P2=[-2*R-1.9,cy],xm=-2*R-1.9-5;
    parts.push({join:"e",a:{x:0,y:-Yb,l:0},b:{x:xm,y:0,l:0},pts:join(cub([0,-Yb],Nd,P1,Wd),cub(P1,Wd,P2,Sd),cub(P2,Sd,[xm,0],Wd))});                       // silnice → -T
    parts.push({join:"se",a:{x:-Xn,y:0,l:0},b:{x:0,y:ys,l:0},pts:cub([-Xn,0],E,[0,ys],Sd)});   // +T → silnice
    parts.push({join:"se",a:{x:0,y:ys,l:0},b:{x:Xn,y:0,l:0},pts:cub([0,ys],Nd,[Xn,0],E)});     // silnice → +T
    return {parts,span:Math.ceil(-xm)+6,size:Math.ceil(-xm)}}
  // čtyřlístek: smyčky R kolem rohů, vnější rampy přes body za smyčkami; mezi nájezdem ze smyčky a sjezdem
  // do další smyčky vznikne průpletový pruh
  const R=4,g=1.0,h=hw+0.8,K3=2,x0=g+R-K3,y1=h+R-K3,Q=18,Qr=15,D=Qr+7,C=Math.ceil(y1+4.2);
  parts.push({road:true,a:{x:0,y:-C,l:0},b:{x:0,y:C,l:0},level:1,pts:mkLine(0,-C,0,C)});
  parts.push({road:true,a:{x:0,y:C,l:0},b:{x:0,y:D,l:0},pts:mkLine(0,C,0,D)});
  parts.push({road:true,a:{x:0,y:-D,l:0},b:{x:0,y:-C,l:0},pts:mkLine(0,-D,0,-C)});
  const arc=(cx,cy,a0,a1)=>mkArc(cx,cy,R,a0,a1);
  // smyčky (levé odbočení)
  parts.push({join:"se",a:{x:x0,y:0,l:0},b:{x:0,y:y1,l:1},pts:join(cub([x0,0],E,[g+R,h],E),arc(g+R,h+R,-hp,Math.PI),cub([g,h+R],Nd,[0,y1],Nd))});           // JV: +T → -N
  parts.push({join:"se",a:{x:0,y:-y1,l:1},b:{x:x0,y:0,l:0},pts:join(cub([0,-y1],Nd,[g,-(h+R)],Nd),arc(g+R,-(h+R),Math.PI,Math.PI+3*hp),cub([g+R,-h],Wd,[x0,0],Wd))}); // SV: -N → -T
  parts.push({join:"se",a:{x:-x0,y:0,l:0},b:{x:0,y:-y1,l:1},pts:join(cub([-x0,0],Wd,[-(g+R),-h],Wd),arc(-(g+R),-(h+R),hp,2*Math.PI),cub([-g,-(h+R)],Sd,[0,-y1],Sd))}); // SZ: -T → +N
  parts.push({join:"se",a:{x:0,y:y1,l:1},b:{x:-x0,y:0,l:0},pts:join(cub([0,y1],Sd,[-g,h+R],Sd),arc(-(g+R),h+R,0,3*hp),cub([-(g+R),h],E,[-x0,0],E))});           // JZ: +N → +T
  // vnější rampy (pravé odbočení) kolem smyček
  const out=(A,tA,C,tC,cx,cy)=>{const dl=Math.hypot(cx,cy);const M=[cx+cx/dl*(R+1.9),cy+cy/dl*(R+1.9)];let tx=tA[0]+tC[0],ty=tA[1]+tC[1];const tl=Math.hypot(tx,ty)||1;const tM=[tx/tl,ty/tl];return join(cub(A,tA,M,tM),cub(M,tM,C,tC))};
  parts.push({join:"se",a:{x:-Q,y:0,l:0},b:{x:0,y:Qr,l:0},pts:out([-Q,0],E,[0,Qr],Sd,-(g+R),h+R)});   // JZ: +T → +N
  parts.push({join:"se",a:{x:0,y:Qr,l:0},b:{x:Q,y:0,l:0},pts:out([0,Qr],Nd,[Q,0],E,g+R,h+R)});        // JV: -N → +T
  parts.push({join:"se",a:{x:Q,y:0,l:0},b:{x:0,y:-Qr,l:0},pts:out([Q,0],Wd,[0,-Qr],Nd,g+R,-(h+R))});   // SV: -T → -N
  parts.push({join:"se",a:{x:0,y:-Qr,l:0},b:{x:-Q,y:0,l:0},pts:out([0,-Qr],Sd,[-Q,0],Wd,-(g+R),-(h+R))}); // SZ: +N → -T
  return {parts,span:Q+6,size:D}}
function planTemplate(S,type,x,y,kind,lanes){
  const plan={ok:false,msg:"",cost:0,demolish:[],template:type,gs:[]};
  const F=hwyFrame(S,x,y);if(!F){plan.msg="Vzor se staví na rovné dálnici na zemi. Najeď na ni.";return plan}
  if((x-F.P[0])*F.N[0]+(y-F.P[1])*F.N[1]<0){F.T=[-F.T[0],-F.T[1]];F.N=[-F.N[0],-F.N[1]]}   // strana kurzoru je +N (Trubka: odtud přichází silnice)
  const {parts,span}=templateParts(type,F.hw);const W=(lx,ly)=>[F.P[0]+F.T[0]*lx+F.N[0]*ly,F.P[1]+F.T[1]*lx+F.N[1]*ly];
  // dálnice musí být v celé délce vzoru rovná
  for(let lx=-span;lx<=span;lx+=1){const [wx,wy]=W(lx,0);if(wx<1||wy<1||wx>MW-1||wy>MH-1){plan.msg="Vzor se nevejde na mapu.";return plan}
    let ok=false;for(const e of edgesNear(S,wx,wy,1)){if(e.kind!=="hwy")continue;const r=nearestOn(e.g,wx,wy);if(r.d<0.06){const q=pointAt(e.g,r.u);if(Math.abs(q.tx*F.T[0]+q.ty*F.T[1])>0.995)ok=true}}
    if(!ok){plan.msg="Dálnice musí být v délce "+(2*span)+" polí rovná.";plan.bad={x:wx,y:wy};return plan}}
  const ck=RK[kind].oneway||kind==="hwy"?"road":kind,cl=clamp(lanes||RK[ck].lanes,RK[ck].min,RK[ck].max);const dem=new Set();const specs=[];
  for(const pt of parts){const pts=[];for(let i=0;i<pt.pts.length;i+=2){const w=W(pt.pts[i],pt.pts[i+1]);pts.push(w[0],w[1])}
    const A=W(pt.a.x,pt.a.y),B=W(pt.b.x,pt.b.y);
    const end=(q,lv)=>{if(lv===0&&Math.abs(q===A?pt.a.y:pt.b.y)<0.01){const s=snapPoint(S,q[0],q[1],0);if(s.type!=="free")return s}return {type:"free",x:q[0],y:q[1],lvl:lv}};
    const spec={pts:cleanPts(pts),kind:pt.road?ck:"ramp",lanes:pt.road?cl:1,start:end(A,pt.a.l),end:end(B,pt.b.l),level:pt.level,auto:true,join:pt.join||""};
    const rp=planRoad(S,spec);if(!rp.ok){plan.msg=(pt.road?"Silnice přes dálnici: ":"Rampa: ")+rp.msg;plan.bad=rp.bad;plan.gs.push(geom(spec.pts));return plan}
    plan.cost+=rp.roadCost;for(const b of rp.demolish)dem.add(b);plan.gs.push(rp.g);specs.push(spec)}
  plan.specs=specs;plan.demolish=[...dem];plan.cost+=plan.demolish.reduce((s,b)=>s+demolishCost(b),0);plan.ok=true;plan.name=TEMPLATES[type].name;plan.g=plan.gs[0];return plan}
function commitTemplate(S,plan){if(!plan.ok)return {ok:false,msg:plan.msg};if(S.money<plan.cost)return {ok:false,msg:"Málo peněz v pokladně."};
  S.money-=plan.cost;for(const b of plan.demolish)if(!b.dead)demolishBuilding(S,b,true);let bad=0;
  for(const sp of plan.specs){const snap=q=>{const s=snapPoint(S,q.x,q.y,q.lvl);return s.type==="free"?q:s};
    const spec=Object.assign({},sp,{start:snap(sp.start),end:snap(sp.end),auto:true});const rp=planRoad(S,spec);if(!rp.ok){bad++;continue}commitRoad(S,rp)}
  // na silnici přes dálnici má přednost silnice, rampy dávají přednost
  const road=plan.specs[0];for(const n of S.nodes){if(n.dead||n.edges.length<3||n.eff==="merge")continue;
    const d=nearestOn(geom(road.pts),n.x,n.y).d;if(d>0.1)continue;const arms=n.arms.filter(a=>S.edges[a.e].kind===road.kind);
    if(arms.length===2)setControl(S,n,2,arms.map(a=>a.e))}
  return bad?{ok:true,msg:"Postaveno, ale "+bad+" část(i) se nevešla."}:{ok:true}}
