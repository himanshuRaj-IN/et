export interface Transaction {
  id: string;
  occurredAt: string;
  amount: number;  // Integer (in rupees, no decimals)
  type: 'income' | 'expense';
  name: string;
  person: string;
  tag: string;
}

// Category types for budgeting
export type BudgetCategory = 'needs' | 'wants' | 'investment';

// Tag to category mapping configuration
export interface TagCategoryMapping {
  tag: string;
  category: BudgetCategory;
}

// Enhanced Budget interface with support for multiple tags, custom date ranges, and investment goals
export interface Budget {
  id: string;
  name: string;  // User-defined name for the budget
  amount: number;  // Budget limit in rupees
  tags: string[];  // Multiple tags this budget applies to
  category: BudgetCategory;  // Category: needs, wants, or investment
  type: 'monthly' | 'custom';  // Budget type
  startDate?: string;  // For custom date range budgets (YYYY-MM-DD)
  endDate?: string;    // For custom date range budgets (YYYY-MM-DD)
  month?: string;      // For monthly budgets (YYYY-MM)
  createdAt: string;
  color?: string;  // Optional color for visual distinction
}

// Investment Goal interface
export interface InvestmentGoal {
  id: string;
  name: string;
  targetAmount: number;  // Target amount to invest
  currentAmount: number;  // Current invested amount
  tags: string[];  // Tags to track (e.g., 'Investment', 'SIP', 'Mutual Fund')
  monthlyTarget?: number;  // Optional monthly investment target
  deadline?: string;  // Target date (YYYY-MM-DD)
  createdAt: string;
  color?: string;
}

// Legacy Budget interface for backward compatibility
export interface LegacyBudget {
  id: string;
  category: string;
  amount: number;
  month: string;
}

export const TRANSACTION_STORE = 'transactions';
export const DB_NAME = 'transaction-db';
export const DB_VERSION = 2;
