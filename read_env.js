import fs from 'fs';
if (fs.existsSync('.env')) {
  const content = fs.readFileSync('.env', 'utf8');
  console.log("DATABASE_URL present:", content.includes('DATABASE_URL'));
} else {
  console.log(".env not found");
}
