// Zkouška křižovatek: 30 předloh postavených na prázdné mapě.
// Soubor se načítá do stejného prostoru jako simulace (Node: vm, prohlížeč: <script> za simulací),
// takže volá přímo funkce simulace (buildRoad, snapPoint, planRoundabout, …).
// Každý scénář staví kolem středu mapy KX, KY; konce ramen (uzly s jedním úsekem) jsou zdroje a cíle aut.
"use strict";
var KX = 64.5, KY = 40.5, KL = 14;

// vyčistí mapu: bez silnic (i dálnic do světa), budov, obcí, vody a lesa
function kzVycisti(S) {
  for (const e of [...S.edges]) if (!e.dead) removeEdge(S, e, true);
  for (const b of [...S.buildings]) if (!b.dead) demolishBuilding(S, b, true);
  S.buildings.length = 0; S.towns.length = 0; S.gates.length = 0; S.cars.length = 0; S.walkers.length = 0;
  S.exiting.length = 0; S.entering.length = 0; S.unparking.length = 0;
  for (let i = 0; i < N; i++) { S.terrain[i] = GRASS; S.zone[i] = 0; S.dirty.push(i); }
  S.money = 1e9; S.cfg.stuck = 40;
}
function kzBod(S, x, y, lvl) { const q = snapPoint(S, x, y, lvl || 0); return q.type === "free" ? { type: "free", x, y, lvl: lvl || 0 } : q; }
// silnice po bodech pts (konce se chytí na existující síť)
function kzCesta(S, pts, kind, lanes, chyby) {
  const n = pts.length;
  const r = buildRoad(S, { pts, kind: kind || "road", lanes, start: kzBod(S, pts[0], pts[1]), end: kzBod(S, pts[n - 2], pts[n - 1]), auto: true });
  if (!r.ok) chyby.push((kind || "road") + ": " + r.msg);
  return r;
}
function kzRovne(S, x0, y0, x1, y1, kind, lanes, chyby) { return kzCesta(S, mkLine(x0, y0, x1, y1), kind, lanes, chyby); }
// paprsek ze vzdáleného konce do bodu (x, y) pod úhlem a (stupně, 0 = východ, 90 = jih)
function kzPaprsek(S, x, y, a, kind, lanes, chyby, delka) {
  const r = (a * Math.PI) / 180, L = delka || KL;
  return kzRovne(S, x + Math.cos(r) * L, y + Math.sin(r) * L, x, y, kind, lanes, chyby);
}
// hvězda: první dvě ramena jako jedna silnice přes střed (je-li to přímka), další paprsky do středu
function kzHvezda(S, uhly, druhy, pruhy, chyby) {
  const k = i => (Array.isArray(druhy) ? druhy[i] : druhy) || "road", p = i => (Array.isArray(pruhy) ? pruhy[i] : pruhy) || undefined;
  for (let i = 0; i < uhly.length; i++) kzPaprsek(S, KX, KY, uhly[i], k(i), p(i), chyby);
}
const kzUzly = S => S.nodes.filter(n => !n.dead && n.edges.length >= 3 && !n.ring);
function kzRizeni(S, ctl, chyby, par) {
  for (const n of kzUzly(S)) { const r = setControl(S, n, ctl, par ? par(n) : undefined); if (!r.ok) chyby.push("řízení: " + r.msg); }
}
// hlavní silnice = ramena ve směru osy (úhel 0/180 → vodorovná)
function kzHlavniVodorovna(S, n) { return n.edges.filter(id => { const a = n.arms.find(q => q.e === id); return a && Math.abs(a.hx) > 0.9; }); }
function kzKruh(S, x, y, r, lanes, chyby) { const p = planRoundabout(S, x, y, r, "road", lanes); if (!p.ok) { chyby.push("kruh: " + p.msg); return null; } return commitRoundabout(S, p); }
function kzDalnice(S, chyby) { return kzRovne(S, 20.5, KY, 108.5, KY, "hwy", 2, chyby); }
function kzVzor(S, typ, chyby) {
  kzDalnice(S, chyby);
  const p = planTemplate(S, typ, KX, KY + 0.3, "road", 1);
  if (!p.ok) { chyby.push("vzor: " + p.msg); return; }
  const r = commitTemplate(S, p); if (!r.ok || r.msg) chyby.push("vzor: " + (r.msg || "nepostaven"));
}

