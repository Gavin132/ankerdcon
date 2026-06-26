1. Een integratie met Google Calender, zodat gebruikers evenementen, transport en etentjes direct vanuit de app kunnen plannen en synchroniseren met hun agenda.

---

2. Het automatisch bij kunnen houden van betalingen en uitgaven, momenteel moet dit handmatig worden toegevoegd door de gebruiker, wat tijdrovend kan zijn. Wel moet deze functie optioneel zijn, zodat gebruikers zelf kunnen kiezen of ze hun uitgaven willen bijhouden. Hoe dit geïmplementeerd kan worden, moet nog onderzocht worden, maar een mogelijke oplossing is het koppelen van de app aan bankrekeningen of betaalapps om transacties automatisch te importeren.

---

3. Notificaties voor belangrijke dingen zoals het starten van kaartverkoop of het naderen van een evenement, zodat gebruikers op de hoogte blijven van belangrijke updates en deadlines. Dit moet ook geintegreerd zijn met de Discord bot, zodat gebruikers meldingen kunnen ontvangen in de Discord server.

---

4. Een verbeterde zoekfunctie binnen de app, zodat gebruikers sneller en gemakkelijker evenementen, locaties en andere relevante informatie kunnen vinden. Dit kan bijvoorbeeld door het implementeren van filters, categorieën en een zoekbalk met suggesties.

---

5. Mogelijkheid voor (admins?) om ticket verkoop te beheren en te monitoren in de kalender, zodat voor iedereen duidelijk is wanneer tickets beschikbaar zijn.

---

6. Extra informatie bij evenementen, zoals een beschrijving van de locatie, parkeermogelijkheden, en eventuele speciale instructies of vereisten voor bezoekers. Dit kan helpen om de ervaring van de gebruikers te verbeteren en hen beter voor te bereiden op het evenement. Andere handige informatie kan zijn: website, tickets kopen, data, tijd, locatie, contactpersoon, etc.

---

7. Bij aankomende evenementen hetzelfde als bij punt 6, maar dan ook met de mogelijkheid om een herinnering in te stellen voor het evenement, zodat gebruikers op tijd worden herinnerd aan hun geplande activiteiten. En ook de mogelijkheid om gebruikers, die zich hebben aangemeld voor een evenement, te bekijken (incl. proifiel).

---

8. (Nice to Have), profiel badges (zoals owner, developer, admin idk)

---

9. Een admin dashboard voor het beheren van evenementen, gebruikers en andere belangrijke aspecten van de app. Dit kan helpen om de app efficiënter te beheren en te zorgen voor een betere gebruikerservaring.

   Optional (for future calendar extended fields):
   ALTER TABLE calendar ADD COLUMN description text;
   ALTER TABLE calendar ADD COLUMN location text;
   ALTER TABLE calendar ADD COLUMN website text;
   ALTER TABLE calendar ADD COLUMN ticket_url text;
   ALTER TABLE calendar ADD COLUMN ticket_sale_start text;
   ALTER TABLE calendar ADD COLUMN ticket_price_day float;
   ALTER TABLE calendar ADD COLUMN ticket_price_weekend float;
   ALTER TABLE calendar ADD COLUMN locker_info text;

Paginatie en filterering van zaken in het admin portaal

After that go ahead with analyzing each file, ive found out, especially on the admin files, that a lot of files, such as the AdminLayout, include
multiple constants, components that can be easily extracted to their own files. Do this for each case you find. I want clean code. Do this for
every file u find, not only admin related files

![alt text](image.png)
