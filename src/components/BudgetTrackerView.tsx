import React, { useState } from 'react';
import { Expense, Trip } from '../types';
import { DollarSign, Plus, PieChart, Users, ArrowUpRight, Wallet, Receipt } from 'lucide-react';

interface BudgetTrackerViewProps {
  trip: Trip;
  expenses: Expense[];
  onAddExpense: (expense: Expense) => void;
  onDeleteExpense: (id: string) => void;
}

export const BudgetTrackerView: React.FC<BudgetTrackerViewProps> = ({
  trip,
  expenses,
  onAddExpense,
  onDeleteExpense,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [category, setCategory] = useState<Expense['category']>('Dining');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [paidBy, setPaidBy] = useState('Alex (You)');

  const totalSpent = expenses.reduce((acc, curr) => acc + curr.amount, 0);
  const remaining = trip.totalBudget - totalSpent;
  const percentUsed = Math.min(Math.round((totalSpent / trip.totalBudget) * 100), 100);
  const perPerson = Math.round(totalSpent / Math.max(trip.travelers, 1));

  const categories = ['Flights', 'Lodging', 'Dining', 'Activities', 'Transit', 'Misc'] as const;

  const getCategorySpend = (cat: Expense['category']) => {
    return expenses.filter(e => e.category === cat).reduce((acc, curr) => acc + curr.amount, 0);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(amount);
    if (!description.trim() || isNaN(parsed) || parsed <= 0) return;

    const newExp: Expense = {
      id: `exp-${Date.now()}`,
      tripId: trip.id,
      category,
      amount: parsed,
      currency: 'USD',
      description: description.trim(),
      date: new Date().toISOString().split('T')[0],
      paidBy,
    };

    onAddExpense(newExp);
    setAmount('');
    setDescription('');
    setShowAddModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Budget Summary Card */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Financial Overview</span>
            <h2 className="text-2xl font-extrabold text-white mt-1">Expedition Budget & Expense Ledger</h2>
            <p className="text-xs text-slate-400">Tracking expenses across {trip.travelers} registered expedition members</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-900/30 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Log New Expense</span>
          </button>
        </div>

        {/* 3 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60">
            <span className="text-xs text-slate-400 font-medium">Total Expedition Budget</span>
            <div className="text-2xl font-extrabold text-white mt-1">${trip.totalBudget.toLocaleString()}</div>
            <span className="text-[11px] text-slate-500 font-mono">Set for {trip.destination}</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60">
            <span className="text-xs text-slate-400 font-medium">Current Spent ({percentUsed}%)</span>
            <div className="text-2xl font-extrabold text-cyan-400 mt-1">${totalSpent.toLocaleString()}</div>
            <span className="text-[11px] text-slate-500 font-mono">${perPerson} per traveler</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60">
            <span className="text-xs text-slate-400 font-medium">Remaining Liquidity</span>
            <div className={`text-2xl font-extrabold mt-1 ${remaining >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              ${remaining.toLocaleString()}
            </div>
            <span className="text-[11px] text-slate-500 font-mono">{remaining >= 0 ? 'Safe runway' : 'Over budget'}</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-semibold text-slate-400">
            <span>Budget Consumption</span>
            <span>{percentUsed}%</span>
          </div>
          <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                percentUsed > 90 ? 'bg-rose-500' : percentUsed > 70 ? 'bg-amber-500' : 'bg-cyan-500'
              }`}
              style={{ width: `${percentUsed}%` }}
            />
          </div>
        </div>
      </div>

      {/* Category Breakdown & Ledger Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Category Cards (4 cols) */}
        <div className="lg:col-span-4 space-y-3">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider px-1">Spend by Category</h3>
          <div className="grid gap-2">
            {categories.map(cat => {
              const spent = getCategorySpend(cat);
              const catPercent = totalSpent > 0 ? Math.round((spent / totalSpent) * 100) : 0;
              return (
                <div
                  key={cat}
                  className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between"
                >
                  <div>
                    <span className="text-xs font-bold text-slate-200 block">{cat}</span>
                    <span className="text-[11px] text-slate-500">{catPercent}% of total</span>
                  </div>
                  <div className="text-sm font-bold text-white font-mono">${spent}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Expense List (8 cols) */}
        <div className="lg:col-span-8 space-y-3">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider px-1">Transactions Ledger</h3>
          <div className="rounded-2xl bg-slate-900 border border-slate-800 divide-y divide-slate-800 overflow-hidden shadow-xl">
            {expenses.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                No expenses logged yet. Use the "Log New Expense" button above.
              </div>
            ) : (
              expenses.map(exp => (
                <div key={exp.id} className="p-4 flex items-center justify-between hover:bg-slate-850/50 transition">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300">
                      <Receipt className="w-4 h-4 text-cyan-400" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">{exp.description}</h4>
                      <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] font-semibold text-cyan-300">
                          {exp.category}
                        </span>
                        <span>• Paid by {exp.paidBy}</span>
                        <span>• {exp.date}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="text-base font-extrabold text-white font-mono">${exp.amount}</span>
                    <button
                      onClick={() => onDeleteExpense(exp.id)}
                      className="text-slate-600 hover:text-rose-400 text-xs transition cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Add Expense Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700 p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">Log Travel Expense</h3>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Expense Description *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Bullet Train JR Pass (7 Days)"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Amount ($ USD) *</label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    placeholder="120.00"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Category</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value as any)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white focus:outline-none focus:border-cyan-500"
                  >
                    {categories.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Paid By</label>
                <input
                  type="text"
                  value={paidBy}
                  onChange={e => setPaidBy(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md transition"
                >
                  Save Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
