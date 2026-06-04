const fs = require('fs');
let content = '';
Object.keys(process.env).forEach(key => {
  if (key.startsWith('EXPO_PUBLIC_')) {
    content += key + '=' + process.env[key] + '
';
  }
});
if (content) {
  fs.writeFileSync('.env', content);
  console.log('.env written with keys:', content.split('
').filter(Boolean).map(l => l.split('=')[0]).join(', '));
} else {
  console.log('No EXPO_PUBLIC_ variables found in environment');
}
