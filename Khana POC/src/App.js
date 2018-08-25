import React, { Component } from 'react'
import KhanaToken from '../build/contracts/KhanaToken.json'
import getWeb3 from './utils/getWeb3'
import ipfs from './utils/ipfs';

import './css/oswald.css'
import './css/open-sans.css'
import './css/pure-min.css'
import './App.css'

class App extends Component {

    constructor(props) {
        super(props)

        this.state = {
            web3: null,
            contract: {
                instance: null,
                tokenName: '',
                tokenSymbol: '',
                totalSupply: 0,
                mintingEnabled: null,
                latestIpfsHash: null,
                ipfsLogHistory: [{
                    blockNumber: 0,
                    minter: null,
                    awardedTo: null,
                    amount: 0,
                    ipfsHash: '',
                    ethTxHash: '',
                    reason: ''
                }]
            },
            user: {
                accounts: null,
                currentAddress: null,
                tokenBalance: 0,
                isAdmin: false
            },
            app: {
                status:'waiting...',
                isLoading: false,
            }
        }
    }

    componentWillMount() {
        // Get network provider and web3 instance.
        // See utils/getWeb3 for more info.

        getWeb3
        .then(results => {
            this.setState({
                web3: results.web3
            })

            // Instantiate contract once web3 provided.
            this.instantiateContract()
        })
        .catch(() => {
            console.log('Error finding web3.')
        })
    }

    instantiateContract() {
        const contract = require('truffle-contract')
        const khanaToken = contract(KhanaToken)
        khanaToken.setProvider(this.state.web3.currentProvider)
        var contractInstance;
        var name;
        var symbol;

        this.setState({app: { status: 'Loading from blockchain', isLoading: true}})

        this.state.web3.eth.getAccounts((error, accounts) => {
            khanaToken.deployed().then((khanaInstance) => {
                contractInstance = khanaInstance
            }).then(() => {
                return contractInstance.name()
            }).then((instanceName) => {
                name = instanceName
            }).then(() => {
                return contractInstance.symbol()
            }).then((instanceSymbol) => {
                symbol = instanceSymbol
            }).then(() => {
                return contractInstance.checkIfAdmin.call(accounts[0])
            }).then((isAdmin) => {

                let awardEventsAll = contractInstance.Awarded({}, {
                    fromBlock: 0,
                    toBlock: 'latest'
                })

                awardEventsAll.get((err, result) => {

                    if (error) {
                        // TODO: - do something
                    }

                    let logHistory = result.map((log) => {
                        return {
                            blockNumber: log.blockNumber,
                            minter: log.args.minter,
                            awardedTo: log.args.awardedTo,
                            amount: (this.state.web3.fromWei(log.args.amount, 'ether')).toString(10),
                            ipfsHash: log.args.ipfsHash,
                            ethTxHash: log.transactionHash
                        }
                    })

                    let ipfsEventLogged = result[result.length - 1]

                    // Get latest IPFS hash if it exists

                    if (ipfsEventLogged != null) {
                        this.setState({
                            contract: {
                                instance: contractInstance,
                                tokenName: name,
                                tokenSymbol: symbol,
                                latestIpfsHash: ipfsEventLogged.args.ipfsHash,
                                ipfsLogHistory: logHistory
                            },
                            user: {
                                accounts: accounts,
                                isAdmin: isAdmin
                            }
                        })
                    } else {

                        // No IPFS hash exists (i.e. we're just setting up the contract)
                        this.setState({
                            contract: {
                                instance: contractInstance,
                                tokenName: name,
                                tokenSymbol: symbol,
                                ipfsLogHistory: []
                            },
                            user: {
                                accounts: accounts,
                                isAdmin: isAdmin
                            }
                        })
                    }
                    this.updateState();
                })
            })
        })
    }

