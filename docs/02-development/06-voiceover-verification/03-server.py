from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from pathlib import Path
import json, time
root = Path(__file__).parent
log = root/'events.jsonl'
class Handler(BaseHTTPRequestHandler):
 def log_message(self, *args): pass
 def do_GET(self):
  body=(log.read_bytes() if log.exists() else b'') if self.path=='/events' else (root/'02-probe.html').read_bytes()
  self.send_response(200);self.send_header('Content-Type','text/plain; charset=utf-8' if self.path=='/events' else 'text/html; charset=utf-8');self.send_header('Cache-Control','no-store');self.end_headers();self.wfile.write(body)
 def do_POST(self):
  body=self.rfile.read(int(self.headers.get('Content-Length','0')))
  if self.path=='/reset': log.write_text('')
  else:
   event=json.loads(body);event['serverTime']=time.time()
   with log.open('a') as f:f.write(json.dumps(event,ensure_ascii=False)+'\n')
  self.send_response(204);self.end_headers()
ThreadingHTTPServer(('127.0.0.1',18767),Handler).serve_forever()
