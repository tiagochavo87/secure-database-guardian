import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { initDb, query } from "./db.js";
import { TABLES, JSON_COLUMNS } from "./schema.js";
import { buildSession, comparePassword, ensureInitialAdmin, getAuthUser, hashPassword, makeResetToken } from "./auth.js";
import { canReadTable, canWriteTable, restrictProfileFields } from "./permissions.js";
import { sendPasswordResetEmail } from "./mailer.js";

const app = express();
const PORT = Number(process.env.PORT || 3001);
// Aceita uma lista separada por vírgula para permitir, por exemplo, o acesso
// simultâneo via localhost (uso local) e via um domínio/túnel (acesso remoto).
const CORS_ORIGINS = (process.env.CORS_ORIGIN || "http://localhost:8080")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.set("trust proxy", 1);
app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    if (!origin || CORS_ORIGINS.includes(origin)) return callback(null, true);
    return callback(new Error("Origem não permitida pela política de CORS"));
  },
  credentials: false,
}));
app.use(express.json({ limit: "25mb" }));
app.use(morgan("dev"));

// Limite genérico para toda a API, evitando varreduras/força bruta em massa.
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: true, legacyHeaders: false }));

// Limite mais restrito para rotas sensíveis de autenticação (login, cadastro,
// reset de senha), que são o alvo mais óbvio de força bruta quando a
// instalação fica exposta para acesso remoto.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Muitas tentativas. Aguarde alguns minutos e tente novamente." },
});

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'dblapoge-local-api' });
});

app.use(async (req, _res, next) => {
  req.authUser = await getAuthUser(req);
  next();
});

function requireAuth(req, res, next) {
  if (!req.authUser) return res.status(401).json({ error: 'Não autenticado' });
  next();
}

app.post('/auth/register', authLimiter, async (req, res) => {
  try {
    const { email, password, metadata } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    if (String(password).length < 6) return res.status(400).json({ error: 'Senha inválida' });
    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length) return res.status(409).json({ error: 'Email já cadastrado' });

    const passwordHash = await hashPassword(password);
    const inserted = await query('INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email', [email, passwordHash]);
    const user = inserted.rows[0];

    await query(`
      INSERT INTO profiles (user_id, full_name, approved, laboratory, role, institution, program, advisor)
      VALUES ($1, $2, false, $3, $4, $5, $6, $7)
    `, [
      user.id,
      metadata?.full_name || '',
      metadata?.laboratory || 'LAPOGE',
      metadata?.role || '',
      metadata?.institution || '',
      metadata?.program || '',
      metadata?.advisor || '',
    ]);
    await query(`INSERT INTO user_roles (user_id, role) VALUES ($1, 'user')`, [user.id]);

    res.json({ data: { user: { id: user.id, email: user.email, user_metadata: { full_name: metadata?.full_name || '' } } } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao criar usuário' });
  }
});

app.post('/auth/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'Credenciais inválidas' });
    const { rows } = await query('SELECT id, email, password_hash FROM users WHERE email = $1', [email]);
    const user = rows[0];
    if (!user) return res.status(401).json({ error: 'Credenciais inválidas' });
    const ok = await comparePassword(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Credenciais inválidas' });
    const session = await buildSession(user.id);
    res.json({ data: session });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro no login' });
  }
});

app.get('/auth/session', requireAuth, async (req, res) => {
  const session = await buildSession(req.authUser.id);
  res.json({ data: session });
});

app.patch('/auth/user', requireAuth, async (req, res) => {
  try {
    const { password } = req.body || {};
    if (!password || String(password).length < 6) return res.status(400).json({ error: 'Senha inválida' });
    const passwordHash = await hashPassword(password);
    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, req.authUser.id]);
    res.json({ data: { ok: true } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao atualizar senha' });
  }
});

