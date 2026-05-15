# 🛡️ Aegis — Perfil de Usuario
> Rellena este documento con tu información personal.
> Aegis lo usará para personalizar todos sus prompts de IA y darte recomendaciones mucho más precisas.
> **Deja en blanco cualquier campo que no quieras rellenar o que no aplique.**

---

## 1. 👤 Datos Personales & Biometría Base

> *Usados en: Estado de Combate, Nutrición, Coach de Judo, Plan Operativo.*
> *Sin estos datos la IA hace estimaciones genéricas; con ellos, las recomendaciones son individualizadas.*

```
Edad:                     # ej: 22
Peso (kg):                # ej: 75
Altura (cm):              # ej: 183
Sexo biológico:           # Hombre / Mujer
Categoría de peso Judo:   # ej: -73kg

# Biometría de referencia (tus valores "en forma" o promedio histórico)
RHR base (ppm):           # ej: 48  — Tu frecuencia cardíaca en reposo normal
HRV base (ms):            # ej: 65  — Tu HRV cuando estás recuperado
```

---

## 2. 🥋 Perfil de Judo

> *Usado principalmente en: AI Judo Coach (get_coach_advice.js).*
> *Actualmente el prompt usa datos de la tabla judoka_profile, pero si no está completa, añádela aquí.*
Está completa

```
Grado (cinturón):         # ej: Cinturón Marrón, 1º Dan...
Años practicando Judo:    # ej: 8
Club / Federación:        # ej: Club Judo Madrid, FJE
¿Compites?:               # Sí / No / Ocasionalmente
```

### Tokui-Waza (técnicas favoritas/dominantes)
```
Tachi-waza (pie):    Uchi mata     # ej: Seoi-nage, Uchi-mata, O-soto-gari
Ne-waza (suelo):     Sobrevivir     # ej: Juji-gatame, Kesa-gatame, Hadaka-jime
```

### Historial de Lesiones
> *Crítico para que el Coach no sugiera técnicas que agraven lesiones.*
```
Sobre esto deberia de tener informacion
Lesiones activas o crónicas:
# ej: Tendinitis hombro derecho, problemas de rodilla izquierda...
# Si ninguna, escribe: Ninguna

Lesiones pasadas relevantes:
# ej: Esguince tobillo (recuperado), fractura clavícula (2022)...
```

### Objetivos de Judo
```
Objetivo principal:
# ej: Competir en campeonato autonómico en septiembre, mejorar ne-waza,
#     ganar masa muscular para subir de categoría, pasar el cinturón negro...
Esto deberia de tenerlo tambien

Próxima competición (si aplica):
# Nombre y fecha: ej: Campeonato de Madrid, 15/11/2026
```
Campeonato de aragon en octubre

### Estructura de Entrenamiento Semanal
> *Para que el ACWR tenga contexto real de tu carga habitual.*
```
Días de entrenamiento de Judo por semana:   # ej: 3
Duración habitual de cada sesión (min):     # ej: 90
¿Entrenas algo más? (gym, cardio, etc.): salgo a correr y hago pesas martes y jueves
# ej: Lunes y miércoles gym, footing ocasional los fines de semana
```

---

## 3. 🍽️ Nutrición & Objetivos Dietéticos

> *Usado en: Nutrition Parser, Nutrition Advice, Estado de Combate.*
> *Sin estos targets, la IA no sabe si tu ingesta es suficiente o excesiva para TI.*

```
Objetivo nutricional actual:
# ej: Mantenimiento, Volumen (ganancia muscular), Definición (pérdida grasa),
#     Optimización de rendimiento, Corte de peso para competición...
Esto deberia de calcularlo el en base a mi actividad sueño y demas

Objetivo calórico diario (kcal):      # ej: 2800
Objetivo de proteína diaria (g):      # ej: 160
Objetivo de carbohidratos diaria (g): # ej: 350
Objetivo de grasas diaria (g):        # ej: 80
```

### Restricciones & Preferencias
```
Alergias o intolerancias:
# ej: Intolerancia a la lactosa, alergia a frutos secos, celiaquía...
# Si ninguna, escribe: Ninguna

Preferencias / restricciones dietéticas:
# ej: No como cerdo, vegetariano, prefiero comida mediterránea...
# Si ninguna, escribe: Ninguna
```
Ninguna

