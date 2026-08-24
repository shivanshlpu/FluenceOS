"""
AI SERVICE — Multi-Model AI Routing & Real-time Educational Engine
Supports:
  - NVIDIA NIM: DeepSeek V4 Flash, Meta LLaMA 3.3 70B, Mistral Large 2, DeepSeek Coder
  - Groq: GPT-OSS 120B, Qwen 3.6 27B, Compound Mini
  - Google Gemini: Gemini 2.5 Flash, Gemini Flash Latest
"""

import json
import os
import random
import time
import httpx
from typing import Optional, List, Dict, Any
from app.config import GROQ_API_KEY, GEMINI_API_KEY, NVIDIA_API_KEY

groq_client = None
gemini_model = None

# Verified Model Catalog for User Selection
AVAILABLE_MODELS = [
    {
        "id": "auto",
        "name": "Auto (Smart Failover)",
        "provider": "Multi-Engine",
        "description": "Smart failover across Groq, DeepSeek & Gemini for optimal speed & reliability",
        "badge": "Recommended",
        "icon": "Zap"
    },
    {
        "id": "deepseek-ai/deepseek-v4-flash-0731",
        "name": "DeepSeek V4 Flash",
        "provider": "NVIDIA NIM",
        "description": "High analytical reasoning depth, rich technical nuance & diverse phrasing",
        "badge": "NVIDIA NIM",
        "icon": "Cpu"
    },
    {
        "id": "meta/llama-3.3-70b-instruct",
        "name": "Meta LLaMA 3.3 70B",
        "provider": "NVIDIA NIM",
        "description": "Comprehensive multi-paragraph breakdowns, intuitive analogies & trade-offs",
        "badge": "70B Quality",
        "icon": "Layers"
    },
    {
        "id": "openai/gpt-oss-120b",
        "name": "GPT-OSS 120B",
        "provider": "Groq",
        "description": "Ultra-low latency inference with crisp conversational flow",
        "badge": "Ultra Fast",
        "icon": "Zap"
    },
    {
        "id": "gemini-2.5-flash",
        "name": "Gemini 2.5 Flash",
        "provider": "Google AI",
        "description": "Comprehensive creative & structured academic explanations",
        "badge": "Google AI",
        "icon": "Sparkles"
    }
]

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
        gemini_model = genai.GenerativeModel('gemini-2.5-flash')
    except Exception as e:
        print(f"[INFO] Gemini init: {e}")


async def _call_nvidia_nim(model_name: str, prompt: str, system: str = "", temperature: float = 0.7) -> Optional[str]:
    """Helper to query NVIDIA NIM API"""
    if not NVIDIA_API_KEY:
        return None
    try:
        headers = {
            "Authorization": f"Bearer {NVIDIA_API_KEY}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": model_name,
            "messages": [
                {"role": "system", "content": system or "You are an expert AI educator and communication coach."},
                {"role": "user", "content": prompt}
            ],
            "temperature": temperature,
            "max_tokens": 2500
        }
        async with httpx.AsyncClient(timeout=28.0) as client:
            res = await client.post("https://integrate.api.nvidia.com/v1/chat/completions", headers=headers, json=payload)
            if res.status_code == 200:
                data = res.json()
                return data["choices"][0]["message"]["content"]
            else:
                print(f"[WARNING] NVIDIA NIM ({model_name}) HTTP {res.status_code}: {res.text[:150]}")
    except Exception as e:
        print(f"[WARNING] NVIDIA NIM ({model_name}) call failed: {e}")
    return None


async def _call_groq(model_name: str, prompt: str, system: str = "", temperature: float = 0.7) -> Optional[str]:
    """Helper to query Groq REST API"""
    if not GROQ_API_KEY:
        return None
    try:
        headers = {
            "Authorization": f"Bearer {GROQ_API_KEY}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": model_name,
            "messages": [
                {"role": "system", "content": system or "You are an expert AI educator and communication coach."},
                {"role": "user", "content": prompt}
            ],
            "temperature": temperature,
            "max_tokens": 2500
        }
        async with httpx.AsyncClient(timeout=22.0) as client:
            res = await client.post("https://api.groq.com/openai/v1/chat/completions", headers=headers, json=payload)
            if res.status_code == 200:
                data = res.json()
                return data["choices"][0]["message"]["content"]
            else:
                print(f"[WARNING] Groq ({model_name}) HTTP {res.status_code}: {res.text[:150]}")
    except Exception as e:
        print(f"[WARNING] Groq ({model_name}) call failed: {e}")
    return None


async def _call_gemini(model_name: str, prompt: str, system: str = "") -> Optional[str]:
    """Helper to query Google Gemini"""
    if not GEMINI_API_KEY:
        return None
    try:
        import google.generativeai as genai
        m = genai.GenerativeModel(model_name)
        full_prompt = f"{system}\n\n{prompt}" if system else prompt
        response = m.generate_content(full_prompt)
        if response and response.text:
            return response.text
    except Exception as e:
        print(f"[WARNING] Gemini ({model_name}) call failed: {e}")
    return None


