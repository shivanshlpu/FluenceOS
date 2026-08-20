# 🚀 Personal AI Growth OS — Complete Supabase & GitHub Deployment Guide (100% Free)

This guide walks you through deploying the **Personal AI Growth OS** completely for **$0 / month** using:
- **Supabase** for PostgreSQL Database & Authentication (Free Tier: 500MB DB, 50,000 MAU)
- **GitHub Pages / Vercel** for React Frontend Hosting (Free Tier: Unlimited bandwidth, Free SSL)
- **Render / Railway / HuggingFace Spaces** for FastAPI Python Backend (Free Tier)
- **DataCube AI API & Web Speech API** for News and Voice (100% Free Public APIs, No keys needed)

---

## 🌟 Part 1: Setup Supabase Database (5 Minutes)

1. Go to [supabase.com](https://supabase.com) and click **"Start your project"** (Sign in with GitHub).
2. Click **"New Project"**:
   - **Name**: `ai-growth-os`
   - **Database Password**: Choose a strong password.
   - **Region**: Choose the closest region to you.
   - **Pricing Plan**: **Free Plan ($0.00)**.
3. Once the database is provisioned (1-2 minutes):
   - Go to the **SQL Editor** tab (left sidebar icon `>_`).
   - Click **"New query"**.
   - Copy and paste the contents of `backend-python/supabase_schema.sql` into the editor.
   - Click **"Run"** to create all tables (`profiles`, `speaking_sessions`, `activity_logs`, `daily_goals`, `user_resumes`) and Row-Level Security policies.
4. Get your API credentials:
   - Go to **Project Settings** (gear icon ⚙️) -> **API**.
   - Copy the **Project URL** (e.g. `https://xyzcompany.supabase.co`).
   - Copy the **`anon` `public` key**.

---

## 🌐 Part 2: Deploy Frontend to GitHub Pages or Vercel

### Option A: GitHub Pages (Via GitHub Actions)
1. Initialize Git in your project root (if not already done):
   ```bash
   git init
   git add .
   git commit -m "feat: complete Personal AI Growth OS with DataCube news, voice coach, tracker, and CV maker"
   ```
2. Create a new repository on [github.com](https://github.com/new) (e.g., `ai-growth-os`).
3. Link and push to GitHub:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/ai-growth-os.git
   git branch -M main
   git push -u origin main
   ```
4. Enable GitHub Pages:
   - In your GitHub repo, go to **Settings** -> **Pages**.
   - Under **Build and deployment** -> **Source**, select **"GitHub Actions"**.
   - The included `.github/workflows/deploy.yml` workflow will automatically run, build your Vite app, and publish it!
5. In your repo's **Settings** -> **Secrets and variables** -> **Actions**, add:
   - `VITE_PYTHON_API_URL`: Your backend API URL (e.g., `https://your-backend.onrender.com` or local URL)
   - `VITE_SUPABASE_URL`: Your Supabase Project URL
   - `VITE_SUPABASE_ANON_KEY`: Your Supabase Anon Key

---

### Option B: Vercel (1-Click Easiest Frontend Hosting)
1. Go to [vercel.com](https://vercel.com) and sign in with GitHub.
2. Click **"Add New..."** -> **"Project"**.
3. Select your `ai-growth-os` repository.
4. In the configuration:
   - **Root Directory**: Select `frontend`
   - **Framework Preset**: `Vite`
   - **Environment Variables**:
     - `VITE_PYTHON_API_URL` = `https://your-backend-api.com`
     - `VITE_SUPABASE_URL` = `https://your-project.supabase.co`
     - `VITE_SUPABASE_ANON_KEY` = `your_anon_key`
5. Click **"Deploy"** — Your frontend will be live in 30 seconds with a free `.vercel.app` domain!

---

## 🐍 Part 3: Deploy FastAPI Backend (Free Tier Options)

### Option 1: Render.com (Recommended Free Web Service)
1. Go to [render.com](https://render.com) and create a free account.
2. Click **"New +"** -> **"Web Service"** -> Connect your GitHub repository.
3. Configure settings:
   - **Root Directory**: `backend-python`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Instance Type**: **Free**
4. Under **Environment Variables**, add:
   - `GROQ_API_KEY`: Your free Groq API key (from [console.groq.com](https://console.groq.com))
   - `GEMINI_API_KEY`: Your free Google Gemini key (from [aistudio.google.com](https://aistudio.google.com))
   - `JWT_SECRET`: Any random 32-character string
   - `MONGODB_URL` or Supabase Postgres connection string.
5. Click **"Create Web Service"**.

---

## 🛠️ Summary of 100% Free APIs & Keys Used

| Feature | Free Provider | Free Tier Limits | API Key Required? |
| :--- | :--- | :--- | :--- |
| **Daily AI News** | [DataCube AI](https://www.datacubeai.space/en/tools/ai-news-api) | Unlimited Public Endpoints | ❌ **No Key Required** |
| **Voice STT & TTS** | Browser Web Speech API | Unlimited Minutes | ❌ **No Key Required** |
| **AI LLM Engine** | Groq (`llama-3.3-70b`) | 30 RPM, 14.4k Requests/Day | Free Key ([console.groq.com](https://console.groq.com)) |
| **AI Fallback** | Google Gemini 1.5/2.0 Flash | 15 RPM, 1 Million TPM | Free Key ([aistudio.google.com](https://aistudio.google.com)) |
| **Database & Auth** | Supabase Free Plan | 500MB DB, 50k Users | Free Key ([supabase.com](https://supabase.com)) |
| **CV PDF Export** | Client-side Print Engine | Unlimited Vector PDFs | ❌ **No Key Required** |
| **Frontend Hosting**| GitHub Pages / Vercel | Unlimited Traffic & SSL | ❌ **No Key Required** |
