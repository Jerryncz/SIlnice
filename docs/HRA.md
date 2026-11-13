# Jak se svět hry chová

Základní dokument hry Osady a cesty. Popisuje lidskou řečí, co se ve světě
děje a proč. Kód a testy z něj vycházejí; když se liší, platí tento dokument
a kód se opraví (nebo se dokument vědomě změní – CLAUDE.md bod 3).

Stav: odpovídá verzi 0.4.0 (13. 11. 2026).

## 1. Hlavní myšlenka

Hráč staví jen silnice a řídí dopravu. Všechno ostatní – domy, služby,
průmysl, nové obce – vzniká samo podle toho, kudy a kolik se jezdí.

Pilíře:
- **Organický růst** – nic se neobjeví z ničeho; vše má příčinu, kterou hráč
  na mapě vidí.
- **Doprava jako tep** – auta skutečně vyjíždějí, jezdí v pruzích, čekají na
  přednost, parkují a zajíždějí; zácpa je fyzická, ne číslo.
- **Každá informace vede k akci** – hra neukazuje statistiky pro statistiky.
  Panel „Co řešit“ říká, co je špatně, kde a co s tím; klik přenese hráče
  na místo. Výběr na mapě ukazuje jen to, co pomůže rozhodnout, a tlačítka
  pro akci.

## 2. Mapa a terén

- Mřížka 128 × 80 polí: louka, les, voda (řeky a rybníky), skály, ložiska
  železné rudy. Terén, budovy a uzávěry jsou na polích; silnice jsou čáry
  nad nimi.
- Mapa jde přibližovat (kolečko, sevření prstů) a posouvat (pravé nebo
  prostřední tlačítko, nástroj Ruka, šipky, dva prsty).
- Na třech okrajích mapy vedou **dálnice do světa** (do skutečných měst,
  např. Praha, Brno). Na začátku končí v polích – hráč je musí napojit.

## 3. Silnice

Silniční síť je graf: **uzly** (křižovatky, konce, body na kruhu, ruční
rozdělení) a **úseky** mezi nimi. Uzly se přichytávají na středy polí, úseky
jsou rovné nebo oblouky. Auta jezdí po skutečných čarách jednotlivých pruhů.

- **Úsek vede vždy jen mezi křižovatkami.** Kde se nová silnice ve stejné výšce
  protne s jinou nebo na ni skončí, obě se rozdělí a vznikne křižovatka.
  Volný konec, který silnici přetáhne o kousek, se na ni zkrátí (nezůstane
  pahýl).
- **Navazující úseky se spojují samy**: když se v uzlu potkají jen dva úseky
  stejného druhu, se stejnými pruhy, ve stejné výšce a plynule rovně (nebo
  v jednom oblouku), slijí se v jeden. Stane se to po stavbě, úpravě
  i zbourání odbočky.
- **Rozdělit** (nástroj, klávesa R): klik na silnici ji rozdělí, aby šel kus
  přestavět nebo rozšířit zvlášť. Ruční rozdělení se samo nespojí; má
  značku přes silnici a klik na ni (nebo „Spojit úseky“ ve výběru) ho zruší.
  Úseky, které se liší, zůstanou zvlášť i potom.
- Rozdělení ani spojení nikoho neruší: auta a chodci na úseku jedou dál
  na novém úseku, vjezdy domů zůstanou.

| Druh | Pruhy v každém směru | Rychlost | Zvláštnosti | Kč/pole |
|---|---|---|---|---|
| Ulice | 1 | 0,8 | chodníky; staví je i obce samy | 6 |
| Silnice | 1–3 | 1 | chodníky | 10 (+8 za další pruh) |
| Bulvár | 2–3 | 1,25 | zelený střed, chodníky; z domů se vyjíždí jen doprava | 22 |
| Dálnice | 2–4 | 1,9 | bez chodníků a domů; nejde křížit v úrovni; z boku jen vpravo | 36 |
| Nájezd | 1–2, jednosměrný | 1,3 | připojovací a odbočovací pruh, spojuje dálnici s okolím | 14 |

