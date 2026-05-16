# Aegis AI - RAG (Retrieval-Augmented Generation) Architecture Blueprint

## 1. Overview
The goal of this refactoring is to transition the Aegis AI from a stateless, short-term context window to a stateful, long-term semantic memory system. This will allow the AI to base its decisions on historical user data, scientific literature, and personal patterns that exceed the standard context window limits.

## 2. Infrastructure Layer: Vector Store
We will leverage the existing PostgreSQL instance by enabling the `pgvector` extension.

### 2.1 Database Schema Additions
- **Extension:** `CREATE EXTENSION IF NOT EXISTS vector;`
- **Table: `knowledge_embeddings`**
    - `id`: UUID (Primary Key)
    - `content_source`: String (e.g., "IJF_Manual", "Sport_Science_Paper")
    - `raw_text`: Text
    - `embedding`: Vector(768) -- Optimized for Gemini Embedding models
    - `metadata`: JSONB (Page numbers, tags, date)
- **Table: `user_semantic_memory`**
    - `id`: UUID (Primary Key)
    - `event_date`: Timestamp
    - `narrative_summary`: Text (Natural language translation of structured logs)
    - `embedding`: Vector(768)
    - `context_type`: String (e.g., "injury_pattern", "success_case", "stress_response")

## 3. Embedding Pipeline (The Memory Maker)
A background worker (`ingestion-engine/embed_worker.js`) will process new and historical data.

### 3.1 Narrative Synthesis
Raw logs (JSON) must be converted into "Narrative Sentences" before embedding to improve semantic search quality:
*   *Raw Data:* `{ "kcal": 2500, "activity": "Judo", "mood": 3 }`
*   *Narrative:* "The user had a high-intensity Judo session followed by a significant caloric intake, but reported a very low mood score."

### 3.2 Embedding Model
- **Primary:** `text-embedding-004` (via Gemini API).
- **Fallback/Local:** `all-MiniLM-L6-v2` (if local privacy-first processing is required).

## 4. Retrieval Strategy (The Brain)
The system will use a **Hybrid Search** approach:
1.  **Temporal Context (Current):** Last 7 days of raw SQL data (standard context).
2.  **Semantic Context (RAG):** Top 3-5 most relevant "memories" or "knowledge snippets" retrieved via cosine similarity (`<=>` operator in pgvector).

### 4.1 Search Query Construction
The retrieval query is not the raw user input, but an AI-generated search term:
*   *Current State:* ACWR 1.8, high stress, knee pain.
*   *Generated Search Query:* "Historical response to high workload and joint inflammation in judo."

## 5. Augmentation & Prompt Injection
The `retriever.js` module will inject the findings into the existing prompts.

### 5.1 Prompt Template Structure
```text
[EXPERT ROLE]
[CURRENT RAW TELEMETRY]

--- SEMANTIC CONTEXT (RAG) ---
The following historical patterns and literature are relevant to the current situation:
- MEMORY 1: [Context about a past injury recovery]
- KNOWLEDGE 1: [Technical protocol for ACWR > 1.5]
------------------------------

[TASKS & OUTPUT FORMAT]
```

## 6. Implementation Phases

### Phase 1: Infrastructure (Foundation)
- Update `docker-compose.yml` with a `pgvector` compatible image.
- Run migration for vector tables and extensions.

### Phase 2: Knowledge Ingestion
- Fragment and embed the Judo technical manual and sports science PDFs.
- Populate `knowledge_embeddings`.

### Phase 3: Memory Generation
- Create the script to batch-process historical `activity_logs` and `inference_results`.
- Implement the "Narrative Synthesis" logic.

### Phase 4: Integration
- Update `ingestion-engine/inference.js` to call the Retriever.
- Measure improvement in "Rationale" quality.

## 7. Security & Privacy
- Embeddings are stored locally. 
- No raw PII (Personally Identifiable Information) is sent to external embedding APIs unless encrypted or anonymized.
- The Vector Store remains strictly behind the Aegis Docker network.
