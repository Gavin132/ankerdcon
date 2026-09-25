# Documentation

Start with the page that matches what you are doing.

| I want to… | Read |
| --- | --- |
| understand how it all fits together | [architecture.md](architecture.md) |
| know what each part of the app does and where its code lives | [features.md](features.md) |
| install it from scratch: every `.env` value, Docker, Portainer | [installation.md](installation.md) |
| run it on my machine, run the tests | [local-development.md](local-development.md) |
| ship a change, run a migration, set env variables | [deployment.md](deployment.md) |
| look up a table or a migration | [database.md](database.md) |
| look up an endpoint | [api.md](api.md) |
| check who may do what, and how logins are protected | [security.md](security.md), [acting-for-others.md](acting-for-others.md) |
| work on the React app | [frontend.md](frontend.md), [design-system.md](design-system.md) |
| find out why something is slow, down or wrong | [operations.md](operations.md) |
| set up or repair the photo storage | [minio-setup.md](minio-setup.md) |

Also in the repository root: [`README.md`](../README.md) (overview),
[`CHANGELOG.md`](../CHANGELOG.md) (what changed per release),
[`TODO.md`](../TODO.md) (what is still to do) and
[`CLAUDE.md`](../CLAUDE.md) (notes for the AI assistant that works on this repo).

## Conventions in these docs

- The app's interface is Dutch, so screen and button names are given in Dutch
  (*Afrekenen*, *Voor jou*, *Foto's*). Everything else is English.
- File paths are relative to the repository root.
- "The backend" is the FastAPI app in `backend/`, "the frontend" is the React
  app in `frontend/`. In production they are one container.
- Commands are shown for PowerShell and bash where they differ.

## Keeping the docs true

Docs that describe code rot when the code moves. When you change one of these,
change its page in the same commit:

| Change | Update |
| --- | --- |
| a route or its permissions | [api.md](api.md) |
| a table or a new migration | [database.md](database.md), and [TODO.md](../TODO.md) if it must be run |
| an env variable | [local-development.md](local-development.md) and [deployment.md](deployment.md) |
| who may do what | [security.md](security.md) |
| a user-visible change | [CHANGELOG.md](../CHANGELOG.md) |
| a new colour, component pattern or font rule | [design-system.md](design-system.md) |
