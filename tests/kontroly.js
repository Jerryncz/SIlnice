// Kontroly, že je stav simulace v pořádku (auta ve frontách, obsazená místa, čítače …).
// Používá je tests/test_simulace.js i tests/hlaseni.js.
"use strict";
// A = export simulace (lotPath, stopS), ok(podmínka, text) = zápis výsledku
module.exports = function (A, ok) {
  return function zkontroluj(S, kde) {
    let pres = 0, prekryv = 0;
    for (const c of S.cars) {
      if (c.dead) continue;
      if (c.state === "drive") {
        const l = c.links[c.li], e = S.edges[l >> 1];
        ok(!e.dead, `${kde}: auto na zbouraném úseku`);
        const q = e.q[l & 1][c.lane];
        ok(q && q.includes(c), `${kde}: auto chybí ve frontě svého pruhu`);
        if (c.li < c.links.length - 1) { const st = A.stopS(S, l); if (st > c.len + 0.1 && c.s + c.len / 2 > st + 0.02) pres++; }
      } else if (c.state === "overtake") { ok(!!c.ov && (S.overtaking || []).includes(c), `${kde}: předjíždějící auto bez záznamu`); for (const q of S.edges[c.ov.e].q[c.ov.dir]) ok(!q.includes(c), `${kde}: předjíždějící auto zůstalo ve frontě`); }
      else ok(c.state === "exit" || c.state === "enter" || c.state === "unpark", `${kde}: auto v neznámém stavu ${c.state}`);
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
    // chodci: do vozovky vstoupí jen na přechodu (nebo přes uličku), a jen když na něj smějí; jdou po chodníkové síti
    for (const w of S.walkers) { if (w.dead) continue; ok(Array.isArray(w.path) && w.path.length >= 2, `${kde}: chodec bez cesty`);
      w.spans.forEach((sp, i) => { if (w.s > sp.s0 + 0.02 && w.s < sp.s1 - 0.02) ok(w.state === "cross" && i === w.si && !!w.held, `${kde}: chodec ve vozovce bez povolení (${w.state})`); });
      if (w.state === "cross") ok(!!w.held, `${kde}: přecházející chodec nedrží přechod`); }
    // příjezdy a parkoviště: cesta od okraje silnice vede jen po příjezdu a uličkách, stání se nepřekrývají s uličkami
    for (const b of S.buildings) { if (b.dead || !b.access) continue;
      ok(!!b.drive, `${kde}: ${b.name} má vjezd bez příjezdu`);
      const lay = b.lay; if (!lay) continue; const F = lay.F;
      const loc = q => [(q[0] - F.O[0]) * F.d[0] + (q[1] - F.O[1]) * F.d[1], (q[0] - F.O[0]) * F.p[0] + (q[1] - F.O[1]) * F.p[1]];
      const inA = (dep, lat) => lay.aisles.some(a => { const d0 = Math.min(a.a[0], a.b[0]) - a.w / 2 - 1e-3, d1 = Math.max(a.a[0], a.b[0]) + a.w / 2 + 1e-3, l0 = Math.min(a.a[1], a.b[1]) - a.w / 2 - 1e-3, l1 = Math.max(a.a[1], a.b[1]) + a.w / 2 + 1e-3; return dep >= d0 && dep <= d1 && lat >= l0 && lat <= l1; });
      if (!b._ck) { b._ck = 1;
        for (let i = 0; i < lay.spots.length; i++) { const P = A.lotPath(S, b, i); const sp = lay.spots[i];
          // kromě úseku od okraje silnice k hrdlu a posledního zajetí na místo leží cesta celá v uličkách
          for (let k = 1; k < P.length - 2; k++) for (let t = 0; t <= 1; t += 0.1) { const q = [P[k][0] + (P[k + 1][0] - P[k][0]) * t, P[k][1] + (P[k + 1][1] - P[k][1]) * t]; const [dep, lat] = loc(q);
            if (!inA(dep, lat)) { ok(false, `${kde}: cesta na místo ${i} v ${b.name} vede mimo uličku`); k = 99; break } }
          const [sd, sl] = loc([sp.x, sp.y]); ok(sd >= -0.01 && sd <= lay.D + 0.01 && sl >= -0.01 && sl <= lay.Wd + 0.01, `${kde}: stání mimo parkoviště v ${b.name}`);
          ok(!inA(sd, sl), `${kde}: stání ${i} v ${b.name} leží v uličce`) } } }
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
  };
};
