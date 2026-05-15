# Proyecto Aegis - Progress Tracking

## 1. Project Vision
Motor de Inferencia para la Optimización del Rendimiento (Quantified Self AI). Un Sistema de Soporte a la Decisión (DSS) que centraliza datos biológicos, ambientales y de actividad.

## 2. Current Phase
- **Phase 4: Advanced Tactical Coaching & Bio-Hacking** (Active)

## 3. Roadmap & Progress

### Phase 1: Foundation & Data Ingress
- [x] Define Data Model (Schema) - PostgreSQL implementation
- [x] Implement Dockerized Environment (Docker Compose)
- [x] Configure GCloud Authentication for Docker containers
- [x] Implement Modular Ingestion Layer (Node.js Engine)
    - [x] Manual Entry Adapter (Judo/Contact Sports)
    - [x] Huawei Health Adapter (CSV Parser)
- [x] Setup Local Database for Time Series Data
- [x] Basic "Readiness Score" Algorithm Implementation (via Gemini AI)

### Phase 2: AI Inference Engine (Gemini Integration)
- [x] Implement Dockerized Inference Job
- [x] Prompt Engineering (Contextual Template for "Estado de Combate")
- [x] AI Output Parser & Re-ingestion logic
- [x] Fatigue Correlation Engine: **Holistic ACWR** (Implemented load weighting with Sleep & Mental Stress)

### Phase 3: Interface & Delivery (Active)
- [x] Implement API Server (Node/Express)
- [x] Develop React SPA (Vite + Tailwind + Recharts)
    - [x] Modern Dark/Orange Dashboard
    - [x] Mental Health Visualization
    - [x] Readiness Trend Visualization (New)
    - [x] Entrenador Personal (Judo Coach) - Onboarding & AI Tactics
    - [x] Bucle de Feedback de Randori (Technical Focus tracking)
    - [x] Monitor de Riesgo de Lesión (ACWR visualization)
    - [x] Sistema de Progreso de Maestría (Camino al Dan)
- [x] Update AI Inference loop with Mental Health data
- [x] Notification/Alert System (Implemented with System Alerts & Dashboard Banners)
- [x] Daily "Estado de Combate" Report Generation (Implemented & Verified)
- [x] UI Acceptance Testing Suite (Vitest + JSDOM)

### Phase 4: Advanced Tactical Coaching & Bio-Hacking (Active)
- [x] **Visualización Predictiva**: Gráfica de tendencia ACWR con "Zonas de Seguridad" y "Zonas de Riesgo".
- [x] **Sincronización Nutricional**: Extracción automática de macros (IA) y disparador táctico según carga.
- [ ] **Indicador de Disponibilidad**: Widget de "Batería Biométrica" (HRV + Sueño + Carga). <-- **CURRENT FOCUS**
- [ ] **Estrategia Situacional**: Simulador de Oponentes (Gemini genera planes contra perfiles específicos).
- [ ] **Micro-Misiones**: Sistema de objetivos de Randori accionables con validación post-entreno.
- [ ] **Gamificación Técnica**: Niveles de Maestría visuales (Bronce/Plata/Oro) basados en feedback real.
- [ ] **Pre-Hab Adaptativo**: Rutinas de movilidad generadas por IA según el nivel de fatiga y ACWR.
- [ ] **Reporte "Estado de Combate" Pro**: Exportación de informes técnicos en PDF/Markdown para seguimiento externo.

### Phase 5: Deep Analytics & Ecosystem Expansion (Backlog)
- [ ] **Módulo "Laboratorio" (Recovery & Biometrics)**:
    - [ ] Visualización de arquitectura de sueño (REM, Profundo, Ligero).
    - [ ] Dashboard de tendencias a largo plazo de HRV and RHR.
    - [ ] Análisis de dispersión: Correlación entre calidad de sueño y ACWR.
- [ ] **Módulo "El Dojo" (Arsenal & Mastery)**:
    - [ ] Visualización de Árbol de Habilidades (Skill Tree) interactivo.
    - [ ] Historial técnico de Randori para identificar "leaks" en el juego.
    - [ ] Progresión de maestría visual hacia el próximo Dan.
- [ ] **Módulo "Zen" (Mind & Focus)**:
    - [ ] Correlación IA entre carga cognitiva/académica y rendimiento físico.
    - [ ] Tracking automatizado de "Deep Work" vs. Carga de Estrés percibida.
    - [ ] Recomendaciones de gestión de estrés basadas en el ciclo circadiano.
- [ ] **Módulo "Bitácora" (System Log & Control)**:
    - [ ] Centro de control de datos brutos (Edición/Borrado de logs de comida, sueño, etc.).
    - [ ] Auditoría de sincronización de fuentes (Apple, Huawei, Manual).
    - [ ] Configuración avanzada del Perfil Biométrico y objetivos dinámicos.

### Phase 6: RAG & Semantic Memory (Active in RAG_implementation branch)
- [x] **Infrastructure**: Enabled `pgvector` in Docker & Schema.
- [x] **Architecture**: Documented `AI_RAG_ARCHITECTURE.md`.
- [x] **Narrative Synthesis**: Implemented logic to convert JSON logs to natural language.
- [ ] **Embedding Worker**: Implementing background sync for semantic memory.
- [ ] **Knowledge Ingestion**: Populating vector store with expert Judo/Nutrition content.
- [ ] **Semantic Retrieval**: Integrating vector search into the inference engine prompts.

## 4. Completed Tasks
- [x] Build and verify Docker environment.
- [x] Process first Judo log via dropzone.
- [x] Generate first AI-powered "Estado de Combate" report.
- [x] Implement and verify Huawei Health CSV Adapter.
- [x] Fix XML streaming pause/resume bug in Ingestion Engine.
- [x] Add Readiness Trend endpoint and frontend visualization.
- [x] Implement Fatigue Correlation logic (ACWR calculation).
- [x] **Evolution to Holistic ACWR**: Weighted physical load with Sleep and Mental Stress modifiers.
- [x] **Nutrition AI Integration**: Real-time natural text to macro extraction with ingestion trigger.
- [x] **Ingestion Engine Refactor**: Fixed chokidar ignore patterns and added write stability for shared volumes.

## 5. Pending Immediate Tasks
- [ ] **Biometric Battery Widget**: Implementation of the availability indicator on the Dashboard.
- [ ] **Opponent Simulation**: Basic prompt structure for tactical planning against specific styles.

## 6. Known Issues / Roadblocks
- **Anime.js Dependency**: Removed due to Vite/ESM compatibility issues; focusing on CSS/Native animations if needed.

## 7. Future Considerations
- Privacy-first local encryption.
- Hardware-agnostic adapter design.