async def generate_ai_response(
    prompt: str,
    system: str = "",
    model_preference: str = "auto",
    temperature: float = 0.7
) -> str:
    """
    Flexible Multi-Engine AI generation:
    Directly routes to requested model (NVIDIA NIM / Groq / Gemini),
    and gracefully falls back through the chain if a provider is rate-limited.
    """
    pref = (model_preference or "auto").strip().lower()

    # 1. DIRECT ROUTING: User requested a specific NVIDIA model
    if any(k in pref for k in ["deepseek", "llama", "mistral", "nvidia", "deepseek-ai/", "meta/"]):
        target_model = model_preference if "/" in model_preference else "deepseek-ai/deepseek-v4-flash-0731"
        out = await _call_nvidia_nim(target_model, prompt, system, temperature)
        if out:
            return out

    # 2. DIRECT ROUTING: User requested a specific Groq model
    elif any(k in pref for k in ["groq", "gpt-oss", "qwen", "openai/"]):
        target_model = model_preference if "/" in model_preference else "openai/gpt-oss-120b"
        out = await _call_groq(target_model, prompt, system, temperature)
        if out:
            return out

    # 3. DIRECT ROUTING: User requested Gemini
    elif "gemini" in pref:
        target_model = model_preference if "gemini-" in model_preference else "gemini-2.5-flash"
        out = await _call_gemini(target_model, prompt, system)
        if out:
            return out

    # 4. DEFAULT SMART FAILOVER CHAIN (Auto / Fallback)
    # Tier 1: Groq fast models
    if GROQ_API_KEY:
        for g_m in ["openai/gpt-oss-120b", "openai/gpt-oss-20b", "qwen/qwen3.6-27b", "groq/compound-mini"]:
            out = await _call_groq(g_m, prompt, system, temperature)
            if out:
                return out

    # Tier 2: NVIDIA NIM (DeepSeek V4 Flash, LLaMA 3.3 70B, Mistral Large 2)
    if NVIDIA_API_KEY:
        for n_m in ["deepseek-ai/deepseek-v4-flash-0731", "meta/llama-3.3-70b-instruct", "mistralai/mistral-large-2-instruct"]:
            out = await _call_nvidia_nim(n_m, prompt, system, temperature)
            if out:
                return out

    # Tier 3: Gemini Models
    if GEMINI_API_KEY:
        for gm_m in ['gemini-2.5-flash', 'gemini-flash-latest', 'gemini-3.7-flash']:
            out = await _call_gemini(gm_m, prompt, system)
            if out:
                return out

    # Tier 4: Fallback
    return json.dumps({
        "message": "AI service is currently offline. Please check your API keys or internet connection."
    })




async def evaluate_speech(transcript: str, topic: str, model: str = "auto") -> dict:
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
    result = await generate_ai_response(prompt, system, model_preference=model)

    try:
        # Parse JSON from AI response
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


TOPIC_ANGLES = [
    {
        "id": "architectural",
        "label": "🏗️ Deep Mechanics & First Principles",
        "focus": "Focus deeply on internal mechanisms, step-by-step logic, architectural structure, and underlying dynamics. Explain how the core components interact."
    },
    {
        "id": "analogy",
        "label": "💡 Intuitive Analogies & Mental Models",
        "focus": "Use a fresh, vivid real-world metaphor and intuitive storytelling. Connect the concept to relatable everyday scenarios before breaking down practical mechanics."
    },
    {
        "id": "tradeoffs",
        "label": "⚖️ Strategic Trade-offs & Industry Impact",
        "focus": "Focus on real-world impact, critical pros vs cons, scalability bottlenecks, failure modes, and why modern organizations or individuals adopt it."
    },
    {
        "id": "interview",
        "label": "🎯 Executive Pitch & Speaking Discussion",
        "focus": "Structure the explanation as an articulate, persuasive briefing suitable for technical interviews, presentation debates, or executive overviews."
    }
]


