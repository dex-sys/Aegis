# Protocolo de Ingesta de Datos: Proyecto Aegis

## 1. Salud Apple (Automatizado/Semi-automático)
Huawei Health suele permitir exportaciones en formato JSON o CSV a través de su opción de "Privacidad".
- **Frecuencia:** Semanal o bajo demanda.
- **Mapeo:**
    - `motion_path_...` -> `activity_logs`
    - `heart_rate_...` -> `metrics_biometric` (RHR, HRV si disponible)
    - `sleep_...` -> `metrics_biometric` (Sleep phases)

## 2. Logs Manuales: Judo (Protocolo de Contacto)
Dado que en Judo no puedes usar el reloj, capturaremos la carga mediante **RPE (Esfuerzo Percibido)** y **Volumen**.

### Estructura del Log Manual (Propuesta `judo_logs.json`)
```json
{
  "timestamp": "2024-05-12T19:00:00Z",
  "activity_type": "judo",
  "duration_minutes": 90,
  "intensity_rpe": 8, // 1-10 (Borg Scale)
  "focus_areas": ["randori", "uchikomi"],
  "injuries_noted": "none",
  "subjective_fatigue": 7
}
```
- **Lógica de Inferencia:** La IA usará el `duration * intensity_rpe` para calcular la **Carga de Entrenamiento (Training Load)** y predecir el impacto en el HRV del día siguiente.

## 3. Arquitectura del Ingestion Engine
1. **Watcher:** Monitoriza una carpeta `data/dropzone`.
2. **Parser:** Identifica si el archivo es un export de Salud (Apple) o un log manual.
3. **Transformer:** Normaliza los datos al esquema de PostgreSQL.
4. **Loader:** Inserta en la DB evitando duplicados.
