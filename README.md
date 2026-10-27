# Tactica

Tactica is an interactive football match experience built to help fans understand more than just the score. Choose two clubs, follow a simulated match as it unfolds on a live pitch, and get concise, AI-generated explanations of the tactical story behind key moments. Match statistics, lineups, event updates, and momentum indicators make it easier to see how a game is developing.

## Project Context

This project was developed as part of Microsoft's **Inside the Game: Developer Hackathon**. A live demo of the app is accessible through the following link: https://icy-flower-07d3e1b0f.5.azurestaticapps.net

## Features

- Choose the home and away clubs for a simulated match.
- Follow player movement, match events, the scoreboard, and team lineups as the match progresses.
- Track match statistics, control, and momentum over time.
- Get AI-generated, evidence-grounded commentary for significant moments and an AI-generated post-match recap.
- Personalize language, commentary persona, favorite club, and favorite player.

## Tech stack

- **Frontend:** React, TypeScript, Vite, Tailwind CSS
- **Backend:** Python, FastAPI, SQLAlchemy (async)
- **Database:** PostgreSQL
- **AI:** Microsoft Agent Framework with an OpenAI-compatible chat model
- **Cloud integrations:** Azure Communication Services for email and Azure Blob Storage for avatars
- **Containers:** Docker for the backend

## Prerequisites

- Python 3.12
- Node.js 22 or newer and npm
- PostgreSQL with the Tactica schema and team/player data available
- An OpenAI-compatible API key for AI commentary and recaps
- Docker Desktop or Docker Engine if using the container instructions

The repository does not include a PostgreSQL service or Docker Compose setup. Configure `DATABASE_URL` to point to a PostgreSQL database that is reachable from the backend. The backend seed script drops and recreates the teams and players tables; do not run it against a database containing data you need to keep.

## Configuration

Copy the backend environment template and edit `backend/.env`:

```powershell
Copy-Item backend\.env.template backend\.env
```

Set at least:

```env
DATABASE_URL=postgresql://<user>:<password>@<host>:5432/<database>
FRONTEND_URL=http://localhost:5173
OPENAI_API_KEY=<your-api-key>
```

The backend accepts `postgresql://` and configures the async PostgreSQL driver. Set `OPENAI_CHAT_MODEL` (or `OPENAI_MODEL`) if you want to use a model other than the configured default. Azure email and avatar functionality also needs the corresponding Azure variables in `backend/.env`.

Keep secrets in local environment files or a secret manager; do not commit them. For local development, use a development database rather than a production database.

## Run without Docker

Open two terminals from the repository root.

### Backend

Create and activate a virtual environment, then install the backend dependencies:

```powershell
cd backend
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

On macOS or Linux, activate it with `source .venv/bin/activate` instead.

Start the API:

```powershell
uvicorn server:app --reload --host localhost --port 8080
```

The health endpoint is available at `http://localhost:8080/health`.

### Frontend

In the second terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open the Vite URL shown in the terminal (by default, `http://localhost:5173`). The frontend proxies `/api` requests and live match streams to `http://localhost:8080`. To use another backend address, set `VITE_API_PROXY_TARGET` in the frontend environment.

## Run the backend with Docker

The backend Dockerfile packages the API. Run the frontend separately using the non-Docker instructions above. You still need a configured PostgreSQL database with the Tactica schema and data.

Build the image from the repository root:

```powershell
docker build -t tactica-backend .\backend
```

Ensure `backend/.env` has the settings described above, then start the container:

```powershell
docker run --rm --name tactica-backend --env-file backend/.env -p 8080:8080 tactica-backend
```

If PostgreSQL is running on the host machine, use `host.docker.internal` instead of `localhost` in `DATABASE_URL` so the backend container can reach it. If the database is hosted elsewhere, use its normal reachable hostname.

With the backend container running, start the frontend normally from `frontend/`:

```powershell
npm run dev
```

Open `http://localhost:5173`. Keep `FRONTEND_URL=http://localhost:5173` in `backend/.env`; this is the browser origin used for local CORS and live-stream checks.

## Authors

- Antonios Michailos
- Michail Papageorgiou
