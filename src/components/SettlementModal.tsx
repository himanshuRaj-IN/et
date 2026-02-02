import { useState, useEffect } from 'react';
import { X, DollarSign, Check, ShoppingCart, ArrowRightLeft } from 'lucide-react';

interface SettlementModalProps {
  isOpen: boolean;
  onClose: () => void;
  personName: string;
  balance: number;
  onSettle: (cashReceived: number, spentForMe: number, other: number, description: string) => void;
}

export function SettlementModal({ isOpen, onClose, personName, balance, onSettle }: SettlementModalProps) {
  const [amount, setAmount] = useState('');
  const [remaining, setRemaining] = useState('');
  const [mode, setMode] = useState<'cash' | 'spent'>('cash');
  const [description, setDescription] = useState('');

  const maxAmount = Math.abs(balance);
  const isReceiving = balance > 0; // They owe you

  // Initialize values when modal opens
  useEffect(() => {
    if (isOpen) {
      setAmount(maxAmount.toString());
      setRemaining('0');
      setMode('cash');
      setDescription(`Settlement with ${personName}`);
    }
  }, [isOpen, personName, maxAmount]);

  const handleAmountChange = (val: string) => {
    setAmount(val);
    const valNum = parseFloat(val) || 0;
    setRemaining((maxAmount - valNum).toString());
  };

  const handleRemainingChange = (val: string) => {
    setRemaining(val);
    const valNum = parseFloat(val) || 0;
    setAmount((maxAmount - valNum).toString());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount) || 0;

    if (numAmount === 0) {
      onClose();
      return; 
    }

    if (mode === 'spent') {
      // Spent for me logic
      onSettle(0, numAmount, 0, description);
    } else {
      // Cash/Other logic - passing as 'other' allows PeopleLedger to decide 
      // direction (income vs expense) based on whether balance is positive or negative
      onSettle(0, 0, numAmount, description);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Settle with {personName}
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-4 bg-gray-50 dark:bg-gray-700/50">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500 dark:text-gray-400">Outstanding Balance</span>
            <span className={`font-semibold ${
              balance > 0 
                ? 'text-green-600 dark:text-green-400' 
                : balance < 0 
                ? 'text-red-600 dark:text-red-400'
                : 'text-gray-500'
            }`}>
              {balance > 0 ? 'They owe you' : balance < 0 ? 'You owe' : 'Settled'}
              {balance !== 0 && ` ${maxAmount.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}`}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Mode Selection */}
          <div className="flex p-1 bg-gray-100 dark:bg-gray-700 rounded-lg">
            <button
              type="button"
              onClick={() => setMode('cash')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${
                mode === 'cash'
                  ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <ArrowRightLeft className="w-4 h-4" />
              Cash Settlement
            </button>
            <button
              type="button"
              onClick={() => setMode('spent')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${
                mode === 'spent'
                  ? 'bg-white dark:bg-gray-600 text-orange-600 dark:text-orange-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <ShoppingCart className="w-4 h-4" />
              Spent for Me
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Settlement Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Settling Now
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Remaining Balance */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Remaining
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="number"
                  value={remaining}
                  onChange={(e) => handleRemainingChange(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400">
            {mode === 'cash' 
              ? isReceiving 
                ? 'They are paying you back.' 
                : 'You are paying them back.'
              : 'They paid for something on your behalf (reduces their debt to you).'
            }
          </p>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description (optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Cash settlement"
              className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Check className="w-5 h-5" />
              Settle
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
