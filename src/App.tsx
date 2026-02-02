import { useEffect, useState, useMemo } from 'react';
import { Moon, Sun, Settings, LayoutDashboard, CreditCard, Plus, Users } from 'lucide-react';
import { TransactionList } from './components/TransactionList';
import { TransactionForm } from './components/TransactionForm';
import { Dashboard } from './components/Dashboard';
import { PeopleLedger } from './components/PeopleLedger';
import { SettingsModal } from './components/SettingsModal';
import { GroupTransactionModal } from './components/GroupTransactionModal';
import { DeleteConfirmationModal } from './components/DeleteConfirmationModal';
import { getAllTransactions, deleteTransaction, getSettings, saveSettings } from './services/db';
import type { Transaction } from './types';

type ViewType = 'dashboard' | 'transactions' | 'people';

function App() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState({ tags: [] as string[], names: [] as string[] });
  const [formOpen, setFormOpen] = useState(false);
  const [groupFormOpen, setGroupFormOpen] = useState(false);

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // Filters state (for transactions view)
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedPersons, setSelectedPersons] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });
const [showFilters, setShowFilters] = useState(false);

// Settlement total from PeopleLedger transactions (calculated once)
  const settlementTotal = useMemo(() => {
    const peopleTransactions = transactions.filter(t => t.person !== 'Myself');
    
    const totalOwed = peopleTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const totalOwing = peopleTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    
    return totalOwed - totalOwing;
  }, [transactions]);

  // Theme toggle effect
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  // Initial data load
  useEffect(() => {
    loadTransactions();
    loadSettings();
  }, []);

  const loadTransactions = async () => {
    try {
      const data = await getAllTransactions();
      setTransactions(data.sort((a, b) => 
        new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
      ));
    } catch (error) {
      console.error('Failed to load transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    const savedSettings = await getSettings();
    if (savedSettings.tags.length === 0 && savedSettings.names.length === 0) {
      // Initialize with default tags and names
      const defaultTags = ['Food & Drink', 'Transport', 'Utilities', 'Entertainment', 'Shopping', 'Salary', 'Side Hustle', 'Rent', 'Education', 'Health', 'Gifts', 'Owe', 'Borrowed', 'Investment'];
      const defaultNames = ['Myself', 'John Doe', 'Jane Smith', 'Employer', 'Netflix', 'MSEB', 'Jio', 'HP Gas', 'PVR Cinemas', 'Big Basket', 'Myntra', 'Client ABC', 'Landlord', 'Coursera', 'Medical Store'];
      await saveSettings(defaultTags, defaultNames);
      setSettings({ tags: defaultTags, names: defaultNames });
    } else {
      setSettings(savedSettings);
    }
  };

  const handleSaveSettings = async (tags: string[], names: string[]) => {
    await saveSettings(tags, names);
    setSettings({ tags, names });
  };

  const handleEditClick = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setFormOpen(true);
  };

  const handleDeleteClick = (transaction: Transaction) => {
    setTransactionToDelete(transaction);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!transactionToDelete) return;
    await deleteTransaction(transactionToDelete.id);
    await loadTransactions();
    setDeleteModalOpen(false);
    setTransactionToDelete(null);
  };

  const handleFormSuccess = async () => {
    await loadTransactions();
  };

  // Get all unique tags from settings (for filtering)
  const allTags = useMemo(() => {
    return settings.tags.sort();
  }, [settings.tags]);

  // Get all unique persons from settings (for filtering)
  const allPersons = useMemo(() => {
    return settings.names.sort();
  }, [settings.names]);

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      // Search query
      if (searchQuery && !t.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }

      // Type filter
      if (typeFilter !== 'all' && t.type !== typeFilter) {
        return false;
      }

      // Tags filter
      if (selectedTags.length > 0 && !selectedTags.includes(t.tag)) {
        return false;
      }

      // Persons filter
      if (selectedPersons.length > 0 && !selectedPersons.includes(t.person)) {
        return false;
      }

      // Date range filter
      if (dateRange.start) {
        const transactionDate = new Date(t.occurredAt);
        const startDate = new Date(dateRange.start);
        if (transactionDate < startDate) return false;
      }
      if (dateRange.end) {
        const transactionDate = new Date(t.occurredAt);
        const endDate = new Date(dateRange.end);
        endDate.setHours(23, 59, 59, 999);
        if (transactionDate > endDate) return false;
      }

      return true;
    });
  }, [transactions, searchQuery, typeFilter, selectedTags, selectedPersons, dateRange]);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const togglePerson = (person: string) => {
    setSelectedPersons(prev => 
      prev.includes(person) 
        ? prev.filter(p => p !== person)
        : [...prev, person]
    );
  };

  const clearFilters = () => {
    setSearchQuery('');
    setTypeFilter('all');
    setSelectedTags([]);
    setSelectedPersons([]);
    setDateRange({ start: '', end: '' });
  };

  const hasActiveFilters = searchQuery || typeFilter !== 'all' || selectedTags.length > 0 || selectedPersons.length > 0 || dateRange.start || dateRange.end;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                Expense Tracker
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFormOpen(true)}
                title="Add Transaction"
                className="flex items-center justify-center w-10 h-10 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
              >
                <Plus className="w-5 h-5" />
              </button>
              <button
                onClick={() => setGroupFormOpen(true)}
                title="Add Group Expense"
                className="flex items-center justify-center w-10 h-10 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
              >
                <Users className="w-5 h-5" />
              </button>
              <button
                onClick={() => setSettingsOpen(true)}
                className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                title="Settings"
              >
                <Settings className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </button>
              <button
                onClick={() => setIsDark(!isDark)}
                className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                {isDark ? <Sun className="w-5 h-5 text-yellow-500" /> : <Moon className="w-5 h-5 text-gray-600" />}
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex gap-1 mt-4 -mb-4">
            <button
              onClick={() => setCurrentView('dashboard')}
              className={`flex items-center gap-2 px-4 py-2 rounded-t-lg font-medium transition-colors ${
                currentView === 'dashboard'
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-t-2 border-blue-500'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </button>
            <button
              onClick={() => setCurrentView('transactions')}
              className={`flex items-center gap-2 px-4 py-2 rounded-t-lg font-medium transition-colors ${
                currentView === 'transactions'
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-t-2 border-blue-500'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              Transactions
            </button>
            <button
              onClick={() => setCurrentView('people')}
              className={`flex items-center gap-2 px-4 py-2 rounded-t-lg font-medium transition-colors ${
                currentView === 'people'
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-t-2 border-blue-500'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <Users className="w-4 h-4" />
              People
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
{currentView === 'dashboard' && (
          <Dashboard 
            transactions={transactions} 
            settlementTotal={settlementTotal}
          />
        )}

{currentView === 'people' && (
          <PeopleLedger 
            transactions={transactions}
            onAddTransaction={() => setFormOpen(true)}
            onTransactionsChange={loadTransactions}
          />
        )}

        {currentView === 'transactions' && (
          <>
            {/* Search and Filter Bar */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
              <div className="flex flex-col lg:flex-row gap-4">
                {/* Search */}
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search transactions..."
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Filter Toggle Button */}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border transition-colors ${
                    showFilters || hasActiveFilters
                      ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700 text-blue-600 dark:text-blue-400'
                      : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                  }`}
                >
                  Filters
                  {hasActiveFilters && (
                    <span className="ml-1 px-1.5 py-0.5 text-xs bg-blue-500 text-white rounded-full">
                      {[searchQuery, typeFilter !== 'all', selectedTags.length > 0, selectedPersons.length > 0, dateRange.start, dateRange.end].filter(Boolean).length}
                    </span>
                  )}
                </button>

                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="flex items-center gap-2 px-4 py-2.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Expanded Filters Panel */}
              {showFilters && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Type Filter */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Type
                      </label>
                      <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value as 'all' | 'income' | 'expense')}
                        className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="all">All Types</option>
                        <option value="income">Income</option>
                        <option value="expense">Expense</option>
                      </select>
                    </div>

                    {/* Date Range - Start */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        From Date
                      </label>
                      <input
                        type="date"
                        value={dateRange.start}
                        onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                        className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Date Range - End */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        To Date
                      </label>
                      <input
                        type="date"
                        value={dateRange.end}
                        onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                        className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Quick Date Filters */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Quick Select
                      </label>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            const today = new Date();
                            setDateRange({ start: today.toISOString().split('T')[0], end: '' });
                          }}
                          className="px-3 py-2 text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-gray-600 dark:text-gray-300 transition-colors"
                        >
                          Today
                        </button>
                        <button
                          onClick={() => {
                            const weekAgo = new Date();
                            weekAgo.setDate(weekAgo.getDate() - 7);
                            setDateRange({ start: weekAgo.toISOString().split('T')[0], end: '' });
                          }}
                          className="px-3 py-2 text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-gray-600 dark:text-gray-300 transition-colors"
                        >
                          Last 7 Days
                        </button>
                        <button
                          onClick={() => {
                            const monthAgo = new Date();
                            monthAgo.setMonth(monthAgo.getMonth() - 1);
                            setDateRange({ start: monthAgo.toISOString().split('T')[0], end: '' });
                          }}
                          className="px-3 py-2 text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-gray-600 dark:text-gray-300 transition-colors"
                        >
                          Last Month
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Tags Filter */}
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Tags
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {allTags.map(tag => (
                        <button
                          key={tag}
                          onClick={() => toggleTag(tag)}
                          className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                            selectedTags.includes(tag)
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                          }`}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Persons Filter */}
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Persons
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {allPersons.map(person => (
                        <button
                          key={person}
                          onClick={() => togglePerson(person)}
                          className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                            selectedPersons.includes(person)
                              ? 'bg-purple-500 text-white'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                          }`}
                        >
                          {person}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Results Count */}
            <div className="mb-4 text-sm text-gray-500 dark:text-gray-400">
              Showing {filteredTransactions.length} of {transactions.length} transactions
            </div>

            {/* Transaction List */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
              <TransactionList 
                transactions={filteredTransactions} 
                onDelete={handleDeleteClick} 
                onEdit={handleEditClick}
              />
            </div>
          </>
        )}
      </main>

      {/* Transaction Form Modal */}
      {formOpen && (
        <TransactionForm
          onClose={() => {
            setFormOpen(false);
            setEditingTransaction(null);
          }}
          onSuccess={handleFormSuccess}
          initialData={editingTransaction}
        />
      )}

      {/* Group Transaction Form Modal */}
      {groupFormOpen && (
        <GroupTransactionModal
          onClose={() => setGroupFormOpen(false)}
          onSuccess={handleFormSuccess}
          persons={settings.names}
        />
      )}

      {/* Settings Modal */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        tags={settings.tags}
        names={settings.names}
        onSave={handleSaveSettings}
        onFlush={loadTransactions}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setTransactionToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        transaction={transactionToDelete}
      />
    </div>
  );
}

export default App;
