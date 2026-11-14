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

- Mapa má 128 × 80 polí (pole = jednotka silnic: na pole je 1 pruh a kousek).
  Terén, budovy a uzávěry leží na **jemné síti po půl poli** (256 × 160
  buněk): louka, les, voda (řeky a rybníky), skály, ložiska železné rudy.
  Silnice jsou čáry nad nimi.
- **Silnice zabírá každou buňku, do které její vozovka i s chodníkem
  zasahuje.** Budova na takové buňce stát nemůže, takže domy nelezou do
  silnic; protože se dají posunout o půl pole, stojí těsně u silnice.
- Mapa jde přibližovat (kolečko, sevření prstů) a posouvat (pravé nebo
  prostřední tlačítko, nástroj Ruka, šipky, dva prsty).
- Na třech okrajích mapy vedou **dálnice do světa** (do skutečných měst,
  např. Praha, Brno). Na začátku končí v polích – hráč je musí napojit.

## 3. Silnice

Silniční síť je graf: **uzly** (křižovatky, konce, body na kruhu, ruční
rozdělení) a **úseky** mezi nimi. Uzly se přichytávají na uzly a body
existujících silnic, ve volném terénu na středy polí; úseky jsou rovné nebo
křivky. Auta jezdí po skutečných čarách jednotlivých pruhů.

- **Úsek vede vždy jen mezi křižovatkami.** Kde se nová silnice ve stejné výšce
  protne s jinou nebo na ni skončí, obě se rozdělí a vznikne křižovatka.
  Volný konec, který silnici přetáhne o kousek, se na ni zkrátí (nezůstane
  pahýl).
- **Navazující úseky se spojují samy**: když se v uzlu potkají jen dva úseky
  stejného druhu, se stejnými pruhy, ve stejné výšce a plynule rovně (nebo
  v jednom oblouku), slijí se v jeden. Stane se to po stavbě, úpravě
  i zbourání odbočky.
- **Rozdělit** (nástroj, klávesa 5): klik na silnici ji rozdělí, aby šel kus
  přestavět nebo rozšířit zvlášť. Ruční rozdělení se samo nespojí; má
  značku přes silnici a klik na ni (nebo „Spojit úseky“ ve výběru) ho zruší.
  Úseky, které se liší, zůstanou zvlášť i potom.
- Rozdělení ani spojení nikoho neruší: auta a chodci na úseku jedou dál
  na novém úseku, vjezdy domů zůstanou.

| Druh | Pruhy v každém směru | Rychlost | Zvláštnosti | Kč/pole |
|---|---|---|---|---|
| Ulička | 1 | 0,6 | bez středové čáry, úzké chodníky; staví je hlavně obce | 4 |
| Ulice | 1 | 0,8 | přerušovaná středová čára, chodníky | 6 |
| Silnice | 1–3 | 1 | plná středová čára, chodníky | 10 (+8 za další pruh) |
| Jednosměrka | 1–3, jednosměrná | 0,9 | ve směru tahu; domy u ní stát smí | 8 (+7) |
| Bulvár | 2–3 | 1,25 | zelený střed, chodníky; z domů se vyjíždí jen doprava | 22 |
| Dálnice | 2–4 | 1,9 | bez chodníků a domů; nejde křížit v úrovni; z boku jen vpravo | 36 |
| Nájezd | 1–2, jednosměrný | 1,3 | připojovací a odbočovací pruh, spojuje dálnici s okolím | 14 |

