// Zkouška křižovatek pod provozem: node tests/krizovatky/zkouska.js [id ...]
// Postaví každý scénář ze scenare.js na prázdné mapě, z každého konce ramen pouští auta do všech
// ostatních konců (slabý a silný provoz) a měří: kolik aut projelo, zdržení proti volné jízdě,
// zaseknutá auta, vynucenou přednost (po 3,5 s čekání), těsná míjení v ploše křižovatky a zablokování.
// Výsledek: tabulka na výstup a tests/krizovatky/vysledky.json (není v gitu).
"use strict";
const vm = require("vm"), fs = require("fs"), path = require("path");
const B = require("../../build.js");

const ctx = { console, Math };
vm.createContext(ctx);
// pokusné opravy (--oprava=1,2,3,4): jen v paměti, zdroják se nemění; ukazují, co by oprava změnila
const OPRAVY = {
  1: ["vjezd do křižovatky jen s místem pro celé auto za ní",
    [["if(rear&&rear.s-rear.len/2-0.12<sIn+c.len/2+0.02)continue;", "if(rear&&rear.s-rear.len/2-0.12<sIn+c.len+0.02)continue;"]]],
  2: ["vzdání podle doby bez pohybu (ne podle součtu pomalé jízdy)",
    [["c.s=ns;", "c.s=ns;if(c.sRef===undefined||c.sRef>c.s||c.s-c.sRef>0.5){c.sRef=c.s;c.still=0}else c.still=(c.still||0)+dt;"],
     ["if(lim>0&&c.wait>lim)", "if(lim>0&&(c.still||0)>lim)"]]],
  3: ["kolize v křižovatce podle oblouků, ne tětiv",
    [["const x=segInter(cn.x0,cn.y0,cn.x3,cn.y3,p.x0,p.y0,p.x3,p.y3);", "const x=connInter(cn,p);"],
     ["function boxFree(S,n,l,nl,lane,cn){", "function connInter(a,b){let pa=bez(a,0);for(let i=1;i<=8;i++){const qa=bez(a,i/8);let pb=bez(b,0);for(let j=1;j<=8;j++){const qb=bez(b,j/8);const x=segInter(pa[0],pa[1],qa[0],qa[1],pb[0],pb[1],qb[0],qb[1]);if(x)return [(i-1+x[0])/8,(j-1+x[1])/8];pb=qb}pa=qa}return null}\nfunction boxFree(S,n,l,nl,lane,cn){"]]],
  4: ["odbočující vlevo dává přednost protijedoucím i bez semaforu",
    [["  const myArm=n.arms.find(a=>a.inLink===l);", "  const myArm=n.arms.find(a=>a.inLink===l);\n  if((eff===\"right\"||eff===\"main\")&&turn===-1&&myArm)for(const a of n.arms){if(a===myArm||!linkLanes(S,a.inLink)||a.hx*myArm.hx+a.hy*myArm.hy>-0.5)continue;if(eff===\"main\"&&n.mainEdges.has(l>>1)&&!n.mainEdges.has(a.e))continue;const e=S.edges[a.e],so=linkOut(S,a.inLink);for(const q of e.q[a.inLink&1]){const f=q[0];if(!f||so-f.s>=1.3)continue;const fl=f.links[f.li+1];if(fl===undefined||turnOf(S,a.inLink,fl)!==-1)return false}}"]]],
  5: ["na semaforu se dva protijedoucí odbočující vlevo nečekají navzájem",
    [["if(a.hx*myArm.hx+a.hy*myArm.hy<-0.5&&armApproaching(S,a,1.5))return false}", "if(a.hx*myArm.hx+a.hy*myArm.hy<-0.5){const e=S.edges[a.e],so=linkOut(S,a.inLink);for(const q of e.q[a.inLink&1]){const f=q[0];if(!f||so-f.s>=1.5)continue;const fl=f.links[f.li+1];if(fl===undefined||turnOf(S,a.inLink,fl)!==-1)return false}}}"]]],
};
const oprArg = (process.argv.find(a => a.startsWith("--oprava=")) || "").slice(9);
const ZAPNUTO = oprArg ? oprArg.split(",").map(Number) : [];
let simSrc = B.simSource();
for (const k of ZAPNUTO) { const o = OPRAVY[k]; if (!o) throw new Error("neznámá oprava " + k);
  for (const [a, b] of o[1]) { if (simSrc.split(a).length !== 2) throw new Error("oprava " + k + " nesedí na zdroj (" + a.slice(0, 40) + "…)"); simSrc = simSrc.replace(a, () => b); } }
