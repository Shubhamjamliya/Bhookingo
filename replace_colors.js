const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, 'Frontend', 'src', 'modules', 'Food');

const replacements = [
  { search: /\[#B80B3D\]/g, replace: 'restaurant-primary' },
  { search: /\[#66001D\]/g, replace: 'restaurant-secondary' },
  { search: /\[#22C55E\]/g, replace: 'restaurant-primary' },
  { search: /\[#16A34A\]/g, replace: 'restaurant-secondary' },
  // Also replace rgba variants in shadows
  { search: /shadow-\[0_10px_30px_rgba\(184,11,61,0\.25\)\]/g, replace: 'shadow-xl shadow-restaurant-primary/25' },
  { search: /shadow-\[0_10px_30px_rgba\(34,197,94,0\.25\)\]/g, replace: 'shadow-xl shadow-restaurant-primary/25' },
];

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else if (stat.isFile() && (fullPath.endsWith('.jsx') || fullPath.endsWith('.js'))) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let originalContent = content;
      
      for (const { search, replace } of replacements) {
        content = content.replace(search, replace);
      }
      
      if (content !== originalContent) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated ${fullPath}`);
      }
    }
  }
}

processDirectory(directoryPath);
console.log('Replacement complete.');
