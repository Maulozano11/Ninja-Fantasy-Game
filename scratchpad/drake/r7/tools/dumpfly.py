import json as _json
_json.dump(FLY, open(os.environ['OUTP'], 'w'), indent=1)
print('dumped')