var KZ_SCENARE = [
  { id: 1, nazev: "Křížení silnic, samočinně (zprava)", stavba(S, ch) { kzHvezda(S, [0, 90, 180, 270], "road", 1, ch); } },
  { id: 2, nazev: "Křížení silnic, přednost zprava ručně", stavba(S, ch) { kzHvezda(S, [0, 90, 180, 270], "road", 1, ch); kzRizeni(S, 1, ch); } },
  { id: 3, nazev: "Silnice × ulice, hlavní samočinně", stavba(S, ch) { kzHvezda(S, [0, 90, 180, 270], ["road", "street", "road", "street"], 1, ch); } },
  { id: 4, nazev: "Křížení, hlavní ručně (vodorovná)", stavba(S, ch) { kzHvezda(S, [0, 90, 180, 270], "road", 1, ch); kzRizeni(S, 2, ch, n => kzHlavniVodorovna(S, n)); } },
  { id: 5, nazev: "Křížení 1+1, semafor", stavba(S, ch) { kzHvezda(S, [0, 90, 180, 270], "road", 1, ch); kzRizeni(S, 3, ch); } },
  { id: 6, nazev: "Křížení 2+2, semafor", stavba(S, ch) { kzHvezda(S, [0, 90, 180, 270], "road", 2, ch); kzRizeni(S, 3, ch); } },
  { id: 7, nazev: "Křížení 3+3, semafor", stavba(S, ch) { kzHvezda(S, [0, 90, 180, 270], "road", 3, ch); kzRizeni(S, 3, ch); } },
  { id: 8, nazev: "Bulvár × bulvár, semafor", stavba(S, ch) { kzHvezda(S, [0, 90, 180, 270], "blvd", 2, ch); kzRizeni(S, 3, ch); } },
  { id: 9, nazev: "Bulvár × silnice, hlavní samočinně", stavba(S, ch) { kzHvezda(S, [0, 90, 180, 270], ["blvd", "road", "blvd", "road"], [2, 1, 2, 1], ch); } },
  { id: 10, nazev: "Tvar T, rovnocenné", stavba(S, ch) { kzHvezda(S, [0, 90, 180], "road", 1, ch); } },
  { id: 11, nazev: "Tvar T, silnice + ulice", stavba(S, ch) { kzHvezda(S, [0, 90, 180], ["road", "street", "road"], 1, ch); } },
  { id: 12, nazev: "Tvar T, semafor", stavba(S, ch) { kzHvezda(S, [0, 90, 180], "road", 1, ch); kzRizeni(S, 3, ch); } },
  { id: 13, nazev: "Tvar Y (3 × 120°)", stavba(S, ch) { kzHvezda(S, [-90, 30, 150], "road", 1, ch); } },
  { id: 14, nazev: "Šikmé křížení (60°)", stavba(S, ch) { kzHvezda(S, [0, 60, 180, 240], "road", 1, ch); } },
  { id: 15, nazev: "Pět ramen", stavba(S, ch) { kzHvezda(S, [0, 72, 144, 216, 288], "road", 1, ch); } },
  { id: 16, nazev: "Šest ramen", stavba(S, ch) { kzHvezda(S, [0, 60, 120, 180, 240, 300], "road", 1, ch); } },
  { id: 17, nazev: "Jednosměrka × jednosměrka", stavba(S, ch) {
    kzRovne(S, KX - KL, KY, KX + KL, KY, "oneway", 1, ch); kzRovne(S, KX, KY - KL, KX, KY + KL, "oneway", 1, ch); } },
  { id: 18, nazev: "Jednosměrka 2 pruhy × silnice", stavba(S, ch) {
    kzRovne(S, KX - KL, KY, KX + KL, KY, "oneway", 2, ch); kzRovne(S, KX, KY - KL, KX, KY + KL, "road", 1, ch); } },
  { id: 19, nazev: "Dvě T posunuté o 3 pole", stavba(S, ch) {
    kzRovne(S, KX - KL, KY, KX + KL, KY, "road", 1, ch); kzRovne(S, KX - 1.5, KY - KL, KX - 1.5, KY, "road", 1, ch); kzRovne(S, KX + 1.5, KY + KL, KX + 1.5, KY, "road", 1, ch); } },
  { id: 20, nazev: "Dvě křížení 5 polí od sebe", stavba(S, ch) {
    kzRovne(S, KX - KL, KY, KX + KL, KY, "road", 1, ch); for (const dx of [-2.5, 2.5]) kzRovne(S, KX + dx, KY - KL, KX + dx, KY + KL, "road", 1, ch); } },
  { id: 21, nazev: "Mřížka 2 × 2, semafory", stavba(S, ch) {
    for (const d of [-4, 4]) { kzRovne(S, KX - KL, KY + d, KX + KL, KY + d, "road", 1, ch); kzRovne(S, KX + d, KY - KL, KX + d, KY + KL, "road", 1, ch); } kzRizeni(S, 3, ch); } },
  { id: 22, nazev: "Kruhový objezd r 2, 4 ramena", stavba(S, ch) { kzHvezda(S, [0, 90, 180, 270], "road", 1, ch); kzKruh(S, KX, KY, 2, 1, ch); } },
  { id: 23, nazev: "Kruhový objezd r 3, 2 pruhy, ramena 2+2", stavba(S, ch) { kzHvezda(S, [0, 90, 180, 270], "road", 2, ch); kzKruh(S, KX, KY, 3, 2, ch); } },
  { id: 24, nazev: "Kruhový objezd, 3 ramena", stavba(S, ch) { kzHvezda(S, [0, 120, 240], "road", 1, ch); kzKruh(S, KX, KY, 2.5, 1, ch); } },
  { id: 25, nazev: "Kruhový objezd, 5 ramen", stavba(S, ch) { kzHvezda(S, [0, 72, 144, 216, 288], "road", 1, ch); kzKruh(S, KX, KY, 3, 1, ch); } },
  { id: 26, nazev: "Kruhový objezd s bulváry", stavba(S, ch) { kzHvezda(S, [0, 90, 180, 270], "blvd", 2, ch); kzKruh(S, KX, KY, 3.5, 2, ch); } },
  { id: 27, nazev: "Kosodélník", stavba(S, ch) { kzVzor(S, "diamond", ch); } },
  { id: 28, nazev: "Čtyřlístek", stavba(S, ch) { kzVzor(S, "clover", ch); } },
  { id: 29, nazev: "Trubka", stavba(S, ch) { kzVzor(S, "trumpet", ch); } },
  { id: 30, nazev: "Dálnice ústí do kruhového objezdu", stavba(S, ch) {
    kzKruh(S, KX, KY, 3, 2, ch);
    kzRovne(S, KX - 3 - KL - 6, KY, KX - 3, KY, "hwy", 2, ch);
    for (const a of [-90, 0, 90]) { const r = a * Math.PI / 180; kzRovne(S, KX + Math.cos(r) * (3 + KL), KY + Math.sin(r) * (3 + KL), KX + Math.cos(r) * 3, KY + Math.sin(r) * 3, "road", 1, ch); } } },
];
if (typeof module !== "undefined") module.exports = { KZ_SCENARE };
