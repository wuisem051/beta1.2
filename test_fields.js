const fs = require('fs');
const data = JSON.parse(fs.readFileSync('full_offers.json'));

data.forEach(o => {
    // Collect all boolean or interesting fields that might indicate restriction
    const fields = {
        name: o.advertiser.nickName,
        takerKyc: o.adv.takerAdditionalKycRequired,
        makerKyc: o.adv.makerAdditionalKycRequired,
        classify: o.adv.classify,
        authStatus: o.advertiser.authStatus,
        tradeType: o.adv.tradeType,
        surplusAmount: o.adv.surplusAmount,
        min: o.adv.minSingleTransAmount,
        max: o.adv.maxSingleTransAmount,
        tradable: o.adv.tradableQuantity
    };
    console.log(fields);
});
