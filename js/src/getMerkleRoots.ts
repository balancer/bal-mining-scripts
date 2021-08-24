import { loadTree } from './merkle';
const fs = require('fs');
const path = require('path');
const glob = require('glob');
const { config } = require('./config');

const globCwd = path.resolve(__dirname, '../' + config.reportsDirectory);

const filenamesOfTotals = glob.sync('./**/' + config.reportFilename, {
    cwd: globCwd,
});

const reports = filenamesOfTotals.map((fileName) => [
    parseInt(fileName.split('/')[1]), // weekNumber
    JSON.parse(fs.readFileSync(path.resolve(globCwd, fileName)).toString()),
]);

console.log('Merkle roots');

reports.forEach(([week, report]) => {
    const merkleTree = loadTree(report);
    console.log(`Week ${week}`);
    console.log(merkleTree.getHexRoot());
});
