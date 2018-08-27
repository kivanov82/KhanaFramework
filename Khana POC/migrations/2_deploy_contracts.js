var KhanaToken = artifacts.require("KhanaToken");

module.exports = function(deployer, network, accounts) {
  deployer.deploy(KhanaToken).then((result) => {

      // Fund the bonding curve with 'amountOfEthToFund' when deploying in development environment
      let amountOfEthToFund = 20

      if (network == 'develop') {
          let khanaInstance = KhanaToken.at(KhanaToken.address)
          khanaInstance.sendTransaction({from: accounts[0], value: web3.toWei(amountOfEthToFund, 'ether')}).then((result) => {
              console.log('Funding contract bonding curve...')
              console.log('  ... funded with ' + amountOfEthToFund + ' ETH successfully')
          }).catch((error) => {
              console.log('Funding contract bonding curve...')
              console.log('  ... error with funding occured: ' + error.message)
          })
      }
  });
};
