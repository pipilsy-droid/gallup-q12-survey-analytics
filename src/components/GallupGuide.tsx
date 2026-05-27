/**
 * GallupGuide — Q12 개념 설명 페이지
 */
import React, { useState } from 'react';
import { motion } from 'motion/react';

// ─── 12문항 상세 데이터 ────────────────────────────────────────
const Q_DETAILS = [
  {
    id: 'Q01', group: '기본 Needs', groupColor: '#6366f1',
    title: '나는 직장에서 나에게 기대되는 바가 무엇인지 알고 있다.',
    keyword: '목표 명확성',
    desc: '직책, 직무, 자발적 기여의 범위를 파악하고 가장 중요한 목표에 집중함으로써 더욱 뛰어나게 업무를 수행할 수 있게 합니다.',
    highlight: '기대와 목표가 명확할수록 업무 몰입도가 높아집니다.',
  },
  {
    id: 'Q02', group: '기본 Needs', groupColor: '#6366f1',
    title: '나는 나의 업무를 올바르게 수행하는 데 필요한 물자와 기구/장비를 가지고 있다.',
    keyword: '자원 지원',
    desc: '업무에 필요한 자원이 없는 스트레스에서 벗어나게 해줍니다. 회사가 직원들의 업무를 실질적으로 지원한다는 사실을 보여주는 핵심 지표입니다.',
    highlight: '회사가 이들의 업무를 지원한다는 믿음을 줍니다.',
  },
  {
    id: 'Q03', group: '개인', groupColor: '#f59e0b',
    title: '나는 직장에서 내가 가장 잘하는 일을 할 기회가 매일 있다.',
    keyword: '강점 발휘',
    desc: '직원이 그들의 기술과 지식, 재능을 가장 잘 펼칠 수 있는 업무를 맡기는 것입니다. 강점 중심 배치는 몰입과 성과를 동시에 높입니다.',
    highlight: '가장 잘 펼칠 수 있는 업무를 맡기는 것이 핵심입니다.',
  },
  {
    id: 'Q04', group: '개인', groupColor: '#f59e0b',
    title: '지난 7일 동안 나는 좋은 업무수행으로 인해 인정이나 칭찬을 받았다.',
    keyword: '인정·칭찬',
    desc: '직원이 자신의 가치를 느낄 수 있도록 업무 수행에 대해 인정받는 경험을 제공합니다. 주간 단위의 짧은 주기로 이루어지는 인정이 특히 효과적입니다.',
    highlight: '인정받는다는 사실이 생산성과 충성심을 높입니다.',
  },
  {
    id: 'Q05', group: '개인', groupColor: '#f59e0b',
    title: '나의 상사나 직장의 다른 누군가가 나를 인간적으로 배려해 주는 것 같다.',
    keyword: '인간적 배려',
    desc: '직장 내에서 직원이 단순한 업무 수행자가 아닌 인격체로 대우받는다고 느끼는 것입니다. 개인적 관심을 받는다는 사실이 직원 잔류 의향과 직결됩니다.',
    highlight: '개인적인 관계를 가진 사람이 직장에 있다는 것이 중요합니다.',
  },
  {
    id: 'Q06', group: '개인', groupColor: '#f59e0b',
    title: '나의 발전을 격려해 주는 사람이 직장에 있다.',
    keyword: '성장 코칭',
    desc: '모든 직원이 가치 있는 목적을 향해 나아갈 수 있게 이끌어주는 코치형 리더가 필요합니다. 직원들이 더 강력한 자기가 될 수 있도록 독려해주는 사람의 존재가 핵심입니다.',
    highlight: '강력한 자기가 될 수 있도록 독려를 주는 사람이 필요합니다.',
  },
  {
    id: 'Q07', group: '팀워크', groupColor: '#10b981',
    title: '직장에서 나의 의견이 반영되는 것 같다.',
    keyword: '의견 반영',
    desc: '직원들이 자신이 가치 있게 인정받고 있다는 것을 느끼게 합니다. 의사결정 과정에 참여 범위를 높여줌으로써 자신이 중요하다고 생각하게 만듭니다.',
    highlight: '경청받는다는 느낌이 직원을 조직에 연결시킵니다.',
  },
  {
    id: 'Q08', group: '팀워크', groupColor: '#10b981',
    title: '우리 회사의 미션과 비전은 내 업무가 중요하다고 느끼게 한다.',
    keyword: '미션 연결',
    desc: '직원들이 회사에서 일하는 이유와 의미를 인정받을 필요가 있습니다. 자신의 업무가 더 큰 목적과 연결되어 있다는 사실이 일에 대한 의미를 부여합니다.',
    highlight: '자신의 업무가 중요하다고 느끼게 하는 미션 연계가 핵심입니다.',
  },
  {
    id: 'Q09', group: '팀워크', groupColor: '#10b981',
    title: '나의 직장 동료들은 탁월한 업무 수행을 위해 헌신하고 있다.',
    keyword: '동료 헌신',
    desc: '같은 팀원이 회사와 업무 가치를 높이기 위해 함께 노력하고 있다는 믿음입니다. 동료들이 업무를 훌륭하게 해내기 위해 노력한다는 사실이 팀 성과를 높입니다.',
    highlight: '동료들이 업무를 훌륭하게 해내기 위해 노력한다는 신뢰가 중요합니다.',
  },
  {
    id: 'Q10', group: '팀워크', groupColor: '#10b981',
    title: '나는 직장에 절친한 친구가 있다.',
    keyword: '직장 내 유대',
    desc: '직장 내에서 신뢰할 수 있는 누군가와 연결되어 있다는 사실이 업무 몰입도와 잔류 의향에 직접적인 영향을 미칩니다. 상호 신뢰를 구축하기 위한 관계가 필요합니다.',
    highlight: '상호 신뢰를 구축하는 관계가 조직 안전감을 만듭니다.',
  },
  {
    id: 'Q11', group: '성장', groupColor: '#8b5cf6',
    title: '최근 6개월 동안 직장에서 나의 성과에 관해 말해준 사람이 있었다.',
    keyword: '진보 대화',
    desc: '직원들이 자신이 어떻게 성장하고 있는지 현재 상태를 알 수 있도록 정기적인 피드백과 리뷰가 이루어져야 합니다. 성장 방향에 대한 교감이 잔류 의향을 높입니다.',
    highlight: '성장 리뷰가 수시로 이루어져야 합니다.',
  },
  {
    id: 'Q12', group: '성장', groupColor: '#8b5cf6',
    title: '나는 지난 1년 동안 직장에서 배우고 성장할 수 있는 기회가 있었다.',
    keyword: '학습·성장 기회',
    desc: '직원에게 자연스러운 업무 역량을 기르고 성장할 수 있는 기회를 제공합니다. 성장이 있는 곳에서는 필연적으로 우수 인재가 모이고 남게 됩니다.',
    highlight: '배우고 성장할 기회가 있는 조직에 인재가 머뭅니다.',
  },
];

