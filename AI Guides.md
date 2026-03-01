# The Complete Self-Hosted AI Stack Guide

## Stop Paying for Expensive AI APIs — Build Your Own for $0/Month

*The exact 4-service stack that replaced $500+/month in API costs*

---

## Introduction

If you're paying hundreds or thousands per month for AI APIs like OpenAI, ElevenLabs, and Pinecone, you're bleeding money for services you can run yourself.

**The good news: OpenClaw can handle all of this for you.** OpenClaw is an AI assistant framework that connects directly to self-hosted services — Whisper for speech-to-text, Kokoro for text-to-speech, Qdrant for vector memory, and Ollama for LLM inference. Instead of paying API fees to OpenAI, ElevenLabs, and Pinecone, you point OpenClaw at your own GPU box and everything just works. Voice messages, memory, sub-agents, automation — all running on your hardware, zero API costs.

This guide shows you the exact stack and how to set it all up.

**What you'll be running:**

- **Speech-to-Text** (replaces OpenAI Whisper API)  
- **Text-to-Speech** (replaces ElevenLabs)  
- **Vector Search** (replaces Pinecone)  
- **Large Language Models** (replaces OpenAI GPT API)

**Who this is for:** Developers and technical founders who want to cut AI costs without sacrificing quality. You don't need to be a DevOps expert, but you should be comfortable with Docker and command line basics.

**Bottom line:** This stack costs $0/month in API fees. Your only cost is the GPU hardware (or cloud GPU rental), which pays for itself in weeks.

⚠️ **Minimum Machine Spec:** You need a machine with an NVIDIA GPU with at least **8GB VRAM** (RTX 3070 or newer). No GPU \= no local inference. If you don't have one, cloud GPU options like Vast.ai ($0.20/hr) or RunPod ($0.34/hr) work great — still cheaper than API fees. See the Hardware Requirements section for full details.

---

## The Stack Overview

| Service | Replaces | Monthly Savings | What It Does |
| :---- | :---- | :---- | :---- |
| **Whisper STT** | OpenAI Whisper API | $50-200+ | Speech-to-text transcription |
| **Kokoro TTS** | ElevenLabs | $22-99 | Text-to-speech with natural voices |
| **Qdrant** | Pinecone | $70-230 | Vector database for embeddings |
| **Ollama** | OpenAI GPT API | $200-1000+ | Local LLM inference |

**Total potential savings: $342-1529+ per month**

---

## Service 1: Whisper STT

### Replaces: OpenAI Whisper API ($0.006/minute)

Whisper handles speech-to-text transcription with the same quality as OpenAI's API, but running locally on your hardware.

#### What it does:

- Transcribes audio files to text  
- Supports 99+ languages  
- Multiple model sizes (tiny, base, small, medium, large)  
- OpenAI-compatible API endpoints

#### Setup with Docker:

```shell
# Pull the faster-whisper container
docker pull fedirz/faster-whisper-server:latest

# Run with GPU support
docker run -d --name whisper-server \
  --gpus all \
  -p 8000:8000 \
  -e ASR_MODEL=medium \
  fedirz/faster-whisper-server:latest
```

#### OpenAI-Compatible API:

```shell
# Test transcription
curl -X POST "http://localhost:8000/v1/audio/transcriptions" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@your-audio.mp3" \
  -F "model=whisper-1"
```

#### Cost Comparison:

- **OpenAI API:** \~$0.006/minute ($3.60/hour)  
- **Self-hosted:** $0/month (hardware only)  
- **Break-even:** \~10 hours of transcription per month

---

## Service 2: Kokoro TTS

### Replaces: ElevenLabs ($22-99/month)

Kokoro provides high-quality text-to-speech with natural-sounding voices, including streaming support for real-time applications.

#### What it does:

- Natural-sounding text-to-speech  
- Multiple voice options (male/female, accents)  
- Streaming audio generation  
- OpenAI-compatible API format

#### Setup:

