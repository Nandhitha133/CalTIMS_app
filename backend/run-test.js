const fs = require('fs');
const { execSync } = require('child_process');

try {
  const output = execSync('node test-smtp.js', { encoding: 'utf-8' });
  fs.writeFileSync('smtp-output.txt', output);
} catch (e) {
  fs.writeFileSync('smtp-output.txt', e.toString() + '\n\n' + (e.stdout ? e.stdout.toString() : '') + '\n\n' + (e.stderr ? e.stderr.toString() : ''));
}
