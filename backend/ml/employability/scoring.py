"""
Employability Scoring Service

Provides comprehensive employability evaluation and score breakdown algorithms
aligned with FORGR Supervised Regression and Placement Probability models.
"""

from typing import Any, Dict, List, Tuple


def calculate_employability_score(
    aptitude_score: int = 70,
    resume_score: int = 70,
    communication_score: int = 70,
    interview_readiness: int = 70,
    coding_score: int = 150,
    cgpa: float = 7.5,
    projects: int = 2,
    certifications: int = 1,
    github_score: int = 65,
    attendance_percentage: float = 85.0,
    leadership_score: int = 50,
) -> Dict[str, Any]:
    """
    Computes overall employability score (0-100) using SRS §6.1 weighting model:
      CGPA 20%, Technical Skills 20%, Coding 15%, Projects 15%,
      Certifications 10%, Communication 10%, Leadership 5%, Attendance 5%.
    """
    # Normalize inputs to 0-100 scale
    cgpa_norm = max(0, min(100, (cgpa / 10.0) * 100))
    tech_norm = max(0, min(100, (aptitude_score * 0.5 + interview_readiness * 0.5)))
    coding_norm = max(0, min(100, (coding_score / 300.0) * 100))
    proj_norm = max(0, min(100, projects * 25.0))
    cert_norm = max(0, min(100, certifications * 33.3))
    comm_norm = max(0, min(100, communication_score))
    leadership_norm = max(0, min(100, leadership_score))
    att_norm = max(0, min(100, attendance_percentage))

    # SRS §6.1 Weighting Model
    overall_score = round(
        (cgpa_norm * 0.20)           # CGPA: 20%
        + (tech_norm * 0.20)         # Technical Skills: 20%
        + (coding_norm * 0.15)       # Coding: 15%
        + (proj_norm * 0.15)         # Projects: 15%
        + (cert_norm * 0.10)         # Certifications: 10%
        + (comm_norm * 0.10)         # Communication: 10%
        + (leadership_norm * 0.05)   # Leadership: 5%
        + (att_norm * 0.05),         # Attendance: 5%
        1,
    )
    overall_score = max(0.0, min(100.0, overall_score))

    # Category breakdowns for detailed display
    technical_score = round(tech_norm, 1)
    coding_display = round(coding_norm, 1)
    academic_score = round(cgpa_norm, 1)
    soft_skills_score = round((comm_norm * 0.5) + (interview_readiness * 0.5), 1)
    resume_portfolio_score = round((resume_score * 0.4) + (proj_norm * 0.3) + (cert_norm * 0.15) + (github_score * 0.15), 1)

    # Categorize placement probability
    if overall_score >= 72.0:
        probability = "High"
    elif overall_score >= 50.0:
        probability = "Medium"
    else:
        probability = "Low"

    # Identify Strengths & Improvements
    strengths: List[str] = []
    improvements: List[str] = []

    if technical_score >= 75:
        strengths.append(f"Strong technical baseline (Coding score: {coding_score}, Aptitude: {aptitude_score})")
    elif technical_score < 55:
        improvements.append("Increase daily problem-solving practice on coding platforms (LeetCode/HackerRank).")

    if soft_skills_score >= 75:
        strengths.append("High mock interview readiness and clear communication skill.")
    elif soft_skills_score < 60:
        improvements.append("Participate in mock interviews and practice technical presentation skills.")

    if cgpa >= 7.5:
        strengths.append(f"Consistent academic record (CGPA: {cgpa:.2f}).")
    elif cgpa < 6.5:
        improvements.append("Focus on core departmental subjects to maintain CGPA above 6.5 eligibility threshold.")

    if projects >= 3 or github_score >= 75:
        strengths.append(f"Rich project portfolio ({projects} projects, GitHub score: {github_score}).")
    elif projects < 2:
        improvements.append("Build and publish at least 2 full-stack/domain projects on GitHub with documentation.")

    if resume_score < 65:
        improvements.append("Tailor resume with action verbs, quantifiable achievements, and relevant project links.")

    if attendance_percentage < 75:
        improvements.append(f"Attendance is at {attendance_percentage:.1f}% — must improve to meet institutional requirements.")

    if not strengths:
        strengths.append("Foundational skills present; continuous practice will boost overall readiness.")

    if not improvements:
        improvements.append("Maintain performance and solve advanced domain-specific problems.")

    return {
        "employability_score": overall_score,
        "placement_probability": probability,
        "breakdown": {
            "academic_score": academic_score,
            "technical_score": technical_score,
            "coding_score": coding_display,
            "soft_skills_score": soft_skills_score,
            "resume_portfolio_score": resume_portfolio_score,
        },
        "weights_applied": {
            "CGPA": "20%",
            "Technical Skills": "20%",
            "Coding": "15%",
            "Projects": "15%",
            "Certifications": "10%",
            "Communication": "10%",
            "Leadership": "5%",
            "Attendance": "5%",
        },
        "strengths": strengths,
        "improvements": improvements,
    }


def compute_quick_employability(
    aptitude_score: int,
    resume_score: int,
    communication_score: int,
    interview_readiness: int,
) -> Tuple[float, str]:
    res = calculate_employability_score(
        aptitude_score=aptitude_score,
        resume_score=resume_score,
        communication_score=communication_score,
        interview_readiness=interview_readiness,
    )
    return res["employability_score"], res["placement_probability"]
