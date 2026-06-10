# PlaceMate – Full Implementation Framework

## Overview

PlaceMate is a placement preparation platform that creates personalized N-day study plans by identifying a student's weak subjects through an assessment test and then generating AI-powered daily learning content. The core loop is: **Test → Diagnose → Plan → Learn → Track → Repeat**. This document provides a comprehensive, step-by-step implementation guide covering architecture, technology stack, and module-level development instructions.

***

## System Architecture

PlaceMate follows a **3-tier decoupled architecture**:

```
┌────────────────────────────────────────────────────────┐
│              CLIENT (Next.js / React)                  │
│  Assessment UI · Dashboard · Day-wise Player · MCQs   │
└─────────────────────┬──────────────────────────────────┘
                      │ REST / WebSocket
┌─────────────────────▼──────────────────────────────────┐
│              BACKEND (FastAPI – Python)                │
│  Auth · Test Engine · AI Planner · Content Engine     │
│  YouTube API · Progress Tracker · MCQ Generator       │
└─────────────────────┬──────────────────────────────────┘
                      │ SDK / ORM
┌─────────────────────▼──────────────────────────────────┐
│              DATA LAYER                                │
│  Firebase Firestore (user data, plans, progress)      │
│  Firebase Auth (Google / Email login)                 │
│  Gemini API (plan + notes + MCQ generation)           │
│  YouTube Data API v3 (curated video search)           │
└────────────────────────────────────────────────────────┘
```

***

## Technology Stack

| Layer | Technology | Reason |
|---|---|---|
| Frontend | Next.js 14 (App Router) + TypeScript | SSR, file-based routing, fast DX |
| Styling | Tailwind CSS v4 | Utility-first, design tokens |
| Backend | FastAPI (Python 3.11+) | Async, clean REST, Pydantic validation |
| Database | Firebase Firestore | NoSQL, real-time, scalable |
| Auth | Firebase Authentication | OAuth (Google), email/password |
| AI Model (Core) | Gemini 1.5 Flash | Study plan generation, notes, MCQ creation |
| AI Model (Future) | Gemini 2.0 Flash Lite | Reserved for low-latency voice evaluation module |
| Video Search | YouTube Data API v3 | Curated topic-wise video curation |
| Deployment (FE) | Vercel | CI/CD from GitHub |
| Deployment (BE) | Google Cloud Run | Containerized FastAPI, auto-scale |
| Environment Config | Python-dotenv / Vercel Env Vars | Secrets management |

***

## Module Breakdown & Implementation Steps

### Module 1 – Project Setup & Infrastructure

**Step 1.1 – Repository Structure**

```
placemate/
├── frontend/           ← Next.js App
│   ├── app/
│   │   ├── (auth)/
│   │   ├── dashboard/
│   │   ├── test/
│   │   ├── plan/
│   │   └── day/[dayId]/
│   ├── components/
│   ├── lib/            ← Firebase, API clients
│   └── types/
├── backend/            ← FastAPI Service
│   ├── routers/
│   │   ├── auth.py
│   │   ├── test.py
│   │   ├── plan.py
│   │   ├── content.py
│   │   └── progress.py
│   ├── services/
│   │   ├── ai_service.py
│   │   ├── youtube_service.py
│   │   └── mcq_service.py
│   ├── models/
│   ├── main.py
│   └── requirements.txt
└── README.md
```

**Step 1.2 – Environment Setup**

Create a `.env` file in the backend with:
```
GEMINI_API_KEY=<your_key>
YOUTUBE_API_KEY=<your_key>
FIREBASE_SERVICE_ACCOUNT=<path_to_json>
```

Create `.env.local` in the frontend with:
```
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

**Step 1.3 – Firebase Initialization**

- Create a Firebase project at console.firebase.google.com
- Enable Firestore (Native mode) and Firebase Authentication
- Enable Google Sign-in provider
- Download service account JSON for backend SDK use

***

### Module 2 – Authentication

**Frontend (Next.js + Firebase Auth)**

```ts
// lib/firebase.ts
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = () => signInWithPopup(auth, googleProvider);
```

- Wrap the app in an `AuthProvider` context that listens to `onAuthStateChanged`
- Protect routes with a `<ProtectedRoute>` component that redirects to login if no user

**Backend (FastAPI)**

```python
# middleware/auth.py
from firebase_admin import auth as firebase_auth

