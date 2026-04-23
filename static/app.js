const GT_NAVY = '#153759';
const STATE_COLORS = {
  Hawaii:    '#153759',
  Illinois:  '#A08540',
  Maine:     '#4A463D',
  Minnesota: '#6E5A27',
  Virginia:  '#8C2527',
};

const SERIF_BODY = '"Source Serif 4", "Source Serif Pro", Georgia, serif';
const SERIF_DISPLAY = '"Fraunces", "Didot", Georgia, serif';

const PLOTLY_LAYOUT = {
  paper_bgcolor: 'rgba(0,0,0,0)',
  plot_bgcolor: 'rgba(0,0,0,0)',
  font: { color: '#14120B', family: SERIF_BODY, size: 13 },
  margin: { t: 14, r: 28, b: 58, l: 78 },
  legend: {
    orientation: 'h',
    y: -0.22,
    x: 0,
    xanchor: 'left',
    font: { family: SERIF_DISPLAY, size: 11, color: '#3A352A' },
    itemsizing: 'constant',
    bgcolor: 'rgba(0,0,0,0)',
  },
  xaxis: {
    gridcolor: '#E2D9BA',
    gridwidth: 0.6,
    zeroline: false,
    linecolor: '#14120B',
    linewidth: 1,
    tickcolor: '#14120B',
    ticklen: 6,
    tickfont: { family: SERIF_BODY, size: 12, color: '#3A352A' },
    fixedrange: true,
    automargin: true,
  },
  yaxis: {
    gridcolor: '#E2D9BA',
    gridwidth: 0.6,
    zeroline: false,
    linecolor: '#14120B',
    linewidth: 1,
    tickcolor: '#14120B',
    ticklen: 6,
    tickfont: { family: SERIF_BODY, size: 12, color: '#3A352A' },
    fixedrange: true,
    automargin: true,
  },
  dragmode: false,
};

const PLOTLY_CONFIG = { displayModeBar: false, responsive: true, scrollZoom: false, doubleClick: false };

const AXIS_TITLE_FONT = { family: SERIF_DISPLAY, size: 11.5, color: '#716A58' };

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

// Short-form for the stat headline, e.g. 6.81B, 124M, 81.1K
const fmtHeadline = n => {
  if (!isFinite(n)) return { num: String(n), unit: '' };
  const abs = Math.abs(n);
  if (abs >= 1e12) return { num: (n / 1e12).toFixed(2), unit: 'trillion lbs / year' };
  if (abs >= 1e9)  return { num: (n / 1e9).toFixed(2),  unit: 'billion lbs / year' };
  if (abs >= 1e6)  return { num: (n / 1e6).toFixed(2),  unit: 'million lbs / year' };
  if (abs >= 1e3)  return { num: (n / 1e3).toFixed(1),  unit: 'thousand lbs / year' };
  return { num: n.toFixed(0), unit: 'lbs / year' };
};

async function loadData() {
  const resp = await fetch('static/data.json');
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
  // Default to Virginia so the interactive projection shows its headline
  // number on first load, not an empty-state hint.
  if (DATA.states['Virginia']) select.value = 'Virginia';
}

function statesToRender(selected) {
  if (!DATA) return [];
  if (selected === '__all__' || !DATA.states[selected]) return Object.keys(DATA.states).sort();
  return [selected];
}

