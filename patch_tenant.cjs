const fs = require('fs');

const file = 'src/modules/company/components/TrackingTab.tsx';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('useAuth') && content.includes('supabase.from')) {
    content = content.replace(
       `import { supabase } from '@/src/lib/supabase';`,
       `import { supabase } from '@/src/lib/supabase';\nimport { useAuth } from '@/src/modules/shared/contexts/AuthContext';`
    );
    content = content.replace(
       /export default function (\w+)\s*\(\)\s*\{/,
       `export default function $1() {\n  const { user } = useAuth();\n`
    );
}

const tablesWithCompanyId = ['vehicles', 'trailers', 'vehicle_types', 'vehicle_models', 'vehicle_modalities', 'profiles', 'checklist_submissions', 'checklist_issues', 'routes', 'schedules', 'traffic_infractions', 'score_closings', 'baits', 'inventory_items', 'inventory_suppliers', 'inventory_transactions', 'manual_penalties', 'integration_whatsapp_rules'];

content = content.replace(/supabase\.from\((['"`])([^'"`]+)\1\)\.select\(([^)]*)\)/g, (match, q, table, selArgs) => {
    if (tablesWithCompanyId.includes(table)) {
        if (!match.includes('eq("company_id"')) {
            return `supabase.from(${q}${table}${q}).select(${selArgs}).eq("company_id", user?.company_id)`;
        }
    }
    return match;
});

fs.writeFileSync(file + '.patched', content);
console.log('Done testing trackingtab');
