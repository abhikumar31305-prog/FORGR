from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

try:
    import crud
    import schemas
    from database import get_db
except ImportError:  # pragma: no cover - allows running as a script from the backend folder
    import crud
    import schemas
    from database import get_db

router = APIRouter()


@router.get("/{student_id}", response_model=schemas.DashboardResponse)
def get_dashboard(student_id: str, db: Session = Depends(get_db)):
    data = crud.get_dashboard_data(db, student_id)
    if not data["student"]:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")
    return data