def verify_token(token: str) -> dict:
    decoded = firebase_admin.auth.verify_id_token(token)
    return decoded  # contains uid, email
```

- Every protected route receives `Authorization: Bearer <firebase_token>` header
- Extract `uid` from the decoded token to scope all Firestore operations per user

***

### Module 3 – Assessment Test Engine

This is the core entry point. The test presents mixed-subject MCQs and calculates per-subject scores.

**Step 3.1 – Question Bank (Firestore)**

Firestore collection `questions`:
```
questions/
  {questionId}/
    subject: "DSA" | "OS" | "DBMS" | "CN" | "Aptitude"
    topic: "Arrays" | "Deadlocks" | ...
    question: "..."
    options: ["A", "B", "C", "D"]
    correct_answer: "B"
    difficulty: "easy" | "medium" | "hard"
```

Seed the database with at least 20 questions per subject. Structure questions across difficulty levels.

**Step 3.2 – Test Serving API**

```python
# routers/test.py
@router.get("/test/questions")
async def get_test_questions():
    # Fetch N questions per subject from Firestore
    # Shuffle and return as a flat list
    pass

@router.post("/test/submit")
async def submit_test(answers: AnswerSubmission, uid: str = Depends(get_uid)):
    # Compare submitted answers with correct_answer
    # Calculate per-subject score as percentage
    # Store result in Firestore under users/{uid}/testResults/{testId}
    # Return subject-wise scores
    pass
```

**Step 3.3 – Weak Subject Identification**

```python
def identify_weak_subjects(subject_scores: dict) -> list[str]:
    avg = sum(subject_scores.values()) / len(subject_scores)
    # Subjects below the average score (or below 60%) are flagged as weak
    return [s for s, score in subject_scores.items() if score < avg or score < 60]
```

Return the weak subjects list to the frontend so the user can see their diagnostics.

**Frontend: Test UI**

- Multi-step question flow using React state (not page navigation)
- Show one question at a time with a progress bar
- Timer (optional) per question or overall
- On submit, display a **Results Screen** with a bar chart of subject-wise scores (use Chart.js or Recharts)
- Highlight weak subjects in red; strong ones in green

***

### Module 4 – Topic Selection

After weak subjects are identified, present topic checkboxes to the user.

**Predefined Topic Map (hardcoded in frontend/config)**

```ts
// config/topicMap.ts
export const TOPIC_MAP: Record<string, string[]> = {
  DSA: ["Arrays", "Linked Lists", "Trees", "Graphs", "DP", "Sorting", "Hashing"],
  OS: ["Processes", "Threads", "Memory Management", "Deadlocks", "Scheduling"],
  DBMS: ["SQL", "Normalization", "Transactions", "Indexing", "ER Models"],
  CN: ["OSI Model", "TCP/IP", "DNS", "HTTP", "Routing", "Subnetting"],
  Aptitude: ["Number Systems", "Probability", "Time & Work", "Permutations"],
};
```

- Show only the topics belonging to the identified weak subjects
- Allow multi-select via checkboxes
- User must select at least 1 topic to proceed

***

### Module 5 – Plan Configuration

Present a simple form to capture:
- Number of study days (slider or input: 7 / 14 / 30 / custom)
- Hours per day (1–8 hours)

Store this config in state alongside selected topics and weak subjects.

***

### Module 6 – AI-Based Study Plan Generation

This is the most critical backend service.

**Step 6.1 – Prompt Engineering**

```python
# services/ai_service.py
import google.generativeai as genai

def build_plan_prompt(weak_subjects, topics, days, hours_per_day):
    return f"""
You are an expert placement preparation coach.

Generate a {days}-day personalized study plan for the following:
- Weak subjects: {', '.join(weak_subjects)}
- Topics to cover: {', '.join(topics)}
- Study time: {hours_per_day} hours per day

Return a valid JSON array of {days} day objects with this exact structure:
[
  {{
    "day": 1,
    "subject": "DSA",
    "topics": ["Arrays", "Linked Lists"],
    "learning_objectives": ["Understand time complexity", "Solve 2-pointer problems"],
    "notes_summary": "Brief 5-10 line summary of today's topics...",
    "youtube_search_query": "DSA Arrays Linked Lists for placement interviews"
  }},
  ...
]

Rules:
- Distribute topics evenly across days
- Progress from fundamentals to advanced
- Each day covers 1-2 closely related topics only
- Notes summary must be self-contained and clear
- youtube_search_query must be specific and concise
"""
```

**Step 6.2 – Calling Gemini API**

```python
async def generate_study_plan(weak_subjects, topics, days, hours_per_day):
    genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
    # Gemini 1.5 Flash — core model for plan/notes/MCQ generation
    model = genai.GenerativeModel("gemini-1.5-flash")
    
    prompt = build_plan_prompt(weak_subjects, topics, days, hours_per_day)
    response = model.generate_content(prompt)
    
    raw_text = response.text
    # Strip markdown code fences if present
    clean = raw_text.strip().removeprefix("```json").removesuffix("```").strip()
    return json.loads(clean)
