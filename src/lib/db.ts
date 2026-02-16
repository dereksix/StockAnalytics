import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'stockanalytics.db');

let db: SqlJsDatabase | null = null;
let initPromise: Promise<SqlJsDatabase> | null = null;

async function initDb(): Promise<SqlJsDatabase> {
  const SQL = await initSqlJs();

  // Ensure data directory exists
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Load existing database or create new one
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  initSchema(db);
  return db;
}

export async function getDb(): Promise<SqlJsDatabase> {
  if (db) return db;
  if (!initPromise) {
    initPromise = initDb();
  }
  return initPromise;
}

function saveDb() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  }
}

function initSchema(db: SqlJsDatabase) {
  db.run(`
    CREATE TABLE IF NOT EXISTS holdings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      symbol TEXT NOT NULL,
      description TEXT,
      quantity REAL NOT NULL,
      cost_basis REAL,
      total_cost_basis REAL,
      current_price REAL,
      market_value REAL,
      gain_loss REAL,
      gain_loss_percent REAL,
      sector TEXT DEFAULT '',
      industry TEXT DEFAULT '',
      account_type TEXT DEFAULT '',
      last_updated TEXT,
      UNIQUE(symbol, account_type)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS market_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      symbol TEXT NOT NULL,
      date TEXT NOT NULL,
      open REAL,
      high REAL,
      low REAL,
      close REAL,
      volume INTEGER,
      UNIQUE(symbol, date)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS analysis_cache (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      symbol TEXT NOT NULL UNIQUE,
      technical_signals TEXT,
      risk_metrics TEXT,
      momentum_score TEXT,
      last_updated TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS briefings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      generated_at TEXT NOT NULL,
      content TEXT NOT NULL,
      action_items TEXT,
      portfolio_snapshot TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS chat_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  saveDb();
}

// Helper to run a query and get results as objects
function queryAll(db: SqlJsDatabase, sql: string, params: unknown[] = []): Record<string, unknown>[] {
  const stmt = db.prepare(sql);
  if (params.length > 0) stmt.bind(params);
  const results: Record<string, unknown>[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject() as Record<string, unknown>);
  }
  stmt.free();
  return results;
}

function queryOne(db: SqlJsDatabase, sql: string, params: unknown[] = []): Record<string, unknown> | undefined {
  const results = queryAll(db, sql, params);
  return results[0];
}

export async function upsertHolding(holding: {
  symbol: string;
  description: string;
  quantity: number;
  costBasis: number;
  totalCostBasis: number;
  currentPrice: number;
  marketValue: number;
  gainLoss: number;
  gainLossPercent: number;
  sector: string;
  industry: string;
  accountType: string;
}) {
  const database = await getDb();

  // Check if exists
  const existing = queryOne(database,
    'SELECT id FROM holdings WHERE symbol = ? AND account_type = ?',
    [holding.symbol, holding.accountType]
  );

  if (existing) {
    database.run(
      `UPDATE holdings SET description = ?, quantity = ?, cost_basis = ?, total_cost_basis = ?,
       current_price = ?, market_value = ?, gain_loss = ?, gain_loss_percent = ?,
       sector = ?, industry = ?, last_updated = datetime('now')
       WHERE symbol = ? AND account_type = ?`,
      [holding.description, holding.quantity, holding.costBasis, holding.totalCostBasis,
       holding.currentPrice, holding.marketValue, holding.gainLoss, holding.gainLossPercent,
       holding.sector, holding.industry, holding.symbol, holding.accountType]
    );
  } else {
    database.run(
      `INSERT INTO holdings (symbol, description, quantity, cost_basis, total_cost_basis,
       current_price, market_value, gain_loss, gain_loss_percent, sector, industry,
       account_type, last_updated)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [holding.symbol, holding.description, holding.quantity, holding.costBasis,
       holding.totalCostBasis, holding.currentPrice, holding.marketValue, holding.gainLoss,
       holding.gainLossPercent, holding.sector, holding.industry, holding.accountType]
    );
  }

  saveDb();
}

