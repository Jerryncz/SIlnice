// ---- Hlášení: hráč popíše, co vidí, očísluje prvky na mapě a uloží snímek, popis, celý stav hry ----
// a posledních 30 s pohybu do složky hlaseni vedle hry (File System Access v Chrome a Edge; jinde
// jeden soubor ke stažení). Stav se nahraje v Pravidla → Test → Nahrát stav nebo v tests/hlaseni.js.

const REP_HIST=60,REP_DT=0.5,REP_COL="#d6336c";   // historie: 60 vzorků po 0,5 s herního času
let repHist=[],repHistT=-1,repHistS=null,repDirH=null;
const r3=v=>typeof v==="number"&&isFinite(v)?Math.round(v*1000)/1000:null;
// průběžná historie poloh a stavů aut a chodců (volá ji hlavní smyčka)
function recordHistory(){if(repHistS!==S){repHist=[];repHistT=-1;repHistS=S}if(S.time-repHistT<REP_DT-1e-9)return;repHistT=S.time;
  const cars=[];for(const c of S.cars){if(c.dead)continue;const q=carPose(c);const l=c.state==="drive"?c.links[c.li]:-1;
    cars.push([c.id,q?r3(q.x):null,q?r3(q.y):null,c.state,l,c.lane,r3(c.s),r3(c.v),r3(c.wait||0),c.conn?c.conn.node:-1])}
  const walkers=[];for(const w of S.walkers){if(w.dead)continue;const q=walkerPose(w);walkers.push([w.id,q?r3(q[0]):null,q?r3(q[1]):null,w.state])}
  repHist.push({t:r3(S.time),cars,walkers});if(repHist.length>REP_HIST)repHist.shift()}

// ---- režim hlášení ----
function reportOpen(){if(UI.report)return;UI.report={marks:[],prevSpeed:speed};setSpeed(0);UI.draw=null;UI.plan=null;UI.editDrag=null;UI.connDrag=null;UI.pinned=null;
  $("report").hidden=false;$("repBtn").setAttribute("aria-pressed","true");$("repText").value="";renderMarks();updateRepDir();UI.selDirty=true;setTimeout(()=>{try{$("repText").focus()}catch(e){}},0)}
function reportClose(){const r=UI.report;if(!r)return;UI.report=null;$("report").hidden=true;$("repBtn").setAttribute("aria-pressed","false");setSpeed(r.prevSpeed);UI.selDirty=true}
const bName=b=>!b?"–":b.isGate?"svět (okraj mapy)":(isHome(b)?b.name:KIND[b.type]?KIND[b.type].name:b.type)+(b.town&&b.town.name?" ("+b.town.name+")":"")+(b.id!==undefined?" #"+b.id:"");
// klik do mapy v režimu hlášení: auto / chodec / budova / křižovatka / úsek / místo
function reportMark(wx,wy){const r=UI.report;if(!r)return;const mv=pickMover(wx,wy),h=mv?null:hitTest(wx,wy);let m;
  if(mv&&mv.type==="car")m={type:"car",o:mv.c};else if(mv&&mv.type==="walker")m={type:"walker",o:mv.w};
  else if(h&&h.type==="bld")m={type:"bld",o:h.b};else if(h&&h.type==="node")m={type:"node",o:S.nodes[h.id]};
  else if(h&&h.type==="edge"){const e=S.edges[h.id];m={type:"edge",o:e,u:nearestOn(e.g,wx,wy).u}}
  else m={type:"point",x:wx,y:wy};
  if(m.o&&r.marks.some(q=>q.o===m.o)){toast("Tenhle prvek už v hlášení je");return}
  m.note="";r.marks.push(m);renderMarks()}
function markPos(m){const o=m.o;
  if(m.type==="car"){const q=!o.dead&&carPose(o);if(q)m.last=[q.x,q.y];return m.last||null}
  if(m.type==="walker"){const q=!o.dead&&walkerPose(o);if(q)m.last=[q[0],q[1]];return m.last||null}
  if(m.type==="bld"){let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;for(const j of o.tiles){const x=wxOf(j),y=wyOf(j);x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y)}m.box=[x0-CS/2,y0-CS/2,x1+CS/2,y1+CS/2];return [(x0+x1)/2,(y0+y1)/2]}
  if(m.type==="node")return [o.x,o.y];
  if(m.type==="edge"){if(o.dead)return m.last||null;const p=pointAt(o.g,Math.min(m.u,o.g.len));m.last=[p.x,p.y];return m.last}
  return [m.x,m.y]}
