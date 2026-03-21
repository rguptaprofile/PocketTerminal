function resolveBackendUrl() {
  try {
    const params = new URLSearchParams(window.location.search || "");
    const fromQuery = (params.get("backend") || "").trim();
    if (fromQuery) {
      localStorage.setItem("pocket_backend_url", fromQuery);
      return fromQuery;
    }
    const saved = (localStorage.getItem("pocket_backend_url") || "").trim();
    if (saved) {
      return saved;
    }
  } catch (_e) {
    // ignore storage/query parsing issues
  }
  return "";
}

function makeSocketTargets(explicitBackend) {
  if (explicitBackend) {
    return [explicitBackend];
  }
  return [
    window.location.origin,
    "http://127.0.0.1:5000",
    "http://localhost:5000",
  ];
}

function normalizeBackendInput(value) {
  const v = (value || "").trim();
  if (!v) {
    return "";
  }
  if (v.startsWith("http://") || v.startsWith("https://")) {
    return v;
  }
  if (/^\d{1,3}(\.\d{1,3}){3}(?::\d+)?$/.test(v)) {
    return `http://${v.includes(":") ? v : `${v}:5000`}`;
  }
  return v;
}

const explicitBackend = resolveBackendUrl();
const socketTargets = makeSocketTargets(explicitBackend);
let socket = null;
let backendPromptShown = false;

const pairCodeEl = document.getElementById("pair-code");
const statusEl = document.getElementById("desktop-status");
const dashboardEl = document.getElementById("desktop-dashboard");
const roomEl = document.getElementById("desktop-room");
const commandsEl = document.getElementById("desktop-commands");
const logEl = document.getElementById("desktop-log");
const sendBtn = document.getElementById("desktop-send-btn");
const commandInput = document.getElementById("desktop-command-input");
const suggestionsEl = document.getElementById("desktop-suggestions");
const aiSummaryEl = document.getElementById("desktop-ai-summary");

function emitEvent(eventName, payload) {
  if (!socket) {
    return;
  }
  socket.emit(eventName, payload);
}

function appendLog(message) {
  const line = `[${new Date().toLocaleTimeString()}] ${message}`;
  logEl.textContent = `${line}\n${logEl.textContent}`;
}

function renderSuggestions(list) {
  suggestionsEl.innerHTML = "";
  list.forEach((item) => {
    const chip = document.createElement("button");
    chip.className = "chip";
    chip.textContent = item;
    chip.addEventListener("click", () => {
      commandInput.value = item;
    });
    suggestionsEl.appendChild(chip);
  });
}

function wireDesktopSocketHandlers() {
  socket.on("connect", () => {
    emitEvent("register_desktop", {});
    statusEl.textContent = "Desktop connected to server. Generating pair code...";
  });

  socket.on("desktop_registered", (payload) => {
    pairCodeEl.textContent = payload.pairCode;
    statusEl.textContent = "Pair code ready. Open mobile app and enter this code.";

    commandsEl.innerHTML = "";
    payload.supportedCommands.forEach((cmd) => {
      const li = document.createElement("li");
      li.textContent = cmd;
      commandsEl.appendChild(li);
    });

    appendLog(`Desktop registered with pair code ${payload.pairCode}`);
  });

  socket.on("paired_success", (payload) => {
    dashboardEl.classList.remove("hidden");
    roomEl.textContent = payload.roomId;
    statusEl.textContent = "Paired successfully with mobile device.";
    appendLog("Pairing successful. Unique dashboard unlocked.");

    emitEvent("ai_suggest", {
      sourceDevice: "desktop",
      query: "",
    });
  });

  socket.on("command_result", (payload) => {
    const outcome = payload.ok ? "SUCCESS" : "ERROR";
    appendLog(`${outcome}: ${payload.message} (${payload.executedOn || "unknown"})`);

    if (payload.ai) {
      aiSummaryEl.textContent = `AI heard: "${payload.ai.heard}" | interpreted: "${payload.ai.interpreted}" | confidence: ${payload.ai.confidence}`;
      renderSuggestions(payload.ai.suggestions || []);
    }
  });

  socket.on("mobile_command", (payload) => {
    appendLog(`Mobile side action received: ${payload.command}`);
  });

  socket.on("peer_disconnected", (payload) => {
    statusEl.textContent = payload.message;
    appendLog(payload.message);
  });

  socket.on("ai_suggest_result", (payload) => {
    if (payload.query) {
      aiSummaryEl.textContent = `Suggestion confidence: ${payload.confidence} | predicted: ${payload.predicted || "n/a"}`;
    }
    renderSuggestions(payload.suggestions || []);
  });
}

function connectDesktopSocket(index) {
  if (typeof io !== "function") {
    return false;
  }

  const target = socketTargets[index];
  socket = io(target, {
    transports: ["websocket", "polling"],
    timeout: 10000,
  });

  wireDesktopSocketHandlers();

  socket.on("connect_error", () => {
    if (!explicitBackend && index < socketTargets.length - 1) {
      appendLog(`Backend connect failed on ${target}, trying next...`);
      try {
        socket.close();
      } catch (_e) {
        // ignore close errors
      }
      connectDesktopSocket(index + 1);
      return;
    }
    statusEl.textContent = "Backend connect failed. Enter laptop backend URL once (e.g. http://192.168.1.10:5000).";
    if (!backendPromptShown) {
      backendPromptShown = true;
      const userInput = window.prompt("Backend URL enter karein (example: http://192.168.1.10:5000)");
      const normalized = normalizeBackendInput(userInput);
      if (normalized) {
        try {
          localStorage.setItem("pocket_backend_url", normalized);
        } catch (_e) {
          // ignore storage failures
        }
        window.location.reload();
      }
    }
  });

  socket.on("disconnect", () => {
    statusEl.textContent = "Disconnected from backend. Retrying...";
  });

  return true;
}

if (!connectDesktopSocket(0)) {
  statusEl.textContent = "Socket library load nahi hui. Internet check karein aur page reload karein.";
  sendBtn.disabled = true;
  commandInput.disabled = true;
  appendLog("Socket.IO client load failed.");
}

sendBtn.addEventListener("click", () => {
  const command = commandInput.value.trim();
  if (!command) {
    return;
  }

  emitEvent("voice_command", {
    sourceDevice: "desktop",
    command,
  });

  appendLog(`Desktop forwarded to mobile: ${command}`);
  commandInput.value = "";
});

commandInput.addEventListener("input", () => {
  emitEvent("ai_suggest", {
    sourceDevice: "desktop",
    query: commandInput.value,
  });
});