vm.runInContext(simSrc, ctx, { filename: "sim.js" });
vm.runInContext(fs.readFileSync(path.join(__dirname, "scenare.js"), "utf8"), ctx, { filename: "scenare.js" });
const X = ctx; X.linkTo = vm.runInContext("linkTo", ctx); X.linkLanes = vm.runInContext("linkLanes", ctx);
const SC = vm.runInContext("KZ_SCENARE", ctx);
const GV = vm.runInContext("GAME_VERSION", ctx), STEP = vm.runInContext("STEP", ctx);

// ---- měření: obal kolem přednosti a příjezdu ----
let M = null;
const permit0 = X.permit;
X.permit = function (S, c, l, nl, turn) {
  const r = permit0(S, c, l, nl, turn);
  if (r && M) { const n = S.nodes[X.linkTo(S, l)]; if (n.eff !== "light" && c.wait > 3.5) { const w = c.wait; c.wait = 0; const r0 = permit0(S, c, l, nl, turn); c.wait = w; if (!r0 && !c._forced) { c._forced = 1; M.vynuceno++; } } }
  return r;
};
const arrive0 = X.arriveVehicle;
X.arriveVehicle = function (S, c) { if (M && c._t0 !== undefined) { M.dojelo++; const t = S.time - c._t0; M.casy.push(t); M.zdrzeni.push(t - c._free); } return arrive0(S, c); };
const giveUp0 = X.giveUp;
X.giveUp = function (S, c) {
  if (M && c._t0 !== undefined && c.state === "drive") { const l = c.links[c.li], n = S.nodes[X.linkTo(S, l)], nl = c.links[c.li + 1];
    const stop = X.stopS(S, l), uStop = stop > 0 && c.s > stop - c.len / 2 - 0.1;
    const t = nl !== undefined && n.turns ? ((n.turns.get(l) || []).find(x => x.link === nl) || {}).turn : "cíl";
    const key = (uStop ? "u stopčáry" : "ve frontě") + " uzel " + n.id + " (" + (n.eff || "-") + ") směr " + t + " pruh " + c.lane;
    M.vzdaloKde[key] = (M.vzdaloKde[key] || 0) + 1; M.stani.push(c._mt !== undefined ? S.time - c._mt : -1); }
  return giveUp0(S, c);
};
const exitFailed0 = X.exitFailed;
X.exitFailed = function (S, c) { if (M && c._t0 !== undefined) M.nevyjelo++; return exitFailed0(S, c); };

