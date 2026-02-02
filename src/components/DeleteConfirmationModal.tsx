import { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import type { Transaction } from '../types';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  transaction: Transaction | null;
}

export function DeleteConfirmationModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  transaction 
}: DeleteConfirmationModalProps) {
  const [confirmAmount, setConfirmAmount] = useState('');
  const [error, setError] = useState('');

  if (!isOpen || !transaction) return null;

  const amountValue = Math.abs(transaction.amount);

  const handleConfirm = () => {
    const amountMatch = parseInt(confirmAmount) === amountValue;
    if (!amountMatch) {
      setError(`Please enter the exact amount: ₹${amountValue}`);
      return;
    }
    onConfirm();
    setConfirmAmount('');
    setError('');
  };

  const handleClose = () => {
    setConfirmAmount('');
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-red-500 p-4 flex items-center gap-3">
          <AlertTriangle className="w-6 h-6 text-white" />
          <h2 className="text-lg font-semibold text-white">Delete Transaction</h2>
          <button
            onClick={handleClose}
            className="ml-auto p-1 rounded-lg hover:bg-red-600 transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            To confirm deletion, please enter the transaction amount:
          </p>

          {/* Transaction Details */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">Transaction</span>
              <span className="font-medium text-gray-900 dark:text-white">{transaction.name}</span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">Person</span>
              <span className="font-medium text-gray-900 dark:text-white">{transaction.person}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500 dark:text-gray-400">Amount</span>
              <span className={`font-semibold ${
                transaction.type === 'income' 
                  ? 'text-green-600 dark:text-green-400' 
                  : 'text-red-600 dark:text-red-400'
              }`}>
                {transaction.type === 'income' ? '+' : '-'}₹{amountValue}
              </span>
            </div>
          </div>

          {/* Amount Input */}
          <div className="relative mb-4">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">₹</span>
            <input
              type="number"
              value={confirmAmount}
              onChange={(e) => {
                setConfirmAmount(e.target.value);
                setError('');
              }}
              placeholder="Enter amount to confirm"
              step="1"
              min="0"
              className={`w-full pl-8 pr-4 py-3 rounded-lg border ${
                error 
                  ? 'border-red-500 focus:ring-red-500' 
                  : 'border-gray-200 dark:border-gray-600 focus:ring-blue-500'
              } bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:border-transparent transition-all`}
            />
          </div>

          {/* Error Message */}
          {error && (
            <p className="text-red-500 text-sm mb-4">{error}</p>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleClose}
              className="flex-1 py-2.5 px-4 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 py-2.5 px-4 rounded-lg bg-red-500 hover:bg-red-600 text-white font-medium transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
