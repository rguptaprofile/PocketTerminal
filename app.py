from __future__ import annotations

import math
import importlib
import os
import random
import re
import shutil
import subprocess
import uuid
from collections import Counter
from dataclasses import dataclass, field
from threading import Lock
from typing import Dict, List, Optional, Tuple
from urllib.parse import quote_plus

from flask import Flask, render_template, request
from flask_socketio import SocketIO, emit, join_room

app = Flask(__name__)
app.config["SECRET_KEY"] = "pocket-terminal-your-laptops-terminal-in-your-phone"
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="threading")


@dataclass
class PairSession:
    code: str
    room_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    desktop_sid: Optional[str] = None
    mobile_sid: Optional[str] = None
    paired: bool = False
    history: List[str] = field(default_factory=list)


sessions_by_code: Dict[str, PairSession] = {}
sid_to_room: Dict[str, str] = {}
rooms: Dict[str, PairSession] = {}
lock = Lock()


SUPPORTED_DESKTOP_ACTIONS = {
    "open chrome": "open_chrome",
    "open notepad": "open_notepad",
    "open calculator": "open_calculator",
    "open cmd": "open_cmd",
    "lock screen": "lock_screen",
}

DESKTOP_DYNAMIC_EXAMPLES = [
    "open vscode",
    "open whatsapp",
    "open file explorer",
    "close explorer",
    "close chrome",
    "close notepad",
    "shutdown laptop",
    "restart laptop",
    "search web python flask socketio",
    "open website github.com",
    "open file C:/Users/Public/test.txt",
    "create folder C:/Users/Public/DemoFolder",
    "create file C:/Users/Public/DemoFolder/notes.txt",
    "run ipconfig",
]

SUPPORTED_MOBILE_ACTIONS = {
    "open github": "open_github",
    "open youtube": "open_youtube",
    "vibrate": "vibrate",
    "say hello": "say_hello",
}

ACTION_TRAINING_PHRASES = {
    "open chrome": [
        "open chrome",
        "start chrome",
        "launch chrome",
        "open browser",
        "start browser",
    ],
    "open notepad": [
        "open notepad",
        "start notepad",
        "launch text editor",
        "open text editor",
    ],
    "open calculator": [
        "open calculator",
        "start calculator",
        "launch calculator",
        "open calc",
    ],
    "open cmd": [
        "open cmd",
        "open command prompt",
        "start terminal",
        "launch command prompt",
    ],
    "lock screen": [
        "lock screen",
        "lock my pc",
        "screen lock",
        "secure desktop",
        "lock laptop",
        "pc lock karo",
    ],
    "open github": [
        "open github",
        "launch github",
        "github kholo",
    ],
    "open youtube": [
        "open youtube",
        "launch youtube",
        "youtube kholo",
    ],
    "vibrate": [
        "vibrate",
        "phone vibrate",
        "buzz",
    ],
    "say hello": [
        "say hello",
        "speak hello",
        "hello bolo",
    ],
}

WORKFLOW_INTENT_HINTS = {
    "shutdown laptop": ["shutdown laptop", "shutdown pc", "computer बंद", "power off laptop"],
    "restart laptop": ["restart laptop", "reboot pc", "system restart"],
    "open app": ["open app", "launch app", "start application", "app kholo"],
    "open website": ["open website", "open url", "website kholo"],
    "search web": ["search web", "google search", "web par search karo"],
    "open file": ["open file", "file kholo"],
    "open folder": ["open folder", "folder kholo"],
    "create file": ["create file", "new file banao"],
    "create folder": ["create folder", "new folder banao"],
    "delete file": ["delete file", "file hatao"],
    "delete folder": ["delete folder", "folder hatao"],
    "run command": ["run command", "execute command", "terminal command run karo"],
}

# Lazy ML initialization keeps server startup fast and button actions responsive.
hybrid_ml_engine = None
ML_INIT_ATTEMPTED = False


