# PlaceMate

An AI-powered placement preparation platform that helps students prepare through personalized learning plans based on their strengths and weaknesses.

Instead of following a generic study schedule, PlaceMate analyzes a student's assessment performance, identifies weak subjects, and generates a structured study plan. The platform provides AI-generated notes, curated YouTube videos, topic-wise MCQs, and progress tracking to support continuous improvement.

---

## Features

- Google Authentication using Firebase
- Placement assessment across multiple subjects
- Automatic weak subject identification
- Personalized AI-generated study plans
- Configurable study duration and daily study hours
- AI-generated notes for each topic
- Curated YouTube video recommendations
- Topic-wise MCQ practice
- Daily progress tracking
- Progressive content unlocking based on completed tasks
- Interactive dashboard to monitor learning progress

---

## Workflow

1. Sign in using Google Authentication.
2. Take the placement assessment or choose a subject directly.
3. The system identifies weak subjects based on assessment performance.
4. Select topics to focus on.
5. Configure study duration and daily study hours.
6. AI generates a personalized day-wise study plan.
7. Access daily learning content:
   - AI-generated Notes
   - YouTube Videos
   - MCQ Practice
8. Complete daily tasks to unlock the next day's content.
9. Track progress through the dashboard.
10. Retake the assessment and generate a new learning plan if required.

---

## Tech Stack

### Frontend
- Next.js
- Tailwind CSS

### Backend
- FastAPI
- Python

### Database & Authentication
- Firebase Firestore
- Firebase Authentication

### AI & APIs
- Gemini
- Grok
- YouTube Data API

---

## Project Structure

```
PlaceMate
│
├── frontend/
│   ├── app/
│   ├── components/
│   ├── lib/
│   └── public/
│
├── backend/
│   ├── api/
│   ├── services/
│   ├── models/
│   ├── utils/
│   └── main.py
│
└── README.md
```

---

## Installation

### Clone the repository

```bash
git clone https://github.com/Aaron-Coutinho/PlaceMate.git
cd PlaceMate
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Backend

```bash
cd backend

# Activate virtual environment

# Windows
.\venv\Scripts\activate

# Run the FastAPI server
uvicorn main:app --reload
```

## Future Improvements

- Enhanced AI recommendations
- More placement preparation topics
- Additional analytics for learning progress
- Expanded educational content

---

## Authors

- David Almeida
- Aaron Coutinho
