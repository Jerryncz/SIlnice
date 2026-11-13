// Hledání cest po síti. Stav = link (úsek*2 + směr); respektuje pruhy, jednosměrky,
// zákazy odbočení (dálnice, kruhový objezd) a vytížení.

function linkSpeed(S,l){return BASE_SPEED*RK[S.edges[l>>1].kind].speed}
function linkCost(S,l){const e=S.edges[l>>1];const c=e.cong[l&1];return e.g.len/RK[e.kind].speed*(1+3*c*c)}
function nodePenalty(S,n,inLink){switch(n.eff){case"light":return 0.5;case"ring":return S.edges[inLink>>1].ring?0.05:0.3;
  case"merge":return S.edges[inLink>>1].kind==="ramp"?0.25:0;case"main":return n.mainEdges.has(inLink>>1)?0.05:0.4;case"right":return 0.3;default:return 0}}
const PF={g:new Float64Array(0),prev:new Int32Array(0),seen:new Uint32Array(0),closed:new Uint32Array(0),gen:0,heap:new Heap()};
function pfEnsure(n){if(PF.g.length>=n)return;const m=Math.max(n,PF.g.length*2,1024);PF.g=new Float64Array(m);PF.prev=new Int32Array(m);PF.seen=new Uint32Array(m);PF.closed=new Uint32Array(m)}
function allowedDirs(S,ep){const e=S.edges[ep.e];const K=RK[e.kind];const ds=[];
  if(e.lf>0&&(!K.rightOnly||ep.side>=0||e.lb===0))ds.push(0);if(e.lb>0&&(!K.rightOnly||ep.side<0||e.lf===0))ds.push(1);return ds}
function epXY(S,ep){if(ep.node!==undefined){const n=S.nodes[ep.node];return [n.x,n.y]}return [ep.x,ep.y]}
// start/cíl: {e,u,side,x,y} (místo na úseku) nebo {node}
function findPath(S,start,goal,walk){
  pfEnsure(S.edges.length*2);const P=PF;P.gen++;const gen=P.gen,g=P.g,prev=P.prev,seen=P.seen,closed=P.closed,hp=P.heap;hp.clear();
  const [gx,gy]=epXY(S,goal);const vmax=walk?1:1.9;
  const hOf=l=>{const n=S.nodes[linkTo(S,l)];return Math.hypot(n.x-gx,n.y-gy)/vmax};
  const lenOf=l=>S.edges[l>>1].g.len;
  const costOf=walk?(l=>lenOf(l)):(l=>linkCost(S,l));
  const lanesOk=walk?(l=>RK[S.edges[l>>1].kind].walk):(l=>linkLanes(S,l)>0);
  let best=Infinity,bestLink=-1,bestEnd=0,bestPrev=-1;const starts=new Map();
  const goalDirs=goal.node===undefined?(walk?[0,1]:allowedDirs(S,goal)):null;
  const consider=(l,gEnd,s0,pv)=>{
    if(goal.node!==undefined){if(linkTo(S,l)===goal.node&&gEnd<best){best=gEnd;bestLink=l;bestEnd=lenOf(l);bestPrev=pv}return}
    if((l>>1)!==goal.e||!goalDirs.includes(l&1))return;const L=lenOf(l);const sT=(l&1)?L-goal.u:goal.u;if(sT<s0-0.01)return;
    const unit=costOf(l)/(L||1);const c=gEnd-(L-sT)*unit;if(c<best){best=c;bestLink=l;bestEnd=sT;bestPrev=pv}};
  const push=(l,gv,pv)=>{if(closed[l]===gen||seen[l]===gen&&gv>=g[l])return;seen[l]=gen;g[l]=gv;prev[l]=pv;hp.push(l,gv+hOf(l))};
  if(start.node!==undefined){const n=S.nodes[start.node];for(const a of n.arms){if(!lanesOk(a.outLink))continue;starts.set(a.outLink,0);const gv=costOf(a.outLink);push(a.outLink,gv,-1);consider(a.outLink,gv,0,-1)}}
  else{const e=S.edges[start.e];const dirs=start.dirs||(walk?[0,1]:allowedDirs(S,start));for(const d of dirs){const l=start.e*2+d;if(!lanesOk(l))continue;const L=e.g.len,s0=d?L-start.u:start.u;
    starts.set(l,s0);const gv=costOf(l)*(L-s0)/(L||1);push(l,gv,-1);consider(l,gv,s0,-1)}}
  let pops=0;
  while(hp.size){const l=hp.pop();if(closed[l]===gen)continue;closed[l]=gen;if(++pops>20000)break;
    if(g[l]-costOf(l)>=best)break;
    const n=S.nodes[linkTo(S,l)];
    if(walk){for(const a of n.arms){const l2=a.outLink;if(!lanesOk(l2))continue;const gv=g[l]+costOf(l2);push(l2,gv,l);consider(l2,gv,0,l)}}
    else{const list=n.turns.get(l);if(!list)continue;const pen=nodePenalty(S,n,l);for(const t of list){const gv=g[l]+pen+costOf(t.link);push(t.link,gv,l);consider(t.link,gv,0,l)}}}
  if(bestLink<0)return null;
  const links=[bestLink];let l=bestPrev,guard=0;
  while(l>=0&&guard++<5000){links.push(l);l=prev[l]}
  if(guard>=5000)return null;
  links.reverse();
  const s0=starts.has(links[0])&&prev[links[0]]<0?starts.get(links[0]):0;
  let len=0;for(let k=0;k<links.length;k++)len+=lenOf(links[k]);len-=s0;len-=lenOf(links[links.length-1])-bestEnd;
  return {links,s0,sEnd:bestEnd,cost:best,len:Math.max(0.1,len)}}
