/**
 * AdminDashboard — Q12 몰입도 분석 대시보드
 * 구글 시트 실시간 연동 + 사이드바 필터 + 몰입도 카드
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { GALLUP_Q12_QUESTIONS } from '../types';
import { RefreshCw, AlertTriangle, Users, Table2, MessageSquare, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AdminDashboardProps {
  lastUpdated: number;
}

// ── 시트 행 타입 ──────────────────────────────────────────────
interface SheetRow {
  year: number;
  perf: number;       // B열 성과몰입도
  bu: string;
  onsite: string;
  brand: string;
  role: string;
  rank: string;
  job: string;
  answers: Record<string, number>;
  comment1: string;
  comment2: string;
}

// ── BU / 직급 / 직책 그룹 ──────────────────────────────────────
const BU_GROUPS = ['캐주얼BU', '여성BU', '스포츠BU', '온라인BU', '지원부서', '기타'];
const RANK_GROUPS = ['사원~주임', '대리~과장', '차장 이상'];
const ROLE_GROUPS = ['팀원', '팀장 이상'];

function normalizeBu(raw: string): string {
  const r = (raw || '').trim();
  if (r === '캐주얼BU') return '캐주얼BU';
  if (r === '여성BU') return '여성BU';
  if (r === '스포츠BU') return '스포츠BU';
  if (r === '온라인BU') return '온라인BU';
  if (r === '지원부서') return '지원부서';
  return '기타';
}

function normalizeRole(raw: string): string {
  const r = (raw || '').trim();
  if (r.includes('팀장') || r.includes('점장') || r.includes('부점장') ||
      r.includes('브랜드장') || r.includes('부서장') || r.includes('실장')) return '팀장 이상';
  return '팀원';
}

function normalizeRank(raw: string): string {
  const r = (raw || '').trim();
  if (!r || r === '-') return '';
  if (r.includes('차장') || r.includes('부장') || r.includes('임원')) return '차장 이상';
  if (r.includes('SM1') || r.includes('SM2') || r.includes('SM3') ||
      r.includes('SM4') || r.includes('SM5') ||
      r.includes('대리') || r.includes('과장')) return '대리~과장';
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

  return lines.slice(1).reduce<SheetRow[]>((acc, r) => {
    // 컬럼: 년도(0) 성과몰입도(1) BU(2) 본사현장(3) 브랜드(4) 세부분류(5)
    //       직책(6) 직급(7) 직무(8) Q01~Q20(9~28) ... 서술형1(36) 서술형2(37)
    const yearNum = parseInt(r[0] || '');
    if (isNaN(yearNum) || yearNum < 2000) return acc;

    const perfVal = parseFloat(r[1] || '');

    const answers: Record<string, number> = {};
    let hasScore = false;
    for (let qi = 0; qi < 20; qi++) {
      const qId = `Q${String(qi + 1).padStart(2, '0')}`;
      const score = parseInt(r[9 + qi] || '');
      answers[qId] = (!isNaN(score) && score >= 1 && score <= 5) ? score : 3;
      if (!isNaN(score) && score >= 1 && score <= 5) hasScore = true;
    }
    if (!hasScore) return acc;

    const normRank = normalizeRank(r[7] || '');
    acc.push({
      year: yearNum,
      perf: isNaN(perfVal) ? 0 : perfVal,
      bu: normalizeBu(r[2] || ''),
      onsite: r[3] || '',
      brand: r[4] || '',
      role: normalizeRole(r[6] || ''),
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
  const posP = Math.round(pos / t * 100);
  const neuP = Math.round(neu / t * 100);
  return { pos: posP, neu: neuP, neg: 100 - posP - neuP };
}

function topBottomQ(rows: SheetRow[]) {
  const sorted = GALLUP_Q12_QUESTIONS.map(q => {
    const vals = rows.map(r => r.answers[q.id] || 0);
    const avg = vals.length ? Number((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2)) : 0;
    return { id: q.id, text: q.text, avg };
  }).sort((a, b) => b.avg - a.avg);
  return {
    strengths: sorted.slice(0, 3),
    opportunities: sorted.slice(3, 6),   // 4~6위: 집중 개선 대상
    weakness: sorted.slice(-3).reverse(), // 최하위 3: 약점
  };
}

// ── 경영자 진단 문장 생성 ──────────────────────────────────────
function generateDiagnostic(filtered: SheetRow[]): string {
  if (filtered.length < 5) return '선택된 데이터가 충분하지 않습니다.';

  // 가장 낮은 Q 항목
  const qAvgs = GALLUP_Q12_QUESTIONS.map(q => ({
    id: q.id, text: q.text,
    avg: filtered.reduce((s, r) => s + (r.answers[q.id] || 0), 0) / filtered.length,
  }));
  const weakQ = qAvgs.reduce((m, q) => q.avg < m.avg ? q : m, qAvgs[0]);

  // 가장 낮은 BU
  const buRows = BU_GROUPS.map(bu => {
    const rs = filtered.filter(r => r.bu === bu);
    return rs.length ? { bu, avg: avgOf(rs), n: rs.length } : null;
  }).filter(Boolean) as { bu: string; avg: number; n: number }[];
  const weakBu = buRows.length ? buRows.reduce((m, b) => b.avg < m.avg ? b : m) : null;

  // 가장 낮은 직급
  const rankRows = RANK_GROUPS.map(rank => {
    const rs = filtered.filter(r => r.rank === rank);
    return rs.length ? { rank, avg: avgOf(rs), n: rs.length } : null;
  }).filter(Boolean) as { rank: string; avg: number; n: number }[];
  const weakRank = rankRows.length ? rankRows.reduce((m, r) => r.avg < m.avg ? r : m) : null;

  const overall = avgOf(filtered);
  const shortText = weakQ.text.length > 20 ? weakQ.text.substring(0, 20) + '…' : weakQ.text;

  if (weakBu && weakRank) {
    return `📊 현재 [${weakBu.bu}]의 [${weakQ.id} ${shortText}] 점수가 ${weakQ.avg.toFixed(2)}점으로 최하위이며, [${weakRank.rank}] 직급의 개선 필요성이 가장 높습니다 — 해당 조직의 즉각적인 코칭 집중이 필요합니다.`;
  }
  if (weakBu) {
    return `📊 현재 [${weakBu.bu}]의 전반적 몰입도(${weakBu.avg.toFixed(2)}점)가 최하위이며, [${weakQ.id}] 항목 집중 개선으로 전체 평균 ${overall.toFixed(2)}점을 끌어올릴 수 있습니다.`;
  }
  return `📊 전체 평균 ${overall.toFixed(2)}점 — [${weakQ.id} ${shortText}] 항목(${weakQ.avg.toFixed(2)}점)이 가장 낮아 우선 개선이 필요합니다.`;
}

// ── 카드 데이터 타입 ───────────────────────────────────────────
interface CardData {
  title: string; subtitle: string; n: number;
  grandMean: number; prevMean: number | null;
  eng: { pos: number; neu: number; neg: number };
  prevEng?: { pos: number; neu: number; neg: number };
  strengths: { id: string; text: string; avg: number }[];
  opportunities: { id: string; text: string; avg: number }[];
  weakness: { id: string; text: string; avg: number }[];
  rank?: number;
}

function buildCard(title: string, subtitle: string, rows: SheetRow[], prevRows?: SheetRow[]): CardData {
  const { strengths, opportunities, weakness } = topBottomQ(rows);
  return {
    title, subtitle, n: rows.length,
    grandMean: avgOf(rows),
    prevMean: prevRows != null ? avgOf(prevRows) : null,
    eng: engagementOf(rows),
    prevEng: prevRows != null ? engagementOf(prevRows) : undefined,
    strengths, opportunities, weakness,
  };
}

// ── 순위 배지 ─────────────────────────────────────────────────
function RankBadge({ rank }: { rank: number }) {
  const configs: Record<number, { bg: string; color: string; label: string }> = {
    1: { bg: '#fef3c7', color: '#d97706', label: '🥇 1위' },
    2: { bg: '#f1f5f9', color: '#64748b', label: '🥈 2위' },
    3: { bg: '#fef3c7', color: '#92400e', label: '🥉 3위' },
  };
  const cfg = configs[rank] || { bg: '#f8fafc', color: '#94a3b8', label: `${rank}위` };
  return (
    <span style={{
      fontSize: '9px', fontWeight: 800, padding: '2px 7px', borderRadius: '10px',
      background: cfg.bg, color: cfg.color, whiteSpace: 'nowrap',
    }}>
      {cfg.label}
    </span>
  );
}

// ── Q12 카드 컴포넌트 ─────────────────────────────────────────
function Q12Card({ data }: { data: CardData }) {
  const diff = data.prevMean != null ? Number((data.grandMean - data.prevMean).toFixed(2)) : null;
  const meanColor = data.grandMean >= 4.0 ? '#0d9488' : data.grandMean >= 3.0 ? '#f59e0b' : '#ef4444';
  const diffColor = diff == null ? '' : diff > 0 ? '#10b981' : diff < 0 ? '#ef4444' : '#94a3b8';
  const diffLabel = diff == null ? null : diff > 0 ? `▲ +${diff}` : diff < 0 ? `▼ ${diff}` : '— 동일';

  const engBuckets = [
    { key: 'pos' as const, label: '적극몰입', color: '#10b981' },
    { key: 'neu' as const, label: '비몰입',   color: '#f59e0b' },
    { key: 'neg' as const, label: '적극비몰입', color: '#ef4444' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
      style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', display: 'flex', flexDirection: 'column' }}
    >
      {/* 헤더 */}
      <div style={{ background: '#1e293b', color: 'white', padding: '10px 14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, lineHeight: 1.3 }}>{data.title}</div>
            <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>{data.subtitle}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
            {data.rank && <RankBadge rank={data.rank} />}
            <div style={{ fontSize: '10px', color: '#64748b' }}>
              <strong style={{ color: '#cbd5e1', fontSize: '11px' }}>{data.n.toLocaleString()}명</strong>
            </div>
          </div>
        </div>
      </div>

      {/* GrandMean */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: '38px', fontWeight: 800, color: meanColor, lineHeight: 1, letterSpacing: '-1px' }}>
            {data.grandMean.toFixed(2)}
          </div>
          <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '4px' }}>Grand Mean / 5.00점</div>
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
        <div style={{ display: 'flex', height: '10px', borderRadius: '5px', overflow: 'hidden', gap: '1px', marginBottom: '6px' }}>
          <div style={{ width: `${data.eng.pos}%`, background: '#10b981', transition: 'width 0.5s' }} />
          <div style={{ width: `${data.eng.neu}%`, background: '#f59e0b', transition: 'width 0.5s' }} />
          <div style={{ width: `${data.eng.neg}%`, background: '#ef4444', transition: 'width 0.5s' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
          {engBuckets.map(({ key, label, color }) => {
            const val = data.eng[key];
            const prev = data.prevEng?.[key];
            const delta = prev != null ? val - prev : null;
            return (
              <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '9px', color, fontWeight: 700 }}>● {label}</span>
                <span style={{ fontSize: '10px', fontWeight: 700, color }}>
                  {val}%
                  {delta != null && (
                    <span style={{ fontSize: '8px', marginLeft: '4px', color: delta > 0 ? '#10b981' : delta < 0 ? '#ef4444' : '#94a3b8' }}>
                      {delta > 0 ? `▲+${delta}` : delta < 0 ? `▼${delta}` : '—'}%p
                    </span>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Strengths / Opportunities / Weakness */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', flex: 1 }}>
        {[
          { label: '💪 강점', items: data.strengths, color: '#0d9488', bg: '#f0fdfa' },
          { label: '⚡ 개선 가능', items: data.opportunities, color: '#6366f1', bg: '#eef2ff' },
          { label: '🚨 약점', items: data.weakness, color: '#ef4444', bg: '#fff1f2' },
        ].map((section, i) => (
          <div key={i} style={{
            padding: '8px 8px',
            borderRight: i < 2 ? '1px solid #f1f5f9' : 'none',
            background: section.bg,
          }}>
            <div style={{ fontSize: '9px', fontWeight: 700, color: section.color, marginBottom: '5px' }}>{section.label}</div>
            {section.items.map(s => (
              <div key={s.id} style={{ fontSize: '9px', color: '#475569', marginBottom: '3px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                  <strong style={{ color: section.color, marginRight: '2px' }}>{s.id}</strong>
                </span>
                <strong style={{ color: section.color, flexShrink: 0, fontSize: '10px' }}>{s.avg}</strong>
              </div>
            ))}
          </div>
        ))}
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
          <input type="checkbox" checked={selected.has(item)} onChange={() => toggle(item)}
            style={{ width: '13px', height: '13px', accentColor: colorClass, cursor: 'pointer', flexShrink: 0 }} />
          <span style={{ fontSize: '11px', color: '#374151', lineHeight: 1.3 }}>{item}</span>
        </label>
      ))}
    </div>
  );
}

// ── 원본 데이터 뷰 ────────────────────────────────────────────
function RawDataView({ rows }: { rows: SheetRow[] }) {
  const [subTab, setSubTab] = useState<'table' | 'comments'>('table');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;

  const totalPages = Math.ceil(rows.length / PAGE_SIZE);
  const pageRows = rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const commentRows = rows.filter(r => r.comment1.trim() || r.comment2.trim());

  return (
    <div>
      {/* 서브탭 */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        {[
          { key: 'table' as const, label: '📊 수치 데이터', icon: '표' },
          { key: 'comments' as const, label: `💬 서술형 의견 (${commentRows.length}건)`, icon: '의견' },
        ].map(t => (
          <button key={t.key} onClick={() => { setSubTab(t.key); setPage(0); }}
            style={{
              padding: '7px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer',
              fontWeight: 700, fontSize: '12px',
              background: subTab === t.key ? '#1e293b' : '#f1f5f9',
              color: subTab === t.key ? 'white' : '#64748b',
            }}>
            {t.label}
          </button>
        ))}
        <div style={{ marginLeft: 'auto', fontSize: '11px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '10px', height: '10px', background: '#d1fae5', border: '1px solid #6ee7b7', borderRadius: '2px', display: 'inline-block' }} />
          성과몰입도 ≥ 3.5 하이라이트
        </div>
      </div>

      {subTab === 'table' ? (
        <>
          {/* 테이블 */}
          <div style={{ overflowX: 'auto', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
              <thead>
                <tr style={{ background: '#1e293b', color: 'white' }}>
                  {['#', '연도', 'BU', '직급', '직책', '직무', 'Q평균', '성과몰입도', 'Q01', 'Q02', 'Q03', 'Q04', 'Q05', 'Q06', 'Q07', 'Q08', 'Q09', 'Q10', 'Q11', 'Q12'].map(h => (
                    <th key={h} style={{ padding: '7px 10px', textAlign: 'left', fontWeight: 700, fontSize: '10px', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageRows.map((r, i) => {
                  const qAvg = (Object.values(r.answers).reduce((a, b) => a + b, 0) / 20).toFixed(2);
                  const isHighPerf = r.perf >= 3.5;
                  const rowNum = page * PAGE_SIZE + i + 1;
                  return (
                    <tr key={i} style={{
                      background: isHighPerf ? '#f0fdf4' : i % 2 === 0 ? '#fafafa' : 'white',
                      borderBottom: '1px solid #f1f5f9',
                    }}>
                      <td style={{ padding: '6px 10px', color: '#94a3b8' }}>{rowNum}</td>
                      <td style={{ padding: '6px 10px', fontWeight: 600 }}>{r.year}</td>
                      <td style={{ padding: '6px 10px' }}>{r.bu}</td>
                      <td style={{ padding: '6px 10px' }}>{r.rank || '-'}</td>
                      <td style={{ padding: '6px 10px' }}>{r.role}</td>
                      <td style={{ padding: '6px 10px', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.job || '-'}</td>
                      <td style={{ padding: '6px 10px', fontWeight: 700, color: Number(qAvg) >= 4 ? '#0d9488' : Number(qAvg) >= 3 ? '#f59e0b' : '#ef4444' }}>{qAvg}</td>
                      <td style={{ padding: '6px 10px' }}>
                        {r.perf > 0 ? (
                          <span style={{ fontWeight: 700, color: isHighPerf ? '#0d9488' : '#475569' }}>
                            {r.perf.toFixed(1)} {isHighPerf ? '⭐' : ''}
                          </span>
                        ) : '-'}
                      </td>
                      {['Q01','Q02','Q03','Q04','Q05','Q06','Q07','Q08','Q09','Q10','Q11','Q12'].map(q => (
                        <td key={q} style={{ padding: '6px 10px', textAlign: 'center',
                          color: (r.answers[q] || 0) >= 4 ? '#0d9488' : (r.answers[q] || 0) >= 3 ? '#f59e0b' : '#ef4444',
                          fontWeight: 600 }}>
                          {r.answers[q] || '-'}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* 페이지네이션 */}
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginTop: '12px' }}>
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
              style={{ padding: '5px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', background: 'white', cursor: page === 0 ? 'not-allowed' : 'pointer', opacity: page === 0 ? 0.4 : 1 }}>
              <ChevronLeft size={14} />
            </button>
            <span style={{ fontSize: '12px', color: '#475569' }}>
              {page + 1} / {totalPages} 페이지 ({rows.length.toLocaleString()}건)
            </span>
            <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
              style={{ padding: '5px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', background: 'white', cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer', opacity: page >= totalPages - 1 ? 0.4 : 1 }}>
              <ChevronRight size={14} />
            </button>
          </div>
        </>
      ) : (
        /* 서술형 의견 */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '600px', overflowY: 'auto' }}>
          {commentRows.slice(0, 200).map((r, i) => {
            const isHighPerf = r.perf >= 3.5;
            return (
              <div key={i} style={{
                border: `1px solid ${isHighPerf ? '#6ee7b7' : '#e2e8f0'}`,
                borderLeft: `4px solid ${isHighPerf ? '#10b981' : '#cbd5e1'}`,
                borderRadius: '8px',
                padding: '10px 14px',
                background: isHighPerf ? '#f0fdf4' : 'white',
              }}>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '7px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '10px', background: '#1e293b', color: 'white', borderRadius: '4px', padding: '1px 7px', fontWeight: 700 }}>{r.year}년</span>
                  <span style={{ fontSize: '10px', color: '#6366f1', fontWeight: 600 }}>{r.bu}</span>
                  <span style={{ fontSize: '10px', color: '#64748b' }}>{r.rank || '-'} · {r.role}</span>
                  {r.perf > 0 && (
                    <span style={{ fontSize: '10px', fontWeight: 700, color: isHighPerf ? '#0d9488' : '#475569', marginLeft: 'auto' }}>
                      성과몰입도 {r.perf.toFixed(1)} {isHighPerf ? '⭐' : ''}
                    </span>
                  )}
                </div>
                {r.comment1 && (
                  <div style={{ marginBottom: '5px' }}>
                    <span style={{ fontSize: '9px', fontWeight: 700, color: '#0d9488' }}>📋 유지·개선 희망</span>
                    <p style={{ fontSize: '11px', color: '#374151', margin: '3px 0 0', lineHeight: 1.6 }}>{r.comment1}</p>
                  </div>
                )}
                {r.comment2 && (
                  <div>
                    <span style={{ fontSize: '9px', fontWeight: 700, color: '#f59e0b' }}>🔧 지원·제거 필요</span>
                    <p style={{ fontSize: '11px', color: '#374151', margin: '3px 0 0', lineHeight: 1.6 }}>{r.comment2}</p>
                  </div>
                )}
              </div>
            );
          })}
          {commentRows.length > 200 && (
            <div style={{ textAlign: 'center', fontSize: '11px', color: '#94a3b8', padding: '12px' }}>
              총 {commentRows.length}건 중 200건 표시 (필터 범위를 줄여 확인하세요)
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── 카드 그리드에 순위 부여 ────────────────────────────────────
function withRanks(cards: CardData[]): CardData[] {
  const sorted = [...cards].sort((a, b) => b.grandMean - a.grandMean);
  return cards.map(card => ({
    ...card,
    rank: sorted.findIndex(s => s.title === card.title) + 1,
  }));
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────
export default function AdminDashboard({ lastUpdated }: AdminDashboardProps) {
  const [rows, setRows] = useState<SheetRow[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState('');
  const [activeTab, setActiveTab] = useState<'timeline' | 'org' | 'rank' | 'raw'>('timeline');

  const [selYears, setSelYears] = useState<Set<string>>(new Set());
  const [selBus, setSelBus] = useState<Set<string>>(new Set());
  const [selRanks, setSelRanks] = useState<Set<string>>(new Set());
  const [selRoles, setSelRoles] = useState<Set<string>>(new Set());

  const availYears = useMemo(() => [...new Set(rows.map(r => String(r.year)))].sort(), [rows]);
  const availBus   = useMemo(() => BU_GROUPS.filter(g => rows.some(r => r.bu === g)), [rows]);
  const availRanks = useMemo(() => RANK_GROUPS.filter(g => rows.some(r => r.rank === g)), [rows]);
  const availRoles = useMemo(() => ROLE_GROUPS.filter(g => rows.some(r => r.role === g)), [rows]);

  const initFilters = (data: SheetRow[]) => {
    setSelYears(new Set(data.map(r => String(r.year))));
    setSelBus(new Set(BU_GROUPS.filter(g => data.some(r => r.bu === g))));
    setSelRanks(new Set(RANK_GROUPS.filter(g => data.some(r => r.rank === g))));
    setSelRoles(new Set(ROLE_GROUPS.filter(g => data.some(r => r.role === g))));
  };

  const syncSheets = useCallback(async () => {
    setIsSyncing(true); setSyncError('');
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

  const filtered = useMemo(() => rows.filter(r =>
    selYears.has(String(r.year)) &&
    selBus.has(r.bu) &&
    (r.rank ? selRanks.has(r.rank) : true) &&
    (r.role ? selRoles.has(r.role) : true)
  ), [rows, selYears, selBus, selRanks, selRoles]);

  // ── 탭별 카드 데이터 ──────────────────────────────────────
  const timelineCards = useMemo((): CardData[] => {
    const years = [...new Set(filtered.map(r => r.year))].sort();
    return withRanks(years.map((yr, i) => {
      const curr = filtered.filter(r => r.year === yr);
      const prevYr = years[i - 1];
      const prev = prevYr != null ? filtered.filter(r => r.year === prevYr) : undefined;
      return buildCard(`${yr}년`, `n=${curr.length}명`, curr, prev);
    }));
  }, [filtered]);

  const orgCards = useMemo((): CardData[] => {
    return withRanks(BU_GROUPS
      .map(bu => {
        const curr = filtered.filter(r => r.bu === bu);
        if (!curr.length) return null;
        return buildCard(bu, `n=${curr.length}명`, curr);
      }).filter(Boolean) as CardData[]);
  }, [filtered]);

  const rankCards = useMemo((): CardData[] => {
    return withRanks(RANK_GROUPS
      .map(rk => {
        const curr = filtered.filter(r => r.rank === rk);
        if (!curr.length) return null;
        return buildCard(rk, `n=${curr.length}명`, curr);
      }).filter(Boolean) as CardData[]);
  }, [filtered]);

  // ── 경영자 진단 ───────────────────────────────────────────
  const diagnostic = useMemo(() => generateDiagnostic(filtered), [filtered]);

  const tabCards = activeTab === 'timeline' ? timelineCards : activeTab === 'org' ? orgCards : rankCards;

  // ── 렌더 ─────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* 상단 헤더 */}
      <div style={{ background: '#0f172a', borderRadius: '16px 16px 0 0', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <div style={{ color: 'white', fontSize: '14px', fontWeight: 700 }}>📊 이랜드패션 Q12 몰입도 분석</div>
          <div style={{ color: '#64748b', fontSize: '10px', marginTop: '2px' }}>구글 시트 실시간 연동 · {rows.length.toLocaleString()}개 응답 로드됨</div>
        </div>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
          {([
            ['timeline', '📅 시계열'],
            ['org',      '🏢 조직별'],
            ['rank',     '🎖️ 직급별'],
            ['raw',      '🗂 원본 데이터'],
          ] as const).map(([key, label]) => (
            <button key={key} onClick={() => setActiveTab(key)}
              style={{ padding: '7px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '11px', transition: 'all 0.15s',
                background: activeTab === key ? '#0d9488' : 'rgba(255,255,255,0.08)',
                color: activeTab === key ? 'white' : '#94a3b8',
              }}>
              {label}
            </button>
          ))}
          <button onClick={syncSheets} disabled={isSyncing}
            style={{ padding: '7px 14px', borderRadius: '8px', border: 'none', cursor: isSyncing ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: '11px', display: 'flex', alignItems: 'center', gap: '5px', background: '#1e3a5f', color: '#7dd3fc' }}>
            <RefreshCw size={12} style={{ animation: isSyncing ? 'spin 1s linear infinite' : 'none' }} />
            {isSyncing ? '동기화 중...' : '시트 동기화'}
          </button>
        </div>
      </div>

      {/* 경영자 진단 배너 */}
      {filtered.length >= 5 && activeTab !== 'raw' && (
        <div style={{ background: 'linear-gradient(90deg, #1e293b 0%, #1e3a5f 100%)', padding: '10px 20px', borderLeft: '4px solid #0d9488' }}>
          <div style={{ fontSize: '10px', color: '#7dd3fc', fontWeight: 700, marginBottom: '3px' }}>🔍 경영자 진단</div>
          <div style={{ fontSize: '12px', color: '#e2e8f0', lineHeight: 1.6 }}>{diagnostic}</div>
        </div>
      )}

      <div style={{ display: 'flex', background: 'white', border: '1px solid #e2e8f0', borderTop: 'none', borderRadius: '0 0 16px 16px', minHeight: '600px' }}>
        {/* 사이드바 */}
        <div style={{ width: '210px', borderRight: '1px solid #f1f5f9', padding: '16px 14px', overflowY: 'auto', flexShrink: 0 }}>
          <div style={{ fontSize: '9px', fontWeight: 800, color: '#94a3b8', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '16px' }}>분석 범위 설정</div>
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
          {rows.length > 0 && (
            <div style={{ marginTop: '12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '10px', textAlign: 'center' }}>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#0d9488' }}>{filtered.length.toLocaleString()}</div>
              <div style={{ fontSize: '10px', color: '#16a34a' }}>명 선택됨</div>
            </div>
          )}
        </div>

        {/* 메인 콘텐츠 */}
        <div style={{ flex: 1, padding: '20px', overflowY: 'auto', minWidth: 0 }}>
          {syncError && (
            <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <AlertTriangle size={16} style={{ color: '#ef4444', flexShrink: 0, marginTop: '1px' }} />
              <div>
                <strong style={{ color: '#be123c', fontSize: '12px' }}>연동 오류</strong>
                <p style={{ fontSize: '11px', color: '#9f1239', margin: '3px 0 0' }}>{syncError}</p>
              </div>
            </div>
          )}

          {isSyncing && rows.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '300px', gap: '12px' }}>
              <div style={{ width: '36px', height: '36px', border: '3px solid #0d9488', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              <span style={{ fontSize: '13px', color: '#64748b' }}>구글 시트에서 데이터 불러오는 중...</span>
            </div>
          ) : activeTab === 'raw' ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>🗂 원본 데이터 뷰</span>
                <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
                <span style={{ fontSize: '10px', color: '#94a3b8' }}>필터 기준 {filtered.length.toLocaleString()}명</span>
              </div>
              <RawDataView rows={filtered} />
            </>
          ) : filtered.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '300px', gap: '8px' }}>
              <Users size={36} style={{ color: '#e2e8f0' }} />
              <span style={{ fontSize: '13px', color: '#94a3b8' }}>선택된 조건에 해당하는 데이터가 없습니다</span>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>
                  {activeTab === 'timeline' ? '📅 연도별 비교 분석' : activeTab === 'org' ? '🏢 BU별 조직 분석' : '🎖️ 직급별 비교 분석'}
                </span>
                <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
                <span style={{ fontSize: '10px', color: '#94a3b8' }}>전체 {filtered.length.toLocaleString()}명 기준 · Grand Mean 순 순위</span>
              </div>
              <AnimatePresence mode="wait">
                <motion.div key={activeTab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
                  {tabCards.map((card, i) => (
                    <Q12Card key={`${activeTab}-${i}`} data={card} />
                  ))}
                </motion.div>
              </AnimatePresence>
            </>
          )}
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
