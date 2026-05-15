/**
 * Proyecto Aegis - Ingestion Engine
 * Core: Node.js + Chokidar (Watcher) + PG
 */

require('dotenv').config({ silent: true });
const chokidar = require('chokidar');
const path = require('path');
const fs = require('fs');
const { Pool } = require('pg');
const sax = require('sax');
const { exec } = require('child_process');

const DROPZONE_PATH = process.env.DROPZONE_PATH || './data/dropzone';
const dbPool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function initDB() {
  try {
    await dbPool.query('SELECT NOW()');
    console.log('Successfully connected to PostgreSQL Pool');
  } catch (err) {
    console.error('Database connection error', err.stack);
    process.exit(1);
  }
}

// Watcher para nuevos archivos
const watcher = chokidar.watch(DROPZONE_PATH, {
  ignored: (path) => path.includes('node_modules') || path.includes('.git'),
  persistent: true,
  awaitWriteFinish: {
    stabilityThreshold: 1000,
    pollInterval: 100
  }
});

watcher.on('add', async (filePath) => {
  const fileName = path.basename(filePath);
  console.log(`New file detected: ${fileName}`);

  try {
    if (fileName === '.trigger') {
      console.log('Manual trigger detected. Running inference...');
      fs.unlinkSync(filePath); // Eliminar el trigger
      exec('node inference.js', (error) => {
        if (error) console.error(`Inference Trigger Error: ${error}`);
      });
      return;
    }

    if (fileName.endsWith('.meal')) {
      const logId = fs.readFileSync(filePath, 'utf8').trim();
      console.log(`Meal trigger detected for ID: ${logId}. Running parser...`);
      fs.unlinkSync(filePath);
      exec(`node parse_nutrition.js ${logId}`, (error, stdout, stderr) => {
        if (stdout) console.log(`Nutrition Parser Output: ${stdout}`);
        if (stderr) console.error(`Nutrition Parser Stderr: ${stderr}`);
        if (error) console.error(`Nutrition Parser Error: ${error}`);
      });
      return;
    }

    await dbPool.query("UPDATE system_status SET value = 'processing', updated_at = NOW() WHERE key = 'ingestion_state'");
    if (fileName.endsWith('.json')) {
      await processJSON(filePath);
    } else if (fileName.endsWith('.csv')) {
      await processCSV(filePath);
    } else if (fileName.endsWith('.xml')) {
      await processAppleHealthXML(filePath);
    }
    await dbPool.query("UPDATE system_status SET value = 'idle', updated_at = NOW() WHERE key = 'ingestion_state'");
    
    // Disparar inferencia automática tras nueva ingesta
    console.log('Ingestion complete. Triggering AI Inference...');
    exec('node inference.js', (error, stdout, stderr) => {
      if (error) console.error(`Inference Trigger Error: ${error}`);
      else console.log('Inference Triggered Successfully');
    });
  } catch (err) {
    console.error(`Error processing ${fileName}:`, err);
    await dbPool.query("UPDATE system_status SET value = 'error', updated_at = NOW() WHERE key = 'ingestion_state'");
  }
});

async function processJSON(filePath) {
  const rawData = fs.readFileSync(filePath);
  const data = JSON.parse(rawData);

  if (data.activity_type === 'judo') {
    console.log('Processing Manual Judo Log...');
    await insertJudoLog(data);
  } else {
    console.log('Processing generic JSON data...');
  }
}

async function insertJudoLog(data) {
  const query = `
    INSERT INTO activity_logs (start_time, activity_type, cognitive_load_rpe, context_metadata)
    VALUES ($1, $2, $3, $4)
  `;
  const values = [
    data.timestamp,
    'judo',
    data.intensity_rpe,
    JSON.stringify({
      duration_minutes: data.duration_minutes,
      focus_areas: data.focus_areas,
      subjective_fatigue: data.subjective_fatigue
    })
  ];
  await dbPool.query(query, values);
}

const { parse } = require('csv-parse');

