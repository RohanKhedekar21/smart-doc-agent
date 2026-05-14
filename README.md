# Smart Document Agent

A full-stack AI-powered document analysis and Q&A application. Upload PDFs, TXTs, or CSVs and ask questions about their content using Google's Gemini AI.

## Tech Stack

| Layer     | Technology                     |
| --------- | ------------------------------ |
| Frontend  | React 18, Vite, Tailwind CSS 4 |
| Backend   | Python 3.14, FastAPI, SQLAlchemy |
| AI Engine | Google Gemini (google-genai SDK) |
| Database  | SQLite (sessions & metadata)   |
| Vector DB | Custom pure-Python cosine search |

## Project Structure

```
File Reader Agent/
├── backend/
│   ├── app/
│   │   ├── api/          # FastAPI route handlers
│   │   ├── db/           # SQLAlchemy database models & connection
│   │   ├── models/       # Pydantic request/response schemas
│   │   └── services/     # Document parsing & RAG AI logic
│   ├── .env              # Environment variables (GEMINI_API_KEY)
│   ├── requirements.txt  # Python dependencies
│   └── run.py            # Backend entry point
├── frontend/
│   ├── src/
│   │   ├── components/   # React UI components
│   │   └── services/     # API client (axios)
│   ├── index.html
│   └── package.json
├── setup.bat             # One-click first-time setup
├── start.bat             # One-click launch both servers
└── README.md
```

## Prerequisites

- **Python 3.12+** (tested on 3.14)
- **Node.js 18+** and npm
- A **Google Gemini API Key** — get one free at [Google AI Studio](https://aistudio.google.com/apikey)

## Quick Start

### 1. Clone & Setup (first time only)

```bash
# Option A: Run the setup script (Windows)
setup.bat

# Option B: Manual setup
# Backend
cd backend
python -m venv venv
.\venv\Scripts\activate      # Windows
pip install -r requirements.txt

# Frontend
cd ../frontend
npm install
```

### 2. Configure your API Key

Edit `backend/.env` and replace the placeholder:

```env
GEMINI_API_KEY=your_actual_gemini_api_key_here
```

### 3. Launch the Application

```bash
# Option A: Run the start script (Windows) — launches both servers
start.bat

# Option B: Manual start (two terminals)

# Terminal 1 — Backend
cd backend
.\venv\Scripts\activate
python run.py
# Runs on http://127.0.0.1:8000

# Terminal 2 — Frontend
cd frontend
npm run dev
# Runs on http://localhost:5173
```

### 4. Use It

1. Open **http://localhost:5173** in your browser
2. Click **"+ New Chat"** to create a workspace
3. Click the **Upload Document** zone and select a PDF, TXT, or CSV
4. Once processed, type a question in the chat input — the AI will answer based on your document!

## API Documentation

Once the backend is running, visit **http://127.0.0.1:8000/docs** for the interactive Swagger UI with all available endpoints.

| Method | Endpoint                        | Description              |
| ------ | ------------------------------- | ------------------------ |
| GET    | `/api/v1/sessions`              | List all chat sessions   |
| POST   | `/api/v1/sessions`              | Create a new session     |
| POST   | `/api/v1/sessions/{id}/upload`  | Upload a document        |
| POST   | `/api/v1/sessions/{id}/chat`    | Ask a question           |

## License

MIT
