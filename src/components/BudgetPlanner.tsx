import { useState, useEffect, useMemo } from 'react';
import { Plus, Edit2, Trash2, AlertTriangle, CheckCircle, TrendingUp, Target, Calendar, X, ChevronDown, ChevronUp, Clock, BarChart3, PieChart, Zap } from 'lucide-react';
import { getBudgets, saveBudget, deleteBudget, getSettings, getInvestmentGoals, saveInvestmentGoal, deleteInvestmentGoal } from '../services/db';
import type { Budget, Transaction, InvestmentGoal } from '../types';

interface BudgetPlannerProps {
  transactions: Transaction[];
  onUpdate?: () => void;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function BudgetPlanner({ transactions, onUpdate }: BudgetPlannerProps) {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [investmentGoals, setInvestmentGoals] = useState<InvestmentGoal[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [editingGoal, setEditingGoal] = useState<InvestmentGoal | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'budgets' | 'goals' | 'summary'>('budgets');
  const [showTagSelector, setShowTagSelector] = useState(false);
  
  // Form states
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    type: 'monthly' as 'monthly' | 'custom',
    startDate: '',
    endDate: '',
    selectedTags: [] as string[]
  });
  
  const [goalFormData, setGoalFormData] = useState({
    name: '',
    targetAmount: '',
    currentAmount: '0',
    selectedTags: [] as string[],
    monthlyTarget: '',
    deadline: ''
  });

  const loadBudgets = async () => {
    const data = await getBudgets(selectedMonth);
    setBudgets(data);
  };

  const loadInvestmentGoals = async () => {
    const data = await getInvestmentGoals();
    setInvestmentGoals(data);
  };

  const loadSettings = async () => {
    const settings = await getSettings();
    setTags(settings.tags);
  };

  useEffect(() => {
    loadBudgets();
    loadInvestmentGoals();
    loadSettings();
  }, [selectedMonth]);

  // Calculate spending per category for the selected month
  const categorySpending = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const spending: Record<string, number> = {};
    
    transactions
      .filter(t => {
        const date = new Date(t.occurredAt);
        return t.type === 'expense' && 
               date.getFullYear() === year && 
               date.getMonth() === month - 1;
      })
      .forEach(t => {
        spending[t.tag] = (spending[t.tag] || 0) + t.amount;
      });
    
