import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Transaction, Budget, InvestmentGoal } from '../types';

interface SettingsData {
  id: string;
  tags: string[];
  names: string[]; // Person names
  initialized?: boolean;
}

interface TransactionDB extends DBSchema {
  transactions: {
    key: string;
    value: Transaction;
    indexes: { 'by-date': string };
  };
  settings: {
    key: string;
    value: SettingsData;
  };
  budgets: {
    key: string;
    value: Budget;
    indexes: { 'by-type': string; 'by-month': string; 'by-tags': string };
  };
  investment_goals: {
    key: string;
    value: InvestmentGoal;
    indexes: { 'by-tags': string };
  };
}

const DB_NAME = 'transaction-db';
const DB_VERSION = 2;
const STORE_NAME = 'transactions';
const SETTINGS_STORE = 'settings';
const BUDGETS_STORE = 'budgets';
const INVESTMENT_GOALS_STORE = 'investment_goals';

let dbPromise: Promise<IDBPDatabase<TransactionDB>>;

export const initDB = () => {
  if (!dbPromise) {
    dbPromise = openDB<TransactionDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Create transactions store
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('by-date', 'occurredAt');
        }
        // Create settings store
        if (!db.objectStoreNames.contains(SETTINGS_STORE)) {
          db.createObjectStore(SETTINGS_STORE, { keyPath: 'id' });
        }
        // Create budgets store
        if (!db.objectStoreNames.contains(BUDGETS_STORE)) {
          const budgetStore = db.createObjectStore(BUDGETS_STORE, { keyPath: 'id' });
          budgetStore.createIndex('by-type', 'type');
          budgetStore.createIndex('by-month', 'month');
          budgetStore.createIndex('by-tags', 'tags', { multiEntry: true });
        }
        // Create investment goals store
        if (!db.objectStoreNames.contains(INVESTMENT_GOALS_STORE)) {
          const goalsStore = db.createObjectStore(INVESTMENT_GOALS_STORE, { keyPath: 'id' });
          goalsStore.createIndex('by-tags', 'tags', { multiEntry: true });
        }
      },
    });
  }
  return dbPromise;
};

// Transaction operations
export const getAllTransactions = async (): Promise<Transaction[]> => {
  const db = await initDB();
  return db.getAllFromIndex(STORE_NAME, 'by-date');
};

export const addTransaction = async (transaction: Transaction): Promise<void> => {
  const db = await initDB();
  await db.put(STORE_NAME, transaction);
};

export const deleteTransaction = async (id: string): Promise<void> => {
  const db = await initDB();
  await db.delete(STORE_NAME, id);
};

export const clearAllTransactions = async (): Promise<void> => {
  const db = await initDB();
  await db.clear(STORE_NAME);
};

// Settings operations
export const getSettings = async (): Promise<{ tags: string[]; names: string[] }> => {
  const db = await initDB();
  const settings = await db.get(SETTINGS_STORE, 'user-settings');
  if (!settings) return { tags: [], names: [] };
  return { tags: settings.tags, names: settings.names };
};

export const saveSettings = async (tags: string[], names: string[]): Promise<void> => {
  const db = await initDB();
  await db.put(SETTINGS_STORE, { id: 'user-settings', tags, names });
};

// Budget operations
export const getBudgets = async (month?: string): Promise<Budget[]> => {
  const db = await initDB();
  const allBudgets = await db.getAll(BUDGETS_STORE);
  
  if (month) {
    // Filter for monthly budgets in the specified month
    return allBudgets.filter(b => 
      b.type === 'monthly' && b.month === month
    );
  }
  return allBudgets;
};

export const getBudgetById = async (id: string): Promise<Budget | undefined> => {
  const db = await initDB();
  return db.get(BUDGETS_STORE, id);
};

export const getBudgetsByTags = async (tags: string[]): Promise<Budget[]> => {
  const db = await initDB();
  const allBudgets = await db.getAll(BUDGETS_STORE);
  
  // Return budgets that have any of the specified tags
  return allBudgets.filter(b => 
    b.tags.some(tag => tags.includes(tag))
  );
};