function tick(S, dt) {
  S.time += dt;
  if (S.netDirty) X.computeNet(S);
  X.updateReplan(S, dt);
  if (S.reroute.length) { const list = S.reroute; S.reroute = []; for (const c of list) if (!c.dead) X.rerouteVehicle(S, c); }
  X.updateLights(S, dt); X.updateVehicles(S, dt);
  let w = 0; for (let k = 0; k < S.cars.length; k++) { const c = S.cars[k]; if (!c.dead) S.cars[w++] = c; } S.cars.length = w;
  if (++S.congTick >= 3) { S.congTick = 0; X.updateCongestion(S, dt * 3); }
}
// konce ramen: uzel s jedním úsekem; zdroj, když z něj vede pruh ke křižovatce, cíl, když do něj pruh vede
function konce(S) {
  const out = [];
  for (const n of S.nodes) {
    if (n.dead || n.edges.length !== 1) continue; const e = S.edges[n.edges[0]]; if (e.dead) continue;
    const atA = e.a === n.id, L = e.g.len, ven = atA ? 0 : 1, dovnitr = 1 - ven;
    const zdroj = (ven ? e.lb : e.lf) > 0, cil = (dovnitr ? e.lb : e.lf) > 0;
    out.push({ n, e, zdroj, cil, start: { e: e.id, u: atA ? 0.7 : L - 0.7, dirs: [ven] }, goal: { e: e.id, u: atA ? 0.35 : L - 0.35, dirs: [dovnitr], side: dovnitr ? -1 : 1 }, x: n.x, y: n.y });
  }
  return out;
}
function volnaJizda(S, p) {
  let t = 0; for (let k = 0; k < p.links.length; k++) { const l = p.links[k]; let len = S.edges[l >> 1].g.len; if (k === 0) len -= p.s0; if (k === p.links.length - 1) len -= S.edges[l >> 1].g.len - p.sEnd; t += Math.max(0, len) / X.linkSpeed(S, l); }
  return t;
}
function poloha(S, c) {
  if (c.conn) { const cn = c.conn, t = Math.max(0, Math.min(1, (c.s - cn.s0) / cn.len)); const q = X.bez(cn, t); return [q[0], q[1]]; }
  const p = X.lanePose(S, c.links[c.li], c.lane, c.s); return [p.x, p.y];
}
// dvě auta v ploše téže křižovatky blíž než 0,22 pole (auto je 0,5 × ~0,18), která nejedou za sebou v jednom pruhu
function vstupniPruh(S, q) { const l = q.conn.from, L = X.linkLanes(S, l); let b = -1, bd = 9; for (let k = 0; k < L; k++) { const p = X.lanePose(S, l, k, X.stopS(S, l)); const d = Math.hypot(p.x - q.conn.x0, p.y - q.conn.y0); if (d < bd) { bd = d; b = k; } } return b; }
function tesnaMijeni(S) {
  let k = 0;
  for (const n of S.nodes) {
    if (n.dead || !n.box || n.box.length < 2) continue;
    const b = n.box.filter(c => !c.dead && c.conn);
    for (let i = 0; i < b.length; i++) for (let j = i + 1; j < b.length; j++) {
      const a = b[i], c = b[j];
      if (a.conn.to === c.conn.to && a.lane === c.lane) continue;
      if (a.conn.from === c.conn.from && a.conn.to === c.conn.to) continue;
      const pa = poloha(S, a), pc = poloha(S, c);
      if (Math.hypot(pa[0] - pc[0], pa[1] - pc[1]) < 0.22) { const key = a.id < c.id ? a.id + "-" + c.id : c.id + "-" + a.id; if (!M.parySet.has(key)) { M.parySet.add(key); k++;
        const ds = q => { const arm = n.arms.find(x => x.inLink === q.conn.from), ar2 = n.arms.find(x => x.outLink === q.conn.to); return "p" + vstupniPruh(S, q) + ":" + (arm ? Math.round(Math.atan2(arm.hy, arm.hx) * 180 / Math.PI) : "?") + "→" + (ar2 ? Math.round(Math.atan2(ar2.hy, ar2.hx) * 180 / Math.PI) : "?") + "/" + q.conn.turn + "/p" + q.lane; };
        const tetivy = X.segInter(a.conn.x0, a.conn.y0, a.conn.x3, a.conn.y3, c.conn.x0, c.conn.y0, c.conn.x3, c.conn.y3) ? "tětivy se kříží" : "tětivy se nekříží";
        const d = "uzel " + n.id + " " + n.eff + ": " + [ds(a), ds(c)].sort().join(" × ") + " (" + tetivy + ")"; M.mijeniKde[d] = (M.mijeniKde[d] || 0) + 1; } }
    }
  }
  M.mijeni += k;
}

