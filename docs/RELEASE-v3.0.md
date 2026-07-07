# NeuroAudit Agent v3.0

First public release of the NeuroAudit Agent — an AI-powered automation system for neurosurgery audit data collection.

## Highlights

- **Telegram → AI → Database pipeline** for surgical case reporting
- **Google Gemini 2.5 Flash Lite** via OpenRouter for natural language extraction
- **30+ surgery categories** with intelligent JavaScript inference
- **Dual logging** — raw Telegram messages plus structured audit records
- **Self-hosted n8n workflow** — sanitized and ready to import

## What's Included

- `workflows/NeuroAudit-Agent-v3-clean.json` — importable n8n workflow (no credentials)
- `prompts/ai-system-prompt-v3.txt` — AI agent system prompt
- `code/javascript-mapper-v3.js` — data normalization and category inference
- `docs/SETUP_GUIDE.md` — step-by-step setup instructions
- `assets/` — workflow diagram and dashboard screenshots

## Problem Solved

Medical auditing is repetitive, time-consuming, and prone to human error. NeuroAudit Agent automates extraction and categorization of surgical case data from natural language Telegram messages into structured records.

## Tech Stack

| Component | Technology |
|-----------|------------|
| Workflow | n8n (self-hosted) |
| AI Model | Google Gemini 2.5 Flash Lite |
| AI Gateway | OpenRouter |
| Input | Telegram Bot API |
| Processing | JavaScript |
| Storage | Google Sheets |

## Background

Developed for the **Kaggle AI Agent Intensive Capstone Project** (November 2025).

- [Kaggle Writeup](https://www.kaggle.com/competitions/agents-intensive-capstone-project/writeups/new-writeup-1763848050135#3344749)
- [Developer LinkedIn](https://www.linkedin.com/in/bih-huei-tan-939a09105/)

## Setup

See [SETUP_GUIDE.md](docs/SETUP_GUIDE.md) for full instructions.

1. Import `workflows/NeuroAudit-Agent-v3-clean.json` into n8n
2. Configure Telegram, OpenRouter, and Google Sheets credentials
3. Update sheet IDs and activate the workflow

## Important

This is a proof-of-concept for educational and portfolio purposes. Review healthcare data privacy and compliance requirements before any production deployment.

---

**Developer:** Bih Huei Tan (Kevyn)
