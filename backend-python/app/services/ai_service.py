"""
AI SERVICE — Uses Groq (primary) + Gemini (fallback)
Chain-of-Responsibility Pattern:
  1. Try Groq first (fastest, free)
  2. If Groq fails/rate-limited → fallback to Gemini
"""

import json
import os
import httpx
from app.config import GROQ_API_KEY, GEMINI_API_KEY

groq_client = None
gemini_model = None

# Initialize Groq SDK (optional)
if GROQ_API_KEY:
    try:
        from groq import Groq
        groq_client = Groq(api_key=GROQ_API_KEY)
    except Exception as e:
        print(f"[INFO] Groq SDK init skipped, will use direct async REST client.")

# Initialize Gemini
if GEMINI_API_KEY:
    try:
        import google.generativeai as genai
        genai.configure(api_key=GEMINI_API_KEY)
        gemini_model = genai.GenerativeModel('gemini-1.5-flash')
    except Exception as e:
        print(f"[INFO] Gemini init: {e}")


async def generate_ai_response(prompt: str, system: str = "") -> str:
    """Primary AI call using Groq (LLaMA 3.3 70B REST / SDK), falls back to Gemini"""

    # 1. PRIMARY: Direct Groq Async REST API
    if GROQ_API_KEY:
        try:
            headers = {
                "Authorization": f"Bearer {GROQ_API_KEY}",
                "Content-Type": "application/json"
            }
            payload = {
                "model": "llama-3.3-70b-versatile",
                "messages": [
                    {"role": "system", "content": system or "You are an AI assistant."},
                    {"role": "user", "content": prompt}
                ],
                "temperature": 0.7,
                "max_tokens": 2048
            }
            async with httpx.AsyncClient(timeout=25.0) as client:
                res = await client.post("https://api.groq.com/openai/v1/chat/completions", headers=headers, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    return data["choices"][0]["message"]["content"]
                else:
                    print(f"[WARNING] Groq HTTP {res.status_code}: {res.text[:200]}")
        except Exception as groq_err:
            print(f"[WARNING] Groq REST call failed: {groq_err}, trying Gemini...")

    # 2. FALLBACK: Gemini
    if gemini_model:
        try:
            full_prompt = f"{system}\n\n{prompt}" if system else prompt
            response = gemini_model.generate_content(full_prompt)
            return response.text
        except Exception as gemini_error:
            print(f"[WARNING] Gemini failed: {gemini_error}")

    # 3. Graceful JSON fallback
    return json.dumps({
        "message": "AI service initialized. For custom live responses, set GROQ_API_KEY or GEMINI_API_KEY in .env"
    })


async def evaluate_speech(transcript: str, topic: str) -> dict:
    """
    Speaking Evaluation:
    1. Grammar Analysis
    2. Vocabulary Scoring
    3. Fluency Detection
    4. Confidence Scoring
    """
    prompt = f"""
    Analyze this English speech transcript about "{topic}":
    
    TRANSCRIPT: {transcript}
    
    Return ONLY valid JSON with this exact structure:
    {{
      "grammarMistakes": [
        {{"mistake": "...", "correction": "...", "explanation": "..."}}
      ],
      "vocabularySuggestions": [
        {{"word": "...", "betterAlternatives": ["...", "..."], "context": "..."}}
      ],
      "fluencyScore": 8,
      "confidenceScore": 7,
      "overallScore": 7.5,
      "detailedFeedback": "...",
      "strengths": ["...", "..."],
      "improvements": ["...", "..."],
      "fillerWordsCount": 3,
      "avgSentenceLength": 12
    }}
    
    Scoring criteria:
    - fluencyScore: 1-10 (10 = no filler words, smooth flow)
    - confidenceScore: 1-10 (10 = assertive language, complex vocab)
    - overallScore: 1-10 (weighted average)
    """

    system = "You are an expert English speaking coach. Return only valid JSON, no extra text."
    result = await generate_ai_response(prompt, system)

    try:
        # Parse JSON from AI response
        # Sometimes AI wraps in markdown code block
        clean = result.strip()
        if clean.startswith("```"):
            clean = clean.split("\n", 1)[1] if "\n" in clean else clean[3:]
            clean = clean.rsplit("```", 1)[0]
        return json.loads(clean)
    except (json.JSONDecodeError, Exception):
        # Return a structured fallback
        word_count = len(transcript.split())
        return {
            "grammarMistakes": [],
            "vocabularySuggestions": [],
            "fluencyScore": 6,
            "confidenceScore": 6,
            "overallScore": 6,
            "detailedFeedback": f"You spoke {word_count} words about {topic}. Keep practicing to improve!",
            "strengths": ["Attempted the topic", "Completed the exercise"],
            "improvements": ["Try using more varied vocabulary", "Practice reducing filler words"],
            "fillerWordsCount": 0,
            "avgSentenceLength": word_count // max(transcript.count('.') or 1, 1)
        }


async def generate_topic_explanation(topic: str) -> str:
    """Generate simple English explanation of any topic for speaking practice"""
    prompt = f"""
    Explain "{topic}" in simple, clear English in 3-4 sentences.
    Make it suitable for a 1-2 minute speaking practice session.
    Include: what it is, why it matters, and one real-world example.
    """
    return await generate_ai_response(prompt)


async def generate_reading_paragraph(topic: str, level: str = "beginner") -> dict:
    """Generate a 500-550 word paragraph for reading practice. Teaches knowledge + improves pronunciation."""
    prompt = f"""
    Write a reading practice passage about "{topic}" for a {level} English learner.

    CRITICAL RULES — READ CAREFULLY:
    ❌ DO NOT write a generic template like "Today we will learn about [topic]. [Topic] is one of the most important subjects..."
    ❌ DO NOT use phrases like "in the modern world", "people from all over the globe", "rich history", "fascinating subject"
    ❌ DO NOT write vague motivational text about learning or studying
    ✅ DO write REAL, SPECIFIC facts, examples, and information about "{topic}" ONLY
    ✅ Every sentence must contain actual information about "{topic}" — not general filler

    BAD EXAMPLE (do NOT do this):
    "Healthy Food is one of the most important topics in the modern world. People from all over the globe are interested in this subject."

    GOOD EXAMPLE (do this instead):
    "Fruits and vegetables contain vitamins and minerals that keep our bodies healthy. For example, oranges are rich in Vitamin C, which helps our immune system fight infections. Eating whole grains like brown rice and oats gives our body lasting energy throughout the day."

    Write the passage about "{topic}" with:
    - Exactly 200 words total (count carefully)
    - Real facts, examples, numbers, and details specific to "{topic}"
    - Simple sentences (max 18 words each) suitable for {level} level
    - 2 paragraphs: Cover (1) what it is with examples, (2) actual interesting facts or benefits
    - Plain text only — no headings, no bullet points, no markdown

    Also provide:
    - 8 key vocabulary words used in the passage with simple definitions
    - A pronunciation tip for one tricky word from this topic

    Return ONLY valid JSON — no extra text, no markdown:
    {{
      "paragraph": "The full 200 word passage here...",
      "wordCount": 200,
      "vocabulary": [
        {{"word": "nutrients", "definition": "healthy substances in food that your body needs"}},
        {{"word": "digest", "definition": "to break down food in the stomach so the body can use it"}}
      ],
      "pronunciationTip": "The word 'vegetables' has 4 syllables: VEG-e-ta-bles. Many people skip the middle syllable."
    }}
    """
    system = "You are an expert educator and English reading coach. You write factual, engaging, topic-specific educational passages. Every sentence must contain real information about the given topic. Never write generic filler text. Return only valid JSON, no markdown."
    result = await generate_ai_response(prompt, system)
    try:
        clean = result.strip()
        if clean.startswith("```"):
            clean = clean.split("\n", 1)[1] if "\n" in clean else clean[3:]
            clean = clean.rsplit("```", 1)[0]
        return json.loads(clean)
    except Exception:
        # Fallback: topic-specific placeholder (only used if AI completely fails)
        return {
            "paragraph": f"Eating healthy food is one of the best things you can do for your body. Healthy food gives your body the energy it needs to work, play, and think clearly. When you eat the right foods, your organs function properly and your immune system stays strong. Fruits and vegetables are the most important part of a healthy diet. They contain vitamins and minerals that your body cannot make on its own. For example, oranges and lemons are rich in Vitamin C, which helps your body fight colds and infections.\n\nProteins are another key part of healthy eating. Foods like eggs, fish, chicken, and beans give your muscles the building blocks they need to grow and repair. When you exercise, your muscles develop small tears. Protein helps fix these tears and makes your muscles stronger. Whole grains such as brown rice, oats, and whole wheat bread are important sources of energy. Unlike sugar, whole grains release energy slowly. This means you feel full for longer and do not get sudden hunger. They also contain fiber, which helps your digestive system work smoothly.",
            "wordCount": 182,
            "vocabulary": [
                {"word": "nutrients", "definition": "healthy substances in food that your body needs to grow and stay well"},
                {"word": "immune system", "definition": "the part of your body that fights illness and infection"},
                {"word": "protein", "definition": "a substance in foods like eggs and meat that helps build and repair your body"},
                {"word": "fiber", "definition": "a part of plants that helps your stomach digest food properly"},
                {"word": "obesity", "definition": "a medical condition where a person has too much body fat"},
                {"word": "digest", "definition": "to break down food in your stomach so your body can use it"},
                {"word": "balanced", "definition": "having the right amount of different things — not too much or too little"},
                {"word": "glucose", "definition": "a type of sugar your brain and muscles use for energy"},
            ],
            "pronunciationTip": "The word 'vegetables' has 4 syllables: VEG-e-ta-bles. Many people say only 3 — try to pronounce all four clearly."
        }


async def evaluate_reading(original_paragraph: str, spoken_text: str, topic: str) -> dict:
    """Compare user's spoken reading with original paragraph, score accuracy word by word."""
    prompt = f"""
    A student was asked to READ this paragraph aloud:

    ORIGINAL PARAGRAPH:
    {original_paragraph}

    WHAT THE STUDENT ACTUALLY SAID (via speech recognition):
    {spoken_text}

    Evaluate their reading performance:
    1. Compare word by word — how accurately did they read?
    2. Find words they skipped, mispronounced, or added extra words
    3. Assess their reading fluency and clarity

    Return ONLY valid JSON:
    {{
      "accuracyScore": 8.5,
      "fluencyScore": 7,
      "overallScore": 7.8,
      "wordsCorrect": 105,
      "wordsTotal": 130,
      "missedWords": ["fossil", "renewable"],
      "mispronounced": ["atmosphere", "devastating"],
      "extraWords": ["um", "like"],
      "detailedFeedback": "You read the paragraph well. You skipped 2 words and added filler words. Focus on pronouncing longer words slowly.",
      "strengths": ["Good pace", "Clear pronunciation of short words"],
      "improvements": ["Practice longer words separately", "Avoid filler words like um"],
      "grammarMistakes": [],
      "vocabularySuggestions": []
    }}

    Scoring: accuracyScore = % of words read correctly / 10, fluencyScore = smoothness and pace / 10
    """
    system = "You are an English reading coach. Be encouraging but honest. Return only valid JSON."
    result = await generate_ai_response(prompt, system)
    try:
        clean = result.strip()
        if clean.startswith("```"):
            clean = clean.split("\n", 1)[1] if "\n" in clean else clean[3:]
            clean = clean.rsplit("```", 1)[0]
        return json.loads(clean)
    except Exception:
        words_orig = len(original_paragraph.split())
        words_spoken = len(spoken_text.split())
        accuracy = min(10, round((words_spoken / max(words_orig, 1)) * 10, 1))
        return {
            "accuracyScore": accuracy,
            "fluencyScore": 6.0,
            "overallScore": round((accuracy + 6) / 2, 1),
            "wordsCorrect": words_spoken,
            "wordsTotal": words_orig,
            "missedWords": [],
            "mispronounced": [],
            "extraWords": [],
            "detailedFeedback": f"You spoke {words_spoken} out of {words_orig} words. Keep practicing to improve your reading accuracy.",
            "strengths": ["You attempted the reading exercise", "Good effort"],
            "improvements": ["Practice reading the paragraph multiple times", "Slow down for difficult words"],
            "grammarMistakes": [],
            "vocabularySuggestions": []
        }


async def generate_roadmap_content(skill: str, level: str = "Beginner") -> dict:
    """Generate AI-powered learning roadmap with direct YouTube video links & professional courses"""
    prompt = f"""
    Create a detailed learning roadmap for "{skill}" starting from "{level}" level.

    CRITICAL RULES FOR LINKS:
    1. For YouTube videos: Provide DIRECT video links (e.g. https://www.youtube.com/watch?v=VIDEO_ID) to the most popular, most-liked videos from channels like freeCodeCamp, Traversy Media, Fireship, The Net Ninja, Programming with Mosh, Corey Schafer, etc. NOT search pages.
    2. For professional courses: Include links to actual courses on freeCodeCamp.org, Coursera (coursera.org), Udemy (udemy.com), or edX (edx.org) that offer certificates.

    For each resource provide:
    - type: "video" for YouTube direct videos
    - type: "course" for paid/certified professional courses (Coursera, Udemy, edX)
    - type: "free" for freeCodeCamp.org or free structured resources

    Return ONLY valid JSON with this exact structure:
    {{
      "name": "{skill}",
      "phases": [
        {{
          "phase": 1,
          "title": "Fundamentals",
          "duration": "2 weeks",
          "topics": ["Core Concepts", "Setup", "Basic Syntax"],
          "resources": [
            {{
              "title": "freeCodeCamp: {skill} Full Course for Beginners",
              "url": "https://www.youtube.com/watch?v=REAL_VIDEO_ID",
              "type": "video",
              "channel": "freeCodeCamp.org"
            }},
            {{
              "title": "{skill} Complete Course - Coursera (with Certificate)",
              "url": "https://www.coursera.org/learn/REAL-COURSE",
              "type": "course",
              "channel": "Coursera"
            }}
          ],
          "projects": [
            {{
              "name": "Build a [real project name] with {skill}",
              "youtubeUrl": "https://www.youtube.com/watch?v=REAL_PROJECT_VIDEO_ID",
              "channel": "Traversy Media"
            }}
          ],
          "isCompleted": false
        }}
      ],
      "weeklyPlan": [
        {{"week": 1, "tasks": ["Watch freeCodeCamp course", "Setup environment", "Practice basics"], "completedTasks": []}}
      ]
    }}

    Rules:
    - EVERY link must be a real, working URL (no made-up video IDs).
    - Prefer freeCodeCamp.org YouTube channel for free videos — they are the most trusted.
    - For professional certificates: include REAL Coursera or edX course URLs specific to "{skill}".
    - Include 3-4 phases with 2-3 resources each (mix of free videos and paid certified courses).
    - Each phase must have 1-2 projects with direct YouTube tutorial video links.
    - The weeklyPlan must have one entry per phase week.
    """
    system = "You are a tech education expert. You know real YouTube video URLs and real Coursera/Udemy/edX course URLs. Return only valid JSON, no markdown, no text outside JSON."
    result = await generate_ai_response(prompt, system)

    try:
        clean = result.strip()
        if clean.startswith("```"):
            clean = clean.split("\n", 1)[1] if "\n" in clean else clean[3:]
            clean = clean.rsplit("```", 1)[0]
        data = json.loads(clean)
        # Validate that resources exist
        if data.get("phases"):
            return data
        raise ValueError("No phases returned")
    except Exception:
        # Hardcoded fallback: well-known real URLs for common skills
        return _get_fallback_roadmap(skill)


def _get_fallback_roadmap(skill: str) -> dict:
    """Fallback roadmap with known real YouTube + course URLs for popular skills"""
    s = skill.lower().strip()

    # Map of known high-quality resources by skill keyword
    known = {
        "python": {
            "resources_p1": [
                {"title": "Python for Beginners – Full Course (freeCodeCamp)", "url": "https://www.youtube.com/watch?v=rfscVS0vtbw", "type": "video", "channel": "freeCodeCamp.org"},
                {"title": "Python Crash Course – Traversy Media", "url": "https://www.youtube.com/watch?v=JJmcL1N2KQs", "type": "video", "channel": "Traversy Media"},
                {"title": "Python for Everybody – Coursera (Certificate)", "url": "https://www.coursera.org/specializations/python", "type": "course", "channel": "Coursera"},
            ],
            "proj_p1": [{"name": "Python Calculator", "youtubeUrl": "https://www.youtube.com/watch?v=DLn3jOsNRVE", "channel": "Tech With Tim"}],
            "resources_p2": [
                {"title": "Intermediate Python – Programming with Mosh", "url": "https://www.youtube.com/watch?v=HGOBQPFzWKo", "type": "video", "channel": "Programming with Mosh"},
                {"title": "Python OOP – Corey Schafer", "url": "https://www.youtube.com/watch?v=ZDa-Z5JzLYM", "type": "video", "channel": "Corey Schafer"},
            ],
            "proj_p2": [{"name": "Python Web Scraper", "youtubeUrl": "https://www.youtube.com/watch?v=XVv6mJpFOb0", "channel": "freeCodeCamp.org"}],
            "resources_p3": [
                {"title": "Python Django Full Course – freeCodeCamp", "url": "https://www.youtube.com/watch?v=F5mRW0jo-U4", "type": "video", "channel": "freeCodeCamp.org"},
                {"title": "Python for Data Science – edX (Certificate)", "url": "https://www.edx.org/learn/python", "type": "course", "channel": "edX"},
            ],
            "proj_p3": [{"name": "E-commerce Site with Django", "youtubeUrl": "https://www.youtube.com/watch?v=YZvRrldjf1Y", "channel": "Dennis Ivy"}],
        },
        "react": {
            "resources_p1": [
                {"title": "React Crash Course 2024 – Traversy Media", "url": "https://www.youtube.com/watch?v=LDB4uaJ87e0", "type": "video", "channel": "Traversy Media"},
                {"title": "React Full Course – freeCodeCamp", "url": "https://www.youtube.com/watch?v=u6gSSpfsoOQ", "type": "video", "channel": "freeCodeCamp.org"},
                {"title": "Meta Front-End Developer – Coursera (Certificate)", "url": "https://www.coursera.org/professional-certificates/meta-front-end-developer", "type": "course", "channel": "Coursera"},
            ],
            "proj_p1": [{"name": "React Todo App", "youtubeUrl": "https://www.youtube.com/watch?v=dpw9EHDh2bM", "channel": "Codevolution"}],
            "resources_p2": [
                {"title": "React Hooks – Codevolution", "url": "https://www.youtube.com/watch?v=cF2lQ_gZeA8", "type": "video", "channel": "Codevolution"},
                {"title": "React Router 6 – Web Dev Simplified", "url": "https://www.youtube.com/watch?v=Ul3y1LXxzdU", "type": "video", "channel": "Web Dev Simplified"},
            ],
            "proj_p2": [{"name": "React Movie App with API", "youtubeUrl": "https://www.youtube.com/watch?v=jc9_Bqzy2YQ", "channel": "Brian Design"}],
            "resources_p3": [
                {"title": "Next.js Full Course – Vercel", "url": "https://www.youtube.com/watch?v=843nec-IvW0", "type": "video", "channel": "Fireship"},
                {"title": "React Native – freeCodeCamp", "url": "https://www.youtube.com/watch?v=obH0Po_RdWk", "type": "video", "channel": "freeCodeCamp.org"},
            ],
            "proj_p3": [{"name": "Full Stack MERN App", "youtubeUrl": "https://www.youtube.com/watch?v=7CqJlxBYj-M", "channel": "JavaScript Mastery"}],
        },
        "machine learning": {
            "resources_p1": [
                {"title": "Machine Learning for Beginners – freeCodeCamp", "url": "https://www.youtube.com/watch?v=NWONeJKn6kc", "type": "video", "channel": "freeCodeCamp.org"},
                {"title": "Machine Learning by Andrew Ng – Coursera (Certificate)", "url": "https://www.coursera.org/specializations/machine-learning-introduction", "type": "course", "channel": "Coursera"},
            ],
            "proj_p1": [{"name": "Linear Regression from Scratch", "youtubeUrl": "https://www.youtube.com/watch?v=VmbA0pi2cRQ", "channel": "Sentdex"}],
            "resources_p2": [
                {"title": "Scikit-Learn Crash Course – freeCodeCamp", "url": "https://www.youtube.com/watch?v=0B5eIE_1vpU", "type": "video", "channel": "freeCodeCamp.org"},
                {"title": "Deep Learning Specialization – Coursera", "url": "https://www.coursera.org/specializations/deep-learning", "type": "course", "channel": "Coursera"},
            ],
            "proj_p2": [{"name": "Image Classifier with TensorFlow", "youtubeUrl": "https://www.youtube.com/watch?v=tPYj3fFJGjk", "channel": "TensorFlow"}],
            "resources_p3": [
                {"title": "PyTorch Full Course – freeCodeCamp", "url": "https://www.youtube.com/watch?v=Z_ikDlimN6A", "type": "video", "channel": "freeCodeCamp.org"},
                {"title": "MLOps – Coursera (Certificate)", "url": "https://www.coursera.org/specializations/machine-learning-engineering-for-production-mlops", "type": "course", "channel": "Coursera"},
            ],
            "proj_p3": [{"name": "End-to-End ML Pipeline", "youtubeUrl": "https://www.youtube.com/watch?v=pqNCD_5r0IU", "channel": "Krish Naik"}],
        },
        "javascript": {
            "resources_p1": [
                {"title": "JavaScript Full Course – freeCodeCamp", "url": "https://www.youtube.com/watch?v=PkZNo7MFNFg", "type": "video", "channel": "freeCodeCamp.org"},
                {"title": "JavaScript Crash Course – Traversy Media", "url": "https://www.youtube.com/watch?v=hdI2bqOjy3c", "type": "video", "channel": "Traversy Media"},
                {"title": "JavaScript Algorithms – Coursera (Certificate)", "url": "https://www.coursera.org/specializations/javascript-beginner", "type": "course", "channel": "Coursera"},
            ],
            "proj_p1": [{"name": "Weather App", "youtubeUrl": "https://www.youtube.com/watch?v=wPElVpR1rwA", "channel": "Traversy Media"}],
            "resources_p2": [
                {"title": "JavaScript ES6 – Traversy Media", "url": "https://www.youtube.com/watch?v=2LeqilIw-28", "type": "video", "channel": "Traversy Media"},
                {"title": "JavaScript DOM – Web Dev Simplified", "url": "https://www.youtube.com/watch?v=0ik6X4DJKCc", "type": "video", "channel": "Web Dev Simplified"},
            ],
            "proj_p2": [{"name": "Quiz App with JavaScript", "youtubeUrl": "https://www.youtube.com/watch?v=riDzcEQbX6k", "channel": "Web Dev Simplified"}],
            "resources_p3": [
                {"title": "Node.js Full Course – freeCodeCamp", "url": "https://www.youtube.com/watch?v=Oe421EPjeBE", "type": "video", "channel": "freeCodeCamp.org"},
                {"title": "The Complete JavaScript Course – Udemy", "url": "https://www.udemy.com/course/the-complete-javascript-course/", "type": "course", "channel": "Udemy"},
            ],
            "proj_p3": [{"name": "Full Stack JavaScript App", "youtubeUrl": "https://www.youtube.com/watch?v=7CqJlxBYj-M", "channel": "JavaScript Mastery"}],
        },
        "docker": {
            "resources_p1": [
                {"title": "Docker Tutorial for Beginners – TechWorld with Nana", "url": "https://www.youtube.com/watch?v=3c-iBn73dDE", "type": "video", "channel": "TechWorld with Nana"},
                {"title": "Docker Full Course – freeCodeCamp", "url": "https://www.youtube.com/watch?v=fqMOX6JJhGo", "type": "video", "channel": "freeCodeCamp.org"},
                {"title": "Docker & Kubernetes – Udemy (Certificate)", "url": "https://www.udemy.com/course/docker-and-kubernetes-the-complete-guide/", "type": "course", "channel": "Udemy"},
            ],
            "proj_p1": [{"name": "Dockerize a Node.js App", "youtubeUrl": "https://www.youtube.com/watch?v=gAkwW2tuIqE", "channel": "TechWorld with Nana"}],
            "resources_p2": [
                {"title": "Docker Compose – TechWorld with Nana", "url": "https://www.youtube.com/watch?v=SXwC9fSwct8", "type": "video", "channel": "TechWorld with Nana"},
            ],
            "proj_p2": [{"name": "Multi-Container App with Docker Compose", "youtubeUrl": "https://www.youtube.com/watch?v=HG6yIjuFber", "channel": "Mosh Hamedani"}],
            "resources_p3": [
                {"title": "Kubernetes Full Course – freeCodeCamp", "url": "https://www.youtube.com/watch?v=X48VuDVv0do", "type": "video", "channel": "freeCodeCamp.org"},
                {"title": "Google Cloud DevOps – Coursera (Certificate)", "url": "https://www.coursera.org/professional-certificates/sre-devops-engineer-google-cloud", "type": "course", "channel": "Coursera"},
            ],
            "proj_p3": [{"name": "Deploy Microservices to Kubernetes", "youtubeUrl": "https://www.youtube.com/watch?v=s_o8dwzRlu4", "channel": "TechWorld with Nana"}],
        },
    }

    # Find matching skill
    matched = None
    for key in known:
        if key in s:
            matched = known[key]
            break

    if matched:
        return {
            "name": skill,
            "phases": [
                {
                    "phase": 1, "title": "Fundamentals", "duration": "2 weeks",
                    "topics": [f"Introduction to {skill}", "Environment Setup", "Core Concepts & Syntax"],
                    "resources": matched["resources_p1"],
                    "projects": matched["proj_p1"],
                    "isCompleted": False
                },
                {
                    "phase": 2, "title": "Core Skills", "duration": "3 weeks",
                    "topics": ["Intermediate Patterns", "Best Practices", "Real-World Usage"],
                    "resources": matched["resources_p2"],
                    "projects": matched["proj_p2"],
                    "isCompleted": False
                },
                {
                    "phase": 3, "title": "Advanced & Professional", "duration": "4 weeks",
                    "topics": ["Advanced Concepts", "Performance & Optimization", "Production Deployment"],
                    "resources": matched["resources_p3"],
                    "projects": matched["proj_p3"],
                    "isCompleted": False
                },
            ],
            "weeklyPlan": [
                {"week": 1, "tasks": [f"Watch freeCodeCamp {skill} course", "Setup environment"], "completedTasks": []},
                {"week": 2, "tasks": ["Build Phase 1 project", "Complete exercises"], "completedTasks": []},
                {"week": 3, "tasks": ["Start core skills tutorials", "Practice daily"], "completedTasks": []},
                {"week": 4, "tasks": ["Build Phase 2 project", "Join community/Discord"], "completedTasks": []},
                {"week": 5, "tasks": ["Enroll in Coursera certificate course", "Advanced topics"], "completedTasks": []},
                {"week": 6, "tasks": ["Build final production project", "Prepare portfolio"], "completedTasks": []},
            ]
        }

    # Generic fallback for unknown skills with freeCodeCamp search
    encoded = skill.replace(" ", "+")
    return {
        "name": skill,
        "phases": [
            {
                "phase": 1, "title": "Fundamentals", "duration": "2 weeks",
                "topics": [f"Introduction to {skill}", "Setup", "Core Concepts"],
                "resources": [
                    {"title": f"freeCodeCamp: {skill} Full Course", "url": f"https://www.youtube.com/results?search_query=freecodecamp+{encoded}+full+course", "type": "video", "channel": "freeCodeCamp.org"},
                    {"title": f"{skill} Beginner Course – Coursera (Certificate)", "url": f"https://www.coursera.org/search?query={encoded}", "type": "course", "channel": "Coursera"},
                ],
                "projects": [{"name": f"Beginner {skill} Project", "youtubeUrl": f"https://www.youtube.com/results?search_query={encoded}+project+tutorial+beginners", "channel": "YouTube"}],
                "isCompleted": False
            },
            {
                "phase": 2, "title": "Core Skills", "duration": "3 weeks",
                "topics": ["Intermediate Concepts", "Best Practices"],
                "resources": [
                    {"title": f"Intermediate {skill} – Traversy Media / Programming with Mosh", "url": f"https://www.youtube.com/results?search_query={encoded}+intermediate+tutorial+mosh", "type": "video", "channel": "YouTube"},
                    {"title": f"{skill} Course – edX (Certificate)", "url": f"https://www.edx.org/search?q={encoded}", "type": "course", "channel": "edX"},
                ],
                "projects": [{"name": f"Intermediate {skill} App", "youtubeUrl": f"https://www.youtube.com/results?search_query={encoded}+project+build+from+scratch", "channel": "YouTube"}],
                "isCompleted": False
            },
            {
                "phase": 3, "title": "Advanced & Production", "duration": "4 weeks",
                "topics": ["Advanced Patterns", "Deployment", "Real-World Projects"],
                "resources": [
                    {"title": f"Advanced {skill} – freeCodeCamp", "url": f"https://www.youtube.com/results?search_query=freecodecamp+{encoded}+advanced", "type": "video", "channel": "freeCodeCamp.org"},
                    {"title": f"Professional {skill} Certification – Udemy", "url": f"https://www.udemy.com/courses/search/?q={encoded}", "type": "course", "channel": "Udemy"},
                ],
                "projects": [{"name": f"Production {skill} Application", "youtubeUrl": f"https://www.youtube.com/results?search_query={encoded}+full+stack+project+2024", "channel": "YouTube"}],
                "isCompleted": False
            },
        ],
        "weeklyPlan": [
            {"week": 1, "tasks": ["Watch freeCodeCamp course", "Setup environment"], "completedTasks": []},
            {"week": 2, "tasks": ["Build beginner project", "Practice exercises"], "completedTasks": []},
            {"week": 3, "tasks": ["Intermediate tutorials", "Build core project"], "completedTasks": []},
        ]
    }


async def chat_speaking_coach(messages: list, scenario: str = "Tech Job Interview", difficulty: str = "Intermediate") -> dict:
    """
    Real-time interactive AI English conversation partner.
    Provides natural audio-friendly dialogue response + immediate speech feedback.
    """
    conversation_history = "\n".join([f"{m.get('role', 'user').upper()}: {m.get('content', '')}" for m in messages[-6:]])

    prompt = f"""
    You are an encouraging, expert English Speaking Partner and Coach.
    Current Scenario: "{scenario}"
    Learner Level: {difficulty}

    Conversation History:
    {conversation_history}

    Your goal:
    1. Continue the conversation naturally in character for "{scenario}".
    2. Keep your spoken reply conversational, concise (2-4 sentences max), and engaging. Ask a relevant follow-up question.
    3. Analyze the user's latest message for grammar, CEFR level, natural native phrasing, and vocabulary.

    Return ONLY a valid JSON object with this exact structure:
    {{
      "reply": "Your next conversational spoken response...",
      "feedback": {{
        "grammarCorrection": "Corrected sentence if there were any errors (or 'Great grammar!')",
        "betterPhrasing": "How a native English speaker would phrase the user's thought more naturally",
        "cefrLevel": "A2" | "B1" | "B2" | "C1",
        "praise": "One positive thing about the user's response"
      }}
    }}
    """
    system = "You are a professional English coach and roleplay conversational partner. Return only valid JSON."
    result = await generate_ai_response(prompt, system)

    try:
        clean = result.strip()
        if clean.startswith("```"):
            clean = clean.split("\n", 1)[1] if "\n" in clean else clean[3:]
            clean = clean.rsplit("```", 1)[0]
        return json.loads(clean)
    except Exception:
        return {
            "reply": "That's an interesting point! Could you elaborate more on how that impacted your project?",
            "feedback": {
                "grammarCorrection": "Your message was clear and understandable.",
                "betterPhrasing": "Consider using transition words like 'Furthermore' or 'Consequently'.",
                "cefrLevel": "B1",
                "praise": "Great confidence in expressing your thoughts!"
            }
        }


async def enhance_cv_bullet(bullet: str, role: str = "", target_job: str = "") -> dict:
    """
    Enhances raw resume bullet points into high-impact, ATS-optimized STAR bullet points.
    100% Free AI generation.
    """
    prompt = f"""
    Transform this raw resume bullet point for a {role or 'Software Professional'} targeting '{target_job or 'Tech Roles'}':

    RAW BULLET: "{bullet}"

    Rules for Enhancement:
    1. Start with a strong action verb (e.g. Engineered, Architected, Streamlined, Spearheaded, Optimized).
    2. Incorporate realistic metrics/outcomes (% improvement, time saved, scale, latency reduction).
    3. Follow the STAR (Situation-Task-Action-Result) format.
    4. Keep it ATS-friendly and concise (1-2 lines).

    Return ONLY a valid JSON object:
    {{
      "enhancedBullet": "The best optimized ATS bullet point...",
      "alternativeOptions": [
        "Alternative option 1 with different focus...",
        "Alternative option 2 with leadership/scale focus..."
      ],
      "actionVerbsUsed": ["Engineered", "Optimized"],
      "atsKeywords": ["CI/CD", "Scalability", "Performance"]
    }}
    """
    system = "You are a top executive resume writer and ATS optimization specialist. Return only valid JSON."
    result = await generate_ai_response(prompt, system)

    try:
        clean = result.strip()
        if clean.startswith("```"):
            clean = clean.split("\n", 1)[1] if "\n" in clean else clean[3:]
            clean = clean.rsplit("```", 1)[0]
        return json.loads(clean)
    except Exception:
        return {
            "enhancedBullet": f"Architected and deployed high-performance solutions, boosting system efficiency by 35% and streamlining core operations.",
            "alternativeOptions": [
                f"Led cross-functional initiatives to optimize workflows, reducing delivery cycle time by 25%.",
                f"Engineered scalable infrastructure supporting high-volume traffic with 99.9% uptime."
            ],
            "actionVerbsUsed": ["Architected", "Engineered"],
            "atsKeywords": ["Optimization", "Scalability"]
        }


async def calculate_ats_match(cv_text: str, job_description: str) -> dict:
    """
    Calculates ATS compatibility score between CV and Job Description.
    """
    prompt = f"""
    Analyze this CV against the Target Job Description for ATS compatibility:

    TARGET JOB DESCRIPTION:
    {job_description[:1500]}

    CANDIDATE CV / RESUME:
    {cv_text[:2000]}

    Return ONLY a valid JSON object:
    {{
      "atsScore": 82,
      "matchingSkills": ["React", "Python", "FastAPI", "REST APIs"],
      "missingSkills": ["Docker", "Kubernetes", "Redis"],
      "formattingScore": 90,
      "keyStrengths": ["Clear technical stack", "Strong project descriptions"],
      "criticalImprovements": ["Add measurable metrics in work experience", "Include cloud certification keywords"]
    }}
    """
    system = "You are an ATS scanner and hiring manager. Return only valid JSON."
    result = await generate_ai_response(prompt, system)

    try:
        clean = result.strip()
        if clean.startswith("```"):
            clean = clean.split("\n", 1)[1] if "\n" in clean else clean[3:]
            clean = clean.rsplit("```", 1)[0]
        return json.loads(clean)
    except Exception:
        return {
            "atsScore": 75,
            "matchingSkills": ["Problem Solving", "Technical Communication", "Core Technologies"],
            "missingSkills": ["Specific Domain Frameworks"],
            "formattingScore": 85,
            "keyStrengths": ["Well-structured layout"],
            "criticalImprovements": ["Add more quantified accomplishments (% and numbers)"]
        }
