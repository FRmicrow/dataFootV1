import math
import logging
import numpy as np

# Configure logging for the ML service
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

def get_logger(name):
    return logging.getLogger(name)

def get_valid_cat_features(columns, cat_features=None):
    available = set(columns)
    return [feature for feature in (cat_features or []) if feature in available]


def poisson_prob(mu, k):
    if mu <= 0:
        return 1.0 if k == 0 else 0.0
    return (np.exp(-mu) * (mu ** k)) / math.factorial(k)
