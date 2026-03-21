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

const backendUrl = resolveBackendUrl();
const socket = typeof io === "function"
  ? io(backendUrl || undefined, { transports: ["websocket", "polling"], timeout: 10000 })
  : null;

const pairInput = document.getElementById("pair-input");
const pairBtn = document.getElementById("pair-btn");
const statusEl = document.getElementById("mobile-status");
const dashboardEl = document.getElementById("mobile-dashboard");
const roomEl = document.getElementById("mobile-room");
const startVoiceBtn = document.getElementById("start-voice-btn");
const micCheckBtn = document.getElementById("mic-check-btn");
const manualInput = document.getElementById("manual-command-input");
const manualSendBtn = document.getElementById("manual-send-btn");
const logEl = document.getElementById("mobile-log");
const suggestionsEl = document.getElementById("mobile-suggestions");
const aiSummaryEl = document.getElementById("mobile-ai-summary");
const troubleshootEl = document.getElementById("voice-troubleshoot");

function emitEvent(eventName, payload) {
  if (!socket) {
    return;
  }
  socket.emit(eventName, payload);
}

const speechSupported = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
const isLocalHost = location.hostname === "localhost" || location.hostname === "127.0.0.1";
const isInsecureRemoteContext = !window.isSecureContext && !isLocalHost;

if (!speechSupported) {
  troubleshootEl.textContent = "Voice API supported nahi hai. Chrome/Edge mobile browser use karein.";
}

if (isInsecureRemoteContext) {
  troubleshootEl.textContent = "Voice ke liye HTTPS required hai. Mobile me https://<laptop-ip>:5000/mobile open karein.";
  startVoiceBtn.disabled = true;
  micCheckBtn.disabled = true;
}

function appendLog(message) {
  const line = `[${new Date().toLocaleTimeString()}] ${message}`;
  logEl.textContent = `${line}\n${logEl.textContent}`;
}

function sendMobileCommand(command) {
  const trimmed = (command || "").trim();
  if (!trimmed) {
    return;
  }

  emitEvent("voice_command", {
    sourceDevice: "mobile",
    command: trimmed,
  });

  appendLog(`Mobile command sent: ${trimmed}`);
}

function renderSuggestions(list) {
  suggestionsEl.innerHTML = "";
  list.forEach((item) => {
    const chip = document.createElement("button");
    chip.className = "chip";
    chip.textContent = item;
    chip.addEventListener("click", () => {
      manualInput.value = item;
      sendMobileCommand(item);
    });
    suggestionsEl.appendChild(chip);
  });
}

function normalizeUrl(target) {
  const trimmed = (target || "").trim();
  if (!trimmed) {
    return "";
  }
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

function openMobileApp(target) {
  const t = (target || "").trim().toLowerCase();
  const appUrlMap = {
    whatsapp: "whatsapp://send",
    telegram: "tg://",
    instagram: "instagram://app",
    facebook: "fb://",
    youtube: "vnd.youtube://",
    gmail: "googlegmail://",
    maps: "geo:0,0?q=",
    chrome: "https://www.google.com",
  };

  if (appUrlMap[t]) {
    window.open(appUrlMap[t], "_self");
    appendLog(`Tried opening mobile app: ${t}`);
    return true;
  }

  return false;
}

async function requestMicPermission() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    troubleshootEl.textContent = "Browser me mic API available nahi hai.";
    return false;
  }

  if (isInsecureRemoteContext) {
    troubleshootEl.textContent = "Voice ke liye secure context chahiye. Mobile me https://<laptop-ip>:5000/mobile open karein.";
    return false;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => track.stop());
    troubleshootEl.textContent = "Mic permission granted.";
    return true;
  } catch (err) {
    const errName = (err && err.name) ? err.name : "UnknownError";
    if (errName === "NotAllowedError") {
      troubleshootEl.textContent = "Mic permission denied hai. Browser site settings me Microphone ko Allow karein.";
    } else {
      troubleshootEl.textContent = `Mic permission blocked: ${err.message}`;
    }
    return false;
  }
}

pairBtn.addEventListener("click", () => {
  const pairCode = pairInput.value.trim();
  if (!pairCode) {
    statusEl.textContent = "Please enter pair code.";
    return;
  }

  emitEvent("pair_mobile", { pairCode });
  statusEl.textContent = "Pairing request sent...";
});

