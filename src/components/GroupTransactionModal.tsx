import { useState, useEffect } from 'react';
import { X, Users, Calendar, Tag } from 'lucide-react';
import { addTransaction, getSettings } from '../services/db';
import type { Transaction } from '../types';

interface GroupTransactionModalProps {
  onClose: () => void;
  onSuccess: () => void;
  persons: string[];
}

export function GroupTransactionModal({ onClose, onSuccess, persons }: GroupTransactionModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    tag: '',
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().slice(0, 5)
  });
  const [selectedPersons, setSelectedPersons] = useState<string[]>(['Myself']);
  const [tags, setTags] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const settings = await getSettings();
    setTags(settings.tags);
    // Set default tag if available
    if (settings.tags.length > 0) {
      setFormData(prev => ({ ...prev, tag: settings.tags[0] }));
    }
  };

  const handlePersonToggle = (person: string) => {
    setSelectedPersons(prev =>
      prev.includes(person)
        ? prev.filter(p => p !== person)
        : [...prev, person]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.amount || !formData.tag || selectedPersons.length === 0) return;

    setIsSubmitting(true);
    try {
      const totalAmount = parseInt(formData.amount);
      const splitAmount = Math.floor(totalAmount / selectedPersons.length);
      const occurredAt = new Date(`${formData.date}T${formData.time}`).toISOString();

      const transactions: Transaction[] = selectedPersons.map(person => ({
        id: crypto.randomUUID(),
        occurredAt,
        amount: splitAmount,
        type: 'expense',
        name: formData.name,
        tag: formData.tag,
        person: person
      }));

      for (const transaction of transactions) {
        await addTransaction(transaction);
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to add group transaction:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-green-500 p-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Add Group Expense</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-green-600 transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Amount (₹)
            </label>
            <input
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
              placeholder="0"
              min="0"
              step="1"
              required
              className="w-full pl-8 pr-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="What was this for?"
              required
              className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          {/* Tag Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Tag
            </label>
            <div className="relative">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={formData.tag}
                onChange={(e) => setFormData(prev => ({ ...prev, tag: e.target.value }))}
                required
                className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500"
              >
                <option value="">Select tag</option>
                {tags.map(tag => (
                  <option key={tag} value={tag}>{tag}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Participants
            </label>
            <div className="flex flex-wrap gap-2 p-2 rounded-lg border border-gray-200 dark:border-gray-600">
              {persons.map(person => (
                <button
                  type="button"
                  key={person}
                  onClick={() => handlePersonToggle(person)}
                  className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                    selectedPersons.includes(person)
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {person}
                </button>
              ))}
            </div>
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Date
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  required
                  className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Time
              </label>
              <input
                type="time"
                value={formData.time}
                onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
                required
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            title="Add Group Expense"
            className="w-full py-2.5 px-4 bg-green-500 hover:bg-green-600 disabled:bg-green-400 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Users className="w-5 h-5" />
                <span className="sr-only">Add Group Expense</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
