import React, { useState, useEffect } from 'react';
import { runAllTests, TestResult } from '../../server/tests';
import { useApp } from '../../context/AppContext';
import {
  CheckCircle2,
  XCircle,
  FlaskConical,
  Play,
  RotateCcw,
  Clock,
  ShieldCheck,
  Zap,
} from 'lucide-react';

export const TestRunnerPage: React.FC = () => {
  const { refreshData } = useApp();
  const [isRunning, setIsRunning] = useState(false);
  const [testSummary, setTestSummary] = useState<{
    total: number;
    passed: number;
    failed: number;
    results: TestResult[];
  } | null>(null);

  const executeTests = async () => {
    setIsRunning(true);
    try {
      const summary = await runAllTests();
      setTestSummary(summary);
      await refreshData();
    } catch (e) {
      console.error('Error during test execution', e);
    } finally {
      setIsRunning(false);
    }
  };

  useEffect(() => {
    executeTests();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-bold text-slate-900">
              Vitest Automated Verification Suite (Section 10 Compliance)
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Checks calculation, budget, and workflow rules in the browser. Live bills and budgets stay in Supabase.
          </p>
        </div>

        <button
          onClick={executeTests}
          disabled={isRunning}
          className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-2 transition-transform active:scale-95 disabled:bg-slate-400"
        >
          {isRunning ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Executing Tests...</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              <span>Rerun 10 Specifications</span>
            </>
          )}
        </button>
      </div>

      {/* Summary Scorecard */}
      {testSummary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold uppercase text-slate-500 block">
                Total Test Suites
              </span>
              <span className="text-2xl font-bold font-mono text-slate-900">
                {testSummary.total} / 10
              </span>
            </div>
            <div className="p-3 bg-blue-50 text-blue-700 rounded-lg">
              <Zap className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold uppercase text-slate-500 block">
                Passing Tests
              </span>
              <span className="text-2xl font-black font-mono text-emerald-600">
                {testSummary.passed}
              </span>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-700 rounded-lg">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold uppercase text-slate-500 block">
                Failed Tests
              </span>
              <span className="text-2xl font-black font-mono text-rose-600">
                {testSummary.failed}
              </span>
            </div>
            <div className="p-3 bg-rose-50 text-rose-700 rounded-lg">
              <XCircle className="w-5 h-5" />
            </div>
          </div>
        </div>
      )}

      {/* Test Results Breakdown */}
      <div className="space-y-3">
        {testSummary?.results.map((test, index) => (
          <div
            key={test.id}
            className={`p-4 rounded-xl border transition-all bg-white ${
              test.passed ? 'border-slate-200 shadow-2xs' : 'border-rose-300 bg-rose-50/40'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                {test.passed ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-500">
                      [{test.id}]
                    </span>
                    <span className="font-bold text-slate-900 text-sm">{test.name}</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border">
                      {test.category}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{test.description}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {test.durationMs.toFixed(1)} ms
                </span>
                <span
                  className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                    test.passed
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {test.passed ? 'PASSED' : 'FAILED'}
                </span>
              </div>
            </div>

            {test.details && (
              <div className="mt-3 p-2.5 bg-slate-50 border border-slate-100 rounded-lg text-xs font-mono text-slate-700">
                {test.details}
              </div>
            )}

            {test.error && (
              <div className="mt-3 p-2.5 bg-rose-100 border border-rose-300 rounded-lg text-xs font-mono text-rose-800">
                Error: {test.error}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