function markLabel(m){const o=m.o;
  if(m.type==="car")return (o.truck?"Nákladní auto ":"Auto ")+o.id+(o.dead?" (už nejede)":"");
  if(m.type==="walker")return "Chodec "+o.id+(o.dead?" (už nejde)":"");
  if(m.type==="bld")return bName(o)+(o.dead?" (zbouráno)":"");
  if(m.type==="node")return (o.edges.length>=3?"Křižovatka ":"Uzel ")+o.id;
  if(m.type==="edge")return "Úsek "+o.id+" · "+RK[o.kind].name+" "+o.lf+"+"+o.lb+(o.dead?" (už není)":"");
  return "Místo "+m.x.toFixed(1)+", "+m.y.toFixed(1)}
// podrobnosti pro popis.md (pro Claude)
function markDetail(m){const o=m.o,f=v=>v===undefined||v===null?"–":typeof v==="number"?String(r3(v)):String(v);
  if(m.type==="car"){const t=o.trip||{};const l=o.state==="drive"?o.links[o.li]:o.state==="exit"?o.links[0]:-1;const e=l>=0?S.edges[l>>1]:null;
    return `id ${o.id}, stav ${o.state}`+(l>=0?`, úsek ${l>>1} směr ${l&1} pruh ${o.lane}, poloha ${f(o.s)} z ${f(e&&e.g.len)}`:"")+`, rychlost ${f(o.v)}, čeká ${f(o.wait)} s`+
      (o.conn?`, v křižovatce ${o.conn.node}`:"")+(o.turnWait?", čeká na odbočení":"")+`, trasa úsek ${o.li+1} z ${o.links?o.links.length:0}, účel ${f(t.purpose)}, z ${bName(t.from)} do ${bName(t.to)}`}
  if(m.type==="walker"){const t=o.trip||{};return `id ${o.id}, stav ${o.state}, čeká ${f(o.wait)} s, z ${bName(t.from)} do ${bName(t.to)}`}
  if(m.type==="bld")return `id ${o.id}, druh ${o.type}, ${o.tiles.length} buněk, obyvatel ${f(o.pop)}, na parkovišti ${f(o.parked)} z ${f(o.cap)}, příjezd `+(o.access?`úsek ${o.access.e} u ${f(o.access.u)} strana ${o.access.side}`:"žádný");
  if(m.type==="node"){const C=["automaticky","přednost zprava","hlavní silnice","semafor"];return `id ${o.id}, ${o.edges.length} ${o.edges.length>=2&&o.edges.length<=4?"ramena":"ramen"} (úseky ${o.edges.join(", ")}), pravidlo ${C[o.ctl]||o.ctl} (${o.eff}), v ploše ${o.box.length} aut`+(o.ring?", kruhový objezd":"")+`, poloha ${f(o.x)}, ${f(o.y)}`}
  if(m.type==="edge")return `id ${o.id}, ${RK[o.kind].name}, pruhy ${o.lf}+${o.lb}, délka ${f(o.g.len)}, uzly ${o.a} → ${o.b}, vytížení ${f(o.cong[0])} / ${f(o.cong[1])}, aut ve frontách ${o.q[0].reduce((a,q)=>a+q.length,0)} / ${o.q[1].reduce((a,q)=>a+q.length,0)}, klik u ${f(m.u)}`;
  const c=cellAt(m.x,m.y);return `poloha ${f(m.x)}, ${f(m.y)}, buňka ${c}, terén ${c>=0?S.terrain[c]:"–"}, silnic v buňce ${c>=0?S.roadCnt[c]:0}`}