```

**Step 6.3 – Storing the Plan**

```
Firestore path: users/{uid}/plans/{planId}/
  created_at: timestamp
  days: N
  hours_per_day: H
  weak_subjects: [...]
  selected_topics: [...]
  status: "active"
  
  days_content/ (subcollection)
    {dayId}/
      day_number: 1
      subject: "DSA"
      topics: [...]
      notes: "..."
      youtube_query: "..."
      video_urls: []      ← populated after YouTube API call
      mcqs: []            ← populated after MCQ generation
      is_unlocked: false  ← true only for day 1 initially
      is_completed: false
```

**Step 6.4 – FastAPI Plan Endpoint**

```python
@router.post("/plan/generate")
async def generate_plan(config: PlanConfig, uid: str = Depends(get_uid)):
    plan_data = await generate_study_plan(
        config.weak_subjects,
        config.topics,
        config.days,
        config.hours_per_day
    )
    # Store in Firestore
    # Unlock Day 1 immediately
    # Trigger background tasks: fetch YouTube videos + generate MCQs
    plan_id = store_plan_in_firestore(uid, plan_data)
    return {"plan_id": plan_id, "days": len(plan_data)}
```

Use FastAPI `BackgroundTasks` to asynchronously enrich each day's content with YouTube videos and MCQs after the initial plan is stored, so the user isn't kept waiting.

***

### Module 7 – YouTube Video Curation

**Step 7.1 – YouTube Data API v3 Integration**

```python
# services/youtube_service.py
from googleapiclient.discovery import build

def fetch_videos_for_topic(query: str, max_results: int = 3) -> list[dict]:
    youtube = build("youtube", "v3", developerKey=os.getenv("YOUTUBE_API_KEY"))
    
    response = youtube.search().list(
        part="snippet",
        q=query,
        type="video",
        maxResults=max_results,
        relevanceLanguage="en",
        videoEmbeddable="true"
    ).execute()
    
    return [
        {
            "title": item["snippet"]["title"],
            "video_id": item["id"]["videoId"],
            "thumbnail": item["snippet"]["thumbnails"]["medium"]["url"],
            "channel": item["snippet"]["channelTitle"]
        }
        for item in response.get("items", [])
    ]
```

- Call this function for each day using the `youtube_search_query` generated by Gemini
- Store the resulting video list in Firestore under `days_content/{dayId}/video_urls`
- Display videos as embedded YouTube iframes in the frontend

***

### Module 8 – MCQ Generation

**Step 8.1 – AI MCQ Generator**

```python
# services/mcq_service.py
def generate_mcqs_for_day(subject: str, topics: list[str], count: int = 5) -> list[dict]:
    prompt = f"""
Generate {count} multiple choice questions for a placement exam on the following:
- Subject: {subject}
- Topics: {', '.join(topics)}

Return a valid JSON array:
[
  {{
    "question": "...",
    "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
    "correct": "B",
    "explanation": "Brief explanation of why B is correct"
  }}
]

Questions must be placement-exam level, concept-testing, not trivial.
"""
    # Gemini 1.5 Flash — consistent with core model strategy
    model = genai.GenerativeModel("gemini-1.5-flash")
    response = model.generate_content(prompt)
    clean = response.text.strip().removeprefix("```json").removesuffix("```").strip()
    return json.loads(clean)
