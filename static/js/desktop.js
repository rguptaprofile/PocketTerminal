const socket = typeof io === "function" ? io() : null;

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

if (!socket) {
  statusEl.textContent = "Socket library load nahi hui. Internet check karein aur page reload karein.";
  sendBtn.disabled = true;
  commandInput.disabled = true;
  appendLog("Socket.IO client load failed.");
} else {
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
