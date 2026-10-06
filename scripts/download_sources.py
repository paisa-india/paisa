import urllib.request, hashlib, json, datetime, pathlib, time
root = pathlib.Path(__file__).resolve().parents[1]
for name in ['bag1','bag5','bag6','bag7']:
    url=f'https://www.indiabudget.gov.in/doc/Budget_at_Glance/{name}.pdf'
    with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'PaisaResearch/0.1 (public budget verification)'}),timeout=45) as response:
        raw=response.read(); headers=dict(response.headers)
    sha=hashlib.sha256(raw).hexdigest()
    dest=root/'data'/'snapshots'/f'{sha}.pdf'
    if not dest.exists(): dest.write_bytes(raw)
    meta={'id':name,'url':url,'sha256':sha,'path':f'data/snapshots/{sha}.pdf','retrievedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'httpMetadata':headers,'datasetVersion':'2026-27','parserVersion':'union-budget/1.0.0','license':{'name':'Source-specific terms; review pending','redistributionAllowed':False,'url':'https://www.indiabudget.gov.in/','attribution':'Ministry of Finance, Government of India. Union Budget 2026–27. PAISA is independent and is not endorsed by the Government of India.'}}
    (root/'data'/'snapshots'/f'{name}.json').write_text(json.dumps(meta,indent=2))
    print(name,sha,len(raw)); time.sleep(1)
