# Ankerd Con App

De **Ankerd Con App** is een webapplicatie die is ontworpen om evenementen met grote groepen deelnemers efficiënt te beheren. De app stroomlijnt de logistiek rondom transport, etentjes, hotelovernachtingen en betalingen.

### Doelstelling
Het creëren van een centraal en helder overzicht voor grote groepen op reis. Hierdoor hoeven deelnemers niet langer te zoeken in chaotische chatgeschiedenissen naar planningen, tijden of afspraken. Gebruikers kunnen eenvoudig inloggen via **Discord** en zichzelf direct aanmelden voor de gewenste onderdelen.

---

## Functionaliteiten

### Algemeen Overzicht
Dit dashboard biedt in één oogopslag de meest kritieke informatie:
* **Status aanmelders:** Zie direct welke gebruikers zich nog *niet* hebben aangemeld voor bijvoorbeeld een specifieke autorit.
* **Locatie delen:** Geef direct je huidige locatie door aan de rest van de groep.
* **Eerstvolgende event:** Wordt prominent bovenaan weergegeven, inclusief de complete lijst met actieve deelnemers.

### Overzicht van Autoritten
Maak de logistiek rondom vervoer inzichtelijk en flexibel:
* **Ritten aanmaken:** Chauffeurs kunnen een autorit aanmaken en hierbij de vertrektijd en vertreklocatie opgeven.
* **Meereizen:** Andere gebruikers van de app kunnen zich vervolgens eenvoudig aanmelden om met een specifieke rit mee te rijden.
* **Flexibiliteit:** Geschikt voor zowel de heen- en terugreis als voor kortere ritten tussendoor (bijvoorbeeld de rit naar een restaurant).

### Overzicht van Etentjes
Samen eten zonder organisatorische rompslomp:
* Gebruikers kunnen zelf een eetplanning of restaurantbezoek aanmaken.
* Andere groepsleden kunnen zich flexibel aanmelden, zodat het exacte aantal gasten altijd direct bekend is.

### Overzicht van Hotelkamers
Houd overzicht over de verblijfslocaties met oog op privacy:
* **Kamernummers:** Administrators of gebruikers kunnen hun kamernummer invoeren, zodat je snel de kamer van een vriend kunt opzoeken.
* **Privacy-focused:** De app registreert enkel het kamernummer; er worden *geen* specifieke hoteladressen of privacygevoelige gegevens in opgeslagen.

### Overzicht van Events
Een centrale planning in de vorm van een interactieve kalender:
* Toont overzichtelijk alle aankomende evenementen en activiteiten.
* Per event is direct zichtbaar welke deelnemers aanwezig zijn en wat de exacte data zijn.
* Geeft duidelijk aan of er voor een specifiek evenement ook een overnachting is gepland.

### Profiel customisation
De mogelijkheid voor een gebruiker om diens profiel helemaal zo in te stellen zoals ze dat willen.
* Banners
* Profielfoto's
* Displaynames
* Badges
* En nog veel meer!


---

## Roadmap & Toekomstige Features

> [!NOTE]
> ### Overzicht van Betalingen
> Deze feature moet momenteel nog verder worden uitgewerkt en functioneel worden ingericht binnen de applicatie.
> 
> * [ ] Logica voor kostenverdeling opzetten
> * [ ] Status van betalingen per deelnemer inzichtelijk maken
> * [ ] Automatisch bijhouden van betalingen
> ### 



# Installatieinstructies

### Backend

1. Installeer de vereiste Python-versie (bijvoorbeeld 3.10).
2. Maak een virtuele omgeving aan:
   ```bash
   cd backend
   python -m venv venv
   ```
3. Activeer de virtuele omgeving:
   - Op Windows:
     ```bash
     venv\Scripts\activate
     ```
   - Op macOS/Linux:
     ```bash
     source venv/bin/activate
     ```
4. Installeer de vereiste pakketten:
   ```bash
    pip install -r requirements.txt
   ```
5. Maak een `.env`-bestand aan in de `backend`-map en vul het met de vereiste omgevingsvariabelen.
   -APP_URL
   -CORS_ORIGINS
   -SUPABASE_URL
   -SUPABASE_SECRET_KEY
6. Start de backend-server:

   ```bash
   cd backend
   uvicorn main:app --reload
   ```

   of

   ```bash
   cd backend
    ..\\venv\\Scripts\\uvicorn.exe main:app --reload
   ```

7. De backend is nu toegankelijk op `http://localhost:8000`.

### Frontend

1. Installeer Node.js (bijvoorbeeld versie 18).
2. Installeer de vereiste pakketten:
   ```bash
   cd frontend
   npm install
   ```
3. Maak een `.env`-bestand aan in de `frontend`-map en vul het met de vereiste omgevingsvariabelen.
   -VITE_SUPABASE_URL
   -VITE_SUPABASE_PUBLISHABLE_KEY

4. Start de frontend-server:
   ```bash
   npm run dev
   ```
5. De frontend is nu toegankelijk op `http://localhost:5173`.
