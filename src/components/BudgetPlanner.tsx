import { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, Edit2, X, Tag, Calendar, DollarSign, Settings } from 'lucide-react';
import { getBudgets, saveBudget, deleteBudget, getAllTransactions, getTagCategoryMappings, saveTagCategoryMapping } from '../services/db';
import type { Budget, Transaction, BudgetCategory, TagCategoryMapping } from '../types';

interface BudgetPlannerProps {
  tags: string[];
  onBudgetsChange?: () => void;
}

const CATEGORY_CONFIG = {
  needs: {
    label: 'Needs',
    color: '#10B981', // green
    icon: '🏠',
    description: 'Essential expenses (rent, utilities, groceries)'
  },
  wants: {
    label: 'Wants',
    color: '#F59E0B', // amber
    icon: '🎯',
    description: 'Non-essential spending (entertainment, dining out)'
  },
  investment: {
    label: 'Investment',
    color: '#8B5CF6', // purple
    icon: '📈',
    description: 'Savings and investments (SIP, mutual funds, stocks)'
  }
};

export function BudgetPlanner({ tags, onBudgetsChange }: BudgetPlannerProps) {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [tagCategories, setTagCategories] = useState<TagCategoryMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showCategorySettings, setShowCategorySettings] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  
  // Form state
  const [formName, setFormName] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formTags, setFormTags] = useState<string[]>([]);
  const [formCategory, setFormCategory] = useState<BudgetCategory>('needs');
  const [formType, setFormType] = useState<'monthly' | 'custom'>('monthly');
  const [formStartDate, setFormStartDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');
  const [formColor, setFormColor] = useState('#3B82F6');

  const colors = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16',
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [budgetsData, transactionsData, categoriesData] = await Promise.all([
        getBudgets(),
        getAllTransactions(),
        getTagCategoryMappings()
      ]);
      setBudgets(budgetsData);
      setTransactions(transactionsData);
      setTagCategories(categoriesData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getBudgetSpent = (budget: Budget): number => {
    let startDate: Date;
    let endDate: Date;

    if (budget.type === 'monthly') {
      const now = new Date();
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    } else {
      startDate = budget.startDate ? new Date(budget.startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      endDate = budget.endDate ? new Date(budget.endDate + 'T23:59:59.999') : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59, 999);
    }

    return transactions
      .filter(t => {
        const tDate = new Date(t.occurredAt);
        const isExpense = t.type === 'expense';
        const hasMatchingTag = budget.tags.length === 0 || budget.tags.includes(t.tag);
        const inDateRange = tDate >= startDate && tDate <= endDate;
        return isExpense && hasMatchingTag && inDateRange;
      })
      .reduce((sum, t) => sum + t.amount, 0);
  };

const getBudgetProgress = (budget: Budget): { spent: number; percentage: number; isOverBudget: boolean; daysLeft: number; dailyBurnRate: number; overspendProbability: number } => {
    const now = new Date();
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    const daysInMonth = monthEnd.getDate();
    const currentDay = now.getDate();
    const daysLeftCount = Math.max(1, Math.ceil((monthEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    
    const spent = getBudgetSpent(budget);
    const percentage = Math.round((spent / budget.amount) * 100);
    
    // Calculate daily burn rate (based on days passed)
    const daysPassed = Math.max(1, currentDay);
    const dailyBurnRate = spent / daysPassed;
    
    // Calculate projected total spending
    const projectedSpending = dailyBurnRate * daysInMonth;
    
    // Calculate overspend probability (simple model based on current pace)
    let overspendProbability = 0;
    if (spent > 0) {
      const paceRatio = projectedSpending / budget.amount;
      if (paceRatio > 1.5) overspendProbability = 95;
      else if (paceRatio > 1.2) overspendProbability = 80;
      else if (paceRatio > 1.0) overspendProbability = 65;
      else if (paceRatio > 0.8) overspendProbability = 30;
      else if (paceRatio > 0.6) overspendProbability = 10;
      else overspendProbability = 5;
    }
    
    // If already over budget
    if (spent > budget.amount) {
      overspendProbability = 100;
    }
    
    return {
      spent,
      percentage,
      isOverBudget: spent > budget.amount,
      daysLeft: daysLeftCount,
      dailyBurnRate,
      overspendProbability
    };
  };

// Calculate category summaries
  const categorySummaries = useMemo(() => {
    const summaries: Record<BudgetCategory, { spent: number; budget: number; percentage: number; budgets: Budget[] }> = {
      needs: { spent: 0, budget: 0, percentage: 0, budgets: [] },
      wants: { spent: 0, budget: 0, percentage: 0, budgets: [] },
      investment: { spent: 0, budget: 0, percentage: 0, budgets: [] }
    };
    
    const categoryBudgets = budgets.filter(b => {
      if (b.type !== 'monthly') return false;
      const now = new Date();
      return b.month === `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}` || b.type === 'monthly';
    });
    
    categoryBudgets.forEach(budget => {
      const category = budget.category;
      const progress = getBudgetProgress(budget);
      summaries[category].budget += budget.amount;
      summaries[category].spent += progress.spent;
      summaries[category].budgets.push(budget);
    });
    
    // Calculate percentages
    Object.keys(summaries).forEach(key => {
      const cat = key as BudgetCategory;
      if (summaries[cat].budget > 0) {
        summaries[cat].percentage = Math.round((summaries[cat].spent / summaries[cat].budget) * 100);
      }
    });
    
    return summaries;
  }, [budgets, transactions]);

  const sortedBudgets = useMemo(() => {
    return [...budgets].sort((a, b) => {
      const progressA = getBudgetProgress(a);
      const progressB = getBudgetProgress(b);
      if (progressA.isOverBudget && !progressB.isOverBudget) return -1;
      if (!progressA.isOverBudget && progressB.isOverBudget) return 1;
      return progressB.percentage - progressA.percentage;
    });
  }, [budgets, transactions]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const budget: Budget = {
      id: editingBudget?.id || `budget-${Date.now()}`,
      name: formName,
      amount: parseFloat(formAmount),
      tags: formTags,
      category: formCategory,
      type: formType,
      startDate: formType === 'custom' ? formStartDate : undefined,
      endDate: formType === 'custom' ? formEndDate : undefined,
      createdAt: editingBudget?.createdAt || new Date().toISOString(),
      color: formColor
    };

    try {
      await saveBudget(budget);
      await loadData();
      onBudgetsChange?.();
      resetForm();
    } catch (error) {
      console.error('Failed to save budget:', error);
      alert('Failed to save budget. Please try again.');
    }
  };

  const handleEdit = (budget: Budget) => {
    setEditingBudget(budget);
    setFormName(budget.name);
    setFormAmount(budget.amount.toString());
    setFormTags(budget.tags);
    setFormCategory(budget.category);
    setFormType(budget.type);
    setFormStartDate(budget.startDate || '');
    setFormEndDate(budget.endDate || '');
    setFormColor(budget.color || '#3B82F6');
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this budget?')) {
      try {
        await deleteBudget(id);
        await loadData();
        onBudgetsChange?.();
      } catch (error) {
        console.error('Failed to delete budget:', error);
        alert('Failed to delete budget. Please try again.');
      }
    }
  };

  const resetForm = () => {
    setFormName('');
    setFormAmount('');
    setFormTags([]);
    setFormCategory('needs');
    setFormType('monthly');
    setFormStartDate('');
    setFormEndDate('');
    setFormColor('#3B82F6');
    setEditingBudget(null);
    setShowForm(false);
  };

  const toggleTag = (tag: string) => {
    setFormTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const formatDateRange = (budget: Budget) => {
    if (budget.type === 'monthly') {
      const now = new Date();
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${monthNames[now.getMonth()]} ${now.getFullYear()}`;
    } else {
      const start = budget.startDate ? new Date(budget.startDate).toLocaleDateString('en-IN') : '...';
      const end = budget.endDate ? new Date(budget.endDate).toLocaleDateString('en-IN') : '...';
      return `${start} - ${end}`;
    }
  };

  const getTagCategory = (tag: string): BudgetCategory => {
    const mapping = tagCategories.find(c => c.tag === tag);
    return mapping?.category || 'needs';
  };

  const setTagCategory = async (tag: string, category: BudgetCategory) => {
    try {
      await saveTagCategoryMapping({ tag, category });
      await loadData();
    } catch (error) {
      console.error('Failed to save tag category:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getProbabilityColor = (prob: number) => {
    if (prob >= 80) return 'text-red-600 dark:text-red-400';
    if (prob >= 50) return 'text-orange-600 dark:text-orange-400';
    if (prob >= 20) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-green-600 dark:text-green-400';
  };

  const getProbabilityLabel = (prob: number) => {
    if (prob >= 80) return 'Very High';
    if (prob >= 50) return 'High';
    if (prob >= 20) return 'Moderate';
    return 'Low';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Budget Planner</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Manage budgets with Needs, Wants, and Investment categories
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCategorySettings(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
          >
            <Settings className="w-4 h-4" />
            Tag Categories
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Budget
          </button>
        </div>
      </div>

      {/* Category Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(Object.keys(CATEGORY_CONFIG) as BudgetCategory[]).map(category => {
          const config = CATEGORY_CONFIG[category];
          const summary = categorySummaries[category];
          const isOverBudget = summary.percentage > 100;
          
          return (
            <div 
              key={category}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{config.icon}</span>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{config.label}</h3>
                </div>
                <span className={`text-sm font-medium ${
                  isOverBudget 
                    ? 'text-red-500' 
                    : summary.percentage > 80 
                      ? 'text-amber-500' 
                      : 'text-green-500'
                }`}>
                  {summary.percentage}%
                </span>
              </div>
              
              <div className="mb-3">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gray-600 dark:text-gray-400">
                    {formatCurrency(summary.spent)} spent
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {formatCurrency(summary.budget)} budget
                  </span>
                </div>
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all ${
                      isOverBudget ? 'bg-red-500' : summary.percentage > 80 ? 'bg-amber-500' : 'bg-green-500'
                    }`}
                    style={{ 
                      width: `${Math.min(summary.percentage, 100)}%`,
                      backgroundColor: isOverBudget ? undefined : config.color
                    }}
                  />
                </div>
              </div>
              
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {summary.budgets.length} budget(s) • {summary.budget > 0 ? formatCurrency(summary.budget - summary.spent) : formatCurrency(0)} remaining
              </p>
            </div>
          );
        })}
      </div>

      {/* Budget List */}
      {sortedBudgets.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-xl">
          <DollarSign className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500 dark:text-gray-400">No budgets created yet</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
            Create a budget to track your spending by tags
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {sortedBudgets.map(budget => {
            const { spent, percentage, isOverBudget, daysLeft, dailyBurnRate, overspendProbability } = getBudgetProgress(budget);
            const remaining = budget.amount - spent;
            const config = CATEGORY_CONFIG[budget.category];
            
            return (
              <div 
                key={budget.id}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: budget.color || config.color }}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{config.icon}</span>
                        <h3 className="font-semibold text-gray-900 dark:text-white">{budget.name}</h3>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                        <Tag className="w-3 h-3" />
                        <span>{budget.tags.join(', ') || 'All tags'}</span>
                        <span className="text-gray-300 dark:text-gray-600">•</span>
                        <Calendar className="w-3 h-3" />
                        <span>{formatDateRange(budget)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEdit(budget)}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    </button>
                    <button
                      onClick={() => handleDelete(budget.id)}
                      className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-3">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-600 dark:text-gray-400">
                      {formatCurrency(spent)} spent
                    </span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {formatCurrency(budget.amount)}
                    </span>
                  </div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-300 ${
                        isOverBudget 
                          ? 'bg-red-500' 
                          : percentage > 80 
                            ? 'bg-amber-500' 
                            : 'bg-green-500'
                      }`}
                      style={{ 
                        width: `${Math.min(percentage, 100)}%`,
                        backgroundColor: isOverBudget ? undefined : budget.color || config.color
                      }}
                    />
                  </div>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Remaining</p>
                    <p className={`text-sm font-semibold ${
                      remaining >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                    }`}>
                      {formatCurrency(Math.abs(remaining))}
                    </p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Days Left</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{daysLeft}</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Daily Burn</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{formatCurrency(dailyBurnRate)}</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Overspend Risk</p>
                    <p className={`text-sm font-semibold ${getProbabilityColor(overspendProbability)}`}>
                      {getProbabilityLabel(overspendProbability)} ({overspendProbability}%)
                    </p>
                  </div>
                </div>

                {/* Status */}
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-medium ${
                    isOverBudget 
                      ? 'text-red-500' 
                      : percentage > 80 
                        ? 'text-amber-500' 
                        : 'text-green-500'
                  }`}>
                    {isOverBudget 
                      ? `₹${Math.abs(remaining).toLocaleString()} over budget`
                      : `₹${remaining.toLocaleString()} remaining`
                    }
                  </span>
                  <span className={`text-sm ${
                    isOverBudget 
                      ? 'text-red-500' 
                      : percentage > 80 
                        ? 'text-amber-500' 
                        : 'text-green-500'
                  }`}>
                    {percentage}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tag Category Settings Modal */}
      {showCategorySettings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Tag Categories
              </h2>
              <button
                onClick={() => setShowCategorySettings(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Assign each tag to a category (Needs, Wants, or Investment) for better budget tracking.
              </p>
              
              <div className="space-y-3">
                {tags.map(tag => {
                  const currentCategory = getTagCategory(tag);
                  return (
                    <div 
                      key={tag}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <Tag className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-900 dark:text-white">{tag}</span>
                      </div>
                      <select
                        value={currentCategory}
                        onChange={(e) => setTagCategory(tag, e.target.value as BudgetCategory)}
                        className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="needs">🏠 Needs</option>
                        <option value="wants">🎯 Wants</option>
                        <option value="investment">📈 Investment</option>
                      </select>
                    </div>
                  );
                })}
              </div>
            </div>
            
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setShowCategorySettings(false)}
                className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Budget Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {editingBudget ? 'Edit Budget' : 'Create Budget'}
              </h2>
              <button
                onClick={resetForm}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-140px)]">
              {/* Budget Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Budget Name
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g., Food & Dining"
                  required
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Budget Amount (₹)
                </label>
                <input
                  type="number"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  placeholder="5000"
                  min="1"
                  required
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Category Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Category
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(CATEGORY_CONFIG) as BudgetCategory[]).map(category => {
                    const config = CATEGORY_CONFIG[category];
                    return (
                      <button
                        key={category}
                        type="button"
                        onClick={() => setFormCategory(category)}
                        className={`p-3 rounded-lg border transition-colors text-center ${
                          formCategory === category
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                            : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                      >
                        <span className="text-2xl block mb-1">{config.icon}</span>
                        <span className={`text-sm font-medium ${
                          formCategory === category ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'
                        }`}>
                          {config.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Budget Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Budget Type
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setFormType('monthly')}
                    className={`flex-1 px-4 py-2 rounded-lg border transition-colors ${
                      formType === 'monthly'
                        ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    Current Month
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormType('custom')}
                    className={`flex-1 px-4 py-2 rounded-lg border transition-colors ${
                      formType === 'custom'
                        ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    Custom Range
                  </button>
                </div>
              </div>

              {/* Date Selection for Custom Range */}
              {formType === 'custom' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={formStartDate}
                      onChange={(e) => setFormStartDate(e.target.value)}
                      required={formType === 'custom'}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={formEndDate}
                      onChange={(e) => setFormEndDate(e.target.value)}
                      required={formType === 'custom'}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              )}

              {/* Tags Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select Tags (leave empty for all tags)
                </label>
                <div className="flex flex-wrap gap-2">
                  {tags.map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                        formTags.includes(tag)
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
                {formTags.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setFormTags([])}
                    className="text-sm text-blue-500 hover:text-blue-600 mt-2"
                  >
                    Clear all tags
                  </button>
                )}
              </div>

              {/* Color Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Progress Bar Color
                </label>
                <div className="flex gap-2">
                  {colors.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormColor(color)}
                      className={`w-8 h-8 rounded-full transition-transform ${
                        formColor === color ? 'ring-2 ring-offset-2 ring-blue-500 scale-110' : ''
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                >
                  {editingBudget ? 'Update Budget' : 'Create Budget'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