export async function getAllHoldings() {
  const database = await getDb();
  return queryAll(database, 'SELECT * FROM holdings ORDER BY market_value DESC');
}

export async function getHoldingBySymbol(symbol: string) {
  const database = await getDb();
  return queryAll(database, 'SELECT * FROM holdings WHERE symbol = ?', [symbol]);
}

export async function upsertMarketData(symbol: string, data: { date: string; open: number; high: number; low: number; close: number; volume: number }[]) {
  const database = await getDb();
  for (const row of data) {
    const existing = queryOne(database,
      'SELECT id FROM market_data WHERE symbol = ? AND date = ?',
      [symbol, row.date]
    );
    if (existing) {
      database.run(
        'UPDATE market_data SET open = ?, high = ?, low = ?, close = ?, volume = ? WHERE symbol = ? AND date = ?',
        [row.open, row.high, row.low, row.close, row.volume, symbol, row.date]
      );
    } else {
      database.run(
        'INSERT INTO market_data (symbol, date, open, high, low, close, volume) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [symbol, row.date, row.open, row.high, row.low, row.close, row.volume]
      );
    }
  }
  saveDb();
}

export async function getMarketData(symbol: string, limit = 365) {
  const database = await getDb();
  return queryAll(database,
    'SELECT * FROM market_data WHERE symbol = ? ORDER BY date DESC LIMIT ?',
    [symbol, limit]
  );
}

export async function upsertAnalysisCache(symbol: string, technicals: object, risk: object, momentum: object) {
  const database = await getDb();
  const existing = queryOne(database, 'SELECT id FROM analysis_cache WHERE symbol = ?', [symbol]);
  if (existing) {
    database.run(
      `UPDATE analysis_cache SET technical_signals = ?, risk_metrics = ?, momentum_score = ?,
       last_updated = datetime('now') WHERE symbol = ?`,
      [JSON.stringify(technicals), JSON.stringify(risk), JSON.stringify(momentum), symbol]
    );
  } else {
    database.run(
      `INSERT INTO analysis_cache (symbol, technical_signals, risk_metrics, momentum_score, last_updated)
       VALUES (?, ?, ?, ?, datetime('now'))`,
      [symbol, JSON.stringify(technicals), JSON.stringify(risk), JSON.stringify(momentum)]
    );
  }
  saveDb();
}

export async function getAnalysisCache(symbol: string) {
  const database = await getDb();
  const row = queryOne(database, 'SELECT * FROM analysis_cache WHERE symbol = ?', [symbol]);
  if (!row) return null;
  return {
    technicals: JSON.parse(row.technical_signals as string),
    risk: JSON.parse(row.risk_metrics as string),
    momentum: JSON.parse(row.momentum_score as string),
    lastUpdated: row.last_updated as string,
  };
}

export async function saveBriefing(content: string, actionItems: object[], portfolioSnapshot: object) {
  const database = await getDb();
  database.run(
    `INSERT INTO briefings (generated_at, content, action_items, portfolio_snapshot)
     VALUES (datetime('now'), ?, ?, ?)`,
    [content, JSON.stringify(actionItems), JSON.stringify(portfolioSnapshot)]
  );
  saveDb();
}

export async function getLatestBriefing() {
  const database = await getDb();
  return queryOne(database, 'SELECT * FROM briefings ORDER BY generated_at DESC LIMIT 1') as {
    id: number;
    generated_at: string;
    content: string;
    action_items: string;
    portfolio_snapshot: string;
  } | undefined;
}

export async function saveChatMessage(role: string, content: string) {
  const database = await getDb();
  database.run('INSERT INTO chat_history (role, content) VALUES (?, ?)', [role, content]);
  saveDb();
}

export async function getChatHistory(limit = 20) {
  const database = await getDb();
  return queryAll(database,
    'SELECT * FROM chat_history ORDER BY created_at DESC LIMIT ?',
    [limit]
  ).reverse();
}

export async function clearHoldings() {
  const database = await getDb();
  database.run('DELETE FROM holdings');
  saveDb();
}
