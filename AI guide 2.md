# The AI Memory Architecture Guide: Give Your AI Perfect Context Recovery

## The Problem: AI Amnesia Is Killing Productivity

Every conversation with ChatGPT, Claude, or your custom AI starts from scratch. It remembers nothing about your previous sessions, your preferences, your ongoing projects, or the context that makes conversations actually useful.

You end up repeating the same setup, re-explaining your situation, and losing all the momentum you built in previous sessions. It's like having a brilliant assistant who gets memory-wiped every night.

**This guide shows you how to fix that forever.**

## How Vector Memory Works (The Simple Version)

Think of vector memory like giving your AI a searchable brain:

1. **Embeddings**: Every piece of text gets converted into a mathematical "fingerprint" (a vector of numbers)  
2. **Semantic Search**: When your AI needs context, it searches for similar fingerprints, not exact text matches  
3. **Context Recovery**: Your AI finds relevant memories from past sessions and uses them to continue conversations intelligently

Instead of keyword matching (which misses context), vector search finds *meaning*. Ask about "handling angry customers" and it'll surface memories about "client frustration" or "difficult support cases" even if those exact words weren't used.

## The Memory Architecture: Files \+ Vector Database

Here's the two-layer system that makes AI memory actually work:

### Layer 1: Structured Memory Files

- **Core memory files** (25 lines max each): Essential info, read every session  
    
  - `identity.md` \- Who your AI is, relationship with you, core traits  
  - `patterns.md` \- Your work patterns, communication style, preferences  
  - `decisions.md` \- Technical decisions made, tools chosen, configurations  
  - `context.md` \- Current active work, what's in progress RIGHT NOW  
  - `breadcrumbs.md` \- Recent session trail, what happened last few days


- **Daily logs** (`YYYY-MM-DD.md`): Full session details, kept forever

### Layer 2: Vector Database (Qdrant)

- All memory files get indexed as embeddings  
- Semantic search retrieves relevant context  
- Works across all sessions and timeframes  
- Finds connections you'd never think to search for

The files give structure. The vector database gives intelligence.

## Setting Up Qdrant

Qdrant is your vector database. Here's the simplest setup:

### Docker Installation

```shell
# Pull and run Qdrant
docker run -d \
  --name qdrant \
  -p 6333:6333 \
  -v $(pwd)/qdrant_storage:/qdrant/storage \
  qdrant/qdrant

# Verify it's running
curl http://localhost:6333/health
```

That's it. Qdrant is now running on port 6333 with persistent storage.

### Creating Your Memory Collection

```shell
# Create a collection for AI memories
curl -X PUT "http://localhost:6333/collections/ai-memory" \
  -H "Content-Type: application/json" \
  -d '{
    "vectors": {
      "size": 768,
      "distance": "Cosine"
    }
  }'
```

The `768` dimension matches the `nomic-embed-text` model we'll use for embeddings.

## Indexing Your Memories

You need embeddings to index text. Here's how to set that up:

### Install Ollama \+ Embedding Model

```shell
# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Pull the embedding model
ollama pull nomic-embed-text
```

### Simple Python Indexing Script

Save this as `index_memories.py`:

```py
#!/usr/bin/env python3
import requests
import json
import os
from pathlib import Path

QDRANT_URL = "http://localhost:6333"
OLLAMA_URL = "http://localhost:11434"

def get_embedding(text):
    """Get embedding from Ollama"""
    response = requests.post(f"{OLLAMA_URL}/api/embeddings", 
        json={"model": "nomic-embed-text", "prompt": text})
    return response.json()["embedding"]

def index_file(file_path, collection="ai-memory"):
    """Index a memory file to Qdrant"""
    with open(file_path, 'r') as f:
        content = f.read()
    
    # Get embedding
    embedding = get_embedding(content)
    
    # Index to Qdrant
    point_id = hash(str(file_path)) % 2147483647  # Simple ID from path
    
    requests.put(f"{QDRANT_URL}/collections/{collection}/points",
        json={
            "points": [{
                "id": point_id,
                "vector": embedding,
                "payload": {
                    "file": str(file_path),
                    "content": content[:500],  # First 500 chars for reference
                    "type": "memory_file"
                }
            }]
        })
    print(f"Indexed: {file_path}")

def index_memory_directory(memory_dir="memory"):
    """Index all files in memory directory"""
    memory_path = Path(memory_dir)
    
    for md_file in memory_path.rglob("*.md"):
        index_file(md_file)

if __name__ == "__main__":
    index_memory_directory()
    print("Memory indexing complete!")
```

