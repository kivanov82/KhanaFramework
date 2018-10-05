import React, { Component } from 'react'
import ipfs from '../utils/ipfs';

import Grid from '@material-ui/core/Grid';
import Button from '@material-ui/core/Button';

class Admin extends Component {

    awardTokens = (event) => {
        event.preventDefault();
        document.getElementById("awardButton").disabled = true;

        let web3 = this.props.state.web3

        // Set state
        let address = event.target.address.value
        let amount = web3.toWei(event.target.amount.value, 'ether')
        let reason = event.target.reason.value

        if (address.length === 0 || amount.length === 0 || reason.length === 0) {
            this.props.updateState('All details must be filled in to award tokens')
            return
        }

        this.props.updateLoadingMessage('Processing')

        let getIpfsFile = new Promise((ipfsResult) => {
            let latestIpfsHash = this.props.state.contract.latestIpfsHash
            let newContents = { "timeStamp": + Date.now(), "toAddress": address, "fromAddress": this.props.state.user.accounts[0], "amount": amount, "reason": reason }

            // If there is no existing hash, then we are running for first time and need to create log file on IPFS
            if (!latestIpfsHash) {
                let ipfsContent = {
                    path: '/' + this.props.state.contract.tokenName,
                    content: Buffer.from('[ ' + JSON.stringify(newContents) + ' ]')
                }

                this.props.updateLoadingMessage('Creating inital IPFS file (may take a while)...')

                // Write description to IPFS, return hash
                ipfsResult(ipfs.add(ipfsContent))
            } else {
                // Get most recent version of logs first
                ipfs.files.cat('/ipfs/' + this.props.state.contract.latestIpfsHash).then((file) => {

                    // Parse the history as JSON, then add an entry to the start of array
                    let auditHistory = JSON.parse(file.toString('utf8'))
                    auditHistory.unshift(newContents)

                    //Set up IPFS details
                    let ipfsContent = {
                        path: '/' + this.props.state.contract.tokenName,
                        content: Buffer.from(JSON.stringify(auditHistory))
                    }

                    this.props.updateLoadingMessage('Adding details to IPFS file (may take a while)...')

                    // Write description to IPFS, return hash
                    ipfsResult(ipfs.add(ipfsContent))
                })
            }
        })

        getIpfsFile.then((ipfsResult) => {

            // Then store the recent tx and record on blockchain (and events log)
            let ipfsHash = ipfsResult[0].hash
            this.props.updateLoadingMessage('Entry added to IPFS audit file successfully (with IPFS hash: ' + ipfsHash + '). Please confirm the ethereum transaction via your MetaMask wallet and wait for it to confirm.')

            // Make contract changes
            let khanaTokenInstance = this.props.state.contract.instance
            let accounts = this.props.state.user.accounts

            khanaTokenInstance.award(address, amount, ipfsHash, { from: accounts[0], gas: 100000, gasPrice: web3.toWei(5, 'gwei') }).then((txResult) => {

                this.props.updateLoadingMessage('Waiting for transaction to confirm...')

                let awardedEvent = khanaTokenInstance.LogAwarded({ fromBlock: 'latest' }, (err, response) => {

                    // Ensure we're not detecting old events in previous (i.e. the current) block. This bug is more relevant to dev environment where all recent blocks could be emitting this event, causing bugs.
                    if (response.blockNumber >= txResult.receipt.blockNumber) {

                        // Update latest ipfsHash and history
                        let contractState = this.props.state.contract
                        contractState.latestIpfsHash = ipfsHash
                        contractState.ipfsLogHistory.push({
                            blockNumber: response.blockNumber,
                            minter: response.args.minter,
                            awardedTo: response.args.awardedTo,
                            amount: (web3.fromWei(response.args.amount, 'ether')).toString(10),
                            ipfsHash: response.args.ipfsHash,
                            ethTxHash: response.transactionHash
                        })

                        this.setState({ contract: contractState })
                        this.props.updateState('Transaction confirmed with hash: ' + response.transactionHash);

                        awardedEvent.stopWatching()
                    }
                })
            }).catch((error) => {
                this.props.updateState(error.message)
            })
        }).catch((error) => {
            this.props.updateState(error.message)
        })
    }

    burnTokens = async(event) => {
        event.preventDefault();
        document.getElementById("burnTokens").disabled = true;

        let web3 = this.props.state.web3

        // Set state
        let address = event.target.address.value
        let amount = web3.toWei(event.target.amount.value, 'ether')

        let khanaTokenInstance = this.props.state.contract.instance
        let accounts = this.props.state.user.accounts

        khanaTokenInstance.burn(address, amount, { from: accounts[0], gas: 100000, gasPrice: web3.toWei(5, 'gwei') }).then((txResult) => {

            this.props.updateLoadingMessage('Waiting for transaction to confirm...')

            let burnEvent = khanaTokenInstance.LogBurned({ fromBlock: 'latest' }, (err, response) => {

                // Ensure we're not detecting old events in previous (i.e. the current) block. This bug is more relevant to dev environment where all recent blocks could be emitting this event, causing bugs.
                if (response.blockNumber >= txResult.receipt.blockNumber) {
                    this.props.updateState('Transaction confirmed with hash: ' + response.transactionHash);
                    burnEvent.stopWatching()
                }
            })
        }).catch((error) => {
            this.props.updateState(error.message)
        })
    }

    checkAdmin = async (event) => {
        event.preventDefault();
        this.props.updateLoadingMessage('Checking if address is an admin...')

        let khanaTokenInstance = this.props.state.contract.instance
        khanaTokenInstance.checkIfAdmin(event.target.address.value).then((isAdmin) => {
            this.props.updateState('User ' + (isAdmin ? 'is ' : 'is not ') + 'an admin')
        }).catch((error) => {
            this.props.updateState(error.message)
        })
    }

