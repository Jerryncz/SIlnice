// Test simulace bez prohlížeče: node tests/test_simulace.js
// Složí src/sim/*.js (stejně jako build.js), postaví silnice, mosty, kruhový objezd a nájezd na dálnici,
// rozehraje dva herní dny a hlídá, že se simulace nerozbije.
"use strict";
const vm = require("vm");
const B = require("../build.js");

const ctx = { console };
vm.createContext(ctx);
vm.runInContext(B.simSource() + "\nthis.A={planRoundabout,commitRoundabout,setRingType,connNodeOk,saveState,loadState,planBend,planMove,planReconnect,planSlide,commitEdit,editHandles,slideInfo,updateOvertakes,lotPath,LOT_A,LOT_RD,R_LOT,planRoad2:planRoad,lanePose,planLanes,commitLanes,linkLanes,eraseEdge,newVehicle,chooseLane,updateVehicles,connAdd,connRemove,connReset,mkCubic,lanePorts,snapPort,W,planTemplate,commitTemplate,planBranch,commitBranch,toggleCross,toggleMidCross,isRampEdge,unitFree,MW,MH,createSim,step,STEP,N,W,NB,DAY,buildRoad,planRoad,snapPoint,mkLine,mkBezier,planRoundabout,commitRoundabout,findPath,gridPath,buildCellPath,eraseEdge,demolishBuilding,planLanes,commitLanes,planKind,commitKind,splitAt,unsplit,stopS,cycleOneway,setControl,setKind,hourOf,cellAt,GAME_VERSION};", ctx);
const A = ctx.A;

let chyby = 0, kontroly = 0;
function ok(podminka, text) { kontroly++; if (!podminka) { chyby++; if (chyby < 40) console.log("  CHYBA: " + text); } }

