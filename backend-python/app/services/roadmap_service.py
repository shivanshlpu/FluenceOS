"""
ROADMAP SERVICE
Generates comprehensive step-by-step master roadmaps, environment setup guides,
deep-dive topic tutorials with runnable code snippets, curated YouTube/Course links,
ELI5 analogy explanations, interactive phase quizzes, interview questions, and cheat sheets.
"""

import json
import httpx
from typing import Dict, Any, Optional
from app.services.ai_service import generate_ai_response

# Python aliases for JSON literals in dict templates
true = True
false = False
null = None



def get_playground_url(skill: str) -> dict:
    """Returns direct interactive online code playground URL for the language."""
    s = skill.lower()
    if "python" in s:
        return {"name": "Python Tutor / Replit", "url": "https://pythontutor.com/visualize.html#mode=edit"}
    if "react" in s:
        return {"name": "React CodeSandbox", "url": "https://codesandbox.io/s/new"}
    if "rust" in s:
        return {"name": "Rust Playground", "url": "https://play.rust-lang.org/"}
    if "go" in s or "golang" in s:
        return {"name": "Go Playground", "url": "https://go.dev/play/"}
    if "typescript" in s or "javascript" in s or "node" in s:
        return {"name": "TypeScript Playground", "url": "https://www.typescriptlang.org/play"}
    if "java" in s and "javascript" not in s:
        return {"name": "Online Java Compiler", "url": "https://www.onlinegdb.com/online_java_compiler"}
    if "sql" in s or "postgres" in s:
        return {"name": "SQL Fiddle", "url": "https://sqlfiddle.com"}
    if "c++" in s or "cpp" in s:
        return {"name": "Compiler Explorer (Godbolt)", "url": "https://godbolt.org/"}
    return {"name": "OneCompiler Multi-Language Sandbox", "url": f"https://onecompiler.com/{s.replace(' ', '')}"}


