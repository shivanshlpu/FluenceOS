"""Response formatting utilities"""


def format_success(data: dict, message: str = "Success") -> dict:
    return {"status": "success", "message": message, "data": data}


def format_error(message: str, code: int = 400) -> dict:
    return {"status": "error", "message": message, "code": code}
