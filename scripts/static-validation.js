const fs=require('node:fs');
const vm=require('node:vm');
const required=['index.html','app.js','course-data.js','lesson-rubrics.js','semantic-model.js','semantic-response-scorer.js','response-scoring.js','assets/workplace-desktop.jpg','assets/workplace-mobile.webp'];
for(const file of required)if(!fs.existsSync(file))throw new Error(`Missing ${file}`);
for(const file of ['app.js','course-data.js','lesson-rubrics.js','semantic-model.js','semantic-response-scorer.js','response-scoring.js'])new vm.Script(fs.readFileSync(file,'utf8'),{filename:file});
const html=fs.readFileSync('index.html','utf8');
for(const script of ['lesson-rubrics.js','semantic-model.js','semantic-response-scorer.js','response-scoring.js','app.js'])if(!html.includes(script))throw new Error(`Script not wired: ${script}`);
console.log('Static validation passed.');
