import numpy as np
import matplotlib.pyplot as plt
from scipy.optimize import curve_fit

def exp_func(x, a, b):
    # Shifting the start year to 2018 to keep the math stable
    return a * np.exp(b * (x - 2018))

years = np.array([2018, 2019, 2020, 2021, 2022, 2023])
years_smooth = np.linspace(2018, 2023, 100)

states_data = {
    'Minnesota': [995.409, 874.768, 765.049, 825.973, 768.241, 747.545],
    'Hawaii':    [1513.32, 1550.54, 1515.22, 1490.97, 1453.18, 1385.13],
    'Maine':     [257.747, 205.232, 219.397, 301.041, 336.612, 311.824],
    'Virginia':  [739.345, 633.189, 642.487, 599.211, 587.449, 536.851],
    'Illinois':  [812.873, 720.994, 553.201, 653.049, 588.411, 471.705]
}

for state, y_data in states_data.items():
    y = np.array(y_data)
    
    # Notice we removed the +1 on y[0], since these numbers are all > 0 
    # Also we use -0.1 as the guess for b since many decrease
    parameters, _ = curve_fit(exp_func, years, y)
    
    line = plt.plot(years, y, 'o', label=state)[0]
    plt.plot(years_smooth, exp_func(years_smooth, *parameters), '--', color=line.get_color())

plt.legend()
plt.title('Exponential Fits (2018 - 2023)')
plt.show()
