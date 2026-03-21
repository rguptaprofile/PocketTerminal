// Environment-aware backend configuration
window.POCKET_CONFIG = (() => {
  const hostname = window.location.hostname;
  const isNetlify = hostname.includes("netlify.app");
  const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1";

  let backendUrl = "";

  // Production: Netlify frontend uses Render backend
  if (isNetlify) {
    backendUrl = "https://pocketterminal-api.onrender.com"; // ← Your Render URL
  }
  // Development: localhost uses local backend
  else if (isLocalhost) {
    const scheme = window.location.protocol === "https:" ? "https" : "http";
    backendUrl = `${scheme}://${hostname}:5000`;
  }
  // Other web hosts: try same origin + port 5000
  else {
    const scheme = window.location.protocol === "https:" ? "https" : "http";
    backendUrl = `${scheme}://${hostname}:5000`;
  }

  return {
    BACKEND_URL: backendUrl,
    IS_PRODUCTION: isNetlify,
    IS_LOCAL_DEV: isLocalhost,
    ENVIRONMENT: isNetlify ? "production" : isLocalhost ? "development" : "unknown",
  };
})();