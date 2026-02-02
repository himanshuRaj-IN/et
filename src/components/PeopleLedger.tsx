import { useMemo, useState } from 'react';
import { Users, Plus, Minus, ArrowRight, History, Wallet } from 'lucide-react';
import type { Transaction } from '../types';
import { SettlementModal } from './SettlementModal';
import { addTransaction } from '../services/db';

interface PeopleLedgerProps {
  transactions: Transaction[];
  onAddTransaction: () => void;
  onTransactionsChange: () => void;
}

interface PersonBalance {
  name: string;
  totalOwed: number;    // People who owe the user (positive)
  totalOwing: number;   // User owes others (positive)
  transactions: Transaction[];
}

export function PeopleLedger({ transactions, onAddTransaction, onTransactionsChange }: PeopleLedgerProps) {
  const [selectedPerson, setSelectedPerson] = useState<string | null>(null);
  const [settlementModal, setSettlementModal] = useState<{ isOpen: boolean; personName: string; balance: number } | null>(null);

// Settlement handler
  const handleSettle = async (cashReceived: number, spentForMe: number, other: number, description: string) => {
    if (!settlementModal) return;

    const totalAmount = cashReceived + spentForMe + other;
    if (totalAmount === 0) {
      setSettlementModal(null);
      return;
    }

    const balance = settlementModal.balance;

    // Create transactions based on settlement type
    const transactionsToAdd: Transaction[] = [];

    // Cash received - creates income transaction
    if (cashReceived > 0) {
      transactionsToAdd.push({
        id: `settle-${Date.now()}-cash-${Math.random().toString(36).substr(2, 9)}`,
        occurredAt: new Date().toISOString(),
        amount: cashReceived,
        type: 'income',
        name: description,
        person: settlementModal.personName,
        tag: 'Settlement'
      });
    }

    // Spent for me - creates two transactions:
    // 1. Income from person (they paid on your behalf, effectively giving you money/settling debt)
    // 2. Expense for yourself (you consumed the value)
    if (spentForMe > 0) {
      // 1. The settlement/repayment part
      transactionsToAdd.push({
        id: `settle-${Date.now()}-spent-repay-${Math.random().toString(36).substr(2, 9)}`,
        occurredAt: new Date().toISOString(),
        amount: spentForMe,
        type: 'income',
        name: `Settlement (Spent for me): ${description}`,
        person: settlementModal.personName,
        tag: 'Settlement'
      });

      // 2. The actual expense part (assigned to Myself so it doesn't affect their ledger)
      transactionsToAdd.push({
        id: `settle-${Date.now()}-spent-exp-${Math.random().toString(36).substr(2, 9)}`,
        occurredAt: new Date().toISOString(),
        amount: spentForMe,
        type: 'expense',
        name: description,
        person: 'Myself',
        tag: 'Settlement'
      });
    }

    // Other - creates income (if they owe you) or expense (if you owe them)
    if (other > 0) {
      const otherType = balance > 0 ? 'income' : 'expense';
      transactionsToAdd.push({
        id: `settle-${Date.now()}-other-${Math.random().toString(36).substr(2, 9)}`,
        occurredAt: new Date().toISOString(),
        amount: other,
        type: otherType,
        name: description,
        person: settlementModal.personName,
        tag: 'Settlement'
      });
    }

    // Add all transactions
    for (const transaction of transactionsToAdd) {
      await addTransaction(transaction);
    }

    onTransactionsChange();
    setSettlementModal(null);
  };

  const openSettlementModal = (personName: string, balance: number) => {
    setSettlementModal({ isOpen: true, personName, balance });
  };

// Calculate balances per person
  const personBalances = useMemo(() => {
    const balances: Record<string, PersonBalance> = {};

    // Only process transactions with other people (exclude 'Myself')
    const peopleTransactions = transactions.filter(t => t.person !== 'Myself');

    // Initialize
    peopleTransactions.forEach(t => {
      if (!balances[t.person]) {
        balances[t.person] = {
          name: t.person,
          totalOwed: 0,
          totalOwing: 0,
          transactions: []
        };
      }
      balances[t.person].transactions.push(t);
    });

// Calculate totals - ALL transactions count
    // Income transactions = you borrowed from them
    // Expense transactions = they owe you
    Object.values(balances).forEach(person => {
      person.transactions.sort((a, b) => 
        new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
      );
      
      // Expense = they owe you (positive for you)
      person.totalOwed = person.transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
      
      // Income = you borrowed from them (negative for you)
      person.totalOwing = person.transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
    });

    return Object.values(balances).sort((a, b) => {
      const netA = a.totalOwed - a.totalOwing;
      const netB = b.totalOwed - b.totalOwing;
      return netB - netA; // Highest owed first
    });
  }, [transactions]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const selectedPersonData = selectedPerson 
    ? personBalances.find(p => p.name === selectedPerson) 
    : null;

const netBalance = (person: PersonBalance) => person.totalOwed - person.totalOwing;

// Calculate summary values
  const totalOwedAll = useMemo(() => {
    return personBalances.reduce((sum, p) => sum + p.totalOwed, 0);
  }, [personBalances]);

  const totalOwingAll = useMemo(() => {
    return personBalances.reduce((sum, p) => sum + p.totalOwing, 0);
  }, [personBalances]);

const netBalanceAll = totalOwedAll - totalOwingAll;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">People Ledger</h2>
        <button
          onClick={onAddTransaction}
          title="Add Transaction"
          className="flex items-center justify-center w-10 h-10 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
              <Users className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Owe Me</p>
              <p className="text-xl font-bold text-green-600 dark:text-green-400">
                {formatCurrency(totalOwedAll)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full">
              <Wallet className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">I Owe</p>
              <p className="text-xl font-bold text-red-600 dark:text-red-400">
                {formatCurrency(totalOwingAll)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-full ${
              netBalanceAll >= 0
                ? 'bg-blue-100 dark:bg-blue-900/30'
                : 'bg-orange-100 dark:bg-orange-900/30'
            }`}>
              <ArrowRight className={`w-6 h-6 ${
                netBalanceAll >= 0
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-orange-600 dark:text-orange-400'
              }`} />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Net Balance</p>
              <p className={`text-xl font-bold ${
                netBalanceAll >= 0
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-orange-600 dark:text-orange-400'
              }`}>
                {formatCurrency(Math.abs(netBalanceAll))}
                {netBalanceAll < 0 && ' (Owed)'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* People Summary - Clear view of who owes what */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white">People Summary</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Person</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-green-600 dark:text-green-400">Owes Me</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-red-600 dark:text-red-400">I Borrowed</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 dark:text-gray-400">Net</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-500 dark:text-gray-400">Status</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-500 dark:text-gray-400">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {personBalances.map(person => {
                const balance = netBalance(person);
                return (
                  <tr 
                    key={person.name} 
                    className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer ${
                      selectedPerson === person.name ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                    }`}
                    onClick={() => setSelectedPerson(person.name)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                          balance > 0 
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                            : balance < 0
                            ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                        }`}>
                          {person.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-gray-900 dark:text-white">{person.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {person.totalOwed > 0 ? (
                        <span className="text-green-600 dark:text-green-400 font-medium">
                          {formatCurrency(person.totalOwed)}
                        </span>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {person.totalOwing > 0 ? (
                        <span className="text-red-600 dark:text-red-400 font-medium">
                          {formatCurrency(person.totalOwing)}
                        </span>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-semibold ${
                        balance > 0 
                          ? 'text-green-600 dark:text-green-400'
                          : balance < 0
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-gray-500 dark:text-gray-400'
                      }`}>
                        {balance > 0 ? '+' : balance < 0 ? '-' : ''}{formatCurrency(Math.abs(balance))}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {balance > 0 ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                          <Minus className="w-3 h-3 mr-1" /> Get back
                        </span>
                      ) : balance < 0 ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">
                          <Plus className="w-3 h-3 mr-1" /> Pay back
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                          <ArrowRight className="w-3 h-3 mr-1" /> Settled
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {balance !== 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openSettlementModal(person.name, balance);
                          }}
                          className="px-3 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                        >
                          Settle
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {personBalances.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    No people transactions yet. Add transactions with other people.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* People List */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white">People</h3>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-[500px] overflow-y-auto">
            {personBalances.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No transactions yet</p>
                <p className="text-sm mt-1">Add transactions with "Owe" or "Borrowed" tags</p>
              </div>
            ) : (
              personBalances.map(person => {
                const balance = netBalance(person);
                return (
                  <button
                    key={person.name}
                    onClick={() => setSelectedPerson(person.name)}
                    className={`w-full p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                      selectedPerson === person.name ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          balance > 0 
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                            : balance < 0
                            ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                        }`}>
                          {balance > 0 ? <Minus className="w-5 h-5" /> : balance < 0 ? <Plus className="w-5 h-5" /> : <ArrowRight className="w-5 h-5" />}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{person.name}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {balance > 0 ? 'Owes you' : balance < 0 ? 'You owe' : 'Settled up'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold ${
                          balance > 0 
                            ? 'text-green-600 dark:text-green-400'
                            : balance < 0
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-gray-500 dark:text-gray-400'
                        }`}>
                          {formatCurrency(Math.abs(balance))}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                          {person.transactions.length} transactions
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Transaction Details */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {selectedPerson ? selectedPerson : 'Select a person'}
            </h3>
          </div>
          <div className="max-h-[500px] overflow-y-auto">
            {!selectedPersonData ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Select a person to view their transactions</p>
              </div>
            ) : selectedPersonData.transactions.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                <p>No transactions</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {selectedPersonData.transactions.map(t => (
                  <div key={t.id} className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          t.tag === 'Owe'
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                            : t.tag === 'Borrowed'
                            ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                        }`}>
                          {t.tag === 'Owe' ? <Minus className="w-3 h-3 mr-1" /> : t.tag === 'Borrowed' ? <Plus className="w-3 h-3 mr-1" /> : null}
                          {t.tag}
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {formatDate(t.occurredAt)}
                        </span>
                      </div>
                      <span className={`font-semibold ${
                        t.tag === 'Owe'
                          ? 'text-green-600 dark:text-green-400'
                          : t.tag === 'Borrowed'
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-gray-900 dark:text-white'
                      }`}>
                        {t.tag === 'Owe' ? '+' : t.tag === 'Borrowed' ? '-' : ''}{formatCurrency(t.amount)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-900 dark:text-white">{t.name}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-100 dark:border-blue-800">
        <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">How it works:</h4>
        <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
          <li>• Use <strong>"Owe"</strong> tag when someone owes you money (e.g., lent money to John)</li>
          <li>• Use <strong>"Borrowed"</strong> tag when you borrow money (e.g., borrowed from Jane)</li>
          <li>• Green = They owe you | Red = You owe them</li>
        </ul>
      </div>

      {/* Settlement Modal */}
      {settlementModal && (
        <SettlementModal
          isOpen={settlementModal.isOpen}
          onClose={() => setSettlementModal(null)}
          personName={settlementModal.personName}
          balance={settlementModal.balance}
          onSettle={handleSettle}
        />
      )}
    </div>
  );
}
