import numpy as np
import matplotlib.pyplot as plt
from scipy.optimize import curve_fit

# Apply a professional built-in formatting style to make it look better automatically
plt.style.use('ggplot')

HOURS_PER_YEAR = 8760

def mw_exp_func(x, a, b):
    return a * np.exp(b * (x - 2021))

def emission_exp_func(x, a, b):
    return a * np.exp(b * (x - 2018))

# Data set 1: MW Capacity (2021, 2022, 2023, 2024, 2030)
mw_years = np.array([2021, 2022, 2023, 2024, 2030])
mw_data = {
    'Hawaii': [1, 1, 1, 44, 45],
    'Illinois': [15, 17, 17, 89, 554],
    'Maine': [0, 3, 3, 3, 9], 
    'Minnesota': [59, 59, 69, 106, 600],
    'Virginia': [2701, 3194, 4694, 6367, 22323]
}

# Data set 2: Emissions per MWh (2018, 2019, 2020, 2021, 2022, 2023)
em_years = np.array([2018, 2019, 2020, 2021, 2022, 2023])
em_data = {
    'Minnesota': [995.409, 874.768, 765.049, 825.973, 768.241, 747.545],
    'Hawaii':    [1513.32, 1550.54, 1515.22, 1490.97, 1453.18, 1385.13],
    'Maine':     [257.747, 205.232, 219.397, 301.041, 336.612, 311.824],
    'Virginia':  [739.345, 633.189, 642.487, 599.211, 587.449, 536.851],
    'Illinois':  [812.873, 720.994, 553.201, 653.049, 588.411, 471.705]
}

proj_years = np.linspace(2021, 2030, 200)

# The overlapping years where we actually have dual historical data
overlap_years = np.array([2021, 2022, 2023])

plt.figure(figsize=(12, 7))

for state in mw_data.keys():
    y_mw = np.array(mw_data[state])
    popt_mw, _ = curve_fit(mw_exp_func, mw_years, y_mw, p0=(y_mw[0]+1, 0.2))
    
    y_em = np.array(em_data[state])
    popt_em, _ = curve_fit(emission_exp_func, em_years, y_em, p0=(y_em[0], -0.1))
    
    # 1. Project the Math
    mwh_proj = mw_exp_func(proj_years, *popt_mw) * HOURS_PER_YEAR
    em_proj = emission_exp_func(proj_years, *popt_em)
    total_emissions = mwh_proj * em_proj
    
    # Plot mathematical line thicker and dashed
    line = plt.plot(proj_years, total_emissions, linestyle='--', linewidth=2.5, alpha=0.7, label=f'{state} (Model)')[0]
    
    # 2. Calculate the multiplied data points for all 5 MW years (2021, 2022, 2023, 2024, 2030)
    # Use real emission data for 2021-2023, and modeled emission data for 2024, 2030
    real_mwh = np.array(mw_data[state]) * HOURS_PER_YEAR
    
    # Actual em data for 2021, 2022, 2023
    hybrid_em = np.zeros(5)
    hybrid_em[0:3] = em_data[state][3:6] 
    hybrid_em[3:5] = emission_exp_func(np.array([2024, 2030]), *popt_em)
    
    multiplied_emissions = real_mwh * hybrid_em
    
    # Plot multiplied points dynamically
    plt.scatter(mw_years, multiplied_emissions, color=line.get_color(), s=90, zorder=5, label=f'{state} (Combined Data)')

# Formatting Magic
plt.legend(bbox_to_anchor=(1.05, 1), loc='upper left')

# Using LaTeX style bolding to make titles pop
plt.title(r'Data Center $\mathbf{CO_2}$ Emissions Projections (2021 - 2030)', fontsize=16, pad=15)
plt.xlabel('Year', fontsize=12, fontweight='bold')
plt.ylabel(r'Total Emissions (lbs of $\mathbf{CO_2}$)', fontsize=12, fontweight='bold')

plt.yscale('log')
plt.tight_layout()
plt.show()