async def generate_complete_roadmap(skill: str, level: str = "Beginner") -> dict:
    """
    Generates a full 5-phase mastery roadmap with setup guide, interactive topic tutorials,
    ELI5 analogies, runnable code snippets, phase quizzes, and interview cheat sheets.
    """
    clean_skill = skill.strip()
    if not clean_skill:
        clean_skill = "Python"

    playground = get_playground_url(clean_skill)

    prompt = f"""
    You are a Principal Software Architect and World-Class Tech Educator.
    Create a complete, master-level, step-by-step learning roadmap and guide for "{clean_skill}" starting from "{level}" level.

    REQUIREMENTS:
    1. Phase 0 Setup Guide: exact CLI commands, compiler/runtime install steps, and a working "Hello World" runnable code snippet with explanation.
    2. 4-5 Progressive Learning Phases:
       - Phase 1: Core Fundamentals & Syntax
       - Phase 2: Intermediate Engineering & Data Structures
       - Phase 3: Frameworks, Tooling & Ecosystem
       - Phase 4: Production, Performance & Cloud Deployment
    3. For EVERY topic in each phase:
       - name: Exact topic name
       - shortDesc: 1-sentence summary
       - explanation: Senior engineer deep-dive concept explanation (2-3 sentences)
       - analogyExplanation: "Explain Like I'm 5" (ELI5) concept using a real-world intuitive everyday analogy
       - howToStart: Step-by-step instruction on how to practice this
       - codeSnippet: Complete, runnable, syntax-valid code snippet demonstrating the concept
       - commonMistakes: Common beginner pitfall and how to avoid it
       - docUrl: Official documentation link or high-quality guide URL
    4. For EACH Phase: provide an interactive 3-question Knowledge Check Quiz:
       - question: Multiple choice question
       - options: [4 answer choices]
       - correctIndex: 0-3 index
       - explanation: Why this answer is correct
    5. Real Video & Course Links:
       - Use popular direct video URLs or search query URLs for freeCodeCamp.org, Traversy Media, Programming with Mosh, Fireship, etc.
    6. Hands-on Portfolio Projects for each phase (name, description, difficulty, and YouTube tutorial link).
    7. Weekly Actionable Plan with day-by-day checklist tasks.
    8. Top 5 Interview Questions with detailed answers.
    9. Quick Syntax & Command Cheat Sheet.

    Return ONLY a valid JSON object with this exact structure:
    {{
      "name": "{clean_skill}",
      "overview": "Comprehensive mastery path for {clean_skill}",
      "level": "{level}",
      "estimatedWeeks": 8,
      "playground": {{
        "name": "{playground['name']}",
        "url": "{playground['url']}"
      }},
      "setupGuide": {{
        "prerequisites": ["List of tools to install"],
        "installCommands": ["Command 1", "Command 2"],
        "helloWorldCode": "Working runnable hello world code...",
        "explanation": "How the setup and runtime work..."
      }},
      "phases": [
        {{
          "phase": 1,
          "title": "Phase 1: Foundations & Core Syntax",
          "duration": "2 weeks",
          "goal": "Master fundamentals and core concepts",
          "topics": [
            {{
              "name": "Variables & Core Data Types",
              "shortDesc": "Understanding data storage and types",
              "explanation": "Variables hold references to values in memory...",
              "analogyExplanation": "Think of variables like labelled storage boxes in a warehouse where you store items.",
              "howToStart": "1. Create a main file\\n2. Declare primitive and composite types\\n3. Run print statements",
              "codeSnippet": "...",
              "commonMistakes": "Confusing mutable vs immutable references",
              "docUrl": "https://developer.mozilla.org/ or official docs"
            }}
          ],
          "quiz": [
            {{
              "question": "Sample quiz question on Phase 1 concepts?",
              "options": ["Option A", "Option B", "Option C", "Option D"],
              "correctIndex": 1,
              "explanation": "Detailed explanation of why Option B is correct."
            }}
          ],
          "resources": [
            {{
              "title": "{clean_skill} Full Course for Beginners – freeCodeCamp",
              "url": "https://www.youtube.com/results?search_query={clean_skill.replace(' ', '+')}+freecodecamp+full+course",
              "type": "video",
              "channel": "freeCodeCamp.org"
            }}
          ],
          "projects": [
            {{
              "name": "Beginner {clean_skill} CLI App",
              "desc": "Build a command-line utility with file I/O",
              "difficulty": "Beginner",
              "youtubeUrl": "https://www.youtube.com/results?search_query={clean_skill.replace(' ', '+')}+beginner+project+tutorial",
              "channel": "YouTube"
            }}
          ],
          "isCompleted": false
        }}
      ],
      "weeklyPlan": [
        {{
          "week": 1,
          "title": "Week 1: Setup & Syntax",
          "tasks": ["Install runtime and IDE", "Complete Hello World", "Practice primitive types"],
          "completedTasks": []
        }}
      ],
      "interviewQuestions": [
        {{
          "question": "What are the core advantages of {clean_skill}?",
          "answer": "Detailed technical explanation...",
          "difficulty": "Medium"
        }}
      ],
      "cheatSheet": [
        {{
          "category": "Syntax & Basics",
          "snippet": "// Key snippet",
          "explanation": "Quick explanation"
        }}
      ]
    }}
    """
    system = "You are a master software educator. Return ONLY valid JSON with complete code snippets, detailed steps, and zero markdown formatting outside the JSON."
    
    result = await generate_ai_response(prompt, system)

    try:
        clean = result.strip()
        if clean.startswith("```"):
            clean = clean.split("\n", 1)[1] if "\n" in clean else clean[3:]
            clean = clean.rsplit("```", 1)[0]
        data = json.loads(clean)
        if data.get("phases") and len(data["phases"]) > 0:
            if "playground" not in data:
                data["playground"] = playground
            return data
    except Exception as e:
        print(f"[ROADMAP] AI parsing failed: {e}")

    # Fallback to rich pre-built roadmap database
    return get_curated_fallback_roadmap(clean_skill, level)


