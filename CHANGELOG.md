# Změny

Verze `hlavní.vedlejší.oprava`: vedlejší = nová mechanika nebo změna pravidel
světa, oprava = ladění čísel a opravy chyb. Dokud je hra prototyp, hlavní je 0.

## 0.4.0 – 13. 11. 2026

- Silnice jako graf s křivkami: kreslení rovně (0°, 45°, 90° nebo volně),
  obloukem a kruhové objezdy libovolné velikosti (R23, R29).
- Druhy ulice, silnice, bulvár se zeleným středem, dálnice, nájezd; 1–4 pruhy;
  jednosměrky; auta jezdí v pruzích a volí pruh podle odbočení.
- Mosty a vysoké mosty, mimoúrovňová křížení; dálnici nejde křížit v úrovni,
  napojení jen nájezdem z boku (R27, R28).
- Náhled stavby s cenou, křižovatkami a budovami v cestě; „Postavit a zbourat“
  (R30). I rozšíření a změna druhu nabídnou zbourání.
- Křižovatky: automaticky podle šířky, přednost zprava, hlavní silnice
  (libovolná dvojice ramen), semafor, napojení na dálnici.
- Lidé a den: domácnosti s dětmi, dospělými a seniory, program dne, home office,
  chodci na chodnících, noc (R25, R31).
- Nové budovy: škola, kanceláře; statky dávají práci; průmyslové zóny
  a kancelářské čtvrti (R32).
- Obce si častěji staví ulice a propojují je do bloků.
- Kód rozdělen do `src/sim` a `src/ui`, sestavení `node build.js` (R26).

## 0.3.0 – 13. 11. 2026

- Hra přes celou obrazovku, panely plavou nad mapou (R15).
- Mapa 128 × 80 polí, přibližování a posun myší, šipkami i dotykem (R14).
- Panel Co řešit s radou a odkazem na místo, výběr s důvodem a tlačítky,
  kronika s odkazy; zrušen seznam obcí (R16).
- Dálnice do světa na okrajích mapy: tranzit, turisté, vývoz (R17).
- Druhy silnic: ulička, silnice, dálnice; 1–3 pruhy v každém směru; mosty
  i pro dálnice; jednosměrky (R18, R22).
- Křižovatky: přednost zprava, hlavní silnice (i automaticky podle šířky),
  semafor řízený frontami, kruhový objezd (R19).
- Obce si stavějí uličky (R20).
- Průmysl: těžba dřeva, lom, důl na železo, pila, ocelárna; nákladní auta,
  stavební materiál pro obce (R21). Nové terény: skály a ruda.
- Obchodní zóna jako větší obchodní centrum.
- Ladění: menší počet cest na obyvatele, pomalejší růst, kratší cesty.
- Oprava: víc aut najednou mohlo vjet na plné parkoviště.

## 0.2.0 – 13. 11. 2026

- Domy vznikají jen u silnice, každá budova má vjezd (R5).
- Budovy přes víc polí: dvojdomek, dům se zahradou, statky do L, Z a U,
  bytové domy s podzemní garáží (R6).
- Auta vyjíždějí z domů a čekají, až je na silnici místo (R7).
- Hospody, obchody a nákupní centra s parkovištěm a kapacitou; parkovací
  domy (R8).
- Pumpy s nájezdem, auta na ně cestou zajíždějí (R9).
- Bourání budov a stavební uzávěra (R10).
- Auta po návštěvě služby jedou zpátky domů.

## 0.1.0 – 13. 11. 2026

- První prototyp: silnice, rozšíření, bourání; obce rostoucí podle dosahu
  a provozu; zácpy a objížďky; pumpy, hospody, obchody, nákupní centra;
  nové osady na rušných křižovatkách; kronika a přehled obcí.
