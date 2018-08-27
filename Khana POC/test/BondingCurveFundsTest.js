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
        await fundsContract.setTokenContract(alice, {from: owner});
        const tokenContractChanged = await fundsContract.LogTokenContractChanged();
        const logs = await new Promise ((resolve, reject) => {
            tokenContractChanged.watch((error, log) => { resolve(log);});
        })

        khana = await KhanaToken.deployed();
        const expectedEventResult = {fromAccount: owner, oldAddress: khana.address, newAddress: alice};

        const logFromAccount = logs.args.fromAccount;
        const logOldAddress = logs.args.oldAddress;
        const logNewAddress = logs.args.newAddress;

        assert.equal(expectedEventResult.fromAccount, logFromAccount, "LogTokenContractChanged event fromAccount property not emitted correctly, check award method");
        assert.equal(expectedEventResult.oldAddress, logOldAddress, "LogTokenContractChanged event oldAddress property not emitted correctly, check award method");
        assert.equal(expectedEventResult.newAddress, logNewAddress, "LogTokenContractChanged event newAddress property not emitted correctly, check award method");
    });

    it("should not be able to change contract state (emergency stop)", async () => {
        await fundsContract.emergencyStop({from: owner});
        const ContractDisabled = await fundsContract.LogContractDisabled();
        const log = await new Promise((resolve, reject) => {
            ContractDisabled.watch((error, log) => { resolve(log);});
        });

        assert.equal(log.event, 'LogContractDisabled', "Emergency stop event event incorrectly emitted");

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
        await fundsContract.resumeContract({from: owner});
        const ContractEnabled = await fundsContract.LogContractEnabled();
        const log = await new Promise((resolve, reject) => {
            ContractEnabled.watch((error, log) => { resolve(log);});
        });

        assert.equal(log.event, 'LogContractEnabled', "Contract enabling event incorrectly emitted");

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
