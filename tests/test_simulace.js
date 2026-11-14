// Test simulace bez prohlížeče: node tests/test_simulace.js
// Složí src/sim/*.js (stejně jako build.js), postaví silnice, mosty, kruhový objezd a nájezd na dálnici,
// rozehraje dva herní dny a hlídá, že se simulace nerozbije.
"use strict";
const vm = require("vm");
const B = require("../build.js");

const ctx = { console };
vm.createContext(ctx);
vm.runInContext(B.simSource() + "\nthis.A={linkLanes,eraseEdge,newVehicle,chooseLane,updateVehicles,cycleArrow,mkCubic,lanePorts,snapPort,W,planTemplate,commitTemplate,planBranch,commitBranch,toggleCross,toggleMidCross,isRampEdge,unitFree,MW,MH,createSim,step,STEP,N,W,NB,DAY,buildRoad,planRoad,snapPoint,mkLine,mkBezier,planRoundabout,commitRoundabout,findPath,gridPath,buildCellPath,eraseEdge,demolishBuilding,planLanes,commitLanes,planKind,commitKind,splitAt,unsplit,stopS,cycleOneway,setControl,setKind,hourOf,cellAt,GAME_VERSION};", ctx);
const A = ctx.A;

let chyby = 0, kontroly = 0;
function ok(podminka, text) { kontroly++; if (!podminka) { chyby++; if (chyby < 40) console.log("  CHYBA: " + text); } }

