import React from 'react';
import { Trash2, AlertTriangle, CheckCircle2, Loader2, Database } from 'lucide-react';
import { clearAllData, seedRealData } from '../lib/db';

export default function SettingsManager() {
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isSeeding, setIsSeeding] = React.useState(false);
  const [confirmStep, setConfirmStep] = React.useState(0);
  const [status, setStatus] = React.useState<'idle' | 'success' | 'error'>('idle');

  const handleReset = async () => {
    setIsDeleting(true);
    try {
      await clearAllData();
      setStatus('success');
      setConfirmStep(0);
      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      console.error('Reset error:', error);
      setStatus('error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSeed = async () => {
    setIsSeeding(true);
    try {
      await seedRealData();
      setStatus('success');
      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      console.error('Seed error:', error);
      setStatus('error');
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100">
        <h2 className="text-2xl font-bold text-slate-900 mb-6">System Settings</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Seed Data Card */}
          <div className="p-6 bg-emerald-50 border-2 border-emerald-100 rounded-3xl space-y-4">
            <div className="flex items-start space-x-4">
              <div className="p-3 bg-emerald-100 text-emerald-600 rounded-2xl">
                <Database size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-emerald-900">Import Real Data</h3>
                <p className="text-emerald-700 text-sm mt-1">
                  Import real data for the Supermarket (Categories, Products, Suppliers, etc).
                </p>
              </div>
            </div>

            <button
              onClick={handleSeed}
              disabled={isSeeding || isDeleting}
              className="w-full flex items-center justify-center space-x-2 px-6 py-4 bg-emerald-600 text-white font-bold rounded-2xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50"
            >
              {isSeeding ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  <span>Importing...</span>
                </>
              ) : (
                <>
                  <Database size={20} />
                  <span>Import Supermarket Data</span>
                </>
              )}
            </button>
          </div>

          {/* Reset Card */}
          <div className="p-6 bg-red-50 border-2 border-red-100 rounded-3xl space-y-4">
            <div className="flex items-start space-x-4">
              <div className="p-3 bg-red-100 text-red-600 rounded-2xl">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-red-900">Reset System</h3>
                <p className="text-red-700 text-sm mt-1">
                  Warning: This action will delete all data in the system.
                </p>
              </div>
            </div>

            {status === 'success' ? (
              <div className="flex items-center space-x-2 text-emerald-600 bg-emerald-50 p-4 rounded-2xl">
                <CheckCircle2 size={20} />
                <span className="font-bold">System has been reset!</span>
              </div>
            ) : (
              <div className="flex flex-col space-y-3">
                {confirmStep === 0 ? (
                  <button
                    onClick={() => setConfirmStep(1)}
                    disabled={isSeeding}
                    className="w-full flex items-center justify-center space-x-2 px-6 py-4 bg-red-600 text-white font-bold rounded-2xl hover:bg-red-700 transition-all shadow-lg shadow-red-600/20 disabled:opacity-50"
                  >
                    <Trash2 size={20} />
                    <span>Reset All Data</span>
                  </button>
                ) : (
                  <div className="flex space-x-3">
                    <button
                      onClick={() => setConfirmStep(0)}
                      className="flex-1 py-4 bg-slate-200 text-slate-700 font-bold rounded-2xl hover:bg-slate-300 transition-all"
                    >
                      No
                    </button>
                    <button
                      onClick={handleReset}
                      disabled={isDeleting}
                      className="flex-1 flex items-center justify-center space-x-2 py-4 bg-red-600 text-white font-bold rounded-2xl hover:bg-red-700 transition-all shadow-lg shadow-red-600/20"
                    >
                      {isDeleting ? <Loader2 size={20} className="animate-spin" /> : <Trash2 size={20} />}
                      <span>Yes</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {status === 'success' && (
          <div className="mt-6 text-center animate-bounce">
            <p className="text-emerald-600 font-black uppercase tracking-widest">
              Action completed! Page is refreshing...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
