
import csv
import json
import tornado.web


class StateUtils(object):

    def state_to_code(self, state_name):
        state_mappings = {
            "Alabama"   : "AL",
            "Alaska"    : "AK",
            "Arizona"   : "AZ"
        }
        return state_mappings.get(state_name, None)


class ApprovalHandler(tornado.web.RequestHandler, StateUtils):

    def get_approvals_dict(self):

        approvals = {}
        filename = 'data/approvals.csv'

        with open(filename, 'rb') as csvfile:
            reader = csv.DictReader(csvfile)
            for row in reader:
                code = self.state_to_code(row["State"])
                if code:
                    approvals[code] = row['Score']

        return approvals


    def get(self):

        code = self.get_argument('code')
        approvals = self.get_approvals_dict()

        if code in approvals:
            self.write(
                json.dumps({
                    'rating' : approvals[code]
                })
            )
        else:
            self.write(
                json.dumps({
                    'rating' : 'TBD'
                })
            )