function zkontroluj(S, kde) {
  let pres = 0, prekryv = 0;
  for (const c of S.cars) {
    if (c.dead) continue;
    if (c.state === "drive") {
      const l = c.links[c.li], e = S.edges[l >> 1];
      ok(!e.dead, `${kde}: auto na zbouraném úseku`);
      const q = e.q[l & 1][c.lane];
      ok(q && q.includes(c), `${kde}: auto chybí ve frontě svého pruhu`);
      if (c.li < c.links.length - 1) { const st = A.stopS(S, l); if (st > c.len + 0.1 && c.s + c.len / 2 > st + 0.02) pres++; }
    } else ok(c.state === "exit" || c.state === "enter" || c.state === "unpark", `${kde}: auto v neznámém stavu ${c.state}`);
  }
  // přechodně (auto otočené od parkoviště, změna sítě) smí být za stopčárou nejvýš pár aut; povolení dostanou v dalším kroku
  // po změně sítě (širší křižovatka) může auto chvíli stát dál, než je nová stopčára
  if (kde.startsWith("den1")) ok(pres <= 8, `${kde}: ${pres} aut za stopčárou`);
  for (const e of S.edges) {
    if (e.dead) continue;
    for (const lanes of e.q) for (const q of lanes) {
      for (let k = 0; k < q.length; k++) {
        ok(!q[k].dead && q[k].state === "drive", `${kde}: ve frontě je odstraněné auto`);
        if (k) ok(q[k - 1].s >= q[k].s - 1e-6, `${kde}: fronta není seřazená`);
        if (k) { const gap = q[k - 1].s - q[k].s - (q[k - 1].len + q[k].len) / 2; if (gap < -0.02) prekryv++; }
      }
    }
  }
  let inc = 0, res = 0;
  if (!kde.startsWith("po")) ok(prekryv === 0, `${kde}: ${prekryv} aut se v pruhu překrývá`);
  for (const b of S.buildings) { inc += b.incoming; ok(b.incoming >= 0, `${kde}: záporné rezervace u ${b.name}`); }
  for (const c of S.cars) if (!c.dead && c.trip && c.trip.reserved) res++;
  ok(inc === res, `${kde}: rezervace parkovišť ${inc} ≠ ${res}`);
  for (const b of S.buildings) {
    ok(b.staff > -0.01 && b.guests > -0.01 && b.kidsIn > -0.01, `${kde}: záporný počet lidí v ${b.name} (${b.staff}/${b.guests}/${b.kidsIn})`);
    if (b.away !== undefined && (b.type === "house" || b.type === "flat")) ok(b.away > -0.01, `${kde}: záporný počet lidí mimo dům ${b.name} (${b.away})`);
    for (const j of b.tiles) ok(!S.roadCnt[j] && S.bld[j] === b, `${kde}: budova ${b.name} na silnici nebo nesedí mapa`);
  }
  // parkovací místa: každé obsazené patří zaparkovanému autu, nebo autu, které zrovna zajíždí / vyjíždí
  for (const b of S.buildings) if (b.spotUsed) { const used = new Set();
    for (let i = 0; i < b.spotUsed.length; i++) { const o = b.spotUsed[i]; if (!o) continue;
      const okp = b.parked.includes(o) && o.spot === i, okc = o.state && !o.dead && o.spotB === b && o.spot === i;
      ok(okp || okc, `${kde}: místo ${i} v ${b.name} drží neplatný záznam`); ok(!used.has(o), `${kde}: auto na dvou místech`); used.add(o) }
    for (const pe of b.parked) if (pe.spot !== undefined) ok(b.spotUsed[pe.spot] === pe, `${kde}: zaparkované auto bez místa`) }
  let trucks = 0, trucksB = 0, cargo = 0, cargoInc = 0;
  for (const c of S.cars) { if (c.dead || !c.trip || !c.trip.truck) continue; if (!c.trip.truckDone && c.trip.ind && !c.trip.ind.dead) trucks++; if (c.trip.cargo && c.trip.cargoTo) cargo++; }
  for (const b of S.buildings) if (b.trucks !== undefined) { trucksB += b.trucks; for (const g in b.inc) { cargoInc += b.inc[g]; ok(b.inc[g] >= 0, `${kde}: záporné objednávky ${b.name}`); } }
  for (const t of S.towns) cargoInc += t.matInc;
  ok(trucksB === trucks, `${kde}: nákladní auta ${trucksB} ≠ ${trucks}`);
  ok(cargoInc === cargo, `${kde}: objednávky zboží ${cargoInc} ≠ vezených nákladů ${cargo}`);
  for (const t of S.towns) ok(t.homes.length > 0, `${kde}: obec ${t.name} bez domů`);
  ok(Number.isFinite(S.money), `${kde}: peníze nejsou číslo`);
}
function road(S, x0, y0, x1, y1, kind, lvl0, lvl1, lanes) {
  const st = S && A.snapPoint(S, x0, y0, lvl0 || 0), en = A.snapPoint(S, x1, y1, lvl1 === undefined ? (lvl0 || 0) : lvl1);
  if (st.type === "free") { st.x = x0; st.y = y0; } if (en.type === "free") { en.x = x1; en.y = y1; }
  return A.buildRoad(S, { pts: A.mkLine(st.x, st.y, en.x, en.y), kind: kind || "road", lanes, start: st, end: en });
}


