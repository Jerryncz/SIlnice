# Osady a cesty

2D hra o stavění silnic, ve které obce rostou samy podle toho, kudy a kolik
se jezdí. Hráč staví jen silnice; domy, pumpy, hospody, obchody, parkoviště
i nové vesnice vznikají ze simulace provozu.

Aktuální verze: **0.2.0** (13. 11. 2026) – prototyp. Změny v `CHANGELOG.md`.

## Spuštění

Otevři `index.html` v prohlížeči. Nic se nemusí instalovat ani sestavovat.
Hratelná kopie aktuální verze je i v `%USERPROFILE%\OneDrive\GIT\Silnice`.

## Co kde je

| Soubor / složka | Obsah |
|---|---|
| `index.html` | celá hra: `<script id="sim">` = simulace bez DOM, druhý skript = vykreslování a ovládání |
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
| Stavět silnici | tah myší nebo prstem, klávesa `1` |
| Rozšířit silnici | klávesa `2` |
| Bourat silnice / budovy | klávesa `3` nebo pravé tlačítko myši |
| Stavební uzávěra | klávesa `4` |
| Prohlížet | klávesa `5` |
| Pauza | mezerník |
| Vytížení silnic | klávesa `V` |

Pravidla světa jsou podrobně v `docs/HRA.md`.

## Postup při změně

1. Změna pravidel světa začíná návrhem v `docs/HRA.md` a rozhodnutím
   v `docs/ROZHODNUTI.md`.
2. Práce ve vlastní větvi, jedna věcná změna = jeden pull request.
3. `node tests/test_simulace.js` musí projít; hratelnost ověřuje hraní.
4. Slučuje se do `main` jen na výslovný souhlas („slouč #N“).
5. Po sloučení se aktualizuje hratelná kopie v OneDrive.

## Ověřené prostředí

| Co | Verze | Ověřeno |
|---|---|---|
| Google Chrome (headless, Linux) | aktuální k 13. 11. 2026 | vykreslení, bez chyb v konzoli |
| Node.js | 22 | `tests/test_simulace.js` |
| Prohlížeč uživatele (Windows) | – | zatím neověřeno |
