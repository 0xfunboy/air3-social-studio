import { execSync } from 'node:child_process';

const msg = "fix(auth): fix google login ui, enable safe team onboarding and granular rbac";
console.log('Staging files...');
execSync('git add -A', { stdio: 'inherit' });
console.log('Status:');
execSync('git --no-pager status --short', { stdio: 'inherit' });
console.log('Committing...');
try {
  execSync(`git commit -m "${msg}"`, { stdio: 'inherit' });
} catch (e) {
  console.log('Commit note:', e.message);
}
console.log('Pushing to origin main...');
execSync('git push origin main', { stdio: 'inherit' });
console.log('GIT_SYNC_COMPLETE');
