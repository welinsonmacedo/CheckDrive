const fs = require('fs');

function fixFile(filepath) {
  if (!fs.existsSync(filepath)) return;
  let content = fs.readFileSync(filepath, 'utf8');

  // Remove Image as ImageIcon from react-router-dom
  content = content.replace(
    'import {\n  Image as ImageIcon, useParams, useNavigate',
    'import { useParams, useNavigate'
  );
  content = content.replace(
    'import {\n  Image as ImageIcon, useParams, useNavigate, useLocation',
    'import { useParams, useNavigate, useLocation'
  );

  // Add ImageIcon to lucide-react
  if (!content.includes('Image as ImageIcon,') && !content.includes('ImageIcon,')) {
    content = content.replace(
      'import {\n  Camera,',
      'import {\n  Image as ImageIcon,\n  Camera,'
    );
  }

  fs.writeFileSync(filepath, content);
  console.log('Fixed imports in ' + filepath);
}

fixFile('src/pages/ChecklistFlow.tsx');
fixFile('src/modules/driver/pages/ChecklistFlow.tsx');
