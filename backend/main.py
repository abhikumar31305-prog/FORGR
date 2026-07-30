from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session

try:
    from . import models, schemas, crud
    from .database import Base, engine, SessionLocal
    from .routers import (
        students,
        academics,
        attendance,
        skills,
        portfolio,
        placement,
        risk_prediction,
        dashboard,
    )
except ImportError:  # pragma: no cover - allows running as a script from the backend folder
    import models
    import schemas
    import crud
    from database import Base, engine, SessionLocal
    from routers import (
        students,
        academics,
        attendance,
        skills,
        portfolio,
        placement,
        risk_prediction,
        dashboard,
    )

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="FORGR API",
    description="AI-powered student employability and career guidance platform",
    version="1.0.0",
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


app.include_router(students.router, prefix="/students", tags=["Students"])
app.include_router(academics.router, prefix="/academics", tags=["Academics"])
app.include_router(attendance.router, prefix="/attendance", tags=["Attendance"])
app.include_router(skills.router, prefix="/skills", tags=["Skills"])
app.include_router(portfolio.router, prefix="/portfolio", tags=["Portfolio"])
app.include_router(placement.router, prefix="/placement", tags=["Placement"])
app.include_router(risk_prediction.router, prefix="/risk_prediction", tags=["Risk Prediction"])
app.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])


@app.get("/", summary="Health check")
def home():
    return {"message": "FORGR API is running", "status": "ok"}