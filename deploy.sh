#!/bin/bash

echo "Updating from sources..."
git pull
echo "Done"

echo "Killing co2mond..."
sudo killall co2mond
echo "Done"

echo "Building..."
npm run build
echo "Done"

pm2 restart home-api
echo "PM2 was restarted"
