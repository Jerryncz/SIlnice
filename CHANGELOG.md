# Změny

Verze `hlavní.vedlejší.oprava`: vedlejší = nová mechanika nebo změna pravidel
světa, oprava = ladění čísel a opravy chyb. Dokud je hra prototyp, hlavní je 0.

## 0.15.0 – 14. 11. 2026

- **Hlášení** (tlačítko vpravo nahoře, klávesa R, R90–R94): hra se zastaví,
  hráč napíše, co vidí, klikem očísluje prvky (auto, chodec, budova,
  křižovatka, úsek, místo) a k nim poznámky. Uložit zapíše do vybrané
  složky (`OneDrive\GIT\Silnice\hlaseni`) snímek s čísly, popis, celý stav
  hry a posledních 30 s pohybu; bez zápisu do složky se stáhne jeden soubor.
- Celý stav hry jde uložit a nahrát (Pravidla → Test → Nahrát stav);
  nahraná hra pokračuje přesně stejně (i náhoda). `tests/hlaseni.js` nahraje
  hlášení mimo prohlížeč, zkontroluje ho a pustí dál.
- Sestavení nese otisk zdrojů (`BUILD_ID`), podle kterého se najde commit.

## 0.14.0 – 14. 11. 2026

Přestavba na jádro drah (R80–R89), jeden pull request.

- Křižovatka zná skutečný začátek každého ramene (průsečík okrajů vozovky
  sousedních ramen): tam je stopčára a přechod, plocha křižovatky mezi nimi.
- Nástroj **Spojení** (klávesa 9) místo Šipek: spojení pruh → pruh jako
  křivky; tah z konce pruhu na začátek pruhu za křižovatkou spojení přidá,
  klik na křivku ho zruší, „Vrátit samočinná“. Odbočení bez spojení nejde
  naplánovat.
- Chodníky jsou síť drah: chodník po každé straně, rohy kolem obrubníku,
  přechody, obrácení na slepém konci. Přes Uličku a Ulici se smí přejít
  i mimo přechod, když je mezera. Chodci hledají cestu po síti, drží odstup,
  míjejí se vpravo, nechodí do středu křižovatky a nemizí.
- Pozemky domů: nejdřív pozemek s příjezdem, stáním a zahradou, pak dům.
  Nové druhy: rodinný dům, vila se zahradou, dvojdomek, řadové domy (3 a 4),
  viladům, bytový dům a blokový dům kolem dvora s průjezdem do garáží.
- Podniky (hospoda, kavárna, obchod, kanceláře, nákupní centrum, obchodní
  zóna): nejdřív parkoviště z katalogu podle potřebného počtu míst, za ním
  budova.
- Odbočení vlevo do vjezdu a výjezd vlevo čekají na mezeru v protisměru;
  auto za odbočujícím ho po 3 s objede (vedlejším pruhem nebo protisměrem,
  když je volno).
- Nástroj **Upravit** (klávesa 0): posunout křižovatku nebo konec (konec
  puštěný na silnici se na ni napojí), přepojit konec úseku jinam, ohnout
  úsek, posunout hranici přídavného pruhu. Náhled s cenou a důvodem
  odmítnutí; auta na upravených úsecích jedou dál.
- Kód rozdělený do složek podle témat (`src/sim/0_zaklad` … `4_svet`,
  `src/ui/1_kresleni`).
- Oprava: průhledné mezery mezi panely nahoře a dole zachytávaly klik
  a mapa pod nimi nereagovala.

## 0.13.0 – 14. 11. 2026

- Příjezdy a parkoviště přepsané jako jedna logika (R79): vjezd je hrdlo
  příčné uličky naproti silnici, auta jezdí po příjezdu a uličkách (vpravo,
  s odstupem), čekají na okraji silnice, ne v pruhu.
- Budovy bez parkoviště mají příjezd od okraje silnice ke dveřím.
- Zrušeno staré kreslení buněk parkoviště a čára od budovy k silnici;
  asfalt jen pod uličkami a stáními, zbytek zeleň.
