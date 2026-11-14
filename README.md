# Osady a cesty

2D hra o stavění silnic, ve které obce rostou samy podle toho, kudy a kolik
se jezdí. Hráč staví jen silnice; domy, pumpy, hospody, obchody, parkoviště
i nové vesnice vznikají ze simulace provozu.

Aktuální verze: **0.17.0** (14. 11. 2026) – prototyp. Změny v `CHANGELOG.md`.

## Spuštění

Otevři `index.html` v prohlížeči. Nic se nemusí instalovat.

Po změně zdrojů v `src/` se `index.html` sestaví příkazem `node build.js`
(Node.js 18 nebo novější). `index.html` se commituje, aby šel hrát rovnou.
Hratelná kopie aktuální verze je i v `%USERPROFILE%\OneDrive\GIT\Silnice`.

## Co kde je

| Soubor / složka | Obsah |
|---|---|
| `index.html` | sestavená hra (needitovat ručně, vzniká z `src/`) |
| `src/template.html` | HTML a CSS stránky |
| `src/sim/0_zaklad/` | mapa, druhy silnic a budov, geometrie |
| `src/sim/1_sit/` | síť silnic: úseky a uzly, křižovatky a spojení pruhů, stavba, úpravy, vzory, editor (Upravit) |
| `src/sim/2_doprava/` | hledání cest, auta, chodci, pozemky a parkoviště |
| `src/sim/3_obce/` | obce a budovy, lidé a cesty, hospodářství |
| `src/sim/4_svet/` | mapa světa, krok simulace |
| `src/ui/1_kresleni/` | vykreslování: silnice, budovy, auta a chodci, mapa a náhled |
| `src/ui/*.js` | základ, panely, ovládání, start |
| `build.js` | skládá `src/` do `index.html` |
| `docs/HRA.md` | **základní dokument** – jak se svět hry chová a proč, lidskou řečí |
| `docs/ROZHODNUTI.md` | záznam rozhodnutí s datem, důvodem a zvažovanými možnostmi |
| `docs/PARKOVISTE.md` | pravidla skládání parkovišť a katalog předloh (`docs/parkoviste/katalog.html`) |
| `napady/` | nápady do budoucna (ukládání hry, křižovatky, železnice …) – nic z nich není ve hře |
| `poznatky/` | poznatky z jednotlivých chatů, čekající na zapracování |
| `tests/test_simulace.js` | automatický test simulace (`node tests/test_simulace.js`) |
| `tests/hlaseni.js` | přečte hlášení ze hry, nahraje stav a pustí ho dál (`node tests/hlaseni.js <složka> [sekund]`) |
| `tests/kontroly.js` | společné kontroly stavu simulace |
| `CLAUDE.md` | jak se v repozitáři pracuje (pravidla spolupráce s Claude) |
| `CHANGELOG.md` | změny podle verzí |

## Ovládání

| Akce | Ovládání |
|---|---|
| Stavět silnici | `1`; tvar `A` rovně (tah), `S` oblouk (3 kliky), `D` kruh (tah od středu; Běžný nebo Turbo, až 6 pruhů), `F` napojit (2 kliky), `G` odbočka / nájezd (tah ze silnice), `H` vzor křižovatky (klik na dálnici); tah po silnici ji přestaví |
| Druh, pruhy, tvar, výška | panel nad nástroji; výška také `Q` / `E`; zaškrtávátko „Přestavět kliknutím“ |
| Pruhy | `2`, klik na polovinu silnice = pruh v tom směru (u jednosměrky na tom okraji), tah podél = jen kus úseku, Shift ubere |
| Upravit silnici | `0`; úchyty na silnici pod kurzorem: kolečko posune křižovatku nebo konec, čtvereček přepojí konec úseku, kosočtverec ohne úsek, příčka posune hranici přídavného pruhu; Shift bez přichycení |
| Pravidlo křižovatky | `3`, klik na křižovatku |
| Spojení pruhů | `9`, klik na křižovatku nebo vjezd na kruhový objezd; tah z barevného konce pruhu na bílý začátek pruhu za křižovatkou spojení přidá, klik na křivku ho zruší |
| Přechod pro chodce | `4`, klik u křižovatky přepne, jinde přidá / zruší |
| Rozdělit úsek | `5`, klik na silnici; klik na značku rozdělení ho zruší |
| Bourat | `6`, tah přes silnice nebo budovy |
| Stavební uzávěra | `7` (po celých polích) |
| Ruka (posun, výběr) | `8`; klik na auto, chodce, budovu nebo silnici ukáže trasy; auto po pruzích a proč stojí |
| Posun mapy | pravé nebo prostřední tlačítko, Ruka, šipky, dva prsty |
| Přiblížení | kolečko, `+` / `-`, sevření prstů (až 256 px na pole) |
| Zrušit kreslení / výběr | pravý klik, `Esc` |
| Pauza, vytížení silnic | mezerník, `V` |
| Hlášení pro Claude | `R` nebo tlačítko Hlášení: popis, klik do mapy očísluje prvky, Uložit zapíše snímek, popis a celý stav do složky `hlaseni` |
| Nastavení (zaseknutá auta), peníze na zkoušení, nahrát stav z hlášení | Pravidla → Nastavení, Test |

Pravidla světa jsou podrobně v `docs/HRA.md`.

## Postup při změně

1. Změna pravidel světa začíná návrhem v `docs/HRA.md` a rozhodnutím
   v `docs/ROZHODNUTI.md`.
2. Práce ve vlastní větvi, jedna věcná změna = jeden pull request.
3. `node build.js` a `node tests/test_simulace.js` musí projít; hratelnost ověřuje hraní.
4. Slučuje se do `main` jen na výslovný souhlas („slouč #N“).
5. Po každém sestavení (i před sloučením) se přepíše hratelná kopie v OneDrive;
   `NEEDITOVAT.txt` říká verzi, větev, commit, otisk sestavení a zda je sloučeno.

## Hlášení ze hry

Ve hře tlačítko **Hlášení** (klávesa `R`): hra se zastaví, napíšeš, co se
děje, klikem očísluješ auta, budovy, silnice nebo místa a **Uložit** zapíše
do složky `OneDrive\GIT\Silnice\hlaseni` podsložku se snímkem
(`mapa.png`), popisem (`popis.md`), celým stavem hry (`stav.json.gz`)
a posledními 30 s pohybu (`historie.json.gz`). Složku vybereš při prvním
uložení (Chrome, Edge); jiný prohlížeč hlášení stáhne jako jeden soubor.
Až jich nasbíráš víc, napiš Claude, ať je projde (postup v `CLAUDE.md`).
Uložený stav nahraješ i do hry: Pravidla → Test → Nahrát stav.

## Ověřené prostředí

| Co | Verze | Ověřeno |
|---|---|---|
| Google Chrome (headless, Linux) | aktuální k 13. 11. 2026 | vykreslení 1440 × 900 a 390 × 800, světlý i tmavý režim, bez chyb v konzoli |
| Node.js | 22 | `build.js`, `tests/test_simulace.js` |
| Prohlížeč uživatele (Windows) | – | zatím neověřeno |
