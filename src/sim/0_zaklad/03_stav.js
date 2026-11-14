// Uložení a nahrání celého stavu simulace (hlášení ze hry, nástroj tests/hlaseni.js).
// Stav je graf objektů s odkazy (auto → budova → obec, fronty pruhů → auta, Map, Set, typovaná pole).
// Ukládá se obecně: každý objekt dostane číslo a odkazy se zapíšou jako {$r: číslo}, takže se nahraje
// přesně stejný graf a simulace pokračuje stejně (i náhoda: stav generátoru S.R.s).
// Klíče začínající „_“ jsou mezipaměti kreslení a neukládají se. Neznámá funkce nebo třída = chyba
// (aby se nový druh dat nezapomněl potichu).

const STATE_FORMAT=1;
const STATE_CLASSES={Heap};
const B64="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
function b64enc(u8){let out="";const n=u8.length;let i=0;
  for(;i+2<n;i+=3){const v=u8[i]<<16|u8[i+1]<<8|u8[i+2];out+=B64[v>>18&63]+B64[v>>12&63]+B64[v>>6&63]+B64[v&63]}
  if(i<n){const v=u8[i]<<16|(i+1<n?u8[i+1]<<8:0);out+=B64[v>>18&63]+B64[v>>12&63]+(i+1<n?B64[v>>6&63]:"=")+"="}return out}
function b64dec(s){const L=new Int16Array(128).fill(-1);for(let k=0;k<64;k++)L[B64.charCodeAt(k)]=k;
  let pad=0;if(s.endsWith("=="))pad=2;else if(s.endsWith("="))pad=1;const n=s.length/4*3-pad,u8=new Uint8Array(n);let j=0;
  for(let i=0;i<s.length;i+=4){const v=L[s.charCodeAt(i)]<<18|L[s.charCodeAt(i+1)]<<12|(L[s.charCodeAt(i+2)]&63)<<6|(L[s.charCodeAt(i+3)]&63);
    if(j<n)u8[j++]=v>>16&255;if(j<n)u8[j++]=v>>8&255;if(j<n)u8[j++]=v&255}return u8}
const TYPED={Uint8Array,Uint16Array,Int16Array,Int32Array,Uint32Array,Float32Array,Float64Array,Int8Array,Uint8ClampedArray};

// vrací text JSON; extra = údaje navíc do hlavičky (čas uložení, kamera …)
function saveState(S,extra){const ids=new Map(),objs=[],queue=[];
  const ref=o=>{let id=ids.get(o);if(id===undefined){id=objs.length;ids.set(o,id);objs.push(null);queue.push(o)}return id};
  const enc=v=>{const t=typeof v;
    if(v===null||t==="string"||t==="boolean")return v;
    if(t==="number")return Number.isFinite(v)?v:{$n:String(v)};
    if(t==="undefined")return {$u:1};
    if(t==="function"){if(v===S.R)return {$rng:v.s|0};if(v.F)return {$fw:ref(v.F)};throw new Error("Stav: neznámou funkci nejde uložit")}
    if(t==="object")return {$r:ref(v)};
    throw new Error("Stav: hodnotu typu "+t+" nejde uložit")};
  const obj=o=>{const r={};for(const k of Object.keys(o)){if(k.charCodeAt(0)===95)continue;r[k]=enc(o[k])}return r};
  ref(S);
  for(let qi=0;qi<queue.length;qi++){const o=queue[qi],id=ids.get(o);let e;
    if(Array.isArray(o)){const a=new Array(o.length);for(let k=0;k<o.length;k++)a[k]=enc(o[k]);e={a}}
    else if(ArrayBuffer.isView(o)){const nm=o.constructor.name;if(!TYPED[nm])throw new Error("Stav: pole "+nm+" nejde uložit");e={t:nm,d:b64enc(new Uint8Array(o.buffer,o.byteOffset,o.byteLength))}}
    else if(o instanceof Map){const m=[];for(const [k,v] of o)m.push([enc(k),enc(v)]);e={m}}
    else if(o instanceof Set){const s=[];for(const v of o)s.push(enc(v));e={s}}
    else{const P=Object.getPrototypeOf(o);if(P===Object.prototype||P===null)e={o:obj(o)};
      else{const cn=P.constructor&&P.constructor.name;if(!STATE_CLASSES[cn])throw new Error("Stav: objekt třídy "+cn+" nejde uložit");e={c:cn,o:obj(o)}}}
    objs[id]=e}
  return JSON.stringify(Object.assign({format:"osady-stav",formatVersion:STATE_FORMAT,game:GAME_VERSION},extra||{},{objs}))}

// text JSON (nebo už přečtený objekt) → stav simulace S
function loadState(src){const J=typeof src==="string"?JSON.parse(src):src;
  if(!J||J.format!=="osady-stav")throw new Error("Tohle není uložený stav hry.");
  if(J.formatVersion!==STATE_FORMAT)throw new Error("Stav je ve formátu "+J.formatVersion+", hra umí "+STATE_FORMAT+".");
  const E=J.objs,O=new Array(E.length),fix=[];
  for(let i=0;i<E.length;i++){const e=E[i];
    if(e.a)O[i]=new Array(e.a.length);
    else if(e.t){const C=TYPED[e.t];if(!C)throw new Error("Stav: neznámé pole "+e.t);const u8=b64dec(e.d);O[i]=new C(u8.buffer,0,u8.byteLength/C.BYTES_PER_ELEMENT)}
    else if(e.m)O[i]=new Map();else if(e.s)O[i]=new Set();
    else if(e.c){const C=STATE_CLASSES[e.c];if(!C)throw new Error("Stav: neznámá třída "+e.c);O[i]=Object.create(C.prototype)}
    else O[i]={}}
  const dec=(v,host,key)=>{if(v===null||typeof v!=="object")return v;
    if(v.$r!==undefined)return O[v.$r];if(v.$n!==undefined)return Number(v.$n);if(v.$u)return undefined;
    if(v.$rng!==undefined)return mulberry32(v.$rng);if(v.$fw!==undefined){fix.push([host,key,v.$fw]);return null}
    throw new Error("Stav: neznámá hodnota")};
  for(let i=0;i<E.length;i++){const e=E[i],o=O[i];
    if(e.a){for(let k=0;k<e.a.length;k++)o[k]=dec(e.a[k],o,k)}
    else if(e.m){for(const [k,v] of e.m)o.set(dec(k),dec(v))}
    else if(e.s){for(const v of e.s)o.add(dec(v))}
    else if(e.o){for(const k in e.o)o[k]=dec(e.o[k],o,k)}}
  for(const [host,key,fid] of fix)host[key]=frameW(O[fid]);
  return O[0]}
