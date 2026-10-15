"""Export a bounded recent batch from D1. Credentials never enter public files."""
import json, os, urllib.request
account=os.environ['CF_ACCOUNT_ID']; database=os.environ['CF_DATABASE_ID']
url=f'https://api.cloudflare.com/client/v4/accounts/{account}/d1/database/{database}/query'
request=urllib.request.Request(url,data=json.dumps({'sql':'SELECT payload FROM optimizer_submissions ORDER BY created_at DESC LIMIT 1000'}).encode(),headers={'Authorization':'Bearer '+os.environ['CLOUDFLARE_API_TOKEN'],'Content-Type':'application/json'})
with urllib.request.urlopen(request,timeout=60) as response:
    body=json.load(response)
if not body.get('success'): raise RuntimeError('D1 export failed')
with open('/tmp/base-submissions.json','w') as output: json.dump(body['result'][0]['results'],output)
