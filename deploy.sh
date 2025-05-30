#!/bin/bash
# Script to deploy the Gemini Whisperer app

# Local path to the built HTML file
LOCAL_FILE="dist/gemini_live_app.html"

# Remote server details
REMOTE_USER="pauldatta"
REMOTE_HOST="pauldatta.c.googlers.com"
REMOTE_DEST_DIR="/usr/local/google/home/pauldatta/Code/ghack2025/"

if [ ! -f "$LOCAL_FILE" ]; then
  echo "Error: Local file '$LOCAL_FILE' not found."
  echo "Please ensure the project has been built and the file exists at the specified path."
  exit 1
fi
echo "Deploying '$LOCAL_FILE' to '$REMOTE_USER@$REMOTE_HOST:$REMOTE_DEST_DIR'..."
scp "$LOCAL_FILE" "$REMOTE_USER@$REMOTE_HOST:$REMOTE_DEST_DIR"

if [ $? -eq 0 ]; then
  echo "Deployment successful!"
else
  echo "Error: Deployment failed during scp. Please check the scp command output and your connection."
  exit 1
fi

echo "Attempting to start HTTP server on $REMOTE_HOST in directory $REMOTE_DEST_DIR..."
ssh -f "$REMOTE_USER@$REMOTE_HOST" "cd \"$REMOTE_DEST_DIR\" && nohup python3 -m http.server > /dev/null 2>&1 &"

if [ $? -eq 0 ]; then
  echo "Successfully sent command to start HTTP server on remote."
  echo "The server should be accessible at http://$REMOTE_HOST:8000/gemini_live_app.html"
  echo "Note: Ensure Python 3 is installed on the remote server and port 8000 (or the port you choose) is open."
else
  echo "Error: Failed to send command to start HTTP server on remote. Please check your SSH connection and permissions."
fi
echo "Script finished."