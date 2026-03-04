const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(dirPath);
    });
}

const modulesRoot = path.join(__dirname, 'frontend/src/components/v3/modules');

walkDir(modulesRoot, function (filePath) {
    if (!filePath.endsWith('.jsx') && !filePath.endsWith('.js')) return;

    const relative = path.relative(modulesRoot, filePath);
    const depth = relative.split(path.sep).length;

    // Depth: match/File.jsx = 2 elements.
    // Number of ../ needed = depth + 2
    // match/File.jsx (depth 2) -> ../../ (to modules) -> ../ (to v3) -> ../ (to components) -> ../ (to src) -> 4 levels.
    // Wait, let's verify:
    // File.jsx inside match/. 
    // .. goes to match.
    // .. goes to modules.
    // .. goes to v3.
    // .. goes to components.
    // .. goes to src.
    // 5 levels?!
    // Let's trace from: frontend/src/components/v3/modules/match/File.jsx
    // __dirname is modules/match
    // 1 up: modules
    // 2 up: v3
    // 3 up: components
    // 4 up: src
    // 4 levels up!
    // So if depth is 2 (match + File.jsx), it's 4 levels up.
    // Formula: levelsUp = depth + 2.
    const levelsUp = depth + 2;
    const prefix = '../'.repeat(levelsUp);

    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    content = content.replace(/from\s+['"](\.\.\/)+design-system['"]/g, `from '${prefix}design-system'`);
    content = content.replace(/from\s+['"](\.\.\/)+utils(\/.*)?['"]/g, (match, p1, p2) => `from '${prefix}utils${p2 || ''}'`);
    content = content.replace(/from\s+['"](\.\.\/)+context(\/.*)?['"]/g, (match, p1, p2) => `from '${prefix}context${p2 || ''}'`);
    content = content.replace(/import\s+api\s+from\s+['"](\.\.\/)+services\/api['"]/g, `import api from '${prefix}services/api'`);

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('Fixed', filePath);
    }
});
