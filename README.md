# Smart Document Agent

A full-stack AI-powered document analysis and Q&A workspace. Upload PDFs, TXTs, CSVs, DOCXs, or XLSXs and ask questions about their content using Google's Gemini AI.

## Tech Stack

| Layer     | Technology                     |
| --------- | ------------------------------ |
| Frontend  | React 18, Vite, Tailwind CSS 4 |
| Backend   | Python 3.12+, FastAPI, SQLAlchemy |
| AI Engine | Google Gemini (google-genai SDK) |
| Database  | PostgreSQL                     |
| Vector DB | PostgreSQL (pgvector extension) |

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

## Documentation

For an in-depth look at how Smart Document Agent works, please refer to our comprehensive documentation suite:

- 🏗️ **[Architecture & Design](docs/ARCHITECTURE.md):** Tech stack, database schema, and how the Targeted Semantic Retrieval (RAG) pipeline is built.
- 📖 **[API Reference](docs/API_REFERENCE.md):** Detailed endpoints, request/response schemas for the FastAPI backend.
- 💡 **[User Guide](docs/USER_GUIDE.md):** How to use the frontend features, including Data Extraction and Document Comparison.
- 🚀 **[Feature Highlights](FEATURE_HIGHLIGHTS.md):** A pitch guide detailing the primary benefits and advanced AI integrations.

Alternatively, once the backend is running, you can visit **http://127.0.0.1:8000/docs** for the interactive Swagger UI.

## License

Proprietary. Copyright (c) 2026 Rohan Khedekar. All rights reserved.
