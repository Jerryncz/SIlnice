// Test simulace bez prohlížeče: node tests/test_simulace.js
// Složí src/sim/*.js (stejně jako build.js), postaví silnice, mosty, kruhový objezd a nájezd na dálnici,
// rozehraje dva herní dny a hlídá, že se simulace nerozbije.
"use strict";
const vm = require("vm");
const B = require("../build.js");

const ctx = { console };
vm.createContext(ctx);
vm.runInContext(B.simSource() + "\nthis.A={createSim,step,STEP,N,W,NB,DAY,buildRoad,planRoad,snapPoint,mkLine,mkBezier,planRoundabout,commitRoundabout,findPath,gridPath,buildCellPath,eraseEdge,demolishBuilding,planLanes,commitLanes,cycleOneway,setControl,setKind,hourOf,cellAt,GAME_VERSION};", ctx);
const A = ctx.A;

let chyby = 0, kontroly = 0;
function ok(podminka, text) { kontroly++; if (!podminka) { chyby++; if (chyby < 40) console.log("  CHYBA: " + text); } }

function zkontroluj(S, kde) {
  for (const c of S.cars) {
    if (c.dead) continue;
    if (c.state === "drive") {
      const l = c.links[c.li], e = S.edges[l >> 1];
      ok(!e.dead, `${kde}: auto na zbouraném úseku`);
      const q = e.q[l & 1][c.lane];
      ok(q && q.includes(c), `${kde}: auto chybí ve frontě svého pruhu`);
    } else ok(c.state === "exit", `${kde}: auto v neznámém stavu ${c.state}`);
  }
  for (const e of S.edges) {
    if (e.dead) continue;
    for (const lanes of e.q) for (const q of lanes) {
      for (let k = 0; k < q.length; k++) {
        ok(!q[k].dead && q[k].state === "drive", `${kde}: ve frontě je odstraněné auto`);
        if (k) ok(q[k - 1].s >= q[k].s - 1e-6, `${kde}: fronta není seřazená`);
      }
    }
  }
  let inc = 0, res = 0;
  for (const b of S.buildings) { inc += b.incoming; ok(b.incoming >= 0, `${kde}: záporné rezervace u ${b.name}`); }
  for (const c of S.cars) if (!c.dead && c.trip && c.trip.reserved) res++;
  ok(inc === res, `${kde}: rezervace parkovišť ${inc} ≠ ${res}`);
  for (const b of S.buildings) {
    ok(b.staff > -0.01 && b.guests > -0.01 && b.kidsIn > -0.01, `${kde}: záporný počet lidí v ${b.name} (${b.staff}/${b.guests}/${b.kidsIn})`);
    if (b.away !== undefined && (b.type === "house" || b.type === "flat")) ok(b.away > -0.01, `${kde}: záporný počet lidí mimo dům ${b.name} (${b.away})`);
    for (const j of b.tiles) ok(!S.roadCnt[j] && S.bld[j] === b, `${kde}: budova ${b.name} na silnici nebo nesedí mapa`);
  }
  let trucks = 0, trucksB = 0, cargo = 0, cargoInc = 0;
  for (const c of S.cars) { if (c.dead || !c.trip || !c.trip.truck) continue; if (!c.trip.truckDone && c.trip.ind && !c.trip.ind.dead) trucks++; if (c.trip.cargo && c.trip.cargoTo) cargo++; }
  for (const b of S.buildings) if (b.trucks !== undefined) { trucksB += b.trucks; for (const g in b.inc) { cargoInc += b.inc[g]; ok(b.inc[g] >= 0, `${kde}: záporné objednávky ${b.name}`); } }
  for (const t of S.towns) cargoInc += t.matInc;
  ok(trucksB === trucks, `${kde}: nákladní auta ${trucksB} ≠ ${trucks}`);
  ok(cargoInc === cargo, `${kde}: objednávky zboží ${cargoInc} ≠ vezených nákladů ${cargo}`);
  for (const t of S.towns) ok(t.homes.length > 0, `${kde}: obec ${t.name} bez domů`);
  ok(Number.isFinite(S.money), `${kde}: peníze nejsou číslo`);
}
const center = c => [c % A.W + 0.5, Math.floor(c / A.W) + 0.5];
function road(S, x0, y0, x1, y1, kind, lvl0, lvl1, lanes) {
  const st = S && A.snapPoint(S, x0, y0, lvl0 || 0), en = A.snapPoint(S, x1, y1, lvl1 === undefined ? (lvl0 || 0) : lvl1);
  if (st.type === "free") { st.x = x0; st.y = y0; } if (en.type === "free") { en.x = x1; en.y = y1; }
  return A.buildRoad(S, { pts: A.mkLine(st.x, st.y, en.x, en.y), kind: kind || "road", lanes, start: st, end: en });
}

