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
  runMigrations(db);
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

  db.run(`
    CREATE TABLE IF NOT EXISTS portfolio_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      total_value REAL NOT NULL,
      total_cost REAL NOT NULL,
      snapshot_data TEXT,
      UNIQUE(date)
    )
  `);

  saveDb();
}

// Column names that should exist on the holdings table after migrations
const EXTENDED_COLUMNS = [
  'country', 'currency', 'pe_ratio', 'eps', 'beta', 'expense_ratio',
  'dividend_yield', 'dividend_yield_on_cost', 'dividends_per_share', 'dividends_received',
  'dividend_growth_5y', 'next_payment_date', 'next_payment_amount', 'ex_dividend_date',
  'daily_change_dollar', 'daily_change_percent', 'irr', 'realized_pnl',
  'total_profit', 'total_profit_percent', 'tax',
  'portfolio_share_percent', 'target_share_percent', 'category', 'isin', 'asset_type',
];

function runMigrations(db: SqlJsDatabase) {
  // Get existing column names
  const cols = db.exec('PRAGMA table_info(holdings)');
  const existingCols = new Set<string>();
  if (cols.length > 0) {
    for (const row of cols[0].values) {
      existingCols.add(row[1] as string);
    }
  }

  // Add any missing columns
  for (const col of EXTENDED_COLUMNS) {
    if (!existingCols.has(col)) {
      const colType = ['country', 'currency', 'next_payment_date', 'ex_dividend_date', 'category', 'isin', 'asset_type'].includes(col)
        ? 'TEXT DEFAULT \'\''
        : 'REAL DEFAULT 0';
      try {
        db.run(`ALTER TABLE holdings ADD COLUMN ${col} ${colType}`);
      } catch {
        // Column already exists or other non-fatal error
      }
    }
  }

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

export interface UpsertHoldingData {
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
  _enrichOnly?: boolean;
  // Extended Snowball fields
  country?: string;
  currency?: string;
  peRatio?: number;
  eps?: number;
  beta?: number;
  expenseRatio?: number;
  dividendYield?: number;
  dividendYieldOnCost?: number;
  dividendsPerShare?: number;
  dividendsReceived?: number;
  dividendGrowth5y?: number;
  nextPaymentDate?: string;
  nextPaymentAmount?: number;
  exDividendDate?: string;
  dailyChangeDollar?: number;
  dailyChangePercent?: number;
  irr?: number;
  realizedPnl?: number;
  totalProfit?: number;
  totalProfitPercent?: number;
  tax?: number;
  portfolioSharePercent?: number;
  targetSharePercent?: number;
  category?: string;
  isin?: string;
  assetType?: string;
}

export async function upsertHolding(holding: UpsertHoldingData) {
  const database = await getDb();

  // Enrich-only mode: update live price + sector/industry on all rows for this symbol
  if (holding._enrichOnly) {
    database.run(
      `UPDATE holdings SET
       current_price = CASE WHEN ? > 0 THEN ? ELSE current_price END,
       market_value = CASE WHEN ? > 0 THEN ? * quantity ELSE market_value END,
       gain_loss = CASE WHEN ? > 0 THEN (? * quantity) - total_cost_basis ELSE gain_loss END,
       gain_loss_percent = CASE WHEN ? > 0 AND total_cost_basis > 0
         THEN ((? * quantity) - total_cost_basis) / total_cost_basis * 100 ELSE gain_loss_percent END,
       sector = CASE WHEN ? != '' THEN ? ELSE sector END,
       industry = CASE WHEN ? != '' THEN ? ELSE industry END,
       last_updated = datetime('now')
       WHERE symbol = ?`,
      [
        holding.currentPrice, holding.currentPrice,
        holding.currentPrice, holding.currentPrice,
        holding.currentPrice, holding.currentPrice,
        holding.currentPrice, holding.currentPrice,
        holding.sector, holding.sector,
        holding.industry, holding.industry,
        holding.symbol,
      ]
    );
    saveDb();
    return;
  }

  // Check if exists
  const existing = queryOne(database,
    'SELECT id FROM holdings WHERE symbol = ? AND account_type = ?',
    [holding.symbol, holding.accountType]
  );

  if (existing) {
    database.run(
      `UPDATE holdings SET description = ?, quantity = ?, cost_basis = ?, total_cost_basis = ?,
       current_price = ?, market_value = ?, gain_loss = ?, gain_loss_percent = ?,
       sector = ?, industry = ?,
       country = ?, currency = ?, pe_ratio = ?, eps = ?, beta = ?, expense_ratio = ?,
       dividend_yield = ?, dividend_yield_on_cost = ?, dividends_per_share = ?, dividends_received = ?,
       dividend_growth_5y = ?, next_payment_date = ?, next_payment_amount = ?, ex_dividend_date = ?,
       daily_change_dollar = ?, daily_change_percent = ?, irr = ?, realized_pnl = ?,
       total_profit = ?, total_profit_percent = ?, tax = ?,
       portfolio_share_percent = ?, target_share_percent = ?, category = ?, isin = ?, asset_type = ?,
       last_updated = datetime('now')
       WHERE symbol = ? AND account_type = ?`,
      [holding.description, holding.quantity, holding.costBasis, holding.totalCostBasis,
       holding.currentPrice, holding.marketValue, holding.gainLoss, holding.gainLossPercent,
       holding.sector, holding.industry,
       holding.country || '', holding.currency || '', holding.peRatio || 0, holding.eps || 0,
       holding.beta || 0, holding.expenseRatio || 0,
       holding.dividendYield || 0, holding.dividendYieldOnCost || 0,
       holding.dividendsPerShare || 0, holding.dividendsReceived || 0,
       holding.dividendGrowth5y || 0, holding.nextPaymentDate || '', holding.nextPaymentAmount || 0,
       holding.exDividendDate || '',
       holding.dailyChangeDollar || 0, holding.dailyChangePercent || 0,
       holding.irr || 0, holding.realizedPnl || 0,
       holding.totalProfit || 0, holding.totalProfitPercent || 0, holding.tax || 0,
       holding.portfolioSharePercent || 0, holding.targetSharePercent || 0,
       holding.category || '', holding.isin || '', holding.assetType || '',
       holding.symbol, holding.accountType]
    );
  } else {
    database.run(
      `INSERT INTO holdings (symbol, description, quantity, cost_basis, total_cost_basis,
       current_price, market_value, gain_loss, gain_loss_percent, sector, industry,
       account_type, country, currency, pe_ratio, eps, beta, expense_ratio,
       dividend_yield, dividend_yield_on_cost, dividends_per_share, dividends_received,
       dividend_growth_5y, next_payment_date, next_payment_amount, ex_dividend_date,
       daily_change_dollar, daily_change_percent, irr, realized_pnl,
       total_profit, total_profit_percent, tax,
       portfolio_share_percent, target_share_percent, category, isin, asset_type,
       last_updated)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [holding.symbol, holding.description, holding.quantity, holding.costBasis,
       holding.totalCostBasis, holding.currentPrice, holding.marketValue, holding.gainLoss,
       holding.gainLossPercent, holding.sector, holding.industry, holding.accountType,
       holding.country || '', holding.currency || '', holding.peRatio || 0, holding.eps || 0,
       holding.beta || 0, holding.expenseRatio || 0,
       holding.dividendYield || 0, holding.dividendYieldOnCost || 0,
       holding.dividendsPerShare || 0, holding.dividendsReceived || 0,
       holding.dividendGrowth5y || 0, holding.nextPaymentDate || '', holding.nextPaymentAmount || 0,
       holding.exDividendDate || '',
       holding.dailyChangeDollar || 0, holding.dailyChangePercent || 0,
       holding.irr || 0, holding.realizedPnl || 0,
       holding.totalProfit || 0, holding.totalProfitPercent || 0, holding.tax || 0,
       holding.portfolioSharePercent || 0, holding.targetSharePercent || 0,
       holding.category || '', holding.isin || '', holding.assetType || '']
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

export async function savePortfolioSnapshot(totalValue: number, totalCost: number, holdingsData: object) {
  const database = await getDb();
  const today = new Date().toISOString().split('T')[0];
  const existing = queryOne(database, 'SELECT id FROM portfolio_snapshots WHERE date = ?', [today]);
  if (existing) {
    database.run(
      'UPDATE portfolio_snapshots SET total_value = ?, total_cost = ?, snapshot_data = ? WHERE date = ?',
      [totalValue, totalCost, JSON.stringify(holdingsData), today]
    );
  } else {
    database.run(
      'INSERT INTO portfolio_snapshots (date, total_value, total_cost, snapshot_data) VALUES (?, ?, ?, ?)',
      [today, totalValue, totalCost, JSON.stringify(holdingsData)]
    );
  }
  saveDb();
}

export async function getPortfolioSnapshots(limit = 365) {
  const database = await getDb();
  return queryAll(database,
    'SELECT * FROM portfolio_snapshots ORDER BY date DESC LIMIT ?',
    [limit]
  );
}