Run it:

```shell
python3 index_memories.py
```

## Searching for Context Recovery

Here's your memory search script. Save as `search_memories.py`:

```py
#!/usr/bin/env python3
import requests
import json

QDRANT_URL = "http://localhost:6333"
OLLAMA_URL = "http://localhost:11434"

def search_memories(query, limit=5):
    """Search for relevant memories"""
    # Get query embedding
    response = requests.post(f"{OLLAMA_URL}/api/embeddings",
        json={"model": "nomic-embed-text", "prompt": query})
    query_embedding = response.json()["embedding"]
    
    # Search Qdrant
    search_response = requests.post(f"{QDRANT_URL}/collections/ai-memory/points/search",
        json={
            "vector": query_embedding,
            "limit": limit,
            "with_payload": True
        })
    
    results = search_response.json()["result"]
    
    print(f"Memory search for: '{query}'\n")
    for i, result in enumerate(results, 1):
        score = result["score"]
        payload = result["payload"]
        print(f"{i}. Score: {score:.3f}")
        print(f"   File: {payload['file']}")
        print(f"   Content: {payload['content'][:200]}...\n")

if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print("Usage: python3 search_memories.py 'your search query'")
        sys.exit(1)
    
    query = " ".join(sys.argv[1:])
    search_memories(query)
```

Test it:

```shell
python3 search_memories.py "project setup"
python3 search_memories.py "configuration problems"
```

## OpenClaw Integration

OpenClaw connects to Qdrant for memory search through a simple API call. The key is the `memory_search` command that queries your vector database before responding.

Here's how it works:

1. OpenClaw detects it needs context (new session, complex question, etc.)  
2. Runs semantic search against your Qdrant collection  
3. Injects relevant memories into the conversation context  
4. Responds with full knowledge of your history

The search happens automatically during post-compaction recovery and can be triggered manually when needed.

## Complete OpenClaw Setup Prompt

Copy and paste this entire prompt to your OpenClaw assistant to set up the complete memory system:

---

**SETUP PROMPT START**

Set up my AI memory architecture with Qdrant vector database. Execute these steps:

1. **Deploy Qdrant via Docker:**

```shell
docker run -d --name qdrant -p 6333:6333 -v $(pwd)/qdrant_storage:/qdrant/storage qdrant/qdrant
curl http://localhost:6333/health
```

2. **Create memory collection:**

```shell
curl -X PUT "http://localhost:6333/collections/ai-memory" -H "Content-Type: application/json" -d '{"vectors": {"size": 768, "distance": "Cosine"}}'
```

3. **Install embedding model:**

```shell
ollama pull nomic-embed-text
```

4. **Create memory directory structure:**

```shell
mkdir -p memory/core memory/sessions
touch memory/core/identity.md memory/core/patterns.md memory/core/decisions.md memory/core/context.md memory/core/breadcrumbs.md
```

5. **Create indexing script** (`index_memories.py`):

```py
#!/usr/bin/env python3
import requests
import json
import os
from pathlib import Path

QDRANT_URL = "http://localhost:6333"
OLLAMA_URL = "http://localhost:11434"

def get_embedding(text):
    response = requests.post(f"{OLLAMA_URL}/api/embeddings", 
        json={"model": "nomic-embed-text", "prompt": text})
    return response.json()["embedding"]

def index_file(file_path, collection="ai-memory"):
    with open(file_path, 'r') as f:
        content = f.read()
    
    if not content.strip():
        return
        
    embedding = get_embedding(content)
    point_id = hash(str(file_path)) % 2147483647
    
    requests.put(f"{QDRANT_URL}/collections/{collection}/points",
        json={
            "points": [{
                "id": point_id,
                "vector": embedding,
                "payload": {
                    "file": str(file_path),
                    "content": content[:500],
                    "type": "memory_file"
                }
            }]
        })
    print(f"Indexed: {file_path}")

def index_memory_directory(memory_dir="memory"):
    memory_path = Path(memory_dir)
    for md_file in memory_path.rglob("*.md"):
        if md_file.stat().st_size > 0:
            index_file(md_file)

if __name__ == "__main__":
    index_memory_directory()
    print("Memory indexing complete!")
```

