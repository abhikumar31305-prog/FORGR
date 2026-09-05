# ML Model Retraining & Rollback Runbook

## Overview

This document describes the procedures for retraining FORGR ML models and rolling back to previous versions when issues are detected.

---

## 1. Retraining Triggers

Retraining should be initiated when ANY of the following conditions are met:

| Trigger | Threshold | Detection Method |
|---------|-----------|-----------------|
| Feature drift detected | PSI ≥ 0.2 for any feature | `POST /api/ml/monitoring/drift/check` |
| Accuracy degradation | Below 80% on validation set | Manual evaluation |
| New training data available | ≥1000 new labeled records | Data pipeline notification |
| Scheduled retraining | Every 90 days | Calendar reminder |
| Significant schema changes | New features added | Code review process |

### Monitoring Alerts

The drift detection system automatically checks feature distributions against training baselines using Population Stability Index (PSI):

- **PSI < 0.1**: No significant change — no action needed
- **0.1 ≤ PSI < 0.2**: Moderate shift — schedule retraining within 2 weeks
- **PSI ≥ 0.2**: Significant drift — retrain immediately

---

## 2. Retraining Procedure

### Prerequisites
- Access to the training data pipeline
- Admin access to the model registry API
- Python 3.12+ with scikit-learn, pandas, joblib

### Step-by-step

#### 2.1. Prepare Training Data
```bash
# Export latest labeled data
python backend/ml/backlog/train.py --export-data --output datasets/training_data_$(date +%Y%m%d).csv

# Verify data quality
python -c "import pandas as pd; df = pd.read_csv('datasets/training_data_*.csv'); print(df.describe())"
```

#### 2.2. Train New Model
```bash
cd backend/ml/backlog

# Train with cross-validation
python train.py \
  --data ../../../datasets/training_data_latest.csv \
  --output backlog_model_v2.pkl \
  --cv-folds 5

# Evaluate metrics
python train.py --evaluate backlog_model_v2.pkl
```

#### 2.3. Register New Model
```bash
# Register via API
curl -X POST http://localhost:8000/api/models \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "model_name": "backlog_risk_v2",
    "model_version": "2.0.0",
    "model_type": "backlog_risk",
    "file_path": "ml/backlog/backlog_model_v2.pkl",
    "metrics_json": "{\"accuracy\": 0.94, \"f1\": 0.91, \"recall\": 0.89}"
  }'
```

#### 2.4. Shadow Testing (Recommended)
Before activating, run shadow predictions comparing old and new models:
```python
# Compare predictions on recent data
from ml.backlog.predict import predict_backlog_risk
import joblib

old_model = joblib.load("ml/backlog/backlog_model.pkl")
new_model = joblib.load("ml/backlog/backlog_model_v2.pkl")

# Compare outputs on test set...
```

#### 2.5. Activate New Model
```bash
# Get the model ID from registration response
curl -X PUT http://localhost:8000/api/models/{model_id}/activate \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

#### 2.6. Monitor Post-Deployment
- Watch prediction confidence metrics for 24-48 hours
- Check drift detection to ensure new model aligns with current data
- Monitor application logs for inference errors

```bash
# Check monitoring metrics
curl http://localhost:8000/api/ml/monitoring/metrics?model_type=backlog_risk \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

---

## 3. Rollback Procedure

### When to Rollback
- New model shows significantly lower accuracy
- Prediction confidence drops below acceptable threshold
- Application errors spike after deployment
- Business logic validation fails

### Rollback Steps

#### 3.1. Identify Previous Active Model
```bash
# List all models for the type
curl http://localhost:8000/api/models?model_type=backlog_risk \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

#### 3.2. Reactivate Previous Model
```bash
# Activate the previous version by its ID
curl -X PUT http://localhost:8000/api/models/{previous_model_id}/activate \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

#### 3.3. Verify Rollback
```bash
# Confirm active model version
curl http://localhost:8000/api/models/backlog_risk/active \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Check health
curl http://localhost:8000/health
```

#### 3.4. Post-Rollback Actions
1. Document the failure reason in the model registry notes
2. Investigate root cause (data quality, feature engineering, hyperparameters)
3. Schedule a post-mortem review

---

## 4. Model Registry Management

### Available Model Types
| Type | Description | Current Version |
|------|-------------|-----------------|
| `backlog_risk` | Student risk prediction (7 features) | 1.0.0 |
| `placement` | Placement tier & package model | 1.0.0 |
| `employability` | Employability scoring engine | 1.0.0 |
| `career` | Career recommendation engine | 1.0.0 |

### API Endpoints
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/models` | GET | List all registered models |
| `/api/models` | POST | Register new model (admin) |
| `/api/models/{type}/active` | GET | Get active model |
| `/api/models/{id}/activate` | PUT | Promote model (admin) |
| `/api/ml/monitoring/metrics` | GET | Monitoring dashboard |
| `/api/ml/monitoring/drift` | GET | Drift reports |
| `/api/ml/monitoring/drift/check` | POST | Trigger drift check |
| `/api/ml/monitoring/predictions` | GET | Prediction logs |

---

## 5. Escalation Path

1. **L1 — Automated**: Drift detection runs automatically; alerts when PSI ≥ 0.2
2. **L2 — Engineering**: Data scientist reviews drift report and training data quality
3. **L3 — Rollback**: If retraining fails or new model underperforms, rollback to previous version
4. **L4 — Manual Override**: Switch to rule-based fallback predictions (built into `predict.py`)
