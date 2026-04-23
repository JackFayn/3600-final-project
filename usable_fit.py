import numpy as np
from scipy.optimize import curve_fit

HOURS_PER_YEAR = 8760

# exp function since we start from 2021
def mw_exp_func(x, a, b):
    return a * np.exp(b * (x - 2021))

# exp functino since we start from 2018
def emission_exp_func(x, a, b):
    return a * np.exp(b * (x - 2018))

# data set 1 in MW capacity
mw_years = np.array([2021, 2022, 2023, 2024, 2030])
mw_data = {
    'Hawaii': [1, 1, 1, 8, 9],
    'Illinois': [793, 985, 1069, 1602, 3327],
    'Maine': [0, 3, 3, 3, 9], 
    'Minnesota': [59, 59, 69, 106, 600],
    'Virginia': [2701, 3194, 4694, 6367, 22323]
}

# data set 2 for emissions
em_years = np.array([2018, 2019, 2020, 2021, 2022, 2023])
em_data = {
    'Minnesota': [995.409, 874.768, 765.049, 825.973, 768.241, 747.545],
    'Hawaii':    [1513.32, 1550.54, 1515.22, 1490.97, 1453.18, 1385.13],
    'Maine':     [257.747, 205.232, 219.397, 301.041, 336.612, 311.824],
    'Virginia':  [739.345, 633.189, 642.487, 599.211, 587.449, 536.851],
    'Illinois':  [812.873, 720.994, 553.201, 653.049, 588.411, 471.705]
}

state = input("Enter a state: ").strip().title()
year = float(input("Enter a projection year: "))

parameters_mw, _ = curve_fit(mw_exp_func, mw_years, np.array(mw_data[state]))
parameters_em, _ = curve_fit(emission_exp_func, em_years, np.array(em_data[state]))

mwh_proj = mw_exp_func(year, *parameters_mw) * HOURS_PER_YEAR
em_proj = emission_exp_func(year, *parameters_em)
total_emissions = mwh_proj * em_proj

print(f"Total projected CO2 emissions for data centers in {state} in {int(year)}: {total_emissions:,.2f} lbs")
