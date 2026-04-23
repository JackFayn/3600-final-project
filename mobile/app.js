const GT_NAVY = '#003057';
const STATE_COLORS = {
  Hawaii:    '#003057',
  Illinois:  '#B3A369',
  Maine:     '#54585A',
  Minnesota: '#857437',
  Virginia:  '#9E2A2B',
};

const PLOTLY_LAYOUT = {
  paper_bgcolor: '#FFFFFF',
  plot_bgcolor: '#FAF7EF',
  font: { color: '#1A1A1A', family: '"Source Serif 4", Georgia, serif', size: 11 },
  margin: { t: 8, r: 12, b: 70, l: 54 },
  legend: { orientation: 'h', y: -0.3, x: 0, font: { family: 'Oswald, sans-serif', size: 10 } },
  xaxis: { gridcolor: '#E5DFC9', zerolinecolor: '#D9D1B7', linecolor: '#D9D1B7', tickfont: { family: 'Oswald, sans-serif', size: 10 } },
  yaxis: { gridcolor: '#E5DFC9', zerolinecolor: '#D9D1B7', linecolor: '#D9D1B7', tickfont: { family: 'Oswald, sans-serif', size: 10 } },
};

const PLOTLY_CONFIG = { displayModeBar: false, responsive: true };

let DATA = null;

const fmt = n => {
  if (!isFinite(n)) return String(n);
  if (Math.abs(n) >= 1_000_000) return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
  if (Math.abs(n) >= 1) return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return n.toExponential(3);
};

const fmtCoef = n => {
  if (!isFinite(n)) return String(n);
  if (Math.abs(n) >= 100) return n.toFixed(2);
  if (Math.abs(n) >= 1) return n.toFixed(3);
  return n.toFixed(4);
};

async function loadData() {
  const resp = await fetch('../static/data.json');
  if (!resp.ok) throw new Error(`data.json fetch failed: ${resp.status}`);
  return resp.json();
}

function populateStates() {
  const select = document.getElementById('state');
  for (const s of Object.keys(DATA.states).sort()) {
    const opt = document.createElement('option');
    opt.value = s;
    opt.textContent = s;
    select.appendChild(opt);
  }
}

function statesToRender(selected) {
  if (!DATA) return [];
  if (selected === '__all__' || !DATA.states[selected]) return Object.keys(DATA.states).sort();
  return [selected];
}

function colorFor(state) {
  return STATE_COLORS[state] || GT_NAVY;
}

function axisTitle(text) {
  return { text, font: { family: 'Oswald, sans-serif', size: 11 } };
}

function curveYears(startYear, endYear, steps = 200) {
  const xs = new Array(steps);
  const span = endYear - startYear;
  for (let i = 0; i < steps; i++) xs[i] = startYear + (span * i) / (steps - 1);
  return xs;
}

function mwCurve(d, years) {
  const [a, k] = d.fit.mw;
  return years.map(y => a * Math.exp(k * (y - DATA.mw_anchor)));
}

function emCurve(d, years) {
  const [a, k] = d.fit.em;
  return years.map(y => a * Math.exp(k * (y - DATA.em_anchor)));
}

function renderTotalChart(selected) {
  const traces = [];
  const startYear = Math.min(DATA.mw_years[0], DATA.em_years[0]);
  const endYear = DATA.years[DATA.years.length - 1];
  const xs = curveYears(startYear, endYear);
  for (const state of statesToRender(selected)) {
    const d = DATA.states[state];
    const color = colorFor(state);
    const mw = mwCurve(d, xs);
    const em = emCurve(d, xs);
    const total = mw.map((m, i) => m * DATA.hours_per_year * em[i]);
    traces.push({
      x: xs,
      y: total,
      mode: 'lines',
      name: state,
      line: { width: 2, dash: 'dash', color },
    });
    traces.push({
      x: DATA.mw_years,
      y: d.combined_points,
      mode: 'markers',
      name: state,
      marker: { size: 7, color, line: { color: '#FFFFFF', width: 1 } },
      showlegend: false,
    });
  }
  const layout = {
    ...PLOTLY_LAYOUT,
    yaxis: { ...PLOTLY_LAYOUT.yaxis, type: 'log', title: axisTitle('lbs CO₂ / yr') },
    xaxis: { ...PLOTLY_LAYOUT.xaxis, title: axisTitle('Year') },
  };
  Plotly.react('total-chart', traces, layout, PLOTLY_CONFIG);
}

