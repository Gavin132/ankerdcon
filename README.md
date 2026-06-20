# Installatieinstructies

### Backend

1. Installeer de vereiste Python-versie (bijvoorbeeld 3.10).
2. Maak een virtuele omgeving aan:
   ```bash
   python -m venv venv
   ```
3. Activeer de virtuele omgeving:
   - Op Windows:
     ```bash
     cd backend
     venv\Scripts\activate
     ```
   - Op macOS/Linux:
     ```bash
     cd backend
     source venv/bin/activate
     ```
4. Installeer de vereiste pakketten:
   ```bash
    pip install -r requirements.txt
   ```
5. Maak een `.env`-bestand aan in de `backend`-map en vul het met de vereiste omgevingsvariabelen (zoals `GOOGLE_SHEET_ID`, `APP_PASSPHRASE`, `JWT_SECRET_KEY`, en `DISCORD_WEBHOOK_URL`). Deze heb ik via de e-mail gedeeld!
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
3. Start de frontend-server:
   ```bash
   npm run dev
   ```
4. De frontend is nu toegankelijk op `http://localhost:5173`.
