const assert = require('assert');
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const script = fs.readFileSync(path.join(__dirname, '..', 'script.js'), 'utf8');

assert.ok(html.includes('id="roadmap"'), 'Roadmap section should exist in HTML');
assert.ok(script.includes('ganttRows') || script.includes('renderRoadmap'), 'Roadmap renderer should be implemented in script.js');
console.log('Roadmap presence check passed');
