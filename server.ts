/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { SurveySubmission, GALLUP_Q12_QUESTIONS, CATEGORY_LABELS, getBuFromDepartment } from './src/types.js';

// Resolve directory name in ES Module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

// Path for storing persistence file
const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'submissions.json');

// Real E-Land Fashion customized initial mock submissions representing 15 diverse employees
const INITIAL_SUBMISSIONS: SurveySubmission[] = [
  {
    id: 'mock-1',
    department: '(본사)뉴발란스',
    role: '팀원',
    rank: '대리(SM4~SM5)',
    job: '상품기획 (기획MD)',
    answers: {
      Q01: 5, Q02: 4, Q03: 4, Q04: 3, Q05: 5,
      Q06: 4, Q07: 4, Q08: 5, Q09: 5, Q10: 4, Q11: 5,
      Q12: 4, Q13: 5, Q14: 4, Q15: 4, Q16: 4, Q17: 5,
      Q18: 5, Q19: 4, Q20: 4
    },
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
    answers: {
      Q01: 4, Q02: 4, Q03: 3, Q04: 2, Q05: 4,
      Q06: 3, Q07: 5, Q08: 4, Q09: 4, Q10: 3, Q11: 4,
      Q12: 3, Q13: 4, Q14: 3, Q15: 5, Q16: 3, Q17: 4,
      Q18: 4, Q19: 3, Q20: 3
    },
    comment1: '동료들 간의 전념도가 매우 높고 끈끈하게 뭉칩니다. 트렌디한 기획전을 직접 디자인하고 노출하여 고객 반응을 즉각 볼 수 있어 재밌습니다.',
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
    answers: {
      Q01: 5, Q02: 4, Q03: 5, Q04: 5, Q05: 5,
      Q06: 5, Q07: 4, Q08: 5, Q09: 5, Q10: 5, Q11: 5,
      Q12: 4, Q13: 4, Q14: 5, Q15: 4, Q16: 5, Q17: 5,
      Q18: 5, Q19: 5, Q20: 5
    },
    comment1: '주 단위 영업 분석 공유회가 체계적으로 변경되어 관리 자율도가 늘어났습니다. 매일 매장에서 고객 반응 상품 공급이 원활하게 관리되고 직원간 존중 분위기도 훌륭합니다.',
    comment2: '대형 매장의 주말 지원 교대 인력 가이드라인이 명시되어 아르바이트생 수급 공백 시 유연하게 대처할 수 있으면 좋겠습니다.',
    comment: '가치공유와 자율 관리가 잘 수렴되고 있습니다. 유연한 인력 운영 체계가 보완되길 바랍니다.',
    submittedAt: '2025-05-15T05:22:00Z',
    year: 2025,
  },
  {
    id: 'mock-4',
    department: '(본사)스포츠BU 본부',
    role: '팀원',
    rank: '대리(SM4~SM5)',
    job: '마케팅 (IMC/콜라보 등 마케팅 전반)',
    answers: {
      Q01: 4, Q02: 3, Q03: 4, Q04: 4, Q05: 4,
      Q06: 4, Q07: 3, Q08: 4, Q09: 4, Q10: 4, Q11: 4,
      Q12: 5, Q13: 4, Q14: 4, Q15: 4, Q16: 4, Q17: 4,
      Q18: 4, Q19: 4, Q20: 4
    },
    comment1: '브랜드 가치가 성과의 기폭제가 되며 타 대형 콜라보 시 결정 전결권의 위임으로 속도감 있게 성과를 냈던 기회가 좋습니다.',
    comment2: '부서별 업무량이 편향되어 마케팅 실행 부문의 주말 당직이나 행사 협조 시 유기적인 성과 융합 및 보상이 확실시되면 더욱 좋겠습니다.',
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
    answers: {
      Q01: 4, Q02: 4, Q03: 4, Q04: 3, Q05: 5,
      Q06: 4, Q07: 4, Q08: 5, Q09: 5, Q10: 4, Q11: 5,
      Q12: 4, Q13: 4, Q14: 4, Q15: 4, Q16: 4, Q17: 4,
      Q18: 4, Q19: 4, Q20: 5
    },
    comment1: '중장기 이랜드패션 전사 방향성과 미션, 비전 체계 전파가 훌륭하며 직급과 관계없이 정성 들여 성장을 견인하려는 배려가 느껴집니다.',
    comment2: '지원 부서 특성상 실무 루틴 보고가 일부 과도해 생산적 핵심과제에 더 집중하도록 주간 간소화 보고문화가 보정되면 좋겠습니다.',
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
    answers: {
      Q01: 3, Q02: 4, Q03: 3, Q04: 3, Q05: 4,
      Q06: 3, Q07: 4, Q08: 4, Q09: 3, Q10: 3, Q11: 3,
      Q12: 3, Q13: 3, Q14: 3, Q15: 4, Q16: 3, Q17: 3,
      Q18: 4, Q19: 3, Q20: 3
    },
    comment1: '동료들이 제품 품질과 트렌디함을 지키기 위해 정말 열과 성을 다하는 전념도가 높습니다. 서로 지지해주는 문화가 좋습니다.',
    comment2: '현장 영양 보충용 교육 기회와 직무 세미나가 부족하다고 느낍니다. 현장 주니어들의 커리어 성장을 위해 다양한 본사와의 순환 기회가 늘어났으면 합니다.',
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
    answers: {
      Q01: 4, Q02: 4, Q03: 4, Q04: 4, Q05: 4,
      Q06: 5, Q07: 4, Q08: 4, Q09: 4, Q10: 4, Q11: 4,
      Q12: 4, Q13: 5, Q14: 4, Q15: 4, Q16: 4, Q17: 4,
      Q18: 5, Q19: 4, Q20: 4
    },
    comment1: '브랜드 고유 정체성이 강해 디자인 시안 연계가 유기적이고 본사 내에서도 의견 권위가 자유롭습니다. 강점을 발현시킬 기회가 보장됩니다.',
    comment2: '시즌별 기획 마감 때마다 부팀장 및 동료들과 집중 밤샘이 간혹 발생해 적시 협조 및 업무 공유 스택 개선이 요구됩니다.',
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
    answers: {
      Q01: 3, Q02: 3, Q03: 3, Q04: 2, Q05: 4,
      Q06: 3, Q07: 4, Q08: 3, Q09: 3, Q10: 3, Q11: 3,
      Q12: 3, Q13: 3, Q14: 3, Q15: 3, Q16: 2, Q17: 3,
      Q18: 3, Q19: 3, Q20: 3
    },
    comment1: '부서장님이 인간적인 존중과 케어에 애써 주시는 부분이 저희 팀의 버팀목입니다.',
    comment2: '생산 처 조절 시 전사 지원 부서나 유관 부서와의 소통 허들이 높은 편입니다. 본부 간 장벽을 없애고 직급에 따른 성장을 유도해주면 좋겠습니다.',
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
    answers: {
      Q01: 4, Q02: 4, Q03: 4, Q04: 4, Q05: 4,
      Q06: 4, Q07: 4, Q08: 4, Q09: 4, Q10: 4, Q11: 4,
      Q12: 4, Q13: 4, Q14: 4, Q15: 4, Q16: 4, Q17: 4,
      Q18: 4, Q19: 4, Q20: 4
    },
    comment1: '폴더 고유의 액티브하고 수평적인 신발 매장 크루 문화에 만족하며 자사 상품을 가차 없이 추천할 만합니다.',
    comment2: '입출고 및 재고 실사를 확인하기 위한 모바일 PDA 기기 연동의 소프트웨어 업그레이드가 제때 이루어지지 않을 때가 답답합니다.',
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
    answers: {
      Q01: 3, Q02: 3, Q03: 3, Q04: 2, Q05: 3,
      Q06: 3, Q07: 3, Q08: 4, Q09: 3, Q10: 3, Q11: 3,
      Q12: 3, Q13: 3, Q14: 3, Q15: 4, Q16: 2, Q17: 2,
      Q18: 3, Q19: 3, Q20: 2
    },
    comment1: '신속하게 전량 생산 및 원가 구조를 선방해내는 사명감과 생산 경쟁력은 이랜드만의 우위 자산입니다.',
    comment2: '최근 원부자재 인상 등으로 실무적인 한계가 큰 와중에 누군가 성장이나 성과 지원에 관한 명확한 피드백 대화를 6개월 넘게 단 한 번도 주시지 않아 내가 소모품처럼 지체되어 가고 있는 느낌입니다.',
    comment: '생산 압박에 비해 성장을 배려하는 코칭 및 면담의 밀도가 얕아 위기감을 느낍니다.',
    submittedAt: '2026-05-25T01:10:00Z',
    year: 2026,
  }
];

