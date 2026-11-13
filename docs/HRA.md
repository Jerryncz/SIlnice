# Jak se svět hry chová

Základní dokument hry Osady a cesty. Popisuje lidskou řečí, co se ve světě
děje a proč. Kód a testy z něj vycházejí; když se liší, platí tento dokument
a kód se opraví (nebo se dokument vědomě změní – CLAUDE.md bod 3).

Stav: odpovídá verzi 0.2.0 (13. 11. 2026).

## 1. Hlavní myšlenka

Hráč staví jen silnice. Všechno ostatní – domy, služby, nové obce – vzniká
samo podle toho, kudy a kolik se jezdí. Hra je o tom, jak infrastruktura
tvaruje krajinu, ne o ručním stavění města.

Pilíře:
- **Organický růst** – nic se neobjeví z ničeho; vše má příčinu, kterou hráč
  na mapě vidí.
- **Doprava jako tep** – auta skutečně vyjíždějí, jezdí, parkují a zajíždějí;
  zácpa je fyzická, ne číslo.
- **Čitelnost** – kronika a panel vysvětlí, proč se co stalo.

## 2. Mapa a terén

- Mřížka 48 × 32 polí: louka, les, voda (řeka a rybníky).
- Silnice na louce stojí 10 Kč, v lese 18 Kč (les se vykácí), přes vodu
  50 Kč (most).
- Silnice se dá rozšířit (30 Kč): pojme dvojnásobek aut a jezdí se po ní
  rychleji.

## 3. Obce a domy

- **Bez silnice nic nevznikne.** Každá budova stojí u silnice a má vlastní
  vjezd. Osada začíná jedním domkem u cesty.
- Domy přibývají jen podél silnic v okolí obce, nejradši blízko návsi a u
  rušné silnice. Okruh obce se zvětšuje s počtem domů.
- **Tvary domů** podle velikosti obce a místa: domek (4 obyvatelé), dvojdomek,
  dům se zahradou, statek do L, dlouhý statek do L, statek do Z, statek do U
  (otevřený k silnici). Větší tvary až od určité velikosti obce.
- Ve středu větších obcí (od 60 obyvatel) stojí **bytové domy** (10 obyvatel
  na pole) s podzemní garáží; plný střed se zahušťuje přestavbou malých domů
  na bytovky.
- **Rychlost růstu** roste s počtem lidí z jiných obcí, kteří jsou po silnici
  dosažitelní, se službami v okolí a s provozem; klesá se zácpami a se
  zrušenými cestami. Velké obce rostou pomaleji.
- Obec zanikne, když se zbourá její poslední dům.

## 4. Doprava

- Lidé z domů jezdí do jiných obcí a ke službám. Kam jedou, rozhoduje velikost
  cíle a vzdálenost.
- **Auto vyjíždí z domu.** Čeká ve vjezdu, dokud na silnici není místo. Když
  se do 8 s nedostane ven, lidé cestu vzdají.
- Auta jezdí vpravo, hledají nejrychlejší cestu podle aktuálního vytížení a
  objíždějí kolony. Když je i nejlepší cesta výrazně pomalejší než volná,
  lidé cestu předem zruší.
- Na plnou silnici auto čeká; po 2,5 s se protlačí (aby se doprava úplně
  nezasekla).
- Auto v cíli opravdu zajede do vjezdu nebo na parkoviště, klidně přes
  protisměr.

## 5. Služby

- **Pumpa** vzniká u silnice s velkým provozem (alespoň 45 aut/min), nejblíž
  9 polí od jiné. Má nájezd se stojany; auta na delší cestě na ni zajíždějí
  natankovat a pokračují dál.
- **Hospoda** (od 24 obyvatel), **obchod** (od 40 obyvatel) a **nákupní
  centrum** (od 90 obyvatel, u rušné silnice na okraji) mají vlastní
  parkoviště s kapacitou (4 místa na pole).
- Plné parkoviště: auto čeká na silnici a blokuje ji, po 4 s to vzdá.
  Kde se to opakuje, vznikne **parkovací dům** (20 míst). Auta, která se na
  parkoviště nevejdou, jezdí rovnou do parkovacího domu poblíž.
- Po návštěvě služby jede auto zpátky domů.

## 6. Nové obce

- Na rušné křižovatce nebo u rušné silnice daleko (9 polí a víc) od ostatních
  obcí může vzniknout osada (jména jako Mýto, Rozcestí).
- Zhruba jednou za minutu se u některé silnice daleko od obcí usadí nový domek.

## 7. Hráč

- Nástroje: Silnice, Rozšířit, Bourat, Uzávěra, Prohlížet.
- **Bourat**: tah začatý na budově bourá budovy (domek 40 Kč za pole, bytovka
  100 Kč, služby 120 Kč), tah začatý na silnici bourá silnice (vrací 3 Kč).
- **Uzávěra**: vyznačená pole, kde se nesmí nic postavit. Zdarma.
- Peníze: z každé dokončené cesty, z návštěv služeb a malá daň z obyvatel.

## 8. Co hra zatím nedělá

- Neukládá rozehranou hru (zavřením okna se hra ztratí).
- Nemá křižovatky se semafory, železnici, kopce ani typy obcí – viz `napady/`.
- Nemá cíle, úrovně ani konec hry.

## Jak se tento dokument mění

Změna pravidel světa začíná tady (návrh → souhlas), pak `docs/ROZHODNUTI.md`,
kód, testy a `CHANGELOG.md`.
