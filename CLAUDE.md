# Jak se v tomto repozitáři pracuje

Repozitář `Silnice`: hra **Osady a cesty** – 2D simulace, ve které hráč
staví jen silnice a obce rostou samy podle provozu. Založeno 13. 11. 2026,
způsob práce převzat z repozitáře BIMPOLIS a upraven pro hru.

## 0. Kde co je

- `README.md` – rozcestník: co kde je, jak hru spustit, aktuální verze.
  Přečti ho na začátku práce.
- `docs/HRA.md` – **základní dokument**: jak se svět hry chová, lidskou řečí
  (co a proč). Z něj se odvíjí kód i testy. Přečti ho na začátku práce
  spolu s README.
- `docs/ROZHODNUTI.md` – záznam rozhodnutí s datem: co jsme zvolili, proč
  a jaké byly možnosti. Nic se nerozhoduje potichu.
- `napady/` – nápady do budoucna. Nic z nich není ve hře. Při zmínce o
  nápadu ho přečti, ale nic z něj nestav bez výslovného zadání.
- `poznatky/` – poznatky z jednotlivých chatů (soubor na chat), čekající
  na zapracování; zpracované v `poznatky/zpracovano/`.
- `src/` – zdroje hry: `template.html`, `sim/` (simulace bez DOM) a `ui/`
  (vykreslování a ovládání), rozdělené do složek podle témat
  (`sim/0_zaklad`, `1_sit`, `2_doprava`, `3_obce`, `4_svet`;
  `ui/1_kresleni`). Pořadí sestavení určují číselné předpony. `node build.js`
  z nich složí `index.html` (rozhodnutí R26). `index.html` se ručně
  needituje. Sahej jen do souborů, kterých se změna týká.
- `tests/` – automatické testy simulace v Node.js (bez prohlížeče).
- `CHANGELOG.md` – změny podle verzí.

Hierarchie při rozporu: `docs/HRA.md` (co a proč) > `docs/ROZHODNUTI.md` >
kód > README a ostatní. Rozpor vždy nahlas a navrhni opravu. Změna chování
hry začíná v HRA.md, pak kód a testy.

## 1. Role, ze kterých každý návrh posuzuješ

- **Herní designér** – je to zábavné? Má hráč smysluplné rozhodnutí? Vidí,
  proč se něco stalo (kronika, barvy, popisky)? Nevzniká jedna dominantní
  strategie?
- **Simulační programátor** – stabilita a výkon simulace (velké mapy, stovky
  aut), zablokování (deadlock) na silnicích, konzistence čítačů, testovatelnost
  mimo prohlížeč.
- **Správce dat** – co se ukládá (uložené hry, nastavení), verze uložených dat
  a jejich převod při změně formátu.
- **Hráč bez návodu** – pochopí, co má dělat? Co když klikne špatně, zbourá
  omylem, dojdou peníze, zavře okno uprostřed?

Rozsah úměrně: drobnost = jedna věta z role, která má co říct. Nová mechanika
nebo změna pravidel světa = plný průchod.

## 2. Konzultace místo souhlasu

- Rozpor s HRA.md, s dřívějším rozhodnutím nebo se zdravým rozumem hráče řekni
  hned a konkrétně.
- Ke každé námitce alternativa + doporučené výchozí řešení, ať stačí „ok“.
- Víc cest → srovnání (+ / –) a doporučení.
- **Než začneš, důkladně promysli, co zadání znamená** pro svět hry, pro
  ostatní mechaniky (doprava, chodci, obce, pozemky, výkon) a pro hráče.
  U čehokoli většího se nejdřív zeptej; i jednoduše znějící přání může
  vyžadovat přestavbu jádra. Nedělej novou grafiku přes starou logiku:
  když se mění, jak věc vypadá, musí se změnit i to, jak se chová.
- **Co nestihneš nebo co zatím nestavíš, zapiš do `napady/`** (soubor na
  nápad, stav „zatím není ve hře“), a na konci odpovědi řekni, co zůstalo
  jen v nápadech.
- Otázky v jedné dávce s navrženou výchozí odpovědí. Zadání s dopadem na
  pravidla světa nebo uložené hry nejdřív vyjasni; technické drobnosti
  (ladění čísel, vzhled) rozhodni sám a napiš, co jsi rozhodl.

## 3. Popis chování (před kódem)

