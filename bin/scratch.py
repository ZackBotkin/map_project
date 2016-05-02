
import argparse

from src.scratch import get_weighted_data


def _get_args():
    parser = argparse.ArgumentParser()

    parser.add_argument(
        '--filename',
        dest = 'filename',
        default = 'data/pollster-ratings.tsv'
    )

    parser.add_argument(
        '--poll',
        dest = 'poll_name',
        required = True
    )

    return parser.parse_args()


def main():

    args = _get_args()
    weighted_data = get_weighted_data(args.filename)
    print "Poll\t%s\nBucket\t%s\nWeight\t%s\n" % (
        args.poll_name,
        weighted_data[args.poll_name]['bucket_number'],
        weighted_data[args.poll_name]['poll_weight']
    )


if __name__ == "__main__":
    main()
