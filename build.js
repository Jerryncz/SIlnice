// Sestavení hry: node build.js
// Složí src/template.html, src/sim/**/*.js (simulace bez DOM) a src/ui/**/*.js (vykreslování a ovládání)
// do jednoho souboru index.html, který se otevře dvojklikem bez instalace.
"use strict";
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const SRC = path.join(__dirname, "src");
const read = f => fs.readFileSync(f, "utf8").replace(/\r\n/g, "\n");
// soubory i v podsložkách, seřazené podle cesty (pořadí určují číselné předpony složek a souborů)
const listJs = dir => fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)).flatMap(d => d.isDirectory() ? listJs(path.join(dir, d.name)) : d.name.endsWith(".js") ? [path.join(dir, d.name)] : []);

function simSource() {
  return listJs(path.join(SRC, "sim")).map(f => "// ---- " + path.relative(SRC, f).replace(/\\/g, "/") + " ----\n" + read(f)).join("\n");
}
function uiSource() {
  return listJs(path.join(SRC, "ui")).map(f => "// ---- " + path.relative(SRC, f).replace(/\\/g, "/") + " ----\n" + read(f)).join("\n");
}
function build() {
  const tpl = read(path.join(SRC, "template.html"));
  const sim = simSource();
  const ver = (sim.match(/GAME_VERSION="([^"]+)"/) || [])[1] || "?";
  const ui = uiSource();
  // otisk zdrojů: hlášení ze hry ho nese, podle něj se najde commit (git log -S"<otisk>" -- index.html)
  const id = crypto.createHash("sha1").update(tpl + sim + ui).digest("hex").slice(0, 10);
  const out = tpl
    .replace("/*SIM*/", () => sim)
    .replace("/*UI*/", () => "(function(){\n\"use strict\";\nconst BUILD_ID=\"" + id + "\";\n" + ui + "\n})();")
    .replace(/\{\{VERSION\}\}/g, ver);
  fs.writeFileSync(path.join(__dirname, "index.html"), out);
  return { ver, id, bytes: out.length };
}
module.exports = { simSource, uiSource, build };
if (require.main === module) {
  const r = build();
  console.log("index.html sestaven: verze " + r.ver + ", otisk " + r.id + ", " + Math.round(r.bytes / 1024) + " kB");
}
