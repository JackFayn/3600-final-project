"""Precompute exponential fits and serialize to static/data.json.

Run once (and re-run whenever the raw data arrays below change):
    python build_data.py

The browser reads static/data.json and does the rest — no Python runtime needed on Vercel.
"""

import json
import numpy as np
from scipy.optimize import curve_fit

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


def main():
    states = sorted(MW_DATA.keys())
    proj_years = np.linspace(2021, 2030, 180)

    out = {
        'years': proj_years.tolist(),
        'mw_years': MW_YEARS.tolist(),
        'em_years': EM_YEARS.tolist(),
        'hours_per_year': HOURS_PER_YEAR,
        'mw_anchor': 2021,
        'em_anchor': 2018,
        'states': {},
    }

    for state in states:
        mw_params, _ = curve_fit(mw_exp_func, MW_YEARS, np.array(MW_DATA[state]))
        em_params, _ = curve_fit(
            emission_exp_func, EM_YEARS, np.array(EM_DATA[state]),
            p0=(EM_DATA[state][0], -0.1),
        )

        mw_curve = mw_exp_func(proj_years, *mw_params)
        em_curve = emission_exp_func(proj_years, *em_params)
        total_curve = mw_curve * HOURS_PER_YEAR * em_curve

        real_mwh = np.array(MW_DATA[state]) * HOURS_PER_YEAR
        hybrid_em = np.zeros(5)
        hybrid_em[0:3] = EM_DATA[state][3:6]
        hybrid_em[3:5] = emission_exp_func(np.array([2024, 2030]), *em_params)
        combined_points = (real_mwh * hybrid_em).tolist()

        out['states'][state] = {
            'mw_data': MW_DATA[state],
            'em_data': EM_DATA[state],
            'mw_curve': mw_curve.tolist(),
            'em_curve': em_curve.tolist(),
            'total_curve': total_curve.tolist(),
            'combined_points': combined_points,
            'fit': {
                'mw': mw_params.tolist(),
                'em': em_params.tolist(),
            },
        }

    with open('static/data.json', 'w') as f:
        json.dump(out, f)

    print(f'wrote static/data.json with {len(states)} states')


if __name__ == '__main__':
    main()
