const fs = require('fs');
const data = JSON.parse(fs.readFileSync('full_offers.json'));
const restricted = data.find(o => o.advertiser.nickName === 'User-a45bd') || data[0];
const normal = data.find(o => o.advertiser.nickName === 'Vortex Digital') || data.find(o => o.advertiser.userType === 'merchant') || data[1];

console.log("Restricted User:", restricted.advertiser.nickName);
console.log("Normal User:", normal.advertiser.nickName);

console.log("\n--- adv diff ---");
Object.keys(restricted.adv).forEach(k => {
    if (JSON.stringify(restricted.adv[k]) !== JSON.stringify(normal.adv[k])) {
        console.log(`${k}: R=`, restricted.adv[k], ` N=`, normal.adv[k]);
    }
});

console.log("\n--- advertiser diff ---");
Object.keys(restricted.advertiser).forEach(k => {
    if (JSON.stringify(restricted.advertiser[k]) !== JSON.stringify(normal.advertiser[k])) {
        console.log(`${k}: R=`, restricted.advertiser[k], ` N=`, normal.advertiser[k]);
    }
});
