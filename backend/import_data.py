import pandas as pd
from database import SessionLocal
from models import Student

db = SessionLocal()

df = pd.read_csv("../datasets/students.csv")

for _, row in df.iterrows():
    student = Student(
        student_id=row["student_id"],
        name=row["name"],
        email=row["email"],
        department=row["department"],
        year=row["year"]
    )
    db.add(student)

db.commit()
db.close()

print("Students Imported Successfully!")