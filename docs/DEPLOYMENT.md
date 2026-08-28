# Deployment Guide

This guide walks you through deploying the Smart Document Agent into a production environment using **Render** for the backend and **Vercel** for the frontend.

## Prerequisites

Before deploying, ensure you have:
- A [Render](https://render.com/) account.
- A [Vercel](https://vercel.com/) account.
- Your project pushed to a GitHub repository.
- A [Google Gemini API Key](https://aistudio.google.com/apikey).
- [Google OAuth Credentials](https://console.cloud.google.com/) (`GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`).

---

## 1. Deploy the Database (Render)

Smart Document Agent requires PostgreSQL with the `pgvector` extension. 

1. In your Render Dashboard, click **New > PostgreSQL**.
2. Name your database (e.g., `smart-agent-db`).
3. Select your preferred region and tier (Free tier is fine for testing, but `pgvector` may require a paid tier depending on Render's current offerings).
4. Click **Create Database**.
5. *Important:* Once the database is created, copy the **Internal Database URL** (for the backend service) and the **External Database URL** (if you need to inspect it locally).

---

## 2. Deploy the Backend (Render)

You can deploy the backend using Render's Web Service.

1. In your Render Dashboard, click **New > Web Service**.
2. Connect your GitHub repository.
3. Configure the service:
   - **Name:** `smart-agent-backend`
   - **Environment:** `Docker` (Render will automatically detect the `Dockerfile` in `backend/Dockerfile` if you specify the Root Directory, or you can use the Native Python environment).
   - **Root Directory:** `backend`
   - **Build Command:** (If not using Docker) `pip install -r requirements.txt`
   - **Start Command:** (If not using Docker) `uvicorn run:app --host 0.0.0.0 --port 10000`
4. Expand **Advanced** and add the following Environment Variables:

| Key | Value |
|---|---|
| `GEMINI_API_KEY` | Your Gemini API Key |
| `GOOGLE_CLIENT_ID` | Your Google OAuth Client ID |
| `GOOGLE_CLIENT_SECRET` | Your Google OAuth Client Secret |
| `DATABASE_URL` | The **Internal Database URL** from Step 1 |
| `JWT_SECRET` | A secure random 32-character hex string |
| `SESSION_SECRET` | A secure random 32-character hex string |
| `ENV` | `production` |
| `FRONTEND_URL` | The URL where you will deploy Vercel (e.g., `https://my-agent.vercel.app`) |
| `CORS_ORIGINS` | The URL where you will deploy Vercel (e.g., `https://my-agent.vercel.app`) |
| `GOOGLE_REDIRECT_URI` | `https://your-backend.onrender.com/api/v1/auth/callback` |

5. Click **Create Web Service**. 
6. Once deployed, note the backend URL (e.g., `https://smart-agent-backend.onrender.com`).

*Note:* Ensure you update your Google Cloud Console OAuth consent screen to allow the new `GOOGLE_REDIRECT_URI` and Authorized JavaScript origins.

---

## 3. Deploy the Frontend (Vercel)

Vercel is ideal for hosting the React/Vite frontend.

1. Go to your Vercel Dashboard and click **Add New > Project**.
2. Import your GitHub repository.
3. In the Configuration screen:
   - **Framework Preset:** Vite
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. Add the following Environment Variable:
   - `VITE_API_URL` = Your Render backend URL (e.g., `https://smart-agent-backend.onrender.com/api/v1`)
5. Click **Deploy**.

## 4. Final Verification

1. Open your Vercel frontend URL.
2. Ensure you can log in via Google successfully.
3. Create a workspace, upload a document, and verify that the chat responds correctly.
4. If you encounter CORS errors, verify that the `FRONTEND_URL` and `CORS_ORIGINS` environment variables in Render exactly match your Vercel URL (with no trailing slashes).
