// Geometrie úseků: lomené čáry s délkami a normálami (vpravo od směru a→b).

function mkLine(x0,y0,x1,y1){const L=Math.hypot(x1-x0,y1-y0),n=Math.max(1,Math.ceil(L/0.25)),p=[];for(let k=0;k<=n;k++){const t=k/n;p.push(x0+(x1-x0)*t,y0+(y1-y0)*t)}return p}
function mkBezier(x0,y0,cx,cy,x1,y1){const L=Math.hypot(cx-x0,cy-y0)+Math.hypot(x1-cx,y1-cy);const n=Math.max(2,Math.ceil(L/0.2)),p=[];
  for(let k=0;k<=n;k++){const t=k/n,a=(1-t)*(1-t),b=2*(1-t)*t,c=t*t;p.push(a*x0+b*cx+c*x1,a*y0+b*cy+c*y1)}return p}
// kubická Bézierova křivka (plynulé napojení)
function mkCubic(x0,y0,x1,y1,x2,y2,x3,y3){const L=Math.hypot(x1-x0,y1-y0)+Math.hypot(x2-x1,y2-y1)+Math.hypot(x3-x2,y3-y2);const n=Math.max(3,Math.ceil(L/0.2)),p=[];
  for(let k=0;k<=n;k++){const t=k/n,u=1-t,a=u*u*u,b=3*u*u*t,c=3*u*t*t,d=t*t*t;p.push(a*x0+b*x1+c*x2+d*x3,a*y0+b*y1+c*y2+d*y3)}return p}
function mkArc(cx,cy,r,a0,a1){const n=Math.max(2,Math.ceil(Math.abs(a1-a0)*r/0.2)),p=[];for(let k=0;k<=n;k++){const a=a0+(a1-a0)*k/n;p.push(cx+Math.cos(a)*r,cy+Math.sin(a)*r)}return p}
function geom(pts){
  const n=pts.length/2,cum=new Float64Array(n),nx=new Float64Array(n),ny=new Float64Array(n);
  for(let i=1;i<n;i++)cum[i]=cum[i-1]+Math.hypot(pts[2*i]-pts[2*i-2],pts[2*i+1]-pts[2*i-1]);
  for(let i=0;i<n;i++){const a=Math.max(0,i-1),b=Math.min(n-1,i+1);let dx=pts[2*b]-pts[2*a],dy=pts[2*b+1]-pts[2*a+1];const l=Math.hypot(dx,dy)||1;dx/=l;dy/=l;nx[i]=-dy;ny[i]=dx}
  let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;for(let i=0;i<n;i++){const x=pts[2*i],y=pts[2*i+1];if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y}
  return {pts,n,cum,nx,ny,len:cum[n-1],bb:[x0,y0,x1,y1]}}
function segIndex(g,u){let lo=0,hi=g.n-1;if(u<=0)return 0;if(u>=g.len)return g.n-2;while(hi-lo>1){const m=(lo+hi)>>1;if(g.cum[m]<=u)lo=m;else hi=m}return lo}
// bod a normála ve vzdálenosti u od začátku
function pointAt(g,u,out){const i=segIndex(g,u),seg=g.cum[i+1]-g.cum[i]||1,t=clamp((u-g.cum[i])/seg,0,1);const p=g.pts;
  out=out||{};out.x=p[2*i]+(p[2*i+2]-p[2*i])*t;out.y=p[2*i+1]+(p[2*i+3]-p[2*i+1])*t;
  let dx=p[2*i+2]-p[2*i],dy=p[2*i+3]-p[2*i+1];const l=Math.hypot(dx,dy)||1;out.tx=dx/l;out.ty=dy/l;out.nx=-out.ty;out.ny=out.tx;return out}
