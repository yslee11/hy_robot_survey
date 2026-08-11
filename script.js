/*
  Google Apps Script 배포 URL을 아래에 붙여넣으세요.
  예: const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/배포ID/exec';
*/
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx1KUVFGFDuRQLhqnH6PToOD6I2DR4MDLee2un0cBVBh0of6Ih4zJDdIBaMkA7-CD9Saw/exec';

// ─── 단계 설정 ───────────────────────────────────────────────
const TOTAL_STEPS = 6;
const STEP_LABELS = ['안내 및 동의', '기본 정보', '공간 이용', '기술 경험', '중요도 비교', '최종 의견'];
let currentStep = 1;

// ─── 설문 데이터 ──────────────────────────────────────────────
const factors = [
  {
    name: '신체적 안전함',
    desc: '로봇이 본인 또는 주변 사람에게 위험하지 않다고 느끼는 정도. 사람, 어린이, 유모차, 반려견과 부딪히지 않고 안전하게 멈추어야 함.'
  },
  {
    name: '심리적 편안함',
    desc: '로봇을 마주쳤을 때 무섭거나 부담스럽지 않은 정도. 화면, 불빛, 소리 등으로 움직임을 예측하기 쉬워야 함.'
  },
  {
    name: '사생활 보호',
    desc: '로봇이 촬영한 영상이나 위치정보를 운영기관이 함부로 사용하지 않을 것이라고 믿을 수 있는 정도.'
  },
  {
    name: '사회적 편익',
    desc: '사회 전체 구성원이 얻는 총체적인 이익과 만족감을 줄 수 있는 정도.'
  },
  {
    name: '공간적 어울림',
    desc: '로봇의 크기, 모습, 움직임이 거리나 장소 분위기와 잘 맞고 보도와 출입구를 방해하지 않는 정도.'
  }
];

// 비교 방향은 항상 위계 목록의 앞 항목 → 뒤 항목 순서로 고정합니다.
// legacyLeft / legacyRight는 기존 Google Apps Script 제출 key를 유지하기 위한 값입니다.
// 화면 문항은 바뀌지만 기존 A1~A10 저장 매핑은 깨지지 않습니다.
const criteriaPairs = [
  { left: '신체적 안전함', right: '심리적 편안함', legacyLeft: '신체적 안전함', legacyRight: '심리적 편안함' },
  { left: '신체적 안전함', right: '사생활 보호',   legacyLeft: '심리적 편안함', legacyRight: '사생활 보호' },
  { left: '신체적 안전함', right: '사회적 편익',   legacyLeft: '사생활 보호', legacyRight: '사회적 편익' },
  { left: '신체적 안전함', right: '공간적 어울림', legacyLeft: '사회적 편익', legacyRight: '공간적 어울림' },
  { left: '심리적 편안함', right: '사생활 보호',   legacyLeft: '공간적 어울림', legacyRight: '신체적 안전함' },
  { left: '심리적 편안함', right: '사회적 편익',   legacyLeft: '신체적 안전함', legacyRight: '사생활 보호' },
  { left: '심리적 편안함', right: '공간적 어울림', legacyLeft: '사생활 보호', legacyRight: '공간적 어울림' },
  { left: '사생활 보호',   right: '사회적 편익',   legacyLeft: '공간적 어울림', legacyRight: '심리적 편안함' },
  { left: '사생활 보호',   right: '공간적 어울림', legacyLeft: '심리적 편안함', legacyRight: '사회적 편익' },
  { left: '사회적 편익',   right: '공간적 어울림', legacyLeft: '사회적 편익', legacyRight: '신체적 안전함' }
];

// 로봇 비교도 항상 바퀴형 → 4족형 → 휴머노이드 순서를 유지합니다.
// legacyLeft / legacyRight는 기존 B1~F3 제출 key 호환용입니다.
const robotPairs = [
  { left: '바퀴형 로봇(1)', right: '4족형 로봇(2)', legacyLeft: '바퀴형 로봇(1)', legacyRight: '4족형 로봇(2)' },
  { left: '바퀴형 로봇(1)', right: '휴머노이드(3)',  legacyLeft: '4족형 로봇(2)', legacyRight: '휴머노이드(3)' },
  { left: '4족형 로봇(2)', right: '휴머노이드(3)',  legacyLeft: '휴머노이드(3)', legacyRight: '바퀴형 로봇(1)' }
];

