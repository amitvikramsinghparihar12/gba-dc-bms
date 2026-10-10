/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

'use client';

import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Shell } from './components/layout/Shell';
import { Dashboard } from './views/Dashboard';
import { CreatorBills } from './views/creator/CreatorBills';
import { ReviewQueue } from './views/review/ReviewQueue';
import { RtgsManager } from './views/rtgs/RtgsManager';
import { DirectorGrants } from './views/director/DirectorGrants';
import { FinanceOfficerAllocations } from './views/finance/FinanceOfficerAllocations';
import { AdminDashboard } from './views/admin/AdminDashboard';
import { TestRunnerPage } from './views/tests/TestRunnerPage';

function AppContent() {
  const { currentUser } = useApp();
  const [currentView, setCurrentView] = useState('dashboard');

  // Render content according to current view with security boundary
  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard onNavigate={setCurrentView} />;

      // Creator views
      case 'creator-bills':
        return <CreatorBills initialOpenCreate={false} />;
      case 'creator-new-bill':
        return <CreatorBills initialOpenCreate={true} />;

      // Verifier & Approver views
      case 'verifier-queue':
        return <ReviewQueue roleStage="Verifier" />;
      case 'approver-queue':
        return <ReviewQueue roleStage="Approver" />;

      // RTGS Manager views
      case 'rtgs-pending':
      case 'rtgs-history':
        return <RtgsManager />;

      // Director of Finance views
      case 'director-grants':
        return <DirectorGrants />;

      // Finance Officer views
      case 'fo-allocations':
        return <FinanceOfficerAllocations initialTab="allocations" />;
      case 'fo-requests':
        return <FinanceOfficerAllocations initialTab="requests" />;

      // Super Admin views
      case 'admin-departments':
        return <AdminDashboard initialTab="departments" />;
      case 'admin-ddos':
        return <AdminDashboard initialTab="ddos" />;
      case 'admin-vendors':
        return <AdminDashboard initialTab="vendors" />;
      case 'admin-users':
        return <AdminDashboard initialTab="users" />;
      case 'admin-workflow':
        return <AdminDashboard initialTab="workflow" />;
      case 'admin-audit':
        return <AdminDashboard initialTab="audit" />;

      // Automated Vitest Verification Suite
      case 'test-runner':
        return <TestRunnerPage />;

      default:
        return <Dashboard onNavigate={setCurrentView} />;
    }
  };

  return (
    <Shell currentView={currentView} onNavigate={setCurrentView}>
      {renderView()}
    </Shell>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
