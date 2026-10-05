const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {execFileSync, spawnSync} = require('node:child_process');
const root = path.resolve(__dirname, '..');
function run(command, args, cwd = root) {
  const result = spawnSync(command, args, {cwd, stdio: 'inherit'});
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} failed (${result.status})`);
}
function trackedSnapshot() {
  const names = execFileSync('git', ['ls-files', '-z'], {cwd: root, encoding: 'utf8'}).split('\0').filter(Boolean);
  return new Map(names.map(name => {
    const file = path.join(root, name);
    return [name, fs.existsSync(file) ? crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex') : null];
  }));
}
try {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const lock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8'));
  for (const group of ['dependencies', 'devDependencies']) {
    for (const [name, version] of Object.entries(manifest[group] || {})) {
      if (lock.packages?.['']?.[group]?.[name] !== version) {
        throw new Error(`package-lock.json does not match package.json: ${name}. Review dependencies before sync.`);
      }
      if (!fs.existsSync(path.join(root, 'node_modules', name, 'package.json'))) {
        throw new Error(`Missing dependency: ${name}. Install locked dependencies before sync.`);
      }
    }
  }
  const config = JSON.parse(fs.readFileSync(path.join(root, 'capacitor.config.json'), 'utf8'));
  if (config.webDir !== 'dist') throw new Error('Expected webDir=dist; review verification paths before building.');
  const before = trackedSnapshot();
  run(process.execPath, [path.join(root, 'node_modules/@capacitor/cli/bin/capacitor'), 'sync', 'android']);
  const after = trackedSnapshot();
  const changed = [...before].filter(([name, hash]) => after.get(name) !== hash).map(([name]) => name);
  if (changed.length) throw new Error(`Sync changed tracked files; review before retrying:\n${changed.join('\n')}`);
  const android = path.join(root, 'android');
  function gradle(task) {
    if (process.platform === 'win32') run('cmd.exe', ['/d', '/c', 'gradlew.bat', task], android);
    else run('./gradlew', [task], android);
  }
  gradle(':app:verifyWebAssets');
  gradle(':app:assembleDebug');
  gradle(':app:verifyDebugApkAssets');
  console.log('Verified APK: android/app/build/outputs/apk/debug/app-debug.apk');
} catch (error) { console.error(error.message); process.exitCode = 1; }
