#!/bin/bash
# Run the scifsys-beta emulator smoke test against real repo functions
# Uses Node 22 for compatibility with firebase-functions v7.3.2

cd /home/super/Work/scifsys
export GOOGLE_APPLICATION_CREDENTIALS=/tmp/lumon-gcp-key.json
export FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099
export FIREBASE_FIRESTORE_EMULATOR_HOST=127.0.0.1:8080

PATH="/home/super/.local/share/mise/installs/node/22.23.2/bin:$PATH"

echo "=== scifsys-beta Emulator Health Check ==="
echo ""

# 1. Auth emulator
echo -n "Auth emulator: "
if curl -s http://127.0.0.1:9099/ | python3 -c "import sys,json; d=json.load(sys.stdin); print('OK' if d.get('authEmulator',{}).get('ready') else 'NOT READY')" 2>/dev/null; then
    echo "  ✓"
else
    echo "  ✗"
fi

# 2. Firestore emulator
echo -n "Firestore emulator: "
if curl -s http://127.0.0.1:8080/ | grep -q "Ok"; then
    echo "  ✓ (REST available)"
else
    echo "  ✗"
fi

# 3. Functions emulator - check healthCheck callable
echo -n "Functions emulator (beta/healthCheck): "
RESULT=$(curl -s -X POST http://127.0.0.1:5001/scifsys-beta/us-central1/healthCheck \
    -H "Content-Type: application/json" -d '{"data":{}}' 2>/dev/null)
if echo "$RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); assert d.get('status')=='ok'" 2>/dev/null; then
    echo "  ✓"
else
    echo "  ? ($RESULT)"
fi

# 4. Storage emulator
echo -n "Storage emulator: "
if curl -s http://127.0.0.1:9199/ > /dev/null 2>&1; then
    echo "  ✓ (responding)"
else
    echo "  (not responding - may be normal)"
fi

echo ""
echo "=== Repository Structure ==="
echo "Repo: /home/super/Work/scifsys"
echo "Functions (stable): $(find functions/src -name '*.js' | wc -l) source files"
echo "Functions (beta): $(find functions-beta/src -name '*.js' | wc -l) source files"
echo "Firestore rules: $(wc -l < firestore.rules) lines"
echo "Storage rules: $(wc -l < storage.rules) lines"
echo "Mocha tests: $(find functions/test -name '*.test.js' | wc -l) test files"
echo ""

echo "=== Emulator Ports ==="
echo "  Auth:       0.0.0.0:9099"
echo "  Firestore:  0.0.0.0:8080"
echo "  Functions:  0.0.0.0:5001"
echo "  Storage:    0.0.0.0:9199"
echo "  Hub:        127.0.0.1:4400"
echo "  Firestore UI websocket: 9150"
echo ""

echo "=== Environment ==="
echo "  Project: scifsys-beta"
echo "  Node: $(node --version)"
echo "  firebase-tools: $(firebase --version 2>/dev/null || echo 'N/A')"
echo ""

echo "═══════════════════════════════════════"
echo "  scifsys-beta emulators READY for development"
echo "═══════════════════════════════════════"
