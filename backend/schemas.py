from pydantic import BaseModel

class StudentCreate(BaseModel):
    student_id: str
    name: str
    email: str
    department: str
    year: int

class StudentResponse(StudentCreate):
    id: int

    class Config:
        from_attributes = True