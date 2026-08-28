# API Reference

The Smart Document Agent backend exposes a RESTful API powered by FastAPI.

**Base URL:** `http://localhost:8000/api/v1`

---

## Sessions

### `GET /sessions`
Retrieves a list of all chat sessions.
- **Response:** `200 OK`
  ```json
  [
    {
      "session_id": "uuid-string",
      "name": "Workspace Name"
    }
  ]
  ```

### `POST /sessions`
Creates a new, empty session.
- **Response:** `200 OK`
  ```json
  {
    "session_id": "uuid-string",
    "name": "New Workspace"
  }
  ```

### `PATCH /sessions/{session_id}`
Renames an existing session.
- **Path Parameters:** `session_id` (string)
- **Body:**
  ```json
  {
    "name": "New Name"
  }
  ```
- **Response:** `200 OK`

### `DELETE /sessions/{session_id}`
Deletes a session and cascades the deletion to all associated documents and messages.
- **Path Parameters:** `session_id` (string)
- **Response:** `200 OK` `{"detail": "Session deleted"}`

---

## Documents

### `GET /sessions/{session_id}/documents`
Retrieves a list of documents uploaded to a specific session.
- **Path Parameters:** `session_id` (string)
- **Response:** `200 OK`
  ```json
  [
    {
      "id": 1,
      "filename": "report.pdf",
      "session_id": "uuid-string"
    }
  ]
  ```

### `POST /sessions/{session_id}/documents`
Uploads a new document (PDF, TXT, CSV), parses it, chunks it, embeds it into the vector store, and generates an auto-summary.
- **Path Parameters:** `session_id` (string)
- **Body:** `multipart/form-data` (key: `file`)
- **Response:** `200 OK`
  ```json
  {
    "message": "File processed successfully",
    "filename": "report.pdf",
    "summary": "This document contains..."
  }
  ```

### `DELETE /sessions/{session_id}/documents/{document_id}`
Deletes a document from the database (Does not currently purge vectors).
- **Path Parameters:** `session_id` (string), `document_id` (int)
- **Response:** `200 OK` `{"detail": "Document deleted"}`

---

## Chat & AI

### `GET /sessions/{session_id}/messages`
Retrieves the persistent chat history for a session.
- **Path Parameters:** `session_id` (string)
- **Response:** `200 OK`
  ```json
  [
    {
      "id": 1,
      "text": "What is the total revenue?",
      "sender": "user",
      "session_id": "uuid-string"
    }
  ]
  ```

### `POST /sessions/{session_id}/chat`
Sends a message to the AI. Performs a semantic search across session documents and returns an augmented response.
- **Path Parameters:** `session_id` (string)
- **Body:**
  ```json
  {
    "message": "What is the total revenue?"
  }
  ```
- **Response:** `200 OK`
  ```json
  {
    "answer": "The total revenue is $5M.",
    "sources": ["report.pdf"]
  }
  ```

---

## Advanced Tools

### `POST /sessions/{session_id}/extract`
Uses Targeted Semantic Retrieval to extract structured data matching the query into a JSON table format.
- **Path Parameters:** `session_id` (string)
- **Body:**
  ```json
  {
    "message": "Extract all employee names and their salaries."
  }
  ```
- **Response:** `200 OK`
  ```json
  {
    "columns": ["Employee Name", "Salary"],
    "rows": [
      ["John Doe", "$120,000"],
      ["Jane Smith", "$135,000"]
    ],
    "sources": ["payroll.pdf"]
  }
  ```

### `POST /sessions/{session_id}/compare`
Performs a side-by-side AI comparison of two specific documents based on a user query. Automatically saves the report to the chat history.
- **Path Parameters:** `session_id` (string)
- **Body:**
  ```json
  {
    "doc1_filename": "contract_v1.pdf",
    "doc2_filename": "contract_v2.pdf",
    "query": "What changed in the payment terms?"
  }
  ```
- **Response:** `200 OK`
  ```json
  {
    "answer": "In Contract V1, payments are net 30. In V2, they are net 60.",
    "sources": ["contract_v1.pdf", "contract_v2.pdf"],
    "error": false
  }
  ```

---

## Health Check & Authentication

### `GET /health`
Returns the operational status of the API. Useful for container health checks.
- **Response:** `200 OK`
  ```json
  {
    "status": "healthy",
    "version": "1.0.0",
    "service": "Smart Document Agent API"
  }
  ```

### `GET /api/v1/auth/login`
Redirects the user to Google's OAuth consent screen for logging in.
- **Response:** `307 Temporary Redirect` (redirects to Google Login)

### `GET /api/v1/auth/callback`
OAuth callback handler. Google redirects back to this endpoint with authorization code.
Upon validation, redirects user back to the frontend with the `token` appended as a query parameter (e.g. `/?token=ey...`). The frontend securely stores this JWT in `localStorage` and includes it in the `Authorization: Bearer <token>` header of all subsequent API requests.
- **Response:** `307 Temporary Redirect`

### `GET /api/v1/auth/me`
Retrieves the profile of the currently logged-in user by validating the JWT token.
- **Response:** `200 OK`
  ```json
  {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe",
    "picture": "https://lh3.googleusercontent.com/..."
  }
  ```

### `POST /api/v1/auth/logout`
Logs the user out. The frontend clears the JWT from `localStorage`. The backend explicitly clears any legacy `access_token` cookies.
- **Response:** `200 OK` `{"detail": "Logged out"}`