async def generate_topic_guide(skill: str, topic_name: str) -> dict:
    """
    On-demand deep dive explanation for any arbitrary topic clicked by the user.
    """
    playground = get_playground_url(skill)

    prompt = f"""
    Create an in-depth, step-by-step master guide for the topic "{topic_name}" in "{skill}".

    Provide:
    1. Senior Engineer deep-dive conceptual overview.
    2. "Explain Like I'm 5" (ELI5) concept using an everyday analogy.
    3. Step-by-step tutorial on how to implement/use it.
    4. Complete, runnable, syntax-highlighted code example.
    5. Top 3 common beginner mistakes and how to fix them.
    6. Best practices for production code.
    7. Direct documentation / reference links.

    Return ONLY a valid JSON object:
    {{
      "topic": "{topic_name}",
      "skill": "{skill}",
      "overview": "Senior engineer technical explanation...",
      "analogyExplanation": "Imagine you are running a restaurant kitchen...",
      "whyItMatters": "Why professional engineers use this...",
      "stepByStep": [
        "Step 1: ...",
        "Step 2: ...",
        "Step 3: ..."
      ],
      "codeSnippet": "Runnable code here...",
      "codeExplanation": "Breakdown of how the code works line-by-line...",
      "commonMistakes": [
        {{"mistake": "...", "fix": "..."}}
      ],
      "bestPractices": [
        "Best practice 1",
        "Best practice 2"
      ],
      "playgroundUrl": "{playground['url']}",
      "officialDocs": "https://docs.example.com"
    }}
    """
    system = "You are a senior tech lead. Return only valid JSON, no markdown outside JSON."
    result = await generate_ai_response(prompt, system)

    try:
        clean = result.strip()
        if clean.startswith("```"):
            clean = clean.split("\n", 1)[1] if "\n" in clean else clean[3:]
            clean = clean.rsplit("```", 1)[0]
        parsed = json.loads(clean)
        if "playgroundUrl" not in parsed:
            parsed["playgroundUrl"] = playground["url"]
        return parsed
    except Exception:
        return {
            "topic": topic_name,
            "skill": skill,
            "overview": f"Comprehensive guide to mastering {topic_name} in {skill}.",
            "analogyExplanation": f"Think of {topic_name} like a specialized power tool in a carpenter's workshop that handles specific tasks safely and rapidly.",
            "whyItMatters": "Crucial for writing clean, efficient, and maintainable software in real-world systems.",
            "stepByStep": [
                f"1. Understand the core principles of {topic_name}.",
                "2. Implement a minimal working demonstration in your local environment.",
                "3. Refactor and test edge cases and error handling."
            ],
            "codeSnippet": f"# Practice {topic_name} in {skill}\nprint('Mastering {topic_name}')",
            "codeExplanation": "Demonstrates basic initialization and execution flow.",
            "commonMistakes": [
                {"mistake": "Skipping edge case validation", "fix": "Always implement error boundaries and validate inputs."}
            ],
            "bestPractices": [
                "Keep functions modular and single-responsibility.",
                "Write unit tests for critical business logic."
            ],
            "playgroundUrl": playground["url"],
            "officialDocs": "https://developer.mozilla.org"
        }


