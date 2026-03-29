function getConfiguredBackendUrl() {
  try {
    const value = window.POCKET_CONFIG && window.POCKET_CONFIG.BACKEND_URL;
    if (!value) return "";
    const normalized = normalizeBackendInput(value.trim());
    return normalized;
  } catch (_e) {
    return "";
  }
}

function isNetlifiFrontend() {
  try {
    return window.location.hostname.includes("netlify.app");
  } catch (_e) {
    return false;
  }
}

function resolveBackendUrl() {
  try {
    const params = new URLSearchParams(window.location.search || "");
    const fromQuery = (params.get("backend") || "").trim();
    if (fromQuery) {
      const normalized = normalizeBackendInput(fromQuery);
      localStorage.setItem("pocket_backend_url", normalized);
      return normalized;
    }

    const configured = getConfiguredBackendUrl();
    if (configured) {
      localStorage.setItem("pocket_backend_url", configured);
      return configured;
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
  const isLocalPage = ["localhost", "127.0.0.1"].includes(window.location.hostname);
  const isHostedPage = window.location.hostname.includes("netlify.app") || window.location.hostname.includes("vercel.app");
  const hostedCandidates = (window.POCKET_CONFIG && window.POCKET_CONFIG.BACKEND_CANDIDATES) || [];
  const localFallbacks = [
    "https://127.0.0.1:5000",
    "https://localhost:5000",
    "http://127.0.0.1:5000",
    "http://localhost:5000",
  ];
  const defaults = isHostedPage
    ? [...hostedCandidates, window.location.origin]
    : [
        window.location.origin,
        ...(isLocalPage ? localFallbacks : []),
      ];
  const targets = explicitBackend ? [explicitBackend, ...defaults] : defaults;
  return [...new Set(targets.filter(Boolean))];
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
let connectedSocketTarget = explicitBackend || "";
let mobileBackendHint = "";

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
const mobileShareLinkEl = document.getElementById("mobile-share-link");
const copyShareLinkBtn = document.getElementById("copy-share-link-btn");

function buildMobilePairLink(pairCode) {
  const mobileBase = "https://pocketterminal.netlify.app/mobile";
  const backendUrl = mobileBackendHint || connectedSocketTarget || explicitBackend || window.location.origin;
  const link = new URL(mobileBase);
  link.searchParams.set("backend", backendUrl);
  link.searchParams.set("code", pairCode);
  return link.toString();
}

function setShareLink(pairCode) {
  if (!mobileShareLinkEl) {
    return;
  }
  mobileShareLinkEl.value = buildMobilePairLink(pairCode);
}

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

function wireDesktopSocketHandlers(target) {
  socket.on("connect", () => {
    connectedSocketTarget = target;
    emitEvent("register_desktop", {});
    statusEl.textContent = "Desktop connected to server. Generating pair code...";
  });

  socket.on("desktop_registered", (payload) => {
    mobileBackendHint = (payload.backendUrlForMobile || "").trim();
    pairCodeEl.textContent = payload.pairCode;
    statusEl.textContent = "Pair code ready. Open mobile app and enter this code.";
    setShareLink(payload.pairCode);

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

  if (!socketTargets.length || index >= socketTargets.length) {
    return false;
  }

  const target = socketTargets[index];
  socket = io(target, {
    transports: ["websocket", "polling"],
    timeout: 10000,
  });

  wireDesktopSocketHandlers(target);

  socket.on("connect_error", () => {
    if (index < socketTargets.length - 1) {
      appendLog(`Backend connect failed on ${target}, trying next...`);
      try {
        socket.close();
      } catch (_e) {
        // ignore close errors
      }
      connectDesktopSocket(index + 1);
      return;
    }
    statusEl.textContent = "Backend connect failed. Render backend URL verify karein: https://pocketterminal-api.onrender.com/health";
  });

  socket.on("disconnect", () => {
    statusEl.textContent = "Disconnected from backend. Retrying...";
  });

  return true;
}

if (!connectDesktopSocket(0)) {
  statusEl.textContent = "Backend URL missing ya invalid hai. /desktop?backend=https://pocketterminal-api.onrender.com try karein.";
  sendBtn.disabled = true;
  commandInput.disabled = true;
  appendLog("Socket target unavailable. Backend configuration required.");
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

if (copyShareLinkBtn && mobileShareLinkEl) {
  copyShareLinkBtn.addEventListener("click", async () => {
    const value = mobileShareLinkEl.value.trim();
    if (!value) {
      appendLog("Pair code aane ke baad link copy karein.");
      return;
    }
    try {
      await navigator.clipboard.writeText(value);
      appendLog("Auto pair link copied. Isse mobile me open karein.");
    } catch (_e) {
      mobileShareLinkEl.select();
      appendLog("Clipboard blocked. Link select ho gaya, manually copy karein.");
    }
  });
}
