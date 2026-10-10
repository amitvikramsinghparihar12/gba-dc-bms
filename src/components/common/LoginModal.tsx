import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Modal } from './Modal';
import { ShieldCheck, UserCheck, Key, Lock, Mail, CheckCircle } from 'lucide-react';
import { Role } from '../../types';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const { users, switchUser, currentUser, addToast, signInWithCredentials } = useApp();
  const [selectedUserId, setSelectedUserId] = useState(currentUser.id);
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [activeTab, setActiveTab] = useState<'quick' | 'form'>('quick');

  const handleQuickLogin = async (id: string) => {
    const ok = await switchUser(id);
    if (ok) onClose();
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await signInWithCredentials(emailInput, passwordInput);
    if (ok) {
      addToast({
        type: 'success',
        title: 'Authentication successful',
        message: emailInput.trim(),
      });
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="User Sign In & Role Simulation"
      subtitle="Authenticate with government credentials or switch between seeded corporate roles"
      maxWidth="3xl"
    >
      <div className="space-y-6">
        {/* Tab switch */}
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setActiveTab('quick')}
            className={`pb-3 px-4 text-sm font-semibold transition-colors border-b-2 flex items-center gap-2 ${
              activeTab === 'quick'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            1-Click Demo Profiles ({users.length} Seeded)
          </button>
          <button
            onClick={() => setActiveTab('form')}
            className={`pb-3 px-4 text-sm font-semibold transition-colors border-b-2 flex items-center gap-2 ${
              activeTab === 'form'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Key className="w-4 h-4" />
            Manual Credentials Login
          </button>
        </div>

        {activeTab === 'quick' ? (
          <div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800 mb-4 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 shrink-0 text-blue-600" />
              <span>
                Select any seeded user below to instantly assume their permissions, assigned DDO scope,
                and dashboard perspective.
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[420px] overflow-y-auto pr-1">
              {users.map((u) => {
                const isCurrent = currentUser.id === u.id;
                return (
                  <div
                    key={u.id}
                    onClick={() => handleQuickLogin(u.id)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                      isCurrent
                        ? 'border-blue-500 bg-blue-50/60 shadow-xs ring-1 ring-blue-500'
                        : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm">{u.name}</span>
                          {isCurrent && (
                            <span className="text-[10px] font-bold bg-blue-600 text-white px-1.5 py-0.5 rounded">
                              Active
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 font-mono mt-0.5">{u.email}</div>
                      </div>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                        {u.role}
                      </span>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                      <span>
                        {u.ddoIds.length > 0 ? `DDOs: ${u.ddoIds.join(', ')}` : 'Corporate Scope'}
                      </span>
                      <span className="font-semibold text-blue-600 hover:underline">
                        Switch &rarr;
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <form onSubmit={handleFormSubmit} className="space-y-4 max-w-md mx-auto py-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Official Government Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="e.g. ramesh.cr@gba.karnataka.gov.in"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Demo@12345"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Seeded accounts use the password Demo@12345.
              </p>
            </div>

            {/* Quick autofill helper */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs">
              <span className="font-semibold text-slate-700 block mb-1.5">
                Quick copy email addresses:
              </span>
              <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-600">
                <button
                  type="button"
                  onClick={() => setEmailInput('rajesh.admin@gba.karnataka.gov.in')}
                  className="text-left hover:text-blue-600"
                >
                  Admin: rajesh.admin@...
                </button>
                <button
                  type="button"
                  onClick={() => setEmailInput('ramesh.cr@gba.karnataka.gov.in')}
                  className="text-left hover:text-blue-600"
                >
                  Creator: ramesh.cr@...
                </button>
                <button
                  type="button"
                  onClick={() => setEmailInput('priya.vr@gba.karnataka.gov.in')}
                  className="text-left hover:text-blue-600"
                >
                  Verifier: priya.vr@...
                </button>
                <button
                  type="button"
                  onClick={() => setEmailInput('sunita.rtgs@gba.karnataka.gov.in')}
                  className="text-left hover:text-blue-600"
                >
                  RTGS: sunita.rtgs@...
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-blue-700 hover:bg-blue-800 text-white font-semibold rounded-lg text-sm shadow-xs transition-colors flex items-center justify-center gap-2"
            >
              <Lock className="w-4 h-4" />
              Sign In to DC-BMS
            </button>
          </form>
        )}
      </div>
    </Modal>
  );
};
