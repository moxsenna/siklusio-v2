import fs from 'fs';

const filePath = 'scratch/test-checklist.js';
let content = fs.readFileSync(filePath, 'utf8');

// Replace all occurrences of '[accessibilityLabel=' with '[aria-label='
const updatedContent = content.replaceAll('[accessibilityLabel=', '[aria-label=');

fs.writeFileSync(filePath, updatedContent, 'utf8');
console.log("Successfully replaced all [accessibilityLabel= selectors with [aria-label= selectors in test-checklist.js");
