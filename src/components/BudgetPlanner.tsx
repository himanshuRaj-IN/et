import { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, Edit2, X, Tag, Calendar, DollarSign } from 'lucide-react';
import { getBudgets, saveBudget, deleteBudget, getAllTransactions } from '../services/db';
import type { Budget, Transaction } from '../types';

interface BudgetPlannerProps {
  tags: string[];
  onBudgetsChange?: () => void;
}

export function BudgetPlanner({ tags, onBudgetsChange }: BudgetPlannerProps) {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  
  // Form state
  const [formName, setFormName] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formTags, setFormTags] = useState<string[]>([]);
  const [formType, setFormType] = useState<'monthly' | 'custom'>('monthly');
  const [formMonth, setFormMonth] = useState('');
  const [formStartDate, setFormStartDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');
  const [formColor, setFormColor] = useState('#3B82F6');

  const colors = [
    '#3B82F6', // blue
    '#10B981', // green
    '#F59E0B', // amber
    '#EF4444', // red
    '#8B5CF6', // purple
    '#EC4899', // pink
    '#06B6D4', // cyan
    '#84CC16', // lime
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [budgetsData, transactionsData] = await Promise.all([
        getBudgets(),
        getAllTransactions()
      ]);
      setBudgets(budgetsData);
      setTransactions(transactionsData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentMonth = () => {
    return new Date().toISOString().slice(0, 7);
  };

  const getBudgetSpent = (budget: Budget): number => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    if (budget.type === 'monthly') {
      const [year, month] = (budget.month || getCurrentMonth()).split('-').map(Number);
      startDate = new Date(year, month - 1, 1);
      endDate = new Date(year, month, 0, 23, 59, 59, 999);
    } else {
      startDate = budget.startDate ? new Date(budget.startDate) : new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = budget.endDate ? new Date(budget.endDate) : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
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

  const getBudgetProgress = (budget: Budget): { spent: number; percentage: number; isOverBudget: boolean } => {
    const spent = getBudgetSpent(budget);
    const percentage = Math.round((spent / budget.amount) * 100);
    return {
      spent,
      percentage,
      isOverBudget: spent > budget.amount
    };
  };

  const sortedBudgets = useMemo(() => {
    return [...budgets].sort((a, b) => {
      const progressA = getBudgetProgress(a);
      const progressB = getBudgetProgress(b);
      // Sort by over-budget first, then by percentage
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
      type: formType,
      month: formType === 'monthly' ? formMonth : undefined,
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
    setFormType(budget.type);
    setFormMonth(budget.month || getCurrentMonth());
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
    setFormType('monthly');
    setFormMonth(getCurrentMonth());
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
            Create budgets based on tags to track your spending
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Budget
        </button>
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
            const { spent, percentage, isOverBudget } = getBudgetProgress(budget);
            const remaining = budget.amount - spent;
            
            return (
              <div 
                key={budget.id}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: budget.color || '#3B82F6' }}
                    />
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">{budget.name}</h3>
                      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                        <Tag className="w-3 h-3" />
                        <span>{budget.tags.join(', ') || 'All tags'}</span>
                        <span className="text-gray-300 dark:text-gray-600">•</span>
                        <Calendar className="w-3 h-3" />
                        <span>
                          {budget.type === 'monthly' 
                            ? (budget.month || getCurrentMonth())
                            : `${budget.startDate || '...'} to ${budget.endDate || '...'}`
                          }
                        </span>
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
                <div className="mb-2">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-600 dark:text-gray-400">
                      ₹{spent.toLocaleString()} spent
                    </span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      ₹{budget.amount.toLocaleString()}
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
                        backgroundColor: isOverBudget ? undefined : budget.color || '#3B82F6'
                      }}
                    />
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

      {/* Add/Edit Budget Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden">
            {/* Header */}
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

            {/* Form */}
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
                    Monthly
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

              {/* Date Selection */}
              {formType === 'monthly' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Month
                  </label>
                  <input
                    type="month"
                    value={formMonth}
                    onChange={(e) => setFormMonth(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              ) : (
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
