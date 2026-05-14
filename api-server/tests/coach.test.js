const request = require('supertest');
const { app, pool } = require('../index');

describe('Entrenador Personal API', () => {
  beforeAll(async () => {
    // Limpiar tablas para que los tests sean deterministas
    if (pool) {
      await pool.query('DELETE FROM judoka_techniques');
      await pool.query('DELETE FROM judoka_profile');
    }
  });

  it('should return null if no judoka profile exists', async () => {
    const res = await request(app).get('/api/coach/profile');
    expect(res.statusCode).toEqual(200);
    expect(res.body.profile).toBeNull();
  });

  it('should create a new judoka profile', async () => {
    const profile = {
      belt_rank: 'Brown',
      weight_category: '-81kg',
      preferred_style: 'Uchi-mata specialist',
      injury_history: 'None',
      goals: 'Black belt this year'
    };
    const res = await request(app)
      .post('/api/coach/profile')
      .send(profile);
    expect(res.statusCode).toEqual(201);
    expect(res.body.belt_rank).toEqual(profile.belt_rank);
  });

  it('should update the existing judoka profile', async () => {
    const updatedProfile = {
      belt_rank: 'Black',
      weight_category: '-81kg',
      preferred_style: 'Uchi-mata & Ne-waza',
      injury_history: 'Minor knee pain',
      goals: 'Win regional tournament'
    };
    const res = await request(app)
      .post('/api/coach/profile')
      .send(updatedProfile);
    expect(res.statusCode).toEqual(201);
    expect(res.body.belt_rank).toEqual('Black');
  });

  it('should add a new technique', async () => {
    const technique = {
      name: 'Osoto-gari',
      category: 'Tachi-waza',
      mastery_level: 4,
      is_tokui_waza: true
    };
    const res = await request(app)
      .post('/api/coach/techniques')
      .send(technique);
    expect(res.statusCode).toEqual(201);
    expect(res.body.name).toEqual('Osoto-gari');
  });

  it('should get the list of techniques', async () => {
    const res = await request(app).get('/api/coach/techniques');
    expect(res.statusCode).toEqual(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('should generate a coaching recommendation based on profile and readiness', async () => {
    // 1. Asegurar que hay biometría reciente (Simular una inferencia previa)
    await pool.query(`
      INSERT INTO inference_results (target_date, readiness_score, fatigue_level, recommendation_summary)
      VALUES (CURRENT_DATE, 0.85, 'low', 'Listo para alta intensidad')
      ON CONFLICT (target_date) DO UPDATE SET readiness_score = 0.85
    `);

    const res = await request(app).get('/api/coach/recommendation');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('tachi_waza_focus');
    expect(res.body).toHaveProperty('ne_waza_focus');
    expect(res.body).toHaveProperty('rationale');
  }, 60000); // 60s timeout for AI engine
});
