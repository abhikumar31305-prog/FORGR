from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session

import models
import schemas
import crud

from database import Base, engine, SessionLocal

Base.metadata.create_all(bind=engine)

app = FastAPI(title="FORGR API")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/")
def home():
    return {"message": "FORGR API is Running 🚀"}

@app.post("/students", response_model=schemas.StudentResponse)
def create_student(student: schemas.StudentCreate, db: Session = Depends(get_db)):
    return crud.create_student(db, student)

@app.get("/students")
def get_students(db: Session = Depends(get_db)):
    return crud.get_students(db)