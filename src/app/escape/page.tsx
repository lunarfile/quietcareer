'use client';
import { scheduleBackup } from '@/lib/auto-backup';
import { usePageTitle } from '@/hooks/use-page-title';

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { generateId, now } from '@/lib/utils';
import { Card, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MetricCard } from '@/components/ui/metric-card';
import { ProgressRing } from '@/components/ui/progress-ring';
import { PageHeader } from '@/components/ui/page-header';
import { useToast } from '@/components/ui/toast';
import dynamic from 'next/dynamic';
const RunwayChart = dynamic(() => import('@/components/charts/runway-chart').then((m) => m.RunwayChart), { ssr: false });
import {
  Rocket,
  DollarSign,
  TrendingDown,
  Clock,
  ShieldCheck,
  AlertTriangle,
  XCircle,
} from 'lucide-react';

export default function EscapePage() {
  const { toast } = useToast();
  usePageTitle('Runway');
  const [income, setIncome] = useState('');
  const [expenses, setExpenses] = useState('');
  const [savings, setSavings] = useState('');

  // What-if sliders
  const [expenseReduction, setExpenseReduction] = useState(0);
  const [sideIncome, setSideIncome] = useState(0);
  const [severanceMonths, setSeveranceMonths] = useState(0);

  const financials = useLiveQuery(() => db.financialData.toArray());

  const totalIncome = financials?.filter((f) => f.type === 'income').reduce((sum, f) => sum + f.amount, 0) ?? 0;
  const totalExpenses = financials?.filter((f) => f.type === 'expense').reduce((sum, f) => sum + f.amount, 0) ?? 0;
  const totalSavings = financials?.filter((f) => f.type === 'savings').reduce((sum, f) => sum + f.amount, 0) ?? 0;

  const monthlyBurn = totalExpenses;
  const runwayMonths = monthlyBurn > 0 ? totalSavings / monthlyBurn : 0;
  const monthlySurplus = totalIncome - totalExpenses;

  const handleQuickSetup = async () => {
    const incomeNum = parseFloat(income);
    const expensesNum = parseFloat(expenses);
    const savingsNum = parseFloat(savings);

    if (isNaN(incomeNum) && isNaN(expensesNum) && isNaN(savingsNum)) {
      toast('Enter at least one number.', 'error');
      return;
    }

    // Update specific summary entries (preserve expense categories)
    const existing = await db.financialData.toArray();
    const deleteIds = existing
      .filter((f) => (f.category === 'salary' || f.category === 'total'))
      .map((f) => f.id);
    if (deleteIds.length > 0) await db.financialData.bulkDelete(deleteIds);

    const entries = [];
    if (!isNaN(incomeNum)) {
      entries.push(db.financialData.add({
        id: generateId(), type: 'income', category: 'salary',
        amount: incomeNum, recurring: true, frequency: 'monthly',
        name: 'Monthly Income', notes: '', includeInRunway: true,
        createdAt: now(), updatedAt: now(),
      }));
    }
    if (!isNaN(expensesNum)) {
      entries.push(db.financialData.add({
        id: generateId(), type: 'expense', category: 'total',
        amount: expensesNum, recurring: true, frequency: 'monthly',
        name: 'Monthly Expenses', notes: '', includeInRunway: true,
        createdAt: now(), updatedAt: now(),
      }));
    }
    if (!isNaN(savingsNum)) {
      entries.push(db.financialData.add({
        id: generateId(), type: 'savings', category: 'total',
        amount: savingsNum, recurring: false, frequency: 'one-time',
        name: 'Total Savings', notes: '', includeInRunway: true,
        createdAt: now(), updatedAt: now(),
      }));
    }

    await Promise.all(entries);
    setIncome('');
    setExpenses('');
    setSavings('');
    toast('Numbers updated. Runway recalculated.', 'success');
  };

  const getRunwayStatus = () => {
    if (runwayMonths >= 12) return { icon: ShieldCheck, color: 'text-success', bg: 'bg-success', label: 'Comfortable', desc: 'You have a solid runway. Take your time.' };
    if (runwayMonths >= 6) return { icon: AlertTriangle, color: 'text-warning', bg: 'bg-warning', label: 'Caution', desc: 'Start planning. 6 months goes faster than you think.' };
    return { icon: XCircle, color: 'text-danger', bg: 'bg-danger', label: 'Critical', desc: 'Build savings before making any moves.' };
  };

  const hasData = financials && financials.length > 0;
  const status = getRunwayStatus();

  // Progress: 12 months = 100%
  const runwayPercent = Math.min((runwayMonths / 12) * 100, 100);

  return (
    <div className="animate-fade-up space-y-6">
      <PageHeader
        icon={Rocket}
        iconColor="text-accent-secondary"
        title="Runway"
        subtitle="How close are you to choosing freely?"
      />

      {hasData ? (
        <>
          {/* Hero runway display */}
          <Card className="flex flex-col md:flex-row items-center gap-8 py-8 px-6">
            <ProgressRing value={runwayPercent} size={160} strokeWidth={12}>
              <div className="text-center">
                <span className="text-4xl font-bold font-mono text-text-primary">
                  {runwayMonths.toFixed(1)}
                </span>
                <span className="text-sm text-text-tertiary block">months</span>
              </div>
            </ProgressRing>

            <div className="flex-1 text-center md:text-left">
              <div className="flex items-center gap-2 justify-center md:justify-start mb-2">
                <status.icon size={18} className={status.color} />
                <span className={`text-lg font-semibold ${status.color}`}>
                  {status.label}
                </span>
              </div>
              <p className="text-sm text-text-secondary leading-relaxed max-w-sm">
                {status.desc}
              </p>

              {/* Runway projection */}
              {monthlySurplus > 0 && (
                <p className="text-xs text-text-tertiary mt-3">
                  Saving ${monthlySurplus.toLocaleString()}/mo — runway grows by{' '}
                  {(monthlySurplus / monthlyBurn).toFixed(1)} months each month
                </p>
              )}
            </div>
          </Card>

          {/* Financial breakdown */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard
              label="Income"
              value={`$${totalIncome.toLocaleString()}`}
              icon={DollarSign}
              iconColor="text-success"
              suffix="/mo"
            />
            <MetricCard
              label="Monthly Costs"
              value={`$${totalExpenses.toLocaleString()}`}
              icon={TrendingDown}
              iconColor="text-danger"
              suffix="/mo"
            />
            <MetricCard
              label="Breathing Room"
              value={`$${monthlySurplus.toLocaleString()}`}
              icon={TrendingDown}
              iconColor={monthlySurplus >= 0 ? 'text-success' : 'text-danger'}
              suffix="/mo"
              trend={monthlySurplus >= 0 ? 'up' : 'down'}
            />
            <MetricCard
              label="Savings"
              value={`$${totalSavings.toLocaleString()}`}
              icon={Clock}
              iconColor="text-accent"
              suffix="total"
            />
          </div>

          {/* What-If Scenarios */}
          <Card>
            <CardTitle className="text-base mb-4">What If?</CardTitle>
            <CardContent>
              <div className="space-y-5 mb-6">
                {/* Expense reduction */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm text-text-secondary">Cut expenses by</label>
                    <span className="text-sm font-mono text-accent-text">{expenseReduction}%</span>
                  </div>
                  <div className="flex gap-2">
                    {[0, 10, 20, 30].map((v) => (
                      <button
                        key={v}
                        onClick={() => setExpenseReduction(v)}
                        aria-label={`Reduce expenses by ${v}%`}
                        className={`flex-1 py-2 text-xs rounded-[var(--radius-sm)] border transition-all ${
                          expenseReduction === v
                            ? 'border-accent bg-accent-muted text-accent-text'
                            : 'border-surface-border text-text-secondary hover:border-surface-border-hover'
                        }`}
                      >
                        {v === 0 ? 'None' : `-${v}%`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Side income */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm text-text-secondary">Add side income</label>
                    <span className="text-sm font-mono text-accent-text">${sideIncome.toLocaleString()}/mo</span>
                  </div>
                  <div className="flex gap-2">
                    {[0, 500, 1000, 2000].map((v) => (
                      <button
                        key={v}
                        onClick={() => setSideIncome(v)}
                        aria-label={`Add $${v} side income`}
                        className={`flex-1 py-2 text-xs rounded-[var(--radius-sm)] border transition-all ${
                          sideIncome === v
                            ? 'border-accent bg-accent-muted text-accent-text'
                            : 'border-surface-border text-text-secondary hover:border-surface-border-hover'
                        }`}
                      >
                        {v === 0 ? 'None' : `+$${v}`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Severance */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm text-text-secondary">Severance package</label>
                    <span className="text-sm font-mono text-accent-text">{severanceMonths === 0 ? 'None' : `${severanceMonths} months`}</span>
                  </div>
                  <div className="flex gap-2">
                    {[0, 3, 6].map((v) => (
                      <button
                        key={v}
                        onClick={() => setSeveranceMonths(v)}
                        aria-label={`${v} months severance`}
                        className={`flex-1 py-2 text-xs rounded-[var(--radius-sm)] border transition-all ${
                          severanceMonths === v
                            ? 'border-accent bg-accent-muted text-accent-text'
                            : 'border-surface-border text-text-secondary hover:border-surface-border-hover'
                        }`}
                      >
                        {v === 0 ? 'None' : `${v}mo`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Runway Projection Chart */}
              <RunwayChart
                savings={totalSavings}
                monthlyExpenses={totalExpenses}
                monthlyIncome={totalIncome}
                expenseReduction={expenseReduction}
                sideIncome={sideIncome}
                severanceMonths={severanceMonths}
              />
            </CardContent>
          </Card>

          {/* Milestone Targets */}
          <Card>
            <CardTitle className="text-base mb-4">Freedom Milestones</CardTitle>
            <CardContent>
              <div className="space-y-4">
                {[
                  { months: 3, label: '3 months', desc: 'Minimum safety net' },
                  { months: 6, label: '6 months', desc: 'Comfortable buffer' },
                  { months: 12, label: '12 months', desc: 'True freedom' },
                ].map((milestone) => {
                  const progress = Math.min((runwayMonths / milestone.months) * 100, 100);
                  const hit = runwayMonths >= milestone.months;
                  return (
                    <div key={milestone.months}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div>
                          <span className="text-sm font-medium text-text-primary">{milestone.label}</span>
                          <span className="text-xs text-text-tertiary ml-2">{milestone.desc}</span>
                        </div>
                        <span className={`text-xs font-mono ${hit ? 'text-success-text' : 'text-text-tertiary'}`}>
                          {hit ? '\u2713 Reached' : `${progress.toFixed(0)}%`}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-surface-highlight overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-1000 ease-out ${
                            hit ? 'bg-success' : progress >= 50 ? 'bg-warning' : 'bg-danger'
                          }`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Update numbers */}
          <Card>
            <CardTitle className="text-sm mb-3">Update Your Numbers</CardTitle>
            <p className="text-xs text-text-tertiary mb-4">
              Enter new values to recalculate. Leave blank to keep current.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                id="update-income"
                label="Income"
                type="number"
                placeholder={totalIncome.toString()}
                value={income}
                onChange={(e) => setIncome(e.target.value)}
              />
              <Input
                id="update-expenses"
                label="Expenses"
                type="number"
                placeholder={totalExpenses.toString()}
                value={expenses}
                onChange={(e) => setExpenses(e.target.value)}
              />
              <Input
                id="update-savings"
                label="Savings"
                type="number"
                placeholder={totalSavings.toString()}
                value={savings}
                onChange={(e) => setSavings(e.target.value)}
              />
            </div>
            <Button onClick={handleQuickSetup} size="sm" className="mt-3">
              Update
            </Button>
          </Card>

          {/* Expense Breakdown */}
          <ExpenseBreakdown financials={financials ?? []} />
        </>
      ) : (
        /* First-time setup */
        <Card>
          <div className="max-w-md mx-auto py-6">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-2xl bg-accent-muted flex items-center justify-center mx-auto mb-4">
                <Rocket size={28} className="text-accent" />
              </div>
              <h2 className="text-lg font-semibold text-text-primary mb-2">
                The math behind your options.
              </h2>
              <p className="text-sm text-text-secondary leading-relaxed">
                This isn&apos;t about quitting tomorrow. It&apos;s about knowing you could. That changes how you show up at work.
              </p>
            </div>

            <div className="flex flex-col gap-4">
              <Input
                id="income"
                label="Monthly income (after tax)"
                type="number"
                placeholder="5,000"
                value={income}
                onChange={(e) => setIncome(e.target.value)}
              />
              <Input
                id="expenses"
                label="Monthly expenses"
                type="number"
                placeholder="3,500"
                value={expenses}
                onChange={(e) => setExpenses(e.target.value)}
              />
              <Input
                id="savings"
                label="Total savings"
                type="number"
                placeholder="25,000"
                value={savings}
                onChange={(e) => setSavings(e.target.value)}
              />
              <Button size="lg" onClick={handleQuickSetup} className="w-full mt-2">
                Calculate My Runway
              </Button>
            </div>

            <p className="text-xs text-text-tertiary mt-6 text-center">
              Encrypted and stored locally. We never see your finances.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}

function ExpenseBreakdown({ financials }: { financials: import('@/lib/db').FinancialData[] }) {
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const { toast } = useToast();

  const expenses = financials.filter((f) => f.type === 'expense' && f.category !== 'total');
  const totalFromCategories = expenses.reduce((s, e) => s + e.amount, 0);

  const handleAddCategory = async () => {
    if (!newCategory.trim() || !newAmount.trim()) return;
    const amount = parseFloat(newAmount);
    if (isNaN(amount)) return;

    await db.financialData.add({
      id: generateId(),
      type: 'expense',
      category: newCategory.trim().toLowerCase(),
      amount,
      recurring: true,
      frequency: 'monthly',
      name: newCategory.trim(),
      notes: '',
      includeInRunway: true,
      createdAt: now(),
      updatedAt: now(),
    });

    setNewCategory('');
    setNewAmount('');
    toast('Category added.', 'success');
  };

  const handleRemoveCategory = async (id: string) => {
    await db.financialData.delete(id);
  };

  const COMMON_CATEGORIES = ['Rent/Mortgage', 'Food', 'Transport', 'Insurance', 'Utilities', 'Subscriptions', 'Debt Payments', 'Entertainment'];

  return (
    <Card>
      <button
        onClick={() => setShowBreakdown(!showBreakdown)}
        className="flex items-center justify-between w-full text-left"
      >
        <CardTitle className="text-sm">Expense Breakdown</CardTitle>
        <span className="text-xs text-text-tertiary">
          {showBreakdown ? 'Hide' : expenses.length > 0 ? `${expenses.length} categories` : 'Optional'}
        </span>
      </button>

      {showBreakdown && (
        <div className="mt-4 space-y-3 animate-fade-in">
          <p className="text-xs text-text-tertiary">
            Break down your expenses by category for a clearer picture. This is optional — a single total works fine.
          </p>

          {/* Existing categories */}
          {expenses.length > 0 && (
            <div className="space-y-1.5">
              {expenses.map((exp) => (
                <div key={exp.id} className="flex items-center justify-between py-1.5 px-3 rounded-[var(--radius-sm)] bg-surface-highlight">
                  <span className="text-sm text-text-primary capitalize">{exp.name}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-mono text-text-secondary">${exp.amount.toLocaleString()}</span>
                    <button
                      onClick={() => handleRemoveCategory(exp.id)}
                      className="text-text-tertiary hover:text-danger-text text-xs transition-colors"
                      aria-label={`Remove ${exp.name}`}
                    >
                      \u00D7
                    </button>
                  </div>
                </div>
              ))}
              {expenses.length > 1 && (
                <div className="flex items-center justify-between py-1.5 px-3 border-t border-surface-border">
                  <span className="text-xs font-medium text-text-secondary">Category Total</span>
                  <span className="text-xs font-mono font-medium text-text-primary">${totalFromCategories.toLocaleString()}/mo</span>
                </div>
              )}
            </div>
          )}

          {/* Quick-add common categories */}
          <div className="flex flex-wrap gap-1">
            {COMMON_CATEGORIES.filter(
              (c) => !expenses.some((e) => e.name.toLowerCase() === c.toLowerCase())
            ).map((cat) => (
              <button
                key={cat}
                onClick={() => setNewCategory(cat)}
                className="px-2 py-0.5 text-[10px] rounded-full border border-surface-border text-text-tertiary hover:border-accent/50 hover:text-text-secondary transition-all"
              >
                + {cat}
              </button>
            ))}
          </div>

          {/* Add new */}
          <div className="flex gap-2">
            <input
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="Category name"
              className="flex-1 h-8 px-2 rounded-[var(--radius-sm)] border border-surface-border bg-bg-input text-xs text-text-primary focus:border-accent focus:outline-none"
            />
            <input
              value={newAmount}
              onChange={(e) => setNewAmount(e.target.value)}
              placeholder="$/mo"
              type="number"
              className="w-20 h-8 px-2 rounded-[var(--radius-sm)] border border-surface-border bg-bg-input text-xs text-text-primary focus:border-accent focus:outline-none"
            />
            <Button size="sm" onClick={handleAddCategory} disabled={!newCategory.trim() || !newAmount.trim()}>
              Add
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
