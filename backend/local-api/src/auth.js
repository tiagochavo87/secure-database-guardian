import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { query } from "./db.js";

const JWT_SECRET = process.env.JWT_SECRET || "change-me";

export function signToken(user) {
  return jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

export async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password, passwordHash) {
  return bcrypt.compare(password, passwordHash);
}

export async function buildSession(userId) {
  const { rows } = await query(`
    SELECT u.id, u.email, p.full_name
    FROM users u
    LEFT JOIN profiles p ON p.user_id = u.id
    WHERE u.id = $1
  `, [userId]);
  const user = rows[0];
  if (!user) return null;
  const access_token = signToken(user);
  return {
    access_token,
    user: {
      id: user.id,
      email: user.email,
      user_metadata: { full_name: user.full_name || "" },
    },
  };
}

export async function getAuthUser(req) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return null;
  try {
    const payload = verifyToken(token);
    const { rows } = await query(`
      SELECT u.id, u.email, p.full_name, p.approved, COALESCE(r.role, 'user') AS app_role
      FROM users u
      LEFT JOIN profiles p ON p.user_id = u.id
      LEFT JOIN user_roles r ON r.user_id = u.id
      WHERE u.id = $1
    `, [payload.sub]);
    return rows[0] || null;
  } catch {
    return null;
  }
}

export async function ensureInitialAdmin() {
  const email = process.env.INITIAL_ADMIN_EMAIL;
  const password = process.env.INITIAL_ADMIN_PASSWORD;
  const fullName = process.env.INITIAL_ADMIN_NAME || "Administrador";
  if (!email || !password) return;

  const existing = await query(`SELECT id FROM users WHERE email = $1`, [email]);
  let userId = existing.rows[0]?.id;

  if (!userId) {
    const passwordHash = await hashPassword(password);
    const inserted = await query(`INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id`, [email, passwordHash]);
    userId = inserted.rows[0].id;
  }

  await query(`
    INSERT INTO profiles (user_id, full_name, approved, laboratory)
    VALUES ($1, $2, true, 'LAPOGE')
    ON CONFLICT (user_id) DO UPDATE SET
      full_name = EXCLUDED.full_name,
      approved = true,
      updated_at = now()
  `, [userId, fullName]);

  await query(`
    INSERT INTO user_roles (user_id, role)
    VALUES ($1, 'admin')
    ON CONFLICT (user_id) DO UPDATE SET role = 'admin'
  `, [userId]);
}

export function makeResetToken() {
  return crypto.randomBytes(24).toString("hex");
}