    return spending;
  }, [transactions, selectedMonth]);

  // Calculate spending for specific tags within selected month
  const calculateTagSpendingForMonth = (selectedTags: string[]) => {
    const [year, month] = selectedMonth.split('-').map(Number);
    return transactions
      .filter(t => {
        if (t.type !== 'expense') return false;
        const date = new Date(t.occurredAt);
        const matchesMonth = date.getFullYear() === year && date.getMonth() === month - 1;
        const matchesTag = selectedTags.length === 0 || selectedTags.includes(t.tag);
        return matchesMonth && matchesTag;
      })
      .reduce((sum, t) => sum + t.amount, 0);
  };

  // Calculate investment spending for goals
  const calculateInvestmentSpending = (goalTags: string[]) => {
    return transactions
      .filter(t => {
        if (t.type !== 'expense') return false;
        return goalTags.includes(t.tag);
      })
      .reduce((sum, t) => sum + t.amount, 0);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const toggleTag = (tag: string, isGoal: boolean = false) => {
    if (isGoal) {
      setGoalFormData(prev => ({
        ...prev,
        selectedTags: prev.selectedTags.includes(tag)
          ? prev.selectedTags.filter(t => t !== tag)
          : [...prev.selectedTags, tag]
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        selectedTags: prev.selectedTags.includes(tag)
          ? prev.selectedTags.filter(t => t !== tag)
          : [...prev.selectedTags, tag]
      }));
    }
  };

  const handleSaveBudget = async () => {
    if (!formData.name || !formData.amount || formData.selectedTags.length === 0) return;

    const budget: Budget = {
      id: generateId(),
      name: formData.name,
      amount: parseInt(formData.amount),
      tags: formData.selectedTags,
      type: formData.type,
      month: formData.type === 'monthly' ? selectedMonth : undefined,
      startDate: formData.type === 'custom' ? formData.startDate : undefined,
      endDate: formData.type === 'custom' ? formData.endDate : undefined,
      createdAt: new Date().toISOString()
    };

    await saveBudget(budget);
    await loadBudgets();
    setFormData({ name: '', amount: '', type: 'monthly', startDate: '', endDate: '', selectedTags: [] });
    setShowAddForm(false);
    onUpdate?.();
  };

  const handleDeleteBudget = async (id: string) => {
    await deleteBudget(id);
    await loadBudgets();
    onUpdate?.();
  };

  const handleEditBudget = (budget: Budget) => {
    setEditingBudget(budget);
    setFormData({
      name: budget.name,
      amount: String(budget.amount),
      type: budget.type,
      startDate: budget.startDate || '',
      endDate: budget.endDate || '',
      selectedTags: [...budget.tags]
    });
    setShowAddForm(true);
  };

  const handleUpdateBudget = async () => {
    if (!editingBudget || !formData.amount || formData.selectedTags.length === 0) return;

    const budget: Budget = {
      ...editingBudget,
      name: formData.name,
      amount: parseInt(formData.amount),
      tags: formData.selectedTags,
      type: formData.type,
      month: formData.type === 'monthly' ? selectedMonth : undefined,
      startDate: formData.type === 'custom' ? formData.startDate : undefined,
      endDate: formData.type === 'custom' ? formData.endDate : undefined
    };

    await saveBudget(budget);
    await loadBudgets();
    setEditingBudget(null);
    setFormData({ name: '', amount: '', type: 'monthly', startDate: '', endDate: '', selectedTags: [] });
    onUpdate?.();
  };

  // Investment Goal handlers
  const handleSaveGoal = async () => {
    if (!goalFormData.name || !goalFormData.targetAmount || goalFormData.selectedTags.length === 0) return;

    const goal: InvestmentGoal = {
      id: generateId(),
      name: goalFormData.name,
      targetAmount: parseInt(goalFormData.targetAmount),
      currentAmount: parseInt(goalFormData.currentAmount) || 0,
      tags: goalFormData.selectedTags,
      monthlyTarget: goalFormData.monthlyTarget ? parseInt(goalFormData.monthlyTarget) : undefined,
      deadline: goalFormData.deadline || undefined,
      createdAt: new Date().toISOString()
    };

    await saveInvestmentGoal(goal);
    await loadInvestmentGoals();
    setGoalFormData({ name: '', targetAmount: '', currentAmount: '0', selectedTags: [], monthlyTarget: '', deadline: '' });
    setShowGoalForm(false);
    onUpdate?.();
  };

  const handleDeleteGoal = async (id: string) => {
    await deleteInvestmentGoal(id);
    await loadInvestmentGoals();
    onUpdate?.();
  };

  const handleEditGoal = (goal: InvestmentGoal) => {
    setEditingGoal(goal);
    setGoalFormData({
      name: goal.name,
      targetAmount: String(goal.targetAmount),
      currentAmount: String(goal.currentAmount),
      selectedTags: [...goal.tags],
      monthlyTarget: goal.monthlyTarget ? String(goal.monthlyTarget) : '',
      deadline: goal.deadline || ''
    });
    setShowGoalForm(true);
  };

  const handleUpdateGoal = async () => {
    if (!editingGoal || !goalFormData.targetAmount || goalFormData.selectedTags.length === 0) return;

    const goal: InvestmentGoal = {
      ...editingGoal,
      name: goalFormData.name,
      targetAmount: parseInt(goalFormData.targetAmount),
      currentAmount: parseInt(goalFormData.currentAmount) || 0,
      tags: goalFormData.selectedTags,
      monthlyTarget: goalFormData.monthlyTarget ? parseInt(goalFormData.monthlyTarget) : undefined,
      deadline: goalFormData.deadline || undefined
    };

    await saveInvestmentGoal(goal);
    await loadInvestmentGoals();
    setEditingGoal(null);
    setGoalFormData({ name: '', targetAmount: '', currentAmount: '0', selectedTags: [], monthlyTarget: '', deadline: '' });
    onUpdate?.();
  };

  const getBudgetStatus = (budget: Budget, spent: number) => {
    const percentage = (spent / budget.amount) * 100;
    
    if (percentage >= 100) {
      return { status: 'over', color: 'bg-red-500', icon: AlertTriangle, label: 'Over Budget', labelColor: 'text-red-600 dark:text-red-400' };
    }
    if (percentage >= 80) {
      return { status: 'warning', color: 'bg-yellow-500', icon: AlertTriangle, label: 'Near Limit', labelColor: 'text-yellow-600 dark:text-yellow-400' };
    }
    return { status: 'ok', color: 'bg-green-500', icon: CheckCircle, label: 'On Track', labelColor: 'text-green-600 dark:text-green-400' };
  };

  // Get unique categories from both tags and existing budgets
  const allCategories = useMemo(() => {
    const categories = new Set([...tags, ...budgets.map(b => b.name)]);
    return Array.from(categories).sort();
  }, [tags, budgets]);

  const totalBudget = budgets.reduce((sum, b) => sum + b.amount, 0);
  const totalSpent = budgets.reduce((sum, budget) => {
    const spent = calculateTagSpendingForMonth(budget.tags);
    return sum + Math.min(spent, budget.amount);
  }, 0);
  const totalRemaining = totalBudget - totalSpent;
  
  const totalInvestmentTarget = investmentGoals.reduce((sum, g) => sum + g.targetAmount, 0);
  const totalInvested = investmentGoals.reduce((sum, goal) => {
    return sum + calculateInvestmentSpending(goal.tags);
  }, 0);

  // Summary statistics
  const budgetStats = useMemo(() => {
    return {
      onTrack: budgets.filter(b => { const spent = calculateTagSpendingForMonth(b.tags); return (spent / b.amount) < 0.8; }).length,
      nearLimit: budgets.filter(b => { const spent = calculateTagSpendingForMonth(b.tags); return (spent / b.amount) >= 0.8 && (spent / b.amount) < 1; }).length,
      overBudget: budgets.filter(b => { const spent = calculateTagSpendingForMonth(b.tags); return spent >= b.amount; }).length,
      notStarted: budgets.filter(b => { const spent = calculateTagSpendingForMonth(b.tags); return spent === 0; }).length
    };
  }, [budgets, transactions, selectedMonth]);

  return (
    <div className="space-y-6">
      {/* Month Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Budget Planner</h2>
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
        >
          {Array.from({ length: 12 }, (_, i) => {
            const date = new Date();
            date.setMonth(date.getMonth() - 6 + i);
            const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const label = `${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
            return <option key={value} value={value}>{label}</option>;
          })}
        </select>
      </div>

      {/* Budget Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Budget</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(totalBudget)}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {budgets.length} categories
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Spent</p>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">
            {formatCurrency(totalSpent)}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {totalBudget > 0 ? `${((totalSpent / totalBudget) * 100).toFixed(1)}% of budget` : 'No budget set'}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Remaining</p>
          <p className={`text-2xl font-bold ${totalRemaining >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {totalRemaining >= 0 ? '' : '-'}{formatCurrency(Math.abs(totalRemaining))}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {totalRemaining >= 0 ? 'Under budget' : 'Over budget'}
          </p>
        </div>
      </div>

      {/* Add/Edit Budget Form */}
      {(showAddForm || editingBudget) && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {editingBudget ? 'Edit Budget' : 'Add New Budget'}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                disabled={editingBudget}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                <option value="">Select category</option>
                {allCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Budget Amount (₹)
              </label>
              <input
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                placeholder="0"
                min="0"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button
              onClick={editingBudget ? handleUpdateBudget : handleSaveBudget}
              disabled={!formData.category || !formData.amount}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
            >
              {editingBudget ? 'Update Budget' : 'Add Budget'}
            </button>
            <button
              onClick={() => {
                setShowAddForm(false);
                setEditingBudget(null);
                setFormData({ category: '', amount: '' });
              }}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Budget List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Category Budgets</h3>
          {!showAddForm && !editingBudget && (
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Budget
            </button>
          )}
        </div>

        {budgets.length === 0 ? (
          <div className="p-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full mb-4">
              <TrendingUp className="w-8 h-8 text-gray-400 dark:text-gray-500" />
            </div>
            <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
              No budgets set
            </h4>
            <p className="text-gray-500 dark:text-gray-400">
              Set monthly budgets to track your spending goals
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {budgets.map(budget => {
              const spent = categorySpending[budget.category] || 0;
              const percentage = Math.min((spent / budget.amount) * 100, 100);
              const { status, color, icon: Icon, label, labelColor } = getBudgetStatus(budget.category, budget.amount);
              const remaining = budget.amount - spent;

              return (
                <div key={budget.id} className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        status === 'over' ? 'bg-red-100 dark:bg-red-900/30' :
                        status === 'warning' ? 'bg-yellow-100 dark:bg-yellow-900/30' :
                        'bg-green-100 dark:bg-green-900/30'
                      }`}>
                        <Icon className={`w-5 h-5 ${
                          status === 'over' ? 'text-red-600 dark:text-red-400' :
                          status === 'warning' ? 'text-yellow-600 dark:text-yellow-400' :
                          'text-green-600 dark:text-green-400'
                        }`} />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {budget.category}
                        </h4>
                        <p className={`text-sm ${labelColor}`}>
                          {label}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-lg font-semibold text-gray-900 dark:text-white">
                          {formatCurrency(spent)} / {formatCurrency(budget.amount)}
                        </p>
                        <p className={`text-sm ${remaining >= 0 ? 'text-gray-500 dark:text-gray-400' : 'text-red-600 dark:text-red-400'}`}>
                          {remaining >= 0 ? `${formatCurrency(remaining)} left` : `${formatCurrency(Math.abs(remaining))} over`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEditBudget(budget)}
                          className="p-2 text-gray-400 hover:text-blue-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteBudget(budget.id)}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                  {/* Progress Bar */}
                  <div className="relative h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`absolute left-0 top-0 h-full ${color} transition-all duration-500`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-1 text-xs text-gray-500 dark:text-gray-400">
                    <span>{percentage.toFixed(1)}% used</span>
                    <span>{formatCurrency(budget.amount - spent)} remaining</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Spending vs Budget Summary */}
      {budgets.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Budget Summary
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* On Track */}
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <p className="text-sm text-green-700 dark:text-green-400 mb-1">On Track</p>
              <p className="text-2xl font-bold text-green-800 dark:text-green-300">
                {budgets.filter(b => {
                  const spent = categorySpending[b.category] || 0;
                  return (spent / b.amount) < 0.8;
                }).length}
              </p>
            </div>
            {/* Near Limit */}
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <p className="text-sm text-yellow-700 dark:text-yellow-400 mb-1">Near Limit (80%+)</p>
              <p className="text-2xl font-bold text-yellow-800 dark:text-yellow-300">
                {budgets.filter(b => {
                  const spent = categorySpending[b.category] || 0;
                  return (spent / b.amount) >= 0.8 && (spent / b.amount) < 1;
                }).length}
              </p>
            </div>
            {/* Over Budget */}
            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <p className="text-sm text-red-700 dark:text-red-400 mb-1">Over Budget</p>
              <p className="text-2xl font-bold text-red-800 dark:text-red-300">
                {budgets.filter(b => {
                  const spent = categorySpending[b.category] || 0;
                  return spent >= b.amount;
                }).length}
              </p>
            </div>
            {/* Not Started */}
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p className="text-sm text-gray-700 dark:text-gray-400 mb-1">No Spending Yet</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-gray-300">
                {budgets.filter(b => {
                  const spent = categorySpending[b.category] || 0;
                  return spent === 0;
                }).length}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

