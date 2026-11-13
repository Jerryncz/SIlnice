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
