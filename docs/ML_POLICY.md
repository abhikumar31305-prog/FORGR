# ML Operations Policy

- Every prediction response must identify the model or rule version used.
- Missing or invalid inputs must produce `unavailable` or a review-required result, never invented student metrics.
- Risk and placement outputs are decision support, not final academic or employment decisions.
- High-risk and adverse outcomes require review by an authorized faculty or placement officer.
- Before release, evaluate each model on a labeled holdout set and record precision, recall, calibration, and subgroup checks.
- Monitor feature drift and performance monthly; suspend automated recommendations when thresholds are exceeded.
- Retain input snapshot, model version, output, and reviewer decision according to the approved retention schedule.
