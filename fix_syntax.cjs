const fs = require('fs');
const path = require('path');

function patchFile(file) {
    let content = fs.readFileSync(file, 'utf8');
    
    // Find all occurrences of `.eq("company_id", user?.company_id)` INSIDE strings and move them outside
    let modified = false;

    // Pattern: .select("... .eq("company_id", user?.company_id) ...")
    // Replace with: .select("... ...")\n.eq("company_id", user?.company_id)
    content = content.replace(/\.select\(\s*`([^`]*)`\s*\)/g, (match, selContent) => {
        if (selContent.includes('.eq("company_id", user?.company_id)')) {
            modified = true;
            let cleaned = selContent.replace(/\.eq\("company_id", user\?\.company_id\)/g, '');
            return `.select(\`${cleaned}\`).eq("company_id", user?.company_id)`;
        }
        return match;
    });

    content = content.replace(/\.select\(\s*"([^"]*)"\s*\)/g, (match, selContent) => {
        if (selContent.includes('.eq("company_id", user?.company_id)')) {
            modified = true;
            let cleaned = selContent.replace(/\.eq\("company_id", user\?\.company_id\)/g, '');
            return `.select("${cleaned}").eq("company_id", user?.company_id)`;
        }
        return match;
    });

    content = content.replace(/\.select\(\s*"([^"]*)",\s*\)/g, (match, selContent) => {
        if (selContent.includes('.eq("company_id", user?.company_id)')) {
            modified = true;
            let cleaned = selContent.replace(/\.eq\("company_id", user\?\.company_id\)/g, '');
            return `.select("${cleaned}").eq("company_id", user?.company_id)`;
        }
        return match;
    });
    
    // Also cleanup double eqs
    content = content.replace(/\.eq\("company_id", user\?\.company_id\)\.eq\("company_id", user\?\.company_id\)/g, '.eq("company_id", user?.company_id)');

    if (modified) {
        fs.writeFileSync(file, content);
        console.log("Fixed", file);
    }
}

function walk(dir) {
    fs.readdirSync(dir).forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            walk(fullPath);
        } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
            patchFile(fullPath);
        }
    });
}

walk('src/modules/company');
