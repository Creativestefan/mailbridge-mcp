#!/bin/bash
set -e

echo ""
echo "==================================="
echo "  Universal Email MCP — Installer  "
echo "==================================="
echo ""

# Check Node.js
if ! command -v node &>/dev/null; then
  echo "ERROR: Node.js is not installed. Download it from https://nodejs.org"
  exit 1
fi

NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  echo "ERROR: Node.js v18 or higher is required. Current version: $(node -v)"
  exit 1
fi

echo "Node.js $(node -v) detected."
echo ""

# Choose provider
echo "Which email provider are you setting up?"
echo "  1) cPanel / Personal Domain Email"
echo "  2) iCloud"
echo "  3) Gmail"
echo "  4) Outlook / Hotmail / Live"
echo "  5) Yahoo Mail"
echo "  6) Other (manual IMAP/SMTP entry)"
echo ""
read -p "Enter number [1-6]: " PROVIDER_CHOICE

case $PROVIDER_CHOICE in
  1)
    read -p "IMAP/SMTP Host (e.g. mail.yourdomain.com): " HOST
    IMAP_HOST=$HOST; IMAP_PORT=993; IMAP_SECURE=true
    SMTP_HOST=$HOST; SMTP_PORT=465; SMTP_SECURE=true
    ;;
  2)
    IMAP_HOST=imap.mail.me.com; IMAP_PORT=993; IMAP_SECURE=true
    SMTP_HOST=smtp.mail.me.com; SMTP_PORT=587; SMTP_SECURE=false
    echo ""
    echo "NOTE: You must use an App-Specific Password from appleid.apple.com"
    echo "      Sign-In & Security → App-Specific Passwords → +"
    ;;
  3)
    IMAP_HOST=imap.gmail.com; IMAP_PORT=993; IMAP_SECURE=true
    SMTP_HOST=smtp.gmail.com; SMTP_PORT=587; SMTP_SECURE=false
    echo ""
    echo "NOTE: You must use an App Password (requires 2FA)."
    echo "      myaccount.google.com → Security → App passwords"
    echo "      Also enable IMAP in Gmail Settings → Forwarding and POP/IMAP"
    ;;
  4)
    IMAP_HOST=outlook.office365.com; IMAP_PORT=993; IMAP_SECURE=true
    SMTP_HOST=smtp.office365.com; SMTP_PORT=587; SMTP_SECURE=false
    ;;
  5)
    IMAP_HOST=imap.mail.yahoo.com; IMAP_PORT=993; IMAP_SECURE=true
    SMTP_HOST=smtp.mail.yahoo.com; SMTP_PORT=465; SMTP_SECURE=true
    echo ""
    echo "NOTE: Generate an App Password at Yahoo Account Security settings."
    ;;
  6)
    read -p "IMAP Host: " IMAP_HOST
    read -p "IMAP Port [993]: " IMAP_PORT; IMAP_PORT=${IMAP_PORT:-993}
    read -p "IMAP Secure (true/false) [true]: " IMAP_SECURE; IMAP_SECURE=${IMAP_SECURE:-true}
    read -p "SMTP Host: " SMTP_HOST
    read -p "SMTP Port [587]: " SMTP_PORT; SMTP_PORT=${SMTP_PORT:-587}
    read -p "SMTP Secure (true/false) [false]: " SMTP_SECURE; SMTP_SECURE=${SMTP_SECURE:-false}
    ;;
  *)
    echo "Invalid choice. Exiting."
    exit 1
    ;;
esac

echo ""
read -p "Email address: " EMAIL
read -p "Password (App Password if applicable): " -s PASSWORD
echo ""

# Write .env
cat > .env <<EOF
IMAP_HOST=$IMAP_HOST
IMAP_PORT=$IMAP_PORT
IMAP_SECURE=$IMAP_SECURE
IMAP_USER=$EMAIL
IMAP_PASSWORD=$PASSWORD

SMTP_HOST=$SMTP_HOST
SMTP_PORT=$SMTP_PORT
SMTP_SECURE=$SMTP_SECURE
SMTP_USER=$EMAIL
SMTP_PASSWORD=$PASSWORD
EOF

echo ".env file written."
echo ""

# Install dependencies
echo "Installing dependencies..."
npm install
echo ""

# Claude Desktop config
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLAUDE_CONFIG="$HOME/Library/Application Support/Claude/claude_desktop_config.json"

echo "==================================="
echo "  Setup Complete!"
echo "==================================="
echo ""
echo "Add this to your Claude Desktop config:"
echo "  $CLAUDE_CONFIG"
echo ""
cat <<EOF
{
  "mcpServers": {
    "universal-email": {
      "command": "node",
      "args": ["$SCRIPT_DIR/index.js"]
    }
  }
}
EOF
echo ""
echo "Then restart Claude Desktop. Your email tools will be available!"
