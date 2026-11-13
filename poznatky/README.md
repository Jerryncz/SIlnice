# Poznatky

Poznatky z jednotlivých chatů, které čekají na zapracování do HRA.md, kódu
nebo testů. Nezapracovávají se průběžně – jednou za čas se projdou najednou.

## Zapisování (každý chat)

- Jeden chat = jeden soubor `<datum>_<téma>.md`. Do souborů jiných chatů se
  nesahá.
- Na začátku souboru: zdroj (chat, datum, větev / pull request).
- Položka: `[cílový soubor / část] co přidat nebo změnit – proč (kategorie)`.
  Kategorie: Bugy / Nové vzory / Varování / Ladění / Rozpory;
  závažnost [RIZIKO] / [PAST] / [POZN.].
- Rozhodnutí uživatele se zapisují i s datem („rozhodnuto 13. 11.“) a
  přenášejí do `docs/ROZHODNUTI.md`.

## Zpracování (jednou za čas)

1. Projít všechny soubory mimo `zpracovano/`, seskupit podle cílového souboru,
   vyřadit vyřešené.
2. Navrhnout změny uživateli, zapsat ve větvi, pull request, test.
3. Zpracované soubory přesunout do `zpracovano/`.

## Soubory

| Soubor | Obsah | Stav |
|---|---|---|
| `2026-11-13_prototyp.md` | vznik prototypu 0.1 a 0.2, ladění růstu, parkovací domy, OneDrive | čeká |
| `2026-11-13_verze-0-3.md` | verze 0.3: bugy parkoviště a skrytého okna, ladění tempa růstu a dopravy, nové vzory vykreslování | čeká |