const souhrn = {};
for (const seed of [1, 4242, 98765]) {
  console.log("Mapa " + seed);
  const S = A.createSim(seed);
  zkontroluj(S, "start");
  ok(S.towns.length >= 8, "na mapě je aspoň 8 osad");
  ok(S.gates.length === 3, "na mapě jsou 3 dálnice do světa");
  for (const b of S.buildings) ok(!!b.access, `budova ${b.name} na startu nemá vjezd`);
  S.money = 1e8;
  // propojení obcí stromem silnic a napojení dálnic
  const done = [S.towns[0]];
  for (const t of S.towns.slice(1)) {
    let b = null, bd = 1e9; for (const o of done) { const d = Math.hypot(o.cx - t.cx, o.cy - t.cy); if (d < bd) { bd = d; b = o; } }
    const p = A.gridPath(S, A.cellAt(t.homes[0].access.x, t.homes[0].access.y), A.cellAt(b.homes[0].access.x, b.homes[0].access.y));
    if (p) A.buildCellPath(S, p, "road", false); done.push(t);
  }
  for (const g of S.gates) {
    const n = S.nodes.find(x => x.gate === g.id); const e = S.edges.find(x => !x.dead && x.gateEdge && (x.a === n.id || x.b === n.id));
    const end = S.nodes[e.a === n.id ? e.b : e.a];
    let b = null, bd = 1e9; for (const o of S.towns) { const d = Math.hypot(o.cx - end.x, o.cy - end.y); if (d < bd) { bd = d; b = o; } }
    const p = A.gridPath(S, A.cellAt(end.x, end.y), A.cellAt(b.homes[0].access.x, b.homes[0].access.y));
    if (p) { const r = A.buildCellPath(S, p, "road", false); }
  }
  // dálnice přes silnici v úrovni musí být odmítnuta, mostem projde
  const anyRoad = S.edges.find(e => !e.dead && e.kind === "road" && e.g.len > 3);
  if (anyRoad) {
    const m = { x: anyRoad.g.pts[Math.floor(anyRoad.g.n / 2) * 2], y: anyRoad.g.pts[Math.floor(anyRoad.g.n / 2) * 2 + 1] };
    const t = anyRoad.g; const i = Math.floor(t.n / 2); const nx = t.nx[i], ny = t.ny[i];
    const x0 = Math.floor(m.x + nx * 4) + 0.5, y0 = Math.floor(m.y + ny * 4) + 0.5, x1 = Math.floor(m.x - nx * 4) + 0.5, y1 = Math.floor(m.y - ny * 4) + 0.5;
    const r1 = A.planRoad(S, { pts: A.mkLine(x0, y0, x1, y1), kind: "hwy", start: { type: "free", x: x0, y: y0, lvl: 0 }, end: { type: "free", x: x1, y: y1, lvl: 0 } });
    ok(!r1.ok, "dálnice přes silnici v úrovni je odmítnuta");
    const r2 = A.planRoad(S, { pts: A.mkLine(x0, y0, x1, y1), kind: "road", start: { type: "free", x: x0, y: y0, lvl: 1 }, end: { type: "free", x: x1, y: y1, lvl: 1 } });
    ok(r2.ok && r2.junctions.length === 0, "most přes silnici nevytvoří křižovatku");
  }
  // kruhový objezd na křižovatce
  const junc = S.nodes.find(n => !n.dead && n.edges.length >= 3 && !n.ring && n.gate < 0 && n.arms.every(a => S.edges[a.e].kind !== "hwy"));
  if (junc) { const p = A.planRoundabout(S, junc.x, junc.y, 2); if (p.ok) { const r = A.commitRoundabout(S, p); ok(r.ok, "kruhový objezd postaven"); souhrn.kruh = (souhrn.kruh || 0) + 1; } }
  const pop0 = S.towns.reduce((a, t) => a + t.pop, 0);
  const T = Math.round(A.DAY / A.STEP);
  for (let s = 0; s < T; s++) { A.step(S, A.STEP); if (s % 600 === 0) zkontroluj(S, "den1 " + A.hourOf(S).toFixed(1) + "h"); }
  // úpravy silnic za jízdy
  let k = 0;
  for (const e of [...S.edges]) { if (e.dead || e.ring || e.gateEdge) continue; k++;
    if (k % 7 === 0) { const p = A.planLanes(S, e, 1); if (p.ok) A.commitLanes(S, p); }
    else if (k % 11 === 0 && e.kind === "road") A.cycleOneway(S, e);
    else if (k % 13 === 0) A.setKind(S, e, "blvd"); }
  for (const n of S.nodes) if (!n.dead && n.edges.length >= 3 && !n.ring) A.setControl(S, n, [1, 2, 3][n.id % 3], n.edges.slice(0, 2));
  for (let s = 0; s < T; s++) { A.step(S, A.STEP); if (s % 600 === 0) zkontroluj(S, "den2 " + A.hourOf(S).toFixed(1) + "h"); }
  const pop1 = S.towns.reduce((a, t) => a + t.pop, 0);
  ok(pop1 > pop0, `obce po propojení rostou (${pop0} → ${pop1})`);
  ok(S.trips > 50, `lidé dojíždějí do cíle (${S.trips})`);
  ok(S.transits > 0, `projíždí tranzit (${S.transits})`);
  const typy = {}; for (const b of S.buildings) typy[b.type] = (typy[b.type] || 0) + 1;
  for (const t in typy) souhrn[t] = (souhrn[t] || 0) + typy[t];
  // bourání za jízdy
  const h = S.buildings.find(x => x.type === "house" && x.town.homes.length > 1);
  if (h) ok(A.demolishBuilding(S, h, false).ok, "zbourání domu");
  let n = 0; for (const e of [...S.edges]) { if (!e.dead && !e.gateEdge && (n++ % 6 === 0)) A.eraseEdge(S, e); }
  for (let s = 0; s < 900; s++) A.step(S, A.STEP);
  zkontroluj(S, "po bourání");
  console.log(`  ${S.towns.length} obcí, ${pop1} obyvatel, ${S.buildings.length} budov, ${S.trips} cest, ${S.transits} tranzitů, vývoz ${S.exported} Kč, aut ${S.cars.length}, chodců ${S.walkers.length}`);
  console.log("  " + JSON.stringify(typy));
}
console.log(`verze ${A.GAME_VERSION}: ${kontroly} kontrol, ${chyby} chyb`);
process.exit(chyby ? 1 : 0);
