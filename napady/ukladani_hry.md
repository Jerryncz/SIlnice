# Ukládání rozehrané hry
Stav: nápad
Zapsáno: 13. 11. 2026

## Co a proč
Dnes se zavřením okna rozehraná hra ztratí. Hráč by měl mít možnost hru
uložit a příště pokračovat, případně mít víc uložených her.

## Představa
- Automatické uložení do prohlížeče (localStorage) každou minutu a při
  zavření okna; tlačítko „Uložit“ / „Načíst“.
- Export a import uložené hry jako soubor (JSON), aby šla přenést mezi
  počítači.

## Napojení
Simulace (`createSim`) – stav je v typovaných polích a objektech s odkazy
(budova → obec, auto → budova); pro uložení je potřeba převést odkazy na
identifikátory a zpět.

## Otevřené otázky
- Ukládat i auta na silnici, nebo jen svět (silnice, budovy, obce, peníze)
  a auta nechat znovu vyjet? Navržené výchozí: jen svět.
- Kolik pozic uložení?

## Rizika
- [RIZIKO] Změna formátu mezi verzemi hry rozbije staré uložené hry →
  uložená hra musí nést číslo verze formátu a převod (migraci).
- [PAST] Prohlížeč může úložiště smazat (anonymní okno, čištění dat) →
  export do souboru jako záloha.