def get_ml_engine() -> Optional[object]:
    global hybrid_ml_engine, ML_INIT_ATTEMPTED
    # Disabled by default to avoid heavy startup (TensorFlow + model warmup).
    if os.getenv("POCKET_ENABLE_ML", "0") != "1":
        return None

    if ML_INIT_ATTEMPTED:
        return hybrid_ml_engine

    ML_INIT_ATTEMPTED = True
    try:
        ml_module = importlib.import_module("ml_models")
        get_hybrid_engine = getattr(ml_module, "get_hybrid_engine", None)
        if not callable(get_hybrid_engine):
            return None
        hybrid_ml_engine = get_hybrid_engine()
        hybrid_ml_engine.initialize_with_commands(ACTION_TRAINING_PHRASES, WORKFLOW_INTENT_HINTS)
        print("✓ ML Engine ready")
    except Exception as e:
        print(f"⚠️ ML Engine unavailable: {e}")
        hybrid_ml_engine = None

    return hybrid_ml_engine


def tokenize(text: str) -> List[str]:
    return re.findall(r"[a-z0-9]+", text.lower())


def build_action_models() -> Dict[str, Counter]:
    models: Dict[str, Counter] = {}
    for action, phrases in ACTION_TRAINING_PHRASES.items():
        token_counter: Counter = Counter()
        for phrase in phrases:
            token_counter.update(tokenize(phrase))
        models[action] = token_counter
    return models


ACTION_MODELS = build_action_models()
VOCAB = set()
for token_counts in ACTION_MODELS.values():
    VOCAB.update(token_counts.keys())


def score_action(action: str, query_tokens: List[str], query_text: str) -> float:
    if not query_tokens:
        return 0.0

    action_counter = ACTION_MODELS[action]
    total_tokens = sum(action_counter.values()) + len(VOCAB)
    nb_log_prob = 0.0
    for token in query_tokens:
        token_count = action_counter.get(token, 0) + 1
        nb_log_prob += math.log(token_count / total_tokens)

    phrase_similarity = 0.0
    for phrase in ACTION_TRAINING_PHRASES[action]:
        a = phrase.strip().lower()
        b = query_text.strip().lower()
        if not a or not b:
            continue
        ratio = len(set(tokenize(a)).intersection(set(query_tokens))) / max(1, len(set(tokenize(a))))
        phrase_similarity = max(phrase_similarity, ratio)

    return nb_log_prob + (phrase_similarity * 1.8)


def ai_predict_action(command_text: str, action_space: List[str]) -> Tuple[Optional[str], float, List[str]]:
    normalized_text = command_text.strip().lower()
    if not normalized_text:
        return None, 0.0, []

    if normalized_text in action_space:
        return normalized_text, 1.0, [normalized_text]

    # Use Deep Learning engine if available (99%+ accuracy)
    ml_engine = get_ml_engine()
    if ml_engine and ml_engine.dl_classifier.is_trained:
        try:
            predicted, confidence, suggestions = ml_engine.predict_intent(normalized_text)
            if predicted in action_space:
                return predicted, confidence, [s for s in suggestions if s in action_space][:3]
        except Exception as e:
            print(f"⚠️ DL prediction error: {e}, falling back to Naive Bayes")

    query_tokens = tokenize(normalized_text)
    if not query_tokens:
        return None, 0.0, []

    scored = []
    for action in action_space:
        score = score_action(action, query_tokens, normalized_text)
        scored.append((action, score))

    scored.sort(key=lambda item: item[1], reverse=True)
    best_action, best_score = scored[0]
    second_score = scored[1][1] if len(scored) > 1 else best_score - 3
    confidence = 1 / (1 + math.exp(-(best_score - second_score)))
    top_suggestions = [item[0] for item in scored[:3]]

    # Confidence gate avoids forcing wrong actions on ambiguous phrases.
    if confidence < 0.57:
        return None, confidence, top_suggestions

    return best_action, confidence, top_suggestions


def personalized_suggestions(session: Optional[PairSession], action_space: List[str]) -> List[str]:
    if not session or not session.history:
        return action_space[:3]

    counts = Counter(cmd for cmd in session.history if cmd in action_space)
    preferred = [item[0] for item in counts.most_common(3)]
    for action in action_space:
        if action not in preferred and len(preferred) < 3:
            preferred.append(action)
    return preferred[:3]


def make_pair_code() -> str:
    return str(random.randint(100000, 999999))


