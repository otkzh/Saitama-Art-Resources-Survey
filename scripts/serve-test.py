#!/usr/bin/env python3
"""Quiet, concurrent static server for testing an extracted delivery ZIP."""
import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

parser = argparse.ArgumentParser()
parser.add_argument('--port', type=int, default=4173)
parser.add_argument('--directory', default='dist/qa')
args = parser.parse_args()


class Handler(SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        pass


class Server(ThreadingHTTPServer):
    request_queue_size = 256


with Server(('127.0.0.1', args.port), partial(Handler, directory=args.directory)) as server:
    print(f'Local: http://127.0.0.1:{args.port}/map/', flush=True)
    server.serve_forever()