U nové mechaniky nebo změny pravidel nejdřív lidskou řečí: co se ve světě
děje · co to spouští a co z toho plyne · co hráč vidí (mapa, kronika, panel)
· co hráč může ovlivnit · limity a co se nestane. Stejný text patří do
`docs/HRA.md`, rozhodnutí s možnostmi do `docs/ROZHODNUTI.md`.

Pak „Na co si dát pozor“: [RIZIKO] ztráta uložené hry, zaseknutá simulace,
pád · [PAST] překvapivé chování pro hráče · [POZN.] drobnost.

## 4. Změny souborů

1. Návrh: soubor, část, co přesně, proč.
2. U změny pravidel světa čekej na souhlas uživatele; ladění čísel a opravy
   chyb můžeš udělat rovnou a napsat, co a proč.
3. Změna ve vlastní větvi, jedna věcná změna = jeden pull request.
   Aktualizuj verzi (`GAME_VERSION` v `index.html`, až bude) a `CHANGELOG.md`.
4. Spusť `node build.js` a `node tests/test_simulace.js`. Napiš, co prošlo a co je neověřené
   (hratelnost a vzhled ověřuje uživatel hraním).

Slučování pull requestů: jen na výslovný souhlas uživatele v chatu, u každého
zvlášť („slouč #3“). Na konci odpovědi připomeň, které pull requesty čekají.

Do gitu nikdy: uložené hry hráčů, logy, výsledky ladění, přístupové údaje.
Viz `.gitignore`.

### Složky v počítači uživatele (OneDrive)

- Zdroj pravdy je tento repozitář na GitHubu. Repozitář (`.git`) nikdy neleží
  ve složce synchronizované OneDrive – synchronizace ho poškodí (převzato
  z BIMPOLIS).
- `%USERPROFILE%\OneDrive\GIT\Silnice` – **hratelná kopie** aktuální
  verze (`index.html` + `NEEDITOVAT.txt` s verzí, větví, commitem, otiskem
  sestavení a zda je sloučeno). Přepíše se po každém sestavení, i před
  sloučením (R59); ručně se v ní needituje. Při kopírování každé sestavení
  do nové podsložky v `outputs` a po zápisu ověřit velikost a verzi.
- `%USERPROFILE%\OneDrive\GIT\Silnice\hlaseni` – **hlášení ze hry** (R90–R94),
  vstup od uživatele: sestavení ji nikdy nepřepisuje ani nemaže.
- Uživatel pracuje na víc počítačích (`C:\Users\jnovotny\…`, `C:\Users\jaros\…`);
  složka je vždy `%USERPROFILE%\OneDrive\GIT\Silnice`.

### Hlášení ze hry

Když uživatel napíše, ať projdeš hlášení:
1. Přes propojený počítač přečti `hlaseni\*` bez `zpracovano.md`
   (`popis.md`, `mapa.png`, případně `historie.json.gz`).
2. Stav zkopíruj k sobě a nahraj: `node tests/hlaseni.js <složka> [sekund]`
   (vypíše prvky, zkontroluje stav, pustí simulaci dál). Když je hlášení
   z jiné verze, najdi sestavení podle otisku (`git log -S"<otisk>" --
   index.html`) a nahraj ho tam.
3. Shrň zjištění po hlášeních; opravy chyb rovnou (vlastní větev a pull
   request), změny pravidel jako návrh s otázkami.
4. Do složky každého zpracovaného hlášení zapiš `zpracovano.md`: co jsi
   zjistil, co se změnilo a ve kterém pull requestu. Nic nemaž. Uložené
   stavy do gitu nepatří; do testů jen zmenšená situace, která chybu ukáže.

## 5. Poznatky

Když opravíš chybu, zavedeš nový vzor, narazíš na past (prohlížeč, canvas,
výkon, simulace) nebo najdeš rozpor mezi soubory, zapiš to do souboru tohoto
chatu v `poznatky/` (`<datum>_<téma>.md`) ve stejné změně. Kategorie: Bugy /
Nové vzory / Varování / Ladění / Rozpory; u položky cílový soubor, co a proč.
Do souborů jiných chatů nesahej.

## 6. Forma odpovědi

Doporučení a námitky → popis chování → na co si dát pozor → kód. Čeština,
bez emoji, bez zbytečných úvodů. Texty ve hře stručně a neosobně, tlačítka
podstatným jménem nebo infinitivem („Silnice“, „Bourat“).
