# Přestavba 0.14: jádro drah
Stav: → ve hře od verze 0.14 (jeden pull request)
Zapsáno: 14. 11. 2026, naposledy upraveno: 14. 11. 2026

## Co a proč
Všechno, co se ve hře hýbe, se má pohybovat po skutečných drahách a hledat
po nich cestu: auta, kamiony, chodci, později autobusy, kola, taxi. Dosud
byly příjezdy, parkoviště, chodníky a průjezd křižovatkou dopočítané
animace, proto chodci skákali do křižovatky a mizeli a parkoviště nedávala
smysl.

## Rozhodnuto (R80–R87)
- Jedna verze (0.14), jeden pull request.
- Pohyb po drahách s obrysem (ne volně ve 2D).
- Stojící auto mimo kolonu se po 3 s objede: vedlejší pruh, jinak krátce
  protisměr, když je volno; v koloně u křižovatky ne.
- Chodci: přes Silnici, Bulvár a jednosměrky jen po přechodech, přes Uličku
  a Ulici i jinde, když je mezera.
- Pozemky: nejdřív parkoviště z katalogu, k němu budova; příjezd a uličky
  jsou dráhy napojené na pruhy silnice.
- Domky s příjezdem a stáním; druhy domů: samostatný se zahradou,
  dvojdomek, řadovky, blokový dům (Dejvice), viladům, bytový dům se
  společným parkovištěm.
- Nástroj Spojení (křivky pruh → pruh), Šipky zanikají.
- Editor silnic: přepojit konec, posunout křižovatku, ohnout úsek, délka
  přídavného pruhu.

## Postup (zaškrtává se v průběhu)
- [x] Rozdělení kódu do složek
- [x] Křižovatka: skutečný začátek každého ramene, stopčára a přechod tam
- [x] Nástroj Spojení
- [x] Chodníky jako dráhy, rohy, přechody, volné přecházení uliček
- [x] Chodci jako agenti na drahách (odstup, míjení, žádné mizení)
- [x] Dráhy pozemků: příjezd, uličky, stání; vjezd a výjezd s mezerou
- [x] Pozemky: parkoviště z katalogu, pak budova; druhy domů
- [x] Objíždění stojících aut
- [x] Editor silnic (4 funkce)
- [x] Dokumentace, testy, poznatky

## Co zůstalo jen v nápadech
Autobusy, kola, taxi (`dalsi_doprava.md`), fáze semaforů
(`semafory_faze.md`), parkování v ulici (`parkovani_v_ulici.md`), natočené
budovy (`natocene_budovy.md`) a zbytky v souborech výše.