def find_session_by_sid(sid: str) -> Optional[PairSession]:
    room_id = sid_to_room.get(sid)
    if not room_id:
        return None
    return rooms.get(room_id)


def run_desktop_action(command_text: str) -> str:
    normalized = command_text.strip().lower()
    mapped = SUPPORTED_DESKTOP_ACTIONS.get(normalized)
    if not mapped:
        return f"Unsupported desktop command: {command_text}"

    try:
        if mapped == "open_chrome":
            chrome_path = shutil.which("chrome") or shutil.which("chrome.exe")
            if chrome_path:
                subprocess.Popen([chrome_path], shell=False)
            else:
                subprocess.Popen(["start", "chrome"], shell=True)
        elif mapped == "open_notepad":
            subprocess.Popen(["notepad"], shell=False)
        elif mapped == "open_calculator":
            subprocess.Popen(["calc"], shell=False)
        elif mapped == "open_cmd":
            subprocess.Popen(["cmd"], shell=False)
        elif mapped == "lock_screen":
            subprocess.Popen(["rundll32.exe", "user32.dll,LockWorkStation"], shell=False)

        return f"Executed desktop command: {mapped}"
    except Exception as ex:  # pragma: no cover - host specific process launch
        return f"Desktop command failed: {ex}"


def _extract_after_prefix(text: str, prefixes: List[str]) -> str:
    lowered = text.strip().lower()
    for prefix in prefixes:
        if lowered.startswith(prefix):
            return text.strip()[len(prefix) :].strip()
    return ""


def _looks_like_url(text: str) -> bool:
    lowered = text.strip().lower()
    return lowered.startswith("http://") or lowered.startswith("https://") or "." in lowered


def _execute_shell_command(cmd: str) -> str:
    completed = subprocess.run(
        ["powershell", "-NoProfile", "-Command", cmd],
        capture_output=True,
        text=True,
        timeout=35,
        shell=False,
    )
    output = (completed.stdout or completed.stderr or "").strip()
    trimmed = output[:500] if output else "No output"
    if completed.returncode != 0:
        return f"Shell command failed (code {completed.returncode}): {trimmed}"
    return f"Shell command executed: {trimmed}"


