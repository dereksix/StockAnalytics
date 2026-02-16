import Papa from 'papaparse';

interface FidelityRow {
  'Account Name/Number'?: string;
  'Symbol'?: string;
  'Description'?: string;
  'Quantity'?: string;
  'Last Price'?: string;
  'Last Price Change'?: string;
  'Current Value'?: string;
  'Today\'s Gain/Loss Dollar'?: string;
  'Today\'s Gain/Loss Percent'?: string;
  'Total Gain/Loss Dollar'?: string;
  'Total Gain/Loss Percent'?: string;
  'Percent Of Account'?: string;
  'Cost Basis Per Share'?: string;
  'Cost Basis Total'?: string;
  'Average Cost Basis'?: string;
  'Type'?: string;
  [key: string]: string | undefined;
}

interface SnowballRow {
  'Holding'?: string;
  "Holdings' name"?: string;
  'Shares'?: string;
  'Currency'?: string;
  'Cost basis'?: string;
  'Current value'?: string;
  'Share price'?: string;
  'Country'?: string;
  'Sector'?: string;
  'Portfolios'?: string;
  [key: string]: string | undefined;
}

export interface ParsedHolding {
  symbol: string;
  description: string;
  quantity: number;
  costBasis: number;
  totalCostBasis: number;
  currentPrice: number;
  marketValue: number;
  gainLoss: number;
  gainLossPercent: number;
  accountType: string;
}

function cleanDollar(val: string | undefined): number {
  if (!val) return 0;
  const cleaned = val.replace(/[$,\s]/g, '').replace(/[()]/g, (m) => m === '(' ? '-' : '');
  // Handle negative values wrapped in parens like ($123.45)
  const str = cleaned.replace(/^-(.+)-$/, '-$1');
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

function cleanPercent(val: string | undefined): number {
  if (!val) return 0;
  const cleaned = val.replace(/[%,\s]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function cleanQuantity(val: string | undefined): number {
  if (!val) return 0;
  const cleaned = val.replace(/[,\s]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function detectFormat(csvContent: string): 'fidelity' | 'snowball' {
  const firstLine = csvContent.split('\n')[0] || '';
  if (firstLine.includes('Holding') && firstLine.includes("Holdings' name") && firstLine.includes('Share price')) {
    return 'snowball';
  }
  return 'fidelity';
}

/**
 * Auto-detects CSV format (Fidelity or Snowball) and parses accordingly.
 */
export function parseFidelityCSV(csvContent: string): ParsedHolding[] {
  // Strip BOM that many apps (Excel, Snowball) prepend
  const clean = csvContent.replace(/^\uFEFF/, '');
  const format = detectFormat(clean);
  if (format === 'snowball') {
    return parseSnowballCSV(clean);
  }
  return parseFidelityFormat(clean);
}

function parseSnowballCSV(csvContent: string): ParsedHolding[] {
  // Snowball has duplicate "Capital gain" and "Total profit" columns (dollar then percent).
  // Papa auto-renames the second occurrence to "Capital gain_1", "Total profit_1".
  const result = Papa.parse<SnowballRow>(csvContent, {
    header: true,
    skipEmptyLines: true,
  });

  const holdings: ParsedHolding[] = [];

  for (const row of result.data) {
    const symbol = (row['Holding'] || '').trim();
    if (!symbol) continue;

    const quantity = cleanQuantity(row['Shares']);
    if (quantity <= 0) continue;

    const currentPrice = cleanDollar(row['Share price']);
    const marketValue = cleanDollar(row['Current value']);
    const totalCostBasis = cleanDollar(row['Cost basis']);
    const costBasisPerShare = quantity > 0 ? totalCostBasis / quantity : 0;

    // Papa renames duplicate columns: "Capital gain" (dollar), "Capital gain_1" (percent)
    const gainLoss = cleanDollar(row['Capital gain']);
    const gainLossPercent = cleanDollar(row['Capital gain_1']);

    // Account type from Portfolios column
    const portfolios = (row['Portfolios'] || '').trim();

    holdings.push({
      symbol,
      description: (row["Holdings' name"] || '').trim(),
      quantity,
      costBasis: costBasisPerShare,
      totalCostBasis: totalCostBasis || (costBasisPerShare * quantity),
      currentPrice,
      marketValue: marketValue || (currentPrice * quantity),
      gainLoss,
      gainLossPercent,
      accountType: extractAccountType(portfolios),
    });
  }

  return holdings;
}

function parseFidelityFormat(csvContent: string): ParsedHolding[] {
  // Fidelity CSVs sometimes have extra header lines before the actual data.
  // Find the line that starts with "Account Name" or contains the expected headers.
  const lines = csvContent.split('\n');
  let headerLineIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('Account Name') || line.startsWith('"Account Name')) {
      headerLineIndex = i;
      break;
    }
  }

  // Take content from the header line onward
  const cleanedCSV = lines.slice(headerLineIndex).join('\n');

  const result = Papa.parse<FidelityRow>(cleanedCSV, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header: string) => header.trim(),
  });

  const holdings: ParsedHolding[] = [];
  let currentAccount = '';

  for (const row of result.data) {
    // Track account type from the Account column
    const accountField = row['Account Name/Number'] || row['Account Name'] || '';
    if (accountField) {
      currentAccount = accountField.trim();
    }

    const symbol = (row['Symbol'] || '').trim();

    // Skip non-stock rows
    if (!symbol || symbol === '' || symbol === 'Symbol') continue;
    // Skip "Pending Activity" or footer rows
    if (symbol.includes('Pending') || symbol.includes('Total')) continue;
    // Skip cash positions (SPAXX, FCASH, etc.)
    if (symbol === 'SPAXX' || symbol === 'FCASH' || symbol.startsWith('SPAXX')) continue;
    // Skip rows with no quantity
    const quantity = cleanQuantity(row['Quantity']);
    if (quantity <= 0) continue;

    const costBasisPerShare = cleanDollar(row['Cost Basis Per Share'] || row['Average Cost Basis']);
    const totalCostBasis = cleanDollar(row['Cost Basis Total']);
    const currentPrice = cleanDollar(row['Last Price']);
    const marketValue = cleanDollar(row['Current Value']);
    const gainLoss = cleanDollar(row['Total Gain/Loss Dollar']);
    const gainLossPercent = cleanPercent(row['Total Gain/Loss Percent']);

    holdings.push({
      symbol,
      description: (row['Description'] || '').trim(),
      quantity,
      costBasis: costBasisPerShare || (totalCostBasis / quantity) || 0,
      totalCostBasis: totalCostBasis || (costBasisPerShare * quantity) || 0,
      currentPrice,
      marketValue: marketValue || (currentPrice * quantity),
      gainLoss,
      gainLossPercent,
      accountType: extractAccountType(currentAccount),
    });
  }

  return holdings;
}

function extractAccountType(accountStr: string): string {
  const lower = accountStr.toLowerCase();
  if (lower.includes('roth ira')) return 'Roth IRA';
  if (lower.includes('traditional ira') || lower.includes('rollover ira')) return 'Traditional IRA';
  if (lower.includes('rollover')) return 'Traditional IRA';
  if (lower.includes('401k') || lower.includes('401(k)')) return '401(k)';
  if (lower.includes('individual') || lower.includes('brokerage')) return 'Individual';
  if (lower.includes('hsa')) return 'HSA';
  if (lower.includes('529')) return '529';
  if (lower.includes('tiaa') || lower.includes('combined')) return 'TIAA';
  if (lower.includes('ira')) return 'IRA';
  if (accountStr.trim()) return accountStr.trim();
  return 'Unknown';
}
