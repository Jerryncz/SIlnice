// Snímky křižovatek ze hry: node tests/krizovatky/snimky.js [id ...]
// Otevře index.html v Chrome bez okna, do běžící hry postaví scénář ze scenare.js, minutu pouští auta
// (střední provoz) a vyfotí výřez kolem křižovatky. Snímky do tests/krizovatky/snimky/ (nejsou v gitu).
// Potřebuje puppeteer (NODE_PATH) a Chrome (CHROME=cesta, výchozí /usr/bin/google-chrome).
"use strict";
const fs = require("fs"), path = require("path");
const puppeteer = require("puppeteer");
const OUT = path.join(__dirname, "snimky");
fs.mkdirSync(OUT, { recursive: true });
const vyber = process.argv.slice(2).map(Number).filter(Boolean);

// běží ve stránce: postaví scénář, pustí provoz, nastaví kameru
function pripravScenar(id, hustota, trvani) {
  const S = window.__osady.S, cam = window.__osady.cam;
  kzVycisti(S); S.time = Math.ceil(S.time / DAY) * DAY + DAY * 0.2; const ch = [];   // vždy kolem poledne (světlo)
  KZ_SCENARE.find(s => s.id === id).stavba(S, ch); computeNet(S);
  const K = [];
  for (const n of S.nodes) { if (n.dead || n.edges.length !== 1) continue; const e = S.edges[n.edges[0]]; const atA = e.a === n.id, L = e.g.len, ven = atA ? 0 : 1, dov = 1 - ven;
    K.push({ zdroj: (ven ? e.lb : e.lf) > 0, cil: (dov ? e.lb : e.lf) > 0, start: { e: e.id, u: atA ? 0.7 : L - 0.7, dirs: [ven] }, goal: { e: e.id, u: atA ? 0.35 : L - 0.35, dirs: [dov], side: dov ? -1 : 1 } }); }
  const Z = K.filter(k => k.zdroj), C = K.filter(k => k.cil), acc = Z.map(() => S.R());
  for (let t = 0; t < trvani / STEP; t++) {
    for (let i = 0; i < Z.length; i++) { acc[i] += hustota * STEP; if (acc[i] < 1) continue; acc[i] -= 1;
      const m = C.filter(b => b !== Z[i]); if (!m.length) continue; const b = m[Math.floor(S.R() * m.length)]; const p = findPath(S, Z[i].start, b.goal); if (!p) continue;
      const c = newVehicle(S, { links: p.links, s: p.s0, sEnd: p.sEnd, startEp: Z[i].start, goalEp: b.goal, trip: { to: { isGate: true } }, state: "exit" }); c.lane = chooseLane(S, c, 0); S.exiting.push(c); }
    S.time += STEP; if (S.netDirty) computeNet(S); updateReplan(S, STEP);
    if (S.reroute.length) { const l = S.reroute; S.reroute = []; for (const c of l) if (!c.dead) rerouteVehicle(S, c); }
    updateLights(S, STEP); updateVehicles(S, STEP);
    let w = 0; for (const c of S.cars) if (!c.dead) S.cars[w++] = c; S.cars.length = w;
    if (++S.congTick >= 3) { S.congTick = 0; updateCongestion(S, STEP * 3); }
  }
  // kamera: křižovatky (uzly se 3+ rameny) a kus ramen kolem nich
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const n of S.nodes) { if (n.dead || (n.edges.length < 3 && !n.ring && !n.port)) continue; x0 = Math.min(x0, n.x); y0 = Math.min(y0, n.y); x1 = Math.max(x1, n.x); y1 = Math.max(y1, n.y); }
  if (x0 > x1) { x0 = x1 = KX; y0 = y1 = KY; }
  const r = document.getElementById("map").getBoundingClientRect(), pad = 7;
  cam.z = Math.min(r.width / (x1 - x0 + 2 * pad), r.height / (y1 - y0 + 2 * pad), 40);
  cam.x = (x0 + x1) / 2 * cam.z - r.width / 2; cam.y = (y0 + y1) / 2 * cam.z - r.height / 2;
  window.__osady.UI.selDirty = true;
  return { chyby: ch, aut: S.cars.length, zoom: cam.z };
}

(async () => {
  const br = await puppeteer.launch({ executablePath: process.env.CHROME || "/usr/bin/google-chrome", args: ["--no-sandbox", "--disable-gpu"] });
  const pg = await br.newPage();
  await pg.setViewport({ width: 1100, height: 800 });
  const chybyKonzole = [];
  pg.on("pageerror", e => chybyKonzole.push(String(e)));
  pg.on("console", m => { if (m.type() === "error") chybyKonzole.push(m.text()); });
  await pg.goto("file://" + path.join(__dirname, "..", "..", "index.html"));
  await pg.addScriptTag({ content: fs.readFileSync(path.join(__dirname, "scenare.js"), "utf8").replace('"use strict";', "") });
  await pg.addStyleTag({ content: "body *{visibility:hidden!important} #map{visibility:visible!important}" });   // jen mapa, bez panelů
  await pg.keyboard.press("Space");   // pauza: hra by jinak simulovala obce, které jsme smazali
  const SC = await pg.evaluate(() => KZ_SCENARE.map(s => ({ id: s.id, nazev: s.nazev })));
  const vysl = [];
  for (const sc of SC) {
    if (vyber.length && !vyber.includes(sc.id)) continue;
    const r = await pg.evaluate(pripravScenar, sc.id, 0.45, 60);
    await pg.evaluate(() => new Promise(res => requestAnimationFrame(() => requestAnimationFrame(res))));
    await pg.evaluate(() => new Promise(res => setTimeout(res, 350)));   // panel se překreslí po 300 ms
    const soubor = `krizovatka_${String(sc.id).padStart(2, "0")}.png`;
    await (await pg.$("#map")).screenshot({ path: path.join(OUT, soubor) });
    vysl.push({ ...sc, soubor, ...r });
    console.log(sc.id, sc.nazev, JSON.stringify(r));
  }
  if (chybyKonzole.length) console.log("Chyby v konzoli:", chybyKonzole.slice(0, 10));
  fs.writeFileSync(path.join(OUT, "snimky.json"), JSON.stringify({ vysl, chybyKonzole }, null, 1));
  await br.close();
})();
