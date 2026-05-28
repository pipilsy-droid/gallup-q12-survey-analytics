/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { GALLUP_Q12_QUESTIONS, DEPARTMENTS, ROLES, RANKS, JOBS, Q12Question, CATEGORY_LABELS, BUS, getBuFromDepartment } from '../types';
import { ClipboardCheck, ArrowLeft, ArrowRight, CornerDownRight, CheckCircle, ShieldAlert, Sparkles, HelpCircle, Briefcase, Award, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SurveyWizardProps {
  onSurveySubmitted: () => void;
}

export default function SurveyWizard({ onSurveySubmitted }: SurveyWizardProps) {
  // Step: -1 = Welcome/Intro, 0 = Demographics, 1~20 = Questions, 21 = Comments & Review
  const [step, setStep] = useState<number>(-1);
  const [bu, setBu] = useState<string>('');
  const [department, setDepartment] = useState<string>('');
  const [role, setRole] = useState<string>('');
  const [rank, setRank] = useState<string>('');
  const [job, setJob] = useState<string>('');

  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [comment1, setComment1] = useState<string>('');
  const [comment2, setComment2] = useState<string>('');
  
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [showExplanation, setShowExplanation] = useState<boolean>(true);

  const totalSteps = GALLUP_Q12_QUESTIONS.length;

  const handleSelectScore = (questionId: string, score: number) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: score
    }));
    
    // Auto advance after short delay for optimal mobile user experience
    setTimeout(() => {
      setStep(prev => prev + 1);
    }, 250);
  };

  const handleBack = () => {
    if (step > -1) {
      setStep(prev => prev - 1);
    }
  };

  const handleNext = () => {
    if (step === -1) {
      setStep(0);
    } else if (step === 0) {
      if (!bu) {
        setErrorMessage('소속 BU를 선택해 주세요.');
        return;
      }
      if (!department) {
        setErrorMessage('브랜드(부서)를 선택해 주세요.');
        return;
      }
      if (!role) {
        setErrorMessage('직책을 선택해 주세요.');
        return;
      }
      if (!rank) {
        setErrorMessage('직급을 선택해 주세요.');
        return;
      }
      if (!job) {
        setErrorMessage('직무를 선택해 주세요.');
        return;
      }
      setErrorMessage('');
      setStep(1);
    } else if (step <= totalSteps) {
      const currentQuestionId = GALLUP_Q12_QUESTIONS[step - 1].id;
      if (!answers[currentQuestionId]) {
        setErrorMessage('점수를 선택해 주세요.');
        return;
      }
      setErrorMessage('');
      setStep(prev => prev + 1);
    } else {
      setStep(prev => prev + 1);
    }
  };

  const handleJumpToStep = (targetStep: number) => {
    setStep(targetStep);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bu || !department || !role || !rank || !job) {
      setStep(0);
      setErrorMessage('누락된 비식별 인구통계 항목이 있습니다. 설문 개시 단계를 마저 작성해 주십시오.');
      return;
    }

    // Double check completeness across Q01 ~ Q20
    const missing: string[] = [];
    GALLUP_Q12_QUESTIONS.forEach(q => {
      if (!answers[q.id]) {
        missing.push(q.id);
      }
    });

    if (missing.length > 0) {
      const firstMissingIndex = GALLUP_Q12_QUESTIONS.findIndex(q => q.id === missing[0]);
      setStep(firstMissingIndex + 1);
      setErrorMessage('답변하지 않은 설문 문항이 있어 해당 문항 페이지로 소환되었습니다.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    const joinedComment = `[유지 및 개선 희망 사항]\n${comment1}\n\n[지원 및 제거 필요 요인]\n${comment2}`.trim();

    try {
      const response = await fetch('/api/submissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bu,
          department,
          role,
          rank,
          job,
          answers,
          comment1: comment1.trim(),
          comment2: comment2.trim(),
          comment: joinedComment
        }),
      });

      if (!response.ok) {
        const errDetail = await response.json();
        throw new Error(errDetail.error || '설문 결과를 서버에 전송하는 데 실패했습니다.');
      }

      setIsCompleted(true);
      onSurveySubmitted();
    } catch (error: any) {
      setErrorMessage(error.message || '서버와의 통신이 원활하지 않습니다. 다시 시도해 주십시오.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetSurvey = () => {
    setStep(-1);
    setBu('');
    setDepartment('');
    setRole('');
    setRank('');
    setJob('');
    setAnswers({});
    setComment1('');
    setComment2('');
    setIsCompleted(false);
    setErrorMessage('');
  };

  const getScoreLabel = (score: number) => {
    switch (score) {
      case 1: return '전혀 그렇지 않다';
      case 2: return '그렇지 않다';
      case 3: return '보통이다';
      case 4: return '그렇다';
      case 5: return '매우 그렇다';
      default: return '';
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto" id="survey-wizard-container">
      <AnimatePresence mode="wait">
        {isCompleted ? (
          /* SUCCESS COMPLETED STATE */
          <motion.div
            key="completed"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="bg-white rounded-2xl p-8 md:p-12 shadow-md border border-neutral-100 text-center space-y-6"
            id="survey-completed-card"
          >
            <div className="flex justify-center">
              <div className="p-4 bg-teal-50 text-teal-600 rounded-full animate-bounce">
                <CheckCircle size={48} />
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-neutral-900 font-sans tracking-tight">수고하셨습니다. 귀한 의견이 무사히 기재되었습니다!</h2>
              <p className="text-xs text-teal-600 font-bold font-mono uppercase bg-teal-50 px-2.5 py-1 rounded inline-block">E-land Fashion employee feedback logged</p>
            </div>
            <p className="text-neutral-500 text-xs md:text-sm max-w-md mx-auto leading-relaxed">
              제출하신 이랜드패션 설문 응답은 완전 비식별 익명으로 가공되어 저장되며, 보다 주도적으로 일하고 발전을 자양받는 최선의 조직 환경 조성을 위한 통정 분석 이외로는 절대로 유수·공개되지 않습니다.
            </p>
            <button
              onClick={resetSurvey}
              className="px-6 py-3 bg-neutral-900 border border-neutral-800 text-white hover:bg-neutral-800 transition-all rounded-xl font-bold font-sans text-xs inline-flex items-center gap-1.5"
            >
              새로 설문 참여하기
            </button>
          </motion.div>
        ) : step === -1 ? (
          /* 1. WELCOME INTRO */
          <motion.div
            key="intro"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-white rounded-2xl p-8 shadow-md border border-neutral-100 space-y-6"
            id="survey-intro-card"
          >
            <div className="flex items-center gap-3">
              <span className="p-2.5 bg-teal-50 text-teal-600 rounded-xl">
                <ClipboardCheck size={28} />
              </span>
              <div>
                <h1 className="text-xl font-bold text-neutral-900 leading-tight">이랜드패션 조직 몰입도 진단 (Q20)</h1>
                <p className="text-xs text-neutral-400 font-mono tracking-tight font-bold uppercase">Q12 + Core Values Assessment</p>
              </div>
            </div>

            <div className="space-y-4 text-neutral-600 leading-relaxed text-xs md:text-sm">
              <p>
                본 설문은 글로벌 인사 혁신의 정수인 <strong>갤럽 Q12 피라미드 진단항목 17문항</strong>과 이랜드 성장을 다지는 <strong>종합 3문항</strong>으로 구성된 공식 조직 진단 도구입니다.
              </p>
              <p>
                조직구성원의 업무상 주도권 보장, 문화적 자랑, 기대 구체성 파악, 성장을 위한 코칭 유무 등 4대 동기부여 레이어인 {`'몰입 환경, 조직 정렬, 역할과 성장, 전사 로열티'`}를 다층 평가합니다.
              </p>
              <div className="p-4 bg-amber-50/50 border border-amber-100 rounded-xl flex items-start gap-3">
                <ShieldAlert className="text-amber-500 shrink-0 mt-0.5" size={18} />
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  <strong>철저한 비식별 보장:</strong> 제출하시는 정보는 부서 평의 및 AI 종합 보고서 작성을 위해서만 계산에 투입될 뿐, 개인이 누구인지는 완벽하게 가려지므로 현장에서 겪고 느끼시는 솔직한 체득 내용을 여과 없이 공유해 주시기 바랍니다.
                </p>
              </div>
            </div>

            <button
              onClick={handleNext}
              className="w-full py-4 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-1.5 text-sm"
              id="btn-start-survey"
            >
              자가 진단 개시하기
              <ArrowRight size={16} strokeWidth={2.5} />
            </button>
          </motion.div>
        ) : step === 0 ? (
          /* 2. MULTI-LEVEL LOG DEMOGRAPHICS: BRAND, ROLE, RANK, JOB */
          <motion.div
            key="demographics-step"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-white rounded-2xl p-6 md:p-8 shadow-md border border-neutral-100 space-y-6"
            id="survey-dept-card"
          >
            <div className="flex justify-between items-center pb-4 border-b border-neutral-100">
              <button
                onClick={handleBack}
                className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-neutral-600 transition-colors font-medium"
              >
                <ArrowLeft size={14} /> 처음으로
              </button>
              <span className="text-xs font-mono px-2 py-1 bg-neutral-100 text-neutral-500 rounded-md font-bold">STEP 01. 인구통계</span>
            </div>

            <div className="space-y-1">
              <h2 className="text-base font-bold text-neutral-950">기능별 조직 분석을 위한 최소 정보 기입</h2>
              <p className="text-[11px] text-neutral-400 leading-relaxed font-semibold">
                소속 브랜드와 직군 구도에 따른 몰입도 편차를 해소하고자 연동되는 비식별 정보입니다.
              </p>
            </div>

            <div className="space-y-4">
              {/* 1. 소속 BU */}
              <div className="space-y-1 text-left">
                <label className="text-[11px] font-bold text-neutral-600 block">소속 BU를 선택해주세요 *</label>
                <select
                  value={bu}
                  onChange={(e) => {
                    setBu(e.target.value);
                    setErrorMessage('');
                  }}
                  className="w-full text-xs md:text-sm bg-neutral-50 border border-neutral-200 focus:border-teal-500 focus:bg-white p-3 rounded-xl text-neutral-700 outline-none transition-all cursor-pointer font-medium"
                >
                  <option value="">-- BU 선택 --</option>
                  {BUS.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>

              {/* 2. 소속 브랜드 */}
              <div className="space-y-1 text-left">
                <label className="text-[11px] font-bold text-neutral-600 block">본인 브랜드를 선택해주세요 *</label>
                <select
                  value={department}
                  onChange={(e) => {
                    const selectedDept = e.target.value;
                    setDepartment(selectedDept);
                    if (selectedDept) {
                      setBu(getBuFromDepartment(selectedDept));
                    }
                    setErrorMessage('');
                  }}
                  className="w-full text-xs md:text-sm bg-neutral-50 border border-neutral-200 focus:border-teal-500 focus:bg-white p-3 rounded-xl text-neutral-700 outline-none transition-all cursor-pointer font-medium"
                >
                  <option value="">-- 브랜드 선택 --</option>
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              {/* 2. 본인 직책 */}
              <div className="space-y-1 text-left">
                <label className="text-[11px] font-bold text-neutral-600 block">본인 직책을 선택해주세요 *</label>
                <select
                  value={role}
                  onChange={(e) => {
                    setRole(e.target.value);
                    setErrorMessage('');
                  }}
                  className="w-full text-xs md:text-sm bg-neutral-50 border border-neutral-200 focus:border-teal-500 focus:bg-white p-3 rounded-xl text-neutral-700 outline-none transition-all cursor-pointer font-medium"
                >
                  <option value="">-- 직책 선택 --</option>
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>

              {/* 3. 본인 직급 */}
              <div className="space-y-1 text-left">
                <label className="text-[11px] font-bold text-neutral-600 block">본인 직급을 선택해주세요 *</label>
                <select
                  value={rank}
                  onChange={(e) => {
                    setRank(e.target.value);
                    setErrorMessage('');
                  }}
                  className="w-full text-xs md:text-sm bg-neutral-50 border border-neutral-200 focus:border-teal-500 focus:bg-white p-3 rounded-xl text-neutral-700 outline-none transition-all cursor-pointer font-medium"
                >
                  <option value="">-- 직급 선택 --</option>
                  {RANKS.map(k => <option key={k} value={k}>{k}</option>)}
                </select>
              </div>

              {/* 4. 본인 직무 */}
              <div className="space-y-1 text-left">
                <label className="text-[11px] font-bold text-neutral-600 block">본인의 직무를 선택해주세요 *</label>
                <select
                  value={job}
                  onChange={(e) => {
                    setJob(e.target.value);
                    setErrorMessage('');
                  }}
                  className="w-full text-xs md:text-sm bg-neutral-50 border border-neutral-200 focus:border-teal-500 focus:bg-white p-3 rounded-xl text-neutral-700 outline-none transition-all cursor-pointer font-medium"
                >
                  <option value="">-- 직무 선택 --</option>
                  {JOBS.map(j => <option key={j} value={j}>{j}</option>)}
                </select>
              </div>
            </div>

            {errorMessage && (
              <p className="text-xs text-red-500 bg-red-50 p-3 rounded-lg border border-red-100 flex items-center gap-1.5">
                ⚠ {errorMessage}
              </p>
            )}

            <button
              onClick={handleNext}
              className={`w-full py-4 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
                department && role && rank && job
                  ? 'bg-teal-600 hover:bg-teal-700 shadow-sm shadow-teal-600/15'
                  : 'bg-neutral-200 cursor-not-allowed text-neutral-400'
              }`}
            >
              진단 문항 개시하기
              <ArrowRight size={18} />
            </button>
          </motion.div>
        ) : step <= totalSteps ? (
          /* 3. EVALUATION QUESTIONS (Q01 ~ Q20) */
          (() => {
            const currentQuestion: Q12Question = GALLUP_Q12_QUESTIONS[step - 1];
            const currentScore = answers[currentQuestion.id] || 0;

            return (
              <motion.div
                key={currentQuestion.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.18 }}
                className="bg-white rounded-2xl p-6 md:p-8 shadow-md border border-neutral-100"
                id={`survey-question-${currentQuestion.id}`}
              >
                <div className="flex justify-between items-center mb-5">
                  <button
                    onClick={handleBack}
                    className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-neutral-600 transition-colors font-medium focus:outline-none"
                  >
                    <ArrowLeft size={14} /> 이전 단계
                  </button>
                  <span className="text-xs font-mono text-neutral-400 font-bold">
                    <strong className="text-neutral-700">{step}</strong> / {totalSteps}
                  </span>
                </div>

                {/* Micro progress line */}
                <div className="w-full bg-neutral-100 h-1.5 rounded-full mb-6 overflow-hidden">
                  <div
                    className="bg-teal-500 h-full transition-all duration-300"
                    style={{ width: `${(step / totalSteps) * 100}%` }}
                  ></div>
                </div>

                {/* Question Category indicator */}
                <div className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-50/50 border border-indigo-100 rounded-full text-[10px] text-indigo-600 font-bold mb-4 font-sans">
                  {CATEGORY_LABELS[currentQuestion.category]}
                </div>

                {/* Substantive Question Display */}
                <div className="mb-7">
                  <h3 className="text-sm md:text-base font-bold text-neutral-900 leading-normal font-sans tracking-tight">
                    {currentQuestion.text}
                  </h3>
                </div>

                {/* Scoring buttons */}
                <div className="flex flex-col gap-2 mb-5">
                  {[5, 4, 3, 2, 1].map(score => (
                    <button
                      key={score}
                      type="button"
                      onClick={() => handleSelectScore(currentQuestion.id, score)}
                      className={`w-full py-3 px-5 rounded-xl border text-xs md:text-sm font-semibold transition-all text-left flex justify-between items-center ${
                        currentScore === score
                          ? 'border-teal-500 bg-teal-50/80 text-teal-800 ring-2 ring-teal-500/10 font-bold'
                          : 'border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50/50 text-neutral-700'
                      }`}
                      id={`btn-score-${currentQuestion.id}-${score}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center border text-[10px] font-mono font-bold ${
                          currentScore === score ? 'bg-teal-500 text-white border-teal-500' : 'bg-neutral-100 text-neutral-500 border-neutral-200'
                        }`}>
                          {score}
                        </span>
                        <span>{getScoreLabel(score)}</span>
                      </div>
                      {currentScore === score && <span className="text-teal-600 font-bold text-[10px]">체크됨</span>}
                    </button>
                  ))}
                </div>

                {/* Context description helper */}
                {currentQuestion.description && (
                  <div className="mt-5 border-t border-neutral-100 pt-4">
                    <button
                      onClick={() => setShowExplanation(prev => !prev)}
                      className="flex items-center gap-1.5 text-[10px] text-neutral-400 hover:text-neutral-600 transition-colors font-semibold focus:outline-none mb-1.5"
                    >
                      <HelpCircle size={12} className="text-teal-500" />
                      <span>이 질문은 조직 분석에서 어떤 가치를 평가하나요?</span>
                    </button>
                    {showExplanation && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="bg-neutral-50 p-2.5 rounded-lg border border-neutral-100/80 text-[10px] text-neutral-500 leading-relaxed font-medium font-sans"
                      >
                        {currentQuestion.description}
                      </motion.div>
                    )}
                  </div>
                )}

                {errorMessage && (
                  <p className="text-[10px] text-red-500 mt-4 bg-red-50 p-2.5 rounded-lg border border-red-100">
                    ⚠ {errorMessage}
                  </p>
                )}

                {/* Quick Nav */}
                <div className="flex justify-between items-center mt-5 pt-3.5 border-t border-neutral-100">
                  <span className="text-[9px] text-neutral-400">득점 선택 시 다음 문항으로 랩독 로직이 적용됩니다.</span>
                  <button
                    onClick={handleNext}
                    disabled={!currentScore}
                    className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all flex items-center gap-1 ${
                      currentScore ? 'bg-neutral-900 text-white hover:bg-neutral-800' : 'bg-neutral-100 text-neutral-300 cursor-not-allowed'
                    }`}
                  >
                    다음 <ArrowRight size={10} />
                  </button>
                </div>
              </motion.div>
            );
          })()
        ) : (
          /* 4. FINAL COMMENTS (TWO INDIVIDUAL TEXTBOXES IN E-LAND STUDY) + BATCH REVIEW */
          <motion.div
            key="comment-review-step"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="bg-white rounded-2xl p-6 md:p-8 shadow-md border border-neutral-100"
            id="survey-submit-final-card"
          >
            <div className="flex justify-between items-center mb-5 pb-3 border-b border-neutral-100">
              <button
                onClick={handleBack}
                className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-neutral-600 transition-colors font-medium focus:outline-none"
              >
                <ArrowLeft size={14} /> 이전 단계
              </button>
              <span className="text-xs font-mono px-2 py-1 bg-teal-50 text-teal-600 rounded-md font-bold text-[10px]">최종 제출서 작성</span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Comment Box 1 */}
              <div className="space-y-2">
                <label className="text-xs md:text-sm font-bold text-neutral-800 block">
                  (서술형1) 전년 대비 업무에 몰입하기 위해 개선된 부분이나 계속해서 유지되면 좋을 것 같은 경험을 적어주십시오.
                </label>
                <textarea
                  value={comment1}
                  onChange={e => setComment1(e.target.value)}
                  placeholder="예: 예산 한도 내에서 주도적으로 비품 주문 및 개발 툴 라이선스를 교섭할 수 있도록 절차가 완화된 것이 성과 지름길이 되었습니다."
                  className="w-full h-24 p-3 border border-neutral-200 hover:border-neutral-300 focus:border-teal-500 rounded-xl text-xs md:text-sm focus:outline-none transition-all font-sans leading-relaxed"
                />
              </div>

              {/* Comment Box 2 */}
              <div className="space-y-2">
                <label className="text-xs md:text-sm font-bold text-neutral-800 block">
                  (서술형2) 업무에 몰입하기 위해 회사에서 지원해주거나 제거해줬으면 하는 영역(병목이나 장애물)이 있다면 자세하게 기재바랍니다.
                </label>
                <textarea
                  value={comment2}
                  onChange={e => setComment2(e.target.value)}
                  placeholder="예: 매장 행사 정렬을 위한 협의 양식이 지나치게 잦아 주간 공수가 소진됩니다. 본사 디자이너 피드백 주기를 단축해주세요."
                  className="w-full h-24 p-3 border border-neutral-200 hover:border-neutral-300 focus:border-teal-500 rounded-xl text-xs md:text-sm focus:outline-none transition-all font-sans leading-relaxed"
                />
              </div>

              {/* Review answers */}
              <div className="bg-neutral-50 px-4 py-4 rounded-xl border border-neutral-100 space-y-3">
                <h4 className="text-[10px] font-bold text-neutral-700 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle size={14} className="text-teal-600" />
                  <span>누락 여부 검수 ({department} / {role})</span>
                </h4>
                <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5">
                  {GALLUP_Q12_QUESTIONS.map((q, idx) => {
                    const score = answers[q.id];
                    return (
                      <button
                        key={q.id}
                        type="button"
                        onClick={() => handleJumpToStep(idx + 1)}
                        className={`py-1.5 text-center rounded-lg border text-[10px] font-mono font-bold transition-all ${
                          score
                            ? 'bg-teal-50 border-teal-200 text-teal-700 hover:bg-teal-100'
                            : 'bg-red-50 border-red-200 text-red-600 hover:bg-neutral-100'
                        }`}
                        title={`${q.id}: ${q.text}`}
                      >
                        <span className="block text-[8px] text-neutral-400">Q{String(idx + 1).padStart(2, '0')}</span>
                        <span className="text-[11px]">{score || 'X'}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {errorMessage && (
                <p className="text-xs text-red-500 bg-red-50 p-2.5 rounded-lg border border-red-100">
                  ⚠ {errorMessage}
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full py-4 text-white font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 text-sm ${
                  isSubmitting ? 'bg-neutral-400 cursor-not-allowed' : 'bg-teal-600 hover:bg-teal-700 shadow-teal-600/10 shadow-sm'
                }`}
              >
                {isSubmitting ? (
                  <>전송하는 중...</>
                ) : (
                  <>
                    <Sparkles size={15} />
                    익명 자가 진단 리포트 전송
                  </>
                )}
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
