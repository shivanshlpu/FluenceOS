# 🧠 FluenceOS — All-in-One Personal AI Growth & Career OS

> **Master Spoken English • Stay Ahead in AI • Track Daily Growth • Build ATS-Winning Resumes**  
> *100% Free Public APIs & Free Tier Architecture (Zero Subscriptions Required)*

---

## 🌟 What is FluenceOS?

**FluenceOS** is a personal development platform built for developers, students, and professionals to accelerate communication, daily knowledge, habit consistency, and career readiness.

### 🚀 Core Pillars

1. **🎤 AI Spoken English Coach & Conversation Partner**:
   - 2-way real-time voice conversations (Tech Interview Prep, Casual Daily Chit-Chat, IELTS/TOEFL Prep, Salary Negotiations).
   - Powered by browser-native **Web Speech API** (`SpeechRecognition` & `SpeechSynthesis`) for **zero audio API fees** and instant responses.
   - Real-time speech metrics: Speech speed (**WPM**), **Filler word counter** (`um`, `uh`, `like`), **CEFR Level grading** (`A1` to `C2`), and native speaker phrasing suggestions.
   - Reading aloud & phonetic pronunciation drills.

2. **📰 Daily AI News & Intelligence (DataCube AI API)**:
   - Programmatic integration with the [DataCube AI Free REST API](https://www.datacubeai.space/en/tools/ai-news-api#endpoints).
   - Daily curated feeds: **AI Tech & Research**, **Startups & Venture Funding**, **Practical AI Prompts & Tips**, **Video Summaries**, and **Trending Topics**.
   - Multi-language support (English, German, French, Spanish, Chinese, Japanese) with date/period archive selector.

3. **🔥 Personal Growth & Habit Tracker OS**:
   - Daily streak counter (🔥 Current streak & ⚡ Personal best).
   - **365-day GitHub-style Activity Heatmap** visualizing practice consistency.
   - Daily target goals checklist with real-time completion rings.
   - Skill progression radar & unlockable milestone achievement badges.

4. **📄 AI-Powered CV & Resume Maker (100% Free)**:
   - Interactive builder with live side-by-side real-time preview.
   - **✨ AI Bullet Point Enhancer**: Rewrites raw bullet points into action-driven, quantifiable **STAR** (Situation-Task-Action-Result) accomplishments.
   - **🎯 ATS Match Scanner**: Compares your resume against any job description to compute match %, matched skills, and missing keywords.
   - 3 professional templates (*Modern Tech*, *Minimal ATS Classic*, *Executive*).
   - 1-click vector PDF export with print stylesheet (zero watermarks, zero server costs).

5. **📱 100% Mobile & Tablet Compatible**:
   - Mobile-first responsive navigation bar.
   - Adaptive touch-friendly layout with split-screen toggle on mobile screens.

---

## 💎 100% Free Tier Architecture

| Component | Free Technology | Limit / Cost |
| :--- | :--- | :--- |
| **AI News** | [DataCube AI API](https://www.datacubeai.space/en/tools/ai-news-api) | $0 / Free (No API Key required) |
| **Speech-to-Text** | Browser Web Speech API | $0 / Free (Unlimited minutes) |
| **Text-to-Speech** | Browser SpeechSynthesis API | $0 / Free (Unlimited voices) |
| **AI LLM Inference** | Groq (`llama-3.3-70b`) + Google Gemini 1.5 Flash | $0 / Free Tier |
| **Database & Auth** | Supabase (PostgreSQL) + MongoDB | $0 / Free Tier (500MB DB, 50k MAU) |
| **CV PDF Export** | Native Client-Side Print Engine (`@media print`) | $0 / Free |
| **Frontend Hosting**| GitHub Pages / Vercel | $0 / Free |

---

## 🛠️ Quick Local Setup

### 1. Python Backend
```bash
cd backend-python
python -m venv venv
# Windows:
.\venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```

### 2. React Frontend
```bash
cd frontend
npm install
npm run dev
```
Open **http://localhost:5173** in your browser or mobile browser on the same network!

---

## ☁️ Deployment Guides

For complete, step-by-step deployment instructions to **Supabase** (Database/Auth) and **GitHub Pages / Vercel** (Frontend), see [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md).
