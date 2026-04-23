from flask import Flask, render_template, request, jsonify
import numpy as np
from scipy.optimize import curve_fit

app = Flask(__name__)

HOURS_PER_YEAR = 8760


def mw_exp_func(x, a, b):
    return a * np.exp(b * (x - 2021))


def emission_exp_func(x, a, b):
    return a * np.exp(b * (x - 2018))


MW_YEARS = np.array([2021, 2022, 2023, 2024, 2030])
MW_DATA = {
    'Hawaii':    [1, 1, 1, 44, 45],
    'Illinois':  [15, 17, 17, 89, 554],
    'Maine':     [0, 3, 3, 3, 9],
    'Minnesota': [59, 59, 69, 106, 600],
    'Virginia':  [2701, 3194, 4694, 6367, 22323],
}

EM_YEARS = np.array([2018, 2019, 2020, 2021, 2022, 2023])
EM_DATA = {
    'Minnesota': [995.409, 874.768, 765.049, 825.973, 768.241, 747.545],
    'Hawaii':    [1513.32, 1550.54, 1515.22, 1490.97, 1453.18, 1385.13],
    'Maine':     [257.747, 205.232, 219.397, 301.041, 336.612, 311.824],
    'Virginia':  [739.345, 633.189, 642.487, 599.211, 587.449, 536.851],
    'Illinois':  [812.873, 720.994, 553.201, 653.049, 588.411, 471.705],
}

STATES = sorted(MW_DATA.keys())

_FIT_CACHE: dict[str, tuple[np.ndarray, np.ndarray]] = {}


def fit_state(state: str) -> tuple[np.ndarray, np.ndarray]:
    if state not in _FIT_CACHE:
        mw_params, _ = curve_fit(mw_exp_func, MW_YEARS, np.array(MW_DATA[state]))
        em_params, _ = curve_fit(
            emission_exp_func, EM_YEARS, np.array(EM_DATA[state]), p0=(EM_DATA[state][0], -0.1)
        )
        _FIT_CACHE[state] = (mw_params, em_params)
    return _FIT_CACHE[state]


def total_emissions(state: str, year: float) -> dict:
    mw_params, em_params = fit_state(state)
    mw_capacity = float(mw_exp_func(year, *mw_params))
    em_rate = float(emission_exp_func(year, *em_params))
    mwh = mw_capacity * HOURS_PER_YEAR
    total = mwh * em_rate
    return {
        'state': state,
        'year': year,
        'mw_capacity': mw_capacity,
        'mwh_per_year': mwh,
        'emission_rate_lb_per_mwh': em_rate,
        'total_lbs_co2': total,
    }


@app.route('/')
def index():
    return render_template('index.html', states=STATES)


@app.route('/api/states')
def api_states():
    return jsonify(STATES)


@app.route('/api/project')
def api_project():
    state = request.args.get('state', '').strip().title()
    if state not in MW_DATA:
        return jsonify({'error': f'Unknown state: {state}. Available: {STATES}'}), 400
    try:
        year = float(request.args.get('year', ''))
    except ValueError:
        return jsonify({'error': 'Invalid year'}), 400
    return jsonify(total_emissions(state, year))


@app.route('/api/series')
def api_series():
    year_min = float(request.args.get('start', 2021))
    year_max = float(request.args.get('end', 2030))
    points = int(request.args.get('points', 120))
    proj_years = np.linspace(year_min, year_max, points)

    out = {'years': proj_years.tolist(), 'states': {}}
    for state in STATES:
        mw_params, em_params = fit_state(state)
        mw_curve = mw_exp_func(proj_years, *mw_params)
        em_curve = emission_exp_func(proj_years, *em_params)
        total_curve = mw_curve * HOURS_PER_YEAR * em_curve

        real_mwh = np.array(MW_DATA[state]) * HOURS_PER_YEAR
        hybrid_em = np.zeros(5)
        hybrid_em[0:3] = EM_DATA[state][3:6]
        hybrid_em[3:5] = emission_exp_func(np.array([2024, 2030]), *em_params)
        combined_points = (real_mwh * hybrid_em).tolist()

        out['states'][state] = {
            'mw_curve': mw_curve.tolist(),
            'em_curve': em_curve.tolist(),
            'total_curve': total_curve.tolist(),
            'mw_years': MW_YEARS.tolist(),
            'mw_data': MW_DATA[state],
            'em_years': EM_YEARS.tolist(),
            'em_data': EM_DATA[state],
            'combined_points': combined_points,
            'fit': {
                'mw': mw_params.tolist(),
                'em': em_params.tolist(),
            },
        }
    return jsonify(out)


if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5001, debug=True)
