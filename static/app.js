// Georgia Tech palette + a few complements so five states are distinguishable.
const GT_NAVY = '#003057';
const GT_GOLD = '#B3A369';
const STATE_COLORS = {
  Hawaii:    '#003057', // navy
  Illinois:  '#B3A369', // tech gold
  Maine:     '#54585A', // GT gray
  Minnesota: '#857437', // deep gold
  Virginia:  '#9E2A2B', // buzz red accent
};

const PLOTLY_LAYOUT = {
  paper_bgcolor: '#FFFFFF',
  plot_bgcolor: '#FAF7EF',
  font: { color: '#1A1A1A', family: '"Source Serif 4", Georgia, serif', size: 13 },
  margin: { t: 16, r: 20, b: 54, l: 72 },
  legend: { orientation: 'h', y: -0.22, font: { family: 'Oswald, sans-serif', size: 12 } },
  xaxis: { gridcolor: '#E5DFC9', zerolinecolor: '#D9D1B7', linecolor: '#D9D1B7', tickfont: { family: 'Oswald, sans-serif' } },
  yaxis: { gridcolor: '#E5DFC9', zerolinecolor: '#D9D1B7', linecolor: '#D9D1B7', tickfont: { family: 'Oswald, sans-serif' } },
};

const PLOTLY_CONFIG = { displayModeBar: false, responsive: true };

let SERIES = null;

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

async function loadSeries() {
  const resp = await fetch('/api/series?start=2021&end=2030&points=180');
  if (!resp.ok) throw new Error('series fetch failed');
  return resp.json();
}

function statesToRender(selected) {
  if (!SERIES) return [];
  if (selected === '__all__' || !SERIES.states[selected]) return Object.keys(SERIES.states);
  return [selected];
}

function colorFor(state) {
  return STATE_COLORS[state] || GT_NAVY;
}

function renderTotalChart(selected) {
  const traces = [];
  for (const state of statesToRender(selected)) {
    const d = SERIES.states[state];
    const color = colorFor(state);
    traces.push({
      x: SERIES.years,
      y: d.total_curve,
      mode: 'lines',
      name: `${state} (model)`,
      line: { width: 2.5, dash: 'dash', color },
    });
    traces.push({
      x: d.mw_years,
      y: d.combined_points,
      mode: 'markers',
      name: `${state} (observed)`,
      marker: { size: 9, color, line: { color: '#FFFFFF', width: 1 } },
      showlegend: false,
    });
  }
  const layout = {
    ...PLOTLY_LAYOUT,
    yaxis: { ...PLOTLY_LAYOUT.yaxis, type: 'log', title: { text: 'Total CO₂ (lbs / year)', font: { family: 'Oswald, sans-serif' } } },
    xaxis: { ...PLOTLY_LAYOUT.xaxis, title: { text: 'Year', font: { family: 'Oswald, sans-serif' } } },
  };
  Plotly.react('total-chart', traces, layout, PLOTLY_CONFIG);
}

function renderMwChart(selected) {
  const traces = [];
  for (const state of statesToRender(selected)) {
    const d = SERIES.states[state];
    const color = colorFor(state);
    traces.push({ x: SERIES.years, y: d.mw_curve, mode: 'lines', name: state, line: { width: 2, color } });
    traces.push({ x: d.mw_years, y: d.mw_data, mode: 'markers', marker: { size: 8, color, line: { color: '#FFFFFF', width: 1 } }, showlegend: false, name: state });
  }
  const layout = {
    ...PLOTLY_LAYOUT,
    yaxis: { ...PLOTLY_LAYOUT.yaxis, title: { text: 'MW capacity', font: { family: 'Oswald, sans-serif' } } },
    xaxis: { ...PLOTLY_LAYOUT.xaxis, title: { text: 'Year', font: { family: 'Oswald, sans-serif' } } },
  };
  Plotly.react('mw-chart', traces, layout, PLOTLY_CONFIG);
}

function renderEmChart(selected) {
  const traces = [];
  for (const state of statesToRender(selected)) {
    const d = SERIES.states[state];
    const color = colorFor(state);
    traces.push({ x: SERIES.years, y: d.em_curve, mode: 'lines', name: state, line: { width: 2, color } });
    traces.push({ x: d.em_years, y: d.em_data, mode: 'markers', marker: { size: 8, color, line: { color: '#FFFFFF', width: 1 } }, showlegend: false, name: state });
  }
  const layout = {
    ...PLOTLY_LAYOUT,
    yaxis: { ...PLOTLY_LAYOUT.yaxis, title: { text: 'lb CO₂ / MWh', font: { family: 'Oswald, sans-serif' } } },
    xaxis: { ...PLOTLY_LAYOUT.xaxis, title: { text: 'Year', font: { family: 'Oswald, sans-serif' } } },
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
  if (!tbody || !SERIES) return;
  tbody.innerHTML = '';
  for (const state of Object.keys(SERIES.states).sort()) {
    const fit = SERIES.states[state].fit;
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

async function runProjection() {
  const state = document.getElementById('state').value;
  const year = document.getElementById('year').value;
  const el = document.getElementById('result');
  const btn = document.querySelector('#project-form button');

  if (state === '__all__') {
    el.textContent = 'Pick a specific state above to see a point projection.';
    btn.disabled = true;
    return;
  }
  btn.disabled = false;
  el.textContent = 'calculating…';
  try {
    const resp = await fetch(`/api/project?state=${encodeURIComponent(state)}&year=${encodeURIComponent(year)}`);
    const j = await resp.json();
    if (!resp.ok) { el.textContent = j.error || 'error'; return; }
    el.textContent =
      `State              ${j.state}\n` +
      `Year               ${j.year}\n` +
      `Projected MW       ${fmt(j.mw_capacity)} MW\n` +
      `Projected MWh/yr   ${fmt(j.mwh_per_year)} MWh\n` +
      `Emission rate      ${fmt(j.emission_rate_lb_per_mwh)} lb / MWh\n` +
      `Total CO₂          ${fmt(j.total_lbs_co2)} lbs`;
  } catch (err) {
    el.textContent = `error: ${err.message}`;
  }
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
    SERIES = await loadSeries();
    renderAllCharts(document.getElementById('state').value);
    renderFitsTable();
    runProjection();
  } catch (err) {
    console.error(err);
  }
})();