```shell
# Clone Kokoro TTS
git clone https://github.com/hexgrad/kokoro
cd kokoro

# Install dependencies
pip install torch torchaudio
pip install -r requirements.txt

# Download voice models
python download_models.py

# Start the server
python server.py --host 0.0.0.0 --port 8880
```

#### API Usage:

```shell
# Generate speech
curl -X POST "http://localhost:8880/v1/audio/speech" \
  -H "Content-Type: application/json" \
  -d '{
    "input": "Hello, this is a test of Kokoro TTS",
    "voice": "af_sarah",
    "model": "kokoro"
  }' \
  --output speech.mp3
```

#### Voice Options:

- `af_sarah` \- American female  
- `am_adam` \- American male  
- `bf_emma` \- British female  
- `bm_lewis` \- British male  
- Plus more regional variants

#### Cost Comparison:

- **ElevenLabs:** $22-99/month (limited characters)  
- **Self-hosted:** $0/month (unlimited)  
- **Break-even:** Immediate for heavy usage

---

## Service 3: Qdrant Vector Database

### Replaces: Pinecone ($70-230/month)

Qdrant handles vector embeddings and similarity search for RAG applications, recommendation systems, and semantic search.

#### What it does:

- Stores and searches vector embeddings  
- Supports multiple distance metrics  
- Built-in filtering and payload storage  
- REST API and dashboard interface

#### Setup with Docker:

```shell
# Run Qdrant with persistence
docker run -d --name qdrant \
  -p 6333:6333 \
  -p 6334:6334 \
  -v $(pwd)/qdrant_storage:/qdrant/storage:z \
  qdrant/qdrant:latest
```

#### Create a Collection:

```shell
# Create collection for embeddings
curl -X PUT "http://localhost:6333/collections/my_collection" \
  -H "Content-Type: application/json" \
  -d '{
    "vectors": {
      "size": 1536,
      "distance": "Cosine"
    }
  }'
```

#### Insert Vectors:

```shell
# Add vectors with payload
curl -X PUT "http://localhost:6333/collections/my_collection/points" \
  -H "Content-Type: application/json" \
  -d '{
    "points": [
      {
        "id": 1,
        "vector": [0.1, 0.2, 0.3, ...],
        "payload": {"text": "Sample document"}
      }
    ]
  }'
```

#### Dashboard Access:

- **URL:** `http://localhost:6333/dashboard`  
- View collections, manage vectors, run queries

#### Cost Comparison:

- **Pinecone:** $70-230/month (1M-10M vectors)  
- **Self-hosted:** $0/month (unlimited vectors)  
- **Break-even:** Immediate for most use cases

---

## Service 4: Ollama

### Replaces: OpenAI GPT API ($200-1000+/month)

Ollama runs large language models locally, supporting popular open-source models with OpenAI-compatible APIs.

#### What it does:

- Local LLM inference  
- Model management and switching  
- OpenAI-compatible API endpoints  
- Supports latest open-source models

#### Setup:

```shell
# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Start Ollama service
ollama serve

# Download popular models
ollama pull llama3.2
ollama pull mistral
ollama pull qwen2.5
```

#### Popular Models:

| Model | Size | Use Case | Performance |
| :---- | :---- | :---- | :---- |
| **Llama 3.2 3B** | 2GB | Fast responses | Good for chat |
| **Llama 3.2 8B** | 4.7GB | Balanced | Better reasoning |
| **Mistral 7B** | 4.1GB | Coding tasks | Excellent code |
| **Qwen 2.5 7B** | 4.4GB | Multilingual | Best for non-English |

#### API Usage:

```shell
# Chat completion (OpenAI format)
curl -X POST "http://localhost:11434/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llama3.2",
    "messages": [
      {"role": "user", "content": "Hello!"}
    ]
  }'
```

#### Cost Comparison:

- **OpenAI GPT-4:** $30/1M tokens ($200-1000+/month typical)  
- **Self-hosted:** $0/month (unlimited tokens)  
- **Break-even:** 7-30M tokens (weeks for most users)

