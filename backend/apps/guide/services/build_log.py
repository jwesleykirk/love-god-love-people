"""JSON-lines build log helpers."""
from __future__ import annotations

import json
from datetime import datetime, timezone


def log_line(step: str, status: str, **extra) -> str:
    payload = {
        "step": step,
        "status": status,
        "ts": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        **extra,
    }
    return json.dumps(payload)


class BuildLogger:
    def __init__(self):
        self.lines: list[str] = []

    def ok(self, step: str, **extra):
        self.lines.append(log_line(step, "ok", **extra))

    def error(self, step: str, **extra):
        self.lines.append(log_line(step, "error", **extra))

    def skip(self, step: str, **extra):
        self.lines.append(log_line(step, "skip", **extra))

    def dump(self) -> str:
        return "\n".join(self.lines)
