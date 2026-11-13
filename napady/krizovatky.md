# Křižovatky a semafory
Stav: nápad
Zapsáno: 13. 11. 2026

## Co a proč
Dnes je křižovatka obyčejné pole silnice. Skutečné řízení křižovatek
(přednost, semafory, kruhové objezdy) by dalo hráči další nástroj na řešení
zácp a zajímavé rozhodování.

## Představa
- Přednost zprava jako výchozí; hráč může na křižovatku dát semafor nebo
  vymezit hlavní silnici.
- Kruhový objezd jako speciální stavba přes 2 × 2 nebo 3 × 3 pole.

## Napojení
Pohyb aut (`moveCar`) – vstup na pole křižovatky by se řídil pravidlem
křižovatky místo jen obsazenosti pole.

## Otevřené otázky
- Jak podrobně: jen zpomalení na křižovatce, nebo skutečné čekání na
  přednost?

## Rizika
- [RIZIKO] Zablokování (deadlock) křižovatky, kde všichni čekají na všechny.
