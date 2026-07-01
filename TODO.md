# TODO — Pre-hosting checklist

## Backend environment variables

### `SUPABASE_JWT_SECRET` (verplicht voor auth)

De backend verifieert JWTs nu lokaal via `python-jose` i.p.v. een HTTP-call naar Supabase.
Dit vereist de JWT signing secret uit je Supabase project.

**Waar te vinden:**
Supabase Dashboard → Settings → API → JWT Settings → **JWT Secret**

> Let op: dit is NIET de `anon` key of `service_role` key — het is een aparte waarde.

**Toevoegen aan `backend/.env`:**

```
SUPABASE_JWT_SECRET=<jouw JWT secret hier>
```

Zonder deze variabele geeft elke API request een 401.

### Discord bot token

De backend gebruikt een Discord bot om bepaalde acties uit te voeren. Hiervoor is een bot token nodig.

> Vergeet deze niet te configureren in Portainer, anders werkt de bot niet.
