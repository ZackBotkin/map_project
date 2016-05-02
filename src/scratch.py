
import csv
import numpy as py
import pandas as pd

def get_weighted_data(filename):

    data = pd.read_csv(filename, sep='\t')
    data = data.sort_values(by= 'Simple Average Error')

    buckets = {}
    bucket_count = 0
    range_index = 0
    range_count = 0
    ranges = [
        {"value" :50,"weight" : 0.35},
        {"value" :50,"weight" : 0.25},
        {"value" :50,"weight" : 0.20},
        {"value" :50,"weight" : 0.10},
        {"value" :50,"weight" : 0.075},
        {"value" :87,"weight" : 0.025},
    ]

    poll_data = {}

    for entry in data.values:
        if range_count == ranges[range_index]['value']:
            range_count = 0        ## reset counters
            range_index += 1
            bucket_count += 1

        poll_data[entry[1]] = {
            "poll_weight" : ranges[range_index]["weight"] / ranges[range_index]["value"],
            "bucket_number" : bucket_count + 1
        }

        range_count += 1

    return poll_data


