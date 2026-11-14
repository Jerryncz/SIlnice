# Poznatky – zkouška 30 křižovatek (14. 11. 2026)

Zdroj: chat „zkouška křižovatek“, větev `zkouska-krizovatek`, verze hry 0.12.0.
Nástroj: `tests/krizovatky/` (scénáře, měření, snímky). Měření: `node tests/krizovatky/zkouska.js`,
`--nikdy` (bez vzdávání), `--oprava=1,…,5` (pokusné opravy jen v paměti).

## Bugy
- [RIZIKO] `05_doprava.js` tryTransition: místo za křižovatkou se kontroluje jen pro přední polovinu
  auta (`sIn+c.len/2`), ale z plochy auto odejde až při `s ≥ s1+len/2`. Auto pak zůstane zadní půlkou
  v ploše a blokuje křižující průjezdy → zablokování dvou křižovatek 5 polí od sebe (scénář 20: bez
  vzdávání 110 s nic). Oprava 1 (`sIn+c.len+0.02`) zablokování odstraní (65 → 154 aut), kruhům ubere
  9–15 % propustnosti.
- [PAST] Rozpor HRA.md × kód: „Auto, které **stojí** déle než limit, to vzdá“, ale `c.wait` se sčítá
  i při pomalé jízdě v koloně (a s vůdcem se jen pomalu odečítá). Vzdaná auta reálně stála 2–4 s.
  „Zablokovaná doprava“ se tak hlásí i u obyčejné zácpy. Oprava 2: zvláštní počítadlo bez pohybu.
- [PAST] Semafor: odbočující vlevo dává přednost protijedoucímu, i když ten také odbočuje vlevo →
  oba čekají 6 s (`permit`, případ `light`). Semafor 1+1 je proto horší než přednost zprava.
  Oprava 5: 159 → 282 aut; mřížka semaforů p95 zdržení 50 → 13 s; bez vedlejších účinků.
- [PAST] `boxFree` hledá střet jen na spojnici začátek–konec průjezdu (tětivě), ne na oblouku;
  u 5–6 ramen, odbočení do jednosměrky a na kruhu se auta v ploše překrývají. Auta ze stejného
  příjezdu (`o.conn.from===l`) se nehlídají vůbec – na dvoupruhovém kruhu se kříží pruhy.
  Oprava 3 (oblouk po 8 dílech) překrytí u 5/6 ramen a jednosměrky odstraní, jinde pár přidá – doladit.

## Varování
- Přednost zprava na symetrické křižovatce (4 ramena, Y, 5–6 ramen) se při středním provozu zasekne
  vždy; rozjíždí ji jen pojistka 3,5 s → kapacita ~55 aut/min. Návrh: když čekají všechna ramena,
  pustit hned nejdéle čekajícího. Herní rozhodnutí → HRA.md.
- Hladovění: o uvolněné místo za křižovatkou rozhoduje pořadí úseků v `S.edges`, ne doba čekání
  (scénář 19: auto čeká přes 3 min; nájezd na kosodélníku při silném provozu). Návrh: místo si
  zamluví nejdéle čekající auto.
- Bez semaforu odbočující vlevo nedává přednost protijedoucím (české pravidlo ano). Oprava 4 je
  realističtější, ale T ztratí 10–30 % propustnosti. Rozhodnout v HRA.md.
- `03_vzory.js` Trubka: z konce mostu vycházejí dvě jednosměrné rampy z jednoho uzlu pod ~1°,
  auta se kreslí přes sebe. Rampy rozdělit s odsazením.

## Nové vzory
- `tests/krizovatky/scenare.js` se načítá do prostoru simulace (Node vm i `<script>` v prohlížeči),
  takže stejné scénáře jdou měřit i vyfotit. Funkce simulace jdou v vm obalit (`ctx.permit = …`),
  protože deklarace funkcí jsou vlastnosti globálního objektu; `const` (např. `linkTo`) přes
  `vm.runInContext("linkTo", ctx)`.
- Cíl na bulváru potřebuje `side` (allowedDirs), jinak findPath nepovolí žádný směr; `goal.dirs`
  findPath ignoruje.

## Ověření na větvi `verze-0-17` (PR #14, 0.17.0)
- Rozhraní simulace je stejné, `tests/krizovatky/` běží beze změny a všech 5 pokusných oprav sedí na zdroj.
- Úplné zablokování scénáře 20 už nenastává (163 aut místo 65), ale auta tam čekají až 158 s (hladovění).
- Vzdávání v pomalé koloně, semafor s dvěma odbočeními vlevo (oprava 5: semafor 1+1 144 → 247 aut,
  mřížka p95 51 → 14 s) a přednost zprava na symetrické křižovatce platí dál.
- Překrytí aut na kruhových objezdech je víc než v 0.12 (dvoupruhový kruh 10–21, kruh s bulváry
  12–18, dálnice do kruhu 18–21 dvojic za běh); kosodélník při silném provozu 21.
