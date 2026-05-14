# Arquitectura del Motor de Inferencia (AI Loop)

El Proyecto Aegis utiliza un modelo de "Bucle Cerrado" donde la IA no solo analiza, sino que sus conclusiones vuelven a entrar en el sistema como datos estructurados.

## Flujo de Trabajo del Job de IA

1. **Extracción de Contexto (The "Context Fetcher"):**
   Un script dentro del contenedor de Docker consulta la base de datos PostgreSQL para obtener:
   - Biometría de las últimas 24h y tendencia de 7 días.
   - Logs de actividad (incluyendo Judo) y carga de entrenamiento acumulada.
   - Variables ambientales del día actual.

2. **Ensamblado del Prompt (The "Prompt Engineer"):**
   Se genera un prompt estructurado (usando una plantilla Jinja2 o similar) que incluye:
   - **Sistema:** "Actúa como un Lead Systems Architect y experto en Fisiología del Rendimiento..."
   - **Datos:** Las métricas crudas formateadas para legibilidad del modelo.
   - **Output Deseado:** Un JSON estructurado con el "Estado de Combate", Readiness Score y recomendaciones.

## Ejecución del Job (Gemini CLI)

El contenedor ejecutará el binario `gemini-cli` pasando el prompt generado. 

**Ventajas:**
- Consistencia con el entorno de desarrollo.
- Manejo nativo de tokens y sesiones.
- Capacidad de usar herramientas (tools) si el modelo lo requiere en el futuro.

**Comando base:**
```bash
cat prompt.txt | gemini-cli "Analiza estos datos biométricos y devuelve un JSON estructurado."
```


4. **Parser e Ingesta:**
   - La salida de la IA se parsea.
   - Los datos estructurados se insertan en la tabla `inference_results`.
   - El reporte textual se guarda para ser visualizado en la interfaz (TUI/Web).

## Estructura del Output de la IA (Ingesta de retorno)
El modelo debe responder con un JSON que el sistema pueda validar:
```json
{
  "readiness_score": 0.85,
  "fatigue_level": "Moderate",
  "peak_window": {"start": "10:00", "end": "13:00"},
  "recommendations": ["Prioritize deep work", "Active recovery session needed"],
  "rationale": "HRV stable but sleep debt is > 1.5h. Cognitive latency expected to increase after 14:00."
}
```
