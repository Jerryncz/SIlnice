// Test simulace bez prohlížeče: node tests/test_simulace.js
// Načte <script id="sim"> z index.html, rozehraje několik map a hlídá,
// že se simulace nerozbije (čítače sedí, budovy stojí u silnic, nic nespadne).
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
const m = html.match(/<script id="sim">([\s\S]*?)<\/script>/);
if (!m) { console.error("V index.html chybí <script id=\"sim\">"); process.exit(1); }
const ctx = {};
vm.createContext(ctx);
vm.runInContext(m[1] + "\nthis.api={createSim,step,buildRoad,eraseRoad,demolish,gridPath,STEP,N,NB};", ctx);
const { createSim, step, buildRoad, eraseRoad, demolish, gridPath, STEP, N, NB } = ctx.api;

let chyby = 0, kontroly = 0;
function ok(podminka, text) { kontroly++; if (!podminka) { chyby++; console.log("  CHYBA: " + text); } }

function zkontroluj(S, kde) {
  let occ = 0; for (let i = 0; i < N; i++) occ += S.occ[i];
  let naSilnici = 0; for (const c of S.cars) if (c.state !== "dwell" && S.road[c.p[c.k]]) naSilnici++;
  ok(occ === naSilnici, `${kde}: obsazenost polí ${occ} ≠ aut na silnici ${naSilnici}`);
  let inc = 0, pend = 0; for (const b of S.buildings) { inc += b.incoming; ok(b.incoming >= 0, `${kde}: záporné rezervace u ${b.name}`); }
  for (const c of S.cars) pend += c.pend.size;
  ok(inc === pend, `${kde}: rezervace parkovišť ${inc} ≠ ${pend}`);
  for (const b of S.buildings) {
    ok(b.parked.length <= b.cap || b.cap === 0, `${kde}: přeplněné parkoviště ${b.name}`);
    for (const j of b.tiles) ok(!S.road[j] && S.bld[j] === b, `${kde}: budova ${b.name} na silnici nebo nesedí mapa`);
  }
  for (const t of S.towns) ok(t.homes.length > 0, `${kde}: obec ${t.name} bez domů`);
  ok(Number.isFinite(S.money), `${kde}: peníze nejsou číslo`);
}

for (const seed of [1, 4242, 98765]) {
  console.log("Mapa " + seed);
  const S = createSim(seed);
  zkontroluj(S, "start");
  ok(S.towns.length >= 5, "na mapě je aspoň 5 osad");
  for (const b of S.buildings) {
    let uSilnice = false; for (const j of b.tiles) for (let d = 0; d < 4; d++) { const n = NB[j * 4 + d]; if (n >= 0 && S.road[n]) uSilnice = true; }
    ok(uSilnice, `budova ${b.name} na startu neleží u silnice`);
  }
  // hráč propojí všechny obce
  S.money = 1e6;
  for (let a = 1; a < S.towns.length; a++) {
    const p = gridPath(S, S.towns[a].homes[0].access, S.towns[0].homes[0].access);
    if (p) for (const i of p) buildRoad(S, i);
  }
  const pop0 = S.towns.reduce((a, t) => a + t.pop, 0);
  for (let s = 0; s < 30 * 300; s++) { step(S, STEP); if (s % 900 === 0) zkontroluj(S, "t=" + Math.round(S.time)); }
  const pop1 = S.towns.reduce((a, t) => a + t.pop, 0);
  ok(pop1 > pop0, `obce po propojení rostou (${pop0} → ${pop1})`);
  ok(S.trips > 50, `auta dojíždějí do cíle (${S.trips})`);
  // bourání budovy a silnic za jízdy
  const b = S.buildings.find(x => x.type === "house" && x.town.homes.length > 1);
  if (b) ok(String(demolish(S, b)).startsWith("ok"), "zbourání domu");
  for (let i = 0; i < N; i += 9) if (S.road[i]) eraseRoad(S, i);
  for (let s = 0; s < 30 * 30; s++) step(S, STEP);
  zkontroluj(S, "po bourání");
  console.log(`  ${S.towns.length} obcí, ${pop1} obyvatel, ${S.buildings.length} budov, ${S.trips} cest`);
}
console.log(`${kontroly} kontrol, ${chyby} chyb`);
process.exit(chyby ? 1 : 0);
