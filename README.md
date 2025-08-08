IELTS Speaking Coach (FastAPI + React)

Prerequisites
- Python 3.10+
- Node.js 18+

Backend setup
1) Copy env and choose provider
   cp .env.example .env
   # Edit .env
   # APP_ENV=local uses Gemini API key via GOOGLE_API_KEY
   # APP_ENV=prod uses Vertex AI with GCP_PROJECT_ID and GOOGLE_APPLICATION_CREDENTIALS

2) Create venv and install
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -r backend/requirements.txt

3) Run backend
   uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000

Frontend setup
1) Create app (already scaffolded) and install
   cd frontend
   npm install

2) Dev server
   npm run dev

Open http://localhost:5173 and start practicing. The app records your answer, sends audio to the backend, and returns transcript and feedback. In local dev the browser will speak feedback using Web Speech; in production you can switch to server-side TTS.

Production (Vertex AI)
- Set APP_ENV=prod, GCP_PROJECT_ID, GCP_LOCATION
- Ensure GOOGLE_APPLICATION_CREDENTIALS points to a service account JSON with Vertex AI access

Notes
- Supported audio: webm/opus (Chrome), mp3, m4a, wav
- Default model: gemini-1.5-pro