app.post('/auth/reset-password/request', authLimiter, async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ error: 'Email é obrigatório' });
    const { rows } = await query('SELECT id FROM users WHERE email = $1', [email]);

    // Resposta sempre genérica: não revela se o email existe nem devolve o
    // token ao chamador. O link de recuperação nunca deve trafegar de volta
    // na resposta HTTP — quem pede o reset não é necessariamente o dono da
    // conta, e isso permitiria takeover total da conta de qualquer usuário
    // (inclusive admins) apenas sabendo o email.
    if (rows.length) {
      const token = makeResetToken();
      await query(`
        INSERT INTO password_reset_tokens (user_id, token, expires_at)
        VALUES ($1, $2, now() + interval '1 hour')
      `, [rows[0].id, token]);

      const base = process.env.PUBLIC_APP_URL || 'http://localhost:8080/reset-password';
      const link = `${base}?token=${token}`;
      // Envia por SMTP se configurado; caso contrário cai no fallback de log
      // (ver aviso emitido no boot em mailer.js) — nunca volta na resposta HTTP.
      await sendPasswordResetEmail(email, link).catch((err) => {
        console.error('[reset-password] falha ao enviar email:', err.message);
      });
    }

    res.json({ data: { ok: true } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao gerar link de recuperação' });
  }
});

app.post('/auth/reset-password/confirm', authLimiter, async (req, res) => {
  try {
    const { token, password } = req.body || {};
    if (!token || !password || String(password).length < 6) return res.status(400).json({ error: 'Dados inválidos' });
    const { rows } = await query(`
      SELECT user_id FROM password_reset_tokens
      WHERE token = $1 AND used_at IS NULL AND expires_at > now()
      ORDER BY created_at DESC
      LIMIT 1
    `, [token]);
    if (!rows.length) return res.status(400).json({ error: 'Token inválido ou expirado' });
    const passwordHash = await hashPassword(password);
    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, rows[0].user_id]);
    await query('UPDATE password_reset_tokens SET used_at = now() WHERE token = $1', [token]);
    res.json({ data: { ok: true } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao redefinir senha' });
  }
});

app.get('/api/table/:table', requireAuth, async (req, res) => {
  const table = req.params.table;
  if (!TABLES[table]) return res.status(404).json({ error: 'Tabela não suportada' });

  const filters = parseFilters(req.query.filters);
  if (!canReadTable(req.authUser, table, filters)) return res.status(403).json({ error: 'Sem permissão' });

  try {
    const columns = sanitizeColumns(table, String(req.query.select || '*'));
    const order = req.query.order ? JSON.parse(String(req.query.order)) : null;
    const limit = req.query.limit ? Math.max(1, Number(req.query.limit)) : null;
    const single = String(req.query.single || 'false') === 'true';

    const params = [];
    let sql = `SELECT ${columns} FROM ${qIdent(table)}`;
    const where = buildWhere(table, filters, params);
    if (where) sql += ` WHERE ${where}`;
    if (order?.column && TABLES[table].includes(order.column)) sql += ` ORDER BY ${qIdent(order.column)} ${order.ascending === false ? 'DESC' : 'ASC'}`;
    if (limit) sql += ` LIMIT ${limit}`;

    const result = await query(sql, params);
    const data = single ? (result.rows[0] || null) : result.rows;
    res.json({ data });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao consultar dados' });
  }
});

app.post('/api/table/:table', requireAuth, async (req, res) => {
  const table = req.params.table;
  if (!TABLES[table]) return res.status(404).json({ error: 'Tabela não suportada' });
  const values = req.body?.values;
  const rowsToInsert = Array.isArray(values) ? values : [values];
  if (!rowsToInsert.length) return res.status(400).json({ error: 'Nenhum dado informado' });

  // Cada linha do lote precisa passar na checagem de permissão individualmente
  // — validar só a primeira permitiria "contrabandear" linhas não autorizadas
  // (ex.: registros de auditoria em nome de outro usuário) dentro do array.
  for (const row of rowsToInsert) {
    if (!canWriteTable(req.authUser, table, [], row || {})) {
      return res.status(403).json({ error: 'Sem permissão' });
    }
  }

  try {
    const inserted = [];
    for (const row of rowsToInsert) {
      const payload = table === 'profiles' ? restrictProfileFields(req.authUser, row) : row;
      const clean = sanitizePayload(table, payload);
      const keys = Object.keys(clean);
      const params = keys.map((key) => clean[key]);
      const placeholders = keys.map((_, idx) => `$${idx + 1}`).join(', ');
      const sql = `INSERT INTO ${qIdent(table)} (${keys.map(qIdent).join(', ')}) VALUES (${placeholders}) RETURNING *`;
      const result = await query(sql, params);
      inserted.push(result.rows[0]);
    }
    const data = req.body?.single ? inserted[0] : inserted;
    res.json({ data: projectSelection(table, data, req.body?.select || '*') });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao inserir dados' });
  }
});