function spust(sc, hustota, trvani, seed, limit) {
  const S = X.createSim(seed || 5);
  X.kzVycisti(S); if (limit !== undefined) S.cfg.stuck = limit;
  const chyby = [];
  try { sc.stavba(S, chyby); } catch (err) { chyby.push("výjimka při stavbě: " + err.message); }
  X.computeNet(S);
  const K = konce(S), zdroje = K.filter(k => k.zdroj), cile = K.filter(k => k.cil);
  // dostupnost směrů
  const smery = []; let dostupne = 0, celkem = 0;
  for (const a of zdroje) for (const b of cile) { if (a === b) continue; celkem++; const p = X.findPath(S, a.start, b.goal); if (p) dostupne++; else smery.push(`${a.x.toFixed(0)},${a.y.toFixed(0)}→${b.x.toFixed(0)},${b.y.toFixed(0)}`); }
  M = { vyjelo: 0, dojelo: 0, nevyjelo: 0, vynuceno: 0, mijeni: 0, parySet: new Set(), mijeniKde: {}, vzdaloKde: {}, stani: [], casy: [], zdrzeni: [], maxCekani: 0, blok: 0, blokMax: 0 };
  const stuck0 = S.stuckN, miss0 = S.missed || 0, repl0 = S.replanned || 0;
  const kroky = Math.round(trvani / STEP), konecVypousteni = Math.round((trvani - 40) / STEP);
  const acc = zdroje.map(() => S.R());
  let klid = 0, posledniS = new Map();
  for (let t = 0; t < kroky; t++) {
    if (t < konecVypousteni) for (let i = 0; i < zdroje.length; i++) {
      acc[i] += hustota * STEP; if (acc[i] < 1) continue; acc[i] -= 1;
      const a = zdroje[i], moz = cile.filter(b => b !== a); if (!moz.length) continue;
      const b = moz[Math.floor(S.R() * moz.length)];
      const p = X.findPath(S, a.start, b.goal); if (!p) continue;
      const c = X.newVehicle(S, { links: p.links, s: p.s0, sEnd: p.sEnd, startEp: a.start, goalEp: b.goal, trip: { to: { isGate: true } }, state: "exit" });
      c.lane = X.chooseLane(S, c, 0); c._t0 = S.time; c._free = volnaJizda(S, p); S.exiting.push(c); M.vyjelo++;
    }
    tick(S, STEP);
    if (t % 6 === 0) {
      tesnaMijeni(S);
      // zablokování: auta na síti, ale nikdo se 10 s nepohnul
      let jede = 0, naSiti = 0;
      for (const c of S.cars) { if (c.dead || c.state !== "drive") continue; naSiti++; if (c._mt === undefined || c._ml !== c.li || Math.abs(c.s - c._ms) > 0.5) { c._mt = S.time; c._ml = c.li; c._ms = c.s; } if (c.wait > M.maxCekani) M.maxCekani = c.wait; const s0 = posledniS.get(c); if (s0 === undefined || Math.abs(c.s - s0) > 0.01) jede++; posledniS.set(c, c.s); }
      if (naSiti >= 3 && !jede) { klid += 6 * STEP; if (klid > M.blokMax) M.blokMax = klid; if (klid >= 10 && !M.blok) M.blok = +S.time.toFixed(1); } else klid = 0;
      if (t % 600 === 0) posledniS = new Map([...posledniS].filter(([c]) => !c.dead));
    }
  }
  const zbyva = S.cars.filter(c => !c.dead).length;
  const zbyvaKde = S.cars.filter(c => !c.dead).slice(0, 6).map(c => { if (c.state !== "drive") return c.state + " čeká " + c.wait.toFixed(1); const p = poloha(S, c); const l = c.links[c.li];
    return `${p[0].toFixed(1)},${p[1].toFixed(1)} úsek ${l >> 1}/${l & 1} pruh ${c.lane} trasa ${c.li + 1}/${c.links.length} čeká ${c.wait.toFixed(1)} v=${c.v.toFixed(2)} jede ${(S.time - c._t0).toFixed(0)} s`; });
  const med = a => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
  const p95 = a => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length * 0.95)]; };
  const uzly = S.nodes.filter(n => !n.dead && (n.edges.length >= 3 || n.ring)).map(n => n.eff);
  return {
    id: sc.id, nazev: sc.nazev, hustota, chyby, konce: K.length, zdroje: zdroje.length, cile: cile.length, smery: `${dostupne}/${celkem}`, nedostupne: smery,
    rizeni: [...new Set(uzly)].join(","), vyjelo: M.vyjelo, dojelo: M.dojelo, nevyjelo: M.nevyjelo, vzdalo: S.stuckN - stuck0, minulo: (S.missed || 0) - miss0, preplanovalo: (S.replanned || 0) - repl0, zbyva, zbyvaKde,
    zdrzeniMed: +med(M.zdrzeni).toFixed(1), zdrzeniP95: +p95(M.zdrzeni).toFixed(1), maxCekani: +M.maxCekani.toFixed(1), vynuceno: M.vynuceno, mijeni: M.mijeni, mijeniKde: M.mijeniKde, staniPredVzdanim: M.stani.length ? [Math.min(...M.stani).toFixed(1), (M.stani.reduce((a, b) => a + b, 0) / M.stani.length).toFixed(1), Math.max(...M.stani).toFixed(1)] : null, vzdaloKde: M.vzdaloKde, blok: M.blok, blokMax: +M.blokMax.toFixed(1),
  };
}

