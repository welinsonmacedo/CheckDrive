const fs = require('fs');
let content = fs.readFileSync('src/modules/company/components/ScoreCloseModal.tsx', 'utf8');

content = content.replace(
  /select\('id, participates_in_ranking, score_profile_id, score_profiles\(base_value, calculation_type\)\.eq\("company_id", \(user as any\)\?\.company_id\)\.eq\("company_id", \(user as any\)\?\.company_id\), driver_performance\(\*\)'\)/g,
  "select('id, participates_in_ranking, score_profile_id, score_profiles(base_value, calculation_type), driver_performance(*)').eq('company_id', (user as any)?.company_id)"
);

fs.writeFileSync('src/modules/company/components/ScoreCloseModal.tsx', content);
