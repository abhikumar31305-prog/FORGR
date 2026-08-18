from typing import Any


def normalize_student_id(value: Any) -> str:
    if value is None:
        return ""

    if isinstance(value, str):
        stripped = value.strip()
        if not stripped:
            return ""
        try:
            return str(int(float(stripped)))
        except (ValueError, TypeError):
            return stripped

    if isinstance(value, (int, float)):
        if float(value).is_integer():
            return str(int(value))
        return str(value)

    return str(value)