const robotCriteria = [
  { key: 'physical_safety', title: '신체적 안전함', desc: '로봇이 본인 또는 주변 사람에게 신체적으로 위험하지 않다고 느끼는 정도' },
  { key: 'psychological_comfort', title: '심리적 편안함', desc: '로봇을 마주쳤을 때 외형적으로 무섭거나 부담스럽지 않은 정도' },
  { key: 'privacy_trust', title: '사생활 보호', desc: '로봇을 운영하고 관리하는 방식을 믿을 수 있는 정도' },
  { key: 'social_benefit', title: '사회적 편익', desc: '사회 전체 구성원이 얻는 총체적인 이익과 만족감을 줄 수 있는 정도' },
  { key: 'spatial_fit', title: '공간적 어울림', desc: '로봇의 크기, 모습, 움직임이 거리나 공공장소 분위기와 잘 맞는 정도' }
];

// 7개 응답 범주: 매우 중요(7) - 중요(5) - 약간 중요(3) - 동등(1)
//                 - 약간 중요(3) - 중요(5) - 매우 중요(7)
// 분석 시 오른쪽 선택값(B)은 각각 1/3, 1/5, 1/7로 변환합니다.
const comparisonOptions = [
  { label: '7', value: 'A_7_매우중요' },
  { label: '5', value: 'A_5_중요' },
  { label: '3', value: 'A_3_약간중요' },
  { label: '1', value: '동등_1', center: true },
  { label: '3', value: 'B_3_약간중요' },
  { label: '5', value: 'B_5_중요' },
  { label: '7', value: 'B_7_매우중요' }
];

