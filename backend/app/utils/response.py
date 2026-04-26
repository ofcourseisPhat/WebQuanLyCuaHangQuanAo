from flask import jsonify


def success(data=None, message: str = "OK", status: int = 200):
    return jsonify({"success": True, "message": message, "data": data}), status


def error(message: str = "Error", status: int = 400, errors=None):
    payload = {"success": False, "message": message}
    if errors:
        payload["errors"] = errors
    return jsonify(payload), status