- **Stavění** (nástroj Stavět) má tři nezávislé volby: **druh** (tabulka),
  **tvar** a **výška**.
  - Rovně: tah. Začíná-li na silnici, drží úhly 45° vůči ní a délku po půl
    poli; ve volném terénu 0°, 45°, 90° a celá pole. Shift = volně.
  - Oblouk: začátek, bod, kam oblouk směřuje, konec.
  - Kruh: tah od středu, poloměr libovolný (nejméně 1,5 pole), z libovolného
    druhu silnice i s pruhy (1–3), i z dálnice; dálnice může do kruhu ústit.
  - Napojit: dva body, mezi nimi plynulá křivka. Bod na boku silnice se
    napojí kolmo, bod na konci silnice pokračuje jejím směrem, volný bod
    míří k druhému. Bod na konci přidaného pruhu (kde se úsek rozšiřuje nebo
    zužuje, kurzor ho ukazuje modrou tečkou) napojí silnici přímo na krajní
    pruh: z konce rozšíření se sjíždí ve směru jízdy, do začátku zúžení se
    najíždí. Silnice tam vychází plynule z pruhu, ne kolmo.
  - **Napojení na pruh** (platí pro každý tvar): Jednosměrka nebo Nájezd,
    který začíná nebo končí na boku průběžné silnice (mimo křižovatku, na
    pravé straně jízdního pásu), se nenapojí na osu, ale na krajní pruh:
    - nájezd (konec jednosměrky) dostane na silnici **připojovací pruh**
      5 polí po směru jízdy, sjezd (začátek jednosměrky) **odbočovací pruh**
      5 polí před sebou; pruhů je tolik, kolik má jednosměrka;
    - konec jednosměrky se sám ohne, aby do pruhu přišel v jeho směru;
    - když do 5 polí následuje další nájezd nebo sjezd, pruhy se spojí
      v jeden **průpletový**; kde už silnice víc pruhů mít nemůže nebo je
      málo místa, napojí se jednosměrka na stávající krajní pruh a dává
      přednost;
    - délku pruhu hráč upraví nástrojem Pruhy (tah podél silnice přidá,
      se Shiftem ubere).
    Jednosměrka napojená z levé strany, do křižovatky nebo na dálnici do
    světa je obyčejná křižovatka.
  - **Napojení na konec silnice**: jednosměrka, která začíná nebo končí
    na slepém konci silnice, se napojí na pruhy příslušného směru. Podle
    polohy kurzoru na jeden pruh, nebo mezi dva pruhy (pak vede do obou).
    Na jeden konec jde napojit víc jednosměrek, každá má svůj pruh a nikdo
    nedává přednost; pruh, na který nic nenavazuje, tam končí.
  - **Most a volná výška**: silnice smí jinou křížit v jiné výšce jen tam,
    kde je mezi nimi celé patro. Přes rampu mostu ani těsně u ní to nejde.
  - **Přichytávání při stavění** (značky u kurzoru): kroužek = uzel nebo
    bod na silnici, trojúhelník = střed úseku, pravý úhel = kolmice ze
    začátku tahu na silnici, čárkovaná čára s křížkem = prodloužení slepého
    konce jiné silnice (křížek sedne na průsečík s taženou čarou). Shift
    přichytávání vypne.
  - Odbočka: tah ze silnice (mimo křižovatku). Strana tahu určuje jízdní
    pás, tah ve směru jízdy udělá **odbočku**, proti směru **nájezd**; napojí
    se na pruh podle pravidla výše. Druh odbočky: zvolená Jednosměrka nebo
    Nájezd, jinak u dálnice Nájezd a u silnice Jednosměrka.
  - Vzor: na rovné dálnici na zemi postaví celou mimoúrovňovou křižovatku
    se silnicí přes dálnici (druh a pruhy silnice podle volby, dálnice
    a nájezdy jsou dané):
    - **Kosodélník**: most přes dálnici, na jeho koncích dvě křižovatky,
      do každé sjezd a nájezd z dálnice. Potřebuje 34 polí rovné dálnice.
    - **Trubka**: napojení silnice, která u dálnice končí (silnice přichází
      ze strany, kde je kurzor): most, za ním smyčka z dálnice a vnější
      rampa na dálnici, na bližší straně dvě krátké rampy. Potřebuje
      44 polí rovné dálnice.
    - **Čtyřlístek**: čtyři smyčky pro odbočení vlevo a čtyři vnější rampy
      pro odbočení vpravo, silnice nad dálnicí; mezi nájezdem ze smyčky
      a sjezdem do další je průpletový pruh. Potřebuje 48 polí rovné
      dálnice a hodně místa kolem.
    Na silnici přes dálnici má přednost silnice, nájezdy dávají přednost.
  - Konec u jiné silnice ji napojí; kde se nová silnice v téže výšce protne
    s jinou, vznikne křižovatka. Kurzor ukazuje kroužkem, kam se přichytí
    (uzel, bod na silnici, konec pruhu); ve volném terénu je kurzor křížek
    v bodě mezi poli – tím bodem povede osa silnice.
  - Kde se do průběžné silnice z boku napojí jen jednosměrky (odbočka,
    nájezd, napojení na pruh), má průběžná silnice přednost, nekreslí se
    stopčáry ani přechody a uzel se nekreslí jako křižovatka.