// Load submissions from persistence file, or fall back to mock data
let submissions: SurveySubmission[] = [];

try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (fs.existsSync(DATA_FILE)) {
    const dataStr = fs.readFileSync(DATA_FILE, 'utf-8');
    submissions = JSON.parse(dataStr);
    // Auto-fill missing BU property for backward compatibility
    let migrated = false;
    submissions = submissions.map(sub => {
      if (!sub.bu) {
        sub.bu = getBuFromDepartment(sub.department);
        migrated = true;
      }
      return sub;
    });
    if (migrated) {
      fs.writeFileSync(DATA_FILE, JSON.stringify(submissions, null, 2), 'utf-8');
    }
  } else {
    submissions = INITIAL_SUBMISSIONS.map(sub => ({
      ...sub,
      bu: sub.bu || getBuFromDepartment(sub.department)
    }));
    fs.writeFileSync(DATA_FILE, JSON.stringify(submissions, null, 2), 'utf-8');
  }
} catch (error) {
  console.error('Failed to initialize or read persistence file. Falling back to memory storage.', error);
  submissions = INITIAL_SUBMISSIONS.map(sub => ({
    ...sub,
    bu: sub.bu || getBuFromDepartment(sub.department)
  }));
}

const saveSubmissions = () => {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(submissions, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save submissions to file', err);
  }
};