def get_curated_fallback_roadmap(skill: str, level: str = "Beginner") -> dict:
    """
    Instant rich fallback roadmaps for popular technologies with setup guides,
    ELI5 analogies, runnable code snippets, phase quizzes, and YouTube links.
    """
    s = skill.lower().strip()
    encoded = skill.replace(" ", "+")
    playground = get_playground_url(skill)

    # PYTHON PRESET
    if "python" in s:
        return {
            "name": "Python",
            "overview": "Master Python from syntax fundamentals to building full-stack web applications, data pipelines, and AI systems.",
            "level": level,
            "estimatedWeeks": 8,
            "playground": playground,
            "setupGuide": {
                "prerequisites": ["Install Python 3.12+ from python.org", "Install Visual Studio Code", "Install VS Code Python Extension", "Install Git"],
                "installCommands": ["python --version", "pip install --upgrade pip", "python -m venv venv", "venv\\Scripts\\activate # On Windows"],
                "helloWorldCode": "# app.py\ndef main():\n    name = 'FluenceOS'\n    print(f'Hello, {name}! Ready to master Python.')\n\nif __name__ == '__main__':\n    main()",
                "explanation": "Python is an interpreted, high-level language known for clean syntax. The virtual environment (`venv`) keeps dependencies isolated for each project."
            },
            "phases": [
                {
                    "phase": 1,
                    "title": "Phase 1: Environment Setup & Core Syntax",
                    "duration": "2 weeks",
                    "goal": "Master primitive types, control flow, functions, and data structures",
                    "topics": [
                        {
                            "name": "Variables, Data Types & Formatting",
                            "shortDesc": "Integers, floats, strings, f-strings, booleans, and type hints",
                            "explanation": "Python is dynamically typed but supports type hints (PEP 484) to improve code quality and IDE autocompletion.",
                            "analogyExplanation": "Think of variables like labelled storage boxes in a room. Type hints are like labels telling you only to store shoes in the shoe box.",
                            "howToStart": "1. Create a script\n2. Declare variables with type hints\n3. Use formatted f-strings for clean output",
                            "codeSnippet": "user_name: str = 'Alex'\nage: int = 24\nis_learner: bool = True\n\nprint(f'User: {user_name}, Age: {age}, Active: {is_learner}')",
                            "commonMistakes": "Modifying mutable default arguments in functions.",
                            "docUrl": "https://docs.python.org/3/tutorial/introduction.html"
                        },
                        {
                            "name": "Data Structures: Lists, Dictionaries & Sets",
                            "shortDesc": "Efficient in-memory collections, slicing, and comprehension expressions",
                            "explanation": "Dictionaries provide O(1) average lookup. List and dictionary comprehensions allow writing clean, expressive data transformations in a single readable line.",
                            "analogyExplanation": "A dictionary is like a real-world phonebook or contact list: look up anyone's name (the key) and instantly get their phone number (the value) without reading every page.",
                            "howToStart": "1. Practice list indexing and slicing `[start:stop:step]`\n2. Iterate through dictionaries using `.items()`\n3. Write list comprehensions `[x*2 for x in nums]`",
                            "codeSnippet": "scores = {'math': 92, 'english': 88, 'coding': 98}\nhigh_scores = {k: v for k, v in scores.items() if v >= 90}\nprint(high_scores) # {'math': 92, 'coding': 98}",
                            "commonMistakes": "Using `list.remove()` inside an active loop without copying.",
                            "docUrl": "https://docs.python.org/3/tutorial/datastructures.html"
                        },
                        {
                            "name": "Functions, *args, **kwargs & Scope",
                            "shortDesc": "Defining modular functions, default parameters, and variable arguments",
                            "explanation": "Functions are first-class citizens in Python. They can be passed as arguments, returned from other functions, and decorated.",
                            "analogyExplanation": "A function is like a kitchen recipe or smoothie blender: give it ingredients (arguments), press start, and it gives you a finished smoothie (return value).",
                            "howToStart": "1. Define reusable functions with docstrings\n2. Use `*args` for variable positional arguments and `**kwargs` for keyword arguments",
                            "codeSnippet": "def calculate_stats(*numbers: float) -> dict:\n    if not numbers:\n        return {'count': 0, 'avg': 0.0}\n    return {'count': len(numbers), 'avg': sum(numbers) / len(numbers)}\n\nprint(calculate_stats(10, 20, 30, 40))",
                            "commonMistakes": "Forgetting that global variables cannot be modified in local scope without the `global` keyword.",
                            "docUrl": "https://docs.python.org/3/tutorial/controlflow.html#defining-functions"
                        }
                    ],
                    "quiz": [
                        {
                            "question": "Which of the following data types in Python is IMMUTABLE?",
                            "options": ["List", "Dictionary", "Tuple", "Set"],
                            "correctIndex": 2,
                            "explanation": "Tuples are immutable in Python; once created, their elements cannot be modified, added, or removed."
                        },
                        {
                            "question": "What is the output of `[x * 2 for x in [1, 2, 3] if x > 1]`?",
                            "options": ["[2, 4, 6]", "[4, 6]", "[2, 4]", "[6]"],
                            "correctIndex": 1,
                            "explanation": "Only 2 and 3 satisfy `x > 1`. Multiplying them by 2 yields `[4, 6]`."
                        },
                        {
                            "question": "What is the average time complexity for searching a key in a Python dictionary?",
                            "options": ["O(N)", "O(log N)", "O(1)", "O(N^2)"],
                            "correctIndex": 2,
                            "explanation": "Python dictionaries are implemented using hash tables, giving them O(1) constant average lookup time."
                        }
                    ],
                    "resources": [
                        {"title": "Python for Beginners Full Course – freeCodeCamp", "url": "https://www.youtube.com/watch?v=rfscVS0vtbw", "type": "video", "channel": "freeCodeCamp.org"},
                        {"title": "Python Crash Course – Traversy Media", "url": "https://www.youtube.com/watch?v=JJmcL1N2KQs", "type": "video", "channel": "Traversy Media"},
                        {"title": "Python for Everybody – Coursera (Certificate)", "url": "https://www.coursera.org/specializations/python", "type": "course", "channel": "Coursera"}
                    ],
                    "projects": [
                        {"name": "Personal Finance Tracker CLI", "desc": "CLI application that records expenses, parses CSVs, and computes monthly budget summaries", "difficulty": "Beginner", "youtubeUrl": "https://www.youtube.com/watch?v=DLn3jOsNRVE", "channel": "Tech With Tim"}
                    ],
                    "isCompleted": false
                },
                {
                    "phase": 2,
                    "title": "Phase 2: OOP, Modules & Error Handling",
                    "duration": "2 weeks",
                    "goal": "Build robust modular code with classes, inheritance, decorators, and custom exceptions",
                    "topics": [
                        {
                            "name": "Object-Oriented Programming (OOP)",
                            "shortDesc": "Classes, encapsulation, dunder methods (`__init__`, `__repr__`), and inheritance",
                            "explanation": "Classes model real-world domains. Dunder methods customize object behaviors like string representations and arithmetic operations.",
                            "analogyExplanation": "A class is like an architectural blueprint for a house; an object/instance is the actual physical house built from that blueprint.",
                            "howToStart": "1. Define a class with `__init__`\n2. Implement methods and properties (`@property`)\n3. Subclass with `super().__init__()`",
                            "codeSnippet": "class BankAccount:\n    def __init__(self, owner: str, balance: float = 0.0):\n        self.owner = owner\n        self._balance = balance\n\n    def deposit(self, amount: float) -> float:\n        if amount <= 0: raise ValueError('Amount must be positive')\n        self._balance += amount\n        return self._balance\n\nacc = BankAccount('Alex', 100)\nacc.deposit(50)\nprint(f'{acc.owner}: ${acc._balance}')",
                            "commonMistakes": "Not using `super()` properly during multiple inheritance.",
                            "docUrl": "https://docs.python.org/3/tutorial/classes.html"
                        }
                    ],
                    "quiz": [
                        {
                            "question": "What is the purpose of the `__init__` method in Python classes?",
                            "options": ["To destroy the object", "To initialize attributes when an instance is created", "To define class-level constants", "To import external modules"],
                            "correctIndex": 1,
                            "explanation": "`__init__` is the constructor method in Python called automatically when a new class instance is instantiated."
                        },
                        {
                            "question": "What happens if an exception is raised inside a `try` block and caught in an `except` block, and a `finally` block is present?",
                            "options": ["The finally block is skipped", "The finally block always runs regardless of exceptions", "The program crashes", "The except block runs twice"],
                            "correctIndex": 1,
                            "explanation": "The `finally` block always executes whether an exception was raised, caught, or not."
                        }
                    ],
                    "resources": [
                        {"title": "Python OOP Full Course – Corey Schafer", "url": "https://www.youtube.com/watch?v=ZDa-Z5JzLYM", "type": "video", "channel": "Corey Schafer"},
                        {"title": "Intermediate Python Programming – Mosh", "url": "https://www.youtube.com/watch?v=HGOBQPFzWKo", "type": "video", "channel": "Programming with Mosh"}
                    ],
                    "projects": [
                        {"name": "Web Scraper & Report Generator", "desc": "Scrapes dynamic web tables using BeautifulSoup/httpx and generates structured PDF/JSON reports", "difficulty": "Intermediate", "youtubeUrl": "https://www.youtube.com/watch?v=XVv6mJpFOb0", "channel": "freeCodeCamp.org"}
                    ],
                    "isCompleted": false
                },
                {
                    "phase": 3,
                    "title": "Phase 3: Web APIs & Database Engineering",
                    "duration": "2 weeks",
                    "goal": "Build production-ready async REST APIs with FastAPI, Pydantic, and PostgreSQL",
                    "topics": [
                        {
                            "name": "FastAPI, Pydantic & Async/Await",
                            "shortDesc": "High-performance asynchronous endpoints, request validation, and OpenAPI schemas",
                            "explanation": "FastAPI is built on Starlette and Pydantic, offering type-safe request validation and automatic Swagger documentation.",
                            "analogyExplanation": "An API is like a restaurant waiter taking your order ticket (request), passing it to the kitchen (database/server), and returning with your meal (JSON response).",
                            "howToStart": "1. `pip install fastapi uvicorn pydantic`\n2. Define Pydantic request/response schemas\n3. Run with `uvicorn main:app --reload`",
                            "codeSnippet": "from fastapi import FastAPI\nfrom pydantic import BaseModel\n\napp = FastAPI()\n\nclass Item(BaseModel):\n    title: str\n    price: float\n\n@app.post('/items')\nasync def create_item(item: Item):\n    return {'status': 'created', 'data': item}",
                            "commonMistakes": "Blocking async endpoints with synchronous blocking I/O calls (use `async with httpx` or run in threadpool).",
                            "docUrl": "https://fastapi.tiangolo.com/"
                        }
                    ],
                    "quiz": [
                        {
                            "question": "Why is FastAPI significantly faster than traditional WSGI frameworks like Flask/Django?",
                            "options": ["It doesn't use Python", "It is built on ASGI (Starlette/Uvicorn) with native async/await support", "It disables error checking", "It requires no CPU"],
                            "correctIndex": 1,
                            "explanation": "FastAPI is built natively on ASGI (Asynchronous Server Gateway Interface), allowing concurrent non-blocking request handling."
                        }
                    ],
                    "resources": [
                        {"title": "FastAPI Full Course 2024 – freeCodeCamp", "url": "https://www.youtube.com/watch?v=0sOvCWFmrtA", "type": "video", "channel": "freeCodeCamp.org"}
                    ],
                    "projects": [
                        {"name": "E-Commerce REST API with Auth", "desc": "Complete JWT-authenticated API with PostgreSQL database, password hashing, and payment webhook simulation", "difficulty": "Intermediate", "youtubeUrl": "https://www.youtube.com/watch?v=YZvRrldjf1Y", "channel": "Dennis Ivy"}
                    ],
                    "isCompleted": false
                },
                {
                    "phase": 4,
                    "title": "Phase 4: Production, Testing & Dockerization",
                    "duration": "2 weeks",
                    "goal": "Write automated unit tests with pytest, containerize with Docker, and deploy to cloud",
                    "topics": [
                        {
                            "name": "Pytest, Docker Containerization & CI/CD",
                            "shortDesc": "Unit testing, multi-stage Dockerfiles, and GitHub Actions automation",
                            "explanation": "Containerizing ensures parity between local dev and production servers.",
                            "analogyExplanation": "A Docker container is like a standardized shipping container: whether shipped by train, ship, or truck, the contents inside stay exactly the same and run everywhere.",
                            "howToStart": "1. Write tests in `test_app.py`\n2. Run `pytest -v`\n3. Create a `Dockerfile` and `docker compose up`",
                            "codeSnippet": "FROM python:3.12-slim\nWORKDIR /app\nCOPY requirements.txt .\nRUN pip install --no-cache-dir -r requirements.txt\nCOPY . .\nCMD [\"uvicorn\", \"app.main:app\", \"--host\", \"0.0.0.0\", \"--port\", \"8000\"]",
                            "commonMistakes": "Using huge base images instead of slim/alpine and not caching pip layer dependencies.",
                            "docUrl": "https://docs.pytest.org/en/stable/"
                        }
                    ],
                    "quiz": [
                        {
                            "question": "What is the primary benefit of containerizing a Python application with Docker?",
                            "options": ["It removes the need for Python", "It guarantees identical runtime environment across development and production servers", "It makes Python run 100x faster", "It eliminates all code bugs"],
                            "correctIndex": 1,
                            "explanation": "Docker bundles dependencies, OS libraries, and configurations into an immutable image that runs identically on any cloud host."
                        }
                    ],
                    "resources": [
                        {"title": "Docker for Python Developers – TechWorld with Nana", "url": "https://www.youtube.com/watch?v=3c-iBn73dDE", "type": "video", "channel": "TechWorld with Nana"}
                    ],
                    "projects": [
                        {"name": "Microservices Cloud Deployment", "desc": "Production-ready containerized service with Redis caching, PostgreSQL, and automated GitHub Actions CI/CD", "difficulty": "Advanced", "youtubeUrl": "https://www.youtube.com/watch?v=s_o8dwzRlu4", "channel": "TechWorld with Nana"}
                    ],
                    "isCompleted": false
                }
            ],
            "weeklyPlan": [
                {"week": 1, "title": "Week 1: Foundations", "tasks": ["Install Python 3.12 & VS Code", "Practice variables & f-strings", "Complete List & Dict exercises"], "completedTasks": []},
                {"week": 2, "title": "Week 2: Functions & CLI", "tasks": ["Write modular functions with type hints", "Build Personal Finance CLI project", "Push project to GitHub"], "completedTasks": []},
                {"week": 3, "title": "Week 3: OOP & Modules", "tasks": ["Design classes with encapsulation", "Practice decorators and context managers", "Write custom exceptions"], "completedTasks": []},
                {"week": 4, "title": "Week 4: Web Scraping & APIs", "tasks": ["Build Web Scraper project with httpx", "Parse JSON and generate summary reports", "Complete Phase 2 exercises"], "completedTasks": []},
                {"week": 5, "title": "Week 5: FastAPI & PostgreSQL", "tasks": ["Set up FastAPI & Pydantic schemas", "Connect asyncpg/SQLAlchemy to PostgreSQL", "Implement JWT auth endpoints"], "completedTasks": []},
                {"week": 6, "title": "Week 6: Full REST API Build", "tasks": ["Build complete E-commerce REST API", "Implement CRUD operations and validation", "Test with Postman & Swagger UI"], "completedTasks": []},
                {"week": 7, "title": "Week 7: Testing & Pytest", "tasks": ["Write automated pytest test suite", "Mock database connections with fixtures", "Achieve 85%+ test coverage"], "completedTasks": []},
                {"week": 8, "title": "Week 8: Docker & Deployment", "tasks": ["Write multi-stage Dockerfile", "Deploy container to Render / AWS", "Prepare portfolio and resume bullet points"], "completedTasks": []}
            ],
            "interviewQuestions": [
                {
                    "question": "What is the difference between mutable and immutable types in Python, and why does it matter?",
                    "answer": "Immutable types (int, float, str, tuple, frozenset) cannot have their internal state altered after creation. Any modification creates a new object in memory. Mutable types (list, dict, set) can be altered in-place. This is critical for function arguments: passing a mutable object allows the function to mutate the original caller's data unless copied.",
                    "difficulty": "Medium"
                },
                {
                    "question": "How does Python's GIL (Global Interpreter Lock) work, and how do you achieve true parallelism?",
                    "answer": "The GIL is a mutex that prevents multiple native threads from executing Python bytecodes simultaneously in CPython. For CPU-bound tasks, use the `multiprocessing` module or `ProcessPoolExecutor` to spawn separate processes with their own memory and interpreter. For I/O-bound tasks, `asyncio` or standard threading works effectively because the GIL is released during I/O wait.",
                    "difficulty": "Hard"
                }
            ],
            "cheatSheet": [
                {"category": "List Comprehension", "snippet": "evens = [x for x in range(10) if x % 2 == 0]", "explanation": "Clean filter and map in a single line"},
                {"category": "Dict Merge (Python 3.9+)", "snippet": "merged = {**dict_a, **dict_b} # or dict_a | dict_b", "explanation": "Merges two dictionaries with right-side precedence"},
                {"category": "Async Function", "snippet": "async def fetch_data():\n    async with httpx.AsyncClient() as client:\n        return await client.get(url)", "explanation": "Non-blocking async HTTP request"}
            ]
        }

    # GENERIC FALLBACK FOR ANY OTHER TECH
    return {
        "name": skill,
        "overview": f"Master-level structured learning roadmap and engineering guide for {skill}.",
        "level": level,
        "estimatedWeeks": 6,
        "playground": playground,
        "setupGuide": {
            "prerequisites": [f"Install official {skill} runtime/compiler", "Install Visual Studio Code", "Install recommended extensions", "Initialize Git repository"],
            "installCommands": [f"# Check {skill} installation", f"{s} --version || echo 'Setup complete'"],
            "helloWorldCode": f"// Hello World in {skill}\nconsole.log('Welcome to {skill} on FluenceOS');",
            "explanation": f"Make sure your environment PATH is configured and verify the version command in your terminal."
        },
        "phases": [
            {
                "phase": 1,
                "title": "Phase 1: Environment Setup & Core Foundations",
                "duration": "2 weeks",
                "goal": f"Understand core architecture, syntax, and foundational design patterns of {skill}.",
                "topics": [
                    {
                        "name": f"Core Architecture & Philosophy of {skill}",
                        "shortDesc": f"What makes {skill} powerful and how its runtime/engine works",
                        "explanation": f"Understanding the fundamental execution model and memory/state architecture of {skill}.",
                        "analogyExplanation": f"Think of {skill} like a high-performance engine: understanding how fuel (code) flows through the cylinders gives you complete control over speed and efficiency.",
                        "howToStart": f"1. Set up your workspace\n2. Run your first script\n3. Inspect compilation/execution output",
                        "codeSnippet": f"// Starter demonstration for {skill}\n// Focus on clean syntax and type safety",
                        "commonMistakes": "Skipping official documentation and jumping into frameworks prematurely.",
                        "docUrl": f"https://www.google.com/search?q={encoded}+official+docs"
                    }
                ],
                "quiz": [
                    {
                        "question": f"What is the first step when starting a new project in {skill}?",
                        "options": ["Skip setup", "Verify runtime installation & configure workspace", "Deploy directly", "Delete Git"],
                        "correctIndex": 1,
                        "explanation": "Verifying your local compiler/runtime and initializing project dependencies ensures clean development."
                    }
                ],
                "resources": [
                    {"title": f"{skill} Full Course for Beginners – freeCodeCamp", "url": f"https://www.youtube.com/results?search_query={encoded}+freecodecamp+full+course", "type": "video", "channel": "freeCodeCamp.org"}
                ],
                "projects": [
                    {"name": f"Beginner {skill} Project", "desc": f"Hands-on foundational project building a functional real-world utility with {skill}", "difficulty": "Beginner", "youtubeUrl": f"https://www.youtube.com/results?search_query={encoded}+beginner+project+tutorial", "channel": "YouTube"}
                ],
                "isCompleted": false
            }
        ],
        "weeklyPlan": [
            {"week": 1, "title": "Week 1: Setup & Foundations", "tasks": [f"Install {skill} environment", "Run Hello World", "Practice core syntax"], "completedTasks": []}
        ],
        "interviewQuestions": [
            {
                "question": f"What are the key architectural advantages of using {skill} in modern software engineering?",
                "answer": f"{skill} provides high developer velocity, strong community ecosystem, excellent tooling, and predictable runtime performance suitable for scalable systems.",
                "difficulty": "Medium"
            }
        ],
        "cheatSheet": [
            {"category": "Getting Started", "snippet": f"# Initialize project\n{s} init", "explanation": f"Initializes a new {skill} project workspace"}
        ]
    }
