# Jak se svět hry chová

Základní dokument hry Osady a cesty. Popisuje lidskou řečí, co se ve světě
děje a proč. Kód a testy z něj vycházejí; když se liší, platí tento dokument
a kód se opraví (nebo se dokument vědomě změní – CLAUDE.md bod 3).

Stav: odpovídá verzi 0.3.0 (13. 11. 2026).

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
  železné rudy.
- Mapa jde přibližovat (kolečko, sevření prstů) a posouvat (prostřední
  tlačítko, nástroj Ruka, šipky, dva prsty).
- Na třech okrajích mapy vedou **dálnice do světa** (do skutečných měst,
  např. Praha, Brno). Na začátku končí v polích – hráč je musí napojit.

## 3. Silnice

| Druh | Kdo staví | Rychlost | Pruhy v každém směru | Domy u ní |
|---|---|---|---|---|
| Ulička | obec sama | 0,7 | 1 | ano |
| Silnice | hráč, 10 Kč/pole | 1 | 1–3 | ano |
| Dálnice | hráč, 40 Kč/pole | 1,8 | 2–3 | ne (bez vjezdů) |

- Les +8 Kč, skály a ruda +15 Kč, most přes vodu +40 Kč (dálnice +110 Kč).
- **Pruh**: přidá pruh v obou směrech (20 Kč, na dálnici 40 Kč), nejvýš 3.
  Uličku nástroj Pruh rozšíří na silnici.
- **Jednosměrka**: tahem ve směru jízdy. Auta jedou jen tím směrem, ale po
  celé šířce (dvojnásobná kapacita v jednom směru). Klik na jednosměrku ji
  zruší. Auta jednosměrky respektují při hledání cesty.
- Kapacita: na poli smí v jednom směru být tolik aut, kolik je pruhů
  (jednosměrka dvojnásobek). Přeplněné pole zpomaluje.

## 4. Křižovatky

Křižovatka je pole, kde se potkají tři nebo čtyři silnice. Auto do ní vjede,
jen když je v ní místo a když mu to pravidlo dovolí:

- **Přednost zprava** (výchozí): auto čeká, když se zprava blíží jiné.
- **Hlavní silnice** (vodorovně nebo svisle): auta z vedlejší čekají, dokud
  se po hlavní něco blíží. Když se potká silnice s užší, hlavní se určí sama
  podle šířky (dá se změnit).
- **Semafor** (60 Kč): střídá vodorovný a svislý směr; přepne, když na druhém
  směru čeká fronta (nejdřív po 4 s, nejpozději po 14 s), s krátkou žlutou.
- **Kruhový objezd** (80 Kč): vjede, kdo najde místo v kruhu; v kruhu se
  jede pomaleji.
- Aby se doprava nikdy úplně nezasekla, auto po 3,5 s čekání přednost
  ignoruje a po 2,5 s se protlačí i na plné pole.

## 5. Obce a domy

- **Bez silnice nic nevznikne.** Každá budova stojí u silnice (ne u dálnice)
  a má vlastní vjezd. Osada začíná jedním domkem u polní cesty.
- Domy přibývají podél silnic v okolí obce, nejradši blízko návsi a u rušné
  silnice. Tvary: domek, dvojdomek, dům se zahradou, statky do L, Z a U,
  ve středu větších obcí bytové domy s podzemní garáží.
- **Uličky**: když obec nemá kde stavět, postaví si sama krátkou uličku
  (2–4 pole) do volného místa ve svém okolí.
- **Rychlost růstu** roste s dosahem (lidé z jiných obcí a napojení na svět),
  se službami a provozem, se stavebním materiálem (řezivo, kámen); klesá se
  zácpami, se zrušenými cestami a když auta nemůžou vyjet z domů.
- Výběr domu ukáže, co obec brzdí („Růst obce brzdí: …“).

## 6. Doprava

- Lidé jezdí do jiných obcí, ke službám, do práce v průmyslu a ven do světa.
- Auto vyjede z domu, jen když je na silnici místo; po 8 s lidé cestu vzdají.
  Auta vracející se ze služby se po 6 s vmáčknou.
- Auta hledají nejrychlejší cestu podle vytížení a pravidel křižovatek;
  příliš pomalé cesty se předem ruší.
- **Z vnějšího světa** přijíždí tranzit (z dálnice na dálnici, přibývá s časem)
  a turisté (do hospod, obchodů a nákupních center, po návštěvě odjedou).

## 7. Služby

- **Pumpa** u silnice s velkým provozem; auta na ni cestou zajíždějí.
- **Hospoda** (od 24 obyvatel), **obchod** (od 40), **nákupní centrum**
  (od 90), **obchodní zóna** (od 150, nebo od 100 při napojení na svět).
  Všechny s parkovištěm s kapacitou.
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

## 9. Hráč a rozhraní

- Hra běží přes celou obrazovku; panely plavou nad mapou.
- Nástroje: Silnice, Dálnice, Pruh, Jednosměrka, Křižovatka (klik přepíná
  pravidlo), Bourat, Uzávěra, Ruka. Klávesy 1–8.
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
- Nemá cíle, úrovně ani konec hry.

## Jak se tento dokument mění

Změna pravidel světa začíná tady (návrh → souhlas), pak `docs/ROZHODNUTI.md`,
kód, testy a `CHANGELOG.md`.
