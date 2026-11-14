# Parkoviště

Předloha a pravidla pro parkoviště ve hře. Vizuální katalog je v
`docs/parkoviste/katalog.html` (otevřít v prohlížeči): 20 půdorysů v měřítku
s vyznačenými jízdními pruhy a stavebnice, která parkoviště skládá z modulů.

## Stavebnice (ve hře od 0.12)

Parkoviště je obdélník mezi silnicí a budovou. Plní se od budovy k silnici:

| Díl | Co je | Rozměr ve hře |
|---|---|---|
| Dvouřadý modul | stání, ulička, stání | 1,5 pole na hloubku |
| Jednořadý modul | stání a ulička, když zbude aspoň 1 pole | 1 pole |
| Příčná ulička | spojuje uličky na straně vjezdu a vede k silnici; od dvou uliček a šířky 2,4 pole i druhá naproti | 0,5 pole |
| Místo pro zásobování | u budovy vedle příčné uličky, jen podniky se zákazníky a aspoň 6 stání v řadě | 3 stání |
| Zeleň | zbytek hloubky u silnice, se stromy | – |
| Úzké parkoviště | pod 1,6 pole šířky: jen ulička od silnice a stání po jedné straně | – |

Stání má 0,27 × 0,5 pole (auto 0,2 × 0,4), ulička 0,5 pole. Kód:
`src/sim/06_parkoviste.js` (`lotLayout`), kreslení `drawLot`.

## Z katalogu zatím ve hře není

- Šikmé stání a jednosměrné uličky (3, 9, 18).
- Obloukový modul (19) – pro nádraží, kostel, náměstí.
- Zvláštní typy: objezd kolem budovy (12), dvůr s průjezdem (13), zásobovací
  dvůr za budovou (17), zálivy podél ulice (20), obratiště (14).
- Tvary do L a do U kolem budovy (5, 6): parkoviště je zatím vždy před budovou.