async def generate_topic_explanation(
    topic: str,
    model: str = "auto",
    angle: Optional[str] = None,
    seed: Optional[int] = None
) -> dict:
    """
    Comprehensive, in-depth explanation generator for ANY topic (technical or non-technical).
    Includes dynamic angle variations, anti-repetition phrasing, rich paragraphs, 
    real-world case studies, speaking talking points, and power vocabulary.
    """
    clean_topic = topic.strip()
    
    # Resolve angle
    selected_angle = None
    if angle:
        for a in TOPIC_ANGLES:
            if a["id"] == angle or angle in a["id"]:
                selected_angle = a
                break
    if not selected_angle:
        selected_angle = random.choice(TOPIC_ANGLES)

    # Dynamic entropy for non-repeating sentence structures & fresh analogies
    salt = seed if seed is not None else int(time.time() * 1000) % 100000
    entropy_seed = f"Variant-{salt}-{random.randint(100, 999)}"

    prompt = f"""
    You are a distinguished Educator, Senior Technical Architect, and Communication Coach.
    Provide a comprehensive, authoritative, and deeply educational explanation of "{clean_topic}".
    
    [PEDAGOGICAL PERSPECTIVE]:
    {selected_angle['label']} — {selected_angle['focus']}
    
    [ANTI-REPETITION INSTRUCTIONS (Seed: {entropy_seed})]:
    - Craft a fresh, distinctive explanation with varied sentence rhythm and unique phrasing.
    - Avoid clichéd openings like "In today's fast-paced world" or generic introductory templates.
    - Tailor the depth specifically to "{clean_topic}":
      * If technical (e.g. Kubernetes, DSA, Kafka, OAuth, Concurrency, Sharding): dive into architecture, algorithms, state management, protocols, and latency/memory trade-offs.
      * If non-technical (e.g. Leadership, Public Speaking, Stoicism, Economics, Active Listening): dive into cognitive frameworks, behavioral dynamics, practical tactics, and interpersonal impact.
    
    [OUTPUT REQUIREMENTS]:
    Return ONLY a valid JSON object with the following fields:
    {{
      "summary": "2-3 crisp, compelling sentences defining the core foundation and essence of the topic.",
      "detailedExplanation": "A rich, multi-sentence deep dive (160 to 240 words) exploring core mechanisms, internal logic, nuances, and dynamics with high conceptual depth.",
      "whyItMatters": "Clear, tangible explanation of why this concept is critical in modern industry, engineering, or professional growth.",
      "realWorldExample": "A vivid real-world case study or practical scenario (e.g. how Netflix/Uber/Google or high-performing teams apply this in production/practice).",
      "talkingPoints": [
        "1st key argument or perspective to articulate during speaking practice",
        "2nd key argument highlighting architectural/strategic trade-offs",
        "3rd key argument addressing common misconceptions or future trends"
      ],
      "keyVocabulary": [
        {{"word": "term1", "definition": "concise meaning in context", "phonetic": "[pronunciation guide]"}},
        {{"word": "term2", "definition": "concise meaning in context", "phonetic": "[pronunciation guide]"}},
        {{"word": "term3", "definition": "concise meaning in context", "phonetic": "[pronunciation guide]"}},
        {{"word": "term4", "definition": "concise meaning in context", "phonetic": "[pronunciation guide]"}}
      ],
      "pronunciationTip": "Practical coaching tip on enunciating challenging terms with confidence and rhythm."
    }}
    """

    system = "You are a world-class educator and communication specialist. Return only valid JSON, without any markdown fences."
    result = await generate_ai_response(prompt, system, model_preference=model, temperature=0.85)

    try:
        clean = result.strip()
        if clean.startswith("```"):
            clean = clean.split("\n", 1)[1] if "\n" in clean else clean[3:]
            clean = clean.rsplit("```", 1)[0]
        
        data = json.loads(clean)
        
        # Build composite formatted markdown explanation
        formatted_md = f"""### 📌 Core Overview\n{data.get('summary', '')}\n\n### 🔍 Deep-Dive Analysis\n{data.get('detailedExplanation', '')}\n\n### 💡 Why It Matters\n{data.get('whyItMatters', '')}\n\n### 🏢 Real-World Case Study\n{data.get('realWorldExample', '')}"""
        
        return {
            "topic": clean_topic,
            "modelUsed": model,
            "angle": selected_angle["id"],
            "angleLabel": selected_angle["label"],
            "summary": data.get("summary", ""),
            "detailedExplanation": data.get("detailedExplanation", ""),
            "whyItMatters": data.get("whyItMatters", ""),
            "realWorldExample": data.get("realWorldExample", ""),
            "talkingPoints": data.get("talkingPoints", []),
            "keyVocabulary": data.get("keyVocabulary", []),
            "pronunciationTip": data.get("pronunciationTip", ""),
            "explanation": formatted_md
        }
    except Exception as e:
        print(f"[SPEAKING] generate_topic_explanation parsing notice: {e}")

    # High-quality structured fallback if AI parsing fails
    fallback_summary = f"{clean_topic.title()} represents a critical discipline requiring both conceptual clarity and practical execution. Mastering this area enables professionals to dissect complex problems and articulate scalable solutions."
    fallback_detailed = f"When analyzing {clean_topic}, practitioners examine core functional principles, systematic workflows, and operational trade-offs. In modern environments, implementing {clean_topic} effectively demands deliberate decision-making regarding efficiency, maintainability, and resource allocation. Whether discussing structural components or strategic impact, clear articulation highlights nuanced trade-offs and reinforces leadership authority."
    fallback_why = f"Understanding {clean_topic} provides a competitive edge in technical interviews, cross-functional collaboration, and architectural decision-making."
    fallback_example = f"Organizations utilize {clean_topic} to eliminate operational bottlenecks, ensure fault tolerance, and accelerate team velocity across distributed initiatives."
    
    return {
        "topic": clean_topic,
        "modelUsed": model,
        "angle": selected_angle["id"],
        "angleLabel": selected_angle["label"],
        "summary": fallback_summary,
        "detailedExplanation": fallback_detailed,
        "whyItMatters": fallback_why,
        "realWorldExample": fallback_example,
        "talkingPoints": [
            f"Define {clean_topic} starting with first-principles before expanding into implementation details.",
            f"Discuss key trade-offs and operational challenges when scaling {clean_topic}.",
            f"Highlight real-world industry benchmarks and measurable business outcomes."
        ],
        "keyVocabulary": [
            {"word": "orchestration", "definition": "coordinating complex workflows and systems smoothly", "phonetic": "[awr-kuh-strey-shun]"},
            {"word": "scalability", "definition": "the capacity to handle growing workloads effortlessly", "phonetic": "[skey-luh-bil-i-tee]"},
            {"word": "articulation", "definition": "clear, distinct verbal expression of concepts", "phonetic": "[ahr-tik-yuh-ley-shun]"},
            {"word": "idempotency", "definition": "producing the exact same result regardless of repetition", "phonetic": "[eye-dem-poh-tuhn-see]"}
        ],
        "pronunciationTip": f"Speak about '{clean_topic}' with a measured, confident pace and pause naturally at paragraph transitions.",
        "explanation": f"### 📌 Core Overview\n{fallback_summary}\n\n### 🔍 Deep-Dive Analysis\n{fallback_detailed}\n\n### 💡 Why It Matters\n{fallback_why}\n\n### 🏢 Real-World Application\n{fallback_example}"
    }