const Q_GROUPS = [
  { name: '기본 Needs', color: '#6366f1', bg: '#eef2ff', ids: ['Q01', 'Q02'], desc: '업무를 제대로 수행하기 위한 기본 조건' },
  { name: '개인', color: '#f59e0b', bg: '#fffbeb', ids: ['Q03', 'Q04', 'Q05', 'Q06'], desc: '개인의 강점·인정·성장 코칭' },
  { name: '팀워크', color: '#10b981', bg: '#f0fdf4', ids: ['Q07', 'Q08', 'Q09', 'Q10'], desc: '의견 반영·미션 공유·동료 유대' },
  { name: '성장', color: '#8b5cf6', bg: '#faf5ff', ids: ['Q11', 'Q12'], desc: '피드백·학습·성장 기회' },
];

const DRIVERS = [
  {
    level: '강한팀', levelColor: '#10b981', levelBg: '#f0fdf4', threshold: 'GrandMean ≥ 4',
    primary: { id: 'Q03', label: 'Opportunity to do Best', sub: '가장 잘하는 일', color: '#10b981' },
    supports: [
      { id: 'Q01', label: '목표 명확성' },
      { id: 'Q02', label: '자원 지원' },
    ],
    desc: 'Q3(가장 잘하는 일)에 집중하면, 몰입이 강한팀을 더욱 강하게 만들 수 있습니다.',
  },
  {
    level: '중간몰입팀', levelColor: '#f59e0b', levelBg: '#fffbeb', threshold: '3 ≤ GrandMean < 4',
    primary: { id: 'Q08', label: 'Mission', sub: '회사의 미션과 비전', color: '#f59e0b' },
    supports: [
      { id: 'Q07', label: '의견 반영' },
      { id: 'Q12', label: '학습·성장 기회' },
    ],
    desc: 'Q8(회사미션과 과업 얼라인)에 집중하면, 중간몰입팀이 일을 더 잘하게 됩니다.',
  },
  {
    level: '약한팀', levelColor: '#ef4444', levelBg: '#fff1f2', threshold: 'GrandMean < 3',
    primary: { id: 'Q06', label: 'Development', sub: '발전을 격려', color: '#ef4444' },
    supports: [
      { id: 'Q05', label: '인간적 배려' },
      { id: 'Q04', label: '인정·칭찬' },
      { id: 'Q11', label: '진보 대화' },
    ],
    desc: 'Q6(발전 격려)를 통해 약한팀의 기본 신뢰와 동기를 회복해야 합니다.',
  },
];