// ---- síť: rozdělení na křižovatkách, spojování, přestavba, pruhy po směrech, napojení na dálnici ----
{
  console.log("Síť");
  const S = A.createSim(7); S.money = 1e8;
  // volný obdélník bez silnic, budov a vody
  let X = -1, Y = -1;
  for (let y = 4; y < 60 && X < 0; y++) for (let x = 4; x < 100 && X < 0; x++) {
    let free = true;
    for (let j = y - 2; j < y + 21 && free; j++) for (let i = x - 2; i < x + 24 && free; i++) { if (!A.unitFree(S, i, j)) free = false; }
    if (free) { X = x; Y = y; }
  }
  ok(X >= 0, "na mapě je volné místo pro test sítě");
  const alongY = (y) => S.edges.filter(e => !e.dead && Math.abs(e.g.pts[1] - y) < 0.05 && Math.abs(e.g.pts[e.g.pts.length - 1] - y) < 0.05);
  const y = Y + 2.5;
  ok(road(S, X + 0.5, y, X + 10.5, y, "road").ok, "silnice A postavena");
  ok(road(S, X + 5.5, y - 2, X + 5.5, y + 4, "road").ok, "silnice B přes A postavena");
  ok(alongY(y).length === 2, `A se na křižovatce rozdělila (${alongY(y).length} úseky)`);
  const jn = S.nodes.find(n => !n.dead && Math.abs(n.x - (X + 5.5)) < 0.05 && Math.abs(n.y - y) < 0.05);
  ok(jn && jn.edges.length === 4, "křižovatka má 4 ramena");
  for (const id of [...jn.edges]) { const e = S.edges[id]; if (Math.abs(e.g.pts[0] - e.g.pts[e.g.pts.length - 2]) < 0.05) A.eraseEdge(S, e); }
  ok(alongY(y).length === 1, `po zbourání B se A spojila v jeden úsek (${alongY(y).length})`);
  ok(road(S, X + 10.5, y, X + 14.5, y, "road").ok, "pokračování A postaveno");
  ok(alongY(y).length === 1, `rovné pokračování se připojilo k A (${alongY(y).length})`);
  const before = S.edges.filter(e => !e.dead).length;
  const rb = road(S, X + 0.5, y, X + 14.5, y, "blvd");
  ok(rb.ok && rb.rebuilt, "bulvár tažený po silnici ji přestaví: " + (rb.msg || ""));
  ok(S.edges.filter(e => !e.dead).length === before && alongY(y)[0].kind === "blvd", "přestavbou nevznikla druhá silnice přes první " + before + " " + S.edges.filter(e => !e.dead).length + " " + alongY(y).map(e => e.kind + e.lf + "/" + e.lb + ":" + e.g.len.toFixed(2)).join(","));
  const part = A.planRoad(S, { pts: A.mkLine(X + 6.5, y, X + 21.5, y), kind: "road", start: A.snapPoint(S, X + 6.5, y, 0), end: { type: "free", x: X + 21.5, y, lvl: 0 } });
  ok(!part.ok, "silnice vedená zčásti po jiné je odmítnuta");
  // ruční rozdělení a pruh jen v jednom směru
  const A0 = alongY(y)[0];
  ok(A.splitAt(S, A0, 7).ok && alongY(y).length === 2, "ruční rozdělení úseku");
  const piece = alongY(y).find(e => e.g.len > 6.5);
  const pl = A.planLanes(S, piece, 1, 0); ok(pl.ok, "pruh navíc v jednom směru: " + (pl.msg || ""));
  A.commitLanes(S, pl); const wide = alongY(y).find(e => e.lf === 3);
  ok(wide && wide.lb === 2, "jen jeden směr má 3 pruhy");
  const kn = S.nodes.find(n => !n.dead && n.keep);
  ok(kn && A.unsplit(S, kn).ok && alongY(y).length === 2, "úseky s různými pruhy zůstanou po zrušení rozdělení zvlášť");
  A.commitLanes(S, A.planLanes(S, alongY(y).find(e => e.lf === 3), -1, 0));
  ok(alongY(y).length === 1, `po vyrovnání pruhů se úseky spojily (${alongY(y).length})`);
  const sec = A.planLanes(S, alongY(y)[0], 1, 1, [4, 9]); ok(sec.ok, "pruh na části úseku");
  A.commitLanes(S, sec); ok(alongY(y).length === 3 && alongY(y).filter(e => e.lb === 3).length === 1, "pruh navíc jen na prostředním kusu");
  // most přes silnici se zvolenou výškou: rampy 3 pole, bez křižovatky
  const yb = Y + 5.5;
  ok(road(S, X + 2.5, yb, X + 12.5, yb, "road").ok, "silnice pod most");
  const nb0 = S.nodes.filter(n => !n.dead).length;
  const br = A.buildRoad(S, { pts: A.mkLine(X + 7.5, yb - 4.5, X + 7.5, yb + 4.5), kind: "road", lanes: 1, level: 1, start: { type: "free", x: X + 7.5, y: yb - 4.5, lvl: 0 }, end: { type: "free", x: X + 7.5, y: yb + 4.5, lvl: 0 } });
  ok(br.ok, "most se zvolenou výškou postaven: " + (br.msg || ""));
  const brE = S.edges.filter(e => !e.dead && Math.abs(e.g.pts[0] - (X + 7.5)) < 0.05 && Math.abs(e.g.pts[e.g.pts.length - 2] - (X + 7.5)) < 0.05);
  ok(brE.length === 3 && brE.filter(e => A.isRampEdge(S, e)).length === 2, `most má dvě rampy a střed (${brE.length})`);
  ok(S.nodes.filter(n => !n.dead && n.edges.length >= 3 && Math.abs(n.y - yb) < 0.05 && Math.abs(n.x - (X + 7.5)) < 0.05).length === 0, "most nevytvořil křižovatku");
  const shortB = A.planRoad(S, { pts: A.mkLine(X + 14.5, yb - 2, X + 14.5, yb + 2), kind: "road", level: 1, start: { type: "free", x: X + 14.5, y: yb - 2, lvl: 0 }, end: { type: "free", x: X + 14.5, y: yb + 2, lvl: 0 } });
  ok(!shortB.ok, "krátký most bez místa na rampy je odmítnut");
  // dálnice a silnice napojená z boku: jen vpravo
  const yh = Y + 11.5;
  ok(road(S, X + 0.5, yh, X + 16.5, yh, "hwy").ok, "dálnice postavena");
  const side = road(S, X + 8.5, yh + 5, X + 8.5, yh, "road"); ok(side.ok, "silnice napojená z boku dálnice: " + (side.msg || ""));
  const mn = S.nodes.find(n => !n.dead && Math.abs(n.x - (X + 8.5)) < 0.05 && Math.abs(n.y - yh) < 0.05);
  ok(mn && mn.eff === "merge", "napojení se řídí jako nájezd");
  if (mn) {
    const arm = mn.arms.find(a => S.edges[a.e].kind === "road"), east = mn.arms.find(a => a.hx > 0.9), west = mn.arms.find(a => a.hx < -0.9);
    const outs = (mn.turns.get(arm.inLink) || []).map(t => t.link);
    ok(outs.includes(east.outLink) && !outs.includes(west.outLink), "ze silnice jen doprava ve směru jízdy");
    ok((mn.turns.get(west.inLink) || []).some(t => t.link === arm.outLink), "z dálnice jde sjet vpravo");
    ok(!(mn.turns.get(east.inLink) || []).some(t => t.link === arm.outLink), "z protisměru dálnice odbočit nejde");
  }
  // kruhový objezd jde celý přestavět
  const ry = Y + 17;
  ok(road(S, X + 2.5, ry, X + 12.5, ry, "road").ok, "silnice pro kruh");
  const rp = A.planRoundabout(S, X + 7.5, ry, 2); ok(rp.ok && A.commitRoundabout(S, rp).ok, "kruhový objezd postaven");
  const re = S.edges.find(e => !e.dead && e.ring);
  const kp = A.planKind(S, re, "blvd"); ok(kp.ok && A.commitKind(S, kp).ok, "kruhový objezd přestavěn: " + (kp.msg || ""));
  ok(S.edges.filter(e => !e.dead && e.ring).every(e => e.kind === "blvd"), "přestavěl se celý kruh");
  zkontroluj(S, "síť");
}