```

This approach mirrors the **MCQG-SRefine** methodology — using an LLM to generate high-quality, placement-relevant MCQs and providing explanations for wrong answers, which reinforces active learning over passive consumption.

***

### Module 9 – Daily Content Player (Frontend)

The day view is the heart of the product. Each unlocked day exposes three tabs:

**Tab 1: Video Learning**
- Render 2-3 embedded YouTube iframes (`youtube.com/embed/{videoId}`)
- Mark video as watched on click/play event
- All 3 videos must be interacted with to enable "Mark Day Complete"

**Tab 2: Summarized Notes**
- Render AI-generated notes as styled Markdown (`react-markdown` + `remark-gfm`)
- Include a "Copy Notes" and "Download Notes" button for student convenience

**Tab 3: MCQ Practice**
- Present one question at a time, with 4 radio buttons
- On submit: reveal correct answer + explanation with color-coded feedback (green/red)
- Track per-day MCQ score and store in Firestore
- Must attempt all MCQs to unlock the "Complete Day" button

**Day Completion Logic (Backend)**
```python
@router.post("/plan/{plan_id}/day/{day_number}/complete")
async def complete_day(plan_id: str, day_number: int, uid: str = Depends(get_uid)):
    # 1. Mark current day as is_completed = true
    # 2. Unlock next day: is_unlocked = true for day_number + 1
    # 3. Update overall plan progress
    pass
```

***

### Module 10 – Progressive Unlock System

This system enforces linear learning and prevents students from jumping ahead.

**Firestore Rule (Security)**
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/plans/{planId}/days_content/{dayId} {
      allow read: if request.auth.uid == userId 
                    && resource.data.is_unlocked == true;
    }
  }
}
```

**Frontend Enforcement**

```tsx
// components/DayCard.tsx
<DayCard
  day={day}
  isLocked={!day.is_unlocked}
  onClick={day.is_unlocked ? () => navigateToDay(day.day_number) : undefined}
/>
```

- Locked days show a padlock icon and a "Complete Day N to unlock" message
- Completed days show a green checkmark
- The current active day is highlighted with a pulsing indicator

***

### Module 11 – Progress Tracking

**Firestore Structure**

```
users/{uid}/progress/
  current_plan_id: "abc123"
  total_days: 14
  days_completed: 6
  completion_percentage: 42.8
  mcq_scores: { "day_1": 4/5, "day_2": 3/5, ... }
  last_active: timestamp
```

**Dashboard UI Elements**

- **Circular progress ring** showing overall plan completion percentage
- **Streak counter** – days completed in a row
- **MCQ accuracy chart** – line chart across days (Recharts `<LineChart>`)
- **Subject coverage breakdown** – horizontal bar showing topics covered vs remaining
- **Estimated completion date** based on current pace

***

### Module 12 – Completion & Continuous Loop

When all N days are completed:

1. Show a **Completion Screen** with confetti animation (use `canvas-confetti`)
2. Display final stats: total days completed, average MCQ score, subjects mastered
3. Offer two next actions:
   - **"Take New Assessment Test"** → restart the entire flow
   - **"Create New Plan"** → skip test, go directly to topic selection

This loop structure mirrors the **closed-loop continuous improvement** pattern validated in research on mastery-based adaptive learning systems.

***

## API Reference Summary

| Method | Endpoint | Description |
|---|---|---|
| GET | `/test/questions` | Fetch mixed-subject test questions |
| POST | `/test/submit` | Submit answers, get subject-wise scores |
| POST | `/plan/generate` | Generate AI study plan |
| GET | `/plan/{planId}` | Fetch full plan with day statuses |
| GET | `/plan/{planId}/day/{n}` | Get day content (videos, notes, MCQs) |
| POST | `/plan/{planId}/day/{n}/complete` | Mark day complete, unlock next |
| GET | `/progress/{uid}` | Fetch user's overall progress |

***

## Firestore Collections Map

| Collection Path | Purpose |
|---|---|
| `users/{uid}` | User profile, current plan ID |
| `users/{uid}/testResults/{id}` | Historical test scores |
| `users/{uid}/plans/{planId}` | Study plan metadata |
| `users/{uid}/plans/{planId}/days_content/{dayId}` | Per-day content + unlock status |
| `users/{uid}/progress` | Aggregated progress and streaks |
| `questions/{questionId}` | Assessment question bank |

***

## Development Phases

> **Internship Timeline: June 1 – June 30, 2026 (4 weeks)**

### Phase 1 – Foundation (Week 1 · Jun 1–7)
- [ ] Firebase project setup (Auth + Firestore)
- [ ] FastAPI boilerplate with Firebase Admin SDK
- [ ] Next.js app with Auth flow (Google login)
- [ ] Question bank seeding script (20+ questions per subject)

