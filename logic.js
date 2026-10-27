// logic.js – 판단 규칙만 (화면을 다루는 코드 금지)

// 교육용 가상 기준 (실제 작업 중지 · 행사 취소 기준은 각 기관 규정을 따름)
const RULES = { wind: 10, rain: 60, heat: 33 };

// 일정 구분과 날씨로 판단 (w가 없으면 '날씨 확인 전')
function judge(kind, w) {
  if (!w) return { level: 'none', text: '날씨 확인 전' };
  if (kind === '실내') return { level: 'ok', text: '영향 없음' };
  if (kind === '고소' && w.windMax >= RULES.wind) return { level: 'stop', text: '중지 검토 (강풍)' };
  if (w.tempMax >= RULES.heat) return { level: 'warn', text: '폭염 휴식' };
  if (w.rainProb >= RULES.rain) return { level: 'warn', text: '우천 주의' };
  return { level: 'ok', text: '진행' };
}

// 지역별 대략 좌표 (공개 지도 기준)
const REGIONS = {
  세종: { lat: 36.48, lon: 127.29 },
  대전: { lat: 36.35, lon: 127.38 },
  태안: { lat: 36.75, lon: 126.30 },
  보령: { lat: 36.33, lon: 126.61 },
};

// Open-Meteo 오늘 날씨 주소 (키 없음)
function weatherUrl(region) {
  const p = REGIONS[region];
  return 'https://api.open-meteo.com/v1/forecast'
    + '?latitude=' + p.lat + '&longitude=' + p.lon
    + '&daily=temperature_2m_max,wind_speed_10m_max,precipitation_probability_max'
    + '&wind_speed_unit=ms&timezone=Asia%2FSeoul&forecast_days=1';
}

// 응답 → { tempMax, windMax, rainProb } (값이 없으면 null)
function parseWeather(json) {
  const d = json && json.daily;
  if (!d) return null;
  const w = {
    tempMax: d.temperature_2m_max && d.temperature_2m_max[0],
    windMax: d.wind_speed_10m_max && d.wind_speed_10m_max[0],
    rainProb: d.precipitation_probability_max && d.precipitation_probability_max[0],
  };
  if (typeof w.tempMax !== 'number' || typeof w.windMax !== 'number') return null;
  if (typeof w.rainProb !== 'number') w.rainProb = 0;
  return w;
}

// 규칙 시험용 : test가 'wind'이면 풍속을 12로 바꾼 사본
function applyTest(w, test) {
  if (!w || test !== 'wind') return w;
  return Object.assign({}, w, { windMax: 12 });
}

if (typeof module !== 'undefined') module.exports = { RULES, REGIONS, judge, weatherUrl, parseWeather, applyTest };