---

## Hardware Requirements

### Minimum Specs:

- **GPU:** 8GB VRAM (RTX 3070, RTX 4060 Ti)  
- **RAM:** 16GB system RAM  
- **Storage:** 100GB SSD (for models)  
- **CPU:** Modern 6+ core processor

### Recommended Specs:

- **GPU:** 16GB+ VRAM (RTX 4080, RTX 4090\)  
- **RAM:** 32GB system RAM  
- **Storage:** 500GB NVMe SSD  
- **CPU:** 8+ core processor

### Cloud GPU Options:

| Provider | Instance Type | GPU | Price/Hour | Monthly (24/7) |
| :---- | :---- | :---- | :---- | :---- |
| **Vast.ai** | RTX 4090 | 24GB | $0.20-0.40 | $144-288 |
| **RunPod** | RTX 4090 | 24GB | $0.34 | $245 |
| **Lambda Labs** | A10G | 24GB | $0.75 | $540 |

**Cost Analysis:** Even running 24/7 cloud GPU ($200-300/month) is cheaper than API costs for most users.

### DIY GPU Box:

- **RTX 4090 Build:** $2000-2500 total  
- **RTX 4080 Build:** $1500-2000 total  
- **Payback period:** 3-6 months vs API costs

---

## OpenClaw Integration

OpenClaw connects to all four services seamlessly:

- **Whisper STT:** Automatic transcription of voice messages  
- **Kokoro TTS:** Voice responses in conversations  
- **Qdrant:** Memory storage and retrieval for context  
- **Ollama:** Local LLM processing for all AI tasks

Configuration is handled through OpenClaw's settings, with automatic failover to APIs if local services are unavailable.

### One-Prompt Setup

Once you have your GPU box running with Docker installed, paste this entire prompt into OpenClaw (or any AI assistant with shell access) and let it do the work:

```
Set up my self-hosted AI stack on this machine. Deploy the following 4 services using Docker, all on the same host:

1. **Whisper STT (faster-whisper-server)**
   - Image: fedirz/faster-whisper-server:latest-cuda
   - Port: 8000
   - Mount a models cache volume
   - GPU access required
   - Download the large-v3 model on first run

2. **Kokoro TTS**
   - Image: ghcr.io/remsky/kokoro-fastapi-cpu:latest (or GPU variant)
   - Port: 8880
   - OpenAI-compatible /v1/audio/speech endpoint

3. **Qdrant Vector Database**
   - Image: qdrant/qdrant:latest
   - Port: 6333 (REST) and 6334 (gRPC)
   - Mount a persistent storage volume at ./qdrant_storage:/qdrant/storage

4. **Ollama LLM Server**
   - Image: ollama/ollama:latest
   - Port: 11434
   - GPU access required
   - After deploy, pull these models: llama3.2, mistral, nomic-embed-text

For each service:
- Create a docker-compose.yml that runs all 4 together
- Enable NVIDIA GPU runtime for Whisper and Ollama
- Set restart: unless-stopped on all containers
- Verify each service is healthy with a curl test after starting

After everything is running, give me the health check commands I can use to verify the stack.
```

This prompt handles the entire deployment. Copy it, paste it, walk away. Come back to a fully running stack.

**Note:** If you're using a cloud GPU (Vast.ai, RunPod), SSH into the instance first, make sure Docker and NVIDIA Container Toolkit are installed, then run the prompt above.

---

## Complete Cost Comparison

### Before (API Costs):

| Service | Light Usage | Medium Usage | Heavy Usage |
| :---- | :---- | :---- | :---- |
| OpenAI GPT-4 | $50/mo | $200/mo | $800/mo |
| Whisper API | $20/mo | $80/mo | $300/mo |
| ElevenLabs | $22/mo | $99/mo | $99/mo |
| Pinecone | $70/mo | $140/mo | $280/mo |
| **Total** | **$162/mo** | **$519/mo** | **$1,479/mo** |

