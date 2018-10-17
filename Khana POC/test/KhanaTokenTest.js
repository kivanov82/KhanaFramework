const truffleAssert = require('truffle-assertions');
const BN = web3.utils.BN;
var KhanaToken = artifacts.require("./KhanaToken.sol");
var BondingCurveFunds = artifacts.require("./BondingCurveFunds.sol");

contract('KhanaToken', function(accounts) {
    const owner = accounts[0];
    const alice = accounts[1];
    const bob = accounts[2];
    var bobBalance = 0;

    let khana;
    let fundsContract;

    beforeEach('setup contract for each test', async () => {
        khana = await KhanaToken.deployed();
    });

    it("should not yet be admin", async () => {
        const aliceNotAdmin = await khana.checkIfAdmin(alice);
        assert.equal(aliceNotAdmin, false, 'user should not be an admin');
    });

    it("should be able to set new admin (as owner)", async () => {
        let tx = await khana.addAdmin(alice, {from: owner});
        truffleAssert.eventEmitted(tx, 'LogAdminAdded', (ev) => {
            return ev.account === alice;
        }, "AdminAdded event account address incorrectly emitted");

        const aliceIsAdmin = await khana.checkIfAdmin(alice);
        assert.equal(aliceIsAdmin, true, 'user should be an admin');
    });

    it("should be able to award new tokens (as owner)", async () => {
        bobBalance += 10000000000000000000
        let tx = await khana.award(bob, 10000000000000000000, "ipfsHash_placeholder", {from: owner});
        truffleAssert.eventEmitted(tx, 'LogAwarded', (ev) => {
            const expectedEventResult = {awardedTo: bob, minter: owner, amount: 10000000000000000000, ipfsHash: "ipfsHash_placeholder"};

            const logAccountAddress = ev.awardedTo;
            const logMinterAddress = ev.minter;
            const logAmount = ev.amount.toString();
            const logIpfsHash = ev.ipfsHash;

            assert.equal(expectedEventResult.awardedTo, logAccountAddress, "Awarded event awardedTo property not emitted correctly, check award method");
            assert.equal(expectedEventResult.minter, logMinterAddress, "Awarded event minter property not emitted correctly, check award method");
            assert.equal(expectedEventResult.amount, logAmount, "Awarded event amount property not emitted correctly, check award method");
            assert.equal(expectedEventResult.ipfsHash, logIpfsHash, "Awarded event ipfsHash property not emitted correctly, check award method");
            return true;
        });

    });

    it("should be able to award new tokens (as new admin)", async () => {
        bobBalance += 10000000000000000000
        let tx = await khana.award(bob, 10000000000000000000, "ipfsHash_placeholder", {from: alice});
        truffleAssert.eventEmitted(tx, 'LogAwarded', (ev) => {
            const expectedEventResult = {awardedTo: bob, minter: alice, amount: 10000000000000000000, ipfsHash: "ipfsHash_placeholder"};

            const logAccountAddress = ev.awardedTo;
            const logMinterAddress = ev.minter;
            const logAmount = ev.amount.toString();
            const logIpfsHash = ev.ipfsHash;

            assert.equal(expectedEventResult.awardedTo, logAccountAddress, "Awarded event awardedTo property not emitted correctly, check award method");
            assert.equal(expectedEventResult.minter, logMinterAddress, "Awarded event minter property not emitted correctly, check award method");
            assert.equal(expectedEventResult.amount, logAmount, "Awarded event amount property not emitted correctly, check award method");
            assert.equal(expectedEventResult.ipfsHash, logIpfsHash, "Awarded event ipfsHash property not emitted correctly, check award method");
            return true;
        });



    });

    it("should be able to set new admin (as new admin)", async () => {
        let tx =  await khana.addAdmin(bob, {from: alice});
        truffleAssert.eventEmitted(tx, 'LogAdminAdded', (ev) => {
            assert.equal(ev.account, bob, "AdminAdded event account address incorrectly emitted");
            return true;
        });

        const bobIsAdmin = await khana.checkIfAdmin(bob);
        assert.equal(bobIsAdmin, true, 'user should be an admin');
    });

    it("should be able to remove admin (as new admin)", async () => {
        let tx =   await khana.removeAdmin(bob, {from: alice});
        truffleAssert.eventEmitted(tx, 'LogAdminRemoved', (ev) => {
            assert.equal(ev.account, bob, "AdminRemoved event account address incorrectly emitted");
            return true;
        });

        const bobIsNotAdmin = await khana.checkIfAdmin(bob);
        assert.equal(bobIsNotAdmin, false, 'user should not be an admin');
    });

    it("should not be able to remove original owner (as new admin)", async () => {
        let revertError;
        try {
            await khana.removeAdmin(owner, {from: alice});
        } catch (error) {
            revertError = error;
        }
        assert(revertError, "Expected error but did not get one");
    });

    it("should not be able to award any more tokens (emergency stop)", async () => {
        let tx = await khana.emergencyStop({from: owner});
        truffleAssert.eventEmitted(tx, 'LogContractDisabled', (ev) => {
            return true;
        }, "Emergency stop event event incorrectly emitted");

        // Try to award Bob tokens

        let revertError;
        try {
            await khana.award(bob, 100, "ipfsHash_placeholder", {from: owner});
        } catch (error) {
            revertError = error;
        }

        assert(revertError, "Expected error but did not get one");
    });

    it("should not be able to sell any more tokens (emergency stop)", async () => {
        let revertError;
        try {
            await khana.sell(100, {from: bob});
        } catch (error) {
            revertError = error;
        }

        assert(revertError, "Expected error but did not get one");
    });

    it("should not be able to call functions of funds contract (when in emergency stop)", async () => {
        fundsContract = await BondingCurveFunds.deployed();

        let revertError;
        try {
            await fundsContract.setTokenContract(alice, {from: owner});
        } catch (error) {
            revertError = error;
        }

        assert(revertError, "Expected error but did not get one");
    });

    it("should be able restore awarding of tokens (contract enabled)", async () => {
        let tx = await khana.resumeContract({from: owner});
        truffleAssert.eventEmitted(tx, 'LogContractEnabled', (ev) => {
            return true;
        }, "Resume contract event incorrectly emitted");

        // Now award the tokens to Bob

        bobBalance += 10000000000000000000
        let awardTx = await khana.award(bob, 10000000000000000000, "ipfsHash_placeholder", {from: owner});
        truffleAssert.eventEmitted(awardTx, 'LogAwarded', (ev) => {
            const expectedEventResult = {awardedTo: bob, minter: owner, amount: 10000000000000000000, ipfsHash: "ipfsHash_placeholder"};

            const logAccountAddress = ev.awardedTo;
            const logMinterAddress = ev.minter;
            const logAmount = ev.amount.toString();
            const logIpfsHash = ev.ipfsHash;

            assert.equal(expectedEventResult.awardedTo, logAccountAddress, "Awarded event awardedTo property not emitted correctly, check award method");
            assert.equal(expectedEventResult.minter, logMinterAddress, "Awarded event minter property not emitted correctly, check award method");
            assert.equal(expectedEventResult.amount, logAmount, "Awarded event amount property not emitted correctly, check award method");
            assert.equal(expectedEventResult.ipfsHash, logIpfsHash, "Awarded event ipfsHash property not emitted correctly, check award method");
            return true;
        });

    });

    it("should be able to fund bonding curve by sending ETH (contract enabled)", async () => {
        let tx = await khana.resumeContract({from: owner});
        truffleAssert.eventEmitted(tx, 'LogContractEnabled', (ev) => {
            return true;
        }, "Resume contract event incorrectly emitted");

        // Fund the contract with 10 ETH (this should forward to the funding contract)
        let fundingTx = await khana.sendTransaction({from: owner, value: 10000000000000000000});

        fundsContract = await BondingCurveFunds.deployed();

        //event from 'nested' tx
        let nestedFundingReceivedEvent = (await truffleAssert.createTransactionResult(fundsContract, fundingTx.tx)).logs[0].returnValues;

        const expectedEventResult = {account: khana.address, amount: 10000000000000000000};

        const logAccountAddress = nestedFundingReceivedEvent.account;
        const logAmount = nestedFundingReceivedEvent.amount;

        assert.equal(expectedEventResult.account, logAccountAddress, "Funding received event account property not emitted correctly, check award method");
        assert.equal(expectedEventResult.amount, logAmount, "Funding received event amount property not emitted correctly, check award method");

    });

    it("should be able to sell tokens (contract enabled)", async () => {
        fundsContract = await BondingCurveFunds.deployed();

        // Work out how much ETH we should get in return
        const amountToSell = new BN(web3.utils.toWei("1", "ether")); //=1 KHNA
        const totalSupply = new BN(await khana.getSupply()); //=30 KHNA
        const ethInContract = new BN(await web3.eth.getBalance(fundsContract.address)); //=X ETH

        const multiplier = new BN(web3.utils.toWei("1", "ether")); //10*18

        const stakeToSell = amountToSell.mul(multiplier).div(totalSupply); // = in 0.01 percents, 10*18 multiplied
        const expectedEthReturn = stakeToSell.mul(ethInContract.div(new BN(2))).div(multiplier); //stake applied to a half of funds

        bobBalance -= amountToSell;
        let sellTx = await khana.sell(amountToSell, {from: bob});

        truffleAssert.eventEmitted(sellTx, 'LogSell', (ev) => {
            const expectedEventResult = {sellingAccount: bob, sellAmount: amountToSell, ethReceived: expectedEthReturn.toString()};

            const logSellingAccount = ev.sellingAccount;
            const logSellAmount = ev.sellAmount.toString();
            const logEthReturned = ev.ethReceived.toString();

            assert.equal(expectedEventResult.sellingAccount, logSellingAccount, "Sell event sellingAccount property not emitted correctly, check Sell method");
            assert.equal(expectedEventResult.sellAmount, logSellAmount, "Sell event sellAmount property not emitted correctly, check Sell method");
            assert.equal(expectedEventResult.ethReceived, logEthReturned, "Sell event ethReceived property not emitted correctly, check Sell method");
            return true;
        });


    });

    it("should be able to remove admin (as owner)", async () => {
        let tx = await khana.removeAdmin(alice, {from: owner});
        truffleAssert.eventEmitted(tx, 'LogAdminRemoved', (ev) => {
            assert.equal(ev.account, alice, "AdminRemoved event account address incorrectly emitted");
            return true;
        });

        const aliceIsNotAdmin = await khana.checkIfAdmin(alice);
        assert.equal(aliceIsNotAdmin, false, 'user should not be an admin');
    });

    it("should be able to check supply accurately", async () => {
        const supply = (await khana.getSupply()).toNumber();
        const initialSupply = 0;

        const expectedSupply = bobBalance + initialSupply;
        assert.equal(supply, expectedSupply, "token supply did not return the expected result");
    });

    it("should be able to burn tokens (as owner)", async () => {
        let tx = await khana.burn(bob, bobBalance, {from: owner});
        truffleAssert.eventEmitted(tx, 'LogBurned', (ev) => {
            const expectedEventResult = { burnFrom: bob, amount: bobBalance }

            const logBurnFromAddress = ev.burnFrom;
            const logAmount = ev.amount.toString();

            assert.equal(expectedEventResult.burnFrom, logBurnFromAddress, "Burn event from property not emitted correctly, check burn method");
            assert.equal(expectedEventResult.amount, logAmount, "Burn event value property not emitted correctly, check burn method");
            return true;
        });


        // balanceOf function is inherited from StandardToken.sol
        const bobsNewBalance = (await khana.balanceOf(bob)).toString();
        assert.equal(bobsNewBalance, "0", "user should not have any tokens remaining");
    });

    it("should be able to award in a bulk", async () => {
        let addresses = [];
        let singleAwardsGas = 0;
        const numAwards = 10;
        for (i = 0; i < numAwards; i++) {
            addresses.push(bob);
            let tx = await khana.award(bob, web3.utils.toWei("10", "szabo"), "ipfsHash_placeholder");
            let receipt = await web3.eth.getTransactionReceipt(tx.tx);
            singleAwardsGas = singleAwardsGas + receipt.gasUsed;
        }
        let tx = await khana.awardBulk(addresses, web3.utils.toWei("10", "szabo"), "ipfsHash_placeholder");
        let receipt = await web3.eth.getTransactionReceipt(tx.tx);
        let bulkAwardsGas = receipt.gasUsed;
        console.log(`Bulk is ${singleAwardsGas/bulkAwardsGas} times more gas-efficient for ${numAwards} awards`);

        truffleAssert.eventNotEmitted(tx, 'LogBulkAwardedFailure');

        truffleAssert.eventEmitted(tx, 'LogAwarded', (ev) => {
            return true;
        });

        truffleAssert.eventEmitted(tx, 'LogBulkAwardedSummary', (ev) => {
            assert.equal(numAwards, ev.bulkCount.toString(), "Hmm not everyone was awarded in bulk")
            return true;
        });

    });

})
