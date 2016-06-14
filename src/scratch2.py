
from pollster import Pollster


import argparse

def get_args():

    parser = argparse.ArgumentParser()

    parser.add_argument(
        '--topic',
        default     = 'obama-job-approval',
        dest        = 'topic'
    )

    return parser.parse_args()



def get_poll_score(poll):

    print poll.questions

    return 0



def main():

    args = get_args()

    pollster = Pollster()
    chart = pollster.charts(topic=args.topic)

    state = chart[0]
    poll = state.polls()[0]
    score = get_poll_score(poll)

    ## need TODO

    # 1) the score of each poll

    # 2) the number of likely voters polled




main()




