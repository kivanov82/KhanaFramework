var BlockDamToken = artifacts.require("BlockDamToken");
var BlockDamBondingCurveFunds = artifacts.require('BlockDamBondingCurveFunds');

module.exports = function(deployer, network, accounts) {
    let bcdInstance
    let bcdBondingFundsInstance

    console.log('  === Deploying BlockDam contracts...')

    deployer.deploy(BlockDamToken).then((result) => {
        bcdInstance = result

        return deployer.deploy(BlockDamBondingCurveFunds, BlockDamToken.address)
    })
    .then((result) => {
        bcdBondingFundsInstance = result

        return bcdInstance.setFundsContract(BlockDamBondingCurveFunds.address, {from: accounts[0]})
    })
    .then((result) => {

        // Fund the bonding curve with 'amountOfEthToFund' when deploying in development environment
        let amountOfEthToFund = "2"

        // Truffle calls it 'develop', ganache calls it 'development'
        if (network == 'develop' || network == 'development' || network == 'test') {
            bcdBondingFundsInstance.sendTransaction({from: accounts[9], value: web3.toWei(amountOfEthToFund, 'ether')}).then((result) => {
                console.log('Funding contract bonding curve...')
                console.log('  ... funded with ' + amountOfEthToFund + ' ETH successfully')
            }).catch((error) => {
                console.log('Funding contract bonding curve...')
                console.log('  ... error with funding occured: ' + error.message)
            })
        }
    })
};