// ---- vzory mimoúrovňových křižovatek a odbočka: všechny směry musí jít projet ----
for (const type of ["diamond", "clover", "trumpet"]) {
  const S = A.createSim(11); S.money = 1e8; const y = 40.5, x0 = 20.5, x1 = 106.5, cx = 63.5;
  for (const b of [...S.buildings]) if (Math.abs(A.MW && b.front % (A.W) / 2 - cx) < 30 && Math.abs(Math.floor(b.front / A.W) / 2 - y) < 22) A.demolishBuilding(S, b, true);
  const st = { type: "free", x: x0, y, lvl: 0 }, en = { type: "free", x: x1, y, lvl: 0 };
  const hw = A.buildRoad(S, { pts: A.mkLine(x0, y, x1, y), kind: "hwy", lanes: 2, start: st, end: en, auto: true });
  ok(hw.ok, type + ": dálnice pro vzor " + (hw.msg || ""));
  const p = A.planTemplate(S, type, cx, y, "road", 1); ok(p.ok, type + ": vzor jde naplánovat " + (p.msg || ""));
  if (!p.ok) continue;
  const r = A.commitTemplate(S, p); ok(r.ok && !r.msg, type + ": vzor postaven celý " + (r.msg || ""));
  const D = type === "clover" ? 22 : type === "trumpet" ? 14 : 9;
  const at = (x, yy) => { const sn = A.snapPoint(S, x, yy, 0); return sn.type === "node" ? { node: sn.node } : sn.type === "edge" ? { e: sn.edge, u: sn.u, side: 1 } : null; };
  const W = at(x0 + 3, y), E = at(x1 - 3, y), N = at(cx, y - D), Sx = at(cx, y + D);
  const pairs = type === "trumpet" ? (() => { const R = N || Sx; return [[W, E], [E, W], [W, R], [E, R], [R, W], [R, E]]; })()
    : [[W, E], [E, W], [W, N], [W, Sx], [E, N], [E, Sx], [N, W], [N, E], [Sx, W], [Sx, E], [N, Sx], [Sx, N]];
  // rampy se na dálnici napojují na pruh: žádné dávání přednosti, auto z rampy má svůj pruh
  const ports = S.nodes.filter(n => !n.dead && n.port && Math.abs(n.y - y) < 0.01);
  const pn = ports.reduce((t, n) => t + n.arms.filter(a => a.port).length, 0); ok(pn >= 4, `${type}: rampy jsou na dálnici napojené na pruh (${pn})`);
  for (const n of ports) for (const a of n.arms) { if (!a.port || !A.linkLanes(S, a.inLink)) continue; const lc = n.lc.get(a.inLink); ok(lc.every(r => r.length && r.every(q => q.free)), `${type}: nájezd má vlastní pruh bez dávání přednosti`); }
  let good = 0; for (const [a, b] of pairs) if (a && b && A.findPath(S, a, b)) good++;
  ok(good === pairs.length, `${type}: projet jde všemi směry (${good}/${pairs.length})`);
  for (let k = 0; k < 900; k++) A.step(S, A.STEP);
  zkontroluj(S, type);
}
{
  const S = A.createSim(11); S.money = 1e8; const y = 60.5;
  const st = { type: "free", x: 10.5, y, lvl: 0 }, en = { type: "free", x: 40.5, y, lvl: 0 };
  ok(A.buildRoad(S, { pts: A.mkLine(10.5, y, 40.5, y), kind: "road", lanes: 1, start: st, end: en, auto: true }).ok, "silnice pro odbočku");
  const sn = A.snapPoint(S, 25.5, y, 0);
  const bp = A.planBranch(S, sn, { type: "free", x: 31.5, y: y + 5, lvl: 0 }, "road", 1); ok(bp.ok && bp.exit, "odbočka jde naplánovat " + (bp.msg || ""));
  if (bp.ok) { const r = A.commitBranch(S, bp); ok(r.ok, "odbočka postavena " + (r.msg || ""));
    ok(S.edges.some(e => !e.dead && e.kind === "road" && e.lf === 2 && e.lb === 1), "před odbočkou je odbočovací pruh");
    const ow = S.edges.find(e => !e.dead && e.kind === "oneway"); ok(!!ow, "odbočka je jednosměrka");
    const a = A.snapPoint(S, 12.5, y, 0); ok(ow && A.findPath(S, { e: a.edge, u: a.u, side: 1 }, { node: ow.b }), "z hlavní silnice jde odbočit"); }
}