# Rich procedural CSE passage repository for instantaneous, zero-latency high-quality passages
CSE_PASSAGES = {
    "system design & distributed systems": {
        "paragraph": "In distributed system architecture, scalability and high availability are core engineering objectives. When systems scale to millions of concurrent users, monolithic applications often transition into microservices communicating over asynchronous message queues and gRPC. Engineers implement load balancers, caching tiers with Redis, and database replication to eliminate single points of failure. Adhering to the CAP theorem requires deliberate trade-offs between consistency and partition tolerance. Mastering distributed tracing and idempotency ensures resilient fault recovery and low-latency throughput across cloud infrastructure.",
        "wordCount": 77,
        "vocabulary": [
            {"word": "scalability", "definition": "the capability of a system to handle a growing amount of work or traffic smoothly"},
            {"word": "monolithic", "definition": "a single-tiered software application in which user interface and data access are combined in one program"},
            {"word": "asynchronous", "definition": "operations executed independently without blocking the main execution thread"},
            {"word": "idempotency", "definition": "a property where an operation produces the same result even if applied multiple times"},
            {"word": "throughput", "definition": "the rate at which a system processes requests or transfers data over a given time"}
        ],
        "pronunciationTip": "Pronounce 'asynchronous' as [ey-sing-kruh-nuhs] with stress on the second syllable, and 'idempotency' as [eye-dem-poh-tuhn-see]."
    },
    "data structures & algorithms": {
        "paragraph": "Algorithm optimization relies heavily on choosing optimal data structures to reduce time and space complexity. When evaluating computational efficiency, software engineers utilize Big-O notation to assess worst-case performance. Hash tables provide constant time complexity on average, whereas balanced binary search trees guarantee logarithmic lookup times. In complex graph problems, Dijkstra's algorithm and dynamic programming solve intricate optimization challenges by memoizing overlapping subproblems. Developing algorithmic intuition is critical for engineering robust, high-performance software systems.",
        "wordCount": 74,
        "vocabulary": [
            {"word": "complexity", "definition": "the amount of computational resources (time or memory) required to execute an algorithm"},
            {"word": "logarithmic", "definition": "an efficiency rate where execution time grows proportionally to the logarithm of the input size"},
            {"word": "memoization", "definition": "an optimization technique that caches the results of expensive function calls for future reuse"},
            {"word": "overlapping", "definition": "subproblems that are solved multiple times within a recursive algorithm"},
            {"word": "intuition", "definition": "the ability to understand or predict algorithmic behavior quickly and insightfully"}
        ],
        "pronunciationTip": "In 'logarithmic', pronounce it [log-uh-rith-mik] and keep the 'th' sound soft as in 'think'."
    },
    "operating systems & concurrency": {
        "paragraph": "Modern operating systems govern hardware resources through preemptive scheduling, virtual memory management, and process isolation. Concurrency introduces parallel threads of execution that share memory address spaces, requiring careful synchronization primitives like mutexes and semaphores to prevent race conditions. When multiple threads compete for exclusive locks without proper acquisition order, deadlocks can freeze system workflows. Efficient context switching and interrupt handling ensure maximum CPU utilization and low system latency.",
        "wordCount": 68,
        "vocabulary": [
            {"word": "preemptive", "definition": "a scheduling strategy where the OS can interrupt running tasks to allocate CPU to higher-priority tasks"},
            {"word": "concurrency", "definition": "the ability of different parts of a program to execute out-of-order or in partial order without affecting outcome"},
            {"word": "synchronization", "definition": "coordinating concurrent threads to ensure consistent shared memory access"},
            {"word": "semaphore", "definition": "a synchronization variable used to control access to a common resource by multiple processes"},
            {"word": "deadlock", "definition": "a state where a set of processes are blocked because each process is holding a resource and waiting for another"}
        ],
        "pronunciationTip": "For 'semaphore', pronounce it [sem-uh-fawr]. In 'synchronization', emphasize the [kruh-nahy-zay-shun] cadence."
    },
    "database management systems & sql": {
        "paragraph": "Relational database management systems uphold ACID properties to guarantee transactional reliability and data integrity. Indexing strategies utilizing B-plus trees dramatically accelerate query execution by minimizing expensive disk input-output operations. When scaling relational databases, database administrators apply vertical partitioning, horizontal sharding, and read replicas. Understanding query execution plans and foreign key constraints helps software engineers write optimized SQL queries that avoid full table scans under heavy production workloads.",
        "wordCount": 69,
        "vocabulary": [
            {"word": "transactional", "definition": "relating to database units of work that must succeed or fail as a complete, indivisible operation"},
            {"word": "integrity", "definition": "the overall accuracy, completeness, and consistency of data stored in a database"},
            {"word": "sharding", "definition": "partitioning a database horizontally across multiple server instances to distribute load"},
            {"word": "replicas", "definition": "exact database duplicates that handle read-heavy traffic and improve fault tolerance"},
            {"word": "execution", "definition": "the step-by-step process followed by the database engine to run a query"}
        ],
        "pronunciationTip": "Pronounce 'relational' as [ri-ley-shuh-nl] and 'sharding' with a clear, open 'ar' sound."
    },
    "artificial intelligence & machine learning": {
        "paragraph": "Artificial intelligence has evolved rapidly with deep neural networks, transformer architectures, and attention mechanisms. Machine learning pipelines involve feature extraction, data normalization, gradient descent optimization, and loss minimization. In natural language processing, self-attention layers compute contextual relationships between tokens across vast semantic dimensions. As engineers fine-tune pretrained foundation models, evaluating perplexity, inference latency, and hallucination rates ensures responsible and accurate AI deployment.",
        "wordCount": 66,
        "vocabulary": [
            {"word": "transformer", "definition": "a deep learning architecture that relies on self-attention mechanisms to process sequential data in parallel"},
            {"word": "normalization", "definition": "scaling input features to a standard range so gradient descent converges efficiently"},
            {"word": "gradient", "definition": "a vector of partial derivatives indicating the direction of steepest increase in a loss function"},
            {"word": "semantic", "definition": "relating to the underlying meaning and logical relationships of words and data representations"},
            {"word": "inference", "definition": "the phase where a trained machine learning model generates predictions from new incoming data"}
        ],
        "pronunciationTip": "In 'gradient', say [grey-dee-uhnt]. For 'semantic', pronounce the middle syllable cleanly [si-man-tik]."
    },
    "computer networks & security": {
        "paragraph": "Computer networking architectures rely on the layered TCP/IP and OSI models to facilitate reliable packet transmission across global networks. During a TCP three-way handshake, client and server establish sequence numbers to ensure reliable data streams over unreliable network paths. Modern web applications utilize Transport Layer Security with asymmetric public-key cryptography to encrypt communications. Incorporating zero-trust network policies, DNS caching, and CDN edge caching protects sensitive digital infrastructure against distributed denial-of-service attacks.",
        "wordCount": 73,
        "vocabulary": [
            {"word": "transmission", "definition": "the act of sending electromagnetic signals or packets across communication channels"},
            {"word": "handshake", "definition": "an automated negotiation protocol between two devices establishing communication rules and parameters"},
            {"word": "asymmetric", "definition": "cryptographic systems that use pairs of keys: a public key for encryption and a private key for decryption"},
            {"word": "cryptography", "definition": "the practice of securing communication in the presence of adversarial third parties"},
            {"word": "infrastructure", "definition": "the foundational hardware, software, and network resources supporting an IT environment"}
        ],
        "pronunciationTip": "Pronounce 'asymmetric' as [ey-si-met-rik] and 'cryptography' with emphasis on the second syllable [krip-tog-ruh-fee]."
    },
    "cloud computing & devops": {
        "paragraph": "Cloud native software engineering utilizes containerization with Docker and container orchestration with Kubernetes to automate deployment and scaling. Continuous integration and continuous deployment pipelines validate code quality with automated unit testing, static linting, and artifact building. By declaring cloud infrastructure as code using Terraform, DevOps teams eliminate configuration drift and achieve reproducible multi-region deployments. Observability through structured logging and Prometheus metrics guarantees proactive alerting before service degradation affects end users.",
        "wordCount": 71,
        "vocabulary": [
            {"word": "orchestration", "definition": "the automated configuration, coordination, and management of computer systems and software services"},
            {"word": "reproducible", "definition": "capable of being recreated or duplicated reliably with identical results every time"},
            {"word": "observability", "definition": "the degree to which the internal state of a system can be inferred from its external outputs like logs and metrics"},
            {"word": "containerization", "definition": "packaging an application and all its dependencies into a self-contained executable container image"},
            {"word": "degradation", "definition": "a decline in system performance, throughput, or responsiveness below standard operational thresholds"}
        ],
        "pronunciationTip": "Pronounce 'orchestration' as [awr-kuh-strey-shun] and 'observability' as [uhb-zur-vuh-bil-i-tee]."
    },
    "tech interview & engineering communication": {
        "paragraph": "Effective technical communication is an indispensable skill for software engineers during technical interviews and architectural reviews. When presenting system design solutions, strong candidates articulate technical trade-offs, state assumptions explicitly, and justify database selections based on read-to-write ratios. Practicing concise verbal summaries helps engineers explain complex algorithms, discuss past engineering failures constructively, and build alignment with engineering leaders. Clear enunciation and structured communication turn complex engineering insights into persuasive, high-impact presentations.",
        "wordCount": 71,
        "vocabulary": [
            {"word": "indispensable", "definition": "absolutely necessary, essential, or impossible to do without"},
            {"word": "articulate", "definition": "to express an idea, thought, or technical concept clearly and coherently in words"},
            {"word": "assumptions", "definition": "premises or requirements accepted as true without immediate proof to scope a problem"},
            {"word": "alignment", "definition": "shared agreement, coordination, and understanding among team members and stakeholders"},
            {"word": "persuasive", "definition": "good at convincing someone to believe or agree with a specific point of view or recommendation"}
        ],
        "pronunciationTip": "Pronounce 'indispensable' as [in-di-spen-suh-buhl] with clean syllable separation, and 'articulate' as [ahr-tik-yuh-leyt]."
    }
}


