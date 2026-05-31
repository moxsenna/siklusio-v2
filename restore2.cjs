const fs = require('fs');
const readline = require('readline');
const path = 'C:/Users/bimap/.gemini/antigravity-ide/brain/18dfbe7c-4fa5-4ac1-bb95-0250db4fcc53/.system_generated/logs/transcript.jsonl';

const stream = fs.createReadStream(path);
const rl = readline.createInterface({ input: stream });

let lines = {};
let foundGood = false;

rl.on('line', (line) => {
  try {
    const data = JSON.parse(line);
    // Use the specific step index where it was uncorrupted
    if ((data.type === 'TOOL_RESPONSE' || data.type === 'VIEW_FILE') && !foundGood) {
       const content = data.content;
       if (content && content.includes('File Path: `file:///d:/Coding/remix_-siklusio/backend/index.ts`')) {
          if (content.includes('Total Lines: 1719')) {
             const contentLines = content.split(/\r?\n/);
             for (const cl of contentLines) {
                const match = cl.match(/^(\d+): (.*)$/);
                if (match) {
                   lines[parseInt(match[1])] = match[2];
                }
             }
             if (Object.keys(lines).length >= 1719) {
                 foundGood = true; // Stop after grabbing the two chunks of the uncorrupted file
             }
          }
       }
    }
  } catch(e) {}
});

rl.on('close', () => {
  const keys = Object.keys(lines).map(Number);
  if (keys.length === 0) {
      console.log('No lines found!');
      return;
  }
  const maxLine = Math.max(...keys);
  let result = [];
  for (let i = 1; i <= maxLine; i++) {
     result.push(lines[i] !== undefined ? lines[i] : '');
  }
  fs.writeFileSync('d:/Coding/remix_-siklusio/backend/index.ts', result.join('\n'));
  console.log('Restored backend/index.ts with ' + maxLine + ' lines.');
});
