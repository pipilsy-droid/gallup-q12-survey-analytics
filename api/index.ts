import express from 'express';
import https from 'https';
import http from 'http';
import { URL } from 'url';
import { GoogleGenAI } from '@google/genai';
import { SurveySubmission, GALLUP_Q12_QUESTIONS, getBuFromDepartment } from '../src/types';

// 리다이렉트 수동 처리 fetch (Google Sheets CORS/auth 우회)
function fetchText(urlStr: string, maxRedirects = 8): Promise<string> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(urlStr);
    const lib = parsed.protocol === 'https:' ? https : http;
    const options = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/csv,text/plain,*/*;q=0.9',
        'Accept-Language': 'ko-KR,ko;q=0.9',
        'Cache-Control': 'no-cache',
      },
    };
    const req = lib.request(options, (res) => {
      const loc = res.headers['location'];
      if ((res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 303 || res.statusCode === 307) && loc) {
        if (maxRedirects === 0) return reject(new Error('리다이렉트가 너무 많습니다'));
        const nextUrl = loc.startsWith('http') ? loc : `${parsed.protocol}//${parsed.hostname}${loc}`;
        return fetchText(nextUrl, maxRedirects - 1).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
      const chunks: Buffer[] = [];
      res.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    });
    req.on('error', reject);
    req.end();
  });
}

const app = express();
app.use(express.json());

const INITIAL_SUBMISSIONS: SurveySubmission[] = [
  {
    id: 'mock-1',
    department: '(본사)뉴발란스',
    role: '팀원',
    rank: '대리(SM4~SM5)',
    job: '상품기획 (기획MD)',
    answers: { Q01: 5, Q02: 4, Q03: 4, Q04: 3, Q05: 5, Q06: 4, Q07: 4, Q08: 5, Q09: 5, Q10: 4, Q11: 5, Q12: 4, Q13: 5, Q14: 4, Q15: 4, Q16: 4, Q17: 5, Q18: 5, Q19: 4, Q20: 4 },
    comment1: '뉴발란스의 강력한 브랜드 경쟁력이 사업을 함에 있어 엄청난 자부심이 됩니다. 기획 단계에서 다양한 시도를 해볼 수 있는 주도권과 팀 문화가 강점입니다.',
    comment2: '인력 대비 상품 스케일이 너무 커서 리소스 지원이나 업무 프로세스 상 비매출성 어드민 행정이 다소 간소화되었으면 합니다.',
    comment: '브랜드 경쟁력에 자부심이 큽니다. 리소스 관리가 필요합니다.',
    submittedAt: '2025-05-12T02:14:00Z',
    year: 2025,
  },
  {
    id: 'mock-2',
    department: '(본사)온라인BU',
    role: '팀원',
    rank: '사원 - 주임(JM1~SM3)',
    job: '온라인MD / 웹D',
    answers: { Q01: 4, Q02: 4, Q03: 3, Q04: 2, Q05: 4, Q06: 3, Q07: 5, Q08: 4, Q09: 4, Q10: 3, Q11: 4, Q12: 3, Q13: 4, Q14: 3, Q15: 5, Q16: 3, Q17: 4, Q18: 4, Q19: 3, Q20: 3 },
    comment1: '동료들 간의 전념도가 매우 높고 끈끈하게 뭉칩니다.',
    comment2: '최근 디지털 연계 솔루션 변경 기조로 인한 툴 지원 오류와 적시 정보 수급에 간헐적 버목이 있습니다.',
    comment: '온라인 마케팅 반응 연계가 좋으나 솔루션 정보 전파가 조금 지연됩니다.',
    submittedAt: '2025-05-14T09:30:00Z',
    year: 2025,
  },
  {
    id: 'mock-3',
    department: '(현장)스파오',
    role: '팀장 이상 ((현장)점장/부점장 , (본사)브랜드장/부서장/실장 등)',
    rank: '과장',
    job: '영업',
    answers: { Q01: 5, Q02: 4, Q03: 5, Q04: 5, Q05: 5, Q06: 5, Q07: 4, Q08: 5, Q09: 5, Q10: 5, Q11: 5, Q12: 4, Q13: 4, Q14: 5, Q15: 4, Q16: 5, Q17: 5, Q18: 5, Q19: 5, Q20: 5 },
    comment1: '주 단위 영업 분석 공유회가 체계적으로 변경되어 관리 자율도가 늘어났습니다.',
    comment2: '대형 매장의 주말 지원 교대 인력 가이드라인이 명시되어 아르바이트생 수급 공백 시 유연하게 대처할 수 있으면 좋겠습니다.',
    comment: '가치공유와 자율 관리가 잘 수렴되고 있습니다.',
    submittedAt: '2025-05-15T05:22:00Z',
    year: 2025,
  },
  {
    id: 'mock-4',
    department: '(본사)스포츠BU 본부',
    role: '팀원',
    rank: '대리(SM4~SM5)',
    job: '마케팅 (IMC/콜라보 등 마케팅 전반)',
    answers: { Q01: 4, Q02: 3, Q03: 4, Q04: 4, Q05: 4, Q06: 4, Q07: 3, Q08: 4, Q09: 4, Q10: 4, Q11: 4, Q12: 5, Q13: 4, Q14: 4, Q15: 4, Q16: 4, Q17: 4, Q18: 4, Q19: 4, Q20: 4 },
    comment1: '브랜드 가치가 성과의 기폭제가 되며 타 대형 콜라보 시 결정 전결권의 위임으로 속도감 있게 성과를 냈던 기회가 좋습니다.',
    comment2: '마케팅 전문 보충 인력이 절실합니다.',
    comment: '주도적인 브랜딩 활동이 가능하지만 마케팅 전문 보충 인력이 절실합니다.',
    submittedAt: '2025-05-18T07:11:00Z',
    year: 2025,
  },
  {
    id: 'mock-5',
    department: '(본사)법인 본부(패션BG, 사업형 CO)',
    role: '팀원',
    rank: '차장 이상',
    job: '기타 스탭조직 (각 조직 본부, 스탭/지원 부서 등)',
    answers: { Q01: 4, Q02: 4, Q03: 4, Q04: 3, Q05: 5, Q06: 4, Q07: 4, Q08: 5, Q09: 5, Q10: 4, Q11: 5, Q12: 4, Q13: 4, Q14: 4, Q15: 4, Q16: 4, Q17: 4, Q18: 4, Q19: 4, Q20: 5 },
    comment1: '중장기 이랜드패션 전사 방향성과 미션, 비전 체계 전파가 훌륭합니다.',
    comment2: '주간 간소화 보고문화가 보정되면 좋겠습니다.',
    comment: '가치 중심의 리더십 방향성에 깊이 동조하며 보고 간소화를 희망합니다.',
    submittedAt: '2025-05-20T01:45:00Z',
    year: 2025,
  },
  {
    id: 'mock-6',
    department: '(현장)미쏘',
    role: '팀원',
    rank: '사원 - 주임(JM1~SM3)',
    job: '영업',
    answers: { Q01: 3, Q02: 4, Q03: 3, Q04: 3, Q05: 4, Q06: 3, Q07: 4, Q08: 4, Q09: 3, Q10: 3, Q11: 3, Q12: 3, Q13: 3, Q14: 3, Q15: 4, Q16: 3, Q17: 3, Q18: 4, Q19: 3, Q20: 3 },
    comment1: '동료들이 제품 품질과 트렌디함을 지키기 위해 정말 열과 성을 다합니다.',
    comment2: '현장 주니어들의 커리어 성장을 위해 다양한 본사와의 순환 기회가 늘어났으면 합니다.',
    comment: '현장 동료 유대감은 끈끈하나 진로 상담 및 성장 교감이 아쉽습니다.',
    submittedAt: '2026-05-21T11:02:00Z',
    year: 2026,
  },
  {
    id: 'mock-7',
    department: '(본사)로엠',
    role: '팀원',
    rank: '대리(SM4~SM5)',
    job: '디자이너 (의상/VMD/광고/인테리어)',
    answers: { Q01: 4, Q02: 4, Q03: 4, Q04: 4, Q05: 4, Q06: 5, Q07: 4, Q08: 4, Q09: 4, Q10: 4, Q11: 4, Q12: 4, Q13: 5, Q14: 4, Q15: 4, Q16: 4, Q17: 4, Q18: 5, Q19: 4, Q20: 4 },
    comment1: '브랜드 고유 정체성이 강해 디자인 시안 연계가 유기적이고 의견 권위가 자유롭습니다.',
    comment2: '시즌별 기획 마감 때마다 적시 협조 및 업무 공유 스택 개선이 요구됩니다.',
    comment: '독립성이 높은 디자인 역량을 적극 지지받고 있으나 시즌 정리가 수월해지길 원합니다.',
    submittedAt: '2026-05-22T08:15:00Z',
    year: 2026,
  },
  {
    id: 'mock-8',
    department: '(본사)클라비스',
    role: '팀원',
    rank: '사원 - 주임(JM1~SM3)',
    job: '상품기획 (기획MD)',
    answers: { Q01: 3, Q02: 3, Q03: 3, Q04: 2, Q05: 4, Q06: 3, Q07: 4, Q08: 3, Q09: 3, Q10: 3, Q11: 3, Q12: 3, Q13: 3, Q14: 3, Q15: 3, Q16: 2, Q17: 3, Q18: 3, Q19: 3, Q20: 3 },
    comment1: '부서장님이 인간적인 존중과 케어에 애써 주시는 부분이 저희 팀의 버팀목입니다.',
    comment2: '본부 간 장벽을 없애고 직급에 따른 성장을 유도해주면 좋겠습니다.',
    comment: '소통 전결을 투명하게 완화하고 코칭 면담 빈도가 회복되길 기대합니다.',
    submittedAt: '2026-05-23T04:50:00Z',
    year: 2026,
  },
  {
    id: 'mock-9',
    department: '(현장)폴더',
    role: '팀원',
    rank: '사원 - 주임(JM1~SM3)',
    job: '영업',
    answers: { Q01: 4, Q02: 4, Q03: 4, Q04: 4, Q05: 4, Q06: 4, Q07: 4, Q08: 4, Q09: 4, Q10: 4, Q11: 4, Q12: 4, Q13: 4, Q14: 4, Q15: 4, Q16: 4, Q17: 4, Q18: 4, Q19: 4, Q20: 4 },
    comment1: '폴더 고유의 액티브하고 수평적인 신발 매장 크루 문화에 만족합니다.',
    comment2: '모바일 PDA 기기 연동의 소프트웨어 업그레이드가 제때 이루어지지 않을 때가 답답합니다.',
    comment: '매장 문화가 아주 유쾌하고 다채로우나, 재고 하드웨어 품질 개선이 수반되길 바랍니다.',
    submittedAt: '2026-05-24T06:18:00Z',
    year: 2026,
  },
  {
    id: 'mock-10',
    department: '(본사)슈펜',
    role: '팀원',
    rank: '과장',
    job: '통합생산 / 기술연구실',
    answers: { Q01: 3, Q02: 3, Q03: 3, Q04: 2, Q05: 3, Q06: 3, Q07: 3, Q08: 4, Q09: 3, Q10: 3, Q11: 3, Q12: 3, Q13: 3, Q14: 3, Q15: 4, Q16: 2, Q17: 2, Q18: 3, Q19: 3, Q20: 2 },
    comment1: '신속하게 전량 생산 및 원가 구조를 선방해내는 사명감과 생산 경쟁력은 이랜드만의 우위 자산입니다.',
    comment2: '성장이나 성과 지원에 관한 명확한 피드백 대화를 6개월 넘게 단 한 번도 받지 못했습니다.',
    comment: '생산 압박에 비해 성장을 배려하는 코칭 및 면담의 밀도가 얕아 위기감을 느낍니다.',
    submittedAt: '2026-05-25T01:10:00Z',
    year: 2026,
  },
];

let submissions: SurveySubmission[] = INITIAL_SUBMISSIONS.map(sub => ({
  ...sub,
  bu: sub.bu || getBuFromDepartment(sub.department),
}));

app.get('/api/submissions', (req, res) => {
  res.json(submissions);
});

app.post('/api/submissions', (req, res) => {
  const { department, role, rank, job, answers, comment1, comment2, comment, year, bu } = req.body;

  if (!department || !answers) {
    return res.status(400).json({ error: '부서와 설문 답변 데이터는 필수 항목입니다.' });
  }

  for (const q of GALLUP_Q12_QUESTIONS) {
    const score = answers[q.id];
    if (score === undefined || score < 1 || score > 5) {
      return res.status(400).json({ error: `문항 ${q.id}의 응답이 유실되었거나 범위를 벗어났습니다.` });
    }
  }

  const cleanComment1 = comment1 || '';
  const cleanComment2 = comment2 || '';
  let joinedComment = comment || '';
  if (!joinedComment && (cleanComment1 || cleanComment2)) {
    joinedComment = `[유지 및 개선 희망 사항]\n${cleanComment1}\n\n[지원 및 제거 필요 요인]\n${cleanComment2}`.trim();
  }

  const finalYear = year ? Number(year) : 2026;
  const resolvedBu = bu || getBuFromDepartment(department);

  const newSubmission: SurveySubmission = {
    id: 'submission-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
    bu: resolvedBu,
    department,
    role: role || '팀원',
    rank: rank || '사원 - 주임(JM1~SM3)',
    job: job || '영업',
    answers,
    comment1: cleanComment1,
    comment2: cleanComment2,
    comment: joinedComment,
    submittedAt: new Date().toISOString(),
    year: finalYear,
  };

  submissions.push(newSubmission);
  res.status(201).json(newSubmission);
});

app.post('/api/submissions/bulk', (req, res) => {
  const { list } = req.body;
  if (!list || !Array.isArray(list)) {
    return res.status(400).json({ error: '유효한 설문 대량 대조 목록이 필요합니다.' });
  }

  const newSubmissions: SurveySubmission[] = [];

  for (const item of list) {
    const { department, role, rank, job, answers, comment1, comment2, comment, submittedAt, year, bu } = item;
    if (!department || !answers) {
      return res.status(400).json({ error: '각 개별 행은 브랜드(소속)와 득점 데이터(answers)를 포함해야 합니다.' });
    }

    const cleanAnswers: Record<string, number> = {};
    for (const q of GALLUP_Q12_QUESTIONS) {
      const score = Number(answers[q.id]);
      cleanAnswers[q.id] = isNaN(score) || score < 1 || score > 5 ? 3 : score;
    }

    const cleanComment1 = comment1 || '';
    const cleanComment2 = comment2 || '';
    let joinedComment = comment || '';
    if (!joinedComment && (cleanComment1 || cleanComment2)) {
      joinedComment = `[유지 및 개선 희망 사항]\n${cleanComment1}\n\n[지원 및 제거 필요 요인]\n${cleanComment2}`.trim();
    }

    let resolvedYear = year ? Number(year) : 2025;
    if (!year && submittedAt) {
      const match = String(submittedAt).match(/(20\d{2})/);
      if (match) resolvedYear = Number(match[1]);
    }

    newSubmissions.push({
      id: 'submission-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
      bu: bu || getBuFromDepartment(department),
      department,
      role: role || '팀원',
      rank: rank || '사원 - 주임(JM1~SM3)',
      job: job || '영업',
      answers: cleanAnswers,
      comment1: cleanComment1,
      comment2: cleanComment2,
      comment: joinedComment,
      submittedAt: submittedAt || new Date().toISOString(),
      year: resolvedYear,
    });
  }

  submissions = [...submissions, ...newSubmissions];
  res.status(201).json({ count: newSubmissions.length, submissions });
});

app.post('/api/submissions/reset', (req, res) => {
  submissions = INITIAL_SUBMISSIONS.map(sub => ({
    ...sub,
    bu: sub.bu || getBuFromDepartment(sub.department),
  }));
  res.json({ message: 'Submissions reset to mock state.', submissions });
});

app.post('/api/submissions/clear', (req, res) => {
  submissions = [];
  res.json({ message: 'All submissions cleared successfully.', submissions });
});

app.post('/api/analyze', async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return res.status(400).json({
      error: 'Gemini API KEY가 설정되지 않았습니다. Vercel 대시보드의 Environment Variables에서 GEMINI_API_KEY를 등록해 주세요.',
    });
  }

  const { filters } = req.body || {};

  try {
    let filtered = [...submissions];
    if (filters) {
      if (filters.year && filters.year !== '전체 연도') filtered = filtered.filter(s => String(s.year || 2025) === String(filters.year));
      if (filters.bu && filters.bu !== '전체 BU') filtered = filtered.filter(s => (s.bu || getBuFromDepartment(s.department)) === filters.bu);
      if (filters.department && filters.department !== '전체 브랜드') filtered = filtered.filter(s => s.department === filters.department);
      if (filters.role && filters.role !== '전체 직책') filtered = filtered.filter(s => (s.role || '팀원') === filters.role);
      if (filters.rank && filters.rank !== '전체 직급') filtered = filtered.filter(s => (s.rank || '사원 - 주임(JM1~SM3)') === filters.rank);
      if (filters.job && filters.job !== '전체 직무') filtered = filtered.filter(s => (s.job || '영업') === filters.job);
    }

    const totalCount = filtered.length;
    if (totalCount === 0) {
      return res.status(400).json({ error: '선택된 필터 조건에 해당하는 설문 응답 데이터가 없습니다.' });
    }

    const questionSums: Record<string, number> = {};
    const questionCounts: Record<string, number> = {};
    GALLUP_Q12_QUESTIONS.forEach(q => { questionSums[q.id] = 0; questionCounts[q.id] = 0; });

    const departmentData: Record<string, { sums: Record<string, number>; count: number }> = {};
    const employeeComments: string[] = [];

    filtered.forEach(sub => {
      const dept = sub.department;
      if (!departmentData[dept]) {
        departmentData[dept] = { sums: {}, count: 0 };
        GALLUP_Q12_QUESTIONS.forEach(q => { departmentData[dept].sums[q.id] = 0; });
      }
      departmentData[dept].count += 1;
      GALLUP_Q12_QUESTIONS.forEach(q => {
        const score = sub.answers[q.id] || 0;
        questionSums[q.id] += score;
        questionCounts[q.id] += 1;
        departmentData[dept].sums[q.id] += score;
      });
      if (sub.comment1?.trim()) employeeComments.push(`[${dept} / ${sub.role} / ${sub.rank}]: 개선유지의견 - ${sub.comment1.trim()}`);
      if (sub.comment2?.trim()) employeeComments.push(`[${dept} / ${sub.role} / ${sub.rank}]: 지원제거의견 - ${sub.comment2.trim()}`);
      if (!sub.comment1 && !sub.comment2 && sub.comment?.trim()) employeeComments.push(`[${dept}]: 정성의견 - ${sub.comment.trim()}`);
    });

    const questionAverages: Record<string, number> = {};
    GALLUP_Q12_QUESTIONS.forEach(q => {
      questionAverages[q.id] = Number((questionSums[q.id] / (questionCounts[q.id] || 1)).toFixed(2));
    });

    const deptAverages = Object.keys(departmentData).map(dept => {
      const data = departmentData[dept];
      const sumAll = Object.values(data.sums).reduce((a, b) => a + b, 0);
      return { department: dept, count: data.count, average: Number((sumAll / (data.count * GALLUP_Q12_QUESTIONS.length)).toFixed(2)) };
    });

    const categorySums: Record<string, number> = { support: 0, alignment: 0, growth: 0, overall: 0 };
    const categoryCounts: Record<string, number> = { support: 0, alignment: 0, growth: 0, overall: 0 };
    GALLUP_Q12_QUESTIONS.forEach(q => { categorySums[q.category] += questionAverages[q.id]; categoryCounts[q.category] += 1; });
    const categoryAverages: Record<string, number> = {};
    Object.keys(categorySums).forEach(cat => {
      categoryAverages[cat] = Number((categorySums[cat] / (categoryCounts[cat] || 1)).toFixed(2));
    });

    const ai = new GoogleGenAI({ apiKey });
    const prompt = `당신은 대한민국 최고의 인사 조직 경영 컨설팅 전문가입니다. 이랜드패션 임직원 설문 데이터를 바탕으로 경영진이 이해할 수 있는 피드백 리포트를 한국어로 작성해 주세요.\n\n총 참여: ${totalCount}명\n문항별 평균:\n${GALLUP_Q12_QUESTIONS.map(q => `[${q.id}] ${q.text}: ${questionAverages[q.id]}점`).join('\n')}\n\n카테고리 평균:\n- 몰입 환경 및 존중: ${categoryAverages.support}점\n- 조직 정렬과 유대: ${categoryAverages.alignment}점\n- 역할 수행과 성장: ${categoryAverages.growth}점\n- 전사 추천 및 잔존: ${categoryAverages.overall}점\n\n브랜드별:\n${deptAverages.map(d => `${d.department}: ${d.average}점 (${d.count}명)`).join('\n')}\n\n정성 의견:\n${employeeComments.length > 0 ? employeeComments.join('\n') : '없음'}\n\n마크다운 형식으로 Executive Summary, 강점, 개선 필요 항목, 부서별 분석, 액션 플랜 순으로 작성해 주세요.`;

    const response = await ai.models.generateContent({ model: 'gemini-2.0-flash', contents: prompt });
    res.json({ report: response.text || '분석 결과를 출력하지 못했습니다.' });
  } catch (error: any) {
    console.error('Gemini API analysis failed', error);
    res.status(500).json({ error: `Gemini 분석 처리 중 문제가 발생했습니다: ${error.message || error}` });
  }
});

// API: Proxy Google Sheets CSV (CORS 우회 + 리다이렉트 수동 처리)
app.get('/api/sheets-proxy', async (req, res) => {
  const SHEETS_URL = 'https://docs.google.com/spreadsheets/d/1US-Pv5FrUOpGp86SVp9ex-LEJS_ecNy5srET5BufZ0Y/export?format=csv&gid=182726782';
  try {
    const csvText = await fetchText(SHEETS_URL);
    if (csvText.trim().startsWith('<!') || csvText.trim().startsWith('<html')) {
      return res.status(502).json({ error: '구글 시트가 공개 공유 설정이 아닙니다. 시트 → 공유 → "링크가 있는 모든 사용자" 로 변경해주세요.' });
    }
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(csvText);
  } catch (err: any) {
    res.status(500).json({ error: `구글 시트 연동 오류: ${err.message}` });
  }
});

export default app;