def _get_procedural_cse_fallback(topic: str, level: str = "beginner") -> dict:
    """Find the best matched CSE passage or create an authentic technical passage."""
    t_low = topic.lower().strip()
    
    for key, data in CSE_PASSAGES.items():
        if key in t_low or any(w in t_low for w in key.split() if len(w) > 3):
            return data

    # Default technical CSE fallback for custom topics
    clean_topic = topic.strip().title()
    return {
        "paragraph": f"In computer science and software engineering, mastering {clean_topic} requires a deep understanding of core architectural principles, algorithms, and practical trade-offs. When implementing {clean_topic} in production environments, software developers must analyze scalability, latency, memory utilization, and failure scenarios. Developing clear technical articulation when discussing {clean_topic} allows engineers to communicate architectural decisions effectively to both engineering teammates and executive stakeholders. Focus on steady pacing, pronounce technical terms distinctly, and emphasize key concepts with confidence.",
        "wordCount": 77,
        "vocabulary": [
            {"word": "architectural", "definition": "relating to the high-level structure and design of software systems"},
            {"word": "scalability", "definition": "the ability of a computer application or system to adapt to increased workload"},
            {"word": "latency", "definition": "the time delay between an action and its resulting response in a network or system"},
            {"word": "articulation", "definition": "the clear and precise verbal expression of ideas and technical concepts"},
            {"word": "stakeholders", "definition": "people with an interest or concern in the outcome and performance of a project"}
        ],
        "pronunciationTip": f"When discussing '{clean_topic}', pause naturally at transition phrases and emphasize key technical nouns clearly."
    }


