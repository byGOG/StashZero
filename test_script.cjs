const fs = require('fs');

const systemApps = [
    // Output from get_installed_winget_ids simulated
];

const mockOutput = fs.readFileSync('installed.txt', 'utf8').split('\n').filter(Boolean).map(line => {
    const parts = line.split('|');
    return [parts[0].trim(), parts[1] ? parts[1].trim() : ""];
});

const lowerName = 'powertoys';
const lowerId = 'powertoys';

let match = mockOutput.find(([name, _]) => {
    const lowerN = name.toLowerCase();
    return lowerN === lowerName || lowerN === lowerId || lowerN.includes(lowerName);
});

console.log('Match:', match);
