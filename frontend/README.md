# Welcome to AeroRead

## Project info

**URL**: https://aeroread.vercel.app

## How can I edit this code?

There are several ways of editing your application.

**Use the Aero Engine**

Simply visit the AeroRead interface and start reading. 

Changes made to the text processor or engine logic will be reflected across all narrative data streams.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes.

The requirement is having Node.js & npm installed for the frontend, and Python 3.10+ for the backend.

Follow these steps:

```sh
# Step 1: Clone the repository.
git clone <YOUR_GIT_URL>

# Step 2: Setup the Frontend.
cd frontend
npm i
npm run dev

# Step 3: Setup the Backend (in a second terminal).
cd ../backend
pip install -r requirements.txt
echo "MONGO_URL=<your MongoDB connection string>" > .env
python main.py   # serves the API on http://127.0.0.1:8000/api
```

The dev frontend talks to the API at `http://127.0.0.1:8000/api`.

**Configuration**

| Variable | Where | Purpose |
|---|---|---|
| `MONGO_URL` | backend | MongoDB connection string (required) |
| `ALLOWED_ORIGINS` | backend | Comma-separated CORS origins; defaults to the production site plus `localhost:8080` / `127.0.0.1:8080` |

For the Sonic Module (Spotify), register both `http://127.0.0.1:8080/` and your production URL as redirect URIs in the Spotify app dashboard.

**Checks**

```sh
# Frontend
cd frontend
npm run lint
npm test
npm run build      # type-checks, then builds

# Backend
cd backend
pip install -r requirements-dev.txt
pytest
```

## How books are stored

- EPUB and PDF files are split into chapters in the browser, then uploaded as gzipped JSON to `POST /api/archive/stories`. Each chapter is a separate MongoDB document, so long books never hit MongoDB's 16 MB document limit.
- TXT files stay in the browser (IndexedDB) and never touch the server.
- Reading progress is kept locally and synced to the server for cloud books.