function renderMwChart(selected) {
  const traces = [];
  const xs = curveYears(DATA.mw_years[0], DATA.years[DATA.years.length - 1]);
  for (const state of statesToRender(selected)) {
    const d = DATA.states[state];
    const color = colorFor(state);
    traces.push({ x: xs, y: mwCurve(d, xs), mode: 'lines', name: state, line: { width: 1.8, color } });
    traces.push({ x: DATA.mw_years, y: d.mw_data, mode: 'markers', marker: { size: 7, color, line: { color: '#FFFFFF', width: 1 } }, showlegend: false, name: state });
  }
  const layout = {
    ...PLOTLY_LAYOUT,
    yaxis: { ...PLOTLY_LAYOUT.yaxis, title: axisTitle('MW') },
    xaxis: { ...PLOTLY_LAYOUT.xaxis, title: axisTitle('Year') },
  };
  Plotly.react('mw-chart', traces, layout, PLOTLY_CONFIG);
}

function renderEmChart(selected) {
  const traces = [];
  const xs = curveYears(DATA.em_years[0], DATA.years[DATA.years.length - 1]);
  for (const state of statesToRender(selected)) {
    const d = DATA.states[state];
    const color = colorFor(state);
    traces.push({ x: xs, y: emCurve(d, xs), mode: 'lines', name: state, line: { width: 1.8, color } });
    traces.push({ x: DATA.em_years, y: d.em_data, mode: 'markers', marker: { size: 7, color, line: { color: '#FFFFFF', width: 1 } }, showlegend: false, name: state });
  }
  const layout = {
    ...PLOTLY_LAYOUT,
    yaxis: { ...PLOTLY_LAYOUT.yaxis, title: axisTitle('lb / MWh') },
    xaxis: { ...PLOTLY_LAYOUT.xaxis, title: axisTitle('Year') },
  };
  Plotly.react('em-chart', traces, layout, PLOTLY_CONFIG);
}

function renderAllCharts(selected) {
  renderTotalChart(selected);
  renderMwChart(selected);
  renderEmChart(selected);
}

function renderFitsTable() {
  const tbody = document.querySelector('#fits-table tbody');
  if (!tbody || !DATA) return;
  tbody.innerHTML = '';
  for (const state of Object.keys(DATA.states).sort()) {
    const fit = DATA.states[state].fit;
    const row = document.createElement('tr');
    row.innerHTML =
      `<td>${state}</td>` +
      `<td>${fmtCoef(fit.mw[0])}</td>` +
      `<td>${fmtCoef(fit.mw[1])}</td>` +
      `<td>${fmtCoef(fit.em[0])}</td>` +
      `<td>${fmtCoef(fit.em[1])}</td>`;
    tbody.appendChild(row);
  }
}

function projectState(state, year) {
  const d = DATA.states[state];
  const mw = d.fit.mw[0] * Math.exp(d.fit.mw[1] * (year - DATA.mw_anchor));
  const em = d.fit.em[0] * Math.exp(d.fit.em[1] * (year - DATA.em_anchor));
  const mwh = mw * DATA.hours_per_year;
  return {
    state,
    year,
    mw_capacity: mw,
    mwh_per_year: mwh,
    emission_rate_lb_per_mwh: em,
    total_lbs_co2: mwh * em,
  };
}

function runProjection() {
  const state = document.getElementById('state').value;
  const year = Number(document.getElementById('year').value);
  const el = document.getElementById('result');
  const btn = document.querySelector('#project-form button');

  if (state === '__all__') {
    el.textContent = 'Pick a specific state above for a point projection.';
    btn.disabled = true;
    return;
  }
  if (!Number.isFinite(year)) {
    el.textContent = 'Enter a valid year.';
    return;
  }
  btn.disabled = false;
  const j = projectState(state, year);
  el.textContent =
    `State    ${j.state}\n` +
    `Year     ${j.year}\n` +
    `MW       ${fmt(j.mw_capacity)}\n` +
    `MWh/yr   ${fmt(j.mwh_per_year)}\n` +
    `lb/MWh   ${fmt(j.emission_rate_lb_per_mwh)}\n` +
    `Total    ${fmt(j.total_lbs_co2)} lbs`;
}

function onStateChange() {
  const selected = document.getElementById('state').value;
  renderAllCharts(selected);
  runProjection();
}

function onFormSubmit(e) {
  e.preventDefault();
  runProjection();
}

(async function init() {
  document.getElementById('project-form').addEventListener('submit', onFormSubmit);
  document.getElementById('state').addEventListener('change', onStateChange);
  document.getElementById('year').addEventListener('change', runProjection);
  try {
    DATA = await loadData();
    populateStates();
    renderAllCharts('__all__');
    renderFitsTable();
    runProjection();
  } catch (err) {
    console.error(err);
    const el = document.getElementById('result');
    if (el) el.textContent = `failed to load data.json: ${err.message}`;
  }
})();
