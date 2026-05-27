/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { SurveySubmission, GALLUP_Q12_QUESTIONS, CATEGORY_LABELS, Q12Question, getBuFromDepartment, BUS } from '../types';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import ReactMarkdown from 'react-markdown';
import {
  Users, Award, TrendingUp, AlertTriangle, Sparkles, Filter, RefreshCw, MessageSquare, Download, Calendar, ThumbsUp, Layers, Check,
  UploadCloud, FileSpreadsheet, Trash2, HelpCircle, RotateCcw, Briefcase, Star, Lightbulb, HeartHandshake
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AdminDashboardProps {
  lastUpdated: number;
}

// Custom robust CSV Parser resolving linebreaks inside quotes
function parseCSV(text: string): string[][] {
  const lines: string[][] = [];
  let row: string[] = [];
  let inQuotes = false;
  let currentVal = '';

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentVal += '"';
        i++; // skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push(currentVal.trim());
      currentVal = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      row.push(currentVal.trim());
      if (row.length > 0 && row.some(cell => cell !== '')) {
        lines.push(row);
      }
      row = [];
      currentVal = '';
    } else {
      currentVal += char;
    }
  }
  if (currentVal || row.length > 0) {
    row.push(currentVal.trim());
    if (row.some(cell => cell !== '')) {
      lines.push(row);
    }
  }
  return lines;
}

