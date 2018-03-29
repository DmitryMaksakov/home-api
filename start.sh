#!/bin/bash

echo "Building..."
npm run build
echo "Done"

echo "Starting..."
pm2 start lib/server.js --name="home-api"
echo "Done"