export default function GallupGuide() {
  const [expandedQ, setExpandedQ] = useState<string | null>(null);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);

  const visibleQuestions = activeGroup
    ? Q_DETAILS.filter(q => q.group === activeGroup)
    : Q_DETAILS;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '900px', margin: '0 auto' }}>

      {/* ── 섹션 1: Q12란? ───────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)', borderRadius: '16px', padding: '28px 32px', color: 'white' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '260px' }}>
              <div style={{ fontSize: '11px', color: '#7dd3fc', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px' }}>
                Q12 GALLUP 몰입도 이해 ①
              </div>
              <h2 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 12px', lineHeight: 1.3 }}>
                Gallup 몰입도란 무엇인가요?<br />왜 해야 하나요?
              </h2>
              <p style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: 1.7, margin: 0 }}>
                <strong style={{ color: 'white' }}>12가지 성과와 직결되는 질문</strong>을 통해 직원의 몰입도를 조사합니다.<br />
                조사를 바탕으로 강점과 연계하여 조직의 성과를 높은 수준으로 이끌기 위한 도구입니다.<br />
                직원은 <strong style={{ color: '#7dd3fc' }}>적극적 몰입, 비몰입, 적극적 비몰입</strong> 3가지로 구분됩니다.
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', minWidth: '240px' }}>
              {[
                { icon: '🔥', label: '① 적극적 몰입', color: '#10b981', desc: '강한 충성심, 조직에 대한 헌신, 생산적, 회사를 지인에게 추천' },
                { icon: '😐', label: '② 비몰입', color: '#f59e0b', desc: '생산성이 있을 수 있으나 회사에 대한 애착이 없음.' },
                { icon: '💔', label: '③ 적극적 비몰입', color: '#ef4444', desc: '몸만 회사에 있을 뿐 마음은 떠남, 업무 환경 불만을 주변 동료에게 전파.' },
              ].map(item => (
                <div key={item.label} style={{ background: 'rgba(255,255,255,0.07)', borderRadius: '10px', padding: '10px 14px', borderLeft: `3px solid ${item.color}` }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: item.color, marginBottom: '3px' }}>{item.icon} {item.label}</div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', lineHeight: 1.5 }}>{item.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── 섹션 2: 4그룹 피라미드 ──────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.05 }}>
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px 28px' }}>
          <div style={{ fontSize: '11px', color: '#6366f1', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px' }}>
            Q12 GALLUP 몰입도 이해 ②
          </div>
          <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>몰입도 12가지 질문 구조</h3>
          <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 20px', lineHeight: 1.6 }}>
            몰입도 12가지 요소는 <strong>4그룹(기본 Needs, 개인, 팀워크, 성장)</strong>으로 묶을 수 있고,
            직장생활에서 직원들에게 생산적인 모티베이션을 부여하는 요인들을 가장 잘 설명해 주는 지표입니다.
          </p>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '12px' }}>
            {Q_GROUPS.map(g => (
              <button
                key={g.name}
                onClick={() => setActiveGroup(activeGroup === g.name ? null : g.name)}
                style={{
                  padding: '8px 16px', borderRadius: '20px', border: `2px solid ${activeGroup === g.name ? g.color : '#e2e8f0'}`,
                  background: activeGroup === g.name ? g.bg : 'white',
                  color: activeGroup === g.name ? g.color : '#475569',
                  fontWeight: 700, fontSize: '12px', cursor: 'pointer', transition: 'all 0.15s',
                  display: 'flex', alignItems: 'center', gap: '6px',
                }}
              >
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: g.color, display: 'inline-block' }} />
                {g.name}
                <span style={{ fontSize: '10px', color: activeGroup === g.name ? g.color : '#94a3b8', fontWeight: 600 }}>
                  {g.ids.join(' · ')}
                </span>
              </button>
            ))}
            {activeGroup && (
              <button
                onClick={() => setActiveGroup(null)}
                style={{ padding: '8px 14px', borderRadius: '20px', border: '1px dashed #cbd5e1', background: 'transparent', color: '#94a3b8', fontWeight: 600, fontSize: '11px', cursor: 'pointer' }}
              >
                전체 보기
              </button>
            )}
          </div>

          {/* 피라미드 시각화 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {[...Q_GROUPS].reverse().map((g, idx) => {
              const width = 40 + idx * 20;
              return (
                <div key={g.name} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    background: g.bg, border: `2px solid ${g.color}`, borderRadius: '8px',
                    padding: '8px 16px', width: `${width}%`, minWidth: '160px',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    opacity: activeGroup && activeGroup !== g.name ? 0.35 : 1, transition: 'opacity 0.2s',
                  }}>
                    <div>
                      <span style={{ fontSize: '12px', fontWeight: 800, color: g.color }}>{g.name}</span>
                      <span style={{ fontSize: '10px', color: '#64748b', marginLeft: '8px' }}>{g.desc}</span>
                    </div>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: g.color, whiteSpace: 'nowrap', marginLeft: '8px' }}>
                      {g.ids.join(' · ')}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>

      {/* ── 섹션 3: 12문항 상세 ──────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }}>
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px 28px' }}>
          <div style={{ fontSize: '11px', color: '#6366f1', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px' }}>
            Q12 GALLUP 몰입도 이해 ③
          </div>
          <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', margin: '0 0 16px' }}>
            몰입도 12가지 요소 상세
            {activeGroup && <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', marginLeft: '8px' }}>— {activeGroup} 필터 중</span>}
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '10px' }}>
            {visibleQuestions.map(q => (
              <motion.div
                key={q.id}
                layout
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{
                  border: `1px solid ${expandedQ === q.id ? q.groupColor : '#e2e8f0'}`,
                  borderRadius: '10px', overflow: 'hidden', cursor: 'pointer',
                  boxShadow: expandedQ === q.id ? `0 0 0 2px ${q.groupColor}22` : 'none',
                  transition: 'box-shadow 0.2s, border-color 0.2s',
                }}
                onClick={() => setExpandedQ(expandedQ === q.id ? null : q.id)}
              >
                {/* 카드 헤더 */}
                <div style={{ background: q.groupColor, padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: 'white', background: 'rgba(0,0,0,0.2)', borderRadius: '4px', padding: '1px 6px' }}>{q.id}</span>
                    <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>{q.group}</span>
                  </div>
                  <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.7)', fontWeight: 700, background: 'rgba(255,255,255,0.15)', borderRadius: '4px', padding: '1px 7px' }}>
                    {q.keyword}
                  </span>
                </div>
                {/* 문항 텍스트 */}
                <div style={{ padding: '10px 12px' }}>
                  <p style={{ fontSize: '12px', color: '#1e293b', fontWeight: 600, lineHeight: 1.55, margin: '0 0 8px' }}>{q.title}</p>
                  {expandedQ === q.id && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                      <p style={{ fontSize: '11px', color: '#475569', lineHeight: 1.65, margin: '0 0 8px' }}>{q.desc}</p>
                      <div style={{ background: `${q.groupColor}11`, border: `1px solid ${q.groupColor}33`, borderRadius: '6px', padding: '7px 10px' }}>
                        <span style={{ fontSize: '10px', color: q.groupColor, fontWeight: 700 }}>💡 {q.highlight}</span>
                      </div>
                    </motion.div>
                  )}
                  {expandedQ !== q.id && (
                    <div style={{ fontSize: '9px', color: '#94a3b8', textAlign: 'right' }}>클릭하여 상세 보기</div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ── 섹션 4: 몰입도와 성과 ────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.15 }}>
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px 28px' }}>
          <div style={{ fontSize: '11px', color: '#0d9488', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px' }}>
            몰입도와 성과의 상관관계
          </div>
          <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', margin: '0 0 12px' }}>몰입도와 매출목표달성율</h3>
          <p style={{ fontSize: '13px', color: '#334155', lineHeight: 1.75, margin: '0 0 20px' }}>
            그룹의 몰입도가 올라가면, <strong>매출목표 달성률도 올라갑니다.</strong><br />
            현재 그룹 Q12 Grand Mean=<strong style={{ color: '#f59e0b' }}>3.6</strong> (글로벌기준 하위 9th %tile)로, 매출목표 <strong>93% 달성</strong>하고 있습니다.<br />
            <strong style={{ color: '#0d9488' }}>매출목표 100% 달성하려면, Q12 Grand Mean=3.8</strong>(글로벌기준 하위 27th %tile)까지 끌어 올려야 합니다.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
            {[
              { label: '만족도 (Q0)', r: 0.90, color: '#6366f1' },
              { label: 'Grand Mean (Q12)', r: 0.91, color: '#0d9488' },
              { label: '로열티 (C1, C2)', r: 0.85, color: '#f59e0b' },
              { label: '팀워크 연계', r: 0.83, color: '#10b981' },
              { label: '개인 몰입', r: 0.80, color: '#8b5cf6' },
              { label: '성장 지수', r: 0.88, color: '#ec4899' },
            ].map(item => (
              <div key={item.label} style={{ background: '#f8fafc', borderRadius: '10px', padding: '14px 16px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '6px' }}>{item.label}</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: item.color }}>R = {item.r}</div>
                <div style={{ height: '4px', background: '#e2e8f0', borderRadius: '2px', marginTop: '8px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${item.r * 100}%`, background: item.color, borderRadius: '2px', transition: 'width 1s' }} />
                </div>
                <div style={{ fontSize: '9px', color: '#94a3b8', marginTop: '4px' }}>몰입도와의 상관계수</div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '16px', background: '#f0fdfa', border: '1px solid #99f6e4', borderRadius: '10px', padding: '14px 18px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f766e', marginBottom: '4px' }}>📈 핵심 인사이트</div>
            <p style={{ fontSize: '12px', color: '#134e4a', lineHeight: 1.65, margin: 0 }}>
              Y = 0.21X + 0.22 (R = .46) — Grand Mean이 1점 오를 때마다 매출목표 달성률이 약 <strong>21%p</strong> 향상됩니다.
              Q12 점수는 단순한 직원 만족도 지표가 아니라 <strong>비즈니스 성과를 예측하는 선행 지표</strong>입니다.
            </p>
          </div>
        </div>
      </motion.div>

      {/* ── 섹션 5: 핵심 드라이버 ────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.2 }}>
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px 28px' }}>
          <div style={{ fontSize: '11px', color: '#8b5cf6', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px' }}>
            그룹 Q12 핵심 Driver
          </div>
          <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', margin: '0 0 8px' }}>몰입 단계별 핵심 드라이버</h3>
          <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 20px', lineHeight: 1.65 }}>
            그룹이 <strong style={{ color: '#10b981' }}>Q3(가장 잘하는 일)</strong>에 집중하면, 몰입이 강한팀을 더욱 강하게 만들 수 있고,
            <strong style={{ color: '#f59e0b' }}> Q8(회사미션과 가치를 과업과 얼라인)</strong>에 집중하면, 중간몰입팀이 일을 더 잘하게 됩니다.
            특히 Q3, Q8과 강하게 연결되어 있는 <strong>기초속성 Q1(목표명확성), Q2(자원)</strong>을 함께 해결하면 Q3, Q8을 효과적으로 끌어 올릴 수 있습니다.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {DRIVERS.map(driver => (
              <div key={driver.level} style={{ background: driver.levelBg, border: `1px solid ${driver.levelColor}33`, borderRadius: '12px', padding: '16px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
                  {/* 레벨 배지 */}
                  <div style={{ minWidth: '90px' }}>
                    <div style={{ background: driver.levelColor, color: 'white', borderRadius: '8px', padding: '6px 12px', fontSize: '12px', fontWeight: 800, textAlign: 'center', marginBottom: '4px' }}>
                      {driver.level}
                    </div>
                    <div style={{ fontSize: '9px', color: driver.levelColor, textAlign: 'center', fontWeight: 600 }}>{driver.threshold}</div>
                  </div>

                  {/* 화살표 */}
                  <div style={{ fontSize: '20px', marginTop: '8px', color: driver.levelColor }}>→</div>

                  {/* 핵심 드라이버 */}
                  <div style={{ background: 'white', border: `2px solid ${driver.primary.color}`, borderRadius: '10px', padding: '10px 16px', minWidth: '160px' }}>
                    <div style={{ fontSize: '10px', fontWeight: 700, color: driver.primary.color, marginBottom: '3px' }}>
                      핵심 드라이버 · {driver.primary.id}
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>{driver.primary.label}</div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>{driver.primary.sub}</div>
                  </div>

                  {/* 기초속성 */}
                  <div style={{ flex: 1, minWidth: '140px' }}>
                    <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600, marginBottom: '6px' }}>기초 지원 속성</div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {driver.supports.map(s => (
                        <div key={s.id} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '4px 10px', fontSize: '11px', color: '#475569', fontWeight: 600 }}>
                          <strong style={{ color: driver.levelColor }}>{s.id}</strong> {s.label}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <p style={{ fontSize: '11px', color: '#475569', margin: '12px 0 0', lineHeight: 1.6, borderTop: `1px solid ${driver.levelColor}22`, paddingTop: '10px' }}>
                  💡 {driver.desc}
                </p>
              </div>
            ))}
          </div>

          {/* 요약 인사이트 */}
          <div style={{ marginTop: '16px', background: '#f8fafc', borderRadius: '10px', padding: '14px 18px', borderLeft: '4px solid #8b5cf6' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#6d28d9', marginBottom: '6px' }}>🔑 종합 액션 가이드</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '8px' }}>
              {[
                { step: '1단계', desc: 'Q1·Q2(기초속성)를 먼저 해결하여 Q3·Q8 드라이버의 기반을 마련합니다.', color: '#6366f1' },
                { step: '2단계', desc: 'Q3(강점 발휘 기회)를 집중 개선하여 강한팀의 동력을 극대화합니다.', color: '#10b981' },
                { step: '3단계', desc: 'Q8(미션 연계)를 강화하여 중간몰입팀을 강한팀으로 끌어올립니다.', color: '#f59e0b' },
                { step: '4단계', desc: 'Q6(발전 격려)로 약한팀의 기본 신뢰와 동기를 회복합니다.', color: '#ef4444' },
              ].map(item => (
                <div key={item.step} style={{ background: 'white', borderRadius: '8px', padding: '10px 12px', border: `1px solid ${item.color}33` }}>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: item.color, marginBottom: '4px' }}>{item.step}</div>
                  <div style={{ fontSize: '11px', color: '#475569', lineHeight: 1.55 }}>{item.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

    </div>
  );
}