### After (Self-Hosted):

| Component | Cost |
| :---- | :---- |
| All AI Services | $0/mo |
| GPU Hardware\* | $0/mo (one-time purchase) |
| Cloud GPU (optional) | $200-300/mo |
| **Total** | **$0-300/mo** |

\*Amortized over 24 months, hardware adds $60-100/mo

### Annual Savings:

- **Light usage:** $1,944/year  
- **Medium usage:** $6,228/year  
- **Heavy usage:** $17,748/year

---

## Getting Started Checklist

### Step 1: Hardware Setup

- [ ] Verify GPU meets minimum requirements (8GB+ VRAM)  
- [ ] Install Docker and Docker Compose  
- [ ] Install NVIDIA Container Toolkit (for GPU support)

### Step 2: Service Deployment

- [ ] Deploy Qdrant vector database  
- [ ] Set up Whisper STT with faster-whisper  
- [ ] Install and configure Kokoro TTS  
- [ ] Install Ollama and download models

### Step 3: Testing

- [ ] Test each service individually with curl  
- [ ] Verify OpenAI-compatible endpoints work  
- [ ] Run integration tests with sample data

### Step 4: Production Setup

- [ ] Configure reverse proxy (nginx/traefik)  
- [ ] Set up SSL certificates  
- [ ] Implement monitoring and alerting  
- [ ] Create backup procedures

### Step 5: Integration

- [ ] Update applications to use local endpoints  
- [ ] Test fallback to APIs if needed  
- [ ] Monitor performance and costs

**Expected setup time:** 4-8 hours for someone comfortable with Docker

---

## Frequently Asked Questions

### Q: How much technical knowledge do I need?

**A:** You should be comfortable with Docker, command line basics, and API concepts. If you can run `docker run` commands and edit config files, you can set this up.

### Q: What if I don't have a GPU?

**A:** You can use cloud GPU instances from Vast.ai or RunPod. Even running 24/7 cloud GPU is often cheaper than API costs.

### Q: How does quality compare to commercial APIs?

**A:**

- **Whisper:** Identical quality (same underlying model)  
- **Kokoro TTS:** Comparable to ElevenLabs for most voices  
- **Qdrant:** Feature parity with Pinecone  
- **Ollama:** Llama 3.2 approaches GPT-4 quality

### Q: What about support and reliability?

**A:** You're responsible for uptime and troubleshooting. For production use, implement monitoring, backups, and consider hybrid setups with API fallbacks.

### Q: Can I scale this for a team?

**A:** Yes. All services support concurrent requests. You may need larger GPU instances or multiple GPUs for heavy team usage.

### Q: What about model updates?

**A:**

- **Whisper:** Model updates are infrequent  
- **Kokoro:** Community-driven improvements  
- **Ollama:** New models release regularly, easy to update  
- **Qdrant:** Regular feature updates via Docker

### Q: Is this legal for commercial use?

**A:** Yes. All components use permissive licenses. Check specific model licenses for commercial restrictions (most are fine).

### Q: How do I handle different model sizes?

**A:** Start with smaller models (7B-8B parameters) and scale up based on quality needs vs. performance requirements.

### Q: What if I need specific features from paid services?

**A:** Consider hybrid approaches: self-host for volume workloads, use APIs for specialized features. This still saves 70-80% of costs.

### Q: How do I backup my vector data?

**A:** Qdrant stores data in local files. Regular filesystem backups or Qdrant's built-in snapshot features work well.

---

## Final Thoughts

This stack eliminates $342-1500+ in monthly API costs while giving you complete control over your AI infrastructure. The upfront investment in hardware or cloud GPU pays for itself within weeks to months.

**Start small:** Deploy one service at a time, test thoroughly, then scale up. You don't need to replace everything at once.

**Need help?** Join the community discussions or follow for more self-hosting guides.

---

*Last updated: February 2026* *This guide assumes basic Docker and command line knowledge*  
