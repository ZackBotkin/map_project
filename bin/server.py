
import tornado.web
import tornado.ioloop

from src.handlers import ApprovalHandler

def main():

    settings = {}
    settings['static_path'] = './public/'

    app = tornado.web.Application([
        (r"/approval", ApprovalHandler, {}),
        (r"/()$", tornado.web.StaticFileHandler, dict(path=settings['static_path'] + 'index.html'))
    ], **settings)

    port = 9001
    app.listen(port)
    print "Listening on port %d" % port
    tornado.ioloop.IOLoop.current().start()


if __name__ == "__main__":
    main()