6. **Create search script** (`search_memories.py`):

```py
#!/usr/bin/env python3
import requests
import json

QDRANT_URL = "http://localhost:6333"
OLLAMA_URL = "http://localhost:11434"

def search_memories(query, limit=5):
    response = requests.post(f"{OLLAMA_URL}/api/embeddings",
        json={"model": "nomic-embed-text", "prompt": query})
    query_embedding = response.json()["embedding"]
    
    search_response = requests.post(f"{QDRANT_URL}/collections/ai-memory/points/search",
        json={
            "vector": query_embedding,
            "limit": limit,
            "with_payload": True
        })
    
    results = search_response.json()["result"]
    
    print(f"Memory search for: '{query}'\n")
    for i, result in enumerate(results, 1):
        score = result["score"]
        payload = result["payload"]
        print(f"{i}. Score: {score:.3f} | {payload['file']}")
        print(f"   {payload['content'][:200]}...\n")

if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print("Usage: python3 search_memories.py 'search query'")
        sys.exit(1)
    query = " ".join(sys.argv[1:])
    search_memories(query)
```

7. **Make scripts executable and test:**

```shell
chmod +x index_memories.py search_memories.py
python3 index_memories.py
python3 search_memories.py "test query"
```

8. **Configure OpenClaw memory search** \- Add to your OpenClaw configuration:  
   - Qdrant endpoint: `http://localhost:6333`  
   - Collection: `ai-memory`  
   - Embedding model: `nomic-embed-text`  
   - Enable automatic memory search on session start and post-compaction

Now populate your core memory files with real information about yourself, your preferences, ongoing projects, and patterns. The system will automatically index and search this information to maintain context across all sessions.

**SETUP PROMPT END**

---

## Tips and Best Practices

### Keep Core Memory Files Focused

- 25 lines max per core file  
- Real content, not placeholders  
- Update `context.md` frequently \- it's your "current state" file  
- Use `breadcrumbs.md` to track recent session highlights

### Index Regularly

- Run `python3 index_memories.py` after major sessions  
- Set up a cron job for automatic daily indexing  
- Include project files, not just memory files \- index anything your AI should remember

### Search Strategy

- Use natural language queries: "client onboarding process" not "client\_onboarding"  
- Search before starting complex tasks  
- Check memories when conversations feel repetitive

### File Organization

```
memory/
├── core/
│   ├── identity.md (who your AI is)
│   ├── patterns.md (your work patterns)
│   ├── decisions.md (technical choices made)
│   ├── context.md (what's happening now)
│   └── breadcrumbs.md (recent session trail)
├── sessions/ (detailed session logs)
├── 2024-01-15.md (daily logs)
└── projects/ (project-specific memory)
```

### Troubleshooting

- **Empty search results?** Check if files are indexed: `curl http://localhost:6333/collections/ai-memory`  
- **Poor search quality?** Use longer, more descriptive queries  
- **Qdrant not starting?** Check Docker logs: `docker logs qdrant`  
- **Embedding errors?** Verify Ollama is running: `ollama list`

### Security

- Qdrant runs locally by default (no external access)  
- Memory files are stored locally  
- Use environment variables for any API keys  
- Consider encryption for sensitive memory content

## The Result

Once set up, your AI will:

- Remember your preferences across all sessions  
- Recall previous project details and decisions  
- Learn from past conversations and mistakes  
- Maintain context even after system restarts  
- Search intelligently through your entire history

No more starting from scratch. No more repeating yourself. Just an AI that actually remembers and builds on every interaction.

**This is how you build an AI assistant that gets smarter over time, not dumber.**  