const zkontroluj = require("./kontroly.js")(A, ok);
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
  const alongY = (y) => S.edges.filter(e => !e.dead && Math.abs(e.g.pts[1] - y) < 0.05 && Math.abs(e.g.pts[e.g.pts.length - 1] - y) < 0.05 && Math.min(e.g.pts[0], e.g.pts[e.g.pts.length - 2]) > X - 1 && Math.max(e.g.pts[0], e.g.pts[e.g.pts.length - 2]) < X + 25);
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
  const yb = Y + 7.5;
  ok(road(S, X + 2.5, yb, X + 12.5, yb, "road").ok, "silnice pod most");
  const nb0 = S.nodes.filter(n => !n.dead).length;
  const br = A.buildRoad(S, { pts: A.mkLine(X + 7.5, yb - 3.5, X + 7.5, yb + 3.5), kind: "road", lanes: 1, level: 1, start: { type: "free", x: X + 7.5, y: yb - 3.5, lvl: 0 }, end: { type: "free", x: X + 7.5, y: yb + 3.5, lvl: 0 } });
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
// ---- jednosměrka: pruh navíc na zvoleném okraji, původní zůstane na místě; dvoupruhový sjezd z dálnice ----
{
  const S = A.createSim(11); S.money = 1e8; const y = 40.5;
  for (const e of [...S.edges]) if (!e.dead && !e.gateEdge) A.eraseEdge(S, e);
  for (const b of [...S.buildings]) A.demolishBuilding(S, b, true);
  const sp = (x, yy) => { const q = A.snapPoint(S, x, yy, 0); return q.type === "free" ? { type: "free", x, y: yy, lvl: 0 } : q; };
  const rd = (pts, kind, lanes) => A.buildRoad(S, { pts, kind, lanes, start: sp(pts[0], pts[1]), end: sp(pts[pts.length - 2], pts[pts.length - 1]) });
  rd(A.mkLine(12.5, y, 58.5, y), "hwy", 2); const r2 = rd(A.mkCubic(38.5, y, 42, y, 46, 44, 46.5, 47.5), "ramp", 1);
  let ramp = r2.edges[0]; const p0 = A.lanePose(S, ramp.id * 2, 0, 0);
  ok(A.commitLanes(S, A.planLanes(S, ramp, 1, 0)).ok, "jednosměrka: pruh vpravo");
  ramp = S.edges.find(e => !e.dead && e.kind === "ramp"); const p1 = A.lanePose(S, ramp.id * 2, 0, 0), p2 = A.lanePose(S, ramp.id * 2, 1, 0);
  ok(Math.hypot(p0.x - p1.x, p0.y - p1.y) < 0.01 && p2.y > p1.y + 0.2, "jednosměrka: původní pruh zůstal na místě, nový je vpravo");
  const dec = S.edges.find(e => !e.dead && e.kind === "hwy" && e.lf === 3); ok(dec && A.commitLanes(S, A.planLanes(S, dec, 1, 0)).ok, "dálnice: druhý odbočovací pruh");
  const n = S.nodes[ramp.a]; const lcs = [...n.lc.values()].find(lc => lc.length === 4);
  ok(lcs && lcs[2].length === 1 && lcs[3].length === 1 && lcs[2][0].lane === 0 && lcs[3][0].lane === 1 && lcs[2][0].link === ramp.id * 2, "dálnice: dva odbočovací pruhy vedou do dvou pruhů sjezdu");
  ok(A.commitLanes(S, A.planLanes(S, ramp, 1, 1)).ok, "jednosměrka: pruh vlevo"); ramp = S.edges.find(e => !e.dead && e.kind === "ramp");
  const p3 = A.lanePose(S, ramp.id * 2, 1, 0); ok(ramp.lf === 3 && Math.hypot(p3.x - p0.x, p3.y - p0.y) < 0.01, "jednosměrka: po přidání vlevo je původní pruh druhý a na místě");
  ok(A.planLanes(S, S.edges.find(e => !e.dead && !e.gateEdge && e.kind === "hwy" && e.lf === 2), 8, 0).ok, "dálnice: až 10 pruhů v jednom směru");
}
// ---- konec silnice: jednosměrky napojené na jednotlivé pruhy, 10 pruhů, nízký most ----
{
  const S = A.createSim(11); S.money = 1e8;
  for (const e of [...S.edges]) if (!e.dead && !e.gateEdge) A.eraseEdge(S, e);
  for (const b of [...S.buildings]) A.demolishBuilding(S, b, true);
  const F = (x, y) => ({ type: "free", x, y, lvl: 0 });
  ok(A.buildRoad(S, { pts: A.mkLine(8.5, 15.5, 24.5, 15.5), kind: "road", lanes: 2, start: F(8.5, 15.5), end: F(24.5, 15.5) }).ok, "konec: silnice 2+2");
  const nd = S.nodes.find(n => !n.dead && Math.abs(n.x - 24.5) < 0.1 && Math.abs(n.y - 15.5) < 0.1);
  const sn = cy => ({ type: "node", node: nd.id, x: nd.x, y: nd.y, lvl: 0, cx: 24.5, cy });
  ok(A.buildRoad(S, { pts: A.mkCubic(34.5, 8.5, 30, 8.5, 28, 15.3, 24.5, 15.3), kind: "oneway", lanes: 1, start: F(34.5, 8.5), end: sn(15.37) }).ok, "konec: příjezd");
  const o1 = A.buildRoad(S, { pts: A.mkCubic(24.5, 15.9, 28, 15.9, 30, 22.5, 34.5, 22.5), kind: "oneway", lanes: 1, start: sn(15.9), end: F(34.5, 22.5) });
  const o2 = A.buildRoad(S, { pts: A.mkLine(24.5, 15.63, 36.5, 15.63), kind: "oneway", lanes: 1, start: sn(15.63), end: F(36.5, 15.63) });
  ok(o1.ok && o2.ok && nd.endPort && nd.port, "konec: dva odjezdy, uzel je napojení na pruhy");
  const rin = [...nd.lc].find(([l]) => S.edges[l >> 1].kind === "road")[1];
  ok(rin[0].length === 1 && rin[1].length === 1 && rin[0][0].link === o2.edges[0].id * 2 && rin[1][0].link === o1.edges[0].id * 2 && rin[0][0].free && rin[1][0].free, "konec: každý pruh vede do své jednosměrky bez dávání přednosti");
  ok(A.buildRoad(S, { pts: A.mkLine(8.5, 30.5, 24.5, 30.5), kind: "road", lanes: 10, start: F(8.5, 30.5), end: F(24.5, 30.5) }).ok, "silnice s 10 pruhy v každém směru jde postavit");
  // most začínající těsně u silnice: rampa by ji křížila v půli výšky
  ok(A.buildRoad(S, { pts: A.mkLine(4.5, 40.5, 20.5, 40.5), kind: "road", lanes: 1, start: F(4.5, 40.5), end: F(20.5, 40.5) }).ok, "silnice pod most");
  const lowB = A.planRoad(S, { pts: A.mkLine(12.5, 39.5, 12.5, 48.5), kind: "road", lanes: 1, level: 1, start: F(12.5, 39.5), end: F(12.5, 48.5) });
  ok(!lowB.ok && /nízko/.test(lowB.msg), "most nejde vést přes silnici tam, kde ještě není dost vysoko (" + lowB.msg + ")");
  for (let k = 0; k < 300; k++) A.step(S, A.STEP); zkontroluj(S, "konec silnice");
}
// ---- předjetí: auto čekající na odbočení do vjezdu se objede protisměrem ----
{
  const S = A.createSim(11); S.money = 1e8;
  for (const e of [...S.edges]) if (!e.dead && !e.gateEdge) A.eraseEdge(S, e);
  for (const b of [...S.buildings]) A.demolishBuilding(S, b, true);
  const F = (x, yy) => ({ type: "free", x, y: yy, lvl: 0 });
  const r = A.buildRoad(S, { pts: A.mkLine(10.5, 40.5, 40.5, 40.5), kind: "road", lanes: 1, start: F(10.5, 40.5), end: F(40.5, 40.5), auto: true });
  const e = r.edges[0], l = e.id * 2;
  const orig = ctx.turnGap; ctx.turnGap = (S2, c) => !c.blockMe;   // auto A pořád čeká na mezeru v protisměru
  const mk = (s, sEnd) => { const c = A.newVehicle(S, { links: [l], s, sEnd, trip: { to: { isGate: true } }, state: "drive" }); c.lane = 0; e.q[0][0].push(c); e.q[0][0].sort((a, b) => b.s - a.s); return c; };
  const a = mk(12, 12); a.blockMe = true; const b = mk(3, 28);
  for (let k = 0; k < 600; k++) { A.updateVehicles(S, 1 / 30); A.updateOvertakes(S, 1 / 30); }
  ctx.turnGap = orig;
  ok((S.overtakes || 0) >= 1 && (b.dead || b.s > a.s), `předjetí: auto objelo stojící auto (${S.overtakes || 0}, ${b.s.toFixed(1)} > ${a.s.toFixed(1)})`);
  ok(!e.obusy || !e.obusy.length, "předjetí: protisměr je po předjetí zase volný");
}
// ---- spojení pruhů: hráč přidá a zruší spojení, hledání cest to respektuje ----
{
  const S = A.createSim(11); S.money = 1e8;
  for (const e of [...S.edges]) if (!e.dead && !e.gateEdge) A.eraseEdge(S, e);
  const F = (x, yy) => ({ type: "free", x, y: yy, lvl: 0 });
  A.buildRoad(S, { pts: A.mkLine(20.5, 40.5, 40.5, 40.5), kind: "road", lanes: 2, start: F(20.5, 40.5), end: F(40.5, 40.5), auto: true });
  A.buildRoad(S, { pts: A.mkLine(30.5, 32.5, 30.5, 48.5), kind: "road", lanes: 2, start: F(30.5, 32.5), end: F(30.5, 48.5), auto: true });
  const n = S.nodes.find(n => !n.dead && n.edges.length === 4); ok(!!n, "spojení: křižovatka");
  const a = n.arms[0], l = a.inLink;
  ok(n.lm.get(l)[0] === 3 && n.lm.get(l)[1] === 6, "spojení: samočinně vlevo+rovně a rovně+vpravo (" + n.lm.get(l) + ")");
  const left = n.lc.get(l)[0].find(q => q.turn === -1); ok(!!left, "spojení: z vnitřního pruhu vede vlevo");
  // zrušit odbočení vlevo: z příjezdu pak vlevo naplánovat nejde
  ok(A.connRemove(S, n, l, 0, left.link, left.lane).ok, "spojení: zrušeno vlevo");
  ok(!(n.turns.get(l) || []).some(x => x.link === left.link), "spojení: odbočení bez spojení nejde naplánovat");
  // přidat vlevo z vnějšího pruhu do vnějšího pruhu cíle
  ok(A.connAdd(S, n, l, 1, left.link, 1).ok, "spojení: přidáno vlevo z druhého pruhu");
  ok(n.lc.get(l)[1].some(q => q.link === left.link && q.lane === 1) && (n.turns.get(l) || []).some(x => x.link === left.link), "spojení: nové spojení platí a jde po něm jet");
  ok(!A.connAdd(S, n, l, 0, a.outLink, 0).ok, "spojení: otočit se do stejného ramene nejde");
  ok(A.connReset(S, n).ok && n.lm.get(l)[0] === 3, "spojení: vrátit samočinná");
  for (let k = 0; k < 300; k++) A.step(S, A.STEP); zkontroluj(S, "spojení");
}

