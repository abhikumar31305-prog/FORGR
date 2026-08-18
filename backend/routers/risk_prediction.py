from fastapi import APIRouter, Depends
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


@router.get("", response_model=list[schemas.RiskPredictionResponse])
def get_risk_prediction(db: Session = Depends(get_db)):
    return crud.get_risk_prediction(db)