function nearestOn(g,x,y){let best=1e9,bu=0,bx=0,by=0;const p=g.pts;
  for(let i=0;i<g.n-1;i++){const ax=p[2*i],ay=p[2*i+1],bx2=p[2*i+2],by2=p[2*i+3];const vx=bx2-ax,vy=by2-ay,l2=vx*vx+vy*vy||1;let t=((x-ax)*vx+(y-ay)*vy)/l2;t=clamp(t,0,1);
    const qx=ax+vx*t,qy=ay+vy*t,d=Math.hypot(x-qx,y-qy);if(d<best){best=d;bu=g.cum[i]+t*(g.cum[i+1]-g.cum[i]);bx=qx;by=qy}}
  return {u:bu,d:best,x:bx,y:by}}
function segInter(ax,ay,bx,by,cx,cy,dx,dy){const r1=bx-ax,r2=by-ay,s1=dx-cx,s2=dy-cy;const den=r1*s2-r2*s1;if(Math.abs(den)<1e-9)return null;
  const t=((cx-ax)*s2-(cy-ay)*s1)/den,u=((cx-ax)*r2-(cy-ay)*r1)/den;if(t<0||t>1||u<0||u>1)return null;return [t,u]}
function bbOverlap(a,b,m){return !(a[2]+m<b[0]||b[2]+m<a[0]||a[3]+m<b[1]||b[3]+m<a[1])}
// průsečíky dvou lomených čar: [{ua, ub, x, y}]
function polyInter(ga,gb){const out=[];if(!bbOverlap(ga.bb,gb.bb,0.01))return out;const pa=ga.pts,pb=gb.pts;
  for(let i=0;i<ga.n-1;i++){const ax=pa[2*i],ay=pa[2*i+1],bx=pa[2*i+2],by=pa[2*i+3];
    const x0=Math.min(ax,bx),x1=Math.max(ax,bx),y0=Math.min(ay,by),y1=Math.max(ay,by);
    for(let j=0;j<gb.n-1;j++){const cx=pb[2*j],cy=pb[2*j+1],dx=pb[2*j+2],dy=pb[2*j+3];
      if(Math.max(cx,dx)<x0||Math.min(cx,dx)>x1||Math.max(cy,dy)<y0||Math.min(cy,dy)>y1)continue;
      const r=segInter(ax,ay,bx,by,cx,cy,dx,dy);if(!r)continue;
      const ua=ga.cum[i]+r[0]*(ga.cum[i+1]-ga.cum[i]),ub=gb.cum[j]+r[1]*(gb.cum[j+1]-gb.cum[j]);
      if(out.some(o=>Math.abs(o.ua-ua)<0.05))continue;
      out.push({ua,ub,x:ax+(bx-ax)*r[0],y:ay+(by-ay)*r[0]})}}
  return out}
// rozdělí body lomené čáry ve vzdálenosti u
function splitPts(g,u){const i=segIndex(g,u),q=pointAt(g,u),p=g.pts;const A=[],B=[];
  for(let k=0;k<=i;k++)A.push(p[2*k],p[2*k+1]);A.push(q.x,q.y);B.push(q.x,q.y);for(let k=i+1;k<g.n;k++)B.push(p[2*k],p[2*k+1]);
  return [cleanPts(A),cleanPts(B)]}
function subPts(g,u0,u1){const p=g.pts,out=[];const a=pointAt(g,u0);out.push(a.x,a.y);for(let k=0;k<g.n;k++){if(g.cum[k]>u0+1e-6&&g.cum[k]<u1-1e-6)out.push(p[2*k],p[2*k+1])}const b=pointAt(g,u1);out.push(b.x,b.y);return cleanPts(out)}
function cleanPts(p){const o=[p[0],p[1]];for(let k=2;k<p.length;k+=2){if(Math.hypot(p[k]-o[o.length-2],p[k+1]-o[o.length-1])>0.02)o.push(p[k],p[k+1])}if(o.length<4){o.push(p[p.length-2]+1e-3,p[p.length-1])}return o}
function reversePts(p){const o=[];for(let k=p.length-2;k>=0;k-=2)o.push(p[k],p[k+1]);return o}