// ---- roh dvou úseků bez křižovatky: pruh na konci jednoho navazuje na stejný pruh dalšího (pokos) ----
{
  const S = A.createSim(11); S.money = 1e8;
  for (const e of [...S.edges]) if (!e.dead && !e.gateEdge) A.eraseEdge(S, e);
  const F = (x, yy) => ({ type: "free", x, y: yy, lvl: 0 });
  A.buildRoad(S, { pts: A.mkLine(20.5, 40.5, 30.5, 40.5), kind: "road", lanes: 2, start: F(20.5, 40.5), end: F(30.5, 40.5), auto: true });
  A.buildRoad(S, { pts: A.mkLine(30.5, 40.5, 30.5, 50.5), kind: "road", lanes: 2, start: A.snapPoint(S, 30.5, 40.5, 0), end: F(30.5, 50.5), auto: true });
  const n = S.nodes.find(q => !q.dead && q.edges.length === 2 && Math.abs(q.x - 30.5) < 0.01 && Math.abs(q.y - 40.5) < 0.01); ok(!!n, "roh: uzel");
  if (n) { const e1 = S.edges[n.edges[0]], e2 = S.edges[n.edges[1]];
    let maxGap = 0;
    for (const [ea, eb] of [[e1, e2], [e2, e1]]) for (let d = 0; d < 2; d++) {
      const la = ea.id * 2 + d; const arrive = (ea.b === n.id) === (d === 0); if (!arrive) continue;
      const lb = eb.id * 2 + ((eb.a === n.id) ? 0 : 1);
      for (let k = 0; k < 2; k++) { const p = A.lanePose(S, la, k, ea.g.len), q = A.lanePose(S, lb, k, 0); maxGap = Math.max(maxGap, Math.hypot(p.x - q.x, p.y - q.y)); } }
    ok(maxGap < 0.02, "roh: pruh navazuje bez skoku (" + maxGap.toFixed(3) + ")");
    // vnější pruh vede až do pokosu, ne do středu druhé silnice
    const l = e1.id * 2 + (e1.b === n.id ? 0 : 1); const p = A.lanePose(S, l, 1, e1.g.len);
    ok(Math.abs(Math.abs(p.x - n.x) - Math.abs(p.y - n.y)) < 0.02, "roh: konec pruhu leží na úhlopříčce rohu"); }
}

