// Environment-aware backend configuration
window.POCKET_CONFIG = (() => {
  const HOSTED_BACKEND_CANDIDATES = [
    "https://pocketterminal-backend.onrender.com",
    "https://pocket-terminal-backend.onrender.com",
    "https://pocketterminal.onrender.com",
    "https://pocketterminal-api.onrender.com",
    "https://pocket-terminal-api.onrender.com",
    "https://pocket-terminal.onrender.com",
  ];
  const hostname = window.location.hostname;
  const isNetlify = hostname.includes("netlify.app");
  const isVercel = hostname.includes("vercel.app");
  const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1";
  const params = new URLSearchParams(window.location.search || "");
  const queryBackend = (params.get("backend") || "").trim();
  const savedBackend = (localStorage.getItem("pocket_backend_url") || "").trim();

  let backendUrl = "";

  // Priority: query override -> saved override -> default hosted backend
  if (queryBackend) {
    backendUrl = queryBackend;
  } else if (savedBackend) {
    backendUrl = savedBackend;
  }

  const normalizeUrl = (value) => {
    const v = (value || "").trim();
    if (!v) return "";
    if (v.startsWith("http://") || v.startsWith("https://")) return v;
    return `https://${v}`;
  };

  const isLocalHostStyle = (value) => {
    const lower = (value || "").toLowerCase();
    return (
      lower.includes("localhost") ||
      lower.includes("127.0.0.1") ||
      /^https?:\/\/192\.168\./.test(lower) ||
      /^https?:\/\/10\./.test(lower) ||
      /^https?:\/\/172\.(1[6-9]|2\d|3[0-1])\./.test(lower)
    );
  };

  // Hosted frontend default: use deployed backend URL for reliable public pairing.
  if (isNetlify || isVercel) {
    if (savedBackend && isLocalHostStyle(savedBackend)) {
      localStorage.removeItem("pocket_backend_url");
    }
    backendUrl = normalizeUrl(backendUrl) || HOSTED_BACKEND_CANDIDATES[0];
  }
  // Development: localhost uses local backend
  else if (isLocalhost) {
    const scheme = window.location.protocol === "https:" ? "https" : "http";
    backendUrl = backendUrl || `${scheme}://${hostname}:5000`;
  }
  // Other web hosts: try same origin + port 5000
  else {
    const scheme = window.location.protocol === "https:" ? "https" : "http";
    backendUrl = backendUrl || `${scheme}://${hostname}:5000`;
  }

  return {
    BACKEND_URL: backendUrl,
    BACKEND_CANDIDATES: HOSTED_BACKEND_CANDIDATES,
    IS_PRODUCTION: isNetlify || isVercel,
    IS_LOCAL_DEV: isLocalhost,
    ENVIRONMENT: isNetlify || isVercel ? "production" : isLocalhost ? "development" : "unknown",
  };
})();