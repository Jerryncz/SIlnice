// ---- chodci po chodnících a přes přechody ----
// w.sd = strana chodníku vůči směru chůze (+1 vpravo); přes silnici chodí jen po přechodech:
// v křižovatce přes přechody ramen, k domu na druhé straně po přechodu v úseku (nebo u cíle, když žádný není)
const sdOf=(l,side)=>side*((l&1)?-1:1);
function walkerEnd(S,w,aborted){if(w.dead)return;w.dead=true;releaseCross(S,w);walkerArrived(S,w,aborted)}
function releaseCross(S,w){const x=w.cur;if(!x||!x.held)return;x.held=false;
  if(x.node>=0){const n=S.nodes[x.node];if(n.xBusy)n.xBusy.set(x.eid,Math.max(0,(n.xBusy.get(x.eid)||0)-1))}
  else{const e=S.edges[x.eid];if(e.mbusy){const k=e.mbusy.indexOf(x.u);if(k>=0)e.mbusy.splice(k,1)}}}
// chodník u uzlu na rameni (směr ven h), strana sg (+1 = vpravo od směru ven)
function walkPt(S,n,a,dist,sg){const e=S.edges[a.e];const ext=Math.max(e.er,e.el)-RK[e.kind].side/2;const px=-a.hy,py=a.hx;return [n.x+a.hx*dist+px*ext*sg,n.y+a.hy*dist+py*ext*sg]}
// plán přechodů v uzlu: ramena, která chodec cestou z l do nl přejde, a nová strana
function walkerTurn(S,w,l,nl,wantSd){const n=S.nodes[linkTo(S,l)];
  if(n.edges.length<3){if((nl>>1)===(l>>1))return {sd:-w.sd,items:[]};return {sd:w.sd,items:[]}}
  const arms=[...n.arms].sort((p,q)=>Math.atan2(p.hy,p.hx)-Math.atan2(q.hy,q.hx));const m=arms.length;
  const iA=arms.findIndex(a=>a.e===(l>>1)),iB=arms.findIndex(a=>a.e===(nl>>1));if(iA<0||iB<0)return {sd:w.sd,items:[]};
  const between=(st)=>{const o=[];let i=(iA+st+m)%m;let g=0;while(i!==iB&&g++<m){o.push(arms[i]);i=(i+st+m)%m}return o};
  const dir=w.sd>0?-1:1;
  const keep=iA===iB?[]:between(dir),flip=iA===iB?[arms[iA]]:[arms[iA],...between(-dir)];
  const ok=list=>list.every(a=>crossOn(S,n,S.edges[a.e]));
  const opts=[{list:keep,sd:w.sd},{list:flip,sd:-w.sd}].map(o=>({...o,valid:ok(o.list)}));
  let pick=null;if(wantSd!==undefined)pick=opts.find(o=>o.sd===wantSd&&o.valid);
  if(!pick){const v=opts.filter(o=>o.valid);pick=(v.length?v:opts).sort((p,q)=>p.list.length-q.list.length)[0]}
  const items=[];const base=n.rad+0.05+XW/2;
  // chodec stojí na rohu ramene A na své straně
  const aA=arms[iA];let cur=walkPt(S,n,aA,base+XW,w.sd>0?-1:1);
  for(const a of pick.list){const e=S.edges[a.e];const p1=walkPt(S,n,a,base,1),p2=walkPt(S,n,a,base,-1);
    const d1=Math.hypot(p1[0]-cur[0],p1[1]-cur[1]),d2=Math.hypot(p2[0]-cur[0],p2[1]-cur[1]);const [s,t]=d1<=d2?[p1,p2]:[p2,p1];
    items.push({x0:s[0],y0:s[1],x1:t[0],y1:t[1],node:n.id,eid:e.id,zebra:crossOn(S,n,e)});cur=t}
  return {sd:pick.sd,items}}
// přejít úsek v místě s (přechod v úseku nebo u cíle)
function midCross(S,w,l,s){const e=S.edges[l>>1];const u=clamp((l&1)?e.g.len-s:s,0,e.g.len);const p=pointAt(e.g,u);const sd=RK[e.kind].side/2;
  const a=[p.x+p.nx*(e.er-sd),p.y+p.ny*(e.er-sd)],b=[p.x-p.nx*(e.el-sd),p.y-p.ny*(e.el-sd)];const fromRight=sdOf(l,w.sd)>0;
  const [s0,s1]=fromRight?[a,b]:[b,a];return {x0:s0[0],y0:s0[1],x1:s1[0],y1:s1[1],node:-1,eid:e.id,u,zebra:false}}