function markData(m,i){const p=markPos(m);return {n:i+1,type:m.type,id:m.o?m.o.id:null,x:p?r3(p[0]):null,y:p?r3(p[1]):null,u:m.u!==undefined?r3(m.u):undefined,note:m.note,label:markLabel(m),detail:markDetail(m)}}
function renderMarks(){const r=UI.report;if(!r)return;const ol=$("repMarks");ol.innerHTML="";
  if(!r.marks.length){const li=document.createElement("li");li.className="empty";li.textContent="Zatím nic. Klikni do mapy na to, o čem píšeš.";ol.appendChild(li);return}
  r.marks.forEach((m,i)=>{const li=document.createElement("li");const n=document.createElement("b");n.textContent=i+1;const sp=document.createElement("span");sp.textContent=markLabel(m);
    const inp=document.createElement("input");inp.type="text";inp.placeholder="poznámka";inp.value=m.note;inp.addEventListener("input",()=>{m.note=inp.value});
    const x=document.createElement("button");x.type="button";x.textContent="×";x.title="Odebrat";x.setAttribute("aria-label","Odebrat "+(i+1));x.addEventListener("click",()=>{r.marks.splice(i,1);renderMarks()});
    li.append(n,sp,x,inp);ol.appendChild(li)})}
// čísla na mapě (a tím i na snímku)
function drawReport(){const r=UI.report;if(!r||!r.marks.length)return;const z=cam.z,R=Math.max(0.16,10/z);
  ctx.save();ctx.lineWidth=Math.max(0.03,2.5/z);ctx.strokeStyle=REP_COL;ctx.textAlign="center";ctx.textBaseline="middle";ctx.font=`600 ${Math.max(0.12,11/z)}px "IBM Plex Sans",system-ui,sans-serif`;
  r.marks.forEach((m,i)=>{const p=markPos(m);if(!p)return;
    if(m.type==="edge"&&!m.o.dead){ctx.save();ctx.globalAlpha=0.35;ctx.lineWidth=m.o.w||0.6;ctx.lineCap="butt";const q=m.o.g.pts;ctx.beginPath();ctx.moveTo(q[0],q[1]);for(let k=2;k<q.length;k+=2)ctx.lineTo(q[k],q[k+1]);ctx.stroke();ctx.restore()}
    if(m.type==="bld"&&m.box){const b=m.box;ctx.strokeRect(b[0],b[1],b[2]-b[0],b[3]-b[1])}
    else{ctx.beginPath();ctx.arc(p[0],p[1],R,0,Math.PI*2);ctx.stroke()}
    const bx=p[0]+R*0.95,by=p[1]-R*0.95;ctx.fillStyle=REP_COL;ctx.beginPath();ctx.arc(bx,by,R*0.75,0,Math.PI*2);ctx.fill();ctx.fillStyle="#fff";ctx.fillText(String(i+1),bx,by+R*0.03)});
  ctx.restore()}

// ---- uložení ----
const pad2=v=>String(v).padStart(2,"0");
const clock=S0=>{const h=hourOf(S0);return pad2(Math.floor(h))+":"+pad2(Math.floor((h%1)*60))};
function repSlug(t){return t.normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim().split(" ").slice(0,5).join("-").slice(0,32)}
async function gzipBlob(text){if(typeof CompressionStream==="undefined")return null;return await new Response(new Blob([text]).stream().pipeThrough(new CompressionStream("gzip"))).blob()}
function popisMd(meta){const L=[];const d=new Date(meta.saved);
  L.push("# Hlášení "+meta.id,"");
  L.push(`- Uloženo: ${d.getDate()}. ${d.getMonth()+1}. ${d.getFullYear()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`);
  L.push(`- Hra: verze ${meta.game}, sestavení ${meta.build}, mapa (seed) ${meta.seed}`);
  L.push(`- Herní čas: den ${meta.day}, ${meta.clock} (S.time ${meta.time} s), rychlost před hlášením ${meta.speed}×`);
  L.push(`- Výřez: střed ${meta.camera.center.map(v=>r3(v)).join(", ")}, přiblížení ${r3(meta.camera.z)} px na pole, nástroj ${meta.tool}${meta.overlay?", vytížení zapnuté":""}`);
  L.push(`- Soubory: mapa.png (snímek s čísly)`+(meta.files.includes("stav.json.gz")?", stav.json.gz (celý stav: Pravidla → Test → Nahrát stav, nebo node tests/hlaseni.js)":"")+(meta.files.includes("historie.json.gz")?", historie.json.gz (posledních "+Math.round(meta.histSec)+" s pohybu)":""));
  if(meta.stateError)L.push("- Stav se nepodařilo uložit: "+meta.stateError);
  L.push("","## Popis","",meta.text||"(bez popisu)","","## Vybrané prvky","");
  if(!meta.marks.length)L.push("(žádné)");
  for(const m of meta.marks){L.push(`${m.n}. **${m.label}**`+(m.note?" – "+m.note:""));L.push("   "+m.detail)}
  return L.join("\n")+"\n"}