    updateState = async (message) => {
        let web3 = this.state.web3
        let khanaTokenInstance = this.state.contract.instance
        let accounts = this.state.user.accounts
        var supply
        var balance

        khanaTokenInstance.getSupply.call().then((newSupply) => {
            supply = (web3.fromWei(newSupply, 'ether')).toString(10);
            return khanaTokenInstance.balanceOf(accounts[0])
        }).then((newBalance) => {
            balance = (web3.fromWei(newBalance, 'ether')).toString(10);
            return khanaTokenInstance.mintingFinished()
        }).then((mintingDisabled) => {
            let state = this.state
            state.contract.totalSupply = supply
            state.contract.mintingEnabled = !mintingDisabled
            state.user.currentAddress = accounts[0]
            state.user.tokenBalance = balance
            state.app.status = message ? message : ''
            state.app.isLoading = false

            return this.setState(state)
        })

        document.getElementById("awardButton").disabled = false;
    }

    updateLoadingMessage = async(message) => {
        let appState = this.state.app
        appState.status = message
        appState.isLoading = true
        this.setState({ app: appState })
    }

    awardTokens =(event) => {
        event.preventDefault();
        document.getElementById("awardButton").disabled = true;

        let web3 = this.state.web3

        // Set state
        let address = event.target.address.value
        let amount = web3.toWei(event.target.amount.value, 'ether')
        let reason = event.target.reason.value

        if (address.length === 0 || amount.length === 0 || reason.length === 0) {
            this.updateState('All details must be filled in to award tokens')
            return
        }

        this.updateLoadingMessage('Processing')

        let getIpfsFile = new Promise((ipfsResult) => {
            let latestIpfsHash = this.state.contract.latestIpfsHash
            // If there is no existing hash, then we are running for first time and need to create log file on IPFS
            if (!latestIpfsHash) {
                //Set up IPFS details
                let newContents = Date.now() + ', ' + address + ', ' + amount + ', ' + reason

                let ipfsContent = {
                    path: '/' + this.state.contract.tokenName,
                    content: Buffer.from(newContents)
                }

                this.updateLoadingMessage('Creating inital IPFS file (may take a while)...')

                // Write description to IPFS, return hash
                ipfsResult(ipfs.add(ipfsContent))
            } else {
                // Get most recent version of logs first
                ipfs.files.cat('/ipfs/' + this.state.contract.latestIpfsHash).then((file) => {
                    let previousContents = file.toString('utf8');
                    let newContents = Date.now() + ', ' + address + ', ' + amount + ', ' + reason + '\n' + previousContents

                    //Set up IPFS details
                    let ipfsContent = {
                        path: '/' + this.state.contract.tokenName,
                        content: Buffer.from(newContents)
                    }

                    this.updateLoadingMessage('Adding details to IPFS file (may take a while)...')

                    // Write description to IPFS, return hash
                    ipfsResult(ipfs.add(ipfsContent))
                })
            }
        })

        getIpfsFile.then((ipfsResult) => {

            // Then store the recent tx and record on blockchain (and events log)
            let ipfsHash = ipfsResult[0].hash
            this.updateLoadingMessage('Entry added to IPFS file successfully (with IPFS hash: ' + ipfsHash + '). Now adding IPFS hash permanently to minting transaction on ethereum...')

            // Make contract changes
            let khanaTokenInstance = this.state.contract.instance
            let accounts = this.state.user.accounts

            khanaTokenInstance.award(address, amount, ipfsHash, {from: accounts[0]}).then((txResult) => {

                this.updateLoadingMessage('Waiting for transaction to confirm...')

                let awardedEvent = khanaTokenInstance.Awarded({fromBlock: 'latest'}, (err, response) => {

                    // Ensure we're not detecting old events in previous (i.e. the current) block. This bug is more relevant to dev environment where all recent blocks could be emitting this event, causing bugs.
                    if (response.blockNumber >= txResult.receipt.blockNumber) {

                        // Update latest ipfsHash and history
                        let contractState = this.state.contract
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
                        this.updateState('Transaction confirmed with hash: ' + response.transactionHash);

                        awardedEvent.stopWatching()
                    }
                })
            })
        })
    }

