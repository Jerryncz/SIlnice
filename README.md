# Osady a cesty

2D hra o stavění silnic, ve které rostou obce samy podle toho, kudy a kolik se jezdí.
Hráč staví jen silnice. Domy, pumpy, hospody, obchody, parkoviště i nové vesnice
vznikají organicky ze simulace provozu.

## Spuštění

Otevři `index.html` v prohlížeči. Nic se nemusí instalovat ani sestavovat.

## Ovládání

| Akce | Ovládání |
|---|---|
| Stavět silnici | tah myší nebo prstem, klávesa `1` |
| Rozšířit silnici | klávesa `2` |
| Bourat silnice / budovy | klávesa `3` nebo pravé tlačítko myši |
| Stavební uzávěra | klávesa `4` |
| Prohlížet | klávesa `5` |
| Pauza | mezerník |
| Vytížení silnic | klávesa `V` |

## Pravidla simulace

- **Bez silnice nic nevznikne.** Každá budova stojí u silnice a má vlastní vjezd.
- **Domy mají tvar:** domek, dvojdomek, statky do L, Z a U, ve středu větších obcí bytovky s podzemní garáží.
- **Auta vyjíždějí z domů.** Vyjedou jen tehdy, když je na silnici místo. Když se dlouho nedostanou ven, lidé cestu vzdají.
- **Růst obce** závisí na tom, kolik lidí z jiných obcí je po silnici dosažitelných, na službách v okolí a na zácpách.
- **Zácpy:** auta hledají nejrychlejší cestu (A* s cenou podle vytížení) a objíždějí kolony. Příliš pomalé cesty se ruší.
- **Služby:** pumpy u rušných silnic (auta na ně cestou zajíždějí), hospody a obchody s parkovištěm, nákupní centra u velkých obcí.
- **Parkoviště mají kapacitu.** Když je plno, auto čeká na silnici. Kde se to opakuje, vznikne parkovací dům.
- **Nové osady** vznikají u rušných silnic a křižovatek daleko od ostatních obcí.

## Struktura kódu

Vše je zatím v `index.html`:

- `<script id="sim">` je čistá simulace bez DOM (terén, obce, budovy, auta, provoz).
  Dá se spustit i v Node.js pro testy a ladění.
- druhý `<script>` obsahuje vykreslování na canvas a ovládání.
