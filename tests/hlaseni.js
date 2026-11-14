// Přečte hlášení ze hry, nahraje uložený stav a pustí simulaci dál.
//
//   node tests/hlaseni.js <složka hlášení | stav.json(.gz) | hlaseni_….json> [sekund=20]
//
// Vypíše popis a vybrané prvky, zkontroluje stav (tests/kontroly.js) hned po nahrání a po
// zadaném čase a ukáže, co se s vybranými prvky stalo. Stav se nahrává do simulace z aktuálních
// zdrojů (src/sim); když je hlášení z jiné verze, upozorní – pak je lepší přepnout se na commit
// té verze (git log -S"<otisk>" -- index.html najde sestavení podle otisku z popis.md).
"use strict";
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const vm = require("vm");
const B = require("../build.js");

const arg = process.argv[2];
const sec = +(process.argv[3] || 20);
if (!arg) { console.log("Použití: node tests/hlaseni.js <složka hlášení | stav.json(.gz) | hlaseni_….json> [sekund]"); process.exit(2); }

const readMaybeGz = f => { const b = fs.readFileSync(f); return (f.endsWith(".gz") ? zlib.gunzipSync(b) : b).toString("utf8"); };
let meta = null, stav = null;
if (fs.statSync(arg).isDirectory()) {
  const p = n => path.join(arg, n);
  if (fs.existsSync(p("hlaseni.json"))) meta = JSON.parse(fs.readFileSync(p("hlaseni.json"), "utf8"));
  if (fs.existsSync(p("stav.json.gz"))) stav = readMaybeGz(p("stav.json.gz")); else if (fs.existsSync(p("stav.json"))) stav = readMaybeGz(p("stav.json"));
} else {
  const J = JSON.parse(readMaybeGz(arg));
  if (J.format === "osady-hlaseni" && J.files) {   // záložní soubor ke stažení (vše v jednom)
    const f = n => J.files[n] && Buffer.from(J.files[n], "base64");
    if (f("hlaseni.json")) meta = JSON.parse(f("hlaseni.json").toString("utf8"));
    if (f("stav.json.gz")) stav = zlib.gunzipSync(f("stav.json.gz")).toString("utf8"); else if (f("stav.json")) stav = f("stav.json").toString("utf8");
  } else if (J.format === "osady-stav") stav = JSON.stringify(J);
}

const ctx = { console };
vm.createContext(ctx);
vm.runInContext(B.simSource() + "\nthis.A={saveState,loadState,step,STEP,hourOf,dayOf,lotPath,stopS,GAME_VERSION};", ctx);
const A = ctx.A;
let chyby = 0;
const ok = (p, t) => { if (!p) { chyby++; if (chyby < 30) console.log("  CHYBA: " + t); } };
const zkontroluj = require("./kontroly.js")(A, ok);

if (meta) {
  console.log(`Hlášení ${meta.id}`);
  console.log(`  verze ${meta.game}, otisk ${meta.build}, seed ${meta.seed}, den ${meta.day} ${meta.clock}`);
  console.log(`  popis: ${meta.text || "(bez popisu)"}`);
  for (const m of meta.marks || []) console.log(`  ${m.n}. ${m.label}${m.note ? " – " + m.note : ""}\n     ${m.detail}`);
  if (meta.stateError) console.log("  stav se ve hře nepodařilo uložit: " + meta.stateError);
}
if (!stav) { console.log("Uložený stav chybí."); process.exit(meta ? 0 : 1); }

const J = JSON.parse(stav);
if (J.game !== A.GAME_VERSION) console.log(`POZOR: stav je z verze ${J.game}, zdroje jsou ${A.GAME_VERSION}.`);
const S = A.loadState(J);
const clock = () => { const h = A.hourOf(S); return `den ${A.dayOf(S)} ${String(Math.floor(h)).padStart(2, "0")}:${String(Math.floor(h % 1 * 60)).padStart(2, "0")}`; };
const find = m => m.type === "car" ? S.cars.find(c => c.id === m.id) : m.type === "walker" ? S.walkers.find(w => w.id === m.id)
  : m.type === "bld" ? S.buildings.find(b => b.id === m.id) : m.type === "edge" ? S.edges[m.id] : m.type === "node" ? S.nodes[m.id] : null;
const brief = (m, o) => !o ? (m.type === "car" ? "už není mezi auty (dojelo nebo zmizelo)" : m.type === "walker" ? "už není mezi chodci (došel nebo vzdal)" : "nenalezeno") : m.type === "car" ? `stav ${o.state}${o.dead ? " (zrušeno)" : ""}, odkaz ${o.links ? o.links[o.li] : "–"}, pruh ${o.lane}, s ${(+o.s).toFixed(2)}, v ${(+o.v).toFixed(2)}, čeká ${(+o.wait || 0).toFixed(1)} s`
  : m.type === "walker" ? `stav ${o.state}${o.dead ? " (došel nebo vzdal)" : ""}` : m.type === "edge" ? `aut ve frontách ${o.q ? o.q[0].reduce((a, q) => a + q.length, 0) + " / " + o.q[1].reduce((a, q) => a + q.length, 0) : "–"}`
  : m.type === "node" ? `v ploše ${o.box ? o.box.length : 0} aut` : m.type === "bld" ? `obyvatel ${o.pop}, zaparkováno ${o.parked}${o.dead ? " (zbouráno)" : ""}` : "";
const marks = (meta && meta.marks || []).filter(m => m.type !== "point");
console.log(`Nahráno: ${clock()}, aut ${S.cars.filter(c => !c.dead).length}, chodců ${S.walkers.filter(w => !w.dead).length}, peníze ${Math.round(S.money)}`);
for (const m of marks) console.log(`  ${m.n}. ${brief(m, find(m))}`);
zkontroluj(S, "po nahrání");
const T = Math.round(sec / A.STEP);
for (let k = 0; k < T; k++) A.step(S, A.STEP);
console.log(`Po ${sec} s: ${clock()}, aut ${S.cars.filter(c => !c.dead).length}, zaseknutých celkem ${S.stuckN || 0}`);
for (const m of marks) console.log(`  ${m.n}. ${brief(m, find(m))}`);
zkontroluj(S, "po " + sec + " s");
console.log(chyby ? `${chyby} chyb v kontrolách` : "kontroly v pořádku");
process.exit(chyby ? 1 : 0);
