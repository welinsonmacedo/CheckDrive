const fs = require('fs');
const path = require('path');

const tablesWithCompanyId = ['vehicles', 'trailers', 'vehicle_types', 'vehicle_models', 'vehicle_modalities', 'profiles', 'checklist_submissions', 'checklist_issues', 'routes', 'schedules', 'traffic_infractions', 'score_closings', 'baits', 'inventory_items', 'inventory_suppliers', 'inventory_transactions', 'manual_penalties', 'integration_whatsapp_rules'];

function patchFile(file) {
    let content = fs.readFileSync(file, 'utf8');
    
    // Only patch if it has supabase.from and .select
    if (!content.includes('supabase.from') || !content.includes('.select')) return;

    let modified = false;

    // 1. Ensure useAuth is imported
    if (!content.includes('useAuth')) {
        content = content.replace(
           /import \{ supabase \}.*?;/,
           (match) => match + `\nimport { useAuth } from '@/src/modules/shared/contexts/AuthContext';`
        );
        // Sometimes supabase is not imported with exactly that pattern
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
    content = content.replace(/supabase\.from\((['"`])([^'"`]+)\1\)\.select\(([^)]*)\)/g, (match, q, table, selArgs) => {
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
        console.log("Patched", file);
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