def run_dynamic_desktop_workflow(command_text: str) -> str:
    # Normalize separators so inputs like "open_file explorer" also work.
    raw = re.sub(r"[_]+", " ", command_text.strip())
    lowered = raw.lower()

    try:
        if any(k in lowered for k in ["shutdown", "power off", "band karo", "switch off"]):
            subprocess.Popen(["shutdown", "/s", "/t", "5"], shell=False)
            return "Executed desktop workflow: shutdown initiated (5 sec)."

        if any(k in lowered for k in ["restart", "reboot"]):
            subprocess.Popen(["shutdown", "/r", "/t", "5"], shell=False)
            return "Executed desktop workflow: restart initiated (5 sec)."

        if any(k in lowered for k in ["lock screen", "lock laptop", "lock pc"]):
            subprocess.Popen(["rundll32.exe", "user32.dll,LockWorkStation"], shell=False)
            return "Executed desktop workflow: screen locked."

        if lowered in {"open file explorer", "open explorer", "file explorer", "explorer"}:
            subprocess.Popen(["explorer"], shell=False)
            return "Executed desktop workflow: opened File Explorer."

        if lowered in {"close", "close app", "close window", "close current window"}:
            return "Close command ambiguous. Try: close notepad / close chrome / close explorer."

        close_target = _extract_after_prefix(
            lowered,
            ["close file explorer", "close explorer", "close app", "close ", "terminate ", "stop "],
        )
        if close_target or lowered in {"close explorer", "close file explorer"}:
            target = close_target or "explorer"
            target = target.strip()

            process_map = {
                "explorer": "explorer.exe",
                "file explorer": "explorer.exe",
                "notepad": "notepad.exe",
                "chrome": "chrome.exe",
                "cmd": "cmd.exe",
                "command prompt": "cmd.exe",
            }

            proc = process_map.get(target)
            if not proc:
                # Generic fallback: close <appname> => taskkill /IM appname.exe
                clean = re.sub(r"[^a-z0-9._-]", "", target.lower())
                if not clean:
                    return "Unsupported close target. Try close explorer/notepad/chrome/cmd."
                proc = clean if clean.endswith(".exe") else f"{clean}.exe"

            killed = subprocess.run(
                ["taskkill", "/IM", proc, "/F"],
                capture_output=True,
                text=True,
                shell=False,
            )
            if killed.returncode == 0:
                return f"Executed desktop workflow: closed {target}."

            err = (killed.stderr or killed.stdout or "process not running").strip()
            return f"Close failed for {target}: {err[:250]}"

        # Direct path open support, e.g. "C:/Users/..." or "D:\\Work"
        if os.path.exists(raw):
            os.startfile(raw)
            return f"Executed desktop workflow: opened path {raw}."

        # Check file/folder BEFORE generic "open" to avoid conflicts
        file_target = _extract_after_prefix(raw, ["open file", "file open", "openfile"])
        if file_target:
            if os.path.isfile(file_target):
                os.startfile(file_target)
                return f"Executed desktop workflow: opened file {file_target}."
            return f"File not found: {file_target}"

        folder_target = _extract_after_prefix(raw, ["open folder", "folder open"])
        if folder_target:
            if os.path.isdir(folder_target):
                os.startfile(folder_target)
                return f"Executed desktop workflow: opened folder {folder_target}."
            return f"Folder not found: {folder_target}"

        web_query = _extract_after_prefix(lowered, ["search web", "google", "search "])
        if web_query:
            url = f"https://www.google.com/search?q={quote_plus(web_query)}"
            subprocess.Popen(["cmd", "/c", "start", "", url], shell=False)
            return f"Executed desktop workflow: web search for '{web_query}'."

        website_target = _extract_after_prefix(lowered, ["open website", "open url"])
        if website_target:
            target = website_target if website_target.startswith(("http://", "https://")) else f"https://{website_target}"
            subprocess.Popen(["cmd", "/c", "start", "", target], shell=False)
            return f"Executed desktop workflow: opened website {target}."

        app_target = _extract_after_prefix(lowered, ["open app", "launch app", "start app", "open "])
        if app_target and not app_target.startswith(("website", "url", "file", "folder")):
            subprocess.Popen(["cmd", "/c", "start", "", app_target], shell=False)
            return f"Executed desktop workflow: opened app {app_target}."

        create_folder_target = _extract_after_prefix(raw, ["create folder", "new folder", "make folder"])
        if create_folder_target:
            os.makedirs(create_folder_target, exist_ok=True)
            return f"Executed desktop workflow: folder created {create_folder_target}."

        create_file_target = _extract_after_prefix(raw, ["create file", "new file", "make file"])
        if create_file_target:
            parent = os.path.dirname(create_file_target)
            if parent:
                os.makedirs(parent, exist_ok=True)
            with open(create_file_target, "a", encoding="utf-8"):
                pass
            return f"Executed desktop workflow: file created {create_file_target}."

        delete_file_target = _extract_after_prefix(raw, ["delete file", "remove file"])
        if delete_file_target and os.path.isfile(delete_file_target):
            os.remove(delete_file_target)
            return f"Executed desktop workflow: file deleted {delete_file_target}."

        delete_folder_target = _extract_after_prefix(raw, ["delete folder", "remove folder"])
        if delete_folder_target and os.path.isdir(delete_folder_target):
            os.rmdir(delete_folder_target)
            return f"Executed desktop workflow: folder deleted {delete_folder_target}."

        shell_target = _extract_after_prefix(raw, ["run", "execute", "command"])
        if shell_target:
            return _execute_shell_command(shell_target)

        if _looks_like_url(raw):
            target = raw if raw.startswith(("http://", "https://")) else f"https://{raw}"
            subprocess.Popen(["cmd", "/c", "start", "", target], shell=False)
            return f"Executed desktop workflow: opened website {target}."

        return _execute_shell_command(raw)
    except Exception as ex:  # pragma: no cover - host specific process launch
        return f"Desktop workflow failed: {ex}"


def run_mobile_action(command_text: str) -> str:
    mapped = SUPPORTED_MOBILE_ACTIONS.get(command_text)
    if mapped:
        return f"Forwarded mobile action: {mapped}"
    return f"Forwarded mobile action: {command_text}"


