#!/usr/bin/env python3
"""Create the new public pilot, baseline scan, enforce gates, then open its draft PR.
No credentials are accepted by arguments, read from disk, or printed. gh owns auth.
Default is a plan. Never repurpose an existing repository without --resume.
"""
import argparse
import json
from pathlib import Path
import re
import shutil
import subprocess
import time

ROOT = Path(__file__).resolve().parents[1]
BRANCH = 'feature/data-hub-plugin-pilot'

def run(args, stdin=None):
    return subprocess.run(args, input=stdin, text=True, check=True, capture_output=True, cwd=ROOT).stdout.strip()

def api(path, method='GET', body=None):
    args = ['gh', 'api', path, '--method', method, '-H', 'X-GitHub-Api-Version: 2026-03-10']
    if body is not None:
        args += ['--input', '-']
    value = run(args, None if body is None else json.dumps(body))
    return json.loads(value) if value else None

def subset(actual, wanted):
    if isinstance(wanted, dict):
        return isinstance(actual, dict) and all(k in actual and subset(actual[k], v) for k, v in wanted.items())
    if isinstance(wanted, list):
        if not isinstance(actual, list) or len(actual) != len(wanted):
            return False
        remaining = list(actual)
        for item in wanted:
            match = next((i for i, candidate in enumerate(remaining) if subset(candidate, item)), None)
            if match is None:
                return False
            remaining.pop(match)
        return True
    return actual == wanted

def require(condition, message):
    if not condition:
        raise RuntimeError(message)

def settings(name):
    return json.loads((ROOT / '.github/settings' / name).read_text())

def push(repo, source, destination):
    run(['git', '-c', 'credential.helper=', '-c', 'credential.helper=!gh auth git-credential',
         'push', f'https://github.com/{repo}.git', f'{source}:{destination}'])

