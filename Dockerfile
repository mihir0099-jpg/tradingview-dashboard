# Hugging Face Spaces Dockerfile
FROM node:20-bookworm-slim

# Install Python 3, venv, and essential tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-venv \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Set up standard Hugging Face user (UID 1000)
RUN useradd -m -u 1000 user
ENV HOME=/home/user
ENV PATH="/home/user/venv/bin:/home/user/.local/bin:$PATH"

WORKDIR /home/user/app

# Set up Python virtual environment
RUN python3 -m venv /home/user/venv

# Install Python ML & Analytics libraries
COPY --chown=user:user backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r ./backend/requirements.txt

# Install Node.js dependencies
COPY --chown=user:user package*.json ./
COPY --chown=user:user backend/package*.json ./backend/
RUN cd backend && npm install --omit=dev

COPY --chown=user:user frontend/package*.json ./frontend/
RUN cd frontend && npm install --include=dev --legacy-peer-deps

# Copy application sources
COPY --chown=user:user . .

# Build React frontend production bundle
RUN cd frontend && npm run build

# Make sure user owns the app directory
RUN chown -R user:user /home/user/app

USER user

# Hugging Face Spaces default port
ENV PORT=7860
ENV NODE_ENV=production
ENV TZ=Asia/Kolkata
EXPOSE 7860

# Start supervised trading dashboard server
CMD ["node", "backend/supervisor.js"]
