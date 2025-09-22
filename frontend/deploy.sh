#!/bin/bash
set -e

SERVER_USER="ubuntu"
SERVER_HOST="makethechange.in"
FRONTEND_PATH="/home/ubuntu/chatApp-new/frontend"
BACKEND_PATH="/home/ubuntu/chatApp-new/BackEnd"
KEY_PATH="$HOME/Downloads/hibuddy.pem"
FRONTEND_PM2_NAME="frontend"
BACKEND_PM2_NAME="backend"
FRONTEND_PORT=3000

# -----------------------------
# DEPLOY FRONTEND
# -----------------------------
echo "📦 Copying frontend build to server..."
scp -i "$KEY_PATH" -r build/* $SERVER_USER@$SERVER_HOST:$FRONTEND_PATH

echo "🔁 Starting/restarting frontend with PM2..."
ssh -i "$KEY_PATH" $SERVER_USER@$SERVER_HOST << EOF
  cd $FRONTEND_PATH
  pm2 restart $FRONTEND_PM2_NAME || pm2 serve . $FRONTEND_PORT --name $FRONTEND_PM2_NAME
EOF

# -----------------------------
# DEPLOY BACKEND
# -----------------------------
echo "🌱 Updating backend on server..."
ssh -i "$KEY_PATH" $SERVER_USER@$SERVER_HOST << EOF
  cd $BACKEND_PATH
  git pull origin main
  npm install
  pm2 restart $BACKEND_PM2_NAME || pm2 start dist/main.js --name $BACKEND_PM2_NAME
EOF

echo "✅ Deployment complete!"
