import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from './pool.js';

const currentFile = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFile);
const migrationsDir = path.resolve(currentDir, '../../migrations');

// Runs all SQL migration files in filename order.
async function runMigrations() {
  const files = await fs.readdir(migrationsDir);
  const sqlFiles = files.filter((file) => file.endsWith('.sql')).sort();

  for (const file of sqlFiles) {
    const sql = await fs.readFile(path.join(migrationsDir, file), 'utf8');
    await pool.query(sql);
    console.log(`Applied migration: ${file}`);
  }

  await pool.end();
}

runMigrations().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