async function processCSV(filePath) {
  console.log(`Processing CSV file: ${filePath}`);
  const fileContent = fs.readFileSync(filePath);
  
  parse(fileContent, {
    columns: true,
    skip_empty_lines: true
  }, async (err, records) => {
    if (err) {
      console.error(`Error parsing CSV ${filePath}:`, err);
      return;
    }

    console.log(`Parsed ${records.length} records from CSV.`);
    
    for (const record of records) {
      // Mapeo flexible para diferentes formatos de Huawei/Genéricos
      const timestamp = record.timestamp || record.Date || record.time;
      const rhr = record.rhr_bpm || record['Heart Rate(bpm)'] || record.hr;
      const steps = record.step_count || record.steps || record.Steps;
      const hrv = record.hrv_ms || record.hrv;
      
      const sleep_rem = record.sleep_rem || record['REM sleep(minutes)'] || record.rem_sleep;
      const sleep_deep = record.sleep_deep || record['Deep sleep(minutes)'] || record.deep_sleep;
      const sleep_light = record.sleep_light || record['Light sleep(minutes)'] || record.light_sleep;
      const sleep_awake = record.sleep_awake || record['Wake up duration(minutes)'] || record.awake_time;

      if (timestamp && (rhr || steps || hrv || sleep_rem || sleep_deep || sleep_light || sleep_awake)) {
        const query = `
          INSERT INTO metrics_biometric (timestamp, rhr_bpm, step_count, hrv_ms, sleep_rem_seconds, sleep_deep_seconds, sleep_light_seconds, sleep_awake_seconds)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (timestamp) DO UPDATE SET
            rhr_bpm = COALESCE(EXCLUDED.rhr_bpm, metrics_biometric.rhr_bpm),
            step_count = COALESCE(EXCLUDED.step_count, metrics_biometric.step_count),
            hrv_ms = COALESCE(EXCLUDED.hrv_ms, metrics_biometric.hrv_ms),
            sleep_rem_seconds = COALESCE(EXCLUDED.sleep_rem_seconds, metrics_biometric.sleep_rem_seconds),
            sleep_deep_seconds = COALESCE(EXCLUDED.sleep_deep_seconds, metrics_biometric.sleep_deep_seconds),
            sleep_light_seconds = COALESCE(EXCLUDED.sleep_light_seconds, metrics_biometric.sleep_light_seconds),
            sleep_awake_seconds = COALESCE(EXCLUDED.sleep_awake_seconds, metrics_biometric.sleep_awake_seconds)
        `;
        const values = [
          timestamp,
          rhr ? parseInt(rhr) : null,
          steps ? parseInt(steps) : null,
          hrv ? parseFloat(hrv) : null,
          sleep_rem ? parseInt(sleep_rem) * 60 : null,
          sleep_deep ? parseInt(sleep_deep) * 60 : null,
          sleep_light ? parseInt(sleep_light) * 60 : null,
          sleep_awake ? parseInt(sleep_awake) * 60 : null
        ];
        
        try {
          await dbPool.query(query, values);
        } catch (dbErr) {
          console.error('Error inserting CSV record:', dbErr.message);
        }
      }
    }
    console.log(`CSV Ingestion Complete for ${filePath}`);
  });
}

