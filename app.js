// app.js – 화면 동작 (목록 그리기, 일정 추가)

// 04 단원 : 일정 목록은 Supabase 표 wx_tasks 에서 읽고 저장 (가상 데이터)
let tasks = [];
let weatherByRegion = {};   // 03 단원에서 지역별 날씨를 넣음

// 연결 정보(config.js)가 비었거나 supabase-js를 못 불러오면 null
const db = (window.supabase && SUPABASE_URL && SUPABASE_ANON_KEY)
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

function showMsg(text) {
  document.getElementById('msgBox').textContent = text;
}

// wx_tasks 를 저장 순서대로 읽음
async function loadTasks() {
  if (!db) {
    showMsg('Supabase 연결 정보가 없습니다. config.js 에 주소와 공개용 키를 넣어 주세요.');
    return;
  }
  const { data, error } = await db
    .from('wx_tasks')
    .select('title, region, kind, owner')
    .order('created_at', { ascending: true });
  if (error) {
    showMsg('일정을 읽지 못했습니다 : ' + error.message);
    return;
  }
  tasks = data;
}

function weatherText(w) {
  return w ? w.tempMax + '℃ · ' + w.windMax + 'm/s · ' + w.rainProb + '%' : '-';
}

function renderTasks() {
  const body = document.getElementById('taskList');
  body.innerHTML = '';
  for (const t of tasks) {
    const w = weatherByRegion[t.region];
    const r = judge(t.kind, w);
    const tr = document.createElement('tr');
    for (const v of [t.title, t.region, t.kind, t.owner, weatherText(w)]) {
      const td = document.createElement('td');
      td.textContent = v;
      tr.appendChild(td);
    }
    const td = document.createElement('td');
    td.textContent = r.text;
    td.className = r.level;
    tr.appendChild(td);
    body.appendChild(tr);
  }
}

async function addTask(e) {
  e.preventDefault();
  const form = e.target;
  const t = {
    title: document.getElementById('titleInput').value.trim(),
    region: document.getElementById('regionInput').value,
    kind: document.getElementById('kindInput').value,
    owner: document.getElementById('ownerInput').value.trim(),
  };
  if (!t.title || !t.owner) return;
  if (!db) {
    showMsg('Supabase 연결 정보가 없어 저장할 수 없습니다.');
    return;
  }
  const { error } = await db.from('wx_tasks').insert(t);
  if (error) {
    showMsg('저장하지 못했습니다 : ' + error.message);
    return;
  }
  showMsg('');
  form.reset();
  await loadTasks();
  renderTasks();
}

// 오늘 날짜 (현지 시간 기준 YYYY-MM-DD)
function todayText() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}

function showToday() {
  document.getElementById('todayDate').textContent = todayText();
}

// 04 단원 : 오늘 판단을 md 파일로 저장
function mdCell(v) {
  return String(v).replace(/\|/g, '\\|').replace(/[\r\n]+/g, ' ');
}

// 날씨 상자 문구(지역 수 · 실패 · 시험 모드)를 그대로 한 줄로 적음
function buildMarkdown() {
  const lines = [
    '# 현장 일정 날씨판 – ' + todayText(),
    '',
    '- ' + document.getElementById('weatherBox').textContent,
    '- 기준 : 교육용 가상 기준 (R-01~R-05)',
    '',
    '| 일정 | 지역 | 구분 | 담당 | 날씨 | 판단 |',
    '|---|---|---|---|---|---|',
  ];
  for (const t of tasks) {
    const w = weatherByRegion[t.region];
    const cells = [t.title, t.region, t.kind, t.owner, weatherText(w), judge(t.kind, w).text];
    lines.push('| ' + cells.map(mdCell).join(' | ') + ' |');
  }
  return lines.join('\n') + '\n';
}

function saveMarkdown() {
  const blob = new Blob([buildMarkdown()], { type: 'text/markdown;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'wx-' + todayText() + '.md';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

// 03 단원 : 지역별 오늘 날씨 받기 (한 지역이 실패해도 나머지는 표시)
async function loadWeather() {
  const box = document.getElementById('weatherBox');
  const test = new URLSearchParams(location.search).get('test');
  box.textContent = '날씨 불러오는 중…';
  const regions = Object.keys(REGIONS);
  const results = await Promise.allSettled(regions.map(async (r) => {
    const res = await fetch(weatherUrl(r));
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const w = parseWeather(await res.json());
    if (!w) throw new Error('응답 형식 오류');
    return w;
  }));
  let okCount = 0;
  results.forEach((x, i) => {
    if (x.status === 'fulfilled') {
      weatherByRegion[regions[i]] = applyTest(x.value, test);
      okCount++;
    }
  });
  if (okCount === 0) {
    box.textContent = '날씨를 불러오지 못했습니다. 인터넷 연결을 확인하세요.';
  } else {
    box.textContent = '오늘 날씨 (Open-Meteo) : ' + okCount + '/' + regions.length + '개 지역'
      + (test === 'wind' ? ' · 시험 모드 : 풍속 12 m/s' : '');
  }
  renderTasks();
}

document.getElementById('taskForm').addEventListener('submit', addTask);
document.getElementById('saveMdBtn').addEventListener('click', saveMarkdown);
showToday();
loadTasks().then(renderTasks);
loadWeather();
