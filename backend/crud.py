from sqlalchemy.orm import Session

try:
    import models
    import schemas
except ImportError:  # pragma: no cover - allows running as a script from the backend folder
    import models
    import schemas


def _payload(student):
    return student.model_dump() if hasattr(student, "model_dump") else student.dict()


def create_student(db: Session, student: schemas.StudentCreate):
    db_student = models.Student(**_payload(student))
    db.add(db_student)
    db.commit()
    db.refresh(db_student)
    return db_student


def get_students(db: Session):
    return db.query(models.Student).order_by(models.Student.id).all()


def get_student_by_student_id(db: Session, student_id: str):
    return db.query(models.Student).filter(models.Student.student_id == student_id).first()


def get_academics(db: Session):
    return db.query(models.Academic).order_by(models.Academic.id).all()


def get_attendance(db: Session):
    return db.query(models.Attendance).order_by(models.Attendance.id).all()


def get_skills(db: Session):
    return db.query(models.Skill).order_by(models.Skill.id).all()


def get_portfolio(db: Session):
    return db.query(models.Portfolio).order_by(models.Portfolio.id).all()


def get_placement(db: Session):
    return db.query(models.Placement).order_by(models.Placement.id).all()


def get_risk_prediction(db: Session):
    return db.query(models.RiskPrediction).order_by(models.RiskPrediction.id).all()


def get_dashboard_data(db: Session, student_id: str):
    student = get_student_by_student_id(db, student_id)
    academics = db.query(models.Academic).filter(models.Academic.student_id == student_id).first()
    attendance = db.query(models.Attendance).filter(models.Attendance.student_id == student_id).first()
    skills = db.query(models.Skill).filter(models.Skill.student_id == student_id).first()
    portfolio = db.query(models.Portfolio).filter(models.Portfolio.student_id == student_id).first()
    placement = db.query(models.Placement).filter(models.Placement.student_id == student_id).first()
    risk_prediction = db.query(models.RiskPrediction).filter(models.RiskPrediction.student_id == student_id).first()

    return {
        "student": student,
        "academics": academics,
        "attendance": attendance,
        "skills": skills,
        "portfolio": portfolio,
        "placement": placement,
        "risk_prediction": risk_prediction,
    }