app.patch('/api/table/:table', requireAuth, async (req, res) => {
  const table = req.params.table;
  if (!TABLES[table]) return res.status(404).json({ error: 'Tabela não suportada' });
  const filters = parseFilters(req.body?.filters);
  if (!canWriteTable(req.authUser, table, filters, req.body?.values || {})) return res.status(403).json({ error: 'Sem permissão' });

  try {
    const payload = table === 'profiles' ? restrictProfileFields(req.authUser, req.body?.values || {}) : (req.body?.values || {});
    const clean = sanitizePayload(table, payload);
    if (!Object.keys(clean).length) return res.status(400).json({ error: 'Nenhum campo válido para atualizar' });
    const params = [];
    const sets = Object.keys(clean).map((key) => {
      params.push(clean[key]);
      return `${qIdent(key)} = $${params.length}`;
    });
    let sql = `UPDATE ${qIdent(table)} SET ${sets.join(', ')}`;
    const where = buildWhere(table, filters, params);
    if (where) sql += ` WHERE ${where}`;
    else return res.status(400).json({ error: 'Filtro obrigatório para atualização' });
    sql += ` RETURNING *`;
    const result = await query(sql, params);
    const data = req.body?.single ? (result.rows[0] || null) : result.rows;
    res.json({ data: projectSelection(table, data, req.body?.select || '*') });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao atualizar dados' });
  }
});

app.delete('/api/table/:table', requireAuth, async (req, res) => {
  const table = req.params.table;
  if (!TABLES[table]) return res.status(404).json({ error: 'Tabela não suportada' });
  const filters = parseFilters(req.body?.filters);
  if (!canWriteTable(req.authUser, table, filters, {})) return res.status(403).json({ error: 'Sem permissão' });

  try {
    const params = [];
    let sql = `DELETE FROM ${qIdent(table)}`;
    const where = buildWhere(table, filters, params);
    if (where) sql += ` WHERE ${where}`;
    else return res.status(400).json({ error: 'Filtro obrigatório para remoção' });
    sql += ` RETURNING *`;
    const result = await query(sql, params);
    const data = req.body?.single ? (result.rows[0] || null) : result.rows;
    res.json({ data });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao remover dados' });
  }
});

function parseFilters(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try { return JSON.parse(String(raw)); } catch { return []; }
}

function qIdent(value) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

function sanitizeColumns(table, select) {
  const allowed = TABLES[table];
  if (!select || select === '*') return '*';
  const cols = String(select).split(',').map((part) => part.trim()).filter(Boolean).filter((col) => allowed.includes(col));
  return cols.length ? cols.map(qIdent).join(', ') : '*';
}

function sanitizePayload(table, payload) {
  const allowed = new Set(TABLES[table]);
  const jsonCols = new Set(JSON_COLUMNS[table] || []);
  const clean = {};

  for (const [key, value] of Object.entries(payload || {})) {
    if (!allowed.has(key)) continue;

    if (jsonCols.has(key)) {
      clean[key] = value === null || value === undefined ? null : JSON.stringify(value);
    } else {
      clean[key] = value;
    }
  }

  return clean;
}

function buildWhere(table, filters, params) {
  const allowed = new Set(TABLES[table] || []);
  const valid = (filters || []).filter((f) => f?.op === 'eq' && f?.field && allowed.has(f.field));
  if (!valid.length) return '';
  return valid.map((filter) => {
    params.push(filter.value);
    return `${qIdent(filter.field)} = $${params.length}`;
  }).join(' AND ');
}

function projectSelection(table, data, select) {
  if (!data || select === '*' || !select) return data;
  const cols = String(select).split(',').map((part) => part.trim()).filter((col) => TABLES[table].includes(col));
  if (!cols.length) return data;
  const pick = (row) => Object.fromEntries(cols.map((col) => [col, row?.[col]]));
  return Array.isArray(data) ? data.map(pick) : pick(data);
}

await initDb();
await ensureInitialAdmin();

app.listen(PORT, () => {
  console.log(`DBLAPOGE local API listening on port ${PORT}`);
});
