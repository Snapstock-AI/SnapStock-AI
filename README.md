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
npm run migration
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

### Database migrations

Schema changes live in `server/migrations/` as numbered TypeScript files, for example `001-seed-dummy.ts`.

Each file must export an `up(client)` function:

```ts
import type { PoolClient } from "pg";

export async function up(client: PoolClient): Promise<void> {
  await client.query("...");
}
```

After `git pull`, if new migration files were added, `npm run dev` will fail until you apply them:

```bash
cd server
npm run migration
```

This keeps every developer on the same database schema.



### Models use in a file

1. Install dependencies:
```ts
pip install huggingface_hub tensorflow
```
2. Create a new Python file (e.g. test_model.py)

3. Import the loader function:

```ts
from download_model import load_model
```

4. Load the model:

```ts
cnn_model = load_model("cnn")
mobilenet_model = load_model("mobilenet")
```

5. Run predictions using TensorFlow:

```ts
prediction = cnn_model.predict(input_data)
```