def ai_predict_workflow(command_text: str) -> Tuple[Optional[str], float, List[str]]:
    query = command_text.strip().lower()
    if not query:
        return None, 0.0, []

    best_label = None
    best_score = 0.0
    scored_labels = []
    query_tokens = set(tokenize(query))

    for label, hints in WORKFLOW_INTENT_HINTS.items():
        score = 0.0
        for hint in hints:
            hint_tokens = set(tokenize(hint))
            overlap = len(query_tokens.intersection(hint_tokens)) / max(1, len(hint_tokens))
            score = max(score, overlap)
        scored_labels.append((label, score))
        if score > best_score:
            best_score = score
            best_label = label

    scored_labels.sort(key=lambda item: item[1], reverse=True)
    top = [item[0] for item in scored_labels[:4]]
    confidence = min(1.0, best_score + (0.2 if any(tok in query for tok in ["open", "run", "search", "shutdown", "restart"]) else 0.0))
    if confidence < 0.35:
        return None, confidence, top
    return best_label, confidence, top


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/desktop")
def desktop_page():
    return render_template("desktop.html")


@app.route("/mobile")
def mobile_page():
    return render_template("mobile.html")


@socketio.on("register_desktop")
def register_desktop(_payload=None):
    with lock:
        pair_code = make_pair_code()
        while pair_code in sessions_by_code:
            pair_code = make_pair_code()

        session = PairSession(code=pair_code, desktop_sid=request.sid)
        sessions_by_code[pair_code] = session
        rooms[session.room_id] = session
        sid_to_room[request.sid] = session.room_id

    join_room(session.room_id)
    emit(
        "desktop_registered",
        {
            "pairCode": pair_code,
            "roomId": session.room_id,
            "supportedCommands": list(SUPPORTED_DESKTOP_ACTIONS.keys()) + DESKTOP_DYNAMIC_EXAMPLES,
        },
    )


@socketio.on("pair_mobile")
def pair_mobile(payload):
    pair_code = str(payload.get("pairCode", "")).strip()
    with lock:
        session = sessions_by_code.get(pair_code)
        if not session:
            emit(
                "pair_error",
                {
                    "message": "Invalid pairing code. Please retry.",
                },
            )
            return

        session.mobile_sid = request.sid
        session.paired = True
        sid_to_room[request.sid] = session.room_id

    join_room(session.room_id)
    emit(
        "paired_success",
        {
            "pairCode": pair_code,
            "roomId": session.room_id,
            "supportedBrowserActions": ["say hello", "vibrate", "open github", "open youtube"],
        },
        to=session.room_id,
    )


@socketio.on("voice_command")
def voice_command(payload):
    session = find_session_by_sid(request.sid)
    if not session or not session.paired:
        emit(
            "command_result",
            {"ok": False, "message": "No active paired session."},
        )
        return

    command_text = str(payload.get("command", "")).strip()
    source_device = str(payload.get("sourceDevice", "unknown")).strip().lower()

    if source_device == "mobile":
        predicted_action, confidence, suggestions = ai_predict_action(
            command_text,
            list(SUPPORTED_DESKTOP_ACTIONS.keys()),
        )
        workflow_intent, workflow_conf, workflow_suggestions = ai_predict_workflow(command_text)
        action_to_run = predicted_action or command_text.strip().lower()

        result = run_desktop_action(action_to_run)
        if result.startswith("Unsupported"):
            result = run_dynamic_desktop_workflow(command_text)

        ok = result.startswith("Executed") or result.startswith("Shell command executed")
        if ok:
            remembered = workflow_intent or action_to_run
            session.history.append(remembered)
            session.history = session.history[-40:]

        emit(
            "command_result",
            {
                "ok": ok,
                "message": result,
                "executedOn": "desktop",
                "ai": {
                    "heard": command_text,
                    "interpreted": workflow_intent or action_to_run,
                    "confidence": round(max(confidence, workflow_conf), 2),
                    "suggestions": list(dict.fromkeys((suggestions or []) + (workflow_suggestions or [])))[:4],
                },
            },
            to=session.room_id,
        )
        return

    if source_device == "desktop":
        predicted_action, confidence, suggestions = ai_predict_action(
            command_text,
            list(SUPPORTED_MOBILE_ACTIONS.keys()),
        )
        action_to_send = predicted_action or command_text.strip().lower()
        run_mobile_action(action_to_send)
        session.history.append(action_to_send)
        session.history = session.history[-40:]

        emit(
            "mobile_command",
            {
                "command": action_to_send,
                "from": "desktop",
                "ai": {
                    "heard": command_text,
                    "interpreted": action_to_send,
                    "confidence": round(confidence, 2),
                    "suggestions": suggestions,
                },
            },
            to=session.room_id,
        )
        emit(
            "command_result",
            {
                "ok": True,
                "message": f"Forwarded to mobile app: {action_to_send}",
                "executedOn": "mobile",
                "ai": {
                    "heard": command_text,
                    "interpreted": action_to_send,
                    "confidence": round(confidence, 2),
                    "suggestions": suggestions,
                },
            },
            to=session.room_id,
        )


