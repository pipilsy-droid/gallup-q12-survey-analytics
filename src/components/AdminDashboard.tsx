/**
 * AdminDashboard — Gallup Q12 Analytics
 * 구글 시트 실시간 연동 + 사이드바 필터 + 갤럽 스타일 카드
 */
import React, { useState, useEffect, useCallback } from 'react';
import { GALLUP_Q12_QUESTIONS } from '../types';
import { RefreshCw, CloudDownload, AlertTriangle, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AdminDashboardProps {
  lastUpdated: number;
}

// ── 시트 행 타입 ──────────────────────────────────────────────
interface SheetRow {
  year: number;
  bu: string;
  onsite: string;  // 본사/현장
  brand: string;
  role: string;
  rank: string;
  job: string;
  answers: Record<string, number>;
  comment1: string;
  comment2: string;
}

// ── 직급 3그룹 정규화 ─────────────────────────────────────────
// 그룹: 사원~주임 | 대리~과장 | 차장 이상
// Google Sheets 데이터: 사원~주임(SM1~SM3), 대리(SM4), 과장이상(SM5이상) → 대리~과장
// 구형 데이터: 사원~주임(JM·plain) → 사원~주임
const RANK_GROUPS = ['사원~주임', '대리~과장', '차장 이상'];

function normalizeRank(raw: string): string {
  const r = (raw || '').trim();
  if (!r || r === '-') return '';
  // 차장 이상
  if (r.includes('차장') || r.includes('부장') || r.includes('임원')) return '차장 이상';
  // SM 레인지 (SM1~SM5) + 대리·과장 표기 → 대리~과장
  if (r.includes('SM1') || r.includes('SM2') || r.includes('SM3') ||
      r.includes('SM4') || r.includes('SM5') ||
      r.includes('대리') || r.includes('과장')) return '대리~과장';
  // JM 레인지 / plain 사원·주임 → 사원~주임
  if (r.includes('사원') || r.includes('주임') || r.includes('JM')) return '사원~주임';
  return '';
}

// ── 구글 시트 CSV 파서 ────────────────────────────────────────
function parseSheetCSV(text: string): SheetRow[] {
  const lines: string[][] = [];
  let row: string[] = [];
  let inQ = false, cur = '';
  for (let i = 0; i < text.length; i++) {
    const c = text[i], n = text[i + 1];
    if (c === '"') { if (inQ && n === '"') { cur += '"'; i++; } else { inQ = !inQ; } }
    else if (c === ',' && !inQ) { row.push(cur.trim()); cur = ''; }
    else if ((c === '\r' || c === '\n') && !inQ) {
      if (c === '\r' && n === '\n') i++;
      row.push(cur.trim()); cur = '';
      if (row.some(v => v !== '')) lines.push(row);
      row = [];
    } else { cur += c; }
  }
  if (cur || row.length) { row.push(cur.trim()); if (row.some(v => v !== '')) lines.push(row); }

  if (lines.length < 2) return [];
  const dataRows = lines.slice(1); // skip header

  return dataRows.reduce<SheetRow[]>((acc, r) => {
    // 컬럼: 년도(0) 성과몰입도(1) BU(2) 본사현장(3) 브랜드(4) 세부분류(5)
    //       직책(6) 직급(7) 직무(8) Q01~Q20(9~28) 기타1~7(29~35) 서술형1(36) 서술형2(37)
    const yearStr = r[0] || '';
    const yearNum = parseInt(yearStr);
    if (isNaN(yearNum) || yearNum < 2000) return acc;

    const answers: Record<string, number> = {};
    let hasScore = false;
    for (let qi = 0; qi < 20; qi++) {
      const qId = `Q${String(qi + 1).padStart(2, '0')}`;
      const val = r[9 + qi];
      const score = val && val !== '-' ? parseInt(val) : NaN;
      answers[qId] = (!isNaN(score) && score >= 1 && score <= 5) ? score : 3;
      if (!isNaN(score) && score >= 1 && score <= 5) hasScore = true;
    }
    if (!hasScore) return acc;

    const normRank = normalizeRank(r[7] || '');
    acc.push({
      year: yearNum,
      bu: r[2] || '기타',
      onsite: r[3] || '',
      brand: r[4] || '',
      role: r[6] || '팀원',
      rank: normRank,
      job: r[8] || '',
      answers,
      comment1: r[36] || '',
      comment2: r[37] || '',
    });
    return acc;
  }, []);
}

// ── 통계 헬퍼 ─────────────────────────────────────────────────
function avgOf(rows: SheetRow[]): number {
  if (!rows.length) return 0;
  let sum = 0, cnt = 0;
  rows.forEach(r => GALLUP_Q12_QUESTIONS.forEach(q => { sum += r.answers[q.id] || 0; cnt++; }));
  return cnt ? Number((sum / cnt).toFixed(2)) : 0;
}

function personAvg(r: SheetRow): number {
  const vals = GALLUP_Q12_QUESTIONS.map(q => r.answers[q.id] || 0);
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function engagementOf(rows: SheetRow[]): { pos: number; neu: number; neg: number } {
  if (!rows.length) return { pos: 0, neu: 0, neg: 0 };
  let pos = 0, neu = 0, neg = 0;
  rows.forEach(r => {
    const a = personAvg(r);
    if (a >= 4.0) pos++; else if (a >= 3.0) neu++; else neg++;
  });
  const t = rows.length;
  return { pos: Math.round(pos / t * 100), neu: Math.round(neu / t * 100), neg: 100 - Math.round(pos / t * 100) - Math.round(neu / t * 100) };
}

function topBottomQ(rows: SheetRow[]) {
  const sorted = GALLUP_Q12_QUESTIONS.map(q => {
    const vals = rows.map(r => r.answers[q.id] || 0);
    const avg = vals.length ? Number((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2)) : 0;
    return { id: q.id, text: q.text, avg };
  }).sort((a, b) => b.avg - a.avg);
  return { strengths: sorted.slice(0, 3), opportunities: sorted.slice(-3).reverse() };
}

interface CardData {
  title: string; subtitle: string; n: number;
  grandMean: number; prevMean: number | null;
  eng: { pos: number; neu: number; neg: number };
  strengths: { id: string; text: string; avg: number }[];
  opportunities: { id: string; text: string; avg: number }[];
}

function buildCard(title: string, subtitle: string, rows: SheetRow[], prevRows?: SheetRow[]): CardData {
  const { strengths, opportunities } = topBottomQ(rows);
  return {
    title, subtitle, n: rows.length,
    grandMean: avgOf(rows),
    prevMean: prevRows != null ? avgOf(prevRows) : null,
    eng: engagementOf(rows),
    strengths, opportunities,
  };
}

// ── Gallup 카드 컴포넌트 ──────────────────────────────────────
function GallupCard({ data }: { data: CardData }) {
  const diff = data.prevMean != null ? Number((data.grandMean - data.prevMean).toFixed(2)) : null;
  const meanColor = data.grandMean >= 4.0 ? '#0d9488' : data.grandMean >= 3.0 ? '#f59e0b' : '#ef4444';
  const diffColor = diff == null ? '' : diff > 0 ? '#10b981' : diff < 0 ? '#ef4444' : '#94a3b8';
  const diffLabel = diff == null ? null : diff > 0 ? `▲ +${diff}` : diff < 0 ? `▼ ${diff}` : '— 동일';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}
    >
      {/* 헤더 */}
      <div style={{ background: '#1e293b', color: 'white', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: '13px', fontWeight: 700, lineHeight: 1.3 }}>{data.title}</div>
          <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>{data.subtitle}</div>
        </div>
        <div style={{ textAlign: 'right', fontSize: '10px', color: '#64748b', flexShrink: 0, marginLeft: '8px' }}>
          Respondents<br /><strong style={{ color: '#cbd5e1', fontSize: '12px' }}>{data.n.toLocaleString()}명</strong>
        </div>
      </div>

      {/* GrandMean */}
      <div style={{ padding: '14px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: '40px', fontWeight: 800, color: meanColor, lineHeight: 1, letterSpacing: '-1px' }}>
            {data.grandMean.toFixed(2)}
          </div>
          <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '4px' }}>GrandMean / 5.00점</div>
        </div>
        {diff != null && (
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '10px', color: '#94a3b8' }}>전년 {data.prevMean?.toFixed(2)}</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: diffColor, marginTop: '2px' }}>{diffLabel}</div>
          </div>
        )}
      </div>

      {/* Engagement Index */}
      <div style={{ padding: '10px 16px', borderBottom: '1px solid #f1f5f9' }}>
        <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 600, marginBottom: '6px' }}>Engagement Index</div>
        <div style={{ display: 'flex', height: '10px', borderRadius: '5px', overflow: 'hidden', gap: '1px' }}>
          <div style={{ width: `${data.eng.pos}%`, background: '#10b981', transition: 'width 0.5s' }} />
          <div style={{ width: `${data.eng.neu}%`, background: '#f59e0b', transition: 'width 0.5s' }} />
          <div style={{ width: `${data.eng.neg}%`, background: '#ef4444', transition: 'width 0.5s' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px' }}>
          <span style={{ fontSize: '9px', color: '#10b981', fontWeight: 600 }}>● 적극몰입 {data.eng.pos}%</span>
          <span style={{ fontSize: '9px', color: '#f59e0b', fontWeight: 600 }}>● 보통 {data.eng.neu}%</span>
          <span style={{ fontSize: '9px', color: '#ef4444', fontWeight: 600 }}>● 이탈 {data.eng.neg}%</span>
        </div>
      </div>

      {/* Strengths & Opportunities */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
        <div style={{ padding: '10px 12px', borderRight: '1px solid #f1f5f9' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#0d9488', marginBottom: '6px' }}>💪 Strengths</div>
          {data.strengths.map(s => (
            <div key={s.id} style={{ fontSize: '10px', color: '#475569', marginBottom: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '4px' }}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                <strong style={{ color: '#0d9488', marginRight: '3px' }}>{s.id}</strong>{s.text}
              </span>
              <strong style={{ color: '#0d9488', flexShrink: 0 }}>{s.avg}</strong>
            </div>
          ))}
        </div>
        <div style={{ padding: '10px 12px' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#f59e0b', marginBottom: '6px' }}>⚡ Opportunities</div>
          {data.opportunities.map(o => (
            <div key={o.id} style={{ fontSize: '10px', color: '#475569', marginBottom: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '4px' }}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                <strong style={{ color: '#f59e0b', marginRight: '3px' }}>{o.id}</strong>{o.text}
              </span>
              <strong style={{ color: '#f59e0b', flexShrink: 0 }}>{o.avg}</strong>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ── 체크박스 필터 그룹 ────────────────────────────────────────
function FilterGroup({
  label, emoji, items, selected, onChange, colorClass,
}: {
  label: string; emoji: string;
  items: string[]; selected: Set<string>;
  onChange: (s: Set<string>) => void;
  colorClass: string;
}) {
  const allSelected = items.every(i => selected.has(i));
  const toggle = (val: string) => {
    const next = new Set(selected);
    next.has(val) ? next.delete(val) : next.add(val);
    onChange(next);
  };
  const toggleAll = () => onChange(allSelected ? new Set() : new Set(items));

  return (
    <div style={{ marginBottom: '18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '7px' }}>
        <span style={{ fontSize: '10px', fontWeight: 700, color: '#475569' }}>{emoji} {label}</span>
        <button onClick={toggleAll} style={{ fontSize: '9px', color: colorClass, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
          {allSelected ? '전체해제' : '전체선택'}
        </button>
      </div>
      {items.map(item => (
        <label key={item} style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '3px 0', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={selected.has(item)}
            onChange={() => toggle(item)}
            style={{ width: '13px', height: '13px', accentColor: colorClass, cursor: 'pointer', flexShrink: 0 }}
          />
          <span style={{ fontSize: '11px', color: '#374151', lineHeight: 1.3 }}>
            {item}
          </span>
        </label>
      ))}
    </div>
  );
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────
export default function AdminDashboard({ lastUpdated }: AdminDashboardProps) {
  const [rows, setRows] = useState<SheetRow[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState('');
  const [activeTab, setActiveTab] = useState<'timeline' | 'org' | 'rank'>('timeline');

  // 멀티셀렉트 필터
  const [selYears, setSelYears] = useState<Set<string>>(new Set());
  const [selBus, setSelBus] = useState<Set<string>>(new Set());
  const [selRanks, setSelRanks] = useState<Set<string>>(new Set());
  const [selRoles, setSelRoles] = useState<Set<string>>(new Set());

  // 사용 가능한 옵션
  const availYears = [...new Set(rows.map(r => String(r.year)))].sort();
  const availBus = [...new Set(rows.map(r => r.bu))].filter(Boolean).sort();
  // 직급: 고정 3그룹 순서, 데이터에 존재하는 것만
  const availRanks = RANK_GROUPS.filter(g => rows.some(r => r.rank === g));
  const availRoles = [...new Set(rows.map(r => r.role))].filter(Boolean).sort();

  // 데이터 로드 시 전체 선택으로 초기화
  const initFilters = (data: SheetRow[]) => {
    setSelYears(new Set(data.map(r => String(r.year))));
    setSelBus(new Set(data.map(r => r.bu).filter(Boolean)));
    setSelRanks(new Set(RANK_GROUPS.filter(g => data.some(r => r.rank === g))));
    setSelRoles(new Set(data.map(r => r.role).filter(Boolean)));
  };

  // 구글 시트 동기화
  const syncSheets = useCallback(async () => {
    setIsSyncing(true);
    setSyncError('');
    try {
      const res = await fetch('/api/sheets-proxy');
      if (!res.ok) throw new Error('시트 접근 실패 — 공개 공유 설정을 확인해주세요');
      const csvText = await res.text();
      const parsed = parseSheetCSV(csvText);
      if (parsed.length === 0) throw new Error('파싱된 데이터가 없습니다. 시트 구조를 확인해주세요.');
      setRows(parsed);
      initFilters(parsed);
    } catch (err: any) {
      setSyncError(err.message || '구글 시트 연동 오류');
    } finally {
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => { syncSheets(); }, [lastUpdated]);

  // 필터 적용
  const filtered = rows.filter(r =>
    selYears.has(String(r.year)) &&
    selBus.has(r.bu) &&
    (r.rank ? selRanks.has(r.rank) : true) &&
    (r.role ? selRoles.has(r.role) : true)
  );

  // ── 탭별 카드 데이터 생성 ────────────────────────────
  const timelineCards: CardData[] = (() => {
    const years = [...new Set(filtered.map(r => r.year))].sort();
    return years.map((yr, i) => {
      const curr = filtered.filter(r => r.year === yr);
      const prevYr = years[i - 1];
      const prev = prevYr != null ? filtered.filter(r => r.year === prevYr) : undefined;
      return buildCard(`${yr}년`, `n=${curr.length}`, curr, prev);
    });
  })();

  const orgCards: CardData[] = (() => {
    const bus = [...new Set(filtered.map(r => r.bu))].filter(Boolean).sort();
    return bus.map(bu => {
      const curr = filtered.filter(r => r.bu === bu);
      return buildCard(bu, `n=${curr.length}`, curr);
    });
  })();

  const rankCards: CardData[] = (() => {
    // 고정 3그룹 순서: 사원~주임 → 대리~과장 → 차장 이상
    return RANK_GROUPS
      .map(rk => {
        const curr = filtered.filter(r => r.rank === rk);
        if (curr.length === 0) return null;
        return buildCard(rk, `n=${curr.length}명`, curr);
      })
      .filter(Boolean) as CardData[];
  })();

  const tabCards = activeTab === 'timeline' ? timelineCards : activeTab === 'org' ? orgCards : rankCards;

  // ── 렌더 ───────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* 상단 헤더 바 */}
      <div style={{ background: '#0f172a', borderRadius: '16px 16px 0 0', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <div style={{ color: 'white', fontSize: '14px', fontWeight: 700 }}>📊 이랜드패션 Q12 분석 대시보드</div>
          <div style={{ color: '#64748b', fontSize: '10px', marginTop: '2px' }}>구글 시트 실시간 연동 · {rows.length.toLocaleString()}개 응답 로드됨</div>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {/* 탭 */}
          {([['timeline', '📅 시계열'], ['org', '🏢 조직별'], ['rank', '👤 직급별']] as const).map(([key, label]) => (
            <button key={key} onClick={() => setActiveTab(key)}
              style={{ padding: '7px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '12px', transition: 'all 0.15s',
                background: activeTab === key ? '#0d9488' : 'rgba(255,255,255,0.08)',
                color: activeTab === key ? 'white' : '#94a3b8',
              }}>
              {label}
            </button>
          ))}
          {/* 동기화 버튼 */}
          <button onClick={syncSheets} disabled={isSyncing}
            style={{ padding: '7px 14px', borderRadius: '8px', border: 'none', cursor: isSyncing ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: '11px', display: 'flex', alignItems: 'center', gap: '5px', background: '#1e3a5f', color: '#7dd3fc', transition: 'all 0.15s' }}>
            <RefreshCw size={12} style={{ animation: isSyncing ? 'spin 1s linear infinite' : 'none' }} />
            {isSyncing ? '동기화 중...' : '시트 동기화'}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', background: 'white', border: '1px solid #e2e8f0', borderTop: 'none', borderRadius: '0 0 16px 16px', minHeight: '600px' }}>
        {/* ── 사이드바 ── */}
        <div style={{ width: '210px', borderRight: '1px solid #f1f5f9', padding: '16px 14px', overflowY: 'auto', flexShrink: 0 }}>
          <div style={{ fontSize: '9px', fontWeight: 800, color: '#94a3b8', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '16px' }}>
            분석 범위 설정
          </div>

          {rows.length === 0 ? (
            <div style={{ fontSize: '11px', color: '#94a3b8', textAlign: 'center', marginTop: '20px' }}>
              {isSyncing ? '데이터 불러오는 중...' : '데이터 없음'}
            </div>
          ) : (
            <>
              <FilterGroup label="조사 연도" emoji="📅" items={availYears} selected={selYears} onChange={setSelYears} colorClass="#0d9488" />
              <hr style={{ border: 'none', borderTop: '1px solid #f1f5f9', margin: '4px 0 16px' }} />
              <FilterGroup label="소속 BU" emoji="🏢" items={availBus} selected={selBus} onChange={setSelBus} colorClass="#8b5cf6" />
              <hr style={{ border: 'none', borderTop: '1px solid #f1f5f9', margin: '4px 0 16px' }} />
              <FilterGroup label="직급" emoji="🎖️" items={availRanks} selected={selRanks} onChange={setSelRanks} colorClass="#f59e0b" />
              <hr style={{ border: 'none', borderTop: '1px solid #f1f5f9', margin: '4px 0 16px' }} />
              <FilterGroup label="직책" emoji="👤" items={availRoles} selected={selRoles} onChange={setSelRoles} colorClass="#3b82f6" />
            </>
          )}

          {/* 선택 표본 수 */}
          {rows.length > 0 && (
            <div style={{ marginTop: '12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '10px', textAlign: 'center' }}>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#0d9488' }}>{filtered.length.toLocaleString()}</div>
              <div style={{ fontSize: '10px', color: '#16a34a' }}>명 선택됨</div>
            </div>
          )}
        </div>

        {/* ── 메인 컨텐츠 ── */}
        <div style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
          {/* 에러 */}
          {syncError && (
            <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <AlertTriangle size={16} style={{ color: '#ef4444', flexShrink: 0, marginTop: '1px' }} />
              <div>
                <strong style={{ color: '#be123c', fontSize: '12px' }}>연동 오류</strong>
                <p style={{ fontSize: '11px', color: '#9f1239', margin: '3px 0 0' }}>{syncError}</p>
              </div>
            </div>
          )}

          {/* 로딩 */}
          {isSyncing && rows.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '300px', gap: '12px' }}>
              <div style={{ width: '36px', height: '36px', border: '3px solid #0d9488', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              <span style={{ fontSize: '13px', color: '#64748b' }}>구글 시트에서 데이터 불러오는 중...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '300px', gap: '8px' }}>
              <Users size={36} style={{ color: '#e2e8f0' }} />
              <span style={{ fontSize: '13px', color: '#94a3b8' }}>선택된 조건에 해당하는 데이터가 없습니다</span>
            </div>
          ) : (
            <>
              {/* 섹션 타이틀 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>
                  {activeTab === 'timeline' ? '📅 연도별 비교 분석' : activeTab === 'org' ? '🏢 BU별 조직 분석' : '🎖️ 직급별 비교 분석'}
                </span>
                <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
                <span style={{ fontSize: '10px', color: '#94a3b8' }}>전체 {filtered.length.toLocaleString()}명 기준</span>
              </div>

              {/* 카드 그리드 */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '14px' }}
                >
                  {tabCards.map((card, i) => (
                    <GallupCard key={`${activeTab}-${i}`} data={card} />
                  ))}
                </motion.div>
              </AnimatePresence>
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
