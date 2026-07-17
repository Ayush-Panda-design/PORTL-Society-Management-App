const fs = require('fs');
const path = require('path');

const filesToPatch = [
  'src/app/(resident)/visitors.tsx',
  'src/app/(resident)/pre-approve.tsx',
  'src/app/(guard)/register-visitor.tsx'
];

filesToPatch.forEach(file => {
  const fullPath = path.join(__dirname, file);
  if (!fs.existsSync(fullPath)) return;
  let content = fs.readFileSync(fullPath, 'utf8');
  let original = content;
  
  if (content.includes('palette.inkMuted') && !content.includes('useThemePalette')) {
    content = content.replace(/import \{([^}]+)\} from 'expo-router';/g, "import {$1} from 'expo-router';\nimport { useThemePalette } from '@/hooks/use-theme';");
    content = content.replace(/export default function ([A-Za-z]+)\(\) \{/, "export default function $1() {\n  const palette = useThemePalette();");
  }
  
  if (content !== original) {
    fs.writeFileSync(fullPath, content);
    console.log('Patched imports for', file);
  }
});