- **Přestavět kliknutím** (zaškrtávátko u nástroje Stavět): každý úsek, na
  který se klikne, se změní na zvolený druh a počet pruhů; kruhový objezd celý.
- **Silnice přes silnici nevznikne.** Tah po existující silnici (aspoň 80 %
  nové trasy po ní, stejným směrem) ji **přestaví** na zvolený druh a počet
  pruhů; když tah nevede po celém úseku, úsek se na koncích tahu rozdělí
  a přestaví se jen ten kus. Platí se jen rozdíl ceny (zúžení je zdarma)
  a případné bourání. Tah, který vede po silnici jen zčásti, hra odmítne.
  Nájezd tažený po obousměrné silnici z ní udělá jednosměrku ve směru tahu.
- **Výška**: Zem, Most, Vysoký most. Silnice v různé výšce se nekříží –
  tak vznikají mimoúrovňová křížení. Zvolená výška platí pro střed silnice;
  na konci v jiné výšce (napojení na zemi nebo na vysoký most) vznikne
  **rampa 3 pole na každou úroveň**. Když se rampy nevejdou, hra to řekne.
  Most stojí 2,6× (vysoký 4,2×) víc.
- **Na most ani na rampu se nic nepřipojí** – ani silnice hráče uprostřed
  rampy, ani uličky obcí, ani domy. Silnice se k mostu připojí jen na jeho
  konci (uzel) nebo uprostřed rovné části mostu (most ve stejné výšce).
  Rampa nesmí křížit jinou silnici ve stejné výšce. Auta na rampě jsou
  vidět nad terénem a stín rampy roste s výškou.
- **Náhled** ukazuje trasu, cenu, nové křižovatky a budovy v cestě. Když se
  silnice nevejde, hra nabídne „Postavit a zbourat“ za cenu silnice
  i bourání; bez potvrzení se nic nezbourá.
- **Pruhy po směrech**: každý směr má svůj počet pruhů (v mezích druhu;
  Silnice, Jednosměrka, Bulvár, Dálnice a Nájezd až 10 v jednom směru).
  U **jednosměrky** se pruh přidá na tom okraji, kam hráč klikne (ve výběru
  „+ vlevo“ / „+ vpravo“); ostatní pruhy zůstanou na místě, takže dvoupruhový
  sjezd navazuje na dva odbočovací pruhy silnice.
  Nástroj Pruhy: klik na polovinu silnice přidá pruh v tom směru, tah podél
  silnice přidá pruh jen na kus úseku (úsek se na koncích tahu rozdělí),
  Shift ubírá. Mezi širším a užším úsekem je náběh – vozovka se plynule
  zúží, auta z končícího pruhu se zařadí. Ve výběru jsou tlačítka pro oba
  směry i pro každý směr zvlášť. Pruh stojí polovinu příplatku druhu za pole.
- **Úpravy úseku** (výběr nebo nástroje): změna druhu, pruhy, u jednosměrky
  a nájezdu „Otočit směr“, zbourání (vrací 20 %). Jednosměrka není přepínač,
  ale druh silnice: obousměrná silnice se na jednosměrku změní změnou druhu.
  I rozšíření nabídne zbourání budov, do kterých by zasáhlo. Při změně druhu
  nebo pruhů auta na úseku zůstanou (z rušeného pruhu se přesunou vedle);
  jen otočení směru auta na úseku zruší.
- **Kruhový objezd** se mění celý: druh i pruhy (1–3) platí pro všechny jeho
  úseky.
- **Grafika spojů**: navazující úseky se potkávají ostrým rohem (pokosem),
  čáry, pruhy, zelený střed i svodidla běží přes spoj bez přerušení. Na
  napojení z boku dálnice dálnice pokračuje celá, napojená silnice se k ní
  přimkne.
- **Dálnice**: auta z dálnice smí jen pokračovat nebo sjet vpravo. Na dálnici
  se dá z boku napojit nájezd i obyčejná silnice; takové napojení funguje
  **jen vpravo**: najet ve směru jízdy pruhu na té straně, sjet doprava,
  přejet dálnici na druhou stranu nejde (ani když se z obou stran napojí
  silnice do jednoho bodu). Přes dálnici se jezdí mostem.