- **Kreslení**: Rovně (tah, přichytává 0°, 45°, 90°, Shift libovolný úhel),
  Oblouk (začátek, směr, konec), Kruháč (tah od středu, poloměr libovolný,
  nejméně 1,5 pole). Konec u jiné silnice ji napojí; kde se nová silnice
  v téže výšce protne s jinou, vznikne křižovatka.
- **Silnice přes silnici nevznikne.** Tah po existující silnici (aspoň 80 %
  nové trasy po ní, stejným směrem) ji **přestaví** na zvolený druh a počet
  pruhů; když tah nevede po celém úseku, úsek se na koncích tahu rozdělí
  a přestaví se jen ten kus. Platí se jen rozdíl ceny (zúžení je zdarma)
  a případné bourání. Tah, který vede po silnici jen zčásti, hra odmítne.
  Nájezd tažený po obousměrné silnici z ní udělá jednosměrku ve směru tahu.
- **Výška**: Zem, Most, Vysoký most. Silnice v různé výšce se nekříží –
  tak vznikají mimoúrovňová křížení. Silnice začínající na zemi a končící
  na mostě je rampa (stoupá). Most stojí 2,6× (vysoký 4,2×) víc.
- **Náhled** ukazuje trasu, cenu, nové křižovatky a budovy v cestě. Když se
  silnice nevejde, hra nabídne „Postavit a zbourat“ za cenu silnice
  i bourání; bez potvrzení se nic nezbourá.
- **Pruhy po směrech**: každý směr má svůj počet pruhů (v mezích druhu).
  Nástroj Pruhy: klik na polovinu silnice přidá pruh v tom směru, tah podél
  silnice přidá pruh jen na kus úseku (úsek se na koncích tahu rozdělí),
  Shift ubírá. Mezi širším a užším úsekem je náběh – vozovka se plynule
  zúží, auta z končícího pruhu se zařadí. Ve výběru jsou tlačítka pro oba
  směry i pro každý směr zvlášť. Pruh stojí polovinu příplatku druhu za pole.
- **Úpravy úseku** (výběr nebo nástroje): změna druhu, pruhy, jednosměrka
  (obousměrná → jednosměrka → opačně → obousměrná), zbourání (vrací 20 %).
  I rozšíření nabídne zbourání budov, do kterých by zasáhlo. Při změně druhu
  nebo pruhů auta na úseku zůstanou (z rušeného pruhu se přesunou vedle);
  jen otočení jednosměrky auta na úseku zruší.
- **Kruhový objezd** se mění celý: druh (ulice, silnice, bulvár) i pruhy
  (1–3) platí pro všechny jeho úseky.
- **Dálnice**: auta z dálnice smí jen pokračovat nebo sjet vpravo. Na dálnici
  se dá z boku napojit nájezd i obyčejná silnice; takové napojení funguje
  **jen vpravo**: najet ve směru jízdy pruhu na té straně, sjet doprava,
  přejet dálnici na druhou stranu nejde (ani když se z obou stran napojí
  silnice do jednoho bodu). Přes dálnici se jezdí mostem.

## 4. Křižovatky

Auto **zastaví na stopčáře před křižovatkou** (kreslí se při velkém
přiblížení) a vjede, až mu to pravidlo dovolí a za křižovatkou je v jeho
pruhu místo – v křižovatce se tak nestojí. Auta za ním čekají za ním,
stopčáru nepřejedou. Z různých směrů se do křižovatky vjíždí s odstupem.
Kde pravidlo nic neurčuje (rovné navázání dvou úseků), se nezastavuje.

- **Automaticky**: když se potká širší silnice s užší, hlavní je širší
  (značky „dej přednost“); jinak přednost zprava.
- **Přednost zprava**, **hlavní silnice** (libovolná dvojice ramen),
  **semafor** (60 Kč; přepíná podle front, nejdřív po 4 s, nejpozději po
  14 s, se žlutou).
