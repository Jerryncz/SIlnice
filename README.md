# Osady a cesty

2D hra o stavění silnic, ve které obce rostou samy podle toho, kudy a kolik
se jezdí. Hráč staví jen silnice; domy, pumpy, hospody, obchody, parkoviště
i nové vesnice vznikají ze simulace provozu.

Aktuální verze: **0.5.0** (13. 11. 2026) – prototyp. Změny v `CHANGELOG.md`.

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
| `src/sim/*.js` | simulace bez DOM: síť silnic, hledání cest, doprava, obce, lidé, hospodářství, svět |
| `src/ui/*.js` | vykreslování, panely a ovládání |
| `build.js` | skládá `src/` do `index.html` |
| `docs/HRA.md` | **základní dokument** – jak se svět hry chová a proč, lidskou řečí |
| `docs/ROZHODNUTI.md` | záznam rozhodnutí s datem, důvodem a zvažovanými možnostmi |
| `napady/` | nápady do budoucna (ukládání hry, křižovatky, železnice …) – nic z nich není ve hře |
| `poznatky/` | poznatky z jednotlivých chatů, čekající na zapracování |
| `tests/test_simulace.js` | automatický test simulace (`node tests/test_simulace.js`) |
| `CLAUDE.md` | jak se v repozitáři pracuje (pravidla spolupráce s Claude) |
| `CHANGELOG.md` | změny podle verzí |

## Ovládání

| Akce | Ovládání |
|---|---|
| Silnice rovně | `1`, tah myší (0°, 45°, 90°; Shift libovolný úhel); tah po silnici ji přestaví |
| Oblouk | `2`, klik začátek, směr, konec |
| Kruhový objezd | `3`, tah od středu |
| Pruhy | `4`, klik na polovinu silnice = pruh v tom směru, tah podél = jen kus úseku, Shift ubere |
| Jednosměrka | `5`, klik na úsek přepíná směr |
| Pravidlo křižovatky | `6`, klik na křižovatku |
| Rozdělit úsek | `R`, klik na silnici; klik na značku rozdělení ho zruší |
| Bourat | `7`, tah přes silnice nebo budovy |
| Stavební uzávěra | `8` |
| Ruka (posun, výběr) | `9` |
| Druh, pruhy, výška | panel nad nástroji; výška také `Q` / `E` |
| Posun mapy | pravé nebo prostřední tlačítko, Ruka, šipky, dva prsty |
| Přiblížení | kolečko, `+` / `-`, sevření prstů |
| Zrušit kreslení / výběr | pravý klik, `Esc` |
| Pauza, vytížení silnic | mezerník, `V` |

Pravidla světa jsou podrobně v `docs/HRA.md`.

## Postup při změně

1. Změna pravidel světa začíná návrhem v `docs/HRA.md` a rozhodnutím
   v `docs/ROZHODNUTI.md`.
2. Práce ve vlastní větvi, jedna věcná změna = jeden pull request.
3. `node build.js` a `node tests/test_simulace.js` musí projít; hratelnost ověřuje hraní.
4. Slučuje se do `main` jen na výslovný souhlas („slouč #N“).
5. Po sloučení se aktualizuje hratelná kopie v OneDrive.

## Ověřené prostředí

| Co | Verze | Ověřeno |
|---|---|---|
| Google Chrome (headless, Linux) | aktuální k 13. 11. 2026 | vykreslení 1440 × 900 a 390 × 800, světlý i tmavý režim, bez chyb v konzoli |
| Node.js | 22 | `build.js`, `tests/test_simulace.js` |
| Prohlížeč uživatele (Windows) | – | zatím neověřeno |