// ---- kruhový objezd s víc pruhy: Běžný a Turbo, spojení jako v křižovatce ----
for (const turbo of [false, true]) {
  const nm = turbo ? "turbo" : "kruh";
  const S = A.createSim(11); S.money = 1e8;
  for (const e of [...S.edges]) if (!e.dead && !e.gateEdge) A.eraseEdge(S, e);
  const F = (x, yy) => ({ type: "free", x, y: yy, lvl: 0 });
  const cx = 40.5, cy = 40.5;
  ok(!A.planRoundabout(S, cx, cy, 1.5, "road", 6, turbo).ok, nm + ": 6 pruhů na malý kruh nejde");
  const rads = [];
  for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) { const r = A.buildRoad(S, { pts: A.mkLine(cx + dx * 14, cy + dy * 14, cx + dx * 2, cy + dy * 2), kind: "road", lanes: 2, start: F(cx + dx * 14, cy + dy * 14), end: F(cx + dx * 2, cy + dy * 2), auto: true }); rads.push(r.edges[0]); }
  const p = A.planRoundabout(S, cx, cy, 4, "road", 3, turbo); ok(p.ok, nm + ": 3 pruhy naplánovány " + (p.msg || ""));
  const r = A.commitRoundabout(S, p); ok(r.ok, nm + ": postaven");
  const rid = S.rings[S.rings.length - 1].id; const ring = S.edges.filter(e => !e.dead && e.ring === rid);
  ok(ring.length >= 4 && ring.every(e => e.lf === 3 && !!e.turbo === turbo), nm + ": úseky kruhu mají 3 pruhy a typ");
  const entries = S.nodes.filter(n => !n.dead && n.ring === rid && n.edges.length === 3);
  ok(entries.length === 4 && entries.every(n => A.connNodeOk(n)), nm + ": 4 vjezdy jsou křižovatky pro Spojení");
  const n = entries[0]; const rin = n.arms.find(a => S.edges[a.e].ring && A.linkLanes(S, a.inLink)), rad = n.arms.find(a => !S.edges[a.e].ring), rout = n.arms.find(a => S.edges[a.e].ring && A.linkLanes(S, a.outLink));
  const lcR = n.lc.get(rad.inLink), lcI = n.lc.get(rin.inLink);
  ok(lcR[1].some(q => q.link === rout.outLink && q.lane === 2), nm + ": pravý pruh vjezdu do vnějšího pruhu kruhu");
  ok(lcR[0].some(q => q.link === rout.outLink && q.lane < 2), nm + ": levý pruh vjezdu do vnitřního pruhu");
  ok(lcI[2].some(q => q.link === rad.outLink) && !lcI[0].some(q => q.link === rad.outLink), nm + ": z kruhu se vyjíždí z vnějších pruhů");
  if (turbo) ok(lcI[0].some(q => q.link === rout.outLink && q.lane === 1) && !lcI[2].some(q => q.link === rout.outLink), nm + ": pruhy se u výjezdu stáčejí ven");
  else ok(lcI[0].some(q => q.link === rout.outLink && q.lane === 0) && lcI[2].some(q => q.link === rout.outLink && q.lane === 2), nm + ": pruhy v kruhu pokračují svým pruhem");
  ok(A.connRemove(S, n, rad.inLink, 1, rout.outLink, 2).ok && !n.lc.get(rad.inLink)[1].some(q => q.link === rout.outLink && q.lane === 2), nm + ": spojení na vjezdu jde zrušit");
  ok(A.connReset(S, n).ok && n.lc.get(rad.inLink)[1].some(q => q.link === rout.outLink && q.lane === 2), nm + ": a vrátit samočinné");
  // provoz: auta ze všech stran do všech výjezdů
  const outerOf = e => (Math.hypot(e.g.pts[0] - cx, e.g.pts[1] - cy) > 10 ? 0 : 1);
  let made = 0, maxWait = 0, ringLaneChange = 0; const seen = new Map();
  const spawn = (from, to) => { const fu = outerOf(from) === 0 ? 0.5 : from.g.len - 0.5, tu = outerOf(to) === 0 ? 0.5 : to.g.len - 0.5;
    const g = { e: to.id, u: tu, dirs: [0, 1] }; const pp = A.findPath(S, { e: from.id, u: fu, dirs: [0, 1] }, g); if (!pp) return;
    const c = A.newVehicle(S, { links: pp.links, s: pp.s0, sEnd: pp.sEnd, goalEp: g, trip: { to: { isGate: true } }, state: "exit" }); c.lane = A.chooseLane(S, c, 0); S.exiting.push(c); made++; };
  const live = () => S.edges.filter(e => !e.dead && !e.ring && !e.gateEdge && Math.hypot(e.g.pts[0] - cx, e.g.pts[1] - cy) + Math.hypot(e.g.pts[e.g.pts.length - 2] - cx, e.g.pts[e.g.pts.length - 1] - cy) > 12);
  for (let t = 0; t < 3600; t++) { const L = live(); if (t % 15 === 0) { const a = L[(t / 15) % L.length | 0], b = L[((t / 15) * 7 + 2) % L.length | 0]; if (a !== b) spawn(a, b); }
    A.updateVehicles(S, 1 / 30);
    for (const c of S.cars) { if (c.dead) continue; if (c.wait > maxWait) maxWait = c.wait; if (c.state !== "drive") continue; const e = S.edges[c.links[c.li] >> 1]; if (!e.ring) continue;
      const k = c.id + ":" + e.id; const pl = seen.get(k); if (pl !== undefined && pl !== c.lane) ringLaneChange++; seen.set(k, c.lane); } }
  const left = S.cars.filter(c => !c.dead).length; ok(made > 100 && made - left > made * 0.8, nm + ": auta projela kruhem (" + (made - left) + " z " + made + ")"); ok(S.stuckN === 0, nm + ": nic se nezaseklo (" + S.stuckN + ", nejdelší čekání " + maxWait.toFixed(1) + " s)");
  if (turbo) ok(ringLaneChange === 0, nm + ": v kruhu se nepřejíždí (" + ringLaneChange + ")");
  zkontroluj(S, nm);
  // přepnutí typu
  ok(A.setRingType(S, rid, !turbo).ok && S.edges.filter(e => !e.dead && e.ring === rid).every(e => !!e.turbo === !turbo), nm + ": typ kruhu jde přepnout");
}

