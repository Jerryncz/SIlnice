"use strict";
// Osady a cesty – simulace (bez DOM). Soubory v src/sim se skládají v abecedním
// pořadí do <script id="sim"> v index.html (build.js) a testují se v Node.js.

const GAME_VERSION="0.13.0";
const MW=128,MH=80;                         // mapa ve světových jednotkách (1 = pole silnice)
const CS=0.5,W=MW*2,H=MH*2,N=W*H;           // jemná síť terénu a budov: buňka = půl pole
const STEP=1/30,BASE_SPEED=2.0,MAX_CARS=900,MAX_WALKERS=600;
const DAY=240,DAY_START_HOUR=6;           // jeden herní den = 240 s při rychlosti 1×
const LW=0.26;                              // šířka jízdního pruhu v polích
const GRASS=0,WATER=1,FOREST=2,ROCK=3,ORE=4;
const DX=[1,-1,0,0],DY=[0,0,1,-1];
const NB=new Int32Array(N*4);
(function(){for(let i=0;i<N;i++){const x=i%W,y=(i/W)|0;for(let d=0;d<4;d++){const nx=x+DX[d],ny=y+DY[d];NB[i*4+d]=(nx<0||ny<0||nx>=W||ny>=H)?-1:ny*W+nx}}})();

function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const tx=i=>i%W, ty=i=>(i/W)|0;
const wxOf=i=>(i%W+0.5)*CS, wyOf=i=>(((i/W)|0)+0.5)*CS;   // střed buňky ve světě
const cellAt=(x,y)=>{const cx=Math.floor(x/CS),cy=Math.floor(y/CS);return(cx<0||cy<0||cx>=W||cy>=H)?-1:cy*W+cx};
const distT=(a,b)=>Math.hypot(wxOf(a)-wxOf(b),wyOf(a)-wyOf(b));
// buňky ve čtverci kolem bodu (svět), fn(i)
function forCells(x,y,r,fn){const x0=Math.max(0,Math.floor((x-r)/CS)),x1=Math.min(W-1,Math.floor((x+r)/CS)),y0=Math.max(0,Math.floor((y-r)/CS)),y1=Math.min(H-1,Math.floor((y+r)/CS));
  for(let cy=y0;cy<=y1;cy++)for(let cx=x0;cx<=x1;cx++)fn(cy*W+cx)}
// jednotkové pole (2 × 2 buňky): levá horní buňka
const unitCell=(ux,uy)=>(uy*2)*W+ux*2;

class Heap{constructor(){this.k=[];this.p=[]}get size(){return this.k.length}clear(){this.k.length=0;this.p.length=0}
  peekP(){return this.p[0]}
  push(k,p){const K=this.k,P=this.p;let i=K.length;K.push(k);P.push(p);while(i>0){const j=(i-1)>>1;if(P[j]<=p)break;K[i]=K[j];P[i]=P[j];i=j}K[i]=k;P[i]=p}
  pop(){const K=this.k,P=this.p;const top=K[0];const lk=K.pop(),lp=P.pop();const n=K.length;if(n){let i=0;for(;;){const l=2*i+1;if(l>=n)break;const r=l+1;const m=(r<n&&P[r]<P[l])?r:l;if(P[m]>=lp)break;K[i]=K[m];P[i]=P[m];i=m}K[i]=lk;P[i]=lp}return top}}

function valueNoise(R,cell){const gw=Math.ceil(MW/cell)+2,gh=Math.ceil(MH/cell)+2;const g=new Float32Array(gw*gh);for(let i=0;i<g.length;i++)g[i]=R();
  return (x,y)=>{const fx=x/cell,fy=y/cell,x0=fx|0,y0=fy|0,a1=fx-x0,b1=fy-y0,sx=a1*a1*(3-2*a1),sy=b1*b1*(3-2*b1);const a=g[y0*gw+x0],b=g[y0*gw+x0+1],c=g[(y0+1)*gw+x0],d=g[(y0+1)*gw+x0+1];return a+(b-a)*sx+(c-a)*sy+(a-b-c+d)*sx*sy}}
function pickW(S,arr,wf){let tot=0;for(const a of arr)tot+=wf(a);if(tot<=0)return arr[Math.floor(S.R()*arr.length)];let r=S.R()*tot;for(const a of arr){r-=wf(a);if(r<=0)return a}return arr[arr.length-1]}

const NAMES=["Lhota","Újezd","Vranov","Habry","Dolany","Kostelec","Bystřice","Lipník","Hradiště","Ronov","Skalice","Lomnice","Březí","Doubrava","Sedlec","Chlum","Zahrádky","Jince","Kamenice","Libčany","Pňov","Sobotka","Třebíz","Vlkov","Žďár","Cerhenice","Olešnice","Podhradí","Mezihoří","Bukovina","Javorník","Radošov","Studénka","Klokočov","Hořice","Libuň"];
const ROAD_NAMES=["Mýto","Rozcestí","Zájezd","Křižanov","Hostinec","Formanka"];
const GATE_NAMES=["Praha","Brno","Plzeň","Ostrava","Liberec","Olomouc","Hradec Králové","Pardubice","Jihlava","České Budějovice"];
const ROOFS=["#b4503a","#3d6a9e","#bf8a2a","#7a4a86","#2f8a80","#6f7d33","#a3612f","#4a5aa8","#9c3f5e","#3a7a4a","#8a6d3b","#5b7f9e"];
