const fs = require('fs');
const path = require('path');

const files = [
  'src/app/(resident)/visitors.tsx',
  'src/app/(resident)/pre-approve.tsx',
  'src/app/(guard)/register-visitor.tsx',
  'src/app/(admin)/residents.tsx',
  'src/app/(admin)/flats.tsx',
  'src/app/(admin)/staff.tsx',
  'src/app/(admin)/towers.tsx',
  'src/app/(admin)/complaints.tsx',
  'src/app/(admin)/polls.tsx',
  'src/app/(admin)/amenities.tsx'
];

files.forEach(file => {
  const fullPath = path.join(__dirname, file);
  if (!fs.existsSync(fullPath)) return;
  
  let content = fs.readFileSync(fullPath, 'utf8');
  let original = content;

  content = content.replace(/bg-slate-50/g, 'bg-surface');
  content = content.replace(/text-slate-900/g, 'text-ink');
  content = content.replace(/text-slate-700/g, 'text-ink-soft');
  content = content.replace(/text-slate-600/g, 'text-ink-soft');
  content = content.replace(/text-slate-500/g, 'text-ink-muted');
  content = content.replace(/text-slate-400/g, 'text-ink-faint');
  content = content.replace(/bg-slate-100/g, 'bg-surface-muted');
  content = content.replace(/bg-slate-200/g, 'bg-surface-muted');
  content = content.replace(/bg-slate-300/g, 'bg-surface-muted');
  content = content.replace(/border-slate-200/g, 'border-surface-border');
  content = content.replace(/border-slate-100/g, 'border-surface-border');
  content = content.replace(/text-red-600/g, 'text-status-rejected');
  content = content.replace(/bg-teal-50/g, 'bg-brand-50');
  content = content.replace(/border-teal-200/g, 'border-brand-100');
  content = content.replace(/text-teal-800/g, 'text-brand-800');
  content = content.replace(/bg-teal-100/g, 'bg-brand-100');
  
  // Custom color replacements
  content = content.replace(/color="#475569"/g, 'color={palette.inkMuted}');
  content = content.replace(/color="#64748B"/g, 'color={palette.inkMuted}');

  if (content !== original) {
    fs.writeFileSync(fullPath, content);
    console.log('Fixed', file);
  }
});
