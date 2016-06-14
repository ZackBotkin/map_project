
from pollster import Pollster


import argparse

def get_args():

    parser = argparse.ArgumentParser()

    parser.add_argument(
        '--topic',
        default     = 'obama-job-approval',
        dest        = 'topic'
    )

    parser.add_argument(
        '--index',
        dest    = 'index',
        default = 0
    )

    parser.add_argument(
        '--state',
        dest = 'state',
    )

    parser.add_argument(
        '--run-all',
        dest        = 'run_all',
        action      = 'store_true'
    )

    return parser.parse_args()



def get_state_from_chart(chart, title):

    titles = []

    for state in chart:
        if state.title == title:
            return state
        else:
            titles.append(state.title)

    raise Exception('Title not found! Acceptable titles are %s' % titles)


import pprint

def process_poll(poll):

    ## TODO : can uncomment the following 2 lines to debug poll object
    #import pdb
    #pdb.set_trace()

    pp = pprint.PrettyPrinter(depth=6)
    pp.pprint(poll.pollster)
    pp.pprint(poll.questions)


def main():

    args = get_args()

    pollster = Pollster()
    chart = pollster.charts(topic=args.topic)

    if args.run_all:
        for state in chart:
            polls = state.polls()
            for poll in polls:
                process_poll(poll)
    else:
        if args.state:
            state = get_state_from_chart(chart, args.state)
        else:
            state = chart[int(args.index)]
        polls = state.polls()
        for poll in polls:
            process_poll(poll)

    ## need TODO

    # 1) the score of each poll

    # 2) the number of likely voters polled




main()




