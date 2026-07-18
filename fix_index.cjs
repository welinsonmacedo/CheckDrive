const fs = require('fs');
let code = fs.readFileSync('index.html', 'utf8');
code = code.replace(/<link rel="manifest".*?>/g, '');
code = code.replace(/<script>.*?<\/script>/gs, '');
fs.writeFileSync('index.html', code);
console.log('Fixed index.html');