def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--owner', required=True)
    parser.add_argument('--name', required=True)
    parser.add_argument('--apply', action='store_true')
    parser.add_argument('--resume', action='store_true')
    args = parser.parse_args(argv)
    require(bool(re.fullmatch(r'[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})', args.owner)), 'Use a GitHub owner login.')
    require(bool(re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9._-]{0,99}', args.name)), 'Use a repository name.')
    repo = f'{args.owner}/{args.name}'
    print(json.dumps({'target':repo,'visibility':'public','apply':args.apply,'plan':[
        'Create a new public repository; retain any partial setup for an explicit resume.',
        'Verify admin access and existing write access for every configured code owner.',
        'Push the minimal governance/protocol baseline to main; complete baseline CodeQL.',
        'Apply and read back repository, Actions, vulnerability reporting and scanning settings.',
        'Apply active main/tag rulesets with no bypass and two required Actions checks.',
        'Push the tested implementation branch and open a draft PR; never merge or deploy.'
    ]}, indent=2))
    if not args.apply:
        return
    require(shutil.which('gh') is not None, 'Install the official GitHub CLI and authenticate with gh auth login.')
    require(run(['git','branch','--show-current']) == BRANCH, f'Checkout {BRANCH}.')
    require(not run(['git','status','--porcelain']), 'Commit or remove local changes before bootstrap.')
    roots = run(['git','rev-list','--max-parents=0','HEAD']).splitlines()
    require(len(roots)==1, 'Expected one bootstrap baseline commit.')
    baseline = roots[0]
    head = run(['git','rev-parse','HEAD'])
    require(head != baseline, 'The pilot must be a separate implementation commit.')
    run(['gh','api','user','--jq','.login'])  # Authenticate without exposing token material.
    if not args.resume:
        run(['gh','repo','create',repo,'--public','--description',settings('repository.json')['description']])
    metadata = api(f'repos/{repo}')
    require(metadata.get('visibility')=='public' and metadata.get('permissions',{}).get('admin') is True,
            'Public visibility and repository admin access are required.')
    owners = re.findall(r'(?m)^\*\s+(.+)$',(ROOT/'.github/CODEOWNERS').read_text())
    require(len(owners)==1,'Configure one default CODEOWNERS line.')
    for owner in owners[0].split():
        require(bool(re.fullmatch(r'@[A-Za-z0-9-]+',owner)), 'This bootstrap supports individual existing code owners.')
        permission = api(f'repos/{repo}/collaborators/{owner[1:]}/permission')
        require(permission.get('permission') in ('write','maintain','admin'), f'{owner} needs existing write access. No access is granted by this script.')
    remote_main = run(['git','ls-remote',f'https://github.com/{repo}.git','refs/heads/main'])
    require(not remote_main or remote_main.split()[0]==baseline, 'Remote main differs from this bootstrap baseline; stop for review.')
    if not remote_main:
        push(repo, baseline, 'refs/heads/main')
    desired = settings('repository.json') | {'default_branch':'main','security_and_analysis':{
        'secret_scanning':{'status':'enabled'}, 'secret_scanning_push_protection':{'status':'enabled'}}}
    api(f'repos/{repo}','PATCH',desired)
    require(subset(api(f'repos/{repo}'),desired),'Repository settings readback mismatch.')
    for tail, filename in [('actions/permissions','actions.json'),('actions/permissions/selected-actions','allowed-actions.json'),('actions/permissions/workflow','workflow-permissions.json')]:
        wanted=settings(filename);api(f'repos/{repo}/{tail}','PUT',wanted)
        require(subset(api(f'repos/{repo}/{tail}'),wanted),f'{tail} readback mismatch.')
    for feature in ['vulnerability-alerts','automated-security-fixes','private-vulnerability-reporting']:
        api(f'repos/{repo}/{feature}','PUT')
    # PUT + independent readbacks. Unsupported settings are errors, never silently skipped.
    api(f'repos/{repo}/vulnerability-alerts')  # enabled returns 204; disabled returns an error.
    require(api(f'repos/{repo}/automated-security-fixes').get('enabled') is True,'Security fixes readback mismatch.')
    require(api(f'repos/{repo}/private-vulnerability-reporting').get('enabled') is True,'Private reporting readback mismatch.')
    deadline = time.monotonic()+900
    while True:
        runs=json.loads(run(['gh','run','list','-R',repo,'--workflow','codeql.yml','--branch','main','--commit',baseline,'--json','databaseId,status,conclusion']))
        if runs and runs[0]['status']=='completed':
            require(runs[0]['conclusion']=='success','Baseline CodeQL failed; inspect its logs before resuming.')
            break
        require(time.monotonic()<deadline,'Baseline CodeQL did not finish in 15 minutes; resume after inspecting GitHub.')
        time.sleep(10)
    receipts=[]
    existing=api(f'repos/{repo}/rulesets')
    for filename in ['main.ruleset.json','tags.ruleset.json']:
        wanted=settings(filename)
        matching=[r for r in existing if r['name']==wanted['name']]
        require(len(matching)<=1,'Duplicate rulesets need manual review.')
        if matching:
            stored=api(f'repos/{repo}/rulesets/{matching[0]["id"]}')
            require(subset(stored,wanted),'Existing ruleset differs; this script will not replace it.')
        else:
            stored=api(f'repos/{repo}/rulesets','POST',wanted)
        verified=api(f'repos/{repo}/rulesets/{stored["id"]}')
        require(subset(verified,wanted),'Ruleset readback mismatch.')
        receipts.append({'id':stored['id'],'name':wanted['name'],'enforcement':verified['enforcement']})
    push(repo,head,f'refs/heads/{BRANCH}')
    prs=json.loads(run(['gh','pr','list','-R',repo,'--head',BRANCH,'--state','open','--json','url']))
    if prs:
        pr=prs[0]['url']
    else:
        pr=run(['gh','pr','create','-R',repo,'--base','main','--head',BRANCH,'--draft',
                '--title','Add the Data Hub editor plugin pilot and merge gates','--body-file',str(ROOT/'.github/initial-pr.md')])
    print(json.dumps({'repository':f'https://github.com/{repo}','draft_pull_request':pr,'source':head,
                      'rulesets':receipts,'verified':True,'merged':False,'deployed':False},indent=2))

if __name__=='__main__':
    try:
        main()
    except (RuntimeError, subprocess.CalledProcessError) as error:
        # gh command errors can contain server messages; print no stdout or credential material.
        message=str(error) if isinstance(error,RuntimeError) else 'A GitHub or Git operation failed. Inspect the target in GitHub, then use --resume only for this bootstrap.'
        raise SystemExit(message)