- **Kruhový objezd**: jednosměrný okruh proti směru hodinových ručiček;
  vjíždějící dává přednost autu v kruhu. Silnice uvnitř kruhu se odstraní.
- **Napojení na dálnici**: vjíždějící (nájezd i silnice z boku) dává přednost
  autům na dálnici; jen vpravo (kap. 3).
- Pruh si auto volí podle příštího odbočení (vlevo vnitřní, vpravo vnější).
- Pojistka proti zaseknutí: po 3,5 s čekání auto přednost ignoruje,
  po 8 s se protlačí i do plného pruhu.

## 5. Obce a domy

- **Bez silnice nic nevznikne.** Každá budova stojí u silnice (ne u dálnice)
  a má vlastní vjezd. Osada začíná jedním domkem u polní cesty.
- Domy přibývají podél silnic v okolí obce, nejradši blízko návsi a u rušné
  silnice. Tvary: domek, dvojdomek, dům se zahradou, statky do L, Z a U,
  ve středu větších obcí bytové domy s podzemní garáží.
- **Uličky**: obec si sama staví ulice kolmo od silnic (3–6 polí), když nemá
  kde stavět, a průběžně i při růstu; když ulice narazí na jinou silnici,
  propojí je a vznikne blok.
- **Rychlost růstu** roste s dosahem (lidé z jiných obcí a napojení na svět),
  se službami a provozem, se stavebním materiálem (řezivo, kámen); klesá se
  zácpami, se zrušenými cestami a když auta nemůžou vyjet z domů.
- Výběr domu ukáže, co obec brzdí („Růst obce brzdí: …“).

## 6. Lidé a den

- Herní den trvá 4 minuty při rychlosti 1×; hodiny a fáze dne jsou nahoře.
  V noci se mapa ztmaví a v obydlených domech se svítí.
- Každý dům je domácnost s dětmi, dospělými a seniory. Asi 15 % pracujících
  dělá z domu.
- **Program dne**:

| Kdo | Kdy | Kam | Zpět |
|---|---|---|---|
| Dospělí | 5:30–9:00 | do práce (podniky, služby, kanceláře, školy, statky) | 15:00–17:30 |
| Děti | 7:00–8:00 | do školy | 13:00–15:00 |
| Senioři | 9:00–12:00 | obchod, hospoda | za 1–2 h |
| Dospělí | 15:30–20:30 | nákupy, hospody | za 0,5–2,5 h |
| Kdokoli | 10:00–19:00 | návštěva jiné obce nebo cesta do světa | za 1,5–5 h |

- Blízko se chodí **pěšky po chodnících** (dospělí do 5 polí, děti do 8,
  senioři do 6), jinak autem. Auto zaparkuje u cíle a odveze lidi zpátky.
- Lidé **vycházejí z budov a vcházejí do nich** (od dveří na chodník a zpět),
  auta **zajíždějí do vjezdu** a z něj vyjíždějí; nikdo nemizí na silnici.
  U hranice mapy auta odjíždějí rovnou do světa.
- Pro výkon se lidé počítají po domácnostech; jednotlivě se simulují jen ti,
  kdo jsou právě na cestě.
- Auto vyjede z domu, jen když je v pruhu místo; po 8 s lidé cestu vzdají.
- Auta hledají nejrychlejší cestu podle vytížení, pravidel křižovatek
  a jednosměrek.
- **Z vnějšího světa** přijíždí tranzit (přes den víc) a turisté do služeb.
- Kdo nenajde práci nebo školu, zhorší růst obce a objeví se v „Co řešit“.

## 7. Služby, kanceláře a školy

- **Pumpa** u silnice s velkým provozem; auta na ni cestou zajíždějí.
- **Hospoda** (od 24 obyvatel), **obchod** (od 40), **nákupní centrum**
  (od 90), **obchodní zóna** (od 150, nebo od 100 při napojení na svět).
  Všechny s parkovištěm s kapacitou.