// IndexedDB: pamatuje si vybranou složku (FileSystemDirectoryHandle) mezi spuštěními
function idbOpen(){return new Promise((res,rej)=>{const q=indexedDB.open("osady",1);q.onupgradeneeded=()=>q.result.createObjectStore("kv");q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)})}
async function kvGet(k){try{const db=await idbOpen();return await new Promise(res=>{const t=db.transaction("kv").objectStore("kv").get(k);t.onsuccess=()=>res(t.result||null);t.onerror=()=>res(null)})}catch(e){return null}}
async function kvSet(k,v){try{const db=await idbOpen();await new Promise(res=>{const t=db.transaction("kv","readwrite");t.objectStore("kv").put(v,k);t.oncomplete=res;t.onerror=res})}catch(e){}}
// složka pro hlášení: zapamatovaná (s povolením zápisu), jinak výběr; pick = vždy vybrat znovu
async function reportDir(pick){if(!window.showDirectoryPicker)return null;
  let h=pick?null:repDirH||await kvGet("hlaseni");
  if(h){let p="denied";try{p=await h.queryPermission({mode:"readwrite"});if(p!=="granted")p=await h.requestPermission({mode:"readwrite"})}catch(e){}if(p==="granted"){repDirH=h;return h}}
  h=await window.showDirectoryPicker({id:"osady-hlaseni",mode:"readwrite"});repDirH=h;await kvSet("hlaseni",h);updateRepDir();return h}
async function updateRepDir(){const el=$("repDir");if(!window.showDirectoryPicker){el.textContent="Tento prohlížeč neumí zapisovat do složky: hlášení se stáhne jako jeden soubor.";$("repPick").hidden=true;return}
  const h=repDirH||await kvGet("hlaseni");el.textContent=h?"Složka: "+h.name:"Složka: vybereš při prvním uložení (OneDrive\\GIT\\Silnice\\hlaseni)";$("repPick").hidden=false}
async function writeReport(dir,id,files){
  if(dir){const d=await dir.getDirectoryHandle(id,{create:true});for(const [n,b] of files){const fh=await d.getFileHandle(n,{create:true});const w=await fh.createWritable();await w.write(b);await w.close()}return dir.name+"/"+id}
  // záloha bez přístupu ke složce: jeden soubor ke stažení (tests/hlaseni.js ho umí přečíst)
  const pack={format:"osady-hlaseni",id,files:{}};for(const [n,b] of files)pack.files[n]=b64enc(new Uint8Array(await b.arrayBuffer()));
  const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify(pack)],{type:"application/json"}));a.download="hlaseni_"+id+".json";
  document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},5000);return "soubor ke stažení hlaseni_"+id+".json"}
