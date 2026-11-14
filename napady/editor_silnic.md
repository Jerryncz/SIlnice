# Editor postavených silnic
Stav: → ve hře od verze 0.14 (docs/HRA.md kap. 3, nástroj Upravit); zbytek níže zatím není ve hře
Zapsáno: 14. 11. 2026, naposledy upraveno: 14. 11. 2026

## Co a proč
Upravit postavenou silnici bez bourání (ve vanilla Cities: Skylines chybí).

## Představa
Nástroj Upravit: tah za konec silnice ho přepojí jinam, tah za uzel posune
křižovatku, tah za střed úseku ho ohne, tah za začátek / konec přídavného
pruhu změní jeho délku. Platí se jen rozdíl, auta na upravovaném úseku se
přeplánují.

## Otevřené otázky
- Co když úprava protne jinou silnici: nová křižovatka, nebo odmítnout?

## Jak to dopadlo (0.14)
- Úprava, která by protnula jinou silnici, se odmítne; křižovatka se staví
  nástrojem Stavět (rozhodnuto 14. 11. 2026, výchozí odpověď).
- Upravený úsek stojí polovinu ceny nové silnice; posun hranice pruhu jen
  rozdíl ceny širšího úseku. Auta na úseku jedou dál (poloha poměrem délek).

## Zatím není ve hře
- Zpět (vrátit poslední úpravu).
- Esíčko a víc bodů ohybu v jednom úseku (oblouk vede jedním bodem).
- Úprava kruhového objezdu (poloměr, posun) a přepojení konce do jiné výšky
  (z rampy na most).
- Posun celé silnice o víc úseků naráz, přichycení úhlu (45°, kolmo).