## 4. Křižovatky

Křižovatka (uzel se 3 a více rameny) má **plochu křižovatky** a na ramenech
s chodníky **přechody**. Auto **zastaví na stopčáře** před přechodem
(kreslí se při velkém přiblížení) a vjede, když:
1. mu to dovolí pravidlo přednosti,
2. na ploše není jiné auto, jehož dráha se s jeho dráhou kříží a ještě
   místem křížení neprojelo,
3. přes přechod na jeho rameni ani na cílovém rameni zrovna nejde chodec,
4. za křižovatkou je v cílovém pruhu místo pro celé auto (v křižovatce se
   nestojí).

Pak projede křižovatku **po oblouku** ze svého pruhu do cílového pruhu
(i při vjezdu na kruhový objezd a výjezdu z něj). **Auta se nikdy
nepřekrývají** a nikdo se do plného pruhu neprotlačí. Kde pravidlo nic
neurčuje (rovné navázání dvou úseků), se nezastavuje a auto plynule
pokračuje; když je úsek dál užší, auto z končícího pruhu se zařadí, až je
místo.

- **Automaticky**: když se potká širší silnice s užší, hlavní je širší
  (značky „dej přednost“); jinak přednost zprava.
- **Přednost zprava**, **hlavní silnice** (libovolná dvojice ramen),
  **semafor** (60 Kč; přepíná podle front, nejdřív po 4 s, nejpozději po
  14 s, se žlutou).
- **Kruhový objezd**: jednosměrný okruh proti směru hodinových ručiček;
  vjíždějící dává přednost autu v kruhu. Silnice uvnitř kruhu se odstraní.
- **Napojení na dálnici**: vjíždějící (nájezd i silnice z boku) dává přednost
  autům na dálnici; jen vpravo (kap. 3).
- **Napojení na pruh** (kap. 3): nájezd má za napojením vlastní pruh, takže
  nedává přednost a nezastavuje; průběžná doprava také ne. Auto z nájezdu se
  pak zařadí do průběžného pruhu, než připojovací pruh skončí.
- **Semafor a odbočení vlevo**: na zelenou dává odbočující vlevo přednost
  protijedoucím; na červenou se nejede ani po dlouhém čekání.

### Pruhy

Každý pruh má v uzlu dané, do kterých pruhů z něj jde pokračovat:

- **rovně** pokračuje pruh tam, kde na něj jiný pruh navazuje polohou
  (i přes změnu počtu pruhů: pruh navíc vznikne vedle krajního, končící
  pruh žádné pokračování nemá);
- **vlevo** se jede z vnitřního pruhu, **vpravo** z krajního; na křižovatce
  tvaru T se pruhy rozdělí napůl;
- se **třemi a více pruhy** je vnitřní pruh jen vlevo, krajní jen vpravo
  a pruhy mezi nimi rovně (pokud ty směry v křižovatce jsou);
- hráč to změní nástrojem **Šipky** (klávesa 9): klik na pruh před
  křižovatkou přepíná vlevo / rovně / vpravo a jejich kombinace; ručně
  nastavená šipka je modrá, poslední klik vrátí samočinnou. Každý směr si
  vždy nějaký pruh ponechá. Šipky jsou vidět na pruzích před křižovatkou
  (kde má příjezd aspoň dva pruhy).

Auto zná pruhy, ze kterých dojede dál po své trase (dívá se tři uzly
dopředu), a **přeřazuje se už na úseku**: do sousedního pruhu přejede, když
je vedle místo. Kdo stojí na konci končícího pruhu, toho auta vedle pustí
před sebe (zip); dvě auta, která chtějí každé do pruhu toho druhého, si je
vymění. V koloně auto přejede i do volnějšího pruhu, pokud z něj jeho směr
jde. Auto bliká, když odbočuje nebo přejíždí do jiného pruhu. Auto, které se před křižovatkou do svého pruhu nedostane, po 1,5 s
čekání **odbočku mine**: pojede, kam jeho pruh vede, a najde si odtud novou
cestu. Jen když jiná cesta není, přejede křižovatkou z nesprávného pruhu.

**Přeplánování**: po každé stavbě nebo úpravě silnic si auta na cestě
spočítají trasu znovu, stejně tak auto, které déle než 4 s stojí v koloně.
Na novou trasu přejde, jen když je aspoň o desetinu rychlejší (jinak by se
všichni naráz přelili jinam) a když není těsně před křižovatkou.

