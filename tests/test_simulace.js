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
vm.runInContext(m[1] + "\nthis.api={createSim,step,buildRoad,eraseRoad,demolish,gridPath,addLane,setOneway,setControl,STEP,N,NB,W,ROAD,HWY,GAME_VERSION};", ctx);
const A = ctx.api;
const { createSim, step, buildRoad, eraseRoad, demolish, gridPath, STEP, N, NB } = A;

let chyby = 0, kontroly = 0;
function ok(podminka, text) { kontroly++; if (!podminka) { chyby++; if (chyby < 40) console.log("  CHYBA: " + text); } }

function zkontroluj(S, kde) {
  let occ = 0; for (let i = 0; i < S.occ.length; i++) occ += S.occ[i];
  let naSilnici = 0; for (const c of S.cars) if (c.ld >= 0) { naSilnici++; ok(S.road[c.p[c.k]] > 0, `${kde}: auto počítané na poli bez silnice`); }
  ok(occ === naSilnici, `${kde}: obsazenost ${occ} ≠ aut na silnici ${naSilnici}`);
  let inc = 0, pend = 0; for (const b of S.buildings) { inc += b.incoming; ok(b.incoming >= 0, `${kde}: záporné rezervace u ${b.name}`); }
  for (const c of S.cars) pend += c.pend.size;
  ok(inc === pend, `${kde}: rezervace parkovišť ${inc} ≠ ${pend}`);
  let trucks = 0, cargo = 0, cargoInc = 0;
  for (const c of S.cars) { if (c.truck) trucks++; if (c.cargo && c.cargoTo) cargo++; }
  let trucksB = 0; for (const b of S.buildings) if (b.trucks !== undefined) { trucksB += b.trucks; for (const g in b.inc) { cargoInc += b.inc[g]; ok(b.inc[g] >= 0, `${kde}: záporné objednávky ${b.name}`); } }
  for (const t of S.towns) cargoInc += t.matInc;
  // nákladní auta zbouraných podniků se nepočítají u žádné budovy
  let trucksDead = 0; for (const c of S.cars) if (c.truck && c.home.dead) trucksDead++;
  ok(trucksB === trucks - trucksDead, `${kde}: nákladní auta ${trucksB} ≠ ${trucks - trucksDead}`);
  ok(cargoInc === cargo, `${kde}: objednávky zboží ${cargoInc} ≠ vezených nákladů ${cargo}`);
  for (const b of S.buildings) {
    ok(b.parked.length <= b.cap || b.cap === 0, `${kde}: přeplněné parkoviště ${b.name}`);
    for (const j of b.tiles) ok(!S.road[j] && S.bld[j] === b, `${kde}: budova ${b.name} na silnici nebo nesedí mapa`);
  }
  for (const t of S.towns) ok(t.homes.length > 0, `${kde}: obec ${t.name} bez domů`);
  ok(Number.isFinite(S.money), `${kde}: peníze nejsou číslo`);
}

const souhrn = {};
for (const seed of [1, 4242, 98765]) {
  console.log("Mapa " + seed);
  const S = createSim(seed);
  zkontroluj(S, "start");
  ok(S.towns.length >= 8, "na mapě je aspoň 8 osad");
  ok(S.gates.length === 3, "na mapě jsou 3 dálnice do světa");
  for (const b of S.buildings) {
    let uSilnice = false; for (const j of b.tiles) for (let d = 0; d < 4; d++) { const n = NB[j * 4 + d]; if (n >= 0 && S.road[n]) uSilnice = true; }
    ok(uSilnice, `budova ${b.name} na startu neleží u silnice`);
  }
  // hráč propojí obce a dálnice
  S.money = 1e7;
  const cil = S.towns[0].homes[0].access;
  for (let a = 1; a < S.towns.length; a++) { const p = gridPath(S, S.towns[a].homes[0].access, cil); if (p) for (const i of p) buildRoad(S, i, A.ROAD); }
  for (const g of S.gates) { const p = gridPath(S, g.tile, cil); if (p) for (const i of p) buildRoad(S, i, A.ROAD); }
  // silnice k ložiskům, aby vznikla těžba
  for (const t of [3, 4, 2]) { let n = 0; for (let i = 0; i < N && n < 2; i += 37) if (S.terrain[i] === t) { const p = gridPath(S, i, cil); if (p) { for (const j of p) if (!S.bld[j]) buildRoad(S, j, A.ROAD); n++; } } }
  const pop0 = S.towns.reduce((a, t) => a + t.pop, 0);
  for (let s = 0; s < 30 * 420; s++) { step(S, STEP); if (s % 600 === 0) zkontroluj(S, "t=" + Math.round(S.time)); }
  // úpravy silnic za jízdy
  let pruhy = 0, jedno = 0, kriz = 0;
  for (let i = 0; i < N; i++) {
    if (!S.road[i]) continue;
    if (S.deg[i] >= 3 && kriz < 6) { A.setControl(S, i, [1, 2, 3, 4, 5, 0][kriz]); kriz++; }
    else if (pruhy < 30 && i % 5 === 0) { A.addLane(S, i, false); pruhy++; }
    else if (jedno < 8 && i % 11 === 0 && S.deg[i] === 2) { A.setOneway(S, i, 0); jedno++; }
  }
  for (let s = 0; s < 30 * 120; s++) { step(S, STEP); if (s % 600 === 0) zkontroluj(S, "úpravy t=" + Math.round(S.time)); }
  const pop1 = S.towns.reduce((a, t) => a + t.pop, 0);
  ok(pop1 > pop0, `obce po propojení rostou (${pop0} → ${pop1})`);
  ok(S.trips > 100, `auta dojíždějí do cíle (${S.trips})`);
  ok(S.transits > 0, `projíždí tranzit (${S.transits})`);
  const typy = {}; for (const b of S.buildings) typy[b.type] = (typy[b.type] || 0) + 1;
  for (const k in typy) souhrn[k] = (souhrn[k] || 0) + typy[k];
  // bourání budovy a silnic za jízdy
  const b = S.buildings.find(x => x.type === "house" && x.town.homes.length > 1);
  if (b) ok(String(demolish(S, b)).startsWith("ok"), "zbourání domu");
  const ind = S.buildings.find(x => x.trucks !== undefined);
  if (ind) ok(String(demolish(S, ind)).startsWith("ok"), "zbourání podniku");
  for (let i = 0; i < N; i += 9) if (S.road[i]) eraseRoad(S, i);
  for (let s = 0; s < 30 * 30; s++) step(S, STEP);
  zkontroluj(S, "po bourání");
  console.log(`  ${S.towns.length} obcí, ${pop1} obyvatel, ${S.buildings.length} budov, ${S.trips} cest, ${S.transits} tranzitů, vývoz ${S.exported} Kč, ${S.problems.length} problémů`);
  console.log("  " + JSON.stringify(typy));
}
console.log(`verze ${A.GAME_VERSION}: ${kontroly} kontrol, ${chyby} chyb`);
process.exit(chyby ? 1 : 0);