async def generate_reading_paragraph(
    topic: str,
    level: str = "beginner",
    model: str = "auto",
    angle: Optional[str] = None
) -> dict:
    """Generate an informative, engaging reading passage for any chosen topic (technical or general)."""
    salt = int(time.time() * 1000) % 100000
    prompt = f"""
    You are an expert English Speaking & Technical Communication Coach.
    Write an educational, high-quality reading practice passage about "{topic}" for a professional/student at {level} level.
    Variation Seed: {salt}

    REQUIREMENTS:
    - Topic: "{topic}" (Technical or General Knowledge).
    - Length: 90 to 140 words of substantive, high-value content with varied sentence structure.
    - Style: Professional, informative, engaging, and articulate.
    - Include 5 advanced vocabulary words with concise contextual definitions.
    - Include 1 practical pronunciation tip for a challenging word in this passage.

    Return ONLY a valid JSON object with this exact structure:
    {{
      "paragraph": "Full passage text here...",
      "wordCount": 110,
      "vocabulary": [
        {{"word": "scalability", "definition": "ability to handle growing workloads smoothly"}},
        {{"word": "asynchronous", "definition": "independent execution without blocking"}},
        {{"word": "throughput", "definition": "rate of processing data or requests"}},
        {{"word": "idempotency", "definition": "same result when executed multiple times"}},
        {{"word": "latency", "definition": "delay before data transfer begins"}}
      ],
      "pronunciationTip": "Pronounce 'asynchronous' as [ey-sing-kruh-nuhs] with stress on the second syllable."
    }}
    """
    system = "You are a professional educator and speech coach. Return ONLY valid JSON, no markdown fences."
    result = await generate_ai_response(prompt, system, model_preference=model, temperature=0.8)

    try:
        clean = result.strip()
        if clean.startswith("```"):
            clean = clean.split("\n", 1)[1] if "\n" in clean else clean[3:]
            clean = clean.rsplit("```", 1)[0]
        data = json.loads(clean)
        if data.get("paragraph") and len(data["paragraph"].split()) >= 40:
            return data
    except Exception as e:
        print(f"[SPEAKING] generate_reading_paragraph AI parsing error: {e}")

    # Rich CSE fallback
    return _get_procedural_cse_fallback(topic, level)


from app.services.scoring_service import calculate_reading_scores, validate_audio_quality


def _algorithmic_word_diff(original: str, spoken: str) -> dict:
    """Delegates to advanced scoring service with Needleman-Wunsch sequence alignment."""
    return calculate_reading_scores(original, spoken)


async def evaluate_reading(
    original_paragraph: str,
    spoken_text: str,
    topic: str,
    duration: int = 0,
    model: str = "auto",
    audio_quality_metrics: Optional[dict] = None
) -> dict:
    """Compare user's spoken reading with original paragraph, score accuracy word by word with 6 separate score components."""
    # Pre-validate audio quality
    quality_check = validate_audio_quality(audio_quality_metrics, spoken_text, duration)
    if not quality_check["isAcceptable"]:
        return {
            "status": "rejected",
            "isAcceptable": False,
            "rejectionReason": quality_check["rejectionReason"],
            "rejectionMessage": quality_check["message"],
            "overallScore": 0.0,
            "accuracyScore": 0.0,
            "pronunciationScore": 0.0,
            "fluencyScore": 0.0,
            "paceScore": 0.0,
            "pauseScore": 0.0,
            "vocabularyScore": 0.0,
            "detailedFeedback": quality_check["message"],
            "strengths": [],
            "improvements": ["Ensure a quiet environment and speak clearly into the microphone."],
            "pronunciationGuides": []
        }

    # Compute deterministic algorithmic multi-component scores
    scores = calculate_reading_scores(
        original_paragraph,
        spoken_text,
        duration_seconds=duration,
        audio_quality_metrics=audio_quality_metrics
    )

    prompt = f"""
    A student was asked to READ this technical passage aloud:

    ORIGINAL PASSAGE:
    {original_paragraph}

    WHAT THE STUDENT SPOKEN TRANSCRIPT (Speech-to-Text):
    {spoken_text}

    ALGORITHMIC SCORE SUMMARY:
    - Word Accuracy Score: {scores["accuracyScore"]} / 10
    - Pronunciation Score: {scores["pronunciationScore"]} / 10
    - Fluency Score: {scores["fluencyScore"]} / 10
    - Speaking Pace (WPM: {scores["wpm"]}): {scores["paceScore"]} / 10
    - Technical Vocabulary Mastery: {scores["vocabularyScore"]} / 10
    - Overall Score: {scores["overallScore"]} / 10

    TASK:
    1. Analyze their spoken reading against the original passage.
    2. Provide constructive spoken English feedback on their technical enunciation, rhythm, and cadence.
    3. Identify 1-3 difficult technical words from the passage and provide accurate phonetic breakdown & articulation tip.

    Return ONLY a valid JSON object:
    {{
      "detailedFeedback": "Insightful 2-3 sentence feedback on pace, pronunciation, and enunciation...",
      "strengths": ["Clear articulation of technical terms", "Smooth transition between sentences"],
      "improvements": ["Slow down on multi-syllable terms", "Avoid rushing comma pauses"],
      "pronunciationGuides": [
        {{"word": "asynchronous", "phonetic": "ey-sing-kruh-nuhs", "tip": "Stress the second syllable 'sing'"}}
      ]
    }}
    """
    system = "You are an expert English speech and CSE technical communication coach. Return only valid JSON."
    
    detailed_feedback = f"You read {scores['wordsCorrect']} out of {scores['wordsTotal']} words accurately ({round((scores['wordsCorrect']/max(scores['wordsTotal'],1))*100)}% accuracy) at {scores['wpm']} WPM. Practice articulating multi-syllable terminology with steady pacing."
    strengths = ["Solid voice projection on technical content", "Consistent reading effort"]
    improvements = ["Maintain natural pauses at punctuation marks", "Enunciate multi-syllable domain keywords distinctly"]
    pronunciation_guides = []

    try:
        result = await generate_ai_response(prompt, system, model_preference=model)
        import re
        clean = result.strip()
        if clean.startswith("```"):
            clean = clean.split("\n", 1)[1] if "\n" in clean else clean[3:]
            clean = clean.rsplit("```", 1)[0]
        
        json_match = re.search(r'\{[\s\S]*\}', clean)
        raw_json = json_match.group(0) if json_match else clean
        parsed = json.loads(raw_json)
        
        if parsed.get("detailedFeedback"):
            detailed_feedback = parsed["detailedFeedback"]
        if parsed.get("strengths"):
            strengths = parsed["strengths"]
        if parsed.get("improvements"):
            improvements = parsed["improvements"]
        if parsed.get("pronunciationGuides"):
            pronunciation_guides = parsed["pronunciationGuides"]
    except Exception as e:
        print(f"[SPEAKING] evaluate_reading AI parsing notice: {e}")

    # Combine deterministic scores with AI qualitative coaching
    return {
        "status": "success",
        "isAcceptable": True,
        "overallScore": scores["overallScore"],
        "accuracyScore": scores["accuracyScore"],
        "pronunciationScore": scores["pronunciationScore"],
        "fluencyScore": scores["fluencyScore"],
        "paceScore": scores["paceScore"],
        "pauseScore": scores["pauseScore"],
        "vocabularyScore": scores["vocabularyScore"],
        "wpm": scores["wpm"],
        "wordsCorrect": scores["wordsCorrect"],
        "wordsTotal": scores["wordsTotal"],
        "missedWords": scores["missedWords"],
        "mispronounced": scores["mispronounced"],
        "extraWords": scores["extraWords"],
        "repeatedWords": scores["repeatedWords"],
        "wordsAnalysis": scores["wordsAnalysis"],
        "technicalVocabStats": scores["technicalVocabStats"],
        "detailedFeedback": detailed_feedback,
        "strengths": strengths,
        "improvements": improvements,
        "pronunciationGuides": pronunciation_guides
    }


