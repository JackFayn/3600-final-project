import numpy as np
import matplotlib.pyplot as plt
from scipy.optimize import curve_fit

def exp_func(x, a, b):
    return a * np.exp(b * (x - 2021))

years = np.array([2021, 2022, 2023, 2024, 2030])
years_smooth = np.linspace(2021, 2030, 100)

states_data = {
   'Hawaii (HI)': [1, 1, 1, 8, 9],
   'Illinois (IL)': [793, 985, 1069, 1602, 3327],
   'Maine (ME)': [0, 3, 3, 3, 9],
   'Minnesota (MN)': [59, 59, 69, 106, 600],
   'Virginia (VA)': [2701, 3194, 4694, 6367, 22323]
}


for state, y_data in states_data.items():
    y = np.array(y_data)
    popt, _ = curve_fit(exp_func, years, y, p0=(y[0]+1, 0.2))
    
    line = plt.plot(years, y, 'o', label=state)[0]
    plt.plot(years_smooth, exp_func(years_smooth, *popt), '--', color=line.get_color())

plt.legend()
plt.yscale('log')
plt.title('Exponential Projections')
plt.show()