    tokenEmergencyStop = async () => {
        event.preventDefault();
        this.updateLoadingMessage('Processing emergency stop...')

        let khanaTokenInstance = this.state.contract.instance
        let accounts = this.state.user.accounts

        khanaTokenInstance.emergencyStop({from: accounts[0]}).then((success) => {
            this.updateLoadingMessage('Waiting for transaction to confirm...')

            khanaTokenInstance.MintFinished({fromBlock: 'latest'}, (err, response) => {
                this.updateState('Emergency stop activated');
            })
        })
    }

    tokenEnableMinting = async () => {
        event.preventDefault();
        this.updateLoadingMessage('Re-enabling token minting...')

        let khanaTokenInstance = this.state.contract.instance
        let accounts = this.state.user.accounts

        khanaTokenInstance.resumeMinting({from: accounts[0]}).then((success) => {
            this.updateLoadingMessage('Waiting for transaction to confirm...')

            khanaTokenInstance.MintingEnabled({fromBlock: 'latest'}, (err, response) => {
                this.updateState('Minting reenabled');
            })
        })
    }

    checkAdmin = async(event) => {
        event.preventDefault();
        this.updateLoadingMessage('Checking if address is an admin...')

        let khanaTokenInstance = this.state.contract.instance
        khanaTokenInstance.checkIfAdmin(event.target.address.value).then((isAdmin) => {
            this.updateState('User ' + (isAdmin ? 'is ' : 'is not ') + 'an admin')
        })
    }

    addAdmin = async(event) => {
        event.preventDefault();
        this.updateLoadingMessage('Adding user as an admin...')

        let khanaTokenInstance = this.state.contract.instance
        let accounts = this.state.user.accounts
        khanaTokenInstance.addAdmin(event.target.address.value, {from: accounts[0]}).then(() => {
            this.updateLoadingMessage('Waiting for transaction to confirm')

            khanaTokenInstance.AdminAdded({fromBlock: 'latest'}, (err, response) => {
                this.updateState('User added as an admin');
            })
        })
    }

    removeAdmin = async(event) => {
        event.preventDefault();
        this.updateLoadingMessage('Removing user as an admin...')

        let khanaTokenInstance = this.state.contract.instance
        let accounts = this.state.user.accounts
        khanaTokenInstance.removeAdmin(event.target.address.value, {from: accounts[0], gas: 100000}).then(() => {
            this.updateLoadingMessage('Waiting for transaction to confirm')

            khanaTokenInstance.AdminRemoved({fromBlock: 'latest'}, (err, response) => {
                this.updateState('User removed as an admin');
            })
        })
    }

    getIpfsReasons = async(ipfsHash) => {
        this.updateLoadingMessage('Loading IPFS reasons...')

        ipfs.files.cat('/ipfs/' + this.state.contract.latestIpfsHash, (err, file) => {
            if (err) {
                console.log(err)
            }

            // Get the raw text of the IPFS file, split it per 'new lines', split per comma, and determine if the transaction is relevant for the user's address
            let fileString = file.toString('utf8')
            let arrayOfTransactionReasons = fileString.split('\n').map(transaction => {
                let elements = transaction.split(', ')
                return elements[3]
            })

            let contractState = this.state.contract
            contractState.ipfsLogHistory.forEach( (value, index) => {
                value.reason = arrayOfTransactionReasons[index]
            })
            this.setState({contract: contractState})
            this.updateState('IPFS reasons loaded')
        })
    }

