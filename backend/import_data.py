from pathlib import Path

try:
    from .imports.import_students import import_students
    from .imports.import_academics import import_academics
    from .imports.import_attendance import import_attendance
    from .imports.import_skills import import_skills
    from .imports.import_portfolio import import_portfolio
    from .imports.import_placement import import_placement
    from .imports.import_risk_prediction import import_risk_prediction
except ImportError:  # pragma: no cover - allows running as a script from the backend folder
    from imports.import_students import import_students
    from imports.import_academics import import_academics
    from imports.import_attendance import import_attendance
    from imports.import_skills import import_skills
    from imports.import_portfolio import import_portfolio
    from imports.import_placement import import_placement
    from imports.import_risk_prediction import import_risk_prediction


def import_all_data():
    import_students()
    import_academics()
    import_attendance()
    import_skills()
    import_portfolio()
    import_placement()
    import_risk_prediction()
    print("All datasets imported successfully.")


if __name__ == "__main__":
    import_all_data()