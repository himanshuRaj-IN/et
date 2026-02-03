import { useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area
} from 'recharts';
import {
  Wallet,
  TrendingUp,
  DollarSign,
  PieChart as PieChartIcon,
  BarChart3,
  Activity,
  Briefcase,
  HandCoins
} from 'lucide-react';
import type { Transaction } from '../types';

interface DashboardProps {
  transactions: Transaction[];
  settlementTotal?: number;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

const TIME_PERIODS = [
  { label: '1M', days: 30 },
  { label: '3M', days: 90 },
  { label: '6M', days: 180 },
  { label: '1Y', days: 365 },
  { label: 'All', days: Infinity }
];

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function Dashboard({ transactions, settlementTotal = 0 }: DashboardProps) {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [timeRange, setTimeRange] = useState(90); // Default to 3 months

// Calculate all-time stats
  const allTimeStats = useMemo(() => {
    // Income: all income transactions
    const income = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    
    // Expenses: all expenses (INCLUDING Investment tagged ones)
    const expenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    // Investments: all transactions with Investment tag (treated as expense)
    const investments = transactions
      .filter(t => t.tag === 'Investment')
      .reduce((sum, t) => sum + t.amount, 0);

    // Settlement: Expenses (to others) - Income (from others)
    // If positive: You will get back | If negative: You need to pay
    const settlementIncome = transactions
      .filter(t => t.type === 'income' && t.person !== 'Myself')
      .reduce((sum, t) => sum + t.amount, 0);

    const settlementExpenses = transactions
      .filter(t => t.type === 'expense' && t.person !== 'Myself')
      .reduce((sum, t) => sum + t.amount, 0);

    const settlement = settlementExpenses - settlementIncome;
    
    // Balance = Income - All Expenses (including Investment)
    const balance = income - expenses;
    
    // Net Worth = Balance + Investments + Settlement
    const netWorth = balance + investments + settlement;

    return {
      income,
      expenses,
      balance,
      investments,
      settlement,
      netWorth,
      transactionCount: transactions.length
    };
  }, [transactions]);

// Net worth over time (line chart)
  // Net Worth = Balance + Investments + Settlement
  // Settlement = Expenses (others) - Income (others)
  // Balance = Income - All Expenses (including Investment)
  // Shows cumulative net worth from the START of all transactions
  const netWorthOverTime = useMemo(() => {
    const sortedTransactions = [...transactions].sort(
      (a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime()
    );
    
    if (sortedTransactions.length === 0) return [];

    const now = new Date();
    const endDate = now.getTime();
    
    let balance = 0;
    let investments = 0;
    let settlementIncome = 0;
    let settlementExpenses = 0;
    
    const dataByDate: Record<string, { balance: number; investments: number; settlement: number }> = {};
    
    sortedTransactions.forEach(t => {
      const date = new Date(t.occurredAt);
      const dateKey = date.toISOString().split('T')[0];
      
      if (t.type === 'income') {
        balance += t.amount;
        if (t.person !== 'Myself') {
          settlementIncome += t.amount;
        }
      } else if (t.type === 'expense') {
        // All expenses reduce balance (including Investment)
        balance -= t.amount;
        // Track investments separately for Net Worth calculation
        if (t.tag === 'Investment') {
          investments += t.amount;
        }
        if (t.person !== 'Myself') {
          settlementExpenses += t.amount;
        }
      }
      
      const settlement = settlementExpenses - settlementIncome;
      dataByDate[dateKey] = { balance, investments, settlement };
    });

// Convert to array and sort by date
    const allData = Object.entries(dataByDate).map(([date, data]) => {
      const settlement = data.settlement;
      const netWorth = data.balance + data.investments + settlement;
      return {
        date,
        netWorth,
        balance: data.balance,
        investments: data.investments,
        settlement,
        displayDate: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      };
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Filter based on time range
    const startDate = timeRange === Infinity 
      ? new Date(0).getTime()
      : endDate - timeRange * 24 * 60 * 60 * 1000;

    return allData.filter(d => new Date(d.date).getTime() >= startDate);
  }, [transactions, timeRange]);

// Current values - Balance = Total Income - Total Expenses (including Investment)
  // Settlement = Passed from PeopleLedger
  // Net Worth = Balance + Investments + Settlement
  const currentValues = useMemo(() => {
    let balance = 0;
    let investments = 0;
    
    transactions.forEach(t => {
      if (t.type === 'income') {
        balance += t.amount;
      } else if (t.type === 'expense') {
        // All expenses reduce balance (including Investment)
        balance -= t.amount;
        // Track investments separately for Net Worth calculation
        if (t.tag === 'Investment') {
          investments += t.amount;
        }
      }
    });

    // Use passed settlementTotal from PeopleLedger
    const settlement = settlementTotal;
    
    // Net Worth = Balance + Investments + Settlement
    const netWorth = balance + investments + settlement;

    return {
      balance,
      investments,
      settlement,
      netWorth
    };
  }, [transactions, settlementTotal]);

// Monthly comparison data (last 6 months)
  const monthlyComparison = useMemo(() => {
    const now = new Date();
    const data = [];

    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthTransactions = transactions.filter(t => {
        const tDate = new Date(t.occurredAt);
        return tDate.getFullYear() === date.getFullYear() && 
               tDate.getMonth() === date.getMonth();
      });

      // Income: all income transactions
      const income = monthTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
      
      // Expenses: all expenses (INCLUDING Investment tagged ones)
      const expenses = monthTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

      data.push({
        month: MONTHS[date.getMonth()].substring(0, 3),
        income,
        expenses,
        balance: income - expenses
      });
    }

    return data;
  }, [transactions]);

  // Category breakdown for pie chart
  const categoryBreakdown = useMemo(() => {
    const categoryTotals: Record<string, number> = {};
    transactions.filter(t => t.type === 'expense').forEach(t => {
      categoryTotals[t.tag] = (categoryTotals[t.tag] || 0) + t.amount;
    });

    return Object.entries(categoryTotals)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [transactions]);

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Calculate current month stats
  const currentMonthStats = useMemo(() => {
    const now = new Date();
    const monthTransactions = transactions.filter(t => {
      const tDate = new Date(t.occurredAt);
      return tDate.getFullYear() === now.getFullYear() && 
             tDate.getMonth() === now.getMonth();
    });

    const income = monthTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const expenses = monthTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      income,
      expenses,
      balance: income - expenses,
      count: monthTransactions.length
    };
  }, [transactions]);

return (
    <div className="space-y-6">
      {/* Month Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Dashboard</h2>
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
        >
          {monthlyComparison.map((_, index) => {
            const date = new Date();
            date.setMonth(date.getMonth() - (5 - index));
            const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const label = `${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
            return <option key={value} value={value}>{label}</option>;
          })}
        </select>
      </div>

      {/* Summary Cards - All Time */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Net Worth Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
              <Wallet className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400">Net Worth</span>
          </div>
          <div className="mt-4">
            <p className={`text-2xl font-bold ${
              currentValues.netWorth >= 0 
                ? 'text-gray-900 dark:text-white' 
                : 'text-red-600 dark:text-red-400'
            }`}>
              {currentValues.netWorth >= 0 ? '' : '-'}{formatCurrency(Math.abs(currentValues.netWorth))}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              All time
            </p>
          </div>
        </div>

        {/* Balance Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className={`p-3 rounded-full ${
              currentValues.balance >= 0 
                ? 'bg-green-100 dark:bg-green-900/30' 
                : 'bg-red-100 dark:bg-red-900/30'
            }`}>
              <DollarSign className={`w-6 h-6 ${
                currentValues.balance >= 0 
                  ? 'text-green-600 dark:text-green-400' 
                  : 'text-red-600 dark:text-red-400'
              }`} />
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400">Balance</span>
          </div>
          <div className="mt-4">
            <p className={`text-2xl font-bold ${
              currentValues.balance >= 0 
                ? 'text-gray-900 dark:text-white' 
                : 'text-red-600 dark:text-red-400'
            }`}>
              {currentValues.balance >= 0 ? '' : '-'}{formatCurrency(Math.abs(currentValues.balance))}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              All time
            </p>
          </div>
        </div>

        {/* Investment Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-full">
              <Briefcase className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400">Investments</span>
          </div>
          <div className="mt-4">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(currentValues.investments)}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              All time
            </p>
          </div>
        </div>

{/* Settlement Card - Based on transactions with others (person != Myself) */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className={`p-3 rounded-full ${
              currentValues.settlement < 0 
                ? 'bg-orange-100 dark:bg-orange-900/30' 
                : 'bg-green-100 dark:bg-green-900/30'
            }`}>
              <HandCoins className={`w-6 h-6 ${
                currentValues.settlement < 0 
                  ? 'text-orange-600 dark:text-orange-400' 
                  : 'text-green-600 dark:text-green-400'
              }`} />
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400">Settlement</span>
          </div>
          <div className="mt-4">
            <p className={`text-2xl font-bold ${
              currentValues.settlement < 0 
                ? 'text-orange-600 dark:text-orange-400' 
                : 'text-green-600 dark:text-green-400'
            }`}>
              {formatCurrency(Math.abs(currentValues.settlement))}
            </p>
            <p className={`text-sm mt-1 ${
              currentValues.settlement < 0 
                ? 'text-orange-600 dark:text-orange-400' 
                : 'text-green-600 dark:text-green-400'
            }`}>
              {currentValues.settlement < 0 
                ? '⚠ You need to pay this' 
                : '✓ You will get this back'}
            </p>
          </div>
        </div>
      </div>

      {/* Net Worth Over Time - Line Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-500" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Net Worth Over Time
            </h3>
          </div>
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            {TIME_PERIODS.map((period) => (
              <button
                key={period.label}
                onClick={() => setTimeRange(period.days)}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                  timeRange === period.days
                    ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {period.label}
              </button>
            ))}
          </div>
        </div>
{netWorthOverTime.length > 1 ? (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={netWorthOverTime}>
              <defs>
                <linearGradient id="colorNetWorth" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
              <XAxis 
                dataKey="displayDate" 
                stroke="#9CA3AF" 
                fontSize={12}
                interval="preserveStartEnd"
              />
              <YAxis 
                stroke="#9CA3AF" 
                fontSize={12}
                tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip 
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-gray-800 dark:bg-gray-700 p-3 rounded-lg shadow-lg border border-gray-600">
                        <p className="text-gray-300 font-medium mb-2">{label}</p>
                        <div className="space-y-1">
                          <p className="text-blue-400">
                            Net Worth: {formatCurrency(data.netWorth)}
                          </p>
                          <p className="text-green-400">
                            Balance: {formatCurrency(data.balance)}
                          </p>
                          <p className="text-purple-400">
                            Investments: {formatCurrency(data.investments)}
                          </p>
                          <p className={data.settlement >= 0 ? 'text-green-400' : 'text-orange-400'}>
                            Settlement: {formatCurrency(data.settlement)}
                            <span className="text-xs text-gray-400 ml-1">
                              ({data.settlement >= 0 ? 'to get' : 'to pay'})
                            </span>
                          </p>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="netWorth"
                stroke="#3B82F6"
                strokeWidth={2}
                fill="url(#colorNetWorth)"
                name="Net Worth"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-[300px] text-gray-500 dark:text-gray-400">
            Not enough data to show net worth trend
          </div>
        )}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Comparison Bar Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 className="w-5 h-5 text-blue-500" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Income vs Expenses
            </h3>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={monthlyComparison}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
              <XAxis dataKey="month" stroke="#9CA3AF" fontSize={12} />
              <YAxis 
                stroke="#9CA3AF" 
                fontSize={12}
                tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
              />
<Tooltip 
                formatter={(value: number | undefined) => formatCurrency(value || 0)}
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#F9FAFB'
                }}
              />
              <Legend />
              <Bar dataKey="income" fill="#10B981" radius={[4, 4, 0, 0]} name="Income" />
              <Bar dataKey="expenses" fill="#EF4444" radius={[4, 4, 0, 0]} name="Expenses" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Category Breakdown Pie Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-6">
            <PieChartIcon className="w-5 h-5 text-purple-500" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Expense by Category
            </h3>
          </div>
          {categoryBreakdown.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={categoryBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {categoryBreakdown.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number | undefined) => formatCurrency(value || 0)}
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#F9FAFB'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[280px] text-gray-500 dark:text-gray-400">
              No expense data available
            </div>
          )}
        </div>
      </div>

{/* Quick Stats */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-6">
          <Activity className="w-5 h-5 text-blue-500" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Quick Stats
          </h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-6">
          <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Income</p>
            <p className="text-lg font-semibold text-green-600 dark:text-green-400">
              {formatCurrency(allTimeStats.income)}
            </p>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Expenses</p>
            <p className="text-lg font-semibold text-red-600 dark:text-red-400">
              {formatCurrency(allTimeStats.expenses)}
            </p>
          </div>
<div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Balance</p>
            <p className={`text-lg font-semibold ${
              allTimeStats.balance >= 0 
                ? 'text-green-600 dark:text-green-400' 
                : 'text-red-600 dark:text-red-400'
            }`}>
              {allTimeStats.balance >= 0 ? '+' : ''}{formatCurrency(allTimeStats.balance)}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              = Total Income - Total Expenses
            </p>
          </div>
<div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Settlement</p>
            <p className={`text-lg font-semibold ${
              allTimeStats.settlement < 0 
                ? 'text-orange-600 dark:text-orange-400' 
                : 'text-green-600 dark:text-green-400'
            }`}>
              {allTimeStats.settlement < 0 ? '' : '+'}{formatCurrency(allTimeStats.settlement)}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              = Expenses (others) - Income (others)
            </p>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Net Worth</p>
            <p className={`text-lg font-semibold ${
              allTimeStats.netWorth >= 0 
                ? 'text-blue-600 dark:text-blue-400' 
                : 'text-red-600 dark:text-red-400'
            }`}>
              {allTimeStats.netWorth >= 0 ? '+' : ''}{formatCurrency(allTimeStats.netWorth)}
            </p>
<p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              = Balance + Investments + Settlement
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

