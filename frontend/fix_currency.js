const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.tsx') || file.endsWith('.jsx')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk('d:\\apps\\caltims mobile app\\frontend\\src\\screens\\payroll');

let updatedCount = 0;
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;
  
  content = content.replace(/const currencySymbol = settings\?\.organization\?\.currency === 'INR' \? '₹' : '\$';/g, 
    "const currencySymbol = settings?.payroll?.currencySymbol || '$';");
  
  content = content.replace(/const currencySymbol = settings\?\.organization\?\.currency === 'INR' \? '₹' : \(settings\?\.payroll\?\.currencySymbol \|\| '\$'\);/g, 
    "const currencySymbol = settings?.payroll?.currencySymbol || '$';");

  if (content !== original) {
    fs.writeFileSync(file, content);
    console.log('Updated', path.basename(file));
    updatedCount++;
  }
});

console.log('Total files updated:', updatedCount);
