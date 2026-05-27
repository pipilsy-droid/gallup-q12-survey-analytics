/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Q12Question {
  id: string; // Q01 ~ Q20 (17 Core + 3 Composite)
  text: string;
  category: 'support' | 'alignment' | 'growth' | 'overall';
  categoryLabel: string;
  description: string; // Detail purpose / coaching context
}

export interface SurveySubmission {
  id: string;
  bu?: string; // BU
  department: string; // Brand: (본사)뉴발란스, (현장)스파오 등
  role: string; // 직책: 팀원, 팀장 이상 ...
  rank: string; // 직급: 사원-주임, 대리, 과장, 차장 이상
  job: string; // 직무: 기획MD, 온라인MD, 영업 등
  answers: Record<string, number>; // Q01 ~ Q20
  comment1?: string; // 서술형1: 개선 및 유지 의견
  comment2?: string; // 서술형2: 지원 및 제거 의견
  comment?: string; // Joined comments
  submittedAt: string;
  year?: number;
}

export const BUS = [
  '스포츠BU',
  '스파오BU',
  '여성BU',
  '온라인BU',
  '슈펜BU',
  '폴더BU',
  '스탭/기타'
];

export const getBuFromDepartment = (dept: string): string => {
  const cleanDept = dept || '';
  if (cleanDept.includes('뉴발란스') || cleanDept.includes('스포츠')) return '스포츠BU';
  if (cleanDept.includes('스파오') || cleanDept.includes('후아유')) return '스파오BU';
  if (cleanDept.includes('온라인')) return '온라인BU';
  if (cleanDept.includes('슈펜')) return '슈펜BU';
  if (cleanDept.includes('폴더')) return '폴더BU';
  if (cleanDept.includes('로엠') || cleanDept.includes('에블린') || cleanDept.includes('클라비스') || cleanDept.includes('미쏘') || cleanDept.includes('여성')) return '여성BU';
  return '스탭/기타';
};

export interface DepartmentSummary {
  department: string;
  count: number;
  average: number;
  categoryAverages: Record<string, number>;
}

export interface DashboardStats {
  totalCount: number;
  overallAverage: number;
  categoryAverages: Record<string, number>;
  questionAverages: Record<string, number>;
  departmentSummaries: DepartmentSummary[];
  engagementRate: number; // Percentage of highly engaged answers (score 4 or 5)
}

export const CATEGORY_LABELS = {
  support: '몰입 환경 및 존중 (Environment & Respect)',
  alignment: '조직 정렬과 유대 (Alignment & Connection)',
  growth: '역할 수행과 성장 (Role & Personal Growth)',
  overall: '전사 추천 및 잔존 (Loyalty & Recommendation)',
};

export const DEPARTMENTS = [
  '(본사)뉴발란스',
  '(본사)스파오BU',
  '(본사)온라인BU',
  '(본사)뉴발란스키즈',
  '(본사)스포츠BU 본부',
  '(본사)슈펜',
  '(본사)여성BU 본부',
  '(본사)로엠',
  '(본사)에블린',
  '(본사)클라비스',
  '(본사)폴더',
  '(본사)법인 본부(패션BG, 사업형 CO)',
  '(본사)후아유',
  '(현장)스파오',
  '(현장)미쏘',
  '(현장)폴더',
  '(현장)슈펜',
  '(현장)뉴발란스/뉴발란스키즈'
];

export const ROLES = [
  '팀원',
  '팀장 이상 ((현장)점장/부점장 , (본사)브랜드장/부서장/실장 등)'
];

export const RANKS = [
  '사원 - 주임(JM1~SM3)',
  '대리(SM4~SM5)',
  '과장',
  '차장 이상'
];

export const JOBS = [
  '상품기획 (기획MD)',
  '온라인MD / 웹D',
  '디자이너 (의상/VMD/광고/인테리어)',
  '마케팅 (IMC/콜라보 등 마케팅 전반)',
  '영업',
  '통합생산 / 기술연구실',
  '물류 / CS 센터',
  '기타 스탭조직 (각 조직 본부, 스탭/지원 부서 등)'
];