- Vjezd i na slepém konci silnice a u krátkých úseků (dřív parkoviště
  u nich zůstalo bez rozvržení).

## 0.12.0 – 14. 11. 2026

- Parkoviště skládaná z modulů podle pozemku, místo pro zásobování u podniků,
  zeleň ve zbytku (R78); katalog předloh v `docs/parkoviste/katalog.html`.
- Oprava: po změně vjezdu budovy zůstávala obsazená místa bez aut.

## 0.11.0 – 14. 11. 2026

- Jednosměrky napojené na jednotlivé pruhy slepého konce silnice (R74).
- Křížení mostu jen tam, kde je celé patro místa (R75).
- Přichytávání: střed úseku, kolmice, prodloužení a průsečík (R76).
- Parkoviště s uličkou kolmo k silnici a místy po obou stranách, větší
  u podniků (R77).

## 0.10.0 – 14. 11. 2026

- Až 10 pruhů v jednom směru (R68).
- Jednosměrka: pruh navíc vlevo nebo vpravo, ostatní zůstanou na místě;
  dvoupruhový sjezd navazuje na dva odbočovací pruhy (R69).
- Auta přeplánují trasu po stavbě silnic a v koloně (R70).
- Trasy na mapě po kliknutí na auto, chodce, budovu nebo silnici (R71).
- Tři a více pruhů: vlevo / rovně / vpravo zvlášť (R72).
- Parkoviště s uličkou a místy vedle ní, větší u podniků (R73).
- Blinkry při odbočování a přejíždění mezi pruhy.
- Oprava: auto vyjíždějící z budovy se do stojící kolony nezařadilo, i když
  mělo místo; čekající auto už nestojí ve vozovce.

## 0.9.0 – 14. 11. 2026

Přestavba dopravy na pruhy (R60–R67).

- V každém uzlu tabulka spojení pruh → pruh; auta jezdí jen po ní (R60).
- Jednosměrka nebo nájezd z boku silnice se napojí na krajní pruh, silnice
  dostane sama připojovací / odbočovací pruh 5 polí, blízké pruhy se spojí
  v průpletový; nájezd nedává přednost a nezastavuje (R61).
- Auta se přeřazují na úseku, na konci pruhu zip, výměna pruhů v průpletu;
  kdo se nezařadí, odbočku mine a najde jinou cestu (R63).
- Nástroj Šipky (9): řazení pruhů před křižovatkou; šipky se kreslí (R62).
- Semafor: odbočení vlevo dává přednost protijedoucím, červená se
  neprojíždí (R64).
- Vzory znovu: Kosodélník, Čtyřlístek s průpletovými pruhy, nová Trubka (R65).
- Přídavné pruhy mají silnou přerušovanou čáru; napojení se nekreslí jako
  křižovatka.
- Oprava: auta v sousedních pruzích si v křižovatce zbytečně dávala přednost.

## 0.8.0 – 13. 11. 2026

- Napojení na konec přidaného pruhu: silnice vyjde plynule z krajního pruhu
  (R56).
- Boční napojení jednosměrek: přednost průběžné silnice, bez stopčar
  a přechodů, uzel se nekreslí jako křižovatka (R57).
- Kurzor stavění jako křížek v bodě osy silnice (R58).
- Čtyřlístek: větší smyčky (poloměr 4), rampy se napojují na jejich konce;
  potřebuje 38 polí rovné dálnice.
- Hratelná kopie v OneDrive po každém sestavení (R59).

## 0.7.0 – 13. 11. 2026

- Odbočka a nájezd (tvar G): odbočovací / připojovací pruh s náběhem
  a plynulé napojení (R50).
- Vzory mimoúrovňových křižovatek (tvar H): Kosodélník a Čtyřlístek (R50).
- Parkoviště s uličkou a místy, auta zajíždějí na zamluvené místo a vyjíždějí
  po uličce; venkovní stání u bytovek (R51).