// API: Get all submissions
app.get('/api/submissions', (req, res) => {
  res.json(submissions);
});

// API: Submit a survey
app.post('/api/submissions', (req, res) => {
  const { department, role, rank, job, answers, comment1, comment2, comment, year, bu } = req.body;

  if (!department || !answers) {
    return res.status(400).json({ error: '부서와 설문 답변 데이터는 필수 항목입니다.' });
  }

  // Double check answers completeness
  for (const q of GALLUP_Q12_QUESTIONS) {
    const score = answers[q.id];
    if (score === undefined || score < 1 || score > 5) {
      return res.status(400).json({ error: `문항 ${q.id}의 응답이 유실되었거나 범위를 벗어났습니다.` });
    }
  }

  // Handle building comments robustly
  const cleanComment1 = comment1 || '';
  const cleanComment2 = comment2 || '';
  let joinedComment = comment || '';
  if (!joinedComment) {
    if (cleanComment1 || cleanComment2) {
      joinedComment = `[유지 및 개선 희망 사항]\n${cleanComment1}\n\n[지원 및 제거 필요 요인]\n${cleanComment2}`.trim();
    }
  }

  const finalYear = year ? Number(year) : 2026; // Default to 2026 for actual current submissions
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
    year: finalYear
  };

  submissions.push(newSubmission);
  saveSubmissions();

  res.status(201).json(newSubmission);
});

