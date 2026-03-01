const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');
const exts = ['.ts', '.tsx', '.css', '.md'];

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else {
            if (exts.includes(path.extname(file))) {
                results.push(file);
            }
        }
    });
    return results;
}

const files = walk(srcDir);
files.push(path.join(__dirname, 'package.json'));
files.push(path.join(__dirname, 'package-lock.json'));
files.push(path.join(__dirname, 'README.md')); // Might not exist, but just in case

let updatedFiles = 0;

files.forEach(file => {
    if (fs.existsSync(file)) {
        const original = fs.readFileSync(file, 'utf8');
        let updated = original
            .replace(/AdmitFlow/g, 'Orquestra')
            .replace(/admitflow/g, 'orquestra');

        if (original !== updated) {
            fs.writeFileSync(file, updated, 'utf8');
            console.log('Updated:', file);
            updatedFiles++;
        }
    }
});

console.log(`Done. Updated ${updatedFiles} files.`);
