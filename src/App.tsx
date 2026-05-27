/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import SurveyWizard from './components/SurveyWizard';
import AdminDashboard from './components/AdminDashboard';
import GallupGuide from './components/GallupGuide';
import { ClipboardCheck, LayoutDashboard, Shield, AlertCircle, HelpCircle, BookOpen } from 'lucide-react';
import { motion } from 'motion/react';

export default function App() {
  // Navigation tabs: 'survey' | 'admin' | 'guide'
  const [activeTab, setActiveTab] = useState<'survey' | 'admin' | 'guide'>('survey');
  const [lastUpdated, setLastUpdated] = useState<number>(Date.now());

  const handleSurveySubmitted = () => {
    // Notify admin dashboard to invalidate caches & fetch new results
    setLastUpdated(Date.now());
  };

  return (
    <div className="min-h-screen bg-neutral-50/50 pb-20 font-sans text-neutral-800 antialiased" id="app-root-workflow">
      {/* Upper Navigation Bar */}
      <header className="sticky top-0 z-40 w-full border-b border-neutral-200/80 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 md:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-indigo-600 text-white shadow-sm">
              <ClipboardCheck size={20} />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-neutral-900 md:text-base">
                Gallup Q12 몰입도 진단 시스템
              </h1>
              <p className="hidden text-[10px] font-medium text-neutral-400 font-mono sm:block">
                Employee Engagement Index & Diagnostics
              </p>
            </div>
          </div>

          {/* Toggle Tab Buttons with nice slider accent */}
          <nav className="flex items-center gap-1.5 rounded-xl bg-neutral-100 p-1">
            <button
              onClick={() => setActiveTab('survey')}
              className={`relative flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold leading-none rounded-lg transition-all ${
                activeTab === 'survey'
                  ? 'bg-white text-teal-800 shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-800'
              }`}
              id="tab-survey-trigger"
            >
              <ClipboardCheck size={14} className={activeTab === 'survey' ? 'text-teal-600' : ''} />
              <span>직원 설문조사</span>
            </button>
            <button
              onClick={() => setActiveTab('admin')}
              className={`relative flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold leading-none rounded-lg transition-all ${
                activeTab === 'admin'
                  ? 'bg-white text-indigo-900 shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-800'
              }`}
              id="tab-admin-trigger"
            >
              <LayoutDashboard size={14} className={activeTab === 'admin' ? 'text-indigo-600' : ''} />
              <span>결과 분석실</span>
            </button>
            <button
              onClick={() => setActiveTab('guide')}
              className={`relative flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold leading-none rounded-lg transition-all ${
                activeTab === 'guide'
                  ? 'bg-white text-purple-900 shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-800'
              }`}
              id="tab-guide-trigger"
            >
              <BookOpen size={14} className={activeTab === 'guide' ? 'text-purple-600' : ''} />
              <span>Q12 개념</span>
            </button>
          </nav>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-5xl px-4 py-8 md:px-6">
        {/* Dynamic Warning Alert Banner about confidentiality (Only shown for first time viewers) */}
        {activeTab === 'survey' && (
          <div className="mb-8 flex items-start gap-3 rounded-2xl border border-neutral-200/60 bg-white p-4 shadow-xs" id="anonymous-banner">
            <div className="p-1.5 bg-neutral-50 text-neutral-500 rounded-lg">
              <Shield size={16} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-neutral-800">보안 통계 처리 시스템 (Confidentiality Guaranteed)</h4>
              <p className="mt-0.5 text-[11px] text-neutral-500 leading-relaxed font-sans">
                본 사이트에서 제출하는 답변은 모두 암호화되어 취합되며, 전사 분석가 및 회람자 화면에서는 개별 인물의 정보가 드러나지 않고 부서 단위 통계 및 전사 요약 결과만 분석됩니다. 마음 편히 솔직하게 답변해 주시기 바랍니다.
              </p>
            </div>
          </div>
        )}

        {/* Dynamic component routing */}
        <div id="dynamic-workflow-mount-point">
          {activeTab === 'survey' ? (
            <SurveyWizard onSurveySubmitted={handleSurveySubmitted} />
          ) : activeTab === 'admin' ? (
            <AdminDashboard lastUpdated={lastUpdated} />
          ) : (
            <GallupGuide />
          )}
        </div>
      </main>

      {/* Corporate Footnote */}
      <footer className="mx-auto max-w-5xl mt-12 px-4 text-center border-t border-neutral-200/50 pt-6 text-[10px] text-neutral-400 font-sans leading-relaxed">
        <p>
          주식회사 조직문화혁신센터 | 갤럽 Q12(Gallup Q12)는 Gallup, Inc.의 등록 및 독점 자산에 기반한 조직 정렬 지표입니다.
        </p>
        <p className="mt-1 font-mono">
          © 2026 Gallup Q12 Enterprise Engagement Dashboard. All Rights Reserved. Securing Anonymity and Privacy.
        </p>
      </footer>
    </div>
  );
}
