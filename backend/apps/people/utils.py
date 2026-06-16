from __future__ import annotations

from datetime import date

from .models import Child


def child_age_display(child: Child, *, today: date | None = None) -> str | None:
    today = today or date.today()
    if child.birthdate:
        age = today.year - child.birthdate.year
        if (today.month, today.day) < (child.birthdate.month, child.birthdate.day):
            age -= 1
        return f"{age} years old"
    if child.birth_year:
        age = today.year - child.birth_year
        return f"~{age} years old"
    return None
