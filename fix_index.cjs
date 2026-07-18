const fs = require('fs');
const file = 'index.html';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  '<meta name="viewport" content="width=device-width, initial-scale=1.0" />',
  '<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />\n    <meta name="theme-color" content="#ffffff" />'
);

code = code.replace(
  '<title>CheckDrive</title>',
  '<title>CheckDrive</title>\n    <link rel="manifest" href="/manifest.json" />'
);

code = code.replace(
  '</body>',
  `    <script>
      if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
          navigator.serviceWorker.register('/sw.js').catch(err => {
            console.log('SW registration failed: ', err);
          });
        });
      }
    </script>
  </body>`
);

fs.writeFileSync(file, code);
console.log('Fixed index.html');
