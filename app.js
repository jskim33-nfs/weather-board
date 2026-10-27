// app.js – 화면 동작 (목록 그리기, 일정 추가)

// 04 단원 : 일정 목록은 data/tasks.json 에서 읽음 (가상 데이터)
let baseTasks = [];
let tasks = [];
let weatherByRegion = {};   // 03 단원에서 지역별 날씨를 넣음

// JSON 일정을 먼저 읽음 (더블클릭으로 열면 브라우저가 막음)
async function loadBaseTasks() {
  try {
    const res = await fetch('data/tasks.json');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    baseTasks = await res.json();
  } catch (err) {
    baseTasks = [];
    document.getElementById('msgBox').textContent =
      '일정 파일(data/tasks.json)을 읽지 못했습니다. 배포 주소로 열어 주세요.';
  }
}

// JSON 일정 뒤에 화면에서 추가한 일정(브라우저 저장)을 붙임
function loadTasks() {
  const saved = JSON.parse(localStorage.getItem('wx_added') || '[]');
  tasks = baseTasks.concat(saved);
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

function addTask(e) {
  e.preventDefault();
  const t = {
    title: document.getElementById('titleInput').value.trim(),
    region: document.getElementById('regionInput').value,
    kind: document.getElementById('kindInput').value,
    owner: document.getElementById('ownerInput').value.trim(),
  };
  if (!t.title || !t.owner) return;
  const saved = JSON.parse(localStorage.getItem('wx_added') || '[]');
  saved.push(t);
  localStorage.setItem('wx_added', JSON.stringify(saved));
  e.target.reset();
  loadTasks();
  renderTasks();
}

// 오늘 날짜 (현지 시간 기준 YYYY-MM-DD)
function showToday() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  document.getElementById('todayDate').textContent =
    d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
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
showToday();
loadBaseTasks().then(() => {
  loadTasks();
  renderTasks();
});
loadWeather();