function colorFor(state) {
  return STATE_COLORS[state] || GT_NAVY;
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

function axisTitle(text) {
  return { text, font: AXIS_TITLE_FONT, standoff: 12 };
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
      hovertemplate: `<b>${state}</b><br>%{x:.0f}<br>%{y:.2e} lb CO₂/yr<extra></extra>`,
    });
    traces.push({
      x: DATA.mw_years,
      y: d.combined_points,
      mode: 'markers',
      name: `${state} (observed)`,
      marker: { size: 8, color, line: { color: '#F5EFDF', width: 1.5 } },
      showlegend: false,
      hovertemplate: `<b>${state}</b> · observed<br>%{x:.0f}<br>%{y:.2e} lb CO₂/yr<extra></extra>`,
    });
  }
  const layout = {
    ...PLOTLY_LAYOUT,
    yaxis: { ...PLOTLY_LAYOUT.yaxis, type: 'log', title: axisTitle('Total CO₂  (lbs / year)') },
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
    traces.push({
      x: xs, y: mwCurve(d, xs), mode: 'lines', name: state,
      line: { width: 1.75, color },
      hovertemplate: `<b>${state}</b><br>%{x:.0f}<br>%{y:.0f} MW<extra></extra>`,
    });
    traces.push({
      x: DATA.mw_years, y: d.mw_data, mode: 'markers',
      marker: { size: 7, color, line: { color: '#F5EFDF', width: 1.2 } },
      showlegend: false, name: state,
      hovertemplate: `<b>${state}</b><br>%{x:.0f}<br>%{y:.0f} MW<extra></extra>`,
    });
  }
  const layout = {
    ...PLOTLY_LAYOUT,
    yaxis: { ...PLOTLY_LAYOUT.yaxis, title: axisTitle('MW capacity') },
    xaxis: { ...PLOTLY_LAYOUT.xaxis, title: axisTitle('Year') },
    showlegend: false,
  };
  Plotly.react('mw-chart', traces, layout, PLOTLY_CONFIG);
}

function renderEmChart(selected) {
  const traces = [];
  const xs = curveYears(DATA.em_years[0], DATA.years[DATA.years.length - 1]);
  for (const state of statesToRender(selected)) {
    const d = DATA.states[state];
    const color = colorFor(state);
    traces.push({
      x: xs, y: emCurve(d, xs), mode: 'lines', name: state,
      line: { width: 1.75, color },
      hovertemplate: `<b>${state}</b><br>%{x:.0f}<br>%{y:.0f} lb/MWh<extra></extra>`,
    });
    traces.push({
      x: DATA.em_years, y: d.em_data, mode: 'markers',
      marker: { size: 7, color, line: { color: '#F5EFDF', width: 1.2 } },
      showlegend: false, name: state,
      hovertemplate: `<b>${state}</b><br>%{x:.0f}<br>%{y:.0f} lb/MWh<extra></extra>`,
    });
  }
  const layout = {
    ...PLOTLY_LAYOUT,
    yaxis: { ...PLOTLY_LAYOUT.yaxis, title: axisTitle('lb CO₂ / MWh') },
    xaxis: { ...PLOTLY_LAYOUT.xaxis, title: axisTitle('Year') },
    showlegend: false,
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

function renderEmptyResult(msg) {
  const el = document.getElementById('result');
  el.innerHTML = `<div class="res-empty">${msg}</div>`;
}

function renderResult(j) {
  const el = document.getElementById('result');
  const head = fmtHeadline(j.total_lbs_co2);
  el.innerHTML = `
    <div class="res-headline-label">Projected emissions · ${j.state} · ${j.year}</div>
    <div class="res-headline">${head.num}<span class="res-unit">${head.unit}</span></div>
    <div class="res-deck">Total annual CO<sub>2</sub> from data-center load under the fitted model.</div>
    <div class="res-grid">
      <div class="res-label">Projected MW</div>
      <div class="res-value">${fmt(j.mw_capacity)} MW</div>
      <div class="res-label">Projected MWh / yr</div>
      <div class="res-value">${fmt(j.mwh_per_year)} MWh</div>
      <div class="res-label">Emission rate</div>
      <div class="res-value">${fmt(j.emission_rate_lb_per_mwh)} lb / MWh</div>
      <div class="res-label">Total CO<sub>2</sub> (lbs)</div>
      <div class="res-value">${fmt(j.total_lbs_co2)}</div>
    </div>
  `;
}

function runProjection() {
  const state = document.getElementById('state').value;
  const year = Number(document.getElementById('year').value);

  if (state === '__all__') {
    renderEmptyResult('Pick a specific state above to see a point projection.');
    return;
  }
  if (!Number.isFinite(year)) {
    renderEmptyResult('Enter a valid year.');
    return;
  }
  renderResult(projectState(state, year));
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
    renderEmptyResult(`Failed to load data.json: ${err.message}`);
  }
})();
