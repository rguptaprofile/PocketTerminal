// Environment-aware backend configuration
window.POCKET_CONFIG = (() => {
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

  // Hosted frontend default: prefer local desktop backend so pairing works without extra backend deployment.
  if (isNetlify || isVercel) {
    if (savedBackend.includes("onrender.com")) {
      localStorage.removeItem("pocket_backend_url");
    }
    backendUrl = backendUrl || "https://127.0.0.1:5000";
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
    IS_PRODUCTION: isNetlify || isVercel,
    IS_LOCAL_DEV: isLocalhost,
    ENVIRONMENT: isNetlify || isVercel ? "production" : isLocalhost ? "development" : "unknown",
  };
})();