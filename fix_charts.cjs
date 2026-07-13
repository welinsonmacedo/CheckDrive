const fs = require('fs');

function patchFile(filepath) {
  if (!fs.existsSync(filepath)) return;
  let content = fs.readFileSync(filepath, 'utf8');

  // We need to fix the syntax error at the end of the charts block
  // It looks like `})}).filter(d => ...`
  
  const badContentStart = content.indexOf(`          );
        })}).filter(d => d['Média'] > 0).sort((a, b) => b['Média'] - a['Média'])}`);

  if (badContentStart !== -1) {
     const badContentEnd = content.indexOf('          </div>\n        )}', badContentStart);
     if (badContentEnd !== -1) {
        // Remove the duplicated old chart code
        const before = content.substring(0, badContentStart + 35); // Keep `          );\n        })}`
        const after = content.substring(badContentEnd + 26); // after the `)}` of the old block
        content = before + after;
     }
  }

  fs.writeFileSync(filepath, content);
  console.log('Fixed ' + filepath);
}

patchFile('src/modules/company/components/AveragesTab.tsx');
patchFile('src/components/admin/AveragesTab.tsx');
