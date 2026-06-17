## Getting Started

### 1. Environment

Copy `.env.example` to `.env` and adjust values if needed.

### 2. Infrastructure (Docker)

Start Postgres and pgAdmin only:

```bash
docker compose up -d
```

- **pgAdmin:** http://localhost:5050
- **Postgres:** `localhost:5432`

### 3. App services (local)

Run each service in its own terminal:

```bash
# AI service
cd ai-service
python -m venv .venv
.venv/Scripts/activate   # Windows
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Server
cd server
npm install
npm run dev

# Client
cd client
npm install
npm run dev
```

### Service URLs

| Service    | URL                    |
|------------|------------------------|
| Client     | http://localhost:5173  |
| Server     | http://localhost:5000  |
| AI service | http://localhost:8000  |
| pgAdmin    | http://localhost:5050  |
