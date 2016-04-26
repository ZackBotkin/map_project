
import tornado.web

class StateHandler(tornado.web.RequestHandler):

    def get(self):

        code = self.get_argument('code')
        self.write(code)

