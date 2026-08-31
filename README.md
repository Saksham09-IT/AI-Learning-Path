# AI-Powered Personalized Learning Path Recommender

A functional MVP based on:
- learner interests, current skills, experience and goals
- **strict prerequisite-based, chronological roadmap ordering**
- TF-IDF similarity used only to rank/recommend resources *within* the
  learner's currently unlocked stage — never to reorder the path
- skill-gap analysis
- adaptive recommendations and a progress dashboard, driven by completed skills
- FastAPI backend
- React frontend

## Architecture

This version splits recommendation into two engines, so similarity
scores can never push an advanced course ahead of its prerequisites:

```
                 USER INPUT
                     |
       Goal + Skills + Interests + Experience
                     |
             LEARNER PROFILER
                     |
            SKILL GAP ANALYSIS
                     |
     +---------------+----------------+
     |                                |
ENGINE 1: Chronological Roadmap   ENGINE 2: AI Recommendation (TF-IDF)
  - prerequisite graph              - ranks catalog resources for the
  - basic -> intermediate ->          skills currently unlocked
    advanced ordering               - explains *why* a resource fits
  - decides the SEQUENCE            - never decides ORDER
     |                                |
     +---------------+----------------+
                     |
          NEXT VALID RECOMMENDATION
                     |
            USER COMPLETES STEP
                     |
             PROGRESS UPDATED
                     |
           DASHBOARD VISUALIZATION
                     |
        NEXT SKILL AUTOMATICALLY UNLOCKED
```

### Dashboard

`/recommend` (and `/complete`) now return, alongside the existing fields:

- `skill_status`: every required skill tagged `completed` / `in_progress`
  / `next` / `locked`
- `current_position`: completed count, current skill, next skill,
  remaining count, estimated weeks remaining
- `progress_chart`: cumulative % at each upcoming milestone, for the
  progress visualization
- `roadmap`: now a **strictly single-track, chronological** sequence
  (one skill at a time, lowest difficulty level first among skills
  that are currently eligible)

The frontend renders all of this as a dashboard: an overall progress
bar, a "current position" summary, a milestone chart, and a skill
status table, plus a "Mark Complete" button on the active step that
re-runs the roadmap.

## Run backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

Backend API: http://127.0.0.1:8000/docs

## Run frontend

```bash
cd frontend
npm install
npm run dev
```

Open the URL shown by Vite.

## API key
No external AI API key is required for this MVP. The recommendation engine is
deterministic (prerequisite graph) plus TF-IDF for resource ranking.
An LLM can later be connected to `/chat` for more advanced natural-language
conversation.