// ---- pruhy: nájezd a sjezd na dálnici, průpletový pruh, plynulý provoz bez dávání přednosti ----
{
  const S = A.createSim(11); S.money = 1e8; const y = 40.5;
  for (const e of [...S.edges]) if (!e.dead && !e.gateEdge) A.eraseEdge(S, e);
  for (const b of [...S.buildings]) A.demolishBuilding(S, b, true);
  const sp = (x, yy) => { const q = A.snapPoint(S, x, yy, 0); return q.type === "free" ? { type: "free", x, y: yy, lvl: 0 } : q; };
  const rd = (pts, kind, lanes) => A.buildRoad(S, { pts, kind, lanes, start: sp(pts[0], pts[1]), end: sp(pts[pts.length - 2], pts[pts.length - 1]) });
  ok(rd(A.mkLine(12.5, y, 58.5, y), "hwy", 2).ok, "pruhy: dálnice");
  const r1 = rd(A.mkLine(20.5, 47.5, 28.5, y), "ramp", 1), r2 = rd(A.mkCubic(38.5, y, 42, y, 46, 44, 46.5, 47.5), "ramp", 1);
  ok(r1.ok && r2.ok, "pruhy: nájezd a sjezd postaveny");
  const hw = S.edges.filter(e => !e.dead && e.kind === "hwy" && Math.abs(e.g.bb[1] - y) < 0.01);
  const mid = hw.find(e => e.lf === 3 || e.lb === 3); ok(mid && Math.abs(mid.g.len - 10) < 0.01, "pruhy: mezi nájezdem a sjezdem je průpletový pruh");
  const nIn = S.nodes[r1.edges[r1.edges.length - 1].b], nOut = S.nodes[r2.edges[0].a];
  ok(nIn.port && nOut.port, "pruhy: rampy jsou napojené na pruh");
  const rampIn = r1.edges[r1.edges.length - 1].id * 2; ok(nIn.lc.get(rampIn)[0].length === 1 && nIn.lc.get(rampIn)[0][0].free && nIn.lc.get(rampIn)[0][0].lane === 2, "pruhy: nájezd vede do vlastního pruhu");
  const e1 = r1.edges[0], e2 = r2.edges[r2.edges.length - 1];
  const west = hw.find(e => Math.min(e.g.pts[0], e.g.pts[e.g.pts.length - 2]) < 13), east = hw.find(e => Math.max(e.g.pts[0], e.g.pts[e.g.pts.length - 2]) > 58);
  let made = 0, maxWait = 0;
  const spawn = (from, fu, to, tu) => { const g = { e: to.id, u: tu, dirs: [0, 1] }; const p = A.findPath(S, { e: from.id, u: fu, dirs: [0, 1] }, g); if (!p) return;
    const c = A.newVehicle(S, { links: p.links, s: p.s0, sEnd: p.sEnd, goalEp: g, trip: { to: { isGate: true } }, state: "exit" }); c.lane = A.chooseLane(S, c, 0); S.exiting.push(c); made++; };
  for (let t = 0; t < 3600; t++) { if (t % 12 === 0) spawn(west, 1, east, east.g.len - 1); if (t % 20 === 5) spawn(e1, 0.5, east, east.g.len - 1); if (t % 25 === 7) spawn(west, 1, e2, e2.g.len - 0.5);
    A.updateVehicles(S, 1 / 30); for (const c of S.cars) if (!c.dead && c.wait > maxWait) maxWait = c.wait; }
  ok(made > 500, "pruhy: auta vyjela (" + made + ")"); ok(S.stuckN === 0 && maxWait < 5, `pruhy: průplet se nezasekne (vzdalo ${S.stuckN}, nejdelší čekání ${maxWait.toFixed(1)} s)`);
  zkontroluj(S, "pruhy");
}
// ---- šipky: hráč změní řazení, spojení pruhů se přepočítá ----
{
  const S = A.createSim(11); S.money = 1e8;
  for (const e of [...S.edges]) if (!e.dead && !e.gateEdge) A.eraseEdge(S, e);
  const F = (x, yy) => ({ type: "free", x, y: yy, lvl: 0 });
  A.buildRoad(S, { pts: A.mkLine(20.5, 40.5, 40.5, 40.5), kind: "road", lanes: 2, start: F(20.5, 40.5), end: F(40.5, 40.5), auto: true });
  A.buildRoad(S, { pts: A.mkLine(30.5, 32.5, 30.5, 48.5), kind: "road", lanes: 2, start: F(30.5, 32.5), end: F(30.5, 48.5), auto: true });
  const n = S.nodes.find(n => !n.dead && n.edges.length === 4); ok(!!n, "šipky: křižovatka");
  const a = n.arms[0], l = a.inLink, e = S.edges[a.e];
  ok(n.lm.get(l)[0] === 3 && n.lm.get(l)[1] === 6, "šipky: samočinně vlevo+rovně a rovně+vpravo (" + n.lm.get(l) + ")");
  const r = A.cycleArrow(S, e, l & 1, 0); ok(r.ok && n.lm.get(l)[0] === 1, "šipky: vnitřní pruh jen vlevo");
  ok(n.lc.get(l)[1].some(q => q.turn === 0) && n.lc.get(l)[0].every(q => q.turn !== 0), "šipky: rovně jen z druhého pruhu");
  for (const t of n.turns.get(l)) ok(n.lc.get(l).some(row => row.some(q => q.link === t.link)), "šipky: každý směr má pruh");
}

