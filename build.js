// Sestavení hry: node build.js
// Složí src/template.html, src/sim/*.js (simulace bez DOM) a src/ui/*.js (vykreslování a ovládání)
// do jednoho souboru index.html, který se otevře dvojklikem bez instalace.
"use strict";
const fs = require("fs");
const path = require("path");

const SRC = path.join(__dirname, "src");
const read = f => fs.readFileSync(f, "utf8").replace(/\r\n/g, "\n");
const listJs = dir => fs.readdirSync(dir).filter(f => f.endsWith(".js")).sort().map(f => path.join(dir, f));

function simSource() {
  return listJs(path.join(SRC, "sim")).map(f => "// ---- " + path.basename(f) + " ----\n" + read(f)).join("\n");
}
function uiSource() {
  return listJs(path.join(SRC, "ui")).map(f => "// ---- " + path.basename(f) + " ----\n" + read(f)).join("\n");
}
function build() {
  const tpl = read(path.join(SRC, "template.html"));
  const sim = simSource();
  const ver = (sim.match(/GAME_VERSION="([^"]+)"/) || [])[1] || "?";
  const out = tpl
    .replace("/*SIM*/", () => sim)
    .replace("/*UI*/", () => "(function(){\n\"use strict\";\n" + uiSource() + "\n})();")
    .replace(/\{\{VERSION\}\}/g, ver);
  fs.writeFileSync(path.join(__dirname, "index.html"), out);
  return { ver, bytes: out.length };
}
module.exports = { simSource, uiSource, build };
if (require.main === module) {
  const r = build();
  console.log("index.html sestaven: verze " + r.ver + ", " + Math.round(r.bytes / 1024) + " kB");
}
