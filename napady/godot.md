# Přechod na Godot
Stav: nápad
Zapsáno: 13. 11. 2026

## Co a proč
Pokud z prototypu bude větší hra (velké mapy, grafika, prodej na Steamu),
prohlížeč a jeden HTML soubor přestanou stačit. Godot je zdarma a na 2D
výborný.

## Představa
Simulace je už teď oddělená od vykreslování (R4) a od verze 0.4 rozdělená do
modulů v `src/sim` (R26), takže jde přepsat do
GDScriptu nebo C# skoro jedna k jedné; vykreslování se udělá v Godotu znovu.

## Otevřené otázky
- Kdy: až bude hratelnost odladěná v prohlížeči (doporučené), nebo hned?
