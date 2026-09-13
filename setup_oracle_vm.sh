#!/usr/bin/env bash
# ==============================================================================
# Oracle Cloud Always Free VM - Automated 1-Click Setup Script
# Works on Ubuntu 22.04 LTS and 24.04 LTS (ARM64 Ampere & AMD x86)
# ==============================================================================

set -e

echo "=========================================================="
echo "🚀 Setting up TradingView Market Profile Dashboard on Oracle Cloud"
echo "=========================================================="

# 1. Update system packages
echo "📦 Updating system packages..."
sudo apt-get update -y
sudo apt-get upgrade -y
sudo apt-get install -y curl git ufw nginx python3 python3-pip python3-venv iptables-persistent

# 2. Fix Oracle Cloud default firewall rules (Oracle blocks inbound ports by default)
echo "🛡️ Opening Firewall ports 80, 443, 3002..."
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 3002 -j ACCEPT
sudo netfilter-persistent save

# 3. Install Node.js 20 LTS
echo "🟢 Installing Node.js 20 LTS..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi
echo "Node.js version: $(node -v)"
echo "NPM version: $(npm -v)"

# 4. Install PM2 process manager
echo "⚙️ Installing PM2 process manager..."
sudo npm install -g pm2

# 5. Setup Python Virtual Environment & Data Packages
echo "🐍 Setting up Python 3 environment..."
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install pandas numpy requests yfinance

# 6. Install Project Backend Dependencies
echo "📂 Installing Backend Node dependencies..."
cd backend
npm install
cd ..

# 7. Configure Nginx as Reverse Proxy
echo "🌐 Configuring Nginx reverse proxy to port 3002..."
sudo tee /etc/nginx/sites-available/default > /dev/null << 'EOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;

    server_name _;

    location / {
        proxy_pass http://127.0.0.1:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
EOF

sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx

# 8. Start Backend with PM2 and configure auto-restart on system reboot
echo "🚀 Starting Market Engine with PM2..."
pm2 start backend/server.js --name "tv-engine" --watch=false
pm2 startup systemd -u $USER --hp $HOME | sudo bash || true
pm2 save

echo "=========================================================="
echo "🎉 DEPLOYMENT COMPLETE!"
echo "Your TradingView Dashboard is running live 24/7!"
echo "Access it in your browser at: http://$(curl -s ifconfig.me)"
echo "=========================================================="
