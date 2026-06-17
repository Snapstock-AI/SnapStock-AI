## Getting Started

1. **Create your environment file:**
   - Copy `.env.example` to `.env` and update/add any required variables.

2. **Build and start the services:**
   ```bash
   docker compose up --build
   ```

3. **Service URLs:**

   - **Client (Frontend):** http://localhost:5173
   - **Server (Backend):** http://localhost:5000
   - **AI Service:** http://localhost:8000
   - **pgAdmin:** http://localhost:5050

Access each service at the above URLs once Docker Compose finishes starting all containers.