### Phase 2 – Core Flow (Week 2 · Jun 8–14)
- [ ] Assessment test UI + backend scoring
- [ ] Weak subject detection algorithm
- [ ] Topic selection + plan configuration UI
- [ ] Gemini 1.5 Flash plan generation endpoint + Firestore storage

### Phase 3 – Content Engine (Week 3 · Jun 15–21)
- [ ] YouTube API integration + background video fetch
- [ ] Gemini 1.5 Flash MCQ generation per day
- [ ] Day player UI (Videos + Notes + MCQs tabs)
- [ ] Progressive unlock logic (backend + frontend)

### Phase 4 – Progress & Polish (Week 4 · Jun 22–30)
- [ ] Progress dashboard with charts
- [ ] Completion screen + continuous loop
- [ ] Firestore security rules
- [ ] Deployment: Cloud Run (backend) + Vercel (frontend)
- [ ] Final testing, bug fixes, and documentation

***

## Key Design Decisions

### Why Gemini over OpenAI?
Given the project targets Google Cloud deployment, Gemini integrates natively with GCP with no cross-platform friction, lower latency within the GCP ecosystem, and a generous free tier suitable for a student-scale project.

### Gemini Model Strategy (Two-Tier)
PlaceMate uses a deliberate two-model approach:
- **Gemini 1.5 Flash** – All current features: study plan generation, AI notes summarization, and MCQ creation. Chosen for its strong instruction-following, JSON output reliability, and cost efficiency at student scale.
- **Gemini 2.0 Flash Lite** – Reserved exclusively for the planned **voice evaluation module** (see Future Enhancements). Its lower latency profile makes it suitable for near-real-time spoken answer scoring in mock interviews.

This separation ensures the current implementation remains stable and well-tested, while the architecture is ready to absorb the voice module without refactoring the core pipeline.

### Why YouTube API over embedding third-party platforms?
YouTube Data API v3 gives programmatic search results keyed to the exact topic query generated by Gemini. This means each day's videos are freshly curated to the specific topic — not a static playlist.

### Why Progressive Unlock?
Research shows that unrestricted access encourages skipping ahead, reducing long-term knowledge retention. The progressive system mirrors mastery-gated curricula proven effective in adaptive learning literature, where students must demonstrate engagement before advancing.

### Why Firestore over a relational DB?
User-specific nested plans (user → plan → day → content) map naturally to Firestore's document-subcollection model. Real-time listeners enable live progress updates without polling.

***

## Security Checklist

- [ ] All backend routes validate Firebase ID token before processing
- [ ] Firestore security rules enforce per-user data isolation
- [ ] API keys stored only in server-side environment variables (never exposed to client)
- [ ] YouTube API key restricted to server-side only (not `NEXT_PUBLIC_`)
- [ ] Gemini API key used only in backend service layer
- [ ] Rate limiting on plan generation endpoint (prevent API abuse)

***

## Future Enhancements

The following capabilities are referenced in the literature survey as motivating prior work but are **explicitly out of scope** for the June 2026 internship deliverable. They are documented here as the intended next phase of development.

### Voice Mock Interview Module
Inspired by MockLLM (Naing et al.) and high-fidelity voice simulation research, this module would extend PlaceMate with:
- **Speech-to-Text**: Deepgram API to transcribe spoken interview answers in real time
- **Answer Evaluation**: Gemini 2.0 Flash Lite to score transcribed responses against expected criteria (low-latency path)
- **Text-to-Speech Feedback**: Synthesized interviewer follow-up questions
- **New Backend Service**: `services/voice_service.py` + `/interview/session` WebSocket endpoint
- **New Frontend**: `app/interview/` page with microphone capture and live transcript display

### GRPO-Based Trajectory Optimization
Inspired by Pxplore and reinforcement learning from human feedback (RLHF) research, this enhancement would:
- Use Group Relative Policy Optimization (GRPO) to fine-tune the plan generation model based on student outcome signals (MCQ scores, day completion rates)
- Implement a feedback loop: completed plan data → reward signal → updated prompt strategy
- Requires a training infrastructure (e.g., Vertex AI custom training jobs) beyond the current serverless scope

> **Note for report alignment:** The literature survey references these features to contextualize PlaceMate within the broader adaptive learning research landscape. The current implementation delivers the core test-diagnose-plan-learn loop; the above represent the natural evolution of the platform post-internship.