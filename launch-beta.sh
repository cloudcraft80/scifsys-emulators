#!/bin/bash
# launch-beta.sh — Start scifsys-beta emulators using Node 22 for functions
set -e
cd /home/super/Work/scifsys
export GOOGLE_APPLICATION_CREDENTIALS=/tmp/lumon-gcp-key.json
export PATH="/home/super/.local/share/mise/installs/node/22.23.2/bin:$PATH"
pkill -f "cloud-firestore-emulator" 2>/dev/null || true
pkill -f "pubsub-emulator" 2>/dev/null || true
pkill -f "cloud-storage-rules" 2>/dev/null || true
pkill -f "firebase emulators:start" 2>/dev/null || true
sleep 2
firebase emulators:start \
  --project scifsys-beta \
  --only auth,firestore,functions,pubsub,storage,eventarc \
  2>&1
