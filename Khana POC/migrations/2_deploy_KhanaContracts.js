var KhanaToken = artifacts.require("KhanaToken");
var BondingCurveFunds = artifacts.require('BondingCurveFunds');

module.exports = function(deployer, network, accounts) {
    let khanaInstance
    let bondingFundsInstance

    console.log('  === Deploying Khana prototype contracts...')

    deployer.deploy(KhanaToken).then((result) => {
        khanaInstance = result

        return deployer.deploy(BondingCurveFunds, KhanaToken.address)
    })
    .then((result) => {
        bondingFundsInstance = result

        return khanaInstance.setFundsContract(BondingCurveFunds.address, {from: accounts[0]})
    })
    .then((result) => {

        // Fund the bonding curve with 'amountOfEthToFund' when deploying in development environment
        let amountOfEthToFund = "5"

        // Truffle calls it 'develop', ganache calls it 'development'
        if (network == 'develop' || network == 'development' || network == 'test') {

            console.log('\n************************************\nIf you are running tests and want to \nsee the results in terminal, follow \nthe instructions in truffle.js\n************************************\n')
            bondingFundsInstance.sendTransaction({from: accounts[9], value: web3.toWei(amountOfEthToFund, 'ether')}).then((result) => {
                console.log('Funding contract bonding curve...')
                console.log('  ... funded with ' + amountOfEthToFund + ' ETH successfully')
            }).catch((error) => {
                console.log('Funding contract bonding curve...')
                console.log('  ... error with funding occured: ' + error.message)
            })
        }
    })
};
