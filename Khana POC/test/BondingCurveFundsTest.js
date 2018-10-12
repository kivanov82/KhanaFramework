const truffleAssert = require('truffle-assertions');
const BN = web3.utils.BN;
var BondingCurveFunds = artifacts.require("./BondingCurveFunds.sol");
var KhanaToken = artifacts.require("./KhanaToken.sol");

contract('BondingCurveFunds', function(accounts) {
    const owner = accounts[0];
    const alice = accounts[1];
    const bob = accounts[2];
    var bobBalance = 0;

    let fundsContract;
    let khana;

    beforeEach('setup contract for each test', async () => {
        fundsContract = await BondingCurveFunds.deployed();
    });

    it("should not be able to send ETH out of contract by calling directly", async () => {
        const ethInContract = web3.eth.getBalance(fundsContract.address);

        let error
        try {
            await fundsContract.sendEth(ethInContract, owner, {from: owner});
        } catch (err) {
            error = err;
        }

        assert(error, "Expected error but did not get one");
    });

    it("should not be able to change 'token contract'", async () => {

        let error
        try {
            await fundsContract.setTokenContract(alice, {from: alice});
        } catch (err) {
            error = err;
        }

        assert(error, "Expected error when non owner tries to change token address, but did not get one");
    });

    it("should be able to change 'token contract' (as owner)", async () => {
        khana = await KhanaToken.deployed();

        let tx = await fundsContract.setTokenContract(alice, {from: owner});
        truffleAssert.eventEmitted(tx, 'LogTokenContractChanged', (ev) => {
            const expectedEventResult = {fromAccount: owner, oldAddress: khana.address, newAddress: alice};

            const logFromAccount = ev.fromAccount;
            const logOldAddress = ev.oldAddress;
            const logNewAddress = ev.newAddress;

            assert.equal(expectedEventResult.fromAccount, logFromAccount, "LogTokenContractChanged event fromAccount property not emitted correctly, check award method");
            assert.equal(expectedEventResult.oldAddress, logOldAddress, "LogTokenContractChanged event oldAddress property not emitted correctly, check award method");
            assert.equal(expectedEventResult.newAddress, logNewAddress, "LogTokenContractChanged event newAddress property not emitted correctly, check award method");
            return true;
        });

    });

    it("should not be able to change contract state (emergency stop)", async () => {
        let tx = await fundsContract.emergencyStop({from: owner});
        truffleAssert.eventEmitted(tx, 'LogContractDisabled', (ev) => {
            return true;
        }, "Emergency stop event event incorrectly emitted");

        // Try to change contract state

        let error
        try {
            await fundsContract.setTokenContract(fundsContract.address, {from: owner});
        } catch (err) {
            error = err;
        }

        assert(error, "Expected error but did not get one");
    });

    it("should be able to change contract state (resume contract)", async () => {
        let tx = await fundsContract.resumeContract({from: owner});
        truffleAssert.eventEmitted(tx, 'LogContractEnabled', (ev) => {
            return true;
        }, "Contract enabling event incorrectly emitted");

        // Try to change contract state
        khana = await KhanaToken.deployed();

        try {
            await fundsContract.setTokenContract(khana.address, {from: owner});
        } catch (err) {
            assert(err, "Expected no error to be received");
        }

        const tokenAddress = await fundsContract.getTokenAddress();
        assert.equal(tokenAddress, khana.address, "Token address did not change to the correct address");
    });

})
