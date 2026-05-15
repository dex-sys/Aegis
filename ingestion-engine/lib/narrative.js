/**
 * Aegis RAG - Narrative Synthesis Library
 * Converts structured database records into natural language for embedding.
 */

function synthesizeActivity(activity) {
  const date = new Date(activity.start_time).toLocaleDateString('es-ES');
  const duration = activity.context_metadata?.duration_minutes || 'tiempo no especificado';
  const rpe = activity.cognitive_load_rpe || 'esfuerzo no registrado';
  
  return `El día ${date}, el usuario realizó una actividad de tipo ${activity.activity_type}. ` +
         `La sesión duró ${duration} minutos con una percepción de esfuerzo (RPE) de ${rpe}/10. ` +
         `Completó ${activity.tasks_completed} tareas con ${activity.errors_count} errores.`;
}

function synthesizeNutrition(log) {
  const date = new Date(log.timestamp).toLocaleDateString('es-ES');
  const items = log.parsed_items ? JSON.parse(log.parsed_items).join(', ') : 'alimentos no detallados';
  
  return `En la comida del ${date}, el usuario consumió ${log.kcal} kcal, ` +
         `${log.protein_g}g de proteína, ${log.carbs_g}g de carbohidratos y ${log.fats_g}g de grasas. ` +
         `Los alimentos incluyeron: ${items}.`;
}

function synthesizeRandori(feedback) {
  const date = new Date(feedback.target_date).toLocaleDateString('es-ES');
  const tachi = feedback.tachi_waza_success ? 'éxito' : 'dificultad';
  const ne = feedback.ne_waza_success ? 'éxito' : 'dificultad';
  
  return `En el entrenamiento de Judo del ${date}, el usuario reportó ${tachi} en Tachi-waza y ${ne} en Ne-waza. ` +
         `Notas técnicas: ${feedback.notes || 'sin observaciones'}.`;
}

function synthesizeMental(mental) {
  const date = new Date(mental.timestamp).toLocaleDateString('es-ES');
  return `El ${date}, el estado mental reportado fue: Ánimo ${mental.mood_score}/10, ` +
         `Estrés ${mental.stress_level}/10, Ansiedad ${mental.anxiety_level}/10 y Motivación ${mental.motivation_score}/10. ` +
         `Notas: ${mental.subjective_notes || 'ninguna'}.`;
}

module.exports = {
  synthesizeActivity,
  synthesizeNutrition,
  synthesizeRandori,
  synthesizeMental
};
