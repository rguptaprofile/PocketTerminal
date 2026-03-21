function resolveBackendUrl() {
  try {
    const params = new URLSearchParams(window.location.search || "");
    const fromQuery = normalizeBackendInput((params.get("backend") || "").trim());
    if (fromQuery) {
      localStorage.setItem("pocket_backend_url", fromQuery);
      return fromQuery;
    }
    const saved = (localStorage.getItem("pocket_backend_url") || "").trim();
    if (saved) {
      const normalizedSaved = normalizeBackendInput(saved);
      localStorage.setItem("pocket_backend_url", normalizedSaved);
      return normalizedSaved;
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
    if (window.location.protocol === "https:" && v.startsWith("http://")) {
      return `https://${v.slice("http://".length)}`;
    }
    return v;
  }
  if (/^\d{1,3}(\.\d{1,3}){3}(?::\d+)?$/.test(v)) {
    const scheme = window.location.protocol === "https:" ? "https" : "http";
    return `${scheme}://${v.includes(":") ? v : `${v}:5000`}`;
  }
  return v;
}

const explicitBackend = resolveBackendUrl();
const socketTargets = makeSocketTargets(explicitBackend);
let socket = null;
const prefilledPairCode = (() => {
  try {
    const params = new URLSearchParams(window.location.search || "");
    const raw = (params.get("code") || "").trim();
    return /^\d{6}$/.test(raw) ? raw : "";
  } catch (_e) {
    return "";
  }
})();
let autoPairAttempted = false;

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

function triggerPairing() {
  const pairCode = pairInput.value.trim();
  if (!pairCode) {
    statusEl.textContent = "Please enter pair code.";
    return;
  }

  emitEvent("pair_mobile", { pairCode });
  statusEl.textContent = "Pairing request sent...";
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
  triggerPairing();
});

function wireMobileSocketHandlers() {
  socket.on("connect", () => {
    if (prefilledPairCode && !autoPairAttempted) {
      autoPairAttempted = true;
      pairInput.value = prefilledPairCode;
      triggerPairing();
    }
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

function connectMobileSocket(index) {
  if (typeof io !== "function") {
    return false;
  }

  const target = socketTargets[index];
  socket = io(target, {
    transports: ["websocket", "polling"],
    timeout: 10000,
  });

  wireMobileSocketHandlers();

  socket.on("connect_error", () => {
    if (!explicitBackend && index < socketTargets.length - 1) {
      appendLog(`Backend connect failed on ${target}, trying next...`);
      try {
        socket.close();
      } catch (_e) {
        // ignore close errors
      }
      connectMobileSocket(index + 1);
      return;
    }
    statusEl.textContent = "Backend connect failed. Desktop se generated auto-pair link open karein.";
  });

  socket.on("disconnect", () => {
    statusEl.textContent = "Disconnected from backend. Retrying...";
  });

  return true;
}

if (!connectMobileSocket(0)) {
  statusEl.textContent = "Socket library load nahi hui. Internet check karein aur page reload karein.";
  pairBtn.disabled = true;
  manualSendBtn.disabled = true;
  startVoiceBtn.disabled = true;
  micCheckBtn.disabled = true;
  appendLog("Socket.IO client load failed.");
}

if (prefilledPairCode) {
  pairInput.value = prefilledPairCode;
  statusEl.textContent = "Auto pair code detected. Backend connect hote hi pairing send hoga.";
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