async function processAppleHealthXML(filePath) {
  console.log(`Processing Apple Health XML: ${filePath}`);
  const saxStream = sax.createStream(true);
  const fileStream = fs.createReadStream(filePath);
  let count = 0;
  let batch = [];
  const BATCH_SIZE = 500;

  const flushBatch = async () => {
    if (batch.length === 0) return;
    const currentBatch = [...batch];
    batch = [];
    
    // Inserción masiva para eficiencia
    await Promise.all(currentBatch.map(item => dbPool.query(item.query, item.values)));
  };

  saxStream.on('opentag', async (node) => {
    if (node.name === 'Record') {
      const type = node.attributes.type;
      const startDate = node.attributes.startDate;
      const value = parseFloat(node.attributes.value);

      let query = '';
      let values = [];

      if (type === 'HKQuantityTypeIdentifierHeartRateVariabilitySDNN') {
        query = 'INSERT INTO metrics_biometric (timestamp, hrv_ms) VALUES ($1, $2) ON CONFLICT (timestamp) DO UPDATE SET hrv_ms = EXCLUDED.hrv_ms';
        values = [startDate, value];
      } else if (type === 'HKQuantityTypeIdentifierRestingHeartRate') {
        query = 'INSERT INTO metrics_biometric (timestamp, rhr_bpm) VALUES ($1, $2) ON CONFLICT (timestamp) DO UPDATE SET rhr_bpm = EXCLUDED.rhr_bpm';
        values = [startDate, value];
      } else if (type === 'HKQuantityTypeIdentifierOxygenSaturation') {
        query = 'INSERT INTO metrics_biometric (timestamp, spo2_pct) VALUES ($1, $2) ON CONFLICT (timestamp) DO UPDATE SET spo2_pct = EXCLUDED.spo2_pct';
        values = [startDate, value * 100];
      } else if (type === 'HKQuantityTypeIdentifierStepCount') {
        query = 'INSERT INTO metrics_biometric (timestamp, step_count) VALUES ($1, $2) ON CONFLICT (timestamp) DO UPDATE SET step_count = EXCLUDED.step_count';
        values = [startDate, value];
      } else if (type === 'HKCategoryTypeIdentifierSleepAnalysis') {
        const start = new Date(node.attributes.startDate);
        const end = new Date(node.attributes.endDate);
        const durationSec = Math.floor((end - start) / 1000);
        const sleepValue = node.attributes.value;

        if (sleepValue === '2' || sleepValue === 'HKCategoryValueSleepAnalysisAwake') { // Awake
          query = 'INSERT INTO metrics_biometric (timestamp, sleep_awake_seconds) VALUES ($1, $2) ON CONFLICT (timestamp) DO UPDATE SET sleep_awake_seconds = EXCLUDED.sleep_awake_seconds';
          values = [startDate, durationSec];
        } else if (sleepValue === '3' || sleepValue === 'HKCategoryValueSleepAnalysisAsleepCore') { // Core/Light
          query = 'INSERT INTO metrics_biometric (timestamp, sleep_light_seconds) VALUES ($1, $2) ON CONFLICT (timestamp) DO UPDATE SET sleep_light_seconds = EXCLUDED.sleep_light_seconds';
          values = [startDate, durationSec];
        } else if (sleepValue === '4' || sleepValue === 'HKCategoryValueSleepAnalysisAsleepDeep') { // Deep
          query = 'INSERT INTO metrics_biometric (timestamp, sleep_deep_seconds) VALUES ($1, $2) ON CONFLICT (timestamp) DO UPDATE SET sleep_deep_seconds = EXCLUDED.sleep_deep_seconds';
          values = [startDate, durationSec];
        } else if (sleepValue === '5' || sleepValue === 'HKCategoryValueSleepAnalysisAsleepREM') { // REM
          query = 'INSERT INTO metrics_biometric (timestamp, sleep_rem_seconds) VALUES ($1, $2) ON CONFLICT (timestamp) DO UPDATE SET sleep_rem_seconds = EXCLUDED.sleep_rem_seconds';
          values = [startDate, durationSec];
        } else { // Generic Asleep or In Bed
          query = 'INSERT INTO metrics_biometric (timestamp, sleep_duration_seconds) VALUES ($1, $2) ON CONFLICT (timestamp) DO UPDATE SET sleep_duration_seconds = EXCLUDED.sleep_duration_seconds';
          values = [startDate, durationSec];
        }
      }

      if (query) {
        batch.push({ query, values });
        if (batch.length >= BATCH_SIZE) {
          fileStream.pause(); // Pausar lectura de archivo
          await flushBatch();
          count += BATCH_SIZE;
          console.log(`Ingested ${count} records...`);
          fileStream.resume(); // Reanudar lectura
        }
      }
    }
  });

  saxStream.on('end', async () => {
    await flushBatch();
    console.log(`Apple Health Ingestion Complete. Total added: ${count + batch.length}`);
  });

  fileStream.pipe(saxStream);
}

console.log(`Aegis Ingestion Engine started. Watching ${DROPZONE_PATH}...`);
initDB();