// Highly intelligent mapping algorithm matching Google Sheets / Google Forms exported CSV records
const mapCsvToSubmissions = (csvRows: string[][], importYear: string = 'auto'): any[] => {
  if (csvRows.length < 2) return [];

  const headers = csvRows[0];
  const dataRows = csvRows.slice(1);

  // Identify column indices based on E-Land Fashion sheet structure
  let buIdx = -1;
  let brandIdx = -1;
  let roleIdx = -1;
  let rankIdx = -1;
  let jobIdx = -1;

  // Search headers to find demographic column matches
  headers.forEach((h, idx) => {
    const hLower = h.toLowerCase();
    
    // Look for BU column matches
    if (buIdx === -1 && (hLower.includes('bu') || hLower === '부서' || hLower.includes('본부') || hLower.includes('business unit'))) {
      buIdx = idx;
    }
    if (brandIdx === -1 && hLower.includes('브랜드')) {
      brandIdx = idx;
    }
    if (roleIdx === -1 && hLower.includes('직책')) {
      roleIdx = idx;
    }
    if (rankIdx === -1 && hLower.includes('직급')) {
      rankIdx = idx;
    }
    if (jobIdx === -1 && hLower.includes('직무')) {
      jobIdx = idx;
    }
  });

  // Fallbacks: If buIdx is present, it shifted columns. Otherwise, default.
  if (buIdx !== -1) {
    if (brandIdx === -1) brandIdx = buIdx + 1;
  } else {
    if (brandIdx === -1) brandIdx = 1;
  }
  if (roleIdx === -1) roleIdx = brandIdx + 1;
  if (rankIdx === -1) rankIdx = roleIdx + 1;
  if (jobIdx === -1) jobIdx = rankIdx + 1;

  // Seeker matching indices for questions and narratives
  const qIndices: Record<string, number> = {};
  let comment1Idx = -1;
  let comment2Idx = -1;

  headers.forEach((h, idx) => {
    const hClean = h.trim();
    
    // Look for 서술형
    if (hClean.includes('서술형1') || hClean.includes('개선된 부') || (idx === 25 && comment1Idx === -1)) {
      comment1Idx = idx;
    }
    if (hClean.includes('서술형2') || hClean.includes('제거해줬') || hClean.includes('지원해주') || (idx === 26 && comment2Idx === -1)) {
      comment2Idx = idx;
    }

    // Seek Q01 ~ Q17
    for (let qNo = 1; qNo <= 17; qNo++) {
      const qPrefix = `${qNo}.`;
      const qPrefixSpace = `${qNo} .`;
      const qId = `Q${String(qNo).padStart(2, '0')}`;
      if (hClean.startsWith(qPrefix) || hClean.startsWith(qPrefixSpace) || (idx === qNo + 4 && qIndices[qId] === undefined)) {
        qIndices[qId] = idx;
      }
    }

    // Seek Q18 ~ Q20 (종합 1, 2, 3)
    if (hClean.includes('종합1') || hClean.includes('상품 / 서비스') || (idx === 22 && qIndices['Q18'] === undefined)) {
      qIndices['Q18'] = idx;
    }
    if (hClean.includes('종합2') || hClean.includes('좋은 직장') || (idx === 23 && qIndices['Q19'] === undefined)) {
      qIndices['Q19'] = idx;
    }
    if (hClean.includes('종합3') || hClean.includes('떠나야') || hClean.includes('생각을 한 적') || (idx === 24 && qIndices['Q20'] === undefined)) {
      qIndices['Q20'] = idx;
    }
  });

  // Fallback checks to ensure all 20 questions have assigned indices
  for (let qNo = 1; qNo <= 20; qNo++) {
    const qId = `Q${String(qNo).padStart(2, '0')}`;
    if (qIndices[qId] === undefined) {
      qIndices[qId] = qNo + 4; // Col 5 is Q1, Col 6 is Q2 ... Col 24 is Q20
    }
  }

  const list: any[] = [];
  dataRows.forEach((row) => {
    // Collect demographic ratings
    const department = row[brandIdx] ? row[brandIdx].replace(/"/g, '').trim() : '(본사)뉴발란스';
    const bu = (buIdx !== -1 && row[buIdx]) ? row[buIdx].replace(/"/g, '').trim() : getBuFromDepartment(department);
    const role = row[roleIdx] ? row[roleIdx].replace(/"/g, '').trim() : '팀원';
    const rank = row[rankIdx] ? row[rankIdx].replace(/"/g, '').trim() : '사원 - 주임(JM1~SM3)';
    const job = row[jobIdx] ? row[jobIdx].replace(/"/g, '').trim() : '영업';

    const comment1 = comment1Idx !== -1 && row[comment1Idx] ? row[comment1Idx].trim() : '';
    const comment2 = comment2Idx !== -1 && row[comment2Idx] ? row[comment2Idx].trim() : '';

    const answers: Record<string, number> = {};
    let hasScores = false;

    for (let qNo = 1; qNo <= 20; qNo++) {
      const qId = `Q${String(qNo).padStart(2, '0')}`;
      const colIdx = qIndices[qId];
      const cellVal = colIdx !== undefined && colIdx < row.length ? row[colIdx] : null;

      let score = cellVal ? parseInt(cellVal, 10) : 3;
      if (isNaN(score) || score < 1 || score > 5) {
        // Safe robust scale rating mapping
        const valLower = String(cellVal).toLowerCase();
        if (valLower.includes('매우 그렇지') || valLower.includes('전혀') || valLower === '1') score = 1;
        else if (valLower.includes('그렇지 않') || valLower === '2') score = 2;
        else if (valLower.includes('보통') || valLower === '3') score = 3;
        else if (valLower.includes('매우 그렇') || valLower === '5') score = 5;
        else if (valLower.includes('그렇다') || valLower === '4') score = 4;
        else score = 3; // default neutral
      } else {
        hasScores = true;
      }
      answers[qId] = score;
    }

    if (hasScores) {
      // Determine year allocation
      let rowYear = 2025;
      if (importYear !== 'auto') {
        rowYear = Number(importYear);
      } else {
        const timestampVal = row[0] ? String(row[0]).trim() : '';
        const yearMatch = timestampVal.match(/(20\d{2})/);
        if (yearMatch) {
          rowYear = Number(yearMatch[1]);
        } else {
          rowYear = 2025; // Default for 25년 google sheets target
        }
      }

      list.push({
        bu,
        department,
        role,
        rank,
        job,
        answers,
        comment1,
        comment2,
        submittedAt: row[0] ? new Date(row[0]).toISOString() : new Date().toISOString(),
        year: rowYear
      });
    }
  });

  return list;
};

export default function AdminDashboard({ lastUpdated }: AdminDashboardProps) {
  const [submissions, setSubmissions] = useState<SurveySubmission[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [report, setReport] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Demographics Filters
  const [yearFilter, setYearFilter] = useState<string>('전체 연도');
  const [buFilter, setBuFilter] = useState<string>('전체 BU');
  const [brandFilter, setBrandFilter] = useState<string>('전체 브랜드');
  const [roleFilter, setRoleFilter] = useState<string>('전체 직책');
  const [rankFilter, setRankFilter] = useState<string>('전체 직급');
  const [jobFilter, setJobFilter] = useState<string>('전체 직무');

  // Comparison Tabs
  const [compareTab, setCompareTab] = useState<'brand' | 'bu'>('brand');

  // CSV controls
  const [showImportZone, setShowImportZone] = useState<boolean>(false);
  const [importYear, setImportYear] = useState<string>('auto');
  const [isBulkLoading, setIsBulkLoading] = useState<boolean>(false);
  const [importNotice, setImportNotice] = useState<{ status: 'idle' | 'success' | 'detail_error'; message: string } | null>(null);

  // Fetch submissions from Database API
  const fetchSubmissions = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const response = await fetch('/api/submissions');
      if (!response.ok) {
        throw new Error('설문 데이터를 불러올 수 없습니다.');
      }
      const data = await response.json();
      setSubmissions(data);
    } catch (err: any) {
      setErrorMsg(err.message || '서버와의 통신이 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // Bulk csv import
  const handleBulkUpload = async (file: File) => {
    setIsBulkLoading(true);
    setImportNotice(null);

    try {
      const text = await file.text();
      const csvRows = parseCSV(text);
      if (csvRows.length < 2) {
        setImportNotice({
          status: 'detail_error',
          message: 'CSV 파일 행이 부족하여 파싱할 수 없습니다. 최소 1개 이상의 데이터 행과 헤더가 필요합니다.',
        });
        return;
      }

      const list = mapCsvToSubmissions(csvRows, importYear);
      if (list.length === 0) {
        setImportNotice({
          status: 'detail_error',
          message: '스마트 파서가 유효한 설문 응답 행을 찾아내지 못했습니다. 열 순조 및 헤더 명칭(브랜드, 직책 등)을 검사하십시오.',
        });
        return;
      }

      const response = await fetch('/api/submissions/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ list }),
      });

      if (!response.ok) {
        const errDetail = await response.json();
        throw new Error(errDetail.error || '대량 등록 서버 저장에 실패했습니다.');
      }

      const result = await response.json();
      setSubmissions(result.submissions);
      setImportNotice({
        status: 'success',
        message: `이랜드패션 설문 파일 분석 완료! 총 ${list.length}개의 설문 응답 성과 데이터를 성공적으로 취합하였습니다.`,
      });
    } catch (err: any) {
      setImportNotice({
        status: 'detail_error',
        message: err.message || 'CSV 파싱 및 연계 연산 처리 중 에러가 발생했습니다.',
      });
    } finally {
      setIsBulkLoading(false);
    }
  };

  // Reset mock data
  const handleResetSubmissions = async () => {
    if (!window.confirm('기존 모의 데이터 10건 상태로 복원하시겠습니까? (기존에 업로드한 데이터는 지워집니다)')) {
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch('/api/submissions/reset', { method: 'POST' });
      if (!response.ok) throw new Error('데이터 리셋 실패');
      const result = await response.json();
      setSubmissions(result.submissions);
      setImportNotice({
        status: 'success',
        message: '서비스 데모 시뮬레이션 데이터셋(대표 브랜드 수렴 10건) 상태로 정상 복원되었습니다.',
      });
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Clear all data
  const handleClearSubmissions = async () => {
    if (!window.confirm('주의! 수집된 모든 설문 데이터를 지우고 공백 상태로 진행하시겠습니까? 다운로드한 Google Sheets를 연동 연계할 때 유용합니다.')) {
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch('/api/submissions/clear', { method: 'POST' });
      if (!response.ok) throw new Error('전체 지우기 실패');
      const result = await response.json();
      setSubmissions([]);
      setImportNotice({
        status: 'success',
        message: '모든 설문 데이터가 비워졌습니다. 이제 완전히 수집 및 분석을 처음부터 개시할 수 있습니다.',
      });
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, [lastUpdated]);

  const handleGenerateReport = async () => {
    setIsAnalyzing(true);
    setErrorMsg('');
    setReport('');
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filters: {
            year: yearFilter,
            bu: buFilter,
            department: brandFilter,
            role: roleFilter,
            rank: rankFilter,
            job: jobFilter
          }
        })
      });
      if (!response.ok) {
        const errDetail = await response.json();
        throw new Error(errDetail.error || 'AI 경영 컨설팅 보고서 생성이 실패했습니다.');
      }
      const result = await response.json();
      setReport(result.report);
    } catch (err: any) {
      setErrorMsg(err.message || 'AI 기술 분석 도중 예외가 발생했습니다.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Extract demographic filter lists
  const yearList = ['전체 연도', ...new Set(submissions.map(s => String(s.year || 2025)))].sort().reverse();
  const buList = ['전체 BU', ...new Set(submissions.map(s => s.bu || getBuFromDepartment(s.department)))].sort();
  const brandList = ['전체 브랜드', ...new Set(submissions.map(s => s.department))];
  const roleList = ['전체 직책', ...new Set(submissions.map(s => s.role || '팀원'))];
  const rankList = ['전체 직급', ...new Set(submissions.map(s => s.rank || '사원 - 주임(JM1~SM3)'))];
  const jobList = ['전체 직무', ...new Set(submissions.map(s => s.job || '영업'))];

  // Apply multidimensional filter
  const filteredSubmissions = submissions.filter(sub => {
    const matchYear = yearFilter === '전체 연도' || String(sub.year || 2025) === yearFilter;
    const matchBu = buFilter === '전체 BU' || (sub.bu || getBuFromDepartment(sub.department)) === buFilter;
    const matchBrand = brandFilter === '전체 브랜드' || sub.department === brandFilter;
    const matchRole = roleFilter === '전체 직책' || (sub.role || '팀원') === roleFilter;
    const matchRank = rankFilter === '전체 직급' || (sub.rank || '사원 - 주임(JM1~SM3)') === rankFilter;
    const matchJob = jobFilter === '전체 직무' || (sub.job || '영업') === jobFilter;
    return matchYear && matchBu && matchBrand && matchRole && matchRank && matchJob;
  });

  const totalCount = filteredSubmissions.length;

  const getOverallAverage = () => {
    if (totalCount === 0) return 0;
    let sum = 0;
    filteredSubmissions.forEach(sub => {
      GALLUP_Q12_QUESTIONS.forEach(q => {
        sum += sub.answers[q.id] || 0;
      });
    });
    return Number((sum / (totalCount * GALLUP_Q12_QUESTIONS.length)).toFixed(2));
  };

  const getEngagementRate = () => {
    if (totalCount === 0) return 0;
    let positiveCount = 0;
    const totalAnswers = totalCount * GALLUP_Q12_QUESTIONS.length;
    filteredSubmissions.forEach(sub => {
      GALLUP_Q12_QUESTIONS.forEach(q => {
        const score = sub.answers[q.id] || 0;
        if (score >= 4) {
          positiveCount++;
        }
      });
    });
    return Math.round((positiveCount / totalAnswers) * 100);
  };

  const getQuestionAverages = () => {
    const sums: Record<string, number> = {};
    const counts: Record<string, number> = {};
    GALLUP_Q12_QUESTIONS.forEach(q => {
      sums[q.id] = 0;
      counts[q.id] = 0;
    });

    filteredSubmissions.forEach(sub => {
      GALLUP_Q12_QUESTIONS.forEach(q => {
        sums[q.id] += sub.answers[q.id] || 0;
        counts[q.id] += 1;
      });
    });

    return GALLUP_Q12_QUESTIONS.map((q, idx) => {
      const avg = counts[q.id] ? Number((sums[q.id] / counts[q.id]).toFixed(2)) : 0;
      return {
        id: q.id,
        shortLabel: `Q${String(idx + 1).padStart(2, '0')}`,
        fullName: q.text,
        average: avg,
        category: q.category,
      };
    }).sort((a, b) => b.average - a.average);
  };

  const questionAverages = getQuestionAverages();
  const topQuestions = [...questionAverages].slice(0, 3);
  const bottomQuestions = [...questionAverages].slice(-3).reverse();

  const getCategoryAverages = () => {
    const categories = [
      { key: 'support', label: '1. 몰입 환경' },
      { key: 'alignment', label: '2. 조직 정렬' },
      { key: 'growth', label: '3. 역할과 성장' },
      { key: 'overall', label: '4. 추천 및 잔존' },
    ];

    return categories.map(cat => {
      const qIds = GALLUP_Q12_QUESTIONS.filter(q => q.category === cat.key).map(q => q.id);
      let sum = 0;
      let count = 0;
      filteredSubmissions.forEach(sub => {
        qIds.forEach(id => {
          sum += sub.answers[id] || 0;
          count++;
        });
      });
      const avg = count ? Number((sum / count).toFixed(2)) : 0;
      return {
        subject: cat.label,
        key: cat.key,
        score: avg,
        fullMark: 5,
      };
    });
  };

  const categoryAverages = getCategoryAverages();

  const getBrandStats = () => {
    const brands = [...new Set(submissions.map(s => s.department))];
    return brands.map(b => {
      const bSubs = submissions.filter(s => s.department === b);
      let sum = 0;
      bSubs.forEach(sub => {
        GALLUP_Q12_QUESTIONS.forEach(q => {
          sum += sub.answers[q.id] || 0;
        });
      });
      const avg = bSubs.length ? Number((sum / (bSubs.length * GALLUP_Q12_QUESTIONS.length)).toFixed(2)) : 0;
      return {
        name: b.replace('(본사)', '').replace('(현장)', '').substring(0, 8),
        fullName: b,
        participants: bSubs.length,
        average: avg,
      };
    }).sort((a, b) => b.average - a.average);
  };

  const brandStats = getBrandStats();

  const getBuStats = () => {
    const bus = [...new Set(submissions.map(s => s.bu || getBuFromDepartment(s.department)))];
    return bus.map(b => {
      const bSubs = submissions.filter(s => (s.bu || getBuFromDepartment(s.department)) === b);
      let sum = 0;
      bSubs.forEach(sub => {
        GALLUP_Q12_QUESTIONS.forEach(q => {
          sum += sub.answers[q.id] || 0;
        });
      });
      const avg = bSubs.length ? Number((sum / (bSubs.length * GALLUP_Q12_QUESTIONS.length)).toFixed(2)) : 0;
      return {
        name: b,
        fullName: b,
        participants: bSubs.length,
        average: avg,
      };
    }).sort((a, b) => b.average - a.average);
  };

  const buStats = getBuStats();

  const getBarColor = (score: number) => {
    if (score >= 4.0) return '#0d9488'; // Teal
    if (score >= 3.2) return '#f59e0b'; // Amber
    return '#ef4444'; // Red
  };

  return (
    <div className="space-y-8" id="admin-dashboard-container">
      {/* Dynamic Multi-dimensional Filter Bar */}
      <div className="bg-white p-5 rounded-2xl border border-neutral-100 shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-neutral-100">
          <Filter size={16} className="text-teal-600 animate-pulse" />
          <h2 className="text-sm font-bold text-neutral-800">이랜드패션 다차원 데이터 필터 제어반</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3.5">
          {/* Survey Year Selection */}
          <div className="space-y-1">
            <label className="text-[10px] text-neutral-400 font-bold block uppercase">조사 연도</label>
            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="w-full text-xs bg-neutral-50 border border-neutral-200 hover:border-neutral-300 p-2 rounded-xl text-neutral-700 outline-none transition-all font-medium cursor-pointer font-sans"
            >
              {yearList.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          {/* BU Selection */}
          <div className="space-y-1">
            <label className="text-[10px] text-neutral-400 font-bold block uppercase">소속 BU</label>
            <select
              value={buFilter}
              onChange={(e) => setBuFilter(e.target.value)}
              className="w-full text-xs bg-neutral-50 border border-neutral-200 hover:border-neutral-300 p-2 rounded-xl text-neutral-700 outline-none transition-all font-medium cursor-pointer"
            >
              {buList.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>

          {/* Brand Selection */}
          <div className="space-y-1">
            <label className="text-[10px] text-neutral-400 font-bold block uppercase">소속 브랜드</label>
            <select
              value={brandFilter}
              onChange={(e) => setBrandFilter(e.target.value)}
              className="w-full text-xs bg-neutral-50 border border-neutral-200 hover:border-neutral-300 p-2 rounded-xl text-neutral-700 outline-none transition-all font-medium cursor-pointer"
            >
              {brandList.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>

          {/* Role Selection */}
          <div className="space-y-1">
            <label className="text-[10px] text-neutral-400 font-bold block uppercase">직책</label>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full text-xs bg-neutral-50 border border-neutral-200 hover:border-neutral-300 p-2 rounded-xl text-neutral-700 outline-none transition-all font-medium cursor-pointer"
            >
              {roleList.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          {/* Rank Selection */}
          <div className="space-y-1">
            <label className="text-[10px] text-neutral-400 font-bold block uppercase">직급</label>
            <select
              value={rankFilter}
              onChange={(e) => setRankFilter(e.target.value)}
              className="w-full text-xs bg-neutral-50 border border-neutral-200 hover:border-neutral-300 p-2 rounded-xl text-neutral-700 outline-none transition-all font-medium cursor-pointer"
            >
              {rankList.map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>

          {/* Job Selection */}
          <div className="space-y-1">
            <label className="text-[10px] text-neutral-400 font-bold block uppercase">직무</label>
            <select
              value={jobFilter}
              onChange={(e) => setJobFilter(e.target.value)}
              className="w-full text-xs bg-neutral-50 border border-neutral-200 hover:border-neutral-300 p-2 rounded-xl text-neutral-700 outline-none transition-all font-medium cursor-pointer"
            >
              {jobList.map(j => <option key={j} value={j}>{j}</option>)}
            </select>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pt-2 gap-3">
          <div className="flex items-center gap-1.5 text-[11px] text-neutral-400">
            <span>필터링된 표본 크기:</span>
            <strong className="text-neutral-800 font-bold font-mono bg-neutral-100 px-2 py-0.5 rounded text-xs">{totalCount} 명</strong>
          </div>
          <div className="flex gap-2 self-end sm:self-auto font-sans">
            <button
              onClick={() => {
                setYearFilter('전체 연도');
                setBuFilter('전체 BU');
                setBrandFilter('전체 브랜드');
                setRoleFilter('전체 직책');
                setRankFilter('전체 직급');
                setJobFilter('전체 직무');
              }}
              className="px-2.5 py-1.5 text-[10px] font-bold text-neutral-500 bg-neutral-50 hover:bg-neutral-100 rounded-lg border border-neutral-200 transition-all"
            >
              필터 초기화
            </button>
            <button
              onClick={() => setShowImportZone(!showImportZone)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all flex items-center gap-1.5 ${
                showImportZone
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-xs'
                  : 'bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50 hover:text-neutral-800'
              }`}
              id="btn-toggle-csv-zone"
            >
              <UploadCloud size={13} />
              <span>구글 폼 CSV 분석기</span>
            </button>
            <button
              onClick={fetchSubmissions}
              className="p-2 text-neutral-500 hover:text-teal-600 bg-neutral-50 hover:bg-teal-50 border border-neutral-200 rounded-lg transition-all"
              title="동기화"
            >
              <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      {/* CSV importer */}
      <AnimatePresence>
        {showImportZone && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
            key="csv-import-drawer"
          >
            <div className="bg-white rounded-2xl border border-neutral-200 p-5 md:p-6 shadow-sm space-y-5 font-sans">
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                  <FileSpreadsheet size={18} />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-neutral-900 md:text-sm">구글 설문지 결과 양식 동기화</h3>
                  <p className="text-[11px] text-neutral-500 mt-1 leading-relaxed">
                    구글 스프레드시트의 <code className="bg-neutral-100 px-1 py-0.5 rounded font-mono text-[10px] text-indigo-600">.csv</code> 결과를 업로드하면, 브랜드별, 직무별, 직급별 통계를 한눈에 시각화해 줍니다.
                  </p>
                </div>
              </div>

              {/* Instructions */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-neutral-50 p-4 rounded-xl border border-neutral-100 text-[10px] text-neutral-500">
                <div>
                  <strong className="text-neutral-700 block mb-1">1. 설문 파일 다운로드</strong>
                  스프레드시트에서 <span className="text-neutral-800 font-semibold">[파일] &gt; [다운로드] &gt; [CSV]</span>를 다운받습니다.
                </div>
                <div>
                  <strong className="text-neutral-700 block mb-1">2. 스마트 칼럼 매핑</strong>
                  시스템이 "브랜드, 직책, 직무, 질문 번호(1~17), 종합, 서술형" 항목을 교차 대조 매핑합니다.
                </div>
                <div>
                  <strong className="text-neutral-700 block mb-1">3. 실시 및 보고서 융합</strong>
                  수렴 분석 즉시 AI 보고서 및 다이어그램에 계측값들이 탑재됩니다.
                </div>
              </div>

              {/* Upload Year Selection UI */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-neutral-50/50 p-3.5 rounded-xl border border-neutral-100">
                <div className="space-y-0.5 text-left">
                  <span className="text-[11px] font-bold text-neutral-800 block">업로드 데이터 조사 연도 지정</span>
                  <span className="text-[9px] text-neutral-400 block">금번 가져오는 시트 결과물(예: 25년 구글시트 등)을 할당할 연도 메타데이터 필드입니다.</span>
                </div>
                <select
                  value={importYear}
                  onChange={(e) => setImportYear(e.target.value)}
                  className="text-[11px] bg-white border border-neutral-200 rounded-lg px-2.5 py-1.5 text-neutral-700 outline-none font-semibold cursor-pointer shadow-xs"
                >
                  <option value="auto">자동 감지 (타임스탬프 연도 기준)</option>
                  <option value="2026">2026년 (금년 설문 실시)</option>
                  <option value="2025">2025년 (구글 시트 백업 데이터)</option>
                  <option value="2024">2024년 (이전 시계열 분석용)</option>
                </select>
              </div>

              {/* Upload Input */}
              <div className="relative border-2 border-dashed border-neutral-200 hover:border-indigo-400 transition-colors rounded-xl p-6 text-center bg-neutral-50/30">
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleBulkUpload(file);
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={isBulkLoading}
                />
                <div className="flex flex-col items-center justify-center gap-2">
                  {isBulkLoading ? (
                    <>
                      <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mb-1"></div>
                      <span className="text-xs font-bold text-neutral-700">이랜드패션 설문 대용량 파싱 중...</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud size={20} className="text-neutral-400" />
                      <div>
                        <span className="text-xs font-bold text-indigo-600 hover:underline">여기를 눌러 구글 설문 결과 CSV 업로드</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {importNotice && (
                <div className={`p-4 rounded-xl border text-xs leading-relaxed ${
                  importNotice.status === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-100'
                    : 'bg-rose-50 text-rose-800 border-rose-100'
                }`}>
                  <div className="flex items-start gap-2.5">
                    {importNotice.status === 'success' ? (
                      <Check size={16} className="shrink-0 text-emerald-600" />
                    ) : (
                      <AlertTriangle size={16} className="shrink-0 text-rose-600" />
                    )}
                    <div>
                      <strong className="font-bold block">{importNotice.status === 'success' ? '업로드 수렴 성공' : '대조 실패'}</strong>
                      <span className="block mt-0.5">{importNotice.message}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Admin Database Control */}
              <div className="border-t border-neutral-100 pt-4 flex justify-between items-center gap-2">
                <div className="space-y-0.5">
                  <h4 className="text-[10px] font-bold text-neutral-700">체계 복원 및 초기화</h4>
                  <p className="text-[9px] text-neutral-400">데이터 구조를 조정하거나 일괄 지우기 처리를 수행합니다.</p>
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={handleResetSubmissions}
                    className="px-2 py-1 text-[9px] font-bold text-neutral-600 bg-white hover:bg-neutral-50 border border-neutral-200 rounded-lg transition-all flex items-center gap-1"
                  >
                    <RotateCcw size={10} />
                    <span>데모 복원</span>
                  </button>
                  <button
                    onClick={handleClearSubmissions}
                    className="px-2 py-1 text-[9px] font-bold text-red-600 bg-rose-50/50 hover:bg-rose-50 hover:text-red-700 border border-rose-100 rounded-lg transition-all flex items-center gap-1"
                  >
                    <Trash2 size={10} />
                    <span>전체 삭제</span>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-neutral-100 shadow-sm">
          <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-sm font-sans text-neutral-500">데이터 수집 지수를 산정하고 있습니다...</p>
        </div>
      ) : totalCount === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-neutral-100 shadow-sm">
          <p className="text-neutral-500 mb-4 font-sans">필터 조건과 부합하는 설문 응답자가 없습니다.</p>
          <p className="text-xs text-neutral-400 mb-6 max-w-sm mx-auto">부서원 설문을 진행하거나 상단 [구글 폼 CSV 분석기]를 통하여 데이터를 이식해 주십시오.</p>
          <button
            onClick={fetchSubmissions}
            className="px-5 py-2 text-white bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-xs rounded-xl transition-all"
          >
            데이터 동기화
          </button>
        </div>
      ) : (
        <>
          {/* STATS SUMMARY CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 참여 인원 */}
            <div className="bg-white p-5 rounded-2xl border border-neutral-100 shadow-xs flex items-center gap-4">
              <div className="p-3.5 bg-teal-50/80 text-teal-600 rounded-xl">
                <Users size={20} />
              </div>
              <div>
                <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">교차 필터 수집 임원</span>
                <span className="text-2xl font-bold font-mono text-neutral-900">{totalCount}명</span>
                <span className="text-[9px] text-teal-600 font-sans mt-0.5 block font-semibold">실시간 익명 연산 적용</span>
              </div>
            </div>

            {/* 평균 점수 */}
            <div className="bg-white p-5 rounded-2xl border border-neutral-100 shadow-xs flex items-center gap-4">
              <div className="p-3.5 bg-indigo-50/80 text-indigo-600 rounded-xl">
                <Award size={20} />
              </div>
              <div>
                <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">평균 몰입 지수 (Q20)</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold font-mono text-neutral-900">{getOverallAverage()}</span>
                  <span className="text-xs text-neutral-400 font-sans">/ 5.0</span>
                </div>
                <div className="mt-1 flex items-center gap-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${getOverallAverage() >= 4.0 ? 'bg-teal-500' : getOverallAverage() >= 3.2 ? 'bg-amber-400' : 'bg-red-500'}`}></span>
                  <span className="text-[9px] font-medium text-neutral-500">
                    {getOverallAverage() >= 4.0 ? '최우선(Favorable)' : getOverallAverage() >= 3.2 ? '중간(Moderate)' : '취약(Critical)'}
                  </span>
                </div>
              </div>
            </div>

            {/* 긍정 응답률 */}
            <div className="bg-white p-5 rounded-2xl border border-neutral-100 shadow-xs flex items-center gap-4">
              <div className="p-3.5 bg-emerald-50/80 text-emerald-600 rounded-xl">
                <TrendingUp size={20} />
              </div>
              <div>
                <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">긍정 몰입 반응률</span>
                <span className="text-2xl font-bold font-mono text-neutral-900">{getEngagementRate()}%</span>
                <span className="text-[9px] text-neutral-400 font-sans mt-0.5 block">4~5점 긍정 응답 배분</span>
              </div>
            </div>

            {/* 시급 과제 */}
            <div className="bg-white p-5 rounded-2xl border border-neutral-100 shadow-xs flex items-center gap-4">
              <div className="p-3.5 bg-rose-50/80 text-rose-600 rounded-xl">
                <AlertTriangle size={20} />
              </div>
              <div>
                <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block font-medium">최저 점수 정렬 문항</span>
                <span className="text-sm font-bold text-neutral-900 block truncate">
                  {bottomQuestions[0] ? `${bottomQuestions[0].id} 문항 (${bottomQuestions[0].average}점)` : '없음'}
                </span>
                <span className="text-[9px] text-rose-500 font-sans mt-0.5 block truncate">
                  {bottomQuestions[0] ? bottomQuestions[0].fullName : '-'}
                </span>
              </div>
            </div>
          </div>

          {/* CHARTS */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white p-5 rounded-2xl border border-neutral-100 shadow-sm lg:col-span-2 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-neutral-800 flex items-center gap-1.5">
                  <Layers className="text-teal-600" size={15} />
                  <span>문항별 종합 몰입 평균 정렬 (Q01 ~ Q20)</span>
                </h3>
                <p className="text-[10px] text-neutral-400">초록(우수, 4점 이상), 노랑(보통, 3.2~4점), 빨강(취약, 3.2점 미만)</p>
              </div>

              <div className="w-full h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={questionAverages}
                    margin={{ top: 10, right: 10, left: -25, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" />
                    <XAxis
                      dataKey="id"
                      tick={{ fontSize: 9, fill: '#737373', fontWeight: 600 }}
                      stroke="#e5e5e5"
                    />
                    <YAxis
                      domain={[0, 5]}
                      tickCount={6}
                      tick={{ fontSize: 9, fill: '#737373' }}
                      stroke="#e5e5e5"
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-white p-3 border border-neutral-100 shadow-md rounded-lg max-w-xs text-xs">
                              <p className="font-bold text-neutral-800 font-mono flex justify-between">
                                <span>{data.id} 문항</span>
                                <span className="text-teal-600">{data.average} 점</span>
                              </p>
                              <p className="text-[10px] text-neutral-500 mt-1 leading-relaxed">{data.fullName}</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="average" radius={[3, 3, 0, 0]} maxBarSize={20}>
                      {questionAverages.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={getBarColor(entry.average)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Strengths / Weaknesses summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-neutral-100">
                <div className="p-3 bg-teal-50/40 rounded-xl border border-teal-100">
                  <span className="text-[10px] text-teal-800 font-bold uppercase tracking-wider flex items-center gap-1 mb-1.5">
                    <ThumbsUp size={12} /> 강점 요인 Top 3
                  </span>
                  <ul className="text-[11px] text-neutral-700 space-y-1">
                    {topQuestions.map(q => (
                      <li key={q.id} className="truncate">
                        <strong className="font-mono text-teal-700 mr-1">[{q.id}]</strong> {q.fullName} (<span className="font-mono font-bold">{q.average}점</span>)
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-3 bg-red-50/40 rounded-xl border border-red-100">
                  <span className="text-[10px] text-red-800 font-bold uppercase tracking-wider flex items-center gap-1 mb-1.5">
                    <AlertTriangle size={12} /> 개선 과제 Top 3
                  </span>
                  <ul className="text-[11px] text-neutral-700 space-y-1">
                    {bottomQuestions.map(q => (
                      <li key={q.id} className="truncate">
                        <strong className="font-mono text-red-600 mr-1">[{q.id}]</strong> {q.fullName} (<span className="font-mono font-bold text-red-600">{q.average}점</span>)
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Radar Category Chart */}
            <div className="bg-white p-5 rounded-2xl border border-neutral-100 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-neutral-800 flex items-center gap-1.5 mb-1">
                  <Layers className="text-indigo-600" size={15} />
                  <span>이랜드패션 4대 몰입축 요약</span>
                </h3>
                <p className="text-[10px] text-neutral-400 leading-relaxed">
                  환경조성에서부터 정렬, 역할 강화, 장기 로열티(전사 추천)까지의 결속 수준입니다.
                </p>
              </div>

              <div className="w-full h-64 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="70%" data={categoryAverages}>
                    <PolarGrid stroke="#e5e5e5" />
                    <PolarAngleAxis
                      dataKey="subject"
                      tick={{ fontSize: 9, fill: '#525252', fontWeight: 600 }}
                    />
                    <PolarRadiusAxis angle={30} domain={[0, 5]} tick={{ fontSize: 8 }} />
                    <Radar
                      name="Averages"
                      dataKey="score"
                      stroke="#4f46e5"
                      fill="#4f46e5"
                      fillOpacity={0.15}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-100 text-[10px] text-neutral-600 leading-relaxed font-sans">
                <div className="grid grid-cols-2 gap-2 font-semibold">
                  {categoryAverages.map(cat => (
                    <div key={cat.key} className="flex justify-between items-center bg-white p-1.5 rounded-md border border-neutral-100">
                      <span className="truncate">{cat.subject}</span>
                      <strong className="font-mono text-indigo-600 shrink-0">{cat.score}점</strong>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* LOWER SECTION: BRANDS COMPARISON & EXPANDED COMMENTS */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Comparative analysis Card */}
            <div className="bg-white p-5 rounded-2xl border border-neutral-100 shadow-xs flex flex-col justify-between">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-neutral-800 flex items-center gap-1">
                  <span>통합 성과 비교</span>
                </h3>
                <div className="flex bg-neutral-100 p-0.5 rounded-lg border border-neutral-200 text-[10px] font-bold">
                  <button
                    onClick={() => setCompareTab('brand')}
                    className={`px-2.5 py-1 rounded-md transition-all ${compareTab === 'brand' ? 'bg-white text-neutral-800 shadow-xs' : 'text-neutral-400 hover:text-neutral-600'}`}
                  >
                    브랜드
                  </button>
                  <button
                    onClick={() => setCompareTab('bu')}
                    className={`px-2.5 py-1 rounded-md transition-all ${compareTab === 'bu' ? 'bg-white text-neutral-800 shadow-xs' : 'text-neutral-400 hover:text-neutral-600'}`}
                  >
                    BU
                  </button>
                </div>
              </div>

              <div className="space-y-3 max-h-80 overflow-y-auto pr-1 flex-1">
                {compareTab === 'brand' ? (
                  brandStats.map((item, idx) => {
                    const maxVal = Math.max(...brandStats.map(b => b.average));
                    const pct = maxVal ? (item.average / 5) * 100 : 0;
                    return (
                      <div key={item.fullName} className="space-y-1 text-xs">
                        <div className="flex justify-between font-medium">
                          <span className="flex items-center gap-1">
                            <span className="w-4 h-4 rounded-full bg-neutral-100 font-mono text-[8px] flex items-center justify-center text-neutral-500 font-bold">
                              {idx + 1}
                            </span>
                            <span className="font-bold truncate max-w-[130px]">{item.fullName}</span>
                            <span className="text-[8px] text-neutral-400">({item.participants}명)</span>
                          </span>
                          <strong className="font-mono text-neutral-700">{item.average}점</strong>
                        </div>
                        <div className="w-full bg-neutral-100 h-2 rounded-full overflow-hidden flex">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: item.average >= 4.0 ? '#0d9488' : item.average >= 3.2 ? '#f59e0b' : '#ef4444'
                            }}
                          ></div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  buStats.map((item, idx) => {
                    const maxVal = Math.max(...buStats.map(b => b.average));
                    const pct = maxVal ? (item.average / 5) * 100 : 0;
                    return (
                      <div key={item.fullName} className="space-y-1 text-xs">
                        <div className="flex justify-between font-medium">
                          <span className="flex items-center gap-1">
                            <span className="w-4 h-4 rounded-full bg-neutral-100 font-mono text-[8px] flex items-center justify-center text-neutral-500 font-bold">
                              {idx + 1}
                            </span>
                            <span className="font-bold truncate max-w-[130px]">{item.fullName}</span>
                            <span className="text-[8px] text-neutral-400">({item.participants}명)</span>
                          </span>
                          <strong className="font-mono text-neutral-700">{item.average}점</strong>
                        </div>
                        <div className="w-full bg-neutral-100 h-2 rounded-full overflow-hidden flex">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: item.average >= 4.0 ? '#0d9488' : item.average >= 3.2 ? '#f59e0b' : '#ef4444'
                            }}
                          ></div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Split comments board */}
            <div className="bg-white p-5 rounded-2xl border border-neutral-100 shadow-xs lg:col-span-2 flex flex-col justify-between">
              <h3 className="text-sm font-bold text-neutral-800 flex items-center gap-1.5 mb-1">
                <MessageSquare size={15} />
                <span>현장 서술 피드백 보드 (다차원 필터링 수렴)</span>
              </h3>
              <p className="text-[10px] text-neutral-400 mb-4">입력 및 분기된 유지개선의견(서술형1)과 지원치우심의견(서술형2)을 모아 보여줍니다.</p>

              <div className="space-y-3 max-h-80 overflow-y-auto pr-1 flex-1">
                {filteredSubmissions.filter(s => s.comment1 || s.comment2 || s.comment).length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-neutral-100 rounded-xl text-xs text-neutral-400">
                    필터링된 이랜드 구성원의 서술 피드백이 없습니다.
                  </div>
                ) : (
                  filteredSubmissions
                    .filter(s => s.comment1 || s.comment2 || s.comment)
                    .map(sub => (
                      <div key={sub.id} className="p-3.5 bg-neutral-50 border border-neutral-100 rounded-xl hover:bg-neutral-100 transition-all text-xs space-y-2">
                        <div className="flex justify-between items-center">
                          <div className="flex flex-wrap gap-1">
                            <span className="px-1.5 py-0.5 bg-neutral-200 text-neutral-600 font-bold rounded text-[8px]">{sub.department}</span>
                            <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 font-bold rounded text-[8px]">{sub.role}</span>
                            <span className="px-1.5 py-0.5 bg-neutral-100 text-neutral-500 font-bold rounded text-[8px]">{sub.rank}</span>
                          </div>
                          <span className="text-[8px] text-neutral-400 font-mono italic">
                            {new Date(sub.submittedAt).toLocaleDateString()}
                          </span>
                        </div>

                        {/* Rendering separate E-Land comment boxes if present */}
                        {sub.comment1 ? (
                          <div className="bg-white p-2.5 rounded-lg border border-neutral-200/50 space-y-1">
                            <span className="text-[9px] text-teal-700 font-bold flex items-center gap-1">
                              <Lightbulb size={10} /> 💡 유지 및 개선 희망 사항 (서술형1)
                            </span>
                            <p className="text-neutral-700 font-medium leading-relaxed">{sub.comment1}</p>
                          </div>
                        ) : null}

                        {sub.comment2 ? (
                          <div className="bg-white p-2.5 rounded-lg border border-neutral-200/50 space-y-1">
                            <span className="text-[9px] text-rose-700 font-bold flex items-center gap-1">
                              <HeartHandshake size={10} /> ⚠️ 제거 및 회사 지원 요청 (서술형2)
                            </span>
                            <p className="text-neutral-700 font-medium leading-relaxed">{sub.comment2}</p>
                          </div>
                        ) : null}

                        {/* Legacy submissions backward compatibility */}
                        {!sub.comment1 && !sub.comment2 && sub.comment ? (
                          <div className="bg-white p-2.5 rounded-lg border border-neutral-200/50">
                            <p className="text-neutral-700 font-medium leading-relaxed">{sub.comment}</p>
                          </div>
                        ) : null}
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>

          {/* AI CONSULTATION REPORT (GEMINI) */}
          <div className="bg-neutral-900 rounded-2xl p-6 shadow-md border border-neutral-800 text-white" id="gemini-report-panel">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-5 border-b border-neutral-800">
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-indigo-505/20 text-indigo-400 bg-indigo-500/10 rounded-xl shrink-0 mt-0.5">
                  <Sparkles size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold font-sans">Gemini AI 이랜드패션 전문 진단서</h3>
                    <span className="px-1.5 py-0.5 bg-indigo-600 text-white font-semibold text-[8px] rounded-sm font-sans">SPECIALIST v3.5-FLASH</span>
                  </div>
                  <p className="text-[11px] text-neutral-400 mt-1 leading-relaxed">
                    20개 조사항목 통계와 다자 분류 정성 의견들을 취합하여, 실천적 액션 플랜과 경영 전략 조언을 도출합니다.
                  </p>
                </div>
              </div>

              <button
                onClick={handleGenerateReport}
                disabled={isAnalyzing}
                className={`py-3 px-5 text-xs font-bold rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 self-start md:self-auto ${
                  isAnalyzing
                    ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                }`}
              >
                {isAnalyzing ? (
                  <>
                    <div className="w-3 h-3 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
                    조직 정보 연합체 계산 중...
                  </>
                ) : (
                  <>
                    <Sparkles size={14} className="animate-pulse" />
                    AI 피드백 보고서 소환하기
                  </>
                )}
              </button>
            </div>

            <AnimatePresence mode="wait">
              {isAnalyzing ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="py-12 flex flex-col items-center text-center space-y-4"
                  key="ai-loading"
                >
                  <div className="p-4 bg-indigo-500/10 rounded-full animate-pulse text-indigo-400">
                    <Sparkles size={36} className="animate-spin duration-3000" />
                  </div>
                  <div className="space-y-1 font-sans">
                    <p className="text-sm font-bold text-neutral-200">전략 가이드북 마감 중...</p>
                    <p className="text-[11px] text-neutral-400 max-w-sm leading-relaxed">
                      "데이터와 서술 의견을 교차 해석해 BU 리더들이 다음 주 월요일 즉시 실행할 수 있는 필살 매뉴얼을 수렴 중입니다."
                    </p>
                  </div>
                </motion.div>
              ) : report ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-neutral-950/40 rounded-xl p-5 md:p-6 border border-neutral-800 prose prose-invert prose-xs md:prose-sm max-w-none text-neutral-300 overflow-x-auto leading-relaxed"
                  key="ai-report"
                >
                  <div className="flex justify-between items-center mb-4 pb-3 border-b border-neutral-800 no-prose">
                    <span className="text-[10px] text-indigo-400 font-mono font-bold flex items-center gap-1">
                      <Check size={12} /> MARKS TO EXECUTIVE SUMMARY READY
                    </span>
                    <button
                      onClick={() => {
                        const blob = new Blob([report], { type: 'text/markdown;charset=utf-8' });
                        const link = document.createElement('a');
                        link.href = URL.createObjectURL(blob);
                        link.download = `E-Land_Fashion_AI_Engagement_Report_${new Date().toISOString().split('T')[0]}.md`;
                        link.click();
                      }}
                      className="px-2.5 py-1 text-[10px] bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-md border border-neutral-700 transition-colors flex items-center gap-1"
                    >
                      <Download size={10} /> 보고서 저장 (.md)
                    </button>
                  </div>
                  <div className="markdown-body font-sans">
                    <ReactMarkdown>{report}</ReactMarkdown>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="py-10 text-center text-xs text-neutral-500 border border-dashed border-neutral-800 rounded-xl flex flex-col items-center justify-center gap-2"
                  key="ai-empty"
                >
                  <span>위의 생성 단추를 누르면 브랜드 및 부서 통계를 수렴하여 작성한 완성체 AI 조언 리포트가 여기에 기재됩니다.</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </>
      )}

      {errorMsg && (
        <div className="p-4 bg-red-950/40 text-red-400 border border-red-900 rounded-xl text-xs flex items-start gap-2.5">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <div>
            <strong className="block font-bold">진단 오류</strong>
            <span className="mt-0.5 leading-relaxed block">{errorMsg}</span>
          </div>
        </div>
      )}
    </div>
  );
}
