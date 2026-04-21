import numpy as np
import matplotlib.pyplot as plt
from scipy.optimize import curve_fit


plt.style.use('ggplot')

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
    'Hawaii': [1, 1, 1, 44, 45],
    'Illinois': [15, 17, 17, 89, 554],
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

# create the linspace for our plot so we can actually graph
proj_years = np.linspace(2021, 2030, 200)

# the overlapping years where we actually have data for both sets
overlap_years = np.array([2021, 2022, 2023])

#create the figure size
plt.figure(figsize=(12, 7))

for state in mw_data.keys():
    y_mw = np.array(mw_data[state])
    parameters_mw, _ = curve_fit(mw_exp_func, mw_years, y_mw)
    
    y_em = np.array(em_data[state])
    parameters_em, _ = curve_fit(emission_exp_func, em_years, y_em)
    
    # project the math onto each individual line, and then multiply them together to get a total emissions line
    mwh_proj = mw_exp_func(proj_years, *parameters_mw) * HOURS_PER_YEAR
    em_proj = emission_exp_func(proj_years, *parameters_em)
    total_emissions = mwh_proj * em_proj
    
    # plot our total emissions line thicker and dashed
    line = plt.plot(proj_years, total_emissions, linestyle='--', linewidth=2.5, alpha=0.7, label=f'{state} (Model)')[0]
    
    # calculate the multiplied data points for all 5 MW years (2021, 2022, 2023, 2024, 2030)
    # use real emission data for 2021-2023, and modeled emission data for 2024, 2030
    real_mwh = np.array(mw_data[state]) * HOURS_PER_YEAR
    
    # actual emissions data for 2021, 2022, 2023
    hybrid_em = np.zeros(5)
    hybrid_em[0:3] = em_data[state][3:6] 
    hybrid_em[3:5] = emission_exp_func(np.array([2024, 2030]), *parameters_em)
    
    multiplied_emissions = real_mwh * hybrid_em
    
    # plot multiplied points 
    plt.scatter(mw_years, multiplied_emissions, color=line.get_color(), s=90, zorder=5, label=f'{state} (Combined Data)')

# add the legend to the upper left
plt.legend(loc='upper right')

# fix plot titles and labels
plt.title('Data Center CO_2 Emissions Projections (2021 - 2030)', fontsize=16, pad=15)
plt.xlabel('Year', fontsize=12, fontweight='bold')
plt.ylabel('Total Emissions (lbs of CO_2)', fontsize=12, fontweight='bold')

plt.yscale('log')
plt.tight_layout()
plt.show()
