# Rozhodnutí

Záznam rozhodnutí o hře: co jsme zvolili, proč a jaké byly možnosti.
Nové rozhodnutí se připisuje dolů s dalším číslem; změněné rozhodnutí se
nepřepisuje, ale označí „nahrazeno R<číslo>“ a připíše se nové.

| Č. | Datum | Rozhodnutí | Proč | Zvažované možnosti |
|---|---|---|---|---|
| R1 | 13. 11. 2026 | Hra je jeden soubor `index.html` (HTML + canvas + JavaScript), bez instalace a sestavování. | Okamžitě hratelné v prohlížeči, snadno se sdílí (artefakt, GitHub Pages). | Godot (lepší pro velkou hru, zvážit při přechodu z prototypu), Unity, rozdělení do modulů s buildem. |
| R2 | 13. 11. 2026 | 2D pohled shora na mřížce polí. | Přání uživatele (styl Trafficity), jednoduchá simulace i vykreslování. | 3D (Traffic Architect) – zamítnuto. |
| R3 | 13. 11. 2026 | Hráč staví jen silnice; obce, domy a služby vznikají samy. | Hlavní myšlenka hry (HRA.md kap. 1). | Hráč by stavěl i zóny / domy – zamítnuto. |
| R4 | 13. 11. 2026 | Simulace je oddělená od vykreslování (`<script id="sim">` bez DOM). | Dá se testovat v Node.js a později přenést (Godot, worker). | Vše v jednom skriptu – zamítnuto. |
| R5 | 13. 11. 2026 | Domy vznikají jen u silnice; i nová osada začíná u cesty. | Přání uživatele; růst je pak čitelně vázaný na silnice. | Osamělé domky bez silnice (verze 0.1) – nahrazeno. |
| R6 | 13. 11. 2026 | Budovy mají víc polí a tvar (L, U, Z, obdélníky); každá má jeden vjezd. | Přirozenější vzhled obcí, prostor pro parkoviště. | Jedno pole na budovu (verze 0.1) – nahrazeno. |
| R7 | 13. 11. 2026 | Auto vyjíždí z domu a vyjede jen, když je na silnici místo; po 8 s lidé cestu vzdají. | Fyzická zácpa, která brzdí růst obce. | Auta se zjevují přímo na silnici (verze 0.1) – nahrazeno. |
| R8 | 13. 11. 2026 | Parkoviště mají kapacitu; přetížené parkoviště vede ke vzniku parkovacího domu. | Přání uživatele; další vrstva příčin a následků. | Neomezené parkování. |
| R9 | 13. 11. 2026 | Pumpa je zastávka na cestě (auto zajede, natankuje, pokračuje), ne cíl cesty. | Odpovídá skutečnosti; pumpy oživují dálkové silnice. | Pumpa jako cíl (verze 0.1) – nahrazeno. |
| R10 | 13. 11. 2026 | Bourání budov je drahé (40–120 Kč za pole), uzávěra je zdarma. | Bourání má být rozhodnutí, ne běžný nástroj; uzávěra je plánování. | Bourání zdarma; uzávěra placená. |
| R11 | 13. 11. 2026 | Repozitář (`.git`) neleží v OneDrive; v `OneDrive\GIT\Silnice` je jen hratelná kopie. | Synchronizace OneDrive poškozuje git (zkušenost z BIMPOLIS). | Pracovat přímo v OneDrive – zamítnuto. |
| R12 | 13. 11. 2026 | Způsob práce převzat z BIMPOLIS: HRA.md jako základní dokument, nápady, poznatky, větev + pull request, slučování na „slouč“. | Přání uživatele mít profesionální repozitář s historií rozhodnutí. | – |
| R13 | 13. 11. 2026 | Všechny změny verze 0.3 v jednom pull requestu. | Volba uživatele. | Tři fáze (rozhraní, silnice, svět) – doporučeno, zamítnuto. |
| R14 | 13. 11. 2026 | Mapa 128 × 80 polí s přibližováním a posunem. | Volba uživatele; plynulé i na slabším počítači. | 192 × 120, 256 × 160. |
| R15 | 13. 11. 2026 | Hra přes celou obrazovku, panely uvnitř hry. | Přání uživatele. | Panely kolem mapy (verze 0.2). |
| R16 | 13. 11. 2026 | Zásada „každá informace vede k akci“: panel Co řešit s radou a odkazem na místo, výběr s důvodem a tlačítky. | Uživateli vadí panely plné čísel, se kterými nejde nic udělat. | Seznam obcí a statistik (verze 0.2) – zrušen. |
| R17 | 13. 11. 2026 | Vnější svět: tři dálnice z okrajů mapy; tranzit, turisté i vývoz zboží. | Volba uživatele. | Jen tranzit; jen obchod. |
| R18 | 13. 11. 2026 | Obsazenost silnice se počítá zvlášť pro každý směr jízdy; kapacita = počet pruhů, jednosměrka dvojnásobek. | Nutné pro pruhy a jednosměrky. | Obsazenost pole bez směru (verze 0.2) – nahrazeno. |
| R19 | 13. 11. 2026 | Křižovatky se skutečným čekáním: přednost zprava, hlavní silnice, semafor podle front, kruhový objezd; pojistka proti zaseknutí (3,5 s). | Volba uživatele. | Jen zpomalení na křižovatce. |
| R20 | 13. 11. 2026 | Obce si samy stavějí uličky, když nemají kam růst. | Přání uživatele; obec nezamrzne, když hráč nestaví. | Obec čeká na hráče. |
| R21 | 13. 11. 2026 | Průmysl: těžba dřeva, lom, důl → pila, ocelárna; vzniká, když silnice přivede přístup k surovině a obec v dosahu; potřebuje pracovníky. | Přání uživatele; průmysl vzniká stejně organicky jako obce. | Hráč by průmysl stavěl sám – zamítnuto (R3). |
| R22 | 13. 11. 2026 | Dálnice nemá vjezdy do budov; domy a služby u ní nevznikají. | Odpovídá skutečnosti, dálnice je pro rychlý průjezd. | – |
| R23 | 13. 11. 2026 | Silniční síť jako graf (uzly a úseky s křivkami) přichycený na mřížku; terén a budovy zůstávají na polích. | Křivky, 45°, kruháky libovolné velikosti a mosty na políčkách nejdou. | Políčka + úhlopříčky – zamítnuto. Nahrazuje silnice na polích (R18). |
| R24 | 13. 11. 2026 | Verze 0.4 v jednom pull requestu (silnice, lidé, zóny). | Volba uživatele. | Tři verze 0.4 / 0.5 / 0.6 – doporučeno, zamítnuto. |
| R25 | 13. 11. 2026 | Lidé po domácnostech (děti, dospělí, senioři), jednotlivě jen na cestě. | Výkon i při tisících obyvatel. | Každý člověk stále – pomalé. |
| R26 | 13. 11. 2026 | Kód v `src/` (sim a ui), `build.js` skládá `index.html`. | Hra přerostla jeden soubor (R1 s tím počítal); test čte stejné zdroje. | Dál jeden soubor. Nahrazuje R1 v části „jeden soubor“. |
| R27 | 13. 11. 2026 | Výška silnice ve třech úrovních (zem, most, vysoký most); křižují se jen silnice ve stejné výšce. | Mimoúrovňová křížení a mosty přes silnice. | Tunely – zatím ne. |
| R28 | 13. 11. 2026 | Dálnici nejde křížit v úrovni; napojení jen nájezdem, sjezd a nájezd jen vpravo. | Přání uživatele (plná čára uprostřed). | – Nahrazeno R34 v části „jen nájezdem“. |
| R29 | 13. 11. 2026 | Kruhový objezd jako jednosměrný okruh z úseků; silnice uvnitř se odstraní; přednost má kruh. | Auta po kruhu opravdu jezdí; velikost libovolná. | Kruhový objezd jako jeden uzel (verze 0.3) – nahrazeno. |
| R30 | 13. 11. 2026 | Stavba přes budovy jen s potvrzením „Postavit a zbourat“ a za cenu bourání. | Přání uživatele; nic se nebourá potichu. | Zákaz stavby přes budovy. |
| R31 | 13. 11. 2026 | Den 4 minuty při 1×; program dne s ranní a odpolední špičkou, home office 15 %, chodci do krátkých vzdáleností. | Přání uživatele; špičky vzniknou samy. | – |
| R32 | 13. 11. 2026 | Statky dávají práci na poli, aby i vesnice měly provoz od začátku. | Bez práce byla mapa na začátku prázdná. | – |
| R33 | 13. 11. 2026 | Pruhy se počítají po směrech; pruh jde přidat jen na kus úseku (úsek se rozdělí) a mezi úseky s různou šířkou je náběh. Připojovací pruh = jednosměrný nájezd napojený z boku. | Přání uživatele (pruhy a napojování jako v Trafficity); zachová graf úseků a hledání cest. | Libovolný počet pruhů s napojením kamkoli podél silnice (pruh jako samostatný objekt) – mnohem složitější, odloženo. |
| R34 | 13. 11. 2026 | Na dálnici se z boku smí napojit i obyčejná silnice; napojení funguje jen vpravo (najet ve směru jízdy, sjet doprava), dálnici nejde přejet. | Přání uživatele. | Dál jen nájezdem (R28) – nahrazeno. |
| R35 | 13. 11. 2026 | Tah po existující silnici ji přestaví (druh, pruhy, případně jen kus úseku); částečný souběh se odmítne. | Silnice přes silnici vedla k autům na „spodní“ silnici. | Zakázat stavbu po silnici; postavit druhou silnici – zamítnuto. |
| R36 | 13. 11. 2026 | Rovně navazující stejné úseky se spojují samy; ruční rozdělení (nástroj Rozdělit) se nespojí, dokud ho hráč nezruší. | Přání uživatele; méně zbytečných uzlů, a přesto jde kus silnice upravit zvlášť. | Spojovat jen ručně. |
| R37 | 13. 11. 2026 | Rozdělení, spojení i změna úseku přenese auta a chodce na nové úseky; nikdo se neruší (kromě otočení jednosměrky). | Úpravy za provozu nemají mazat auta ani lidi. | Rušit auta na upraveném úseku (do verze 0.4). |
| R38 | 13. 11. 2026 | Auta stojí na stopčáře před křižovatkou a vjedou, až mají přednost i místo za křižovatkou. | Přání uživatele; v křižovatce se nestojí. | Čekání uprostřed uzlu (do verze 0.4). |
| R39 | 13. 11. 2026 | Lidé vcházejí do budov a auta zajíždějí do vjezdů (krátká animace mezi silnicí a dveřmi). | Přání uživatele; nikdo nemizí na silnici. | – |
| R40 | 13. 11. 2026 | Terén, budovy a uzávěry na jemné síti po půl poli (256 × 160 buněk); tvary budov zůstávají v celých polích. Silnice zabírá každou buňku, do které vozovka i s chodníkem zasahuje. | Přání uživatele: domy nemají lézt do silnic a mají jít posunout o půl pole. | Silnice zabírá dotčená pole na hrubé síti (zubaté mezery) – doporučeno, zamítnuto; budovy natočené podél silnic – nápad. |
| R41 | 13. 11. 2026 | Auto projíždí křižovatku po oblouku a patří už do cílového pruhu; vjede jen s přednostním právem, volnou plochou (bez křížící se dráhy) a místem za křižovatkou. Auta se nikdy nepřekrývají, protlačení zrušeno. | Přání uživatele: žádné překrývání, skutečný průjezd i na kruháči. | Protlačení po 8 s (do 0.5) – nahrazeno. |
| R42 | 13. 11. 2026 | Zaseknuté auto to po nastaveném limitu vzdá (Nikdy / 20 s / 40 s / 2 min, výchozí 40 s); místo se ukáže v Co řešit. | Volba uživatele: limit jako nastavení ve hře. | Pevný limit 40 s; nikdy nemizet. |
| R43 | 13. 11. 2026 | Přechody pro chodce: samy na ramenech křižovatek s chodníky; hráč je ruší a přidává i doprostřed úseku. Chodci přecházejí jen po nich (výjimka: dům naproti na stejném úseku bez přechodu), auta jim dávají přednost. | Volba uživatele. | Jen vzhled bez vlivu na auta; jen přechody od hráče. |
| R44 | 13. 11. 2026 | Druhy silnic: Ulička (bez čáry), Ulice (přerušovaná), Silnice (plná čára), Jednosměrka, Bulvár, Dálnice, Nájezd. Jednosměrka je druh, ne přepínač; obce si staví uličky. | Přání uživatele. | Přepínač jednosměrky (do 0.5) – nahrazeno. |
| R45 | 13. 11. 2026 | Nástroj Stavět s volbou druhu, tvaru (Rovně, Oblouk, Kruh, Napojit) a výšky; Přestavět kliknutím. | Přání uživatele: jeden panel na druh, druhý na tvar, třetí na výšku. | Samostatné nástroje Rovně / Oblouk / Kruháč (do 0.5). |
| R46 | 13. 11. 2026 | Most se zvolenou výškou má na koncích rampu 3 pole na úroveň; na most a rampu se nic nepřipojí kromě konců. | Přání uživatele: přechodová silnice a obce se nemají napojit na most. | Rampa přes celou délku silnice (do 0.5). |
| R47 | 13. 11. 2026 | Celá verze 0.6 v jednom pull requestu. | Volba uživatele. | Tři verze 0.6 / 0.7 / 0.8 – doporučeno, zamítnuto. |
| R48 | 13. 11. 2026 | Celá verze 0.7 v jednom pull requestu. | Volba uživatele. | 0.7 silnice a doprava, 0.8 obce – doporučeno, zamítnuto. |
| R49 | 13. 11. 2026 | Budova bez příjezdu po 60 s zanikne (zdarma, zápis do kroniky). | Přání uživatele: domy u silnice změněné na dálnici mají mizet. | Zůstanou bez vjezdu (do 0.6); zbourat hned. |
| R50 | 13. 11. 2026 | Odbočka a nájezd jako tvar stavění: odbočovací / připojovací pruh 4 pole s náběhem a plynulé odpojení; vzory Kosodélník a Čtyřlístek. | Volba uživatele (odbočky a vzory); zachová model uzlů a pruhů. | Pruhy jako samostatné objekty (styl CS2) – velká přestavba, odloženo. |
| R51 | 13. 11. 2026 | Parkoviště s uličkou a místy, místa se při příjezdu zamlouvají; u bytovek venkovní stání. | Volba uživatele. | Jen animace na místo. |
| R52 | 13. 11. 2026 | Vybavenost obcí (hřiště, park, kavárna, kostel, náměstí, aleje): vzniká sama, vycházky pěšky, každý druh zrychlí růst o 6 % (nejvýš 4). | Volba uživatele: vzhled i vliv. | Jen vzhled; jen nápad. |
| R53 | 13. 11. 2026 | Přechod na rameni křižovatky jen tam, kde se vejde (délka ramene, úhel k sousednímu rameni aspoň ~50°); ne u dálnice. | Přechody ležely přes jiné silnice nebo dálnici. | – |
| R54 | 13. 11. 2026 | Dálnice smí ústit do kruhového objezdu (kromě dálnice do světa). | Přání uživatele. | Zákaz (do 0.6). |
| R55 | 13. 11. 2026 | Tlačítka Test (+10 000 / +100 000 Kč) v okně Pravidla. | Přání uživatele pro zkoušení. | Neomezené peníze. |
| R56 | 13. 11. 2026 | Konce přidaných pruhů jsou body pro napojení: nová silnice začne v ose krajního pruhu a pokračuje jeho směrem; spoj zůstává uzlem grafu. | Přání uživatele: napojit libovolnou silnici na pruh, plynule. | Pruhy jako samostatné objekty se svými uzly (styl CS2) – velká přestavba, odloženo (R50). |
| R57 | 13. 11. 2026 | Boční napojení jednosměrek na průběžnou silnici: přednost průběžné, bez stopčar a přechodů. | Odbočky a nájezdy vypadaly jako křižovatky a zdržovaly provoz. | Dál jako obyčejná křižovatka. |
| R58 | 13. 11. 2026 | Kurzor stavění je křížek v bodě mezi poli (osa silnice), ne zvýrazněné pole. | Přání uživatele. | – |
| R59 | 13. 11. 2026 | Po každém sestavení se hratelná kopie zapíše do `%USERPROFILE%\OneDrive\GIT\Silnice` i před sloučením; `NEEDITOVAT.txt` uvádí verzi, větev, commit a zda je sloučeno. | Přání uživatele. | Kopie jen po sloučení (do 0.7). |
| R60 | 14. 11. 2026 | Pruh je základní jednotka dopravy: v každém uzlu je tabulka spojení pruh → pruh (rovně podle polohy, vlevo z vnitřních, vpravo z krajních); silnice se dál kreslí tahem. | Volba uživatele: hra je hlavně o pruzích a křižovatkách (vzor CS2 / Trafficity). | Každý pruh jako samostatná čára – nejvolnější, ale pracné stavění a největší přepis; zamítnuto. Nahrazuje R33 a R50 v části „pruh volí auto samo“. |
| R61 | 14. 11. 2026 | Jednosměrka / nájezd z boku průběžné silnice se napojí na krajní pruh a silnice dostane sama připojovací / odbočovací pruh 5 polí; blízké pruhy se spojí v průpletový; délku mění hráč nástrojem Pruhy. | Volba uživatele („sám, konec jde táhnout“). | Pruh natrvalo do ukončení hráčem; pevná délka. Tažení konce pruhu myší zatím není (HRA kap. 10). Nahrazuje R56 a R57. |
| R62 | 14. 11. 2026 | Šipky pruhů: hra je navrhne sama, hráč je přepíná nástrojem Šipky. | Volba uživatele. | Plný editor spojení pruh → pruh; jen samočinně. |
| R63 | 14. 11. 2026 | Auta se přeřazují na úseku (mezera, zip na konci pruhu, výměna pruhů); kdo se nezařadí, odbočku mine a přeplánuje cestu. | Volba uživatele („zpomalí, pak mine“). | Zastaví a čeká, dokud ho někdo nepustí – snadno zablokuje silnici. |
| R64 | 14. 11. 2026 | Semafory zůstávají dvoufázové; nově odbočení vlevo dává přednost protijedoucím a červená se neprojíždí. | Uživatel chtěl semafory hned; ve hře už byly, doplněno chování podle pruhů. | Fáze podle pruhů a nastavení časů – další verze. |
| R65 | 14. 11. 2026 | Vzory Kosodélník, Čtyřlístek a nová Trubka se skládají jen z nájezdů napojených na pruh. | Volba uživatele. | Křižovatka se semafory na mostě – nevybráno. |
| R66 | 14. 11. 2026 | Odbočovací pruhy v křižovatce nevznikají samy; přidá je hráč (Pruhy) a šipky se přerozdělí. | Volba uživatele. | Samy u silnic se dvěma a více pruhy. |
| R67 | 14. 11. 2026 | Celá přestavba na pruhy v jedné verzi 0.9. | Volba uživatele. | Dvě etapy (0.9 pruhy, 0.10 šipky a semafory) – doporučeno, zamítnuto. |
| R68 | 14. 11. 2026 | Druhy s více pruhy mají až 10 pruhů v jednom směru. | Přání uživatele. | Dosavadní 3–4. |
| R69 | 14. 11. 2026 | U jednosměrky se pruh přidává na zvoleném okraji a ostatní pruhy zůstávají na místě (pruhy mohou být posunuté od osy úseku). | Přání uživatele: dvoupruhový sjezd zarovnaný se dvěma odbočovacími pruhy. | Pruhy vždy souměrně kolem osy (do 0.9). |
| R70 | 14. 11. 2026 | Auta přeplánují trasu po stavbě silnic a při stání v koloně; přejdou jen na trasu aspoň o 10 % rychlejší. | Přání uživatele: nová silnice má kolonám pomoci hned. | Trasa pevná od výjezdu (do 0.9); přejít na každou lepší – přelévání. |
| R71 | 14. 11. 2026 | Výběr auta, chodce, budovy a silnice ukazuje trasy na mapě. | Přání uživatele (tři způsoby, jak zjistit, kdo kam jede). | – |
| R72 | 14. 11. 2026 | Se třemi a více pruhy: vnitřní jen vlevo, krajní jen vpravo, ostatní rovně; hráč mění nástrojem Šipky. | Přání uživatele. | Sdílené pruhy vlevo+rovně a rovně+vpravo (zůstává u dvou pruhů). |
| R73 | 14. 11. 2026 | Parkoviště s plnou uličkou a místy vedle ní; hlubší tvary podniků; kapacita = počet míst. | Přání uživatele: auta nemají stát v uličce. | Ulička mezi dvěma řadami bez vlastní šířky (do 0.9). |
| R74 | 14. 11. 2026 | Jednosměrky se na slepý konec silnice napojují na jednotlivé pruhy (podle kurzoru na pruh nebo mezi pruhy), víc jednosměrek na jeden konec. | Přání uživatele. | Obyčejná křižovatka na konci (do 0.10). |
| R75 | 14. 11. 2026 | Křížení v jiné výšce jen s celým patrem mezi silnicemi (rozdíl aspoň 0,9). | Přání uživatele: silnice vedla skrz nízkou část mostu. | Stačila půlka patra (do 0.10). |
| R76 | 14. 11. 2026 | Přichytávání ve stylu CAD: střed úseku, kolmice, prodloužení slepých konců s průsečíkem. | Přání uživatele (Revit / AutoCAD). | – |
| R77 | 14. 11. 2026 | Parkoviště: uličky kolmo k silnici s místy po obou stranách, větší tvary. | Přání uživatele; nahrazuje R73 v části rozvržení. | Řady rovnoběžně se silnicí (0.10). |
| R78 | 14. 11. 2026 | Parkoviště se skládá z modulů (dvouřadý, jednořadý, příčná ulička, místo pro zásobování, zeleň) podle obdélníku mezi silnicí a budovou; katalog a pravidla v `docs/PARKOVISTE.md`. | Volba uživatele po katalogu 20 půdorysů: parametrická stavebnice místo pevných tvarů. Nahrazuje R77. | Pevné tvary pro každý druh budovy. Šikmé stání, oblouk a zvláštní typy z katalogu zatím ne. |
