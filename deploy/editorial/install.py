#!/usr/bin/env python3
"""Install a coherent, versioned channel bundle while both cron locks are held."""
import argparse
import contextlib
import datetime
import fcntl
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import shlex

parser = argparse.ArgumentParser()
parser.add_argument('--share', type=Path, default=Path.home()/'.local/share')
parser.add_argument('--state', type=Path, default=Path.home()/'.local/state')
parser.add_argument('--schedule', action='store_true', help='Initialize durable evening editions and replace only the tagged evening cron entry')
args = parser.parse_args()
source = Path(__file__).resolve().parents[1]
revision = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=source, text=True).strip()
stamp = datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
release = args.share/'pizdato-channel-releases'/f'{revision[:12]}-{stamp}'
backup = args.state/'pizdato-editorial-backups'/stamp
with contextlib.ExitStack() as stack:
    for slot in ('morning', 'evening'):
        state = args.state/f'pizdato-{slot}'
        state.mkdir(parents=True, exist_ok=True)
        lock = stack.enter_context((state/'run.lock').open('a'))
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    release.mkdir(parents=True)
    backup.mkdir(parents=True)
    old_cron = None
    if args.schedule:
        result = subprocess.run(['crontab', '-l'], text=True, capture_output=True)
        if result.returncode not in (0, 1):
            raise RuntimeError('Cannot read crontab')
        old_cron = result.stdout
        (backup/'crontab.txt').write_text(old_cron)
        shutil.copytree(args.state/'pizdato-evening', backup/'evening-state')
    for slot in ('morning', 'evening', 'editorial'):
        shutil.copytree(source/slot, release/slot, ignore=shutil.ignore_patterns('test', '__pycache__', 'resources'))
    shutil.copy2(release/'evening/agent.mjs', release/'morning/transport.mjs')
    for slot in ('morning', 'evening'):
        (release/slot/'run.sh').chmod(0o700)
    (release/'evening/tick.sh').chmod(0o700)
    hashes = {str(p.relative_to(release)): hashlib.sha256(p.read_bytes()).hexdigest()
              for p in sorted(release.rglob('*')) if p.is_file()}
    manifest = {'revision': revision, 'installed_at': stamp, 'sha256': hashes}
    (release/'manifest.json').write_text(json.dumps(manifest, indent=2)+'\n')
    previous = {}
    for slot in ('morning', 'evening'):
        dest = args.share/f'pizdato-{slot}'
        if dest.is_symlink():
            previous[slot] = str(dest.resolve())
        elif dest.exists():
            shutil.copytree(dest, backup/slot)
            previous[slot] = str(backup/slot)
        else:
            previous[slot] = None
    (backup/'previous.json').write_text(json.dumps(previous, indent=2)+'\n')
    changed = []
    try:
        for slot in ('morning', 'evening'):
            dest = args.share/f'pizdato-{slot}'
            changed.append(slot)
            if dest.exists() and not dest.is_symlink():
                dest.rename(backup/f'{slot}-original')
            link = args.share/f'.pizdato-{slot}-{stamp}'
            link.symlink_to(release/slot, target_is_directory=True)
            os.replace(link, dest)
        if args.schedule:
            env = dict(os.environ, PIZDATO_EVENING_STATE=str(args.state/'pizdato-evening'))
            subprocess.run(['/usr/bin/node', str(release/'evening/cli.mjs'), '--init'], env=env, check=True, capture_output=True)
            command = '/bin/bash '+shlex.quote(str(args.share/'pizdato-evening/tick.sh'))
            logfile = shlex.quote(str(args.state/'pizdato-evening/cron.log'))
            cron = '\n'.join(line for line in old_cron.splitlines() if not line.rstrip().endswith('# pizdato-evening'))+'\n'
            cron += '*/5 * * * * '+command+' >> '+logfile+' 2>&1 # pizdato-evening\n'
            (backup/'crontab-new.txt').write_text(cron)
            subprocess.run(['crontab', str(backup/'crontab-new.txt')], check=True)
        for name, digest in hashes.items():
            if hashlib.sha256((release/name).read_bytes()).hexdigest() != digest:
                raise RuntimeError(f'Installed hash mismatch: {name}')
    except BaseException:
        if args.schedule and old_cron is not None:
            subprocess.run(['crontab', str(backup/'crontab.txt')], check=True)
        for slot in changed:
            dest = args.share/f'pizdato-{slot}'
            if dest.is_symlink():
                dest.unlink()
            elif dest.exists():
                continue
            if previous[slot]:
                dest.symlink_to(previous[slot], target_is_directory=True)
        raise
print(json.dumps({'release': str(release), 'backup': str(backup), 'revision': revision}))
