import pg from "pg";
import { ensureSchema } from "./schema.js";

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function initDb() {
  const client = await pool.connect();
  try {
    await ensureSchema(client);
  } finally {
    client.release();
  }
}

export async function query(text, params = []) {
  return pool.query(text, params);
}
