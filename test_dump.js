const fs = require('fs');
const data = JSON.parse(fs.readFileSync('full_offers.json'));
const restricted = data.find(o => o.advertiser.nickName === 'User-a45bd');
if (restricted) {
    fs.writeFileSync('user_a45bd_full.json', JSON.stringify(restricted, null, 2));
    console.log("Dumped user_a45bd_full.json");
}