    render() {
        const isLoading = this.state.app.isLoading
        const hasStatusMessage = this.state.app.status
        const mintingEnabled = this.state.contract.mintingEnabled

        const transactionList = this.state.contract.ipfsLogHistory.sort((a, b) => {
            return a.blockNumber < b.blockNumber ? 1 : -1
        }).map(tx => {
            const reason = tx.reason != null ? '(Reason: ' + tx.reason + ')' : ''
            // Admins see list of all transactions, normal users see transactions relevant to them
            if (this.state.user.isAdmin) {
                return <li key={tx.ethTxHash}> {tx.minter} minted {tx.amount} {this.state.contract.tokenSymbol} for user {tx.awardedTo} in block number {tx.blockNumber} {reason} <a href={"https://gateway.ipfs.io/ipfs/" + tx.ipfsHash} target="_blank">(audit)</a></li>
            } else {
                if (tx.awardedTo === this.state.user.currentAddress) {
                    return <li key={tx.ethTxHash}> You were awarded {tx.amount} {this.state.contract.tokenSymbol} from {tx.minter} in block number {tx.blockNumber} {reason} <a href={"https://gateway.ipfs.io/ipfs/" + tx.ipfsHash} target="_blank">(audit)</a></li>
                } else {
                    return null
                }
            }
        })

        return (
            <div className="App">

            <nav className={ this.state.user.isAdmin ? "navbar-admin pure-menu pure-menu-horizontal" : "navbar pure-menu pure-menu-horizontal" }>
            <a href="#" className="pure-menu-heading pure-menu-link">Khana: a tokenized framework for community building</a>
            </nav>

            <main className="container">
            <div className="pure-g">
            <div className="pure-u-1-1">

            {isLoading &&
                <div>
                    <div className="loader"></div>
                </div>
            }

            {hasStatusMessage !== '' &&
                <div>
                    <p>{this.state.app.status}</p>
                </div>
            }

            { /* Admin section */}
            {this.state.user.isAdmin &&
                <div>
                <h1>Admin abilities</h1>

                <h2>Award tokens</h2>
                {/* TODO: - form validation */}
                <form onSubmit={this.awardTokens}>
                <label> Address: <input type="text" name="address"/></label>
                <label> Amount: <input type="number" name="amount"/></label>
                <label> Reason: <input type="text" name="reason" /></label>
                <input type="submit" value=" Award " id="awardButton" />
                </form>

                <h2>Admin Tools</h2>
                {mintingEnabled ? (
                    <button onClick={this.tokenEmergencyStop}> Activate Emergency Minting Stop </button>
                ) : (
                    <button onClick={this.tokenEnableMinting}> Re-enable minting </button>
                )}
                <p></p>

                <form onSubmit={this.checkAdmin}>
                <label> Address: <input type="text" name="address"/></label>
                <input type="submit" value=" Check if admin " />
                </form>

                <form onSubmit={this.addAdmin}>
                <label> Address: <input type="text" name="address"/></label>
                <input type="submit" value=" Add Admin " />
                </form>

                <form onSubmit={this.removeAdmin}>
                <label> Address: <input type="text" name="address"/></label>
                <input type="submit" value=" Remove Admin " />
                </form>
                </div>
            }

            { /* Everything else */}

            <h1>User Dashboard</h1>

            <h3>Minting transaction history</h3>
            <button onClick={this.getIpfsReasons}> Load reasons from IPFS </button>
            <ul> { transactionList.length > 0 ? transactionList : 'No transactions available' } </ul>

            <h3>Your information</h3>
            <p>Your balance: {this.state.user.tokenBalance}  {this.state.contract.tokenSymbol}</p>
            <p>Your address: {this.state.user.currentAddress}</p>
            <p>You have {((this.state.user.tokenBalance / this.state.contract.totalSupply) * 100).toFixed(2)}% of the supply</p>

            <h2>Token Information</h2>
            <p>Token name: {this.state.contract.tokenName}</p>
            <p>Token symbol: {this.state.contract.tokenSymbol}</p>
            <p>Total supply: {this.state.contract.totalSupply}</p>

            </div>
            </div>
            </main>
            </div>
        );
    }
}

export default App