export const GALLUP_Q12_QUESTIONS: Q12Question[] = [
  {
    id: 'Q01',
    text: '나의 상사와 동료들은 내 문제를 내가 스스로 해결할 수 있도록 주도권을 준다.',
    category: 'support',
    categoryLabel: '몰입 환경 및 존중',
    description: '스스로 업무를 해결할 주도권을 가질 때 높은 몰입감과 주도성이 자라납니다.',
  },
  {
    id: 'Q02',
    text: '이랜드패션에는 주변 사람들에게 자랑할 만한 문화가 있다.',
    category: 'support',
    categoryLabel: '몰입 환경 및 존중',
    description: '회사의 조직 문화에 대한 자랑과 자부심은 일에 심리적 가치를 보태어 줍니다.',
  },
  {
    id: 'Q03',
    text: '나의 업무를 수행하기 위해 필요한 도구, 정보, 지식을 적시에 제공 받는다.',
    category: 'support',
    categoryLabel: '몰입 환경 및 존중',
    description: '일을 잘 해내기 위한 하드웨어, 데이터, 사내 정보 전수가 제때 지원되는지 판단합니다.',
  },
  {
    id: 'Q04',
    text: '최근 일주일 동안 업무를 수행하면서 칭찬/인정/격려를 받았다.',
    category: 'support',
    categoryLabel: '몰입 환경 및 존중',
    description: '단기적인 주간 칭찬과 인정은 가시적인 동기를 부여하는 윤활유가 됩니다.',
  },
  {
    id: 'Q05',
    text: '나의 상사와 동료들은 나를 인간적으로 존중해준다.',
    category: 'support',
    categoryLabel: '몰입 환경 및 존중',
    description: '한 인간으로서 격의 없고 서로 존중받는 분위기는 강력한 심리적 유대감을 성형합니다.',
  },
  {
    id: 'Q06',
    text: '브랜드/부서 내에서 나의 의견을 자유롭게 말할 수 있다.',
    category: 'alignment',
    categoryLabel: '조직 정렬과 유대',
    description: '내 목소리가 부서 의사결정에 닿고 존중될 때 주인의식과 몰입이 강화됩니다.',
  },
  {
    id: 'Q07',
    text: '브랜드/부서에서 나의 속마음을 얘기할 수 있는 친한 동료가 있다.',
    category: 'alignment',
    categoryLabel: '조직 정렬과 유대',
    description: '조직 내에서 심리적 안전감을 공유할 수 있는 동료(절친)는 스트레스 해소와 조기 이탈 방지의 핵심입니다.',
  },
  {
    id: 'Q08',
    text: '나는 우리 브랜드/부서의 비전, 미션, 가치를 명확하게 알고 있다.',
    category: 'alignment',
    categoryLabel: '조직 정렬과 유대',
    description: '개인의 업무가 브랜드의 나침반과 일렬로 정렬되도록 미션을 이해하고 동조하는 정도를 측정합니다.',
  },
  {
    id: 'Q09',
    text: '나는 우리 브랜드/부서가 나에게 무엇을 기대하고 있는지 알고 있다.',
    category: 'alignment',
    categoryLabel: '조직 정렬과 유대',
    description: '이번 분기, 이번 달에 내가 해내야 하는 기대 성과치와 나의 책임 반경을 분명히 인지하는 기본 역량입니다.',
  },
  {
    id: 'Q10',
    text: '브랜드/부서의 비전, 미션, 가치는 내가 하는 일의 의미를 알게 한다.',
    category: 'alignment',
    categoryLabel: '조직 정렬과 유대',
    description: '회사의 목적과 내 고유 업무가 결합되어 단순 노동 이상의 영감을 주는지 점검합니다.',
  },
  {
    id: 'Q11',
    text: '내 업무 목표는 브랜드/부서의 업무 목표와 연관되어 있다.',
    category: 'alignment',
    categoryLabel: '조직 정렬과 유대',
    description: '부서 전체 목표와 개별 성과가 연결되어 한 팀으로서 유기적으로 기능하고 있는지 기여를 점검합니다.',
  },
  {
    id: 'Q12',
    text: '나는 내 능력이 커짐에 따라 더 큰 책임을 맡고 있다.',
    category: 'growth',
    categoryLabel: '역할 수행과 성장',
    description: '보안되거나 커진 개개인의 기량을 보어주며, 업무 난이도 및 보폭의 확장에 자부심을 심어주는지 파악합니다.',
  },
  {
    id: 'Q13',
    text: '브랜드/부서는 나의 강점에 맞는 기회를 제공한다.',
    category: 'growth',
    categoryLabel: '역할 수행과 성장',
    description: '약점 개선에 시간 허비하기보다는 개인이 가지고 있는 전용 소질과 강점을 극대화시키는 배치 전략입니다.',
  },
  {
    id: 'Q14',
    text: '브랜드/부서에서 나의 발전을 독려해 주는 사람이 있다.',
    category: 'growth',
    categoryLabel: '역할 수행과 성장',
    description: '단순 보스가 아닌 멘토나 코치처럼 발전을 동기화시켜 주는 조력자가 부부 내에 있는지 확인합니다.',
  },
  {
    id: 'Q15',
    text: '나의 동료들은 조직의 목표를 달성하기 위해 책임을 다한다.',
    category: 'growth',
    categoryLabel: '역할 수행과 성장',
    description: '누군가 태만하다 느끼지 않고 동료 모두가 품질과 목표에 책임감을 보인다는 상호 신뢰입니다.',
  },
  {
    id: 'Q16',
    text: '최근 6개월 동안 브랜드/부서에서 누군가가 나의 발전에 관해 이야기한 적이 있다.',
    category: 'growth',
    categoryLabel: '역할 수행과 성장',
    description: '정기 피드백 면담을 통해 단순 평가를 넘어 미래의 지향 성장 방향에 대해 교감했음을 검증합니다.',
  },
  {
    id: 'Q17',
    text: '최근 1년 동안 이랜드패션에서 배우고 성장할 수 있는 기회를 제공 받았다.',
    category: 'growth',
    categoryLabel: '역할 수행과 성장',
    description: '고여있는 기분이 들지 않고 교육, 도전 프로젝트 등을 통해 한 단계 업그레이드 되고 있음을 말합니다.',
  },
  {
    id: 'Q18',
    text: '(종합1) 나는 우리 이랜드패션의 상품 / 서비스를 지인에게 추천한다.',
    category: 'overall',
    categoryLabel: '전사 추천 및 잔존',
    description: '스스로 판매하는 자사 상품과 서비스에 자부심을 느끼고 이웃에게 추천할 수 있는 적극적 로열티 자산입니다.',
  },
  {
    id: 'Q19',
    text: '(종합2) 나는 주변 사람들에게 우리 이랜드패션이 매우 좋은 직장이라고 추천할 수 있다.',
    category: 'overall',
    categoryLabel: '전사 추천 및 잔존',
    description: '일터의 근무 환경뿐 아니라 내외부 명성 관점에서 이랜드패션을 훌륭한 터전으로 선망 추천하는 지표입니다.',
  },
  {
    id: 'Q20',
    text: '(종합3) 나는 최근 3개월 동안 이랜드패션을 떠나야겠다는 생각을 한 적이 거의 없다.',
    category: 'overall',
    categoryLabel: '전사 추천 및 잔존',
    description: '잔존 의향(Retention Intent)을 평가해 불필요한 인재 유출 경고등과 소속 열의를 모니터할 수 있는 직접 질문입니다.',
  },
];
