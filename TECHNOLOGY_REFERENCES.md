# 📚 POCKET TERMINAL: Technology References & Sources Guide

**Last Updated:** March 28, 2026  
**Project:** PocketTerminal - Remote Device Control via Socket.IO + AI

---

## 📦 BACKEND LIBRARIES (Python)

### 1. Flask 3.1.0
- **Source:** PyPI (https://pypi.org/project/Flask/)
- **Official Documentation:** https://flask.palletsprojects.com/
- **GitHub Repository:** https://github.com/pallets/flask
- **Purpose:** Web framework for HTTP routes, request handling, template rendering
- **Why Used:** Lightweight, perfect for real-time apps with minimal overhead
- **Installation Command:** `pip install Flask==3.1.0`

### 2. Flask-SocketIO 5.5.1
- **Source:** PyPI (https://pypi.org/project/flask-socketio/)
- **Official Documentation:** https://flask-socketio.readthedocs.io/
- **GitHub Repository:** https://github.com/miguelgrinberg/flask-socketio
- **Purpose:** WebSocket/real-time bidirectional communication between client & server
- **Why Used:** Enables instant pairing code delivery, command relay, live event communication
- **Installation Command:** `pip install Flask-SocketIO==5.5.1`

### 3. python-socketio 5.12.1
- **Source:** PyPI (https://pypi.org/project/python-socketio/)
- **Official Documentation:** https://python-socketio.readthedocs.io/
- **GitHub Repository:** https://github.com/miguelgrinberg/python-socketio
- **Purpose:** Core Socket.IO protocol implementation (underlying Flask-SocketIO)
- **Why Used:** Server-side WebSocket support, fallback to polling
- **Installation Command:** `pip install python-socketio==5.12.1`

### 4. gunicorn 22.0.0
- **Source:** PyPI (https://pypi.org/project/gunicorn/)
- **Official Documentation:** https://gunicorn.org/
- **GitHub Repository:** https://github.com/benoitc/gunicorn
- **Purpose:** WSGI HTTP server for production deployment
- **Why Used:** Handles concurrent requests, Render/Vercel hosting requirement
- **Installation Command:** `pip install gunicorn==22.0.0`

### 5. eventlet 0.36.1
- **Source:** PyPI (https://pypi.org/project/eventlet/)
- **Official Documentation:** https://eventlet.net/
- **GitHub Repository:** https://github.com/eventlet/eventlet
- **Purpose:** Asynchronous I/O library for WebSocket workers
- **Why Used:** Allows multiple concurrent Socket.IO connections without threading overhead
- **Installation Command:** `pip install eventlet==0.36.1`

### 6. cryptography ≥45.0.0
- **Source:** PyPI (https://pypi.org/project/cryptography/)
- **Official Documentation:** https://cryptography.io/
- **GitHub Repository:** https://github.com/pyca/cryptography
- **Purpose:** SSL/TLS certificate generation, HTTPS encryption
- **Why Used:** Self-signed certificate creation for localhost HTTPS testing
- **Installation Command:** `pip install cryptography>=45.0.0`

---

## 🎨 FRONTEND TECHNOLOGIES

### 1. HTML5
- **Official Specification:** https://www.w3.org/TR/html52/
- **Standard Body:** W3C (World Wide Web Consortium)
- **Usage in Project:**
  - `index.html` - Landing page with platform detection
  - `desktop.html` - Laptop control interface
  - `mobile.html` - Phone control interface
- **Features Used:**
  - Semantic elements (`<main>`, `<section>`, `<article>`)
  - Form inputs for command entry
  - Media elements for UI feedback

### 2. CSS3
- **Official Specification:** https://www.w3.org/Style/CSS/
- **Standard Body:** W3C
- **File Location:** `static/css/`
- **Features Used:**
  - Flexbox layout system
  - Media queries for responsive design
  - CSS Grid (if used)
  - Custom properties (CSS variables)
  - Animations & transitions

### 3. JavaScript (ES6+)
- **Official Standard:** ECMAScript 2020+ (https://www.ecma-international.org/publications/standards/Ecma-262.html)
- **MDN Documentation:** https://developer.mozilla.org/en-US/docs/Web/JavaScript
- **File Location:** `static/js/`
- **Features Used:**
  - Async/await for asynchronous calls
  - DOM manipulation APIs
  - Event handling
  - Local storage API for session persistence
  - Fetch API for HTTP requests

### 4. Socket.IO Client Library
- **Source:** npm (https://www.npmjs.com/package/socket.io-client)
- **Official Documentation:** https://socket.io/docs/client-api/
- **GitHub Repository:** https://github.com/socketio/socket.io-client
- **Installation:** `<script src="https://cdn.socket.io/4.5.4/socket.io.min.js"></script>` (CDN)
- **Purpose:** Client-side WebSocket connection to Flask-SocketIO backend
- **Why Used:** Real-time bidirectional communication, fallback support (polling/WebSocket)
- **Key Events Used in Project:**
  - `register_desktop` - Send desktop info to pair
  - `pair_mobile` - Mobile joins pairing code room
  - `voice_command` - Execute commands via voice/text

### 5. Web Speech API
- **Official Specification:** https://www.w3.org/TR/speech-api/
- **Standard Body:** W3C
- **Browser Support:** Chrome, Edge, Safari (https://caniuse.com/speech-recognition)
- **MDN Documentation:** https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API
- **Usage:** Voice recognition for command capture (mobile interface)
- **Example in Project:** `mobile.html` uses `SpeechRecognition` API

---

## 🤖 ML/AI LIBRARIES (Optional - requirements-ml.txt)

### 1. NumPy ≥1.24.0
- **Source:** PyPI (https://pypi.org/project/numpy/)
- **Official Documentation:** https://numpy.org/
- **GitHub Repository:** https://github.com/numpy/numpy
- **Purpose:** Numerical computing, matrix operations
- **Why Used:** Embedding vectors for commands, sequence padding in neural networks
- **Condition:** Python < 3.12 (TensorFlow compatibility)

### 2. TensorFlow ≥2.14.0
- **Source:** PyPI (https://pypi.org/project/tensorflow/)
- **Official Documentation:** https://www.tensorflow.org/
- **Google Official:** https://github.com/tensorflow/tensorflow
- **Purpose:** Deep learning framework for neural network models
- **ML Components Used:**
  - Keras Sequential API for LSTM model building
  - Embedding layers for text representation
  - LSTM layers for sequence processing
  - Dense layers for classification
  - Dropout regularization
- **Model Architecture:** `DeepIntentClassifier` in `ml_models.py`
- **Condition:** Python < 3.12

### 3. Transformers (Hugging Face) ≥4.34.0
- **Source:** PyPI (https://pypi.org/project/transformers/)
- **Official Documentation:** https://huggingface.co/transformers/
- **GitHub Repository:** https://github.com/huggingface/transformers
- **Purpose:** Pre-trained language models for NLP tasks
- **Potential Usage in Project:**
  - Command embeddings via BERT
  - Token classification
  - Text generation for suggestions
- **Condition:** Python < 3.12

### 4. PyTorch ≥2.1.0
- **Source:** PyPI (https://pypi.org/project/torch/)
- **Official Documentation:** https://pytorch.org/
- **GitHub Repository:** https://github.com/pytorch/pytorch
- **Purpose:** Alternative deep learning framework (if used alongside TensorFlow)
- **Condition:** Python < 3.12

### 5. Scikit-learn ≥1.3.0
- **Source:** PyPI (https://pypi.org/project/scikit-learn/)
- **Official Documentation:** https://scikit-learn.org/
- **GitHub Repository:** https://github.com/scikit-learn/scikit-learn
- **Purpose:** Machine learning utilities, metrics, preprocessing
- **Potential Usage:**
  - TF-IDF vectorization for commands
  - Classification metrics
  - Cross-validation for model evaluation
- **Condition:** Python < 3.12

---

## 🚀 DEPLOYMENT PLATFORMS & SERVICES

### 1. Vercel
- **Official Website:** https://vercel.com/
- **Documentation:** https://vercel.com/docs
- **GitHub Integration:** https://github.com/vercel/vercel
- **Purpose:** Static frontend hosting (HTML/CSS/JS)
- **Configuration File:** `vercel.json`
- **Exclusion File:** `.vercelignore`
- **Region:** Default (Auto-selected based on request origin)
- **Features Used:**
  - Static site deployment
  - Serverless Functions (optional)
  - Environment variables
  - CORS handling
  - Auto-redeployment on git push

### 2. Netlify
- **Official Website:** https://www.netlify.com/
- **Documentation:** https://docs.netlify.com/
- **Built on:** Cloudflare CDN
- **Purpose:** Static frontend hosting (alternative to Vercel)
- **Features Used:**
  - Static site deployment
  - Build configuration via netlify.toml
  - Environment variables
  - Domain routing

### 3. Render
- **Official Website:** https://render.com/
- **Documentation:** https://render.com/docs
- **Purpose:** Backend Python application hosting (optional)
- **Configuration File:** `render.yaml`
- **Features Used:**
  - Python service hosting
  - Auto-deploy via git
  - Environment variables
  - Always-on dyno option
- **Procfile Used For:** `gunicorn app:app`

### 4. Google Cloud Platform (GCP)
- **Cloud DNS:** For IP resolution reference in `build_allowed_origins()`
  - DNS Server: `8.8.8.8` (used in socket connectivity check in app.py)
  - Documentation: https://developers.google.com/speed/public-dns

---

## 🔧 CONFIGURATION & RUNTIME

### 1. Python 3.12
- **Official Website:** https://www.python.org/
- **Release Information:** https://www.python.org/downloads/release/python-3120/
- **Documentation:** https://docs.python.org/3.12/
- **Configuration File:** `.python-version`
- **Why 3.12:** 
  - Vercel default Python version
  - Better performance than 3.11
  - TensorFlow compatibility (with versions < 3.12 constraint in ml_models)
- **Virtual Environment Tool:** venv (built-in)

### 2. pip (Python Package Manager)
- **Official Website:** https://pip.pypa.io/
- **Documentation:** https://pip.pypa.io/en/stable/
- **Repository:** PyPI (https://pypi.org/)
- **Usage:** Installs requirements from `requirements.txt` and `requirements-ml.txt`

### 3. Poetry (Optional Dependency Manager)
- **Official Website:** https://python-poetry.org/
- **Documentation:** https://python-poetry.org/docs/
- **Typical Usage:** Alternative to pip + requirements.txt

---

## 🗄️ DATA & PROTOCOL STANDARDS

### 1. Socket.IO Protocol
- **Official Documentation:** https://socket.io/docs/
- **Protocol Specification:** https://socket.io/docs/socket-io-protocol/
- **GitHub:** https://github.com/socketio/socket.io-protocol
- **Version Used in Project:** 4.x (via CDN `socket.io.min.js`)
- **Features Leveraged:**
  - Namespaces (custom rooms for each pairing session)
  - Events (register_desktop, pair_mobile, voice_command)
  - Fallback transport (WebSocket + Long Polling)
  - CORS handling

### 2. CORS (Cross-Origin Resource Sharing)
- **Official Specification:** https://www.w3.org/TR/cors/
- **MDN Documentation:** https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS
- **RFC 7231 (HTTP Standards):** https://tools.ietf.org/html/rfc7231
- **Implementation in Project:** Flask-SocketIO CORS configuration
  - Allowed origins built dynamically in `build_allowed_origins()`
  - Supports LAN IPs, localhost, hosted domains

### 3. WebSocket Protocol
- **RFC 6455:** https://tools.ietf.org/html/rfc6455
- **MDN Documentation:** https://developer.mozilla.org/en-US/docs/Web/API/WebSocket
- **W3C Standard:** https://html.spec.whatwg.org/multipage/web-sockets/websocket.html
- **Purpose:** Persistent bidirectional connection between client-server

### 4. HTTPS/TLS
- **RFC 5246 & 8446:** https://tools.ietf.org/html/rfc8446 (TLS 1.3)
- **Certificate Generation:** `cryptography` library implementation
- **MDN HTTPS Guide:** https://developer.mozilla.org/en-US/docs/Glossary/HTTPS

### 5. JSON (Data Format)
- **Official Specification:** https://www.json.org/
- **RFC 8259:** https://tools.ietf.org/html/rfc8259
- **Usage:** Socket.IO message payloads, API responses

---

## 🎯 TRAINING DATA & MODELS (Optional ML)

### 1. NLP Embeddings
- **GloVe (Global Vectors for Word Representation):**
  - Source: https://nlp.stanford.edu/projects/glove/
  - Research Paper: https://nlp.stanford.edu/pubs/glove.pdf
  - Potential Use: Pre-trained word embeddings for command understanding

- **Word2Vec:**
  - Source: https://code.google.com/archive/p/word2vec/
  - Paper: https://arxiv.org/abs/1301.3781
  - Use Case: Context-aware command embeddings

### 2. Intent Classification Models
- **BERT (Bidirectional Encoder Representations from Transformers):**
  - Paper: https://arxiv.org/abs/1810.04805
  - Hugging Face Models: https://huggingface.co/models?pipeline_tag=text-classification
  - Pre-trained Models: Available via `transformers` library

- **LSTM Neural Networks:**
  - Research: https://www.bioinf.jku.at/publications/older/2604.pdf
  - TensorFlow Implementation Guide: https://www.tensorflow.org/guide/keras/rnn

### 3. Dataset References (for training)
- **Command Dataset (Hypothetical):**
  - Desktop commands: Custom built from OS automation (Windows/Mac/Linux)
  - Mobile commands: Custom built from browser APIs, mobile OS APIs
  - Training data format: CSV/JSON with command intent labels
  - Annotation tool: Could use https://www.labelimg.org/ or custom labeling

---

## 🔐 SECURITY & VALIDATION STANDARDS

### 1. X.509 Certificates
- **Standard:** https://www.itu.int/rec/T-REC-X.509/en
- **RFC 5280:** https://tools.ietf.org/html/rfc5280
- **Implementation:** Self-signed certificates via `cryptography` library
- **Used for:** HTTPS/TLS encryption on localhost

### 2. UUID (Universally Unique Identifiers)
- **RFC 4122:** https://tools.ietf.org/html/rfc4122
- **Python Implementation:** `uuid` module (standard library)
- **Usage:** Session IDs, pairing code identifiers

---

## 📊 REFERENCE ARCHITECTURE SOURCES

### 1. Real-time Web Applications
- **Socket.IO Architecture:**
  - Blog: https://socket.io/blog/
  - Scaling Guide: https://socket.io/docs/using-multiple-nodes/

- **Flask Best Practices:**
  - Official Guide: https://flask.palletsprojects.com/patterns/
  - Miguel Grinberg's Mega-Tutorial: https://blog.miguelgrinberg.com/post/the-flask-mega-tutorial-part-i-hello-world

### 2. WebSocket Design Patterns
- **Real-time Communication Patterns:**
  - MDN Web Docs: https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/
  - Publish-Subscribe Pattern: https://en.wikipedia.org/wiki/Publish%E2%80%93subscribe_pattern

### 3. Pair Code Generation
- **6-digit Code Algorithm:**
  - Random number generation: Python `random` module (standard library)
  - RFC 5116 (Cryptographic Algorithms): https://tools.ietf.org/html/rfc5116
  - Implementation: Simple `random.randint(100000, 999999)` in Python

---

## 📚 DOCUMENTATION SOURCES USED IN CODE

### 1. Official API Documentation
- Flask: https://flask.palletsprojects.com/api/
- Socket.IO: https://socket.io/docs/
- cryptography: https://cryptography.io/en/latest/

### 2. Stack Overflow & Community
- Tags: #flask, #socket.io, #python, #websocket, #cryptography
- URL: https://stackoverflow.com/questions/tagged/flask

### 3. GitHub Repositories (Code Examples)
- Flask-SocketIO Examples: https://github.com/miguelgrinberg/python-socketio/tree/main/examples
- Socket.IO Client Examples: https://github.com/socketio/socket.io-client-js

---

## 🔗 SUMMARY TABLE

| Component | Source | Reference | Version |
|-----------|--------|-----------|---------|
| Flask | PyPI | https://pypi.org/project/Flask/ | 3.1.0 |
| Flask-SocketIO | PyPI | https://pypi.org/project/flask-socketio/ | 5.5.1 |
| python-socketio | PyPI | https://pypi.org/project/python-socketio/ | 5.12.1 |
| gunicorn | PyPI | https://pypi.org/project/gunicorn/ | 22.0.0 |
| eventlet | PyPI | https://pypi.org/project/eventlet/ | 0.36.1 |
| cryptography | PyPI | https://pypi.org/project/cryptography/ | ≥45.0.0 |
| HTML5 | W3C | https://www.w3.org/TR/html52/ | HTML5 |
| CSS3 | W3C | https://www.w3.org/Style/CSS/ | CSS Level 3 |
| JavaScript | ECMA | https://ecma-international.org/ | ES6+ |
| Socket.IO Client | npm/GitHub | https://socket.io/docs/ | 4.x |
| Web Speech API | W3C | https://www.w3.org/TR/speech-api/ | W3C Spec |
| Python | PSF | https://www.python.org/ | 3.12 |
| NumPy | PyPI | https://pypi.org/project/numpy/ | ≥1.24.0 |
| TensorFlow | PyPI | https://pypi.org/project/tensorflow/ | ≥2.14.0 |
| Transformers | PyPI | https://pypi.org/project/transformers/ | ≥4.34.0 |
| Pytorch | PyPI | https://pypi.org/project/torch/ | ≥2.1.0 |
| Scikit-learn | PyPI | https://pypi.org/project/scikit-learn/ | ≥1.3.0 |
| Vercel | Cloud | https://vercel.com/docs | Current |
| Netlify | Cloud | https://docs.netlify.com/ | Current |
| Render | Cloud | https://render.com/docs | Current |

---

## ✅ VERIFICATION COMMANDS

### Check Installed Packages
```bash
pip list
```

### View requirements.txt
```bash
cat requirements.txt
```

### View ML requirements
```bash
cat requirements-ml.txt
```

### Check Python Version
```bash
python --version
```

### Verify Socket.IO Version (Frontend)
Open browser console and run:
```javascript
console.log(io.VERSION);  // Should output 4.x
```

---

## 📝 NOTES

1. **ML Libraries Conditional:** TensorFlow, Transformers, PyTorch, Scikit-learn are only required if `POCKET_ENABLE_ML=true` env var is set. Python version must be < 3.12 for these.

2. **Production vs Development:** 
   - Production: Uses only `requirements.txt` (Flask stack)
   - Development: Can optionally use `requirements-ml.txt` for local ML experiments

3. **Frontend Dependencies:** Socket.IO client is loaded via CDN, no npm/node_modules needed

4. **Deployment Decisions:**
   - Vercel/Netlify: Static frontend (HTML/CSS/JS only)
   - Render: Python backend (if hosted separately)
   - Localhost: Full stack (Python + static frontend)

5. **CORS Configuration:**
   - Dynamically built from `build_allowed_origins()` function
   - Supports LAN IP detection via DNS probe to 8.8.8.8
   - Includes fallbacks for localhost, 127.0.0.1, and hosted domains

---

**Generated:** March 28, 2026  
**For:** PocketTerminal Project Analysis
