const fs = require('fs');
const path = require('path');

const tablesWithCompanyId = ['vehicles', 'trailers', 'vehicle_types', 'vehicle_models', 'vehicle_modalities', 'profiles', 'checklist_submissions', 'checklist_issues', 'routes', 'schedules', 'traffic_infractions', 'score_closings', 'baits', 'inventory_items', 'inventory_suppliers', 'inventory_transactions', 'manual_penalties', 'integration_whatsapp_rules'];

function patchFile(file) {
    let content = fs.readFileSync(file, 'utf8');
    
    if (!content.includes('supabase') || !content.includes('.select')) return;

    let modified = false;

    // 1. Ensure useAuth is imported
    if (!content.includes('useAuth')) {
        content = content.replace(
           /import \{ supabase \}.*?;/,
           (match) => match + `\nimport { useAuth } from '@/src/modules/shared/contexts/AuthContext';`
        );
        if (!content.includes('useAuth')) {
             content = `import { useAuth } from '@/src/modules/shared/contexts/AuthContext';\n` + content;
        }
    }

    // 2. Ensure const { user } = useAuth(); is in all exported components
    content = content.replace(/export default function (\w+)\s*\(([^)]*)\)\s*\{/g, (match, name, args) => {
        if (!content.includes(`const { user } = useAuth();`) && !content.includes(`const { user } = useAuth()`)) {
            modified = true;
            return match + `\n  const { user } = useAuth();\n`;
        }
        return match;
    });

    // 3. Patch the selects
    // Note: JS regex dotAll is /s, but we'll use [\s\S] or \s* between calls
    const regex = /supabase\s*\.\s*from\s*\(\s*(['"`])([^'"`]+)\1\s*\)\s*\.\s*select\s*\(\s*([^)]*?)\s*\)/g;
    
    content = content.replace(regex, (match, q, table, selArgs) => {
        if (tablesWithCompanyId.includes(table)) {
            if (!match.includes('eq("company_id"')) {
                modified = true;
                return `supabase.from(${q}${table}${q}).select(${selArgs}).eq("company_id", user?.company_id)`;
            }
        }
        return match;
    });

    if (modified) {
        fs.writeFileSync(file, content);
        console.log("Patched multi-line", file);
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