**Výjezd z budovy**: auto čeká mimo vozovku a vjede do pruhu, až se do něj
vejde; do stojící kolony mu stačí mezera na délku auta.
- **Pojistka proti zaseknutí**: po 3,5 s čekání auto pustí pravidlo
  přednosti (plochu křižovatky a přechody ale hlídá dál). Auto, které stojí
  déle než nastavený limit, to vzdá: zmizí, lidé to vzdají a dojdou pěšky,
  místo se ukáže v Co řešit jako „Zablokovaná doprava“. Limit je
  v nastavení (Pravidla): Nikdy, 20 s, 40 s (výchozí), 2 min.
- **Přechody**: na každém rameni křižovatky, kde je chodník (ne u napojení
  na dálnici), je přechod sám od sebe – když se vejde: rameno musí být
  dost dlouhé a nesmí se sousedním ramenem svírat úhel menší než asi 50°. Nástroj **Přechod** (klávesa 4) ho
  u křižovatky zruší nebo vrátí a uprostřed úseku přidá nový (10 Kč) nebo
  zruší. Chodec přechází jen po přechodu: počká na mezeru, po 3 s čekání
  si přechod vyžádá a auta mu zastaví.

## 5. Obce a domy

- **Bez silnice nic nevznikne.** Každá budova stojí u silnice (ne u dálnice)
  a má vlastní vjezd. Osada začíná jedním domkem u polní cesty.
- Domy přibývají podél silnic v okolí obce, nejradši blízko návsi a u rušné
  silnice. Tvary: domek, dvojdomek, dům se zahradou, statky do L, Z a U,
  ve středu větších obcí bytové domy s venkovním stáním před domem (auta
  obyvatel, kteří jsou doma, na něm stojí).
- **Budova bez příjezdu zanikne**: když silnice u budovy zmizí nebo se změní
  na dálnici či nájezd (domy k nim nemají vjezd), budova po 60 s zanikne
  zdarma a kronika to zapíše.
- **Uličky**: obec si sama staví uličky (druh Ulička) kolmo od svých silnic
  (3–7 polí), když nemá kde stavět, a průběžně při růstu (asi u každého
  pátého domu). Přednost mají místa uprostřed dlouhých úseků, aby obec
  nerostla do „nudle“ podél jedné silnice; když ulička narazí na jinou
  silnici, propojí je a vznikne blok. Uličky nevedou přes vodu ani k mostům.
- Domy stojí na jemné síti (půl pole): tvar domu je v celých polích, ale
  posunout se dá o půl pole, takže sedí těsně u silnice i na jejím konci.
- **Vybavenost** vzniká sama podle velikosti obce:

| Stavba | Kdy | Co dělá |
|---|---|---|
| Hřiště | od 25 obyvatel a 8 dětí | odpoledne na něj chodí děti pěšky |
| Park | od 30 obyvatel | odpoledne a večer vycházky dospělých a seniorů |
| Kavárna (s terasou a parkovištěm) | od 40 obyvatel | zákazníci přes den |
| Kostel | od 60 obyvatel, jeden na obec | dopoledne tam chodí senioři |
| Náměstí s pěší zónou (dlažba, kašna) | od 120 obyvatel, ve středu | vycházky pěšky, auta tam nejezdí |
| Aleje | od 50 obyvatel | stromy podél ulic s chodníkem (jen vzhled) |

  Každý druh vybavenosti (hřiště, park, kavárna, kostel, náměstí) zrychlí
  růst obce o 6 %, počítají se nejvýš 4. Výběr domu ukáže, co obec má
  a co jí ještě chybí.
- **Rychlost růstu** roste s dosahem (lidé z jiných obcí a napojení na svět),
  se službami, vybaveností a provozem, se stavebním materiálem (řezivo, kámen); klesá se
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
- Chodec jde po chodníku na jedné straně silnice. Na druhou stranu přejde
  jen po přechodu: v křižovatce si vybere cestu s co nejméně přechody
  (a k cíli tak, aby skončil na straně domu), v úseku použije přechod mezi
  sebou a cílem. Když žádný přechod není (dům naproti na stejném úseku),
  přejde u cíle a auta mu dají přednost.
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
  Všechny s parkovištěm.
