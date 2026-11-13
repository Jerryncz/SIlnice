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
