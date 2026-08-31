"""
AI Learning Path Recommender - backend

Two-engine architecture:

  Engine 1 - Chronological Roadmap Engine
      Decides WHAT ORDER skills are learned in. Pure prerequisite-graph
      + difficulty-level logic. TF-IDF plays no part in ordering.

  Engine 2 - AI Recommendation Engine (TF-IDF)
      Decides WHICH RESOURCES/COURSES to suggest for the skill(s) the
      learner is unlocked to study right now, and explains *why*. It
      never reorders the roadmap.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from datetime import datetime, timedelta, date
from typing import List, Optional
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import linear_kernel
import json
from pathlib import Path

BASE = Path(__file__).resolve().parent


def _load(name: str):
    """Look in ./data first, then fall back to the backend root so the
    API still boots if the JSON files were dropped next to main.py."""
    candidate = BASE / "data" / name
    if not candidate.exists():
        candidate = BASE / name
    return json.loads(candidate.read_text())


catalog = _load("learning_catalog.json")
goal_skills = _load("goal_skills.json")

LEVEL_RANK = {"Beginner": 0, "Intermediate": 1, "Advanced": 2}
CATALOG_INDEX = {c["id"]: i for i, c in enumerate(catalog)}

app = FastAPI(title="AI Learning Path Recommender", version="2.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class LearnerProfile(BaseModel):
    name: str = "Learner"
    goal: str
    start_date: str
    interests: List[str] = []
    current_skills: List[str] = []
    completed_courses: List[str] = []
    experience_level: str = "Beginner"
    hours_per_week: int = Field(default=10, ge=1, le=80)
    feedback: Optional[str] = ""


def norm(x):
    return str(x).strip().lower()


def canonical_goal(goal: str):
    for g in goal_skills:
        if norm(g) == norm(goal):
            return g
    for g in goal_skills:
        if norm(goal) in norm(g) or norm(g) in norm(goal):
            return g
    return None


# ---------------------------------------------------------------------------
# Skill -> course lookup (a skill is "taught" by the first catalog entry
# that lists it). Used by both engines.
# ---------------------------------------------------------------------------
def _skill_course_map():
    mapping = {}
    for c in catalog:
        for s in c["skills"]:
            mapping.setdefault(norm(s), c)
    return mapping


SKILL_COURSE = _skill_course_map()


def course_for(skill: str):
    return SKILL_COURSE.get(norm(skill))


# ---------------------------------------------------------------------------
# Engine 1: Chronological Roadmap Engine
#
# Produces a strictly ordered, single-track sequence of skills:
#   - a skill only becomes eligible once every prerequisite is known
#   - among eligible skills, the lowest difficulty level goes first
#   - ties are broken by catalog order, so the sequence is deterministic
# TF-IDF similarity is never consulted here.
# ---------------------------------------------------------------------------
def build_chronological_order(missing_skills: List[str], known: set) -> List[str]:
    available = set(known)
    remaining = list(dict.fromkeys(missing_skills))  # de-dupe, keep order
    ordered = []

    def sort_key(skill):
        c = course_for(skill)
        if not c:
            return (LEVEL_RANK.get("Intermediate", 1), 999)
        return (LEVEL_RANK.get(c["level"], 1), CATALOG_INDEX.get(c["id"], 999))

    while remaining:
        ready = []
        for skill in remaining:
            c = course_for(skill)
            prereqs = c["prerequisites"] if c else []
            if all(norm(p) in available for p in prereqs):
                ready.append(skill)
        if not ready:
            # Prerequisite info is incomplete/cyclical - fall back to the
            # next skill in list order rather than stalling the roadmap.
            ready = [remaining[0]]
        ready.sort(key=sort_key)
        chosen = ready[0]
        ordered.append(chosen)
        available.add(norm(chosen))
        remaining.remove(chosen)

    return ordered


def build_roadmap(
    ordered_skills: List[str],
    start_date: date,
    hours_per_week: int
):
    roadmap = []
    current_date = start_date
    DEFAULT_HOURS_PER_WEEK = 10

    for i, skill in enumerate(ordered_skills, start=1):
        c = course_for(skill)
        base_duration = c["duration_weeks"] if c else 2

        adjusted_duration = max(
            1,
            round(
                base_duration * DEFAULT_HOURS_PER_WEEK /
                max(hours_per_week, 1)
            )
        )

        skill_start_date = current_date
        skill_end_date = current_date + timedelta(
            weeks=adjusted_duration
        ) - timedelta(days=1)

        current_date = skill_end_date + timedelta(days=1)
        roadmap.append({
            "milestone": i,
            "skill": skill,
            "start_date": skill_start_date.strftime("%d-%m-%Y"),
            "end_date": skill_end_date.strftime("%d-%m-%Y"),
            "estimated_weeks": adjusted_duration,
            "course": c["title"] if c else skill,
            "level": c["level"] if c else "Intermediate",
            "duration_weeks": c["duration_weeks"] if c else 0,
            "prerequisites": c["prerequisites"] if c else [],
            "project": c["project"] if c else "",
        })
    return roadmap


def build_skill_status(required: List[str], known: set, ordered_missing: List[str]):
    """completed / in_progress / next / locked for every required skill,
    driven purely by position in the chronological sequence."""
    position = {s: i for i, s in enumerate(ordered_missing)}
    status = []
    for skill in required:
        c = course_for(skill)
        if norm(skill) in known:
            state = "completed"
        else:
            idx = position.get(skill)
            if idx == 0:
                state = "in_progress"
            elif idx == 1:
                state = "next"
            else:
                state = "locked"
        status.append({
            "skill": skill,
            "status": state,
            "level": c["level"] if c else "Intermediate",
            "duration_weeks": c["duration_weeks"] if c else 0,
        })
    return status


def build_progress_chart(total_required: int, completed_count: int, ordered_missing: List[str]):
    if total_required == 0:
        return [{"label": "Start", "percent": 100.0}]
    chart = [{
        "label": "Start",
        "percent": round(completed_count / total_required * 100, 1),
    }]
    running = completed_count
    for skill in ordered_missing:
        running += 1
        chart.append({
            "label": skill,
            "percent": round(min(running, total_required) / total_required * 100, 1),
        })
    return chart


def build_current_position(ordered_missing: List[str], completed_count: int):
    remaining_weeks = 0
    for skill in ordered_missing:
        c = course_for(skill)
        remaining_weeks += c["duration_weeks"] if c else 0
    return {
        "completed_count": completed_count,
        "current_skill": ordered_missing[0] if ordered_missing else None,
        "next_skill": ordered_missing[1] if len(ordered_missing) > 1 else None,
        "remaining_count": len(ordered_missing),
        "estimated_weeks_remaining": remaining_weeks,
    }


# ---------------------------------------------------------------------------
# Engine 2: AI Recommendation Engine (TF-IDF)
#
# Ranks catalog resources by relevance to the learner's interests/feedback
# and to whichever skills are currently unlocked (the front of the
# chronological queue). It only ever picks *among already-unlocked* work -
# it cannot promote an advanced course ahead of its prerequisites.
# ---------------------------------------------------------------------------
def build_vectorizer():
    docs = []
    for c in catalog:
        docs.append(" ".join([
            c["title"], c["level"],
            " ".join(c["skills"]),
            " ".join(c["tags"]),
            " ".join(c["prerequisites"])
        ]))
    v = TfidfVectorizer(stop_words="english", ngram_range=(1, 2), sublinear_tf=True)
    matrix = v.fit_transform(docs)
    return v, matrix


vectorizer, course_matrix = build_vectorizer()


def recommend_resources(profile: LearnerProfile, known: set, ordered_missing: List[str], top_n=6):
    
    """Rank courses for the skills at the front of the queue (the unlocked
    horizon). Similarity influences *which resource/explanation* is
    surfaced, never the order the learner must follow."""
    
    horizon = set(norm(s) for s in ordered_missing[:3])  # current + next couple
    query = " ".join([
        profile.goal,
        " ".join(profile.interests),
        " ".join(ordered_missing[:3]),
        profile.experience_level,
        profile.feedback or "",
    ])
    sims = linear_kernel(vectorizer.transform([query]), course_matrix).flatten()

    ranked = []
    for idx in sims.argsort()[::-1]:
        c = catalog[int(idx)]
        course_skills = {norm(s) for s in c["skills"]}
        if course_skills and course_skills.issubset(known):
            continue  # already fully known
        if not course_skills & horizon:
            continue  # not part of the current unlocked horizon
        prereq_missing = [p for p in c["prerequisites"] if norm(p) not in known]
        score = float(sims[int(idx)])
        ranked.append((score, c, prereq_missing))
    ranked.sort(key=lambda x: x[0], reverse=True)

    selected = []
    for score, c, prereq_missing in ranked[:top_n]:
        selected.append({
            "id": c["id"],
            "title": c["title"],
            "level": c["level"],
            "duration_weeks": c["duration_weeks"],
            "skills": c["skills"],
            "prerequisites": c["prerequisites"],
            "missing_prerequisites": prereq_missing,
            "project": c["project"],
            "score": round(score, 4),
        })
    return selected


# ---------------------------------------------------------------------------
# Orchestration
# ---------------------------------------------------------------------------
def recommend(profile: LearnerProfile, top_n=6):
    try:
        start_date = datetime.strptime(profile.start_date, "%Y-%m-%d").date()
    except:
        start_date = date.today()

    goal = canonical_goal(profile.goal)
    required = goal_skills.get(goal, [])
    current = {norm(x) for x in profile.current_skills}
    completed = {norm(x) for x in profile.completed_courses}
    known = current | completed

    missing = [s for s in required if norm(s) not in known]

    # Engine 1 - chronological order decides sequence
    ordered_missing = build_chronological_order(missing, known)
    roadmap = build_roadmap(
    ordered_missing,
    start_date,
    profile.hours_per_week
)
    
    skill_status = build_skill_status(
    ordered_missing,
    known,
    ordered_missing
)
    completed_count = len(required) - len(missing)
    progress_chart = build_progress_chart(len(required), completed_count, ordered_missing)
    current_position = build_current_position(ordered_missing, completed_count)

    # Engine 2 - TF-IDF ranks resources within the unlocked horizon only
    selected = recommend_resources(profile, known, ordered_missing, top_n=top_n)

    progress = 100 if not required else round(
        sum(norm(s) in known for s in required) / len(required) * 100, 1
    )

    return {
        "recognized_goal": goal or profile.goal,
        "required_skills": required,
        "current_skills": profile.current_skills,
        "skill_gap": missing,
        "progress_percent": progress,
        "next_action": roadmap[0] if roadmap else None,
        "recommendations": selected,
        "roadmap": roadmap,
        "skill_status": skill_status,
        "current_position": current_position,
        "progress_chart": progress_chart,
    }


@app.get("/")
def home():
    return {"message": "AI Learning Path Recommender API is running"}


@app.get("/goals")
def goals():
    return {"goals": list(goal_skills.keys())}


@app.post("/recommend")
def get_recommendations(profile: LearnerProfile):
    return recommend(profile)


@app.post("/complete")
def mark_complete(profile: LearnerProfile, skill: str):
    """Convenience endpoint: mark a skill complete and return the
    refreshed dashboard, so the frontend doesn't have to duplicate the
    completion logic."""
    completed = set(norm(s) for s in profile.completed_courses)
    completed.add(norm(skill))
    # keep original casing where we can, append new skill verbatim
    merged = list(profile.completed_courses)
    if norm(skill) not in {norm(s) for s in merged}:
        merged.append(skill)
    profile.completed_courses = merged
    return recommend(profile)


@app.post("/chat")
def chat(profile: LearnerProfile, question: str):
    result = recommend(profile)
    q = question.lower()
    pos = result["current_position"]
    if "why" in q and result["next_action"]:
        n = result["next_action"]
        answer = (
            f"{n['course']} is recommended next because {n['skill']} is the next skill "
            f"in the chronological path toward {result['recognized_goal']}. "
            f"Prerequisites for this step: {', '.join(n['prerequisites']) or 'none'}."
        )
    elif "next" in q:
        n = result["next_action"]
        answer = "You have completed the roadmap." if not n else (
            f"Your next recommended step is {n['course']} ({n['duration_weeks']} weeks). "
            f"Complete the project: {n['project']}."
        )
    else:
        answer = (
            f"For your goal of {result['recognized_goal']}, you currently have "
            f"{result['progress_percent']}% of the required skills completed "
            f"({pos['completed_count']} done, {pos['remaining_count']} remaining, "
            f"~{pos['estimated_weeks_remaining']} weeks left). "
            f"You're currently on {pos['current_skill'] or 'no active skill'}."
        )
    return {"answer": answer, "analysis": result}
