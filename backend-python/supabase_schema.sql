-- =============================================================================
-- PERSONAL AI GROWTH OS — SUPABASE POSTGRESQL SCHEMA (100% FREE TIER COMPLIANT)
-- =============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Users Table (Profile linked to Supabase Auth or Standalone JWT)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Speaking Practice Sessions Table
CREATE TABLE IF NOT EXISTS public.speaking_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    topic TEXT NOT NULL,
    session_type TEXT DEFAULT 'conversation', -- 'conversation' | 'free_speaking' | 'reading'
    transcript TEXT,
    duration_seconds INTEGER DEFAULT 0,
    word_count INTEGER DEFAULT 0,
    wpm INTEGER DEFAULT 0,
    overall_score NUMERIC(3, 1) DEFAULT 0.0,
    fluency_score NUMERIC(3, 1) DEFAULT 0.0,
    cefr_level TEXT DEFAULT 'B1', -- 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'
    evaluation JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Activity Logs (Powers 365-day GitHub-style Growth Heatmap)
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL, -- 'speaking', 'news_read', 'cv_edit', 'roadmap_task'
    activity_date DATE DEFAULT CURRENT_DATE NOT NULL,
    duration_minutes INTEGER DEFAULT 5,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Daily Goals Checklist Table
CREATE TABLE IF NOT EXISTS public.daily_goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    goal_key TEXT NOT NULL,
    goal_date DATE DEFAULT CURRENT_DATE NOT NULL,
    is_completed BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, goal_key, goal_date)
);

-- 6. Resumes / CV Documents Table
CREATE TABLE IF NOT EXISTS public.user_resumes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT DEFAULT 'My Resume',
    template TEXT DEFAULT 'modern', -- 'modern' | 'minimal' | 'executive'
    cv_data JSONB NOT NULL,
    ats_score INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Row Level Security (RLS) Policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.speaking_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_resumes ENABLE ROW LEVEL SECURITY;

-- Allow users to manage only their own data
CREATE POLICY "Users can manage their own profile" ON public.profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "Users can manage their speaking sessions" ON public.speaking_sessions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their activity logs" ON public.activity_logs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their daily goals" ON public.daily_goals FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their resumes" ON public.user_resumes FOR ALL USING (auth.uid() = user_id);