@socketio.on("ai_suggest")
def ai_suggest(payload):
    session = find_session_by_sid(request.sid)
    source_device = str(payload.get("sourceDevice", "mobile")).strip().lower()
    query = str(payload.get("query", "")).strip()

    action_space = list(SUPPORTED_DESKTOP_ACTIONS.keys())
    if source_device == "desktop":
        action_space = list(SUPPORTED_MOBILE_ACTIONS.keys())

    predicted_action, confidence, suggestions = ai_predict_action(query, action_space)
    if source_device == "mobile":
        workflow_prediction, workflow_confidence, workflow_suggestions = ai_predict_workflow(query)
        if workflow_prediction and workflow_prediction not in suggestions:
            suggestions = [workflow_prediction] + suggestions
        confidence = max(confidence, workflow_confidence)
        if workflow_prediction and not predicted_action:
            predicted_action = workflow_prediction
        for item in workflow_suggestions:
            if item not in suggestions:
                suggestions.append(item)

    learned = personalized_suggestions(session, action_space)
    merged = []
    for item in suggestions + learned:
        if item not in merged:
            merged.append(item)

    # Add Generative AI smart suggestions if available
    ml_engine = get_ml_engine()
    if query.strip() and ml_engine:
        try:
            ai_suggestions = ml_engine.generate_smart_suggestions(query)
            for item in ai_suggestions:
                if item not in merged and len(merged) < 5:
                    merged.append(item)
        except Exception as e:
            pass  # Silently fallback if AI suggestion fails

    emit(
        "ai_suggest_result",
        {
            "query": query,
            "suggestions": merged[:4],
            "predicted": predicted_action,
            "confidence": round(confidence, 2),
        },
    )


@socketio.on("disconnect")
def on_disconnect():
    session = find_session_by_sid(request.sid)
    if not session:
        return

    if session.desktop_sid == request.sid:
        if session.code in sessions_by_code:
            del sessions_by_code[session.code]
        if session.mobile_sid in sid_to_room:
            del sid_to_room[session.mobile_sid]
        if request.sid in sid_to_room:
            del sid_to_room[request.sid]

        emit(
            "peer_disconnected",
            {"message": "Desktop disconnected."},
            to=session.room_id,
        )
        return

    if session.mobile_sid == request.sid:
        session.mobile_sid = None
        session.paired = False
        if request.sid in sid_to_room:
            del sid_to_room[request.sid]

        emit(
            "peer_disconnected",
            {"message": "Mobile disconnected."},
            to=session.room_id,
        )


if __name__ == "__main__":
    # Default to HTTP for reliable desktop startup. Set POCKET_SSL=1 when HTTPS is needed.
    use_ssl = os.getenv("POCKET_SSL", "0") == "1"
    try:
        socketio.run(
            app,
            host="0.0.0.0",
            port=5000,
            debug=False,
            use_reloader=False,
            ssl_context="adhoc" if use_ssl else None,
        )
    except Exception as ex:
        if use_ssl:
            print(f"HTTPS startup failed ({ex}). Falling back to HTTP mode.")
            socketio.run(
                app,
                host="0.0.0.0",
                port=5000,
                debug=False,
                use_reloader=False,
                ssl_context=None,
            )
        else:
            raise