const args = process.argv.slice(2).filter(a => !a.startsWith("--oprava=")), LIMIT = args.includes("--nikdy") ? 0 : undefined;
const vyber = args.map(Number).filter(Boolean);
const HUSTOTY = [{ jm: "slabý", h: 0.2 }, { jm: "střední", h: 0.45 }, { jm: "silný", h: 0.8 }];
const vysl = [];
console.log(`Zkouška křižovatek, verze ${GV}` + (LIMIT === 0 ? ", vzdávání vypnuto" : "") + (ZAPNUTO.length ? ", pokusné opravy: " + ZAPNUTO.map(k => k + " " + OPRAVY[k][0]).join("; ") : ""));
console.log("id  provoz  směry   vyjelo dojelo nevyj vzdalo minulo zbývá  zdrž.med/p95  max.čekání vynuc. míjení blok  řízení");
for (const sc of SC) {
  if (vyber.length && !vyber.includes(sc.id)) continue;
  for (const H of HUSTOTY) {
    const t0 = Date.now(); let r;
    try { r = spust(sc, H.h, 200, 5, LIMIT); } catch (err) { r = { id: sc.id, nazev: sc.nazev, hustota: H.h, chyby: ["výjimka: " + err.stack.split("\n").slice(0, 3).join(" | ")] }; }
    r.provoz = H.jm; r.ms = Date.now() - t0; vysl.push(r);
    if (r.vyjelo === undefined) { console.log(String(sc.id).padStart(2) + "  " + H.jm + "  CHYBA " + r.chyby.join("; ")); continue; }
    console.log([String(r.id).padStart(2), H.jm.padEnd(6), r.smery.padEnd(7), String(r.vyjelo).padStart(6), String(r.dojelo).padStart(6), String(r.nevyjelo).padStart(5), String(r.vzdalo).padStart(6), String(r.minulo).padStart(6), String(r.zbyva).padStart(5),
      (r.zdrzeniMed + "/" + r.zdrzeniP95).padStart(13), String(r.maxCekani).padStart(11), String(r.vynuceno).padStart(6), String(r.mijeni).padStart(6), String(r.blok || "-").padStart(5), " " + r.rizeni + " " + r.nazev + (r.chyby.length ? "  !! " + r.chyby.join("; ") : "")].join(" "));
  }
}
fs.writeFileSync(path.join(__dirname, "vysledky" + (LIMIT === 0 ? "_nikdy" : "") + (ZAPNUTO.length ? "_oprava" + ZAPNUTO.join("") : "") + ".json"), JSON.stringify({ verze: GV, datum: new Date().toISOString(), vysledky: vysl }, null, 1));
