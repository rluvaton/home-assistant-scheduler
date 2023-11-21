#!/usr/bin/env ash

# exit on errors
set -e

printenv

npm run migrate
node src/scheduler/entrypoint.js