async function reportSave(){const r=UI.report;if(!r)return;const btn=$("repSave");if(btn.disabled)return;btn.disabled=true;
  try{let dir=null;
    // složku vybrat hned po kliknutí (prohlížeč to dovolí jen krátce po kliknutí)
    if(window.showDirectoryPicker){try{dir=await reportDir(false)}catch(e){if(e&&e.name==="AbortError"){toast("Hlášení neuloženo: nebyla vybrána složka");return}dir=null}}
    const text=$("repText").value.trim(),now=new Date();
    const id=`${now.getFullYear()}-${pad2(now.getMonth()+1)}-${pad2(now.getDate())}_${pad2(now.getHours())}${pad2(now.getMinutes())}${pad2(now.getSeconds())}`+(repSlug(text)?"_"+repSlug(text):"");
    render();const png=await new Promise(res=>cv.toBlob(res,"image/png"));
    const c=toWorld(vw/2,vh/2);
    const meta={format:"osady-hlaseni",id,text,saved:now.toISOString(),game:GAME_VERSION,build:typeof BUILD_ID!=="undefined"?BUILD_ID:"?",seed:S.seed,time:r3(S.time),day:dayOf(S),clock:clock(S),
      speed:r.prevSpeed,camera:{x:cam.x,y:cam.y,z:cam.z,vw,vh,center:c},tool:UI.tool,overlay,histSec:repHist.length?repHist[repHist.length-1].t-repHist[0].t:0,marks:r.marks.map(markData),files:["popis.md","hlaseni.json","mapa.png"]};
    const files=[];if(png)files.push(["mapa.png",png]);
    let stav=null;try{stav=saveState(S,{saved:meta.saved,build:meta.build,camera:meta.camera})}catch(e){meta.stateError=e.message}
    if(stav){const gz=await gzipBlob(stav);if(gz){files.push(["stav.json.gz",gz]);meta.files.push("stav.json.gz")}else{files.push(["stav.json",new Blob([stav])]);meta.files.push("stav.json")}}
    const hist=JSON.stringify({dt:REP_DT,cars:["id","x","y","stav","odkaz (úsek*2+směr)","pruh","s","v","čeká","křižovatka"],walkers:["id","x","y","stav"],samples:repHist});
    const hg=await gzipBlob(hist);if(hg){files.push(["historie.json.gz",hg]);meta.files.push("historie.json.gz")}
    files.unshift(["popis.md",new Blob([popisMd(meta)],{type:"text/markdown"})],["hlaseni.json",new Blob([JSON.stringify(meta,null,1)],{type:"application/json"})]);
    const where=await writeReport(dir,id,files);toast("Hlášení uloženo: "+where);reportClose()}
  catch(e){toast("Hlášení se nepodařilo uložit: "+(e&&e.message||e))}
  finally{btn.disabled=false}}

// ---- nahrání stavu (Pravidla → Test) ----
async function readStateFile(file){let J;
  if(/\.gz$/i.test(file.name)){if(typeof DecompressionStream==="undefined")throw new Error("Prohlížeč neumí rozbalit .gz");J=JSON.parse(await new Response(file.stream().pipeThrough(new DecompressionStream("gzip"))).text())}
  else J=JSON.parse(await file.text());
  // záložní soubor hlášení (vše v jednom): vytáhnout stav
  if(J&&J.format==="osady-hlaseni"&&J.files){const gz=J.files["stav.json.gz"],raw=J.files["stav.json"];if(!gz&&!raw)throw new Error("V hlášení není uložený stav.");
    const u8=b64dec(gz||raw);const blob=new Blob([u8]);J=JSON.parse(gz?await new Response(blob.stream().pipeThrough(new DecompressionStream("gzip"))).text():await blob.text())}
  return J}
function applyLoaded(J){const S2=loadState(J);S=S2;repHist=[];repHistS=S;UI.pinned=null;UI.hover=null;UI.draw=null;UI.plan=null;UI.editEdge=null;UI.editDrag=null;UI.connNode=null;UI.connDrag=null;
  if(UI.report)reportClose();hideConfirm();readColors();applySettings();
  if(J.camera&&J.camera.center){cam.z=clamp(J.camera.z,zmin,200);cam.x=J.camera.center[0]*cam.z-vw/2;cam.y=J.camera.center[1]*cam.z-vh/2;clampCam()}else fit();
  lastLogLen=-1;lastProbKey="";lastOptsKey="";setSpeed(0);updateUI();toast("Stav nahrán: den "+dayOf(S)+", "+clock(S)+". Hra stojí.")}
async function loadStateFile(file){$("help").hidden=true;
  try{const J=await readStateFile(file);
    if(J.game!==GAME_VERSION)askConfirm(`Stav je z verze ${J.game}, hra je ${GAME_VERSION}. Nahrát i tak? (může selhat)`,"Nahrát",()=>{try{applyLoaded(J)}catch(e){toast("Stav se nepodařilo nahrát: "+e.message)}});
    else applyLoaded(J)}
  catch(e){toast("Stav se nepodařilo nahrát: "+(e&&e.message||e))}}

$("repBtn").addEventListener("click",()=>{if(UI.report)reportClose();else reportOpen()});
$("repSave").addEventListener("click",reportSave);
$("repCancel").addEventListener("click",reportClose);
$("repPick").addEventListener("click",async()=>{try{await reportDir(true)}catch(e){}});
$("loadState").addEventListener("click",()=>$("stateFile").click());
$("stateFile").addEventListener("change",e=>{const f=e.target.files&&e.target.files[0];e.target.value="";if(f)loadStateFile(f)});
