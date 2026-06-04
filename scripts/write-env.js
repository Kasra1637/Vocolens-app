const fs = require('fs');
let content = '';
Object.keys(process.env).forEach(function(key) {
  if (key.startsWith('EXPO_PUBLIC_')) {
    content += key + '=' + process.env[key] + '\n';
  }
});
if (content) {
  fs.writeFileSync('.env', content);
  const keys = content.split('\n').filter(Boolean).map(function(l) { return l.split('=')[0]; }).join(', ');
  console.log('.env written with keys: ' + keys);
} else {
  console.log('No EXPO_PUBLIC_ variables found in environment');
}