// API: Bulk upload submissions (from CSV or external Google Forms import)
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

    // Validate Q1-Q20 keys are present
    const cleanAnswers: Record<string, number> = {};
    for (const q of GALLUP_Q12_QUESTIONS) {
      const score = Number(answers[q.id]);
      if (isNaN(score) || score < 1 || score > 5) {
        cleanAnswers[q.id] = 3; // Neutral default for null or skips
      } else {
        cleanAnswers[q.id] = score;
      }
    }

    const cleanComment1 = comment1 || '';
    const cleanComment2 = comment2 || '';
    let joinedComment = comment || '';
    if (!joinedComment) {
      if (cleanComment1 || cleanComment2) {
        joinedComment = `[유지 및 개선 희망 사항]\n${cleanComment1}\n\n[지원 및 제거 필요 요인]\n${cleanComment2}`.trim();
      }
    }

    // Process submission year
    let resolvedYear = year ? Number(year) : 2025;
    if (!year && submittedAt) {
      const match = String(submittedAt).match(/(20\d{2})/);
      if (match) {
        resolvedYear = Number(match[1]);
      }
    }

    const resolvedBu = bu || getBuFromDepartment(department);

    newSubmissions.push({
      id: 'submission-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
      bu: resolvedBu,
      department,
      role: role || '팀원',
      rank: rank || '사원 - 주임(JM1~SM3)',
      job: job || '영업',
      answers: cleanAnswers,
      comment1: cleanComment1,
      comment2: cleanComment2,
      comment: joinedComment,
      submittedAt: submittedAt || new Date().toISOString(),
      year: resolvedYear
    });
  }

  submissions = [...submissions, ...newSubmissions];
  saveSubmissions();

  res.status(201).json({ count: newSubmissions.length, submissions });
});

// API: Reset submissions back to pure initial mock data
app.post('/api/submissions/reset', (req, res) => {
  submissions = [...INITIAL_SUBMISSIONS];
  saveSubmissions();
  res.json({ message: 'Submissions reset to mock state.', submissions });
});

// API: Clear ALL submissions
app.post('/api/submissions/clear', (req, res) => {
  submissions = [];
  saveSubmissions();
  res.json({ message: 'All submissions cleared successfully.', submissions });
});