// ---- editor silnic: ohnout úsek, posunout křižovatku, přepojit konec, posunout hranici přídavného pruhu ----
{
  console.log("Editor silnic");
  const S = A.createSim(11); S.money = 1e8;
  for (const e of [...S.edges]) if (!e.dead && !e.gateEdge) A.eraseEdge(S, e);
  const F = (x, yy) => ({ type: "free", x, y: yy, lvl: 0 });
  const R = (x0, y0, x1, y1, l) => A.buildRoad(S, { pts: A.mkLine(x0, y0, x1, y1), kind: "road", lanes: l || 1, start: F(x0, y0), end: F(x1, y1), auto: true });
  R(20.5, 40.5, 40.5, 40.5); R(30.5, 40.5, 30.5, 48.5); R(36.5, 44.5, 36.5, 52.5);
  const n = S.nodes.find(q => !q.dead && q.edges.length === 3); ok(!!n, "editor: křižovatka T");
  // posunout křižovatku
  let p = A.planMove(S, n, 31.5, 40.5); ok(p.ok, "editor: posun křižovatky naplánován " + (p.msg || ""));
  if (p.ok) { ok(A.commitEdit(S, p).ok, "editor: křižovatka posunuta"); ok(Math.abs(n.x - 31.5) < 1e-6 && n.edges.length === 3, "editor: uzel je na novém místě a má tři ramena");
    ok(n.edges.every(id => { const e = S.edges[id], q = e.a === n.id ? 0 : e.g.pts.length - 2; return Math.hypot(e.g.pts[q] - n.x, e.g.pts[q + 1] - n.y) < 0.01; }), "editor: ramena končí v posunutém uzlu"); }
  ok(!A.planMove(S, n, 36.5, 48.5).ok, "editor: křižovatku nejde posunout na jinou silnici");
  // ohnout svislý úsek
  const ev = S.edges.find(e => !e.dead && (e.a === n.id || e.b === n.id) && Math.abs(e.g.pts[1] - e.g.pts[e.g.pts.length - 1]) > 4);
  const m = { x: (ev.g.pts[0] + ev.g.pts[ev.g.pts.length - 2]) / 2 - 1.5, y: (ev.g.pts[1] + ev.g.pts[ev.g.pts.length - 1]) / 2 };
  p = A.planBend(S, ev, m.x, m.y); ok(p.ok, "editor: ohnutí naplánováno " + (p.msg || ""));
  if (p.ok) { const r = A.commitEdit(S, p); ok(r.ok && r.edges.length === 1, "editor: úsek ohnut"); const ne = r.edges[0];
    let bd = 9; for (let k = 0; k < ne.g.n; k++) bd = Math.min(bd, Math.hypot(ne.g.pts[2 * k] - m.x, ne.g.pts[2 * k + 1] - m.y)); ok(bd < 0.15, "editor: ohnutý úsek vede přes tažený bod (" + bd.toFixed(2) + ")"); }
  const ev2 = S.edges.find(e => !e.dead && (e.a === n.id || e.b === n.id) && Math.abs(e.g.pts[1] - e.g.pts[e.g.pts.length - 1]) > 4);
  p = A.planBend(S, ev2, 39.5, 44.5); ok(!p.ok && /křížil/.test(p.msg), "editor: ohnout přes jinou silnici nejde (" + p.msg + ")");
  ok(A.editHandles(S, ev2).some(h => h.t === "bend") && A.editHandles(S, ev2).some(h => h.t === "end"), "editor: úchyty ohnout a přepojit");
  // přepojit volný konec na jinou silnici
  const dead = S.nodes.find(q => !q.dead && q.edges.length === 1 && Math.abs(q.y - 48.5) < 0.6 && q.x < 34);
  ok(!!dead, "editor: slepý konec");
  if (dead) { const e = S.edges[dead.edges[0]]; const sn = A.snapPoint(S, 36.5, 48.5, 0);
    p = A.planReconnect(S, e, e.a === dead.id, sn); ok(p.ok, "editor: přepojení naplánováno " + (p.msg || ""));
    if (p.ok) { ok(A.commitEdit(S, p).ok, "editor: konec přepojen"); ok(dead.dead, "editor: starý konec zanikl");
      ok(S.nodes.some(q => !q.dead && q.edges.length === 3 && Math.abs(q.x - 36.5) < 0.01), "editor: na druhé silnici vznikla křižovatka"); } }
  // hranice přídavného pruhu
  R(20.5, 58.5, 44.5, 58.5);
  const eh = S.edges.find(e => !e.dead && Math.abs(e.g.pts[1] - 58.5) < 0.01 && e.g.len > 20);
  A.commitLanes(S, A.planLanes(S, eh, 1, 0, [8, 14]));
  const bn = S.nodes.filter(q => !q.dead && q.edges.length === 2 && Math.abs(q.y - 58.5) < 0.01 && A.slideInfo(S, q)).sort((a, b) => a.x - b.x);
  ok(bn.length === 2, "editor: přídavný pruh má dvě hranice (" + bn.length + ")");
  if (bn.length) { const q = bn[0]; const x0 = q.x; p = A.planSlide(S, q, x0 - 2, 58.5); ok(p.ok, "editor: posun hranice naplánován " + (p.msg || ""));
    if (p.ok) { ok(A.commitEdit(S, p).ok, "editor: hranice posunuta"); const w = S.edges.find(e => !e.dead && e.lf === 2 && Math.abs(e.g.pts[1] - 58.5) < 0.01);
      ok(w && Math.abs(w.g.len - 8) < 0.3, "editor: přídavný pruh je o 2 pole delší (" + (w && w.g.len.toFixed(2)) + ")"); ok(Math.abs(q.x - (x0 - 2)) < 0.3, "editor: hranice je na novém místě"); } }
  // čtvereček u křižovatky: konec úseku se od křižovatky odpojí a zůstane volný; zbylé dva rovné kusy se spojí
  const jn = S.nodes.find(q => !q.dead && q.edges.length === 3 && Math.abs(q.y - 40.5) < 0.01);
  ok(!!jn, "editor: křižovatka pro odpojení");
  if (jn) { const e = S.edges.find(x => !x.dead && (x.a === jn.id || x.b === jn.id) && Math.abs(x.g.pts[1] - x.g.pts[x.g.pts.length - 1]) > 2);
    ok(A.editHandles(S, e).some(h => h.t === "end" && (h.atA ? e.a : e.b) === jn.id), "editor: úchyt přepojit u křižovatky");
    p = A.planReconnect(S, e, e.a === jn.id, { type: "free", x: jn.x - 3, y: jn.y + 3, lvl: 0 }); ok(p.ok, "editor: odpojení naplánováno " + (p.msg || ""));
    if (p.ok) { ok(A.commitEdit(S, p).ok, "editor: konec odpojen"); ok(jn.dead, "editor: z křižovatky zbyla rovná silnice (uzel zanikl)"); } }
  for (let k = 0; k < 600; k++) A.step(S, A.STEP); zkontroluj(S, "editor");
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
  if (junc) { const p = A.planRoundabout(S, junc.x, junc.y, 2); if (p.ok) { const r = A.commitRoundabout(S, p); ok(r.ok, "kruhový objezd postaven"); souhrn.kruh = (souhrn.kruh || 0) + 1; if (seed === 98765) ok(A.setRingType(S, S.rings[S.rings.length - 1].id, true).ok, "kruh přepnut na turbo"); } }
  const pop0 = S.towns.reduce((a, t) => a + t.pop, 0);
  const T = Math.round(A.DAY / A.STEP);
  for (let s = 0; s < T; s++) { A.step(S, A.STEP); if (s % 600 === 0) zkontroluj(S, "den1 " + A.hourOf(S).toFixed(1) + "h"); }
  // uložení a nahrání celého stavu: nahraný stav je stejný a pokračuje přesně stejně
  { const j = A.saveState(S); const S2 = A.loadState(j); ok(A.saveState(S2) === j, "stav: nahraný stav je stejný jako uložený");
    for (let s = 0; s < 450; s++) { A.step(S, A.STEP); A.step(S2, A.STEP); }
    ok(A.saveState(S2) === A.saveState(S), "stav: nahraná hra pokračuje přesně stejně"); zkontroluj(S2, "nahraný stav");
    souhrn.stavKB = Math.max(souhrn.stavKB || 0, Math.round(j.length / 1024)); }
  // rozdělení úseků s auty: žádné auto nezmizí
  { const alive0 = S.cars.filter(c => !c.dead).length; let cuts = 0;
    for (const e of [...S.edges]) { if (e.dead || e.ring || e.gateEdge || e.g.len < 3) continue; if (!e.q.some(l => l.some(q => q.length))) continue;
      if (A.splitAt(S, e, e.g.len / 2).ok) cuts++; if (cuts >= 12) break; }
    ok(S.cars.filter(c => !c.dead).length === alive0, `rozdělením úseků se ztratila auta (${alive0} → ${S.cars.filter(c => !c.dead).length})`);
    zkontroluj(S, "po rozdělení"); souhrn.rozdeleno = (souhrn.rozdeleno || 0) + cuts;
    for (const n of S.nodes) if (!n.dead && n.keep) A.unsplit(S, n);
    ok(S.cars.filter(c => !c.dead).length === alive0, "spojením úseků se ztratila auta");
    zkontroluj(S, "po spojení"); }
  // editor za jízdy: ohnout úseky s auty, posunout křižovatky (bez bourání); žádné auto nezmizí
  { const alive0 = S.cars.filter(c => !c.dead).length; let bends = 0, moves = 0;
    for (const e of [...S.edges]) { if (e.dead || e.ring || e.gateEdge || e.g.len < 4) continue; if (!e.q.some(l => l.some(q => q.length))) continue;
      const m = e.g.pts.length >> 2; const q = { x: e.g.pts[2 * m], y: e.g.pts[2 * m + 1] }; const g = e.g; const mid = g.len / 2;
      let nx = 0, ny = 0; { const k = Math.min(g.n - 2, Math.max(0, m)); const dx = g.pts[2 * k + 2] - g.pts[2 * k], dy = g.pts[2 * k + 3] - g.pts[2 * k + 1], l = Math.hypot(dx, dy) || 1; nx = -dy / l; ny = dx / l; }
      const p = A.planBend(S, e, q.x + nx * 0.5, q.y + ny * 0.5); if (p.ok && !p.demolish.length && A.commitEdit(S, p).ok) bends++; if (bends >= 8) break; }
    for (const n of [...S.nodes]) { if (n.dead || n.edges.length < 3) continue; const p = A.planMove(S, n, n.x + 0.5, n.y); if (p.ok && !p.demolish.length && A.commitEdit(S, p).ok) moves++; if (moves >= 5) break; }
    ok(S.cars.filter(c => !c.dead).length === alive0, `editorem se ztratila auta (${alive0} → ${S.cars.filter(c => !c.dead).length})`);
    zkontroluj(S, "po editoru"); souhrn.ohnuto = (souhrn.ohnuto || 0) + bends; souhrn.posunuto = (souhrn.posunuto || 0) + moves; }
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
  souhrn.prechody = (souhrn.prechody || 0) + (S.xCount || 0); souhrn.chodciVzdali = (souhrn.chodciVzdali || 0) + (S.pedAborted || 0); souhrn.chodci = (souhrn.chodci || 0) + (S.pedDone || 0); souhrn.predjeti = (souhrn.predjeti || 0) + (S.overtakes || 0); souhrn.vzdali = (souhrn.vzdali || 0) + S.stuckN; souhrn.minuli = (souhrn.minuli || 0) + (S.missed || 0); souhrn.preplanovali = (souhrn.preplanovali || 0) + (S.replanned || 0);
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
console.log('  souhrn: ' + JSON.stringify({ stavKB: souhrn.stavKB, kruh: souhrn.kruh, rozdeleno: souhrn.rozdeleno, ohnuto: souhrn.ohnuto, posunuto: souhrn.posunuto, prechody: souhrn.prechody, chodci: souhrn.chodci, chodciVzdali: souhrn.chodciVzdali, predjeti: souhrn.predjeti, vzdali: souhrn.vzdali, minuli: souhrn.minuli, preplanovali: souhrn.preplanovali }));
console.log(`verze ${A.GAME_VERSION}: ${kontroly} kontrol, ${chyby} chyb`);
process.exit(chyby ? 1 : 0);
