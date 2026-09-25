# Release notes for members: drafts

Not in the database yet. These are the texts for **Admin → Wijzigingslog** (table
`changelog_entries`: a title, a list of items, and a release date). They are for members, so
they are in Dutch and leave out developer details; `CHANGELOG.md` is the developer version.

Enter them in Admin → Wijzigingslog once 2.0 is live, **newest last**: the newest entry decides
what the "new" banner shows, so add v1.9 first and v2.0 after it. When they are in, delete this
file and tick the item in [TODO.md](../TODO.md).

Format of an existing entry, for reference: title `v1.8 — Foto-stories per condag`, release
date `2026-09-11`, one short sentence per item.

---

## v1.9 — Nieuw uiterlijk en navigatie rond trips

Release date: 2026-09-15

- Nieuwe look: vlakke vlakken met donkere randen en Poppins voor tekst, in licht én donker.
- De navigatie draait nu om trips: Hub · Event · Agenda · Financiën · Crew. De Meer-tab verdwijnt; je instellingen vind je onder je avatar.
- Event opent de trip waar je nu mee bezig bent, met Overzicht, Vervoer, Eten, Kamers, Cosplay en Foto's bij elkaar.
- Overzicht is het ticket van de trip met een tegel per onderdeel. Tik op een dag om je voor die dag aan of af te melden.
- Agenda vervangt de kalender: aankomende trips als stapel tickets, "Ik ga mee" met één tik, en een Recap om terug te kijken met foto's per dag.
- Vervoer en Eten tonen alleen de trip waar je naar kijkt, met dagknoppen bij meerdaagse trips.
- Uitgaven kun je aan een evenement koppelen, en "Kamer X" komt nu uit de kamerindeling.
- Een beheerder kan in Schermen testen de foutschermen bekijken. *(Schrappen als het alleen ledennieuws moet zijn.)*

---

## v2.0 — Afrekenen, sheets en veel meer

Release date: 2026-09-25 (or the day it goes live)

- Nieuw: Afrekenen in Financiën. Wat jij en een ander elkaar schuldig zijn wordt verrekend tot één bedrag per persoon. Wie geld krijgt plakt een betaallink (Tikkie, bunq, PayPal, Revolut, Klarna of een grote Nederlandse bank) en/of een IBAN, en de ander krijgt een Discord-bericht. Daarna geef je aan dat je betaald hebt en bevestigt de ontvanger dat het binnen is. Bankgegevens zie alleen jij en de ander, en ze worden gewist zodra de betaling bevestigd is.
- Voor jou op de Hub toont alles wat je nog moet regelen, en elk item opent de plek waar je het oplost. Dit vervangt de Acties-pagina.
- Vervoer, Eten, Hotel, Cosplay, Weer, Praktisch, Uitgave toevoegen en Afrekenen openen als sheet van onderen. De zwevende plusknop is weg.
- Kamers heet nu Hotel. Het toont het adres, het verblijf, wie later komt of eerder weggaat, de hotelinfo en dan de kamers.
- Iedereen kan nu anderen aanmelden voor etentjes, ritten, dagen en hotelkamers via "Iemand aanmelden".
- Autoladingadvies bij Vervoer: elke auto laat zien met hoeveel mensen hij moet vertrekken zodat niemand achterblijft.
- Tik op "zonder rit" of "nergens bij" om te zien wie er mist. In Hotel klap je "nog geen kamer" open voor de namen.
- Zoeken in de bovenbalk over trips, ritten, etentjes, cosplays en crew.
- Op iemands profiel zie je zijn of haar foto's, per evenement te filteren.
- Chauffeurs kunnen een rit weer terugnemen ("Rit verwijderen").
- Foto's die door slecht bereik niet verstuurd kunnen worden, blijven bewaard en gaan vanzelf mee zodra je weer verbinding hebt. Vervoer, Eten en foto's laden ook sneller en werken beter offline.
- Een nieuwe uitgave kiest zelf het evenement dat het dichtst bij vandaag ligt.
- Belangrijk: het Story-archief en de Acties-pagina zijn opgegaan in Agenda en Voor jou. Oude links sturen je door.
- Belangrijk: het agenda-abonnement (Agenda → Abonneren) werkt niet meer en moet je opnieuw nemen.
- Veiliger: inloggen kan niet meer worden misbruikt, geüploade foto's verliezen hun locatiegegevens, en links moeten naar een echte website wijzen.
- Fixes: een uitgave opslaan lukte niet altijd, bedragen delen verliest geen centen meer, een lang profiel scrolt in plaats van weg te lopen, en gedeelde triplinks hebben weer een voorbeeld.