- Vybavenost obcí: hřiště, park, kavárna, kostel, náměstí s pěší zónou, aleje;
  vycházky pěšky, rychlejší růst (R52).
- Budova bez příjezdu po 60 s zanikne (R49).
- Přechody jen tam, kde se vejdou, nikdy na dálnici (R53); obce staví uličky
  aspoň 4 pole od souběžné silnice.
- Dálnice může ústit do kruhového objezdu (R54).
- Plocha křižovatky podle tvaru ramen (křižovatka tvaru T má rovnou stranu).
- Auta na rampě mostu se kreslí nad terénem, stín rampy roste s výškou.
- Tlačítka Test pro přidání peněz (R55).
- Oprava: auto se mohlo ztratit z fronty, když auto před ním zrušila změna
  sítě (vyřadilo se o jedno auto víc).
- Oprava: silnice bez mezilehlých bodů (dlouhá rovná) zabírala jen buňky
  na koncích.
- Oprava: tečně napojená odbočka z dálnice (jen vpravo) se brala jako rovně
  a nedala se použít.

## 0.6.0 – 13. 11. 2026

- Jemná síť po půl poli pro terén a budovy; silnice zabírá každou dotčenou
  buňku, domy nelezou do silnic a stojí těsně u nich (R40).
- Průjezd křižovatkou po oblouku, auta se nepřekrývají, žádné protlačení;
  plocha křižovatky, stopčára před přechodem (R41).
- Zaseknuté auto to vzdá po nastaveném limitu, nastavení v okně Pravidla;
  „Zablokovaná doprava“ v Co řešit (R42).
- Přechody pro chodce: samy na ramenech křižovatek, nástroj Přechod; chodci
  přecházejí jen po nich, auta jim dávají přednost (R43).
- Nové druhy Ulička a Jednosměrka, Silnice má plnou čáru; obce si staví
  uličky a rostou do bloků (R44).
- Nástroj Stavět: druh, tvar (Rovně, Oblouk, Kruh, Napojit), výška,
  Přestavět kliknutím; přichytávání na uzly a body silnic, úhly vůči
  silnici (R45).
- Mosty s rampami 3 pole na úroveň, na most a rampu se nic nepřipojí (R46).
- Kruhový objezd z libovolného druhu silnice a s 1–3 pruhy.
- Grafika: pokosové rohy, čáry a svodidla přes spoje, dálnice průběžně přes
  napojení z boku, zebry, stopčáry.
- Auta zůstávají ve svém pruhu a při plném pruhu použijí sousední.
- Oprava: cesta mezi obcemi (a stará cesta) se nestaví po existující silnici.

## 0.5.0 – 13. 11. 2026

- Pruhy po směrech: pruh navíc jen v jednom směru i jen na kusu úseku,
  náběh mezi širším a užším úsekem; nástroj Pruhy podle poloviny silnice
  a tahem (R33).
- Silnice i nájezd napojené z boku dálnice: jen vpravo, dálnici nejde přejet
  (R34).
- Tah po existující silnici ji přestaví místo stavby silnice přes silnici;
  částečný souběh se odmítne (R35).
- Rovně navazující stejné úseky se spojí samy; nový nástroj Rozdělit
  (klávesa R) a „Spojit úseky“ (R36).
- Rozdělení, spojení a úpravy úseku auta a chodce nemažou (R37).
- Auta stojí na stopčáře před křižovatkou (R38).
- Lidé vcházejí do budov, auta zajíždějí do vjezdů (R39).
- Kruhový objezd jde přestavět celý (druh, pruhy).
- Vjezdy k domům se kreslí pod silnicí.
- Oprava: volný konec silnice těsně za jinou silnicí už nenechá pahýl.
- Oprava: otočení jednosměrky přepočítá vjezdy domů na úseku.

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
