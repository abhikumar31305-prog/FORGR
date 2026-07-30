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


@router.post("", response_model=schemas.StudentResponse, status_code=status.HTTP_201_CREATED)
def create_student(student: schemas.StudentCreate, db: Session = Depends(get_db)):
    return crud.create_student(db, student)


@router.get("", response_model=list[schemas.StudentResponse])
def get_students(db: Session = Depends(get_db)):
    return crud.get_students(db)


@router.get("/{student_id}", response_model=schemas.StudentResponse)
def get_student(student_id: str, db: Session = Depends(get_db)):
    student = crud.get_student_by_student_id(db, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    return student