// API: Send aggregated results to Gemini for depth strategic reporting
app.post('/api/analyze', async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return res.status(400).json({
      error: 'Gemini API KEY가 설정되지 않았습니다. AI Studio의 Settings > Secrets 패널을 통해 GEMINI_API_KEY를 등록해 주세요.'
    });
  }

  const { filters } = req.body || {};

  try {
    // Dynamic server-side filtering to align analysis with frontend settings
    let filtered = [...submissions];
    if (filters) {
      if (filters.year && filters.year !== '전체 연도') {
        filtered = filtered.filter(sub => String(sub.year || 2025) === String(filters.year));
      }
      if (filters.bu && filters.bu !== '전체 BU') {
        filtered = filtered.filter(sub => (sub.bu || getBuFromDepartment(sub.department)) === filters.bu);
      }
      if (filters.department && filters.department !== '전체 브랜드') {
        filtered = filtered.filter(sub => sub.department === filters.department);
      }
      if (filters.role && filters.role !== '전체 직책') {
        filtered = filtered.filter(sub => (sub.role || '팀원') === filters.role);
      }
      if (filters.rank && filters.rank !== '전체 직급') {
        filtered = filtered.filter(sub => (sub.rank || '사원 - 주임(JM1~SM3)') === filters.rank);
      }
      if (filters.job && filters.job !== '전체 직무') {
        filtered = filtered.filter(sub => (sub.job || '영업') === filters.job);
      }
    }

    const totalCount = filtered.length;
    if (totalCount === 0) {
      return res.status(400).json({ error: '선택된 필터 조건에 해당하는 설문 응답 데이터가 없습니다. 먼저 적합한 표본 범위를 지정하거나 데이터를 업로드해주십시오.' });
    }

    // Calculate averages across questions
    const questionSums: Record<string, number> = {};
    const questionCounts: Record<string, number> = {};
    GALLUP_Q12_QUESTIONS.forEach(q => {
      questionSums[q.id] = 0;
      questionCounts[q.id] = 0;
    });

    // Department breakdown
    const departmentData: Record<string, { sums: Record<string, number>, count: number }> = {};

    // Comments lists
    const employeeComments: string[] = [];

    filtered.forEach(sub => {
      const dept = sub.department;
      if (!departmentData[dept]) {
        departmentData[dept] = { sums: {}, count: 0 };
        GALLUP_Q12_QUESTIONS.forEach(q => {
          departmentData[dept].sums[q.id] = 0;
        });
      }
      departmentData[dept].count += 1;

      GALLUP_Q12_QUESTIONS.forEach(q => {
        const score = sub.answers[q.id] || 0;
        questionSums[q.id] += score;
        questionCounts[q.id] += 1;
        departmentData[dept].sums[q.id] += score;
      });

      // Assemble comments to feed into LLM
      if (sub.comment1 && sub.comment1.trim()) {
        employeeComments.push(`[${dept} / ${sub.role} / ${sub.rank}]: 개선유지의견 - ${sub.comment1.trim()}`);
      }
      if (sub.comment2 && sub.comment2.trim()) {
        employeeComments.push(`[${dept} / ${sub.role} / ${sub.rank}]: 지원제거의견 - ${sub.comment2.trim()}`);
      }
      // Fail-safe fallback if sub has legacy comment field
      if (!sub.comment1 && !sub.comment2 && sub.comment && sub.comment.trim()) {
        employeeComments.push(`[${dept}]: 정성의견 - ${sub.comment.trim()}`);
      }
    });

    const questionAverages: Record<string, number> = {};
    GALLUP_Q12_QUESTIONS.forEach(q => {
      questionAverages[q.id] = Number((questionSums[q.id] / (questionCounts[q.id] || 1)).toFixed(2));
    });

    const deptAverages = Object.keys(departmentData).map(dept => {
      const data = departmentData[dept];
      const sumAll = Object.values(data.sums).reduce((a, b) => a + b, 0);
      const avg = Number((sumAll / (data.count * GALLUP_Q12_QUESTIONS.length)).toFixed(2));
      return { department: dept, count: data.count, average: avg };
    });

    // Grouping by categories for dimensions: support, alignment, growth, overall
    const categorySums: Record<string, number> = { support: 0, alignment: 0, growth: 0, overall: 0 };
    const categoryCounts: Record<string, number> = { support: 0, alignment: 0, growth: 0, overall: 0 };

    GALLUP_Q12_QUESTIONS.forEach(q => {
      categorySums[q.category] += questionAverages[q.id];
      categoryCounts[q.category] += 1;
    });

    const categoryAverages: Record<string, number> = {};
    Object.keys(categorySums).forEach(cat => {
      categoryAverages[cat] = Number((categorySums[cat] / (categoryCounts[cat] || 1)).toFixed(2));
    });

    // Create a filter context narrative for the LLM
    const filterYearText = filters?.year || '전체 연도';
    const filterBuText = filters?.bu || '전체 BU';
    const filterDeptText = filters?.department || '전체 브랜드';
    const filterRoleText = filters?.role || '전체 직책';
    const filterRankText = filters?.rank || '전체 직급';
    const filterJobText = filters?.job || '전체 직무';

    const prompt = `
당신은 대한민국 최고의 인사 조직 경영 컨설팅 전문가이자 이랜드패션 전담 조직문화 고도화 자문역입니다.
제공된 이랜드패션 임직원 20개 문항 설문 분석 원 데이터를 바탕으로, 경영진과 BU 브랜드장들이 한눈에 우리 회사의 현주소를 이해하고 적극 실행할 수 있는 고부가가치 피드백 리포트를 한국어로 정중하고 격조 있는 전문가 톤으로 작성해 주세요.

## 현재 분석 대상 필터 상태:
- 분석 연도 범위: ${filterYearText}
- 소속 BU 범위: ${filterBuText}
- 브랜드 소속: ${filterDeptText}
- 직책 범위: ${filterRoleText}
- 직급 범위: ${filterRankText}
- 직무 범위: ${filterJobText}
(위 세부 필터 조건에 부속된 데이터만 집중 분석하여 작성해 주십시오. 요약 결과나 권고안은 이 필터링된 집단에 특화되어야 합니다.)

## 1. 설문 기본 통계 데이터 (필터 반영 수치)
- 총 설문 참여 임직원 수: ${totalCount}명
- 각 문항별 평균 점수 (5점 만점):
${GALLUP_Q12_QUESTIONS.map(q => `  * [${q.id}] ${q.text} (평균: ${questionAverages[q.id]}점)`).join('\n')}

- 카테고리(몰입 4대 계층 레이어)별 평균 점수:
  1. 몰입 환경 및 존중 (Environment & Respect - Q01 ~ Q05): ${categoryAverages.support}점
  2. 조직 정렬과 유대 (Alignment & Connection - Q06 ~ Q11): ${categoryAverages.alignment}점
  3. 역할 수행과 성장 (Role & Personal Growth - Q12 ~ Q17): ${categoryAverages.growth}점
  4. 전사 추천 및 잔존 (Loyalty & Recommendation - Q18 ~ Q20): ${categoryAverages.overall}점

- 브랜드/BU별 평균 점수:
${deptAverages.map(d => `  * ${d.department}: 평균 ${d.average}점 (${d.count}명 참여)`).join('\n')}

- 임직원들이 남긴 익명 정성 의견 리스트 (익명 보장 및 필터링 완료):
${employeeComments.length > 0 ? employeeComments.map(c => `  > ${c}`).join('\n') : '  (기재된 구체적 서술 의견이 없습니다)'}

---

## 리포트에 반드시 포함해야 하는 단락 상세 가이드:
1. **CEO 및 BU 리더를 위한 종합 진단 요약 (Executive Summary)**: 
   - 현재 지정된 분석 범위(${filterYearText}년, 브랜드: ${filterDeptText} 등) 조직의 전체적인 몰입 수준(온도)과 응집력을 한 문장으로 직관적으로 설명해 주세요.
   - 조직 성향 4대 레이어 관점에서 우리 브랜드 연합체가 현재 어느 영역에서 잘 견디고 있고, 어디가 흔들리고 있는지를 거시적으로 진단해 주세요.
   
2. **최우수 강점 요인 (Core Strengths of E-Land Fashion)**:
   - 평균 점수가 가장 우수하게 나타난 2~3개 문항을 추리고, 이 문항들이 지니는 조직학적 의미와 이를 계속 강화·확산코자 BU단위에서 정립해야 할 점을 서술해 주세요.

3. **최우선 개선 필요 요인 (Key Areas for Improvement)**:
   - 평균 점수가 가장 미흡하게 나타난 2~3개 문항을 꼽아 깊이 해부하고, 직무/직책/직급별 가중치 및 정성 의견들과 매칭하여 직원이 호소하는 진짜 병목(예: 본사-현장 소통 부재, 성장 가이드 결핍, 칭찬 부재 등)을 진단합니다.

4. **브랜드 부서별 격차 분석 (Brand Portfolio Insights)**:
   - 브랜드(본사, 현장) 통계별 평균 점수가 보여주는 차이점을 진단해 주세요. 어떤 소속 브랜드가 강하고, 어떤 브랜드가 긴밀한 개입 및 케어를 필요로 하는지 짚어 줍니다.

5. **실행 가능한 BU 관리자용 가이드북 (Operational Action Playbook for Brand Managers)**:
   - 우려 사항들을 해결하기 위해, 일선 점장/브랜드장 등 리더들이 **다음 주 월요일부터 곧장 현장에 적용 가능한 쉽고 강력하며 아주 구체적인 액셔너블 플랜 3가지**를 처방해 주세요.
   - 이 제안은 일반적인 권고가 아닌, 이랜드 특성(현장 영업과 본사 오피스의 조화, 브랜드 중심 구조)에 특화되고 정성 의견(예: 피드백 면담 요청, 장비 노후화 개선, 보고 완화 등)에 수렴하는 실질적인 규율체계, 미팅 양식 또는 보상 의식을 다루어야 합니다.

의사결정 보고서 형식으로 극도의 가독성을 높여 마크다운(Markdown) 포맷으로 회신해 주세요. 바로 본론 리포트를 정중하게 상정해 주십시오.`;

    const ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    const analysisReport = response.text || "분석 결과를 출력하지 못했습니다.";
    res.json({ report: analysisReport });

  } catch (error: any) {
    console.error('Gemini API analysis failed', error);
    res.status(500).json({
      error: `Gemini 분석 처리 중 문제가 발생했습니다: ${error.message || error}`
    });
  }
});

// Serve frontend assets
if (process.env.NODE_ENV !== "production") {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
} else {
  const distPath = path.join(process.cwd(), 'dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
