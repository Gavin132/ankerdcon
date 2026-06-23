1. >rides moeten kunnen verlopen
    > moeten nog wel zichtbaar zijn 2 uurtjes na vertrek maar dan grayed out of rood of iets dergelijks
    > ritjes die bijna vertrekken een andere kleur maken ofzo? als het bijna is dan wordt er iets ergens rood, wat verder weg van vertrek oranje etc. misschien zelfs een countdown in minuten van wanneer die gaat vertrekken


>1b. in het klein onderin een history knopje? dan kan je past rides zien per datum.

2. Als de gebruiker Timo een ritje aanmaakt moet deze een vrachtwagen icoontje krijgen bij de Transport Tab. De kleur moet wel hetzelfde zijn als het auto icoon.

3. *zitplaatsen vervangen voor iets van dat het nog duidelijker is dat we het hebben over passagiers die mee kunnen* moet nog standaard op 5 gezet worden ipv 4. subtekst met bestuurder is 1 mag weg

4. *bij meer, de aankomende events, ik heb een tag op sheets die zegt van HDCC2026zomer, of dokomi2026, dat de aankomende event dus altijd zichtbaar is bovenin onder de locatie doorgeven knop.* alleen nog alle data van dat event weergeven, of als je erop klikt dat je meer info ziet. 

5. >optie voor autoritjes aanmaken voor naar een restaurant rijden
    > misschien een extra tag in de sheets voor auto ja/nee
    > ook een tag voor actie vereist erbij

6. >op de home page, bij aankomend event staan nu bijna alle deelnemers. zou dit uitklapbaar kunnen zijn als je drukt op de icoontjes van de mensen?

7. >mogelijkheid om op elke dropdown menu te kunnen typen, en daarna iets te kunnen kiezen uit de lijst. zodat je niet hoeft te scrollen door 40 namen om de goeie te vinden.

8. >bij het toevoegen van ritjes hoeft een gebruiker geen plaatsen aan te geven als deze openbaar vervoer selecteert, deze optie kan dan weggelaten / hidden gezet worden.

9. >aankomend event bovenin het scherm laat nog de oude datum zien, misschien staat de tijdzone van de app verkeerd?

10. >oke dit zou wel gave extra zijn maar hoeft niet perse als het moeilijk te implementeren is. en het moet een toevoeging zijn geen vervanging van. maar op de transport tab dat er onderin een kaart zichtbaar is en dat daarop pins staan met de mensen die rijden vanuit een plek, en misschien die pins kleuren geven, grijs is al vertrokken, rood bijna weg, etc.

11. >darkmode toggle bij meer settings? of misschien afhankelijk van system settings. even kijken hoe dat eruit ziet met de kleuren pallete die er nu ligt...



**22/06/2026**

12. >Bij de tab Meer, evenementen staan verkeerd geordend. de volgorde moet chronologisch zijn van eerste tot laatste event.

13. >Bij de tab Meer, ik zou niet weten hoe, maar het zou iets duidelijker kunnen om jezelf toe te voegen aan een aankomend event.

14. >Bij de tab Meer, events die al geweest zijn onderin verstoppen onder een geschiedenis kopje.

15. >Bij de tab Meer, in plaats van een hele lijst van events die onder 2026 staan bijvoorbeeld, de events groeperen met de 'Event ID'
    > De mogelijkheid om op een event groep/ event (Dokomi 2027 of HDCC 2026 Zomer) te kunnen klikken, en daar jezelf toe te kunnen voegen, misschien met een klein rond icoontje van een persoon met een plusje achter de event groep of naam of id.

16. >Bij de tab Hub, Oude events worden nog steeds laten zien na de datum. Alle event datums/dagen mogen alleen maar zichtbaar zijn tijdens een Event ID nog lopend is. Bijvoorbeeld: als Dokomi 2027 nog steeds bezig is: I.E. het is nu dokomi zondag, dan moeten alle voorgaande dagen nog steeds zichtbaar zijn. Als het event klaar is mag alles naar het ingeklapte geschiedenis kopje.

17. >Bij de tab Hub, oude ritten tellen nog steeds op bij het totaal aantal ritjes. dit getal moet alleen de ritjes tellen die nog moeten gebeuren. Oude ritjes mogen niet meetellen voor deze counter. Hetzelfde geldt voor maaltijden als dit nog niet was toegevoegd.

18. >Bij de tab Eten, oude event wordt nog steeds laten zien voorbij de verstreken datum. deze events moeten de dag erna naar een ingeklapt geschiedenis kopje.

19. >Bij de tab Transport, bij het toevoegen van ritten, het aangeven van het aantal plaatsen moet duidelijker weergeven dat dit gaat over zitplaatsen voor echte passagiers. of de gebruiker moet het totaal aantal zitplaatsen in een auto aangeven, en dan moet het aantal zitplaatsen altijd op 1 beginnen aangezien er altijd een bestuurder in de auto zit uiterard.

20. >Bij de tab Eten, de etentjes / box voor de eten afspraak moet altijd uitgeklapt zijn.

21. >Bij de tab Hub, in plaats van een leden counter tegel, maak hier een locatie ping tegel. laat deze tegel ook iets meer opvallen dan de andere drie.



**24/06/2026**

22. alle plekken waar avatars worden weergegeven moet UserAvatar.tsx voor worden gebruikt. dit is al geimplenteerd in calendargrid en calendararchive.

23. code cleanup, zoveel onzin staat er nu in denk ik, maar ook gewoon oude dinegn die deprecated zijn of zijn overgebleven van google sheets. google sheets is er nu helemaal uit.

24. mag RLS in supabase echt uit staan? het lijkt alsof ze het heel erg ontmoedigen om het uit te zetten. ze claimen dat FastAPI zorgt voor de beveiliging?

25. echt veel functies callen nog steeds voor een row number. in supabase is dit er niet meer, er zijn alleen nog id's. let goed op of dit dat een string of een number is per tabel. al deze row number dingen moeten omgezet worden naar een supabase id ding.

26. we moeten het zo maken dat er voor participants eigenlijk uuid's worden opgeslagen in de database mocht iemand diens naam veranderen. met die uuid's kunnen we weer profielkleuren fotos banners bio en naam etc ophalen in elk scherm? als frekkel inlogt als toosyboi vanuit discord, en hij verandert zn naam naar frekkel dan zou dat overal zo moeten staan.

27. toegestane gebruiker lijst. alleen discord users die wij toevoegen mogen access naar de app.

28. grote hotelkamer tegel op de hub pagina als er een event bezig is met de is_hotel tag op true. op deze tegel zie je dan wie welk kamer numme zit. kamernummer weergeven en daaronder/naast de namen.

29. een manier om automatisch versienummers bij te houden in de meer tab. wat is hiervoor een gebruikelijke implementatie?

# broken met deze update:
kan geen meals toevoegen
kan geen payments toevoegen
frontend/src/hooks/useRides.ts