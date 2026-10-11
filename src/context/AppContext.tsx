'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Department, DDO, Role, User, WorkflowConfig } from '../types';
import { api } from '../lib/api';
import { createBrowserSupabase } from '../lib/supabase/client';
import { getBootstrapAction } from '../server/actions';
import { BusyOverlay } from '../components/common/PageLoader';

interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
}

interface AppContextType {
  currentUser: User;
  setCurrentUser: (user: User) => void;
  users: User[];
  departments: Department[];
  ddos: DDO[];
  activeRole: Role;
  signInWithCredentials: (email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  refreshData: () => Promise<void>;
  resetDemoData: () => Promise<void>;
  busyMessage: string | null;
  workflowConfig: WorkflowConfig | null;
  toasts: ToastMessage[];
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [ddos, setDdos] = useState<DDO[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [workflowConfig, setWorkflowConfig] = useState<WorkflowConfig | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [bootError, setBootError] = useState<string | null>(null);
  const [busyMessage, setBusyMessage] = useState<string | null>(null);

  const addToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    setToasts((prev) => [...prev, { ...toast, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 4500);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const refreshData = useCallback(async () => {
    const result = await getBootstrapAction();
    if (result.error || !result.data) {
      const message = result.error || 'Could not load the workspace.';
      if (message.toLowerCase().includes('unauthorized') || message.toLowerCase().includes('sign in')) {
        window.location.href = '/login';
        return;
      }
      setBootError(message);
      return;
    }
    setBootError(null);
    setUsers(result.data.users);
    setDepartments(result.data.departments);
    setDdos(result.data.ddos);
    setWorkflowConfig(result.data.workflowConfig);
    setCurrentUser(result.data.currentUser);
  }, []);

  useEffect(() => {
    void refreshData();
  }, [refreshData]);

  const signInWithCredentials = useCallback(
    async (email: string, password: string) => {
      setBusyMessage('Signing in…');
      try {
        const supabase = createBrowserSupabase();
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) {
          addToast({ type: 'error', title: 'Authentication failed', message: error.message });
          return false;
        }
        await refreshData();
        router.refresh();
        return true;
      } catch (error: any) {
        addToast({ type: 'error', title: 'Authentication failed', message: error.message });
        return false;
      } finally {
        setBusyMessage(null);
      }
    },
    [addToast, refreshData, router]
  );

  const signOut = useCallback(async () => {
    const supabase = createBrowserSupabase();
    await supabase.auth.signOut();
    window.location.href = '/login';
  }, []);

  const resetDemoData = useCallback(async () => {
    setBusyMessage('Restoring demo data…');
    try {
      await api.resetDemo();
      await refreshData();
      addToast({
        type: 'success',
        title: 'Demo data restored',
        message: 'Departments, grants, bills, and the audit log are back to the seed baseline.',
      });
    } catch (error: any) {
      addToast({ type: 'error', title: 'Reset failed', message: error.message });
    } finally {
      setBusyMessage(null);
    }
  }, [addToast, refreshData]);

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900 text-white">
        <div className="text-center p-8 max-w-lg">
          {bootError ? (
            <>
              <h2 className="text-xl font-bold tracking-tight">Supabase is not ready</h2>
              <p className="text-sm text-slate-300 mt-3">{bootError}</p>
              <p className="text-xs text-slate-400 mt-4">
                Apply supabase/schema.sql in the Supabase SQL editor, set .env.local, then run npm run seed.
              </p>
            </>
          ) : (
            <>
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <h2 className="text-xl font-bold tracking-tight">Loading GBA DC-BMS...</h2>
              <p className="text-sm text-slate-400 mt-1">Connecting to Supabase</p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <AppContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        users,
        departments,
        ddos,
        activeRole: currentUser.role,
        signInWithCredentials,
        signOut,
        refreshData,
        resetDemoData,
        busyMessage,
        workflowConfig,
        toasts,
        addToast,
        removeToast,
      }}
    >
      {busyMessage && <BusyOverlay label={busyMessage} />}
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
