const request = require('supertest');
const { app, pool } = require('../index');

describe('Fatigue Metrics API', () => {
  afterAll(async () => {
    await pool.end();
  });

  it('should return fatigue trend data', async () => {
    const res = await request(app).get('/api/metrics/fatigue/trend');
    expect(res.statusCode).toEqual(200);
    expect(Array.isArray(res.body)).toBeTruthy();
    if (res.body.length > 0) {
      expect(res.body[0]).toHaveProperty('date');
      expect(res.body[0]).toHaveProperty('acute_workload');
      expect(res.body[0]).toHaveProperty('chronic_workload');
      expect(res.body[0]).toHaveProperty('acwr');
    }
  });
});
