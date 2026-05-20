# ─────────────────────────────────────────────────────────────────────────────
# Vocolens — GitHub Codespaces / cloud dev container
#
# Based on the official Microsoft Node 22 devcontainer image which includes:
#   - Node 22 + npm + nvm
#   - git, curl, wget, zsh, fish, bash
#   - Common build tools (gcc, make, python3)
# ─────────────────────────────────────────────────────────────────────────────
FROM mcr.microsoft.com/devcontainers/javascript-node:1-22-bookworm

# ── System dependencies ───────────────────────────────────────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
    # Java (required for EAS CLI Gradle introspection checks)
    default-jdk-headless \
    # Process / network utilities
    lsof \
    netcat-openbsd \
    # QR code renderer in terminal (optional, nice to have)
    qrencode \
    # Required by some native build scripts
    libsecret-1-dev \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

# ── ngrok ─────────────────────────────────────────────────────────────────────
# Pin a specific ngrok version so the tunnel layer is reproducible.
# expo/ngrok (the JS package) wraps the ngrok binary; we install the binary
# globally so expo can find it reliably inside the Codespace.
RUN curl -sSL https://ngrok-agent.s3.amazonaws.com/ngrok.asc \
      | tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null \
    && echo "deb https://ngrok-agent.s3.amazonaws.com buster main" \
      | tee /etc/apt/sources.list.d/ngrok.list \
    && apt-get update \
    && apt-get install -y ngrok \
    && rm -rf /var/lib/apt/lists/*

# ── Global npm tooling ────────────────────────────────────────────────────────
# Install EAS CLI and Expo CLI globally so they are always available without
# the project's node_modules being present (e.g. on first open).
RUN npm install -g \
    eas-cli@latest \
    expo-cli@latest \
    # Prettier is useful for the built-in Codespaces format-on-save
    prettier@latest

# ── Non-root user ─────────────────────────────────────────────────────────────
# The base image already creates a "node" user (uid 1000). We make it the
# default so file permissions are correct when Codespaces mounts the repo.
USER node
WORKDIR /workspaces/Vocolens-app