    addAdmin = async (event) => {
        event.preventDefault();
        this.props.updateLoadingMessage('Adding user as an admin...')

        let khanaTokenInstance = this.props.state.contract.instance
        let accounts = this.props.state.user.accounts
        khanaTokenInstance.addAdmin(event.target.address.value, { from: accounts[0], gas: 100000, gasPrice: this.props.state.web3.toWei(5, 'gwei') }).then(() => {
            this.props.updateLoadingMessage('Waiting for transaction to confirm')

            let addedEvent = khanaTokenInstance.LogAdminAdded({ fromBlock: 'latest' }, (err, response) => {
                this.props.updateState('User added as an admin');
                addedEvent.stopWatching();
            })
        }).catch((error) => {
            this.props.updateState(error.message)
        })
    }

    removeAdmin = async (event) => {
        event.preventDefault()
        this.props.updateLoadingMessage('Removing user as an admin...')

        let khanaTokenInstance = this.props.state.contract.instance
        let accounts = this.props.state.user.accounts
        khanaTokenInstance.removeAdmin(event.target.address.value, { from: accounts[0], gas: 100000, gasPrice: this.props.state.web3.toWei(5, 'gwei') }).then(() => {
            this.props.updateLoadingMessage('Waiting for transaction to confirm')

            let removedEvent = khanaTokenInstance.LogAdminRemoved({ fromBlock: 'latest' }, (err, response) => {
                this.props.updateState('User removed as an admin');
                removedEvent.stopWatching();
            })
        }).catch((error) => {
            this.props.updateState(error.message)
        })
    }

    tokenEmergencyStop = async () => {
        event.preventDefault();
        this.props.updateLoadingMessage('Processing emergency stop...')

        let khanaTokenInstance = this.props.state.contract.instance
        let accounts = this.props.state.user.accounts

        khanaTokenInstance.emergencyStop({ from: accounts[0], gas: 100000, gasPrice: this.props.state.web3.toWei(5, 'gwei') }).then((success) => {
            this.props.updateLoadingMessage('Waiting for transaction to confirm...')

            let disabledEvent = khanaTokenInstance.LogContractDisabled({ fromBlock: 'latest' }, (err, response) => {
                this.props.updateState('Emergency stop activated');
                disabledEvent.stopWatching();
            })
        }).catch((error) => {
            this.props.updateState(error.message)
        })
    }

    tokenResumeContract = async () => {
        event.preventDefault();
        this.props.updateLoadingMessage('Re-enabling token minting...')

        let khanaTokenInstance = this.props.state.contract.instance
        let accounts = this.props.state.user.accounts

        khanaTokenInstance.resumeContract({ from: accounts[0], gas: 100000, gasPrice: this.props.state.web3.toWei(5, 'gwei') }).then((success) => {
            this.props.updateLoadingMessage('Waiting for transaction to confirm...')

            let enabledEvent = khanaTokenInstance.LogContractEnabled({ fromBlock: 'latest' }, (err, response) => {
                this.props.updateState('Contract reenabled');
                enabledEvent.stopWatching();
            })
        }).catch((error) => {
            this.props.updateState(error.message)
        })
    }

    render() {
        return (
            <Grid container>
                <Grid item md>
                    <Grid container justify="left">
                        <Grid key={0} item>
                            <h4>Token actions</h4>
                            <p><b>Award</b> tokens to community members for their contributions and participation.</p>
                            {/* TODO: - form validation */}
                            <form onSubmit={this.awardTokens} id="awardTokens">
                                <label> Address: <input type="text" name="address" /></label><br />
                                <label> Amount: <input type="number" name="amount" /></label><br />
                                <label> Reason: <input type="text" name="reason" /></label><br />
                                <Button variant="outlined" color="primary" size="small" type="submit" id="awardButton">Award</Button>
                            </form>
                        </Grid>
                    </Grid>

                    <Grid container justify="left">
                        <Grid key={0} item>
                            <p><b>Burn</b> tokens belonging to community members.</p>
                            <form onSubmit={this.burnTokens} id="burnTokens">
                                <label> Address: <input type="text" name="address" /></label><br />
                                <label> Amount: <input type="number" name="amount" /></label><br />
                                <Button variant="outlined" color="primary" size="small" type="submit" id="burnTokens">Burn</Button>
                            </form>
                        </Grid>
                    </Grid>
                    <Grid container justify="left">
                        <Grid key={0} item>
                            <h4>Admin Tools</h4>

                            <form onSubmit={this.checkAdmin} id="checkAdmin">
                                <label> <b>Check</b> if address is admin: <input type="text" name="address" /></label><br />
                                <Button variant="outlined" color="primary" size="small" type="submit">Check</Button>
                            </form>
                            <br />

                            <form onSubmit={this.addAdmin} id="addAdmin">
                                <label> <b>Add</b> address as admin: <input type="text" name="address" /></label><br />
                                <Button variant="outlined" color="primary" size="small" type="submit">Add Admin</Button>
                            </form>
                            <br />

                            <form onSubmit={this.removeAdmin}>
                                <label> <b>Remove</b> address as admin: <input type="text" name="address" /></label><br />
                                <Button variant="outlined" color="primary" size="small" type="submit">Remove Admin</Button>
                            </form>

                            <p></p>

                            {this.props.state.contract.contractEnabled ? (
                                <Button variant="contained" color="primary" onClick={this.tokenEmergencyStop}> Activate Emergency Stop </Button>
                            ) : (
                                    <Button variant="contained" color="primary" onClick={this.tokenResumeContract}> Re-enable Contract </Button>
                                )}
                        </Grid>
                    </Grid>
                </Grid>
            </Grid>
        )
    }
}

export default Admin;



