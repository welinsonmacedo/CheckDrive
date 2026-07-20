const fs = require('fs');

function fix(file, searchText, replaceText) {
  let code = fs.readFileSync(file, 'utf8');
  if (code.includes(searchText)) {
    code = code.replace(searchText, replaceText);
    fs.writeFileSync(file, code);
    console.log('Fixed', file);
  }
}

// FuelTab
fix('src/modules/company/components/FuelTab.tsx',
  ') : submissions.length > 0 ? (\n\n        {/* Mobile View */}',
  ') : submissions.length > 0 ? (\n      <>\n        {/* Mobile View */}'
);
fix('src/modules/company/components/FuelTab.tsx',
  '        <div className="hidden md:block overflow-x-auto">\n          <table',
  '        <div className="hidden md:block overflow-x-auto">\n          <table'
);
// wait, for FuelTab, the ternary is `loading ? ... : submissions > 0 ? ... : ...`.
// The end of the desktop view is `) : (` for the else condition!