export const getCustomRangeBudgets = async (startDate: string, endDate: string): Promise<Budget[]> => {
  const db = await initDB();
  const allBudgets = await db.getAll(BUDGETS_STORE);
  
  return allBudgets.filter(b => {
    if (b.type !== 'custom' || !b.startDate || !b.endDate) return false;
    // Check if the custom range overlaps with the specified range
    return b.startDate <= endDate && b.endDate >= startDate;
  });
};

export const saveBudget = async (budget: Budget): Promise<void> => {
  const db = await initDB();
  await db.put(BUDGETS_STORE, budget);
};

export const deleteBudget = async (id: string): Promise<void> => {
  const db = await initDB();
  await db.delete(BUDGETS_STORE, id);
};

export const clearAllBudgets = async (): Promise<void> => {
  const db = await initDB();
  await db.clear(BUDGETS_STORE);
};

export const getAllBudgets = async (): Promise<Budget[]> => {
  const db = await initDB();
  return db.getAll(BUDGETS_STORE);
};

// Investment Goal operations
export const getInvestmentGoals = async (): Promise<InvestmentGoal[]> => {
  const db = await initDB();
  return db.getAll(INVESTMENT_GOALS_STORE);
};

export const getInvestmentGoalById = async (id: string): Promise<InvestmentGoal | undefined> => {
  const db = await initDB();
  return db.get(INVESTMENT_GOALS_STORE, id);
};

export const getInvestmentGoalsByTags = async (tags: string[]): Promise<InvestmentGoal[]> => {
  const db = await initDB();
  const allGoals = await db.getAll(INVESTMENT_GOALS_STORE);
  
  return allGoals.filter(goal => 
    goal.tags.some(tag => tags.includes(tag))
  );
};

export const saveInvestmentGoal = async (goal: InvestmentGoal): Promise<void> => {
  const db = await initDB();
  await db.put(INVESTMENT_GOALS_STORE, goal);
};

export const deleteInvestmentGoal = async (id: string): Promise<void> => {
  const db = await initDB();
  await db.delete(INVESTMENT_GOALS_STORE, id);
};

export const clearAllInvestmentGoals = async (): Promise<void> => {
  const db = await initDB();
  await db.clear(INVESTMENT_GOALS_STORE);
};

export const getAllInvestmentGoals = async (): Promise<InvestmentGoal[]> => {
  const db = await initDB();
  return db.getAll(INVESTMENT_GOALS_STORE);
};

// Clear all settings
export const clearAllSettings = async (): Promise<void> => {
  const db = await initDB();
  await db.clear(SETTINGS_STORE);
};

// Backup and Restore Operations
export interface BackupData {
  version: number;
  exportedAt: string;
  transactions: Transaction[];
  settings: { tags: string[]; names: string[] };
  budgets: Budget[];
  investmentGoals: InvestmentGoal[];
}

export const createBackup = async (): Promise<BackupData> => {
  const transactions = await getAllTransactions();
  const settings = await getSettings();
  const budgets = await getAllBudgets();
  const investmentGoals = await getAllInvestmentGoals();
  
  return {
    version: 2,
    exportedAt: new Date().toISOString(),
    transactions,
    settings,
    budgets,
    investmentGoals
  };
};

export const restoreFromBackup = async (data: BackupData, mode: 'merge' | 'replace'): Promise<void> => {
  const db = await initDB();
  
  if (mode === 'replace') {
    // Clear existing data
    await db.clear(STORE_NAME);
    await db.clear(SETTINGS_STORE);
    await db.clear(BUDGETS_STORE);
    await db.clear(INVESTMENT_GOALS_STORE);
  }
  
  // Restore settings (always replace to keep backup settings)
  await db.put(SETTINGS_STORE, { id: 'user-settings', ...data.settings, initialized: true });
  
  // Restore budgets
  for (const budget of data.budgets) {
    await db.put(BUDGETS_STORE, budget);
  }
  
  // Restore investment goals
  if (data.investmentGoals) {
    for (const goal of data.investmentGoals) {
      await db.put(INVESTMENT_GOALS_STORE, goal);
    }
  }
  
  // Restore transactions
  for (const transaction of data.transactions) {
    if (mode === 'merge') {
      // Check if transaction exists
      const existing = await db.get(STORE_NAME, transaction.id);
      if (existing) {
        // Skip if already exists
        continue;
      }
    }
    await db.put(STORE_NAME, transaction);
  }
};
