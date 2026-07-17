const fs = require('fs');
const path = require('path');

function getAllFiles(dirPath, arrayOfFiles) {
  const files = fs.readdirSync(dirPath);
  arrayOfFiles = arrayOfFiles || [];
  files.forEach(function(file) {
    if (fs.statSync(dirPath + '/' + file).isDirectory()) {
      arrayOfFiles = getAllFiles(dirPath + '/' + file, arrayOfFiles);
    } else {
      if (file.endsWith('.tsx')) {
        arrayOfFiles.push(path.join(dirPath, '/', file));
      }
    }
  });
  return arrayOfFiles;
}

const allFiles = getAllFiles('src/app');

allFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
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
  
  if (content !== original) {
    fs.writeFileSync(file, content);
    console.log('Fixed', file);
  }
});