### Stack de Suplementación Habitual
> *Para que el Nutrition Advice sepa cuál es tu protocolo base y no sugiera lo que ya tomas.*
```
# Formato: Nombre — Dosis — Momento del día
# ej:
# Creatina Monohidrato — 5g — Por la mañana
```

---

## 4. 😴 Sueño & Ritmos Circadianos

> *Usado en: Estado de Combate, Plan Operativo Diario.*
> *Define cuándo eres más productivo y cómo interpretar tus datos de sueño.*

```
Hora habitual de dormir:           # ej: 00:00
Hora habitual de despertar:        # ej: 08:30
Horas de sueño objetivo:           # ej: 8

Cronotipo (¿cuándo rindes mejor?):
# Madrugador (mañanas) / Intermedio / Nocturno (tardes-noches)
A la tarde, y a media amñana

¿Usas alarma normalmente?:    Si     # Sí 
¿Tomas algo para dormir?:     Nada     # ej: Melatonina 1mg, Magnesio, Nada
```

---

## 5. 🧠 Salud Mental & Estilo de Vida

> *Usado en: Estado de Combate, Plan Operativo Diario.*
> *Permite contextualizar picos de estrés y no alarmar por situaciones normales tuyas.*

```
Ocupación / Estudios:
# ej: Estudiante de Ingeniería + trabajo a tiempo parcial, Empleado en empresa X...
Estudiante de ingenieria informatica de 4º
Fuentes habituales de estrés:
# ej: Exámenes, deadlines de trabajo, entrenamientos intensos...
Entregas de trabajos examenes y frustracion en entrenos que no me salne bien
Actividades de ocio y recuperación mental:
# ej: Videojuegos, lectura, series, senderismo, música...
Amigos, anime, y ocasionalmente el lol

¿Practicas alguna técnica de gestión del estrés?:
# ej: Meditación, respiración, ninguna...
```
Respiraciones

---

## 6. 📅 Estructura Típica del Día

> *Usado en: Plan Operativo Diario.*
> *Permite al planificador respetar tus restricciones horarias fijas (clases, trabajo, etc.).*

```
Horarios fijos e inamovibles (clases, trabajo, etc.):
# ej:
# Lunes-Viernes 09:00-14:00 — Universidad
# Martes y Jueves 19:00-20:30 — Judo
# Sábados mañana — Libre para entreno o competición

Horas que NUNCA deberían planificarse tareas importantes:
# ej: Antes de las 8am, después de las 23:00...
Antes de las 8 am, y despues de las 21:00 a no ser que sea ocio

¿Tienes algún ritual matutino fijo?:
# ej: 30 min de lectura antes de desayunar, café antes de nada, meditación...
```
Ducha -> Desayuno -> Café.

---

## 7. 🎯 Objetivos Generales del Sistema Aegis

> *Usado en todos los prompts como contexto de prioridades.*

```
¿Por qué usas Aegis? ¿Qué quieres mejorar?:
# ej: Optimizar mi rendimiento en Judo para la próxima temporada de competición,
#     mejorar mi calidad de sueño, gestionar mejor el estrés durante los exámenes,
#     llevar un control nutricional más riguroso para la categoría de peso...
Quiero optimizar mi vida usando el concepto de quantitative self.

¿Qué métricas son las más importantes para ti?:
# ej: Readiness (disponibilidad para entrenar), calidad del sueño, ingesta proteica...
Todo en conjunto ya que el sistema es un sistema complejo

¿Hay algo que la IA debería saber sobre ti que no encaja en ninguna categoría anterior?:
# Espacio libre para cualquier contexto adicional relevante
```

---

> **Nota:** Una vez rellenado, avisa a Antigravity para actualizar los prompts.
> Los prompts que se mejorarán son:
> 1. `inference.js` — **Estado de Combate** (reporte diario principal)
> 2. `parse_nutrition.js` / `nutrition_prompt.txt` — **Parser de Nutrición**
> 3. `get_nutrition_advice.js` — **Consejo Táctico Nutricional**
> 4. `get_coach_advice.js` — **Coach de Judo AI**
> 5. `generate_plan.js` — **Plan Operativo Diario**
