"""
Career Recommendation Module

Uses TF-IDF Vectorization and Cosine Similarity to match student skill profiles,
academic scores, and coding metrics against career role profiles.
Saves and reuses `tfidf_vectorizer.pkl`.
"""

from pathlib import Path
from typing import Any, Dict, List, Optional
# pyrefly: ignore [missing-import]
import joblib
import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

BASE_DIR = Path(__file__).resolve().parent
PROFILES_PATH = BASE_DIR / "career_profiles.csv"
VECTORIZER_PATH = BASE_DIR / "tfidf_vectorizer.pkl"

_PROFILES_DF = None
_VECTORIZER = None
_PROFILES_TFIDF = None


def _init_career_recommender():
    global _PROFILES_DF, _VECTORIZER, _PROFILES_TFIDF

    if _PROFILES_DF is None and PROFILES_PATH.exists():
        _PROFILES_DF = pd.read_csv(PROFILES_PATH)

    if _PROFILES_DF is not None:
        # Create corpus combining title, domain, description, and required skills
        corpus = (
            _PROFILES_DF["title"].fillna("") + " " +
            _PROFILES_DF["domain"].fillna("") + " " +
            _PROFILES_DF["description"].fillna("") + " " +
            _PROFILES_DF["required_skills"].fillna("")
        )

        if VECTORIZER_PATH.exists():
            try:
                _VECTORIZER = joblib.load(VECTORIZER_PATH)
                _PROFILES_TFIDF = _VECTORIZER.transform(corpus)
            except Exception:
                _VECTORIZER = None

        if _VECTORIZER is None:
            _VECTORIZER = TfidfVectorizer(stop_words="english", ngram_range=(1, 2))
            _PROFILES_TFIDF = _VECTORIZER.fit_transform(corpus)
            try:
                joblib.dump(_VECTORIZER, VECTORIZER_PATH)
                print(f"[OK] Saved TF-IDF Vectorizer to {VECTORIZER_PATH}")
            except Exception as exc:
                print(f"Warning: Failed to save vectorizer: {exc}")


def recommend_careers(
    student_skills: Dict[str, int],
    cgpa: float = 7.5,
    coding_score: int = 150,
    projects: int = 2,
    top_n: int = 3,
) -> List[Dict[str, Any]]:
    """
    Generates top recommended career paths based on student skill scores,
    semantic similarity matching, and academic requirements.
    """
    _init_career_recommender()

    if _PROFILES_DF is None or _VECTORIZER is None or _PROFILES_TFIDF is None:
        return _fallback_recommendations(student_skills, top_n)

    # Format student skill profile into a query string
    active_skills = [skill for skill, val in student_skills.items() if val > 0]
    high_skills = [skill for skill, val in student_skills.items() if val >= 60]

    query_str = " ".join(active_skills + high_skills)
    if projects >= 2:
        query_str += " projects github code"

    query_tfidf = _VECTORIZER.transform([query_str])
    sim_scores = cosine_similarity(query_tfidf, _PROFILES_TFIDF)[0]

    results = []
    for idx, row in _PROFILES_DF.iterrows():
        base_similarity = float(sim_scores[idx])

        # Skill match score calculation
        req_skills = [s.strip().lower() for s in str(row["required_skills"]).split()]
        matched_skills = [s for s in req_skills if student_skills.get(s, 0) >= 50 or s in active_skills]
        missing_skills = [s for s in req_skills if s not in matched_skills]

        skill_match_ratio = len(matched_skills) / max(1, len(req_skills))

        # Eligibility penalty / bonus based on CGPA and coding score
        min_cgpa = float(row.get("min_cgpa", 6.0))
        min_coding = int(row.get("min_coding_score", 100))

        cgpa_bonus = 0.1 if cgpa >= min_cgpa else -0.2
        coding_bonus = 0.1 if coding_score >= min_coding else -0.1

        final_match_percent = round(
            max(20.0, min(98.0, (base_similarity * 40.0) + (skill_match_ratio * 40.0) + (cgpa_bonus * 10) + (coding_bonus * 10) + 15)),
            1,
        )

        results.append({
            "role_id": int(row["role_id"]),
            "title": str(row["title"]),
            "domain": str(row["domain"]),
            "match_score": final_match_percent,
            "description": str(row["description"]),
            "matched_skills": matched_skills,
            "missing_skills": missing_skills,
            "key_responsibilities": str(row["key_responsibilities"]),
            "eligible": cgpa >= min_cgpa and coding_score >= min_coding,
        })

    # Sort by match score descending
    results.sort(key=lambda x: x["match_score"], reverse=True)
    return results[:top_n]


def _fallback_recommendations(skills: Dict[str, int], top_n: int) -> List[Dict[str, Any]]:
    default_roles = [
        {
            "role_id": 1,
            "title": "Full Stack Web Developer",
            "domain": "Software Engineering",
            "match_score": 85.0,
            "description": "Builds modern web apps and APIs",
            "matched_skills": ["python", "sql", "javascript"],
            "missing_skills": ["react", "docker"],
            "key_responsibilities": "Develop frontend components and backend endpoints",
            "eligible": True,
        },
        {
            "role_id": 2,
            "title": "Data Scientist & Analyst",
            "domain": "Data Science",
            "match_score": 78.0,
            "description": "Analyzes datasets to extract actionable insights",
            "matched_skills": ["python", "sql", "data_science"],
            "missing_skills": ["machine_learning", "statistics"],
            "key_responsibilities": "Perform data analysis and build predictive models",
            "eligible": True,
        },
        {
            "role_id": 4,
            "title": "Backend Software Engineer",
            "domain": "Software Engineering",
            "match_score": 74.0,
            "description": "Architects scalable microservices and database schemas",
            "matched_skills": ["python", "sql"],
            "missing_skills": ["microservices", "docker"],
            "key_responsibilities": "Design database structures and optimize backend queries",
            "eligible": True,
        },
    ]
    return default_roles[:top_n]


if __name__ == "__main__":
    _init_career_recommender()
    print("Testing career recommendations...")
    recs = recommend_careers({"python": 80, "sql": 70, "machine_learning": 65}, cgpa=8.0, coding_score=170)
    for r in recs:
        print(f"Role: {r['title']} | Match: {r['match_score']}%")