- **Parkoviště** se skládá z modulů podle místa mezi silnicí a budovou
  (`docs/PARKOVISTE.md`): od budovy k silnici dvouřadé moduly (stání,
  ulička, stání), případně jeden jednořadý, zbytek u silnice je zeleň se
  stromy. Uličky spojuje příčná ulička na straně vjezdu, která vede
  k silnici; větší parkoviště má i druhou naproti. Podniky se zákazníky
  mají u budovy žlutě vyznačené **místo pro zásobování**: staví na něm jen
  nákladní auta a osobní auta na něj nesmějí. Kapacita je počet stání.
  Auto zajede po uličce na volné místo, které si při příjezdu zamluví,
  a při odjezdu po ní vyjede k silnici. Dvě auta nikdy nestojí na jednom
  místě. Parkovací dům má víc míst (patra), než je vidět.
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
- Nástroje: Stavět (1), Pruhy (2), Křižovatka (3, klik přepíná pravidlo),
  Přechod (4), Rozdělit (5), Bourat (6), Uzávěra (7, po celých polích),
  Ruka (8). Tvar silnice A rovně, S oblouk, D kruh, F napojit, G odbočka,
  H vzor; výška Q/E. Nad nástroji je panel s volbami nástroje (u Stavět
  druh, pruhy, tvar, vzor, výška, Přestavět kliknutím). Vjezdy k domům se
  kreslí pod silnicí.
- **Nastavení** (v okně Pravidla): po jaké době to zaseknuté auto vzdá;
  pamatuje si ho prohlížeč. Oddíl **Test** přidá peníze (+10 000 Kč,
  +100 000 Kč) pro zkoušení; kronika to zapíše.
- **Co řešit**: nejvýš 8 nejdůležitějších problémů a tipů (červené = blokuje
  dopravu, oranžové = brzdí rozvoj, modré = příležitost), každý s radou;
  klik přenese na místo.
- **Výběr**: najetí ukáže, klik připne. Obsahuje jen podstatné údaje,
  důvod („proč“) a tlačítka pro akce (pruh, jednosměrka, pravidlo
  křižovatky, zbourání, uzávěra).
- **Kronika** (sbalená): události s odkazem na místo.
- Peníze: z cest, z návštěv služeb, z tranzitu, z dodávek a vývozu zboží
  a malá daň z obyvatel. Ukazuje se i příjem za minutu.

### Kdo kam jede

Nástroj Ruka ukáže trasy na mapě:

- klik na **auto nebo chodce**: odkud a kam jde; trasa plně, kudy půjde,
  slabě, kudy už šel; kroužky u výchozí (oranžově) a cílové (modře) budovy;
- klik na **budovu**: modře trasy všech, kdo jsou na cestě sem, oranžově
  všech, kdo odtud právě odjeli nebo odešli; počty v panelu;
- klik na **silnici**: trasy všech aut a chodců, kteří přes úsek pojedou,
  jedou nebo už projeli; šířka čáry podle počtu.

## 10. Co hra zatím nedělá

- Neukládá rozehranou hru (`napady/ukladani_hry.md`).
- Nemá železnici, kopce ani typy obcí (`napady/`).
- Má jen tři vzory mimoúrovňových křižovatek (kosodélník, čtyřlístek,
  trubka); jiné se staví z mostů a nájezdů.
- Spojení pruh → pruh nejde kreslit jednotlivě; hráč volí jen šipky pruhu.
- Semafor má dvě fáze (dvě osy křižovatky), nemá zvláštní fázi pro odbočení
  vlevo ani nastavení časů.
- Konec připojovacího pruhu nejde chytit a táhnout; délka se mění nástrojem
  Pruhy.
- Postavenou silnici nejde přetvarovat ani přepojit tahem za konec; musí se
  zbourat a postavit znovu (návrh režimu úprav čeká na rozhodnutí).
- Nemá tunely (`napady/tunely.md`).
- Budovy nejsou natočené podél šikmých silnic; u diagonál zůstávají zubaté
  mezery.
- Pruh nejde přidat přes křižovatku jedním tahem (tah platí pro jeden úsek).
- Nemá cíle, úrovně ani konec hry.

## Jak se tento dokument mění

Změna pravidel světa začíná tady (návrh → souhlas), pak `docs/ROZHODNUTI.md`,
kód, testy a `CHANGELOG.md`.