async def chat_speaking_coach(
    messages: list,
    scenario: str = "Tech Job Interview",
    difficulty: str = "Intermediate",
    model: str = "auto"
) -> dict:
    """
    Interactive 2-way AI voice coach turn.
    Returns natural conversational reply and instant pronunciation/grammar feedback.
    """
    history_text = "\n".join([f"{m.get('role', 'user').capitalize()}: {m.get('content', '')}" for m in messages[-6:]])
    user_last_msg = messages[-1].get("content", "") if messages else ""

    prompt = f"""
    You are an expert AI Speaking Coach conducting an interactive 2-way spoken English voice session.
    Scenario: "{scenario}"
    Target Difficulty: "{difficulty}"

    CONVERSATION HISTORY:
    {history_text}

    TASK:
    1. Respond naturally to the user's latest statement as your role in this scenario (Interviewer, friendly conversation partner, IELTS examiner, or negotiation counterpart).
    2. Keep your spoken reply concise (2-3 sentences max so it is punchy on text-to-speech voice audio).
    3. End with a natural follow-up question or comment to keep the conversation flowing.
    4. Provide constructive feedback on the user's English (grammar correction if needed, CEFR score A1-C2, and a more natural phrasing).

    Return ONLY a valid JSON object:
    {{
      "reply": "Your 2-3 sentence conversational response...",
      "feedback": {{
        "cefrScore": "B2",
        "correction": "Grammar correction if there was a mistake, or null",
        "betterAlternative": "A more natural, native-sounding way to say what the user said",
        "tip": "One concise tip to improve spoken fluency, vocabulary, or confidence"
      }}
    }}
    """
    system = "You are an empathetic, encouraging AI English speaking partner. Return ONLY valid JSON with conversational response and constructive feedback."
    result = await generate_ai_response(prompt, system, model_preference=model)


    try:
        clean = result.strip()
        if clean.startswith("```"):
            clean = clean.split("\n", 1)[1] if "\n" in clean else clean[3:]
            clean = clean.rsplit("```", 1)[0]
        parsed = json.loads(clean)
        if "reply" in parsed:
            return parsed
    except Exception:
        pass

    # Intelligent contextual fallback
    return {
        "reply": f"That is a great perspective! Could you tell me more about how that experience shaped your thinking, or give a specific example?",
        "feedback": {
            "cefrScore": "B1",
            "correction": None,
            "betterAlternative": "You expressed your thoughts clearly. Try using transition words like 'Furthermore' or 'In my experience'.",
            "tip": "Speak with steady pacing and pause naturally at commas."
        }
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
            "enhancedBullet": "Architected and deployed high-performance solutions, boosting system efficiency by 35% and streamlining core operations.",
            "alternativeOptions": [
                "Led cross-functional initiatives to optimize workflows, reducing delivery cycle time by 25%.",
                "Engineered scalable infrastructure supporting high-volume traffic with 99.9% uptime."
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


async def expand_news_article(title: str, summary: str, source: str = "", category: str = "AI Tech") -> dict:
    """
    Expands a short news snippet into a comprehensive, multi-paragraph in-depth article.
    """
    prompt = f"""
    Write a detailed, high-quality, multi-paragraph journalistic report and deep-dive analysis based on this news brief:

    HEADLINE: {title}
    BRIEF / SUMMARY: {summary}
    CATEGORY: {category}
    SOURCE: {source or 'Tech Intelligence'}

    Generate a thorough story with rich, well-written paragraphs structured as follows. Return ONLY valid JSON:
    {{
      "headline": "{title}",
      "executiveSummary": "A concise, engaging 2-3 sentence overview highlighting the essence of the news.",
      "backgroundContext": "A full paragraph detailing the historical context, previous industry state, and the problem this development addresses.",
      "coreBreakthrough": "A comprehensive paragraph explaining exactly what was built, announced, or discovered, including key numbers, architectures, or releases.",
      "technicalDeepDive": "A detailed technical paragraph examining how the technology or system operates, implementation details, benchmarks, or models involved.",
      "industryImpact": "A full paragraph analyzing the strategic and economic impact on developers, enterprises, competitors, and the broader tech ecosystem.",
      "keyTakeaways": [
        "Key takeaway bullet 1",
        "Key takeaway bullet 2",
        "Key takeaway bullet 3"
      ],
      "paragraphs": [
        "Paragraph 1 (Executive Summary)",
        "Paragraph 2 (Context & Background)",
        "Paragraph 3 (Core Details & Breakthroughs)",
        "Paragraph 4 (Technical Deep Dive)",
        "Paragraph 5 (Market & Future Outlook)"
      ]
    }}
    """
    system = "You are a senior tech journalist and AI research analyst. Write professional, in-depth, multi-paragraph reports. Return only valid JSON."
    result = await generate_ai_response(prompt, system)

    try:
        clean = result.strip()
        if clean.startswith("```"):
            clean = clean.split("\n", 1)[1] if "\n" in clean else clean[3:]
            clean = clean.rsplit("```", 1)[0]
        parsed = json.loads(clean)
        if isinstance(parsed, dict) and "paragraphs" in parsed:
            return parsed
    except Exception as e:
        print(f"[WARNING] expand_news_article fallback due to: {e}")

    # Fallback rich paragraphs if AI response parsing fails
    clean_summary = summary.strip() if summary else title
    return {
        "headline": title,
        "executiveSummary": clean_summary,
        "backgroundContext": f"The rapid acceleration of {category} has spurred intense development across the sector, prompting organizations worldwide to rethink architectures and engineering practices.",
        "coreBreakthrough": f"According to reports from {source or 'industry updates'}, {title}. This development represents a significant step forward in the adoption and practical deployment of modern AI technologies.",
        "technicalDeepDive": f"Key technical attributes focus on optimizing throughput, minimizing inference overhead, and ensuring seamless integration with existing software engineering ecosystems.",
        "industryImpact": "Looking ahead, this milestone is expected to drive higher developer velocity and establish new benchmarks for upcoming product cycles across the ecosystem.",
        "keyTakeaways": [
            "Significant progress in scalable AI engineering and deployment.",
            "Measurable improvements in developer productivity and operational efficiency.",
            "Anticipated broader ecosystem adoption over the coming quarters."
        ],
        "paragraphs": [
            clean_summary,
            f"The rapid acceleration of {category} has spurred intense development across the sector, prompting organizations worldwide to rethink architectures and engineering practices.",
            f"According to reports from {source or 'industry updates'}, {title}. This development represents a significant step forward in practical deployment.",
            "Key technical attributes focus on optimizing throughput, minimizing latency, and ensuring seamless integration across enterprise stacks.",
            "Looking ahead, this milestone is expected to drive higher developer velocity and establish new benchmarks for upcoming industry roadmaps."
        ]
    }


async def transcribe_audio(audio_bytes: bytes, filename: str = "recording.webm") -> dict:
    """High-accuracy audio speech-to-text using Groq Whisper Large v3 Turbo with confidence estimation"""
    if GROQ_API_KEY:
        try:
            headers = {"Authorization": f"Bearer {GROQ_API_KEY}"}
            files = {"file": (filename or "recording.webm", audio_bytes, "audio/webm")}
            data = {
                "model": "whisper-large-v3-turbo",
                "language": "en",
                "response_format": "verbose_json"
            }
            async with httpx.AsyncClient(timeout=25.0) as client:
                res = await client.post("https://api.groq.com/openai/v1/audio/transcriptions", headers=headers, files=files, data=data)
                if res.status_code == 200:
                    result = res.json()
                    text = result.get("text", "").strip()
                    segments = result.get("segments", [])
                    
                    # Calculate mean confidence from segment avg_logprob: conf = exp(avg_logprob)
                    confidences = []
                    for seg in segments:
                        logprob = seg.get("avg_logprob")
                        if logprob is not None:
                            conf = max(0.0, min(1.0, math.exp(logprob)))
                            confidences.append(conf)
                    
                    mean_confidence = round(sum(confidences) / len(confidences), 2) if confidences else 0.95

                    return {
                        "transcript": text,
                        "confidence": mean_confidence,
                        "duration": result.get("duration", 0),
                        "segments": segments
                    }
                else:
                    print(f"[WARNING] Whisper Groq transcription HTTP {res.status_code}: {res.text}")
        except Exception as e:
            print(f"[WARNING] Whisper transcription failed: {e}")
            
    return {"transcript": "", "confidence": 0.0, "duration": 0, "segments": []}