- **Škola** v obci od 20 dětí, když žádná není do 14 polí (150 žáků).
- **Kanceláře** ve středu obce od 70 obyvatel, když lidé nemají práci.
- **Statky** (domy do L, Z, U) dávají práci na poli.
- Plné parkoviště: auto čeká na silnici, po 4 s odjede. Kde se to opakuje,
  vznikne **parkovací dům**.

## 8. Průmysl

| Podnik | Vznikne | Potřebuje | Vyrábí | Kam vozí |
|---|---|---|---|---|
| Těžba dřeva | silnice u lesa, obec do 26 polí | 4 pracovníky | dřevo | pila, svět |
| Lom | silnice u skal | 4 pracovníky | kámen | ocelárna, obce, svět |
| Důl na železo | silnice u ložiska rudy | 5 pracovníků | ruda | ocelárna, svět |
| Pila | těžba dřeva v síti, obec od 30 obyvatel | dřevo, 6 pracovníků | řezivo | obce, svět |
| Ocelárna | důl i lom v síti, obec od 50 obyvatel | rudu a kámen, 10 pracovníků | ocel | svět |

- Pracovníci dojíždějí z obcí a parkují na dvoře podniku; bez nich se nevyrábí.
- Nákladní auta (delší, pomalejší, s barvou nákladu) vozí zboží nejbližšímu
  odběrateli, jinak ven do světa (vývoz platí o polovinu víc).
- Řezivo a kámen v obci jsou stavební materiál a zrychlují růst.
- Těžba vyčerpává okolí; vykácený les po čase doroste.
- Zpracování (pila, ocelárna) se staví k ostatnímu průmyslu. Tři a víc podniků
  blízko sebe tvoří **průmyslovou zónu**, tři a víc kanceláří **kancelářskou
  čtvrť** (popisek na mapě).
- Podniky pracují, jen když přijdou pracovníci (přes den).

## 9. Hráč a rozhraní

- Hra běží přes celou obrazovku; panely plavou nad mapou.
- Nástroje: Rovně, Oblouk, Kruháč, Pruhy, Jednosměrka, Křižovatka (klik
  přepíná pravidlo), Rozdělit, Bourat, Uzávěra, Ruka. Klávesy 1–9 a R,
  Q/E výška. Vjezdy k domům se kreslí pod silnicí.
  Nad nástroji je panel s druhem silnice, počtem pruhů a výškou.
- **Co řešit**: nejvýš 8 nejdůležitějších problémů a tipů (červené = blokuje
  dopravu, oranžové = brzdí rozvoj, modré = příležitost), každý s radou;
  klik přenese na místo.
- **Výběr**: najetí ukáže, klik připne. Obsahuje jen podstatné údaje,
  důvod („proč“) a tlačítka pro akce (pruh, jednosměrka, pravidlo
  křižovatky, zbourání, uzávěra).
- **Kronika** (sbalená): události s odkazem na místo.
- Peníze: z cest, z návštěv služeb, z tranzitu, z dodávek a vývozu zboží
  a malá daň z obyvatel. Ukazuje se i příjem za minutu.

## 10. Co hra zatím nedělá

- Neukládá rozehranou hru (`napady/ukladani_hry.md`).
- Nemá železnici, kopce ani typy obcí (`napady/`).
- Nemá hotové šablony mimoúrovňových křižovatek; staví se z mostů a nájezdů.
- Pruh nejde přidat přes křižovatku jedním tahem (tah platí pro jeden úsek).
- Auta nemění pruh uprostřed úseku; pruh volí při vjezdu na úsek.
- Chodci nezdržují auta na přechodech.
- Nemá cíle, úrovně ani konec hry.

## Jak se tento dokument mění

Změna pravidel světa začíná tady (návrh → souhlas), pak `docs/ROZHODNUTI.md`,
kód, testy a `CHANGELOG.md`.
