import { loadTree } from './merkle';
import requireContext from 'require-context';

const network = process.env.NETWORK || 'mainnet';
const networkStr = network === 'kovan' ? '-kovan' : '';
const requireFile = requireContext(
    `../../reports${networkStr}`,
    true,
    /_totals.json$/
);
const reports = Object.fromEntries(
    requireFile
        .keys()
        .map((fileName) => [
            fileName.replace('/_totals.json', ''),
            requireFile(fileName),
        ])
);

console.log('Merkle roots');
Object.entries(reports).forEach(([week, report]) => {
    const merkleTree = loadTree(report);
    console.log(`Week ${week}`);
    console.log(merkleTree.getHexRoot());
});