// ---- napojení na pruh: z konce přidaného pruhu vede jednosměrka, silnice má přednost ----
{
  const S = A.createSim(11); S.money = 1e8; const y = 60.5;
  A.buildRoad(S, { pts: A.mkLine(10.5, y, 40.5, y), kind: "road", lanes: 1, start: { type: "free", x: 10.5, y, lvl: 0 }, end: { type: "free", x: 40.5, y, lvl: 0 }, auto: true });
  const e = S.edges.find(q => !q.dead && Math.abs(q.g.pts[1] - y) < 0.01 && q.g.len > 20);
  A.commitLanes(S, A.planLanes(S, e, 1, 0, [12 - (e.g.pts[0] - 10.5), 18 - (e.g.pts[0] - 10.5)]));
  const ports = S.nodes.filter(n => !n.dead && n.edges.length === 2).flatMap(n => A.lanePorts(S, n));
  ok(ports.length === 2, `přidaný pruh má dvě místa napojení (${ports.length})`);
  const ex = ports.find(p => !p.entry);
  if (ex) {
    const sn = A.snapPort(S, ex.x, ex.y, 0); ok(sn && sn.port, "kurzor se chytí konce pruhu");
    const r = A.buildRoad(S, { pts: A.mkCubic(sn.x, sn.y, sn.x + sn.dir[0] * 2, sn.y + sn.dir[1] * 2, sn.x + 4, sn.y + 4, sn.x + 5, sn.y + 6), kind: "oneway", lanes: 1, start: sn, end: { type: "free", x: sn.x + 5, y: sn.y + 6, lvl: 0 } });
    ok(r.ok, "jednosměrka z konce pruhu postavena " + (r.msg || ""));
    const n = S.nodes[sn.node]; ok(n.edges.length === 3 && n.eff === "main" && n.pass, "silnice přes napojení má přednost a jde vcelku");
    const a = A.snapPoint(S, 12.5, y, 0); const ow = S.edges.find(q => !q.dead && q.kind === "oneway");
    ok(ow && A.findPath(S, { e: a.edge, u: a.u, side: 1 }, { node: ow.b }), "z pruhu jde odbočit");
  }
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
    const p = A.gridPath(S, t.homes[0].access.x, t.homes[0].access.y, b.homes[0].access.x, b.homes[0].access.y);
    if (p) A.buildCellPath(S, p, "road", false); done.push(t);
  }
  for (const g of S.gates) {
    const n = S.nodes.find(x => x.gate === g.id); const e = S.edges.find(x => !x.dead && x.gateEdge && (x.a === n.id || x.b === n.id));
    const end = S.nodes[e.a === n.id ? e.b : e.a];
    let b = null, bd = 1e9; for (const o of S.towns) { const d = Math.hypot(o.cx - end.x, o.cy - end.y); if (d < bd) { bd = d; b = o; } }
    // napojení na konci dálnice (z boku by šlo jen vpravo): kus rovně dál a odtud k obci
    const g0 = S.nodes[g.node], dx = Math.sign(Math.round(end.x - g0.x)), dy = Math.sign(Math.round(end.y - g0.y));
    const fx = end.x + dx * 3, fy = end.y + dy * 3; road(S, end.x, end.y, fx, fy, "road");
    const p = A.gridPath(S, fx, fy, b.homes[0].access.x, b.homes[0].access.y);
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
  // rozdělení úseků s auty: žádné auto nezmizí
  { const alive0 = S.cars.filter(c => !c.dead).length; let cuts = 0;
    for (const e of [...S.edges]) { if (e.dead || e.ring || e.gateEdge || e.g.len < 3) continue; if (!e.q.some(l => l.some(q => q.length))) continue;
      if (A.splitAt(S, e, e.g.len / 2).ok) cuts++; if (cuts >= 12) break; }
    ok(S.cars.filter(c => !c.dead).length === alive0, `rozdělením úseků se ztratila auta (${alive0} → ${S.cars.filter(c => !c.dead).length})`);
    zkontroluj(S, "po rozdělení"); souhrn.rozdeleno = (souhrn.rozdeleno || 0) + cuts;
    for (const n of S.nodes) if (!n.dead && n.keep) A.unsplit(S, n);
    ok(S.cars.filter(c => !c.dead).length === alive0, "spojením úseků se ztratila auta");
    zkontroluj(S, "po spojení"); }
  // úpravy silnic za jízdy
  let k = 0;
  for (const e of [...S.edges]) { if (e.dead || e.ring || e.gateEdge) continue; k++;
    if (k % 7 === 0) { const p = A.planLanes(S, e, 1); if (p.ok) A.commitLanes(S, p); }
    else if (k % 11 === 0 && e.kind === "road") A.cycleOneway(S, e);
    else if (k % 13 === 0) A.setKind(S, e, "blvd"); }
  for (const n of S.nodes) if (!n.dead && n.edges.length >= 3 && !n.ring) A.setControl(S, n, [1, 2, 3][n.id % 3], n.edges.slice(0, 2));
  for (let s = 0; s < T; s++) { A.step(S, A.STEP); if (s % 600 === 0) zkontroluj(S, (s ? "den2 " : "po úpravách ") + A.hourOf(S).toFixed(1) + "h"); }
  const pop1 = S.towns.reduce((a, t) => a + t.pop, 0);
  ok(pop1 > pop0, `obce po propojení rostou (${pop0} → ${pop1})`);
  ok(S.trips > 50, `lidé dojíždějí do cíle (${S.trips})`);
  ok(S.transits > 0, `projíždí tranzit (${S.transits})`);
  ok((S.xCount || 0) > 0, `chodci přecházejí po přechodech (${S.xCount || 0})`);
  souhrn.prechody = (souhrn.prechody || 0) + (S.xCount || 0); souhrn.vzdali = (souhrn.vzdali || 0) + S.stuckN;
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
console.log('  souhrn: ' + JSON.stringify({ kruh: souhrn.kruh, rozdeleno: souhrn.rozdeleno, prechody: souhrn.prechody, vzdali: souhrn.vzdali }));
console.log(`verze ${A.GAME_VERSION}: ${kontroly} kontrol, ${chyby} chyb`);
process.exit(chyby ? 1 : 0);