// na posledním úseku: kde přejít na stranu cíle
function planFinal(S,w){const l=w.links[w.li];if(w.li!==w.links.length-1||w.sd===w.goalSd){w.xAt=-1;return}
  const e=S.edges[l>>1];let best=w.sEnd;
  if(e.xw)for(const x of e.xw){const s=(l&1)?e.g.len-x.u:x.u;if(s>=w.s-0.05&&s<=w.sEnd&&s<best)best=s}
  w.xAt=best;w.xZebra=best<w.sEnd}
function canStartCross(S,w,x){
  if(x.node>=0){const n=S.nodes[x.node];for(const o of n.box){if(o.dead||!o.conn||o.conn.node!==n.id)continue;if((o.conn.from>>1)===x.eid||(o.conn.to>>1)===x.eid)return false}return true}
  const e=S.edges[x.eid];for(let d=0;d<2;d++){const sx=d?e.g.len-x.u:x.u;for(const q of e.q[d])for(const c of q){if(c.s>sx-0.45&&c.s<sx+c.len/2+0.2)return false}}return true}
function holdCross(S,x){x.held=true;if(x.node>=0){const n=S.nodes[x.node];if(!n.xBusy)n.xBusy=new Map();n.xBusy.set(x.eid,(n.xBusy.get(x.eid)||0)+1)}
  else{const e=S.edges[x.eid];(e.mbusy||(e.mbusy=[])).push(x.u)}}
function updateWalkers(S,dt){
  for(let k=S.walkers.length-1;k>=0;k--){const w=S.walkers[k];
    if(!w.dead){
      if(w.ph==="out"){w.t+=dt*w.speed/0.7;if(w.t>=1){w.ph="road";planFinal(S,w)}}
      else if(w.ph==="in"){w.t+=dt*w.speed/0.7;if(w.t>=1)walkerEnd(S,w,false)}
      else if(w.ph==="cross"){const x=w.cur;
        // chodec počká na mezeru; po 3 s si přechod „vyžádá“ a auta mu zastaví
        if(!x.go){w.cw=(w.cw||0)+dt;if(canStartCross(S,w,x)){if(!x.held)holdCross(S,x);x.go=true;w.cw=0}else if(!x.held&&w.cw>3)holdCross(S,x)}
        if(x.go){const L=Math.hypot(x.x1-x.x0,x.y1-x.y0)||0.1;w.t+=dt*w.speed/L;
          if(w.t>=1){releaseCross(S,w);S.xCount=(S.xCount||0)+1;w.queue.shift();
            if(w.queue.length){w.cur=w.queue[0];w.t=0}
            else{w.cur=null;w.t=0;if(w.afterIn){const to=w.trip.to;if(to&&!to.dead&&to.front!==undefined)w.ph="in";else walkerEnd(S,w,false)}else{w.ph="road";planFinal(S,w)}}}}}
      else{w.s+=w.speed*dt;
        while(!w.dead&&w.ph==="road"){const l=w.links[w.li],e=S.edges[l>>1];if(!e||e.dead){walkerEnd(S,w,true);break}
          const last=w.li===w.links.length-1;
          if(last&&w.xAt>=0&&w.s>=w.xAt){w.s=w.xAt;const x=midCross(S,w,l,w.s);x.zebra=!!w.xZebra;w.sd=-w.sd;const atEnd=w.xAt>=w.sEnd-0.01;w.xAt=-1;
            w.queue=[x];w.cur=x;w.ph="cross";w.t=0;w.afterIn=atEnd;break}
          if(last){if(w.s>=w.sEnd){w.s=w.sEnd;const to=w.trip.to;if(to&&!to.dead&&to.front!==undefined){w.ph="in";w.t=0}else walkerEnd(S,w,false)}break}
          if(w.s>=e.g.len){const nl=w.links[w.li+1];const r=walkerTurn(S,w,l,nl,w.li+1===w.links.length-1?w.goalSd:undefined);
            w.s-=e.g.len;w.li++;w.sd=r.sd;
            if(r.items.length){w.queue=r.items;w.cur=r.items[0];w.ph="cross";w.t=0;w.afterIn=false;w.carry=w.s;w.s=0;break}
            planFinal(S,w)}
          else break}}}
    if(w.dead){S.walkers[k]=S.walkers[S.walkers.length-1];S.walkers.pop()}}}