// ─── 유틸 ─────────────────────────────────────────────────────
function slugify(text) {
  return text
    .replace(/[\s()]/g, '_')
    .replace(/[가-힣]/g, char => char.charCodeAt(0).toString(36))
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

function setMessage(text, type = '') {
  const message = document.getElementById('formMessage');
  message.textContent = text;
  message.className = type;
}

// ─── 진행 표시기 ───────────────────────────────────────────────
function buildProgress() {
  const container = document.getElementById('surveyProgress');
  if (!container) return;

  const stepsEl = document.createElement('div');
  stepsEl.className = 'progress-steps';
  stepsEl.id = 'progressSteps';

  STEP_LABELS.forEach((label, i) => {
    const stepNum = i + 1;

    const item = document.createElement('div');
    item.className = 'step-item';

    const dot = document.createElement('div');
    dot.className = 'step-dot';
    dot.id = `stepDot${stepNum}`;
    dot.textContent = stepNum;

    const labelEl = document.createElement('span');
    labelEl.className = 'step-label';
    labelEl.id = `stepLabel${stepNum}`;
    labelEl.textContent = label;

    item.appendChild(dot);
    item.appendChild(labelEl);
    stepsEl.appendChild(item);
  });

  container.appendChild(stepsEl);
}

function updateProgress(n) {
  const stepsEl = document.getElementById('progressSteps');
  if (!stepsEl) return;

  // ::before 그라디언트로 진행 선 채우기
  const pct = TOTAL_STEPS > 1 ? ((n - 1) / (TOTAL_STEPS - 1)) * 100 : 0;
  stepsEl.style.setProperty('--fill', `${pct}%`);

  for (let i = 1; i <= TOTAL_STEPS; i++) {
    const dot = document.getElementById(`stepDot${i}`);
    const labelEl = document.getElementById(`stepLabel${i}`);
    if (!dot) continue;

    const isDone = i < n;
    const isActive = i === n;

    dot.classList.toggle('done', isDone);
    dot.classList.toggle('active', isActive);
    dot.textContent = isDone ? '✓' : i;

    if (labelEl) {
      labelEl.classList.toggle('active', isActive);
    }
  }
}

// ─── 단계 표시/숨김 ────────────────────────────────────────────
function showStep(n) {
  document.querySelectorAll('[data-step]').forEach(el => {
    el.classList.toggle('step-active', el.dataset.step === String(n));
  });

  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const submitBtn = document.getElementById('submitBtn');
//  const downloadBtn = document.getElementById('downloadBtn');

  prevBtn.style.display = n === 1 ? 'none' : '';
  nextBtn.style.display = n === TOTAL_STEPS ? 'none' : '';
  submitBtn.style.display = n === TOTAL_STEPS ? '' : 'none';
//  downloadBtn.style.display = n === TOTAL_STEPS ? '' : 'none';

  updateProgress(n);
  setMessage('');
  currentStep = n;

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showThankYou() {
  // 모든 단계 숨기기
  document.querySelectorAll('[data-step]').forEach(el => el.classList.remove('step-active'));
  // 진행 표시기 · 네비게이션 · 폼 숨기기
  document.getElementById('surveyProgress').hidden = true;
  document.querySelector('.step-nav').hidden = true;
  document.getElementById('surveyForm').hidden = true;
  // 완료 화면 표시
  document.getElementById('thankYouCard').hidden = false;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}


// ─── 현재 단계 유효성 검사 ─────────────────────────────────────
function validateCurrentStep() {
  const stepEl = document.querySelector(`[data-step="${currentStep}"]`);
  if (!stepEl) return true;

  // 1. 필수 개별 체크박스 (동의 등)
  const requiredCbs = stepEl.querySelectorAll('input[type="checkbox"][required]');
  for (const cb of requiredCbs) {
    if (!cb.checked) {
      cb.closest('label')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setMessage('필수 동의 항목을 체크해주세요.', 'error');
      return false;
    }
  }

  // 2. 필수 텍스트 입력
  const textInputs = stepEl.querySelectorAll('input[type="text"][required]');
  for (const input of textInputs) {
    if (!input.value.trim()) {
      input.scrollIntoView({ behavior: 'smooth', block: 'center' });
      input.focus();
      setMessage('필수 항목을 입력해주세요.', 'error');
      return false;
    }
  }

  // 3. 필수 라디오 그룹 (required 속성 기준)
  const radioNames = new Set(
    [...stepEl.querySelectorAll('input[type="radio"][required]')].map(r => r.name)
  );
  for (const name of radioNames) {
    const checked = document.querySelector(`input[name="${name}"]:checked`);
    if (!checked) {
      const firstRadio = stepEl.querySelector(`input[name="${name}"]`);
      const container = firstRadio?.closest('fieldset, .scale-block, .comparison-row, .robot-criteria-group');
      (container || firstRadio)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setMessage('필수 문항을 모두 응답해 주세요.', 'error');
      return false;
    }
  }

  // 4. 체크박스 그룹 (하나 이상 선택 필수)
  const cbGroups = stepEl.querySelectorAll('[data-required-checkbox]');
  for (const group of cbGroups) {
    const name = group.dataset.requiredCheckbox;
    const checked = group.querySelectorAll(`input[name="${name}"]:checked`).length > 0;
    if (!checked) {
      group.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setMessage('하나 이상 선택해주세요.', 'error');
      return false;
    }
  }

  return true;
}

// ─── DOM 생성 함수 ─────────────────────────────────────────────
function createLikert(name, max = 5) {
  const container = document.querySelector(`.likert[data-name="${name}"]`);
  if (!container) return;
  for (let i = 1; i <= max; i += 1) {
    const label = document.createElement('label');
    label.innerHTML = `<input type="radio" name="${name}" value="${i}" required />${i}`;
    container.appendChild(label);
  }
}

function createDefinitions() {
  const target = document.getElementById('definitions');
  if (!target) return;
  factors.forEach(factor => {
    const item = document.createElement('article');
    item.className = 'definition';
    item.innerHTML = `<strong>${factor.name}</strong><span>${factor.desc}</span>`;
    target.appendChild(item);
  });
}

function createComparisonRow({ name, left, right, title, mode = 'criteria' }) {
  const row = document.createElement('div');
  row.className = 'comparison-row';

  const optionsHtml = comparisonOptions.map(option => `
    <label class="${option.center ? 'center' : ''}">
      <input type="radio" name="${name}" value="${option.value}" required />
      ${option.label}
    </label>
  `).join('');

  const middleText = mode === 'robot'
    ? '왼쪽이 더 적합 ⇄ 오른쪽이 더 적합'
    : '왼쪽이 더 중요 ⇄ 오른쪽이 더 중요';

  const leftCaption = mode === 'robot' ? '왼쪽 매우 적합' : '왼쪽 매우 중요';
  const rightCaption = mode === 'robot' ? '오른쪽 매우 적합' : '오른쪽 매우 중요';

  row.innerHTML = `
    ${title ? `<p class="question-title">${title}</p>` : ''}
    <div class="comparison-head">
      <span>${left}</span>
      <span class="vs">${middleText}</span>
      <span class="right">${right}</span>
    </div>
    <div class="comparison-scale">${optionsHtml}</div>
    <div class="scale-caption"><span>${leftCaption}</span><span>동등</span><span>${rightCaption}</span></div>
  `;
  return row;
}

function createCriteriaComparisons() {
  const target = document.getElementById('criteriaComparisons');
  criteriaPairs.forEach(({ left, right, legacyLeft, legacyRight }, index) => {
    // 기존 Apps Script HEADER_LABELS와의 호환을 위해 제출 key는 변경 전 pair를 사용
    const name = `criteria_${index + 1}_${slugify(legacyLeft)}_vs_${slugify(legacyRight)}`;
    target.appendChild(createComparisonRow({ name, left, right, mode: 'criteria' }));
  });
}

function createRobotComparisons() {
  const target = document.getElementById('robotComparisons');
  robotCriteria.forEach(criteria => {
    const group = document.createElement('section');
    group.className = 'robot-criteria-group';
    group.innerHTML = `<h4>${criteria.title} <span class="helper">(${criteria.desc})</span></h4>`;
    robotPairs.forEach(({ left, right, legacyLeft, legacyRight }, index) => {
      // 기존 Apps Script HEADER_LABELS와의 호환을 위해 제출 key는 변경 전 pair를 사용
      const name = `robot_${criteria.key}_${index + 1}_${slugify(legacyLeft)}_vs_${slugify(legacyRight)}`;
      group.appendChild(createComparisonRow({ name, left, right, mode: 'robot' }));
    });
    target.appendChild(group);
  });
}

// ─── 폼 데이터 / 제출 ─────────────────────────────────────────
function formToObject(form) {
  const formData = new FormData(form);
  const data = {};

  for (const [key, value] of formData.entries()) {
    if (data[key] === undefined) {
      data[key] = value;
    } else if (Array.isArray(data[key])) {
      data[key].push(value);
    } else {
      data[key] = [data[key], value];
    }
  }

  Object.keys(data).forEach(key => {
    if (Array.isArray(data[key])) data[key] = data[key].join(', ');
  });

  data.submitted_at = new Date().toISOString();
  data.user_agent = navigator.userAgent;
  return data;
}

//function downloadJson(data) {
//  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
//  const url = URL.createObjectURL(blob);
//  const a = document.createElement('a');
//  a.href = url;
//  a.download = `physical_ai_survey_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
//  document.body.appendChild(a);
//  a.click();
//  a.remove();
//  URL.revokeObjectURL(url);
//}

async function submitToGoogleSheet(data) {
  if (!GOOGLE_SCRIPT_URL) {
    throw new Error('GOOGLE_SCRIPT_URL이 비어 있습니다. script.js에 Google Apps Script 웹앱 URL을 입력하세요.');
  }

  // text/plain은 브라우저가 CORS preflight를 발생시키지 않아
  // no-cors 환경에서 가장 안정적으로 Apps Script에 데이터를 전달합니다.
  await fetch(GOOGLE_SCRIPT_URL, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
    body: JSON.stringify(data)
  });
}

// ─── 초기화 ───────────────────────────────────────────────────
function init() {
  // 콘텐츠 생성
  createLikert('tech_adoption');
  createLikert('overall_attitude');
  createDefinitions();
  createCriteriaComparisons();
  createRobotComparisons();

  // 진행 표시기 생성
  buildProgress();

  // 첫 단계 표시
  showStep(1);

  const form = document.getElementById('surveyForm');
  const submitBtn = document.getElementById('submitBtn');
//  const downloadBtn = document.getElementById('downloadBtn');
  const nextBtn = document.getElementById('nextBtn');
  const prevBtn = document.getElementById('prevBtn');

  // 다음 버튼
  nextBtn.addEventListener('click', () => {
    if (!validateCurrentStep()) return;
    if (currentStep < TOTAL_STEPS) showStep(currentStep + 1);
  });

  // 이전 버튼
  prevBtn.addEventListener('click', () => {
    if (currentStep > 1) showStep(currentStep - 1);
  });

  // JSON 다운로드 버튼
//  downloadBtn.addEventListener('click', () => {
//    const data = formToObject(form);
//    downloadJson(data);
//  });

  // 제출
  form.addEventListener('submit', async event => {
    event.preventDefault();
    setMessage('');

    if (!validateCurrentStep()) return;

    const data = formToObject(form);
    submitBtn.disabled = true;
    submitBtn.textContent = '제출 중...';

    try {
      await submitToGoogleSheet(data);
      localStorage.setItem('physical_ai_survey_last_response', JSON.stringify(data));
      showThankYou();          // ← form.reset(); showStep(1); 대신
      return;                  // finally에서 버튼 복구되지만 이미 숨겨진 상태
    } catch (error) {
      console.error(error);
      setMessage(error.message, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = '설문 제출하기';
    }
  });
}

document.addEventListener('DOMContentLoaded', init);