if (!socket) {
  statusEl.textContent = "Socket library load nahi hui. Internet check karein aur page reload karein.";
  pairBtn.disabled = true;
  manualSendBtn.disabled = true;
  startVoiceBtn.disabled = true;
  micCheckBtn.disabled = true;
  appendLog("Socket.IO client load failed.");
} else {
  socket.on("connect_error", () => {
    statusEl.textContent = "Backend connect failed. Open Mobile URL like: /mobile?backend=https://your-backend-url";
  });

  socket.on("disconnect", () => {
    statusEl.textContent = "Disconnected from backend. Retrying...";
  });

  socket.on("paired_success", (payload) => {
    dashboardEl.classList.remove("hidden");
    roomEl.textContent = payload.roomId;
    statusEl.textContent = `Paired with desktop code ${payload.pairCode}`;
    appendLog("Pair success. Unique connected dashboard unlocked.");

    if ("vibrate" in navigator) {
      navigator.vibrate([120, 80, 120]);
    }

    emitEvent("ai_suggest", {
      sourceDevice: "mobile",
      query: "",
    });
  });

  socket.on("pair_error", (payload) => {
    statusEl.textContent = payload.message;
    appendLog(`Pair error: ${payload.message}`);
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
    appendLog(`Desktop requested mobile action: ${payload.command}`);

    if (payload.ai) {
      aiSummaryEl.textContent = `AI heard: "${payload.ai.heard}" | interpreted: "${payload.ai.interpreted}" | confidence: ${payload.ai.confidence}`;
    }

    const cmd = payload.command.toLowerCase().trim();
    if (cmd === "open github") {
      window.open("https://github.com", "_blank");
    } else if (cmd === "open youtube") {
      window.open("https://youtube.com", "_blank");
    } else if (cmd.startsWith("open website ") || cmd.startsWith("open url ")) {
      const target = cmd.replace(/^open website\s+|^open url\s+/, "").trim();
      const url = normalizeUrl(target);
      if (url) {
        window.open(url, "_blank");
      }
    } else if (cmd.startsWith("open app ") || cmd.startsWith("launch app ") || cmd.startsWith("start app ")) {
      const appTarget = cmd.replace(/^open app\s+|^launch app\s+|^start app\s+/, "").trim();
      if (!openMobileApp(appTarget)) {
        appendLog(`App open not supported by browser sandbox: ${appTarget}`);
      }
    } else if (cmd.startsWith("open ")) {
      const target = cmd.replace(/^open\s+/, "").trim();
      if (target.includes(".") || target.includes("://")) {
        const url = normalizeUrl(target);
        if (url) {
          window.open(url, "_blank");
        }
      } else if (!openMobileApp(target)) {
        appendLog(`Generic open request received: ${target}`);
      }
    } else if (cmd === "close tab" || cmd === "close current tab" || cmd === "close browser") {
      window.close();
      appendLog("Browser may block close tab unless tab was opened by script.");
    } else if (cmd.startsWith("close ") || cmd.startsWith("terminate ") || cmd.startsWith("stop ")) {
      appendLog("Mobile OS security blocks closing other apps from browser automation.");
    } else if (cmd === "vibrate" && "vibrate" in navigator) {
      navigator.vibrate(300);
    } else if (cmd === "say hello" && "speechSynthesis" in window) {
      const utter = new SpeechSynthesisUtterance("Hello from your paired mobile app");
      speechSynthesis.speak(utter);
    }
  });

  socket.on("ai_suggest_result", (payload) => {
    if (payload.query) {
      aiSummaryEl.textContent = `Suggestion confidence: ${payload.confidence} | predicted: ${payload.predicted || "n/a"}`;
    }
    renderSuggestions(payload.suggestions || []);
  });

  socket.on("peer_disconnected", (payload) => {
    statusEl.textContent = payload.message;
    appendLog(payload.message);
  });
}

manualSendBtn.addEventListener("click", () => {
  sendMobileCommand(manualInput.value);
  manualInput.value = "";
});

manualInput.addEventListener("input", () => {
  emitEvent("ai_suggest", {
    sourceDevice: "mobile",
    query: manualInput.value,
  });
});

micCheckBtn.addEventListener("click", async () => {
  await requestMicPermission();
});

startVoiceBtn.addEventListener("click", () => {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    appendLog("Web Speech API not supported. Use Chrome/Edge mobile browser.");
    statusEl.textContent = "Voice API unavailable.";
    return;
  }

  requestMicPermission().then((allowed) => {
    if (!allowed) {
      statusEl.textContent = "Voice access not allowed. Manual input use karein ya mic permission enable karein.";
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    statusEl.textContent = "Listening... boliye command";
    recognition.start();

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      appendLog(`Voice heard: ${transcript}`);
      sendMobileCommand(transcript);
      statusEl.textContent = "Voice command sent.";
    };

    recognition.onerror = (event) => {
      appendLog(`Voice error: ${event.error}`);
      if (event.error === "not-allowed") {
        if (isInsecureRemoteContext) {
          troubleshootEl.textContent = "Voice blocked because page is not secure. https://<laptop-ip>:5000/mobile use karein.";
        } else {
          troubleshootEl.textContent = "Mic blocked hai. Browser settings me site permission Allow karein.";
        }
      }
      statusEl.textContent = "Voice capture failed. Retry.";
    };

    recognition.onend = () => {
      if (statusEl.textContent.includes("Listening")) {
        statusEl.textContent = "Voice capture ended.";
      }
    };
  });
});
