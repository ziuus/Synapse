#!/bin/bash
set -e

CYAN='\033[96m'
GREEN='\033[92m'
RED='\033[91m'
YELLOW='\033[93m'
RESET='\033[0m'
BOLD='\033[1m'

echo ""
echo -e "${CYAN}${BOLD}⚡ Synapse Installer${RESET}"
echo -e "${CYAN}──────────────────────${RESET}"

# Check Python
if ! command -v python3 &>/dev/null; then
    echo -e "${RED}✗ Python3 not found. Install from https://python.org${RESET}"
    exit 1
fi
echo -e "${GREEN}✓ Python3 found${RESET}"

# Check Ollama
if ! command -v ollama &>/dev/null; then
    echo -e "${YELLOW}⚠ Ollama not found. Installing...${RESET}"
    curl -fsSL https://ollama.com/install.sh | sh
else
    echo -e "${GREEN}✓ Ollama found${RESET}"
fi

# Install Python deps
echo -e "\n${CYAN}Installing Python dependencies...${RESET}"
pip3 install -r requirements.txt --quiet
echo -e "${GREEN}✓ Dependencies installed${RESET}"

# Pull recommended models
echo -e "\n${CYAN}Pulling recommended models (this may take a while)...${RESET}"
echo -e "${YELLOW}Pulling phi3:mini (~2.3GB)...${RESET}"
ollama pull phi3:mini

echo -e "${YELLOW}Pulling qwen2.5-coder:1.5b (~1GB)...${RESET}"
ollama pull qwen2.5-coder:1.5b

echo -e "${YELLOW}Pulling moondream (vision, ~1.8GB)...${RESET}"
ollama pull moondream

# Make main.py executable
chmod +x main.py

echo ""
echo -e "${GREEN}${BOLD}✓ Synapse installed!${RESET}"
echo ""
echo -e "Start with:"
echo -e "  ${CYAN}python3 main.py${RESET}         ← CLI mode"
echo -e "  ${CYAN}python3 main.py --web${RESET}   ← Web UI"
echo -e "  ${CYAN}python3 main.py --status${RESET} ← Check system"
echo ""
