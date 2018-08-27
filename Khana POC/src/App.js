import React, { Component } from 'react'
import KhanaToken from '../build/contracts/KhanaToken.json'
import BondingCurveFunds from '../build/contracts/BondingCurveFunds.json'
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
                fundsInstance: null,
                address: '',
                tokenName: '',
                tokenSymbol: '',
                totalSupply: 0,
                ethAmount: 0,
                contractEnabled: null,
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

        const bondingCurveFunds = contract(BondingCurveFunds)
        bondingCurveFunds.setProvider(this.state.web3.currentProvider)

        var contractInstance;
        var name;
        var symbol;
        var fundsInstance;

        this.setState({app: { status: 'Loading from blockchain', isLoading: true}})

        this.state.web3.eth.getAccounts((error, accounts) => {
            if (error) {
                console.log(error);
                return
            }

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
                return bondingCurveFunds.deployed()
            }).then((bondingFundsInstance) => {
                fundsInstance = bondingFundsInstance
            }).then(() => {
                return contractInstance.checkIfAdmin.call(accounts[0])
            }).then((isAdmin) => {

                let awardEventsAll = contractInstance.LogAwarded({}, {
                    fromBlock: 0,
                    toBlock: 'latest'
                })

                awardEventsAll.get((err, result) => {

                    if (error) {
                        console.log(error)
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
                                fundsInstance: fundsInstance,
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
                                fundsInstance: fundsInstance,
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
                    awardEventsAll.stopWatching();
                    this.updateState();
                })
            }).catch((error) => {
                console.log(error)
            })
        })
    }

    updateState = async (message) => {
        let web3 = this.state.web3
        let khanaTokenInstance = this.state.contract.instance
        let accounts = this.state.user.accounts
        let fundsInstance = this.state.contract.fundsInstance
        var supply
        var tokenBalance

        khanaTokenInstance.getSupply.call().then((newSupply) => {
            supply = (web3.fromWei(newSupply, 'ether')).toString(10);
            return khanaTokenInstance.balanceOf(accounts[0])
        }).then((newBalance) => {
            tokenBalance = (web3.fromWei(newBalance, 'ether')).toString(10);
            return khanaTokenInstance.contractEnabled()
        }).then((contractStatus) => {

            web3.eth.getBalance(fundsInstance.address, (err, result) => {
                let state = this.state
                state.contract.totalSupply = supply
                state.contract.address = khanaTokenInstance.address
                state.contract.contractEnabled = contractStatus
                state.contract.ethAmount = (web3.fromWei(result, 'ether')).toString(10);
                state.user.currentAddress = accounts[0]
                state.user.tokenBalance = tokenBalance
                state.app.status = message ? message : ''
                state.app.isLoading = false

                return this.setState(state)
            })

        }).catch((error) => {
            console.log(error)
        })

        if (this.state.user.isAdmin) {
            document.getElementById("awardButton").disabled = false;
        }

        if (message) {
            console.log(message);
        }
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

                let awardedEvent = khanaTokenInstance.LogAwarded({fromBlock: 'latest'}, (err, response) => {

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
            }).catch((error) => {
                this.updateState(error.message)
            })
        }).catch((error) => {
            this.updateState(error.message)
        })
    }


    sellTokens = async (event) => {
        event.preventDefault();
        this.updateLoadingMessage('Selling tokens...')

        let khanaTokenInstance = this.state.contract.instance
        let accounts = this.state.user.accounts
        let amount = this.state.web3.toWei(event.target.amount.value, 'ether')
        let tokenBalance = this.state.web3.toWei(this.state.user.tokenBalance, 'ether')

        if (amount === 0) {
            this.updateState('An amount must be entered');
            return
        }

        khanaTokenInstance.calculateSellReturn.call(amount, tokenBalance).then((redeemableEth) => {
            let alert = confirm("You will receive " + this.state.web3.fromWei(redeemableEth, 'ether') + ' ETH in return for ' + this.state.web3.fromWei(amount, 'ether') + ' ' + this.state.contract.tokenSymbol + '. Are you sure?')

            if (alert === true) {
                khanaTokenInstance.sell(amount, {from: accounts[0], gas: 100000}).then((success) => {
                    this.updateLoadingMessage('Waiting for transaction to confirm...')

                    let sellEvent = khanaTokenInstance.LogSell({fromBlock: 'latest'}, (err, response) => {
                        let ethReceived = this.state.web3.fromWei(response.args.ethReceived.toString(), 'ether')

                        this.updateState('Sell completed, received ' + ethReceived + ' ETH');
                        sellEvent.stopWatching();
                    })
                }).catch((error) => {
                    this.updateState(error.message)
                })
            } else {
                this.updateState()
            }
        }).catch((error) => {
            this.updateState(error.message)
        })
    }

    tokenEmergencyStop = async () => {
        event.preventDefault();
        this.updateLoadingMessage('Processing emergency stop...')

        let khanaTokenInstance = this.state.contract.instance
        let accounts = this.state.user.accounts

        khanaTokenInstance.emergencyStop({from: accounts[0]}).then((success) => {
            this.updateLoadingMessage('Waiting for transaction to confirm...')

            let disabledEvent = khanaTokenInstance.LogContractDisabled({fromBlock: 'latest'}, (err, response) => {
                this.updateState('Emergency stop activated');
                disabledEvent.stopWatching();
            })
        }).catch((error) => {
            this.updateState(error.message)
        })
    }

    tokenResumeContract = async () => {
        event.preventDefault();
        this.updateLoadingMessage('Re-enabling token minting...')

        let khanaTokenInstance = this.state.contract.instance
        let accounts = this.state.user.accounts

        khanaTokenInstance.resumeContract({from: accounts[0]}).then((success) => {
            this.updateLoadingMessage('Waiting for transaction to confirm...')

            let enabledEvent = khanaTokenInstance.LogContractEnabled({fromBlock: 'latest'}, (err, response) => {
                this.updateState('Contract reenabled');
                enabledEvent.stopWatching();
            })
        }).catch((error) => {
            this.updateState(error.message)
        })
    }

    checkAdmin = async(event) => {
        event.preventDefault();
        this.updateLoadingMessage('Checking if address is an admin...')

        let khanaTokenInstance = this.state.contract.instance
        khanaTokenInstance.checkIfAdmin(event.target.address.value).then((isAdmin) => {
            this.updateState('User ' + (isAdmin ? 'is ' : 'is not ') + 'an admin')
        }).catch((error) => {
            this.updateState(error.message)
        })
    }

    addAdmin = async(event) => {
        event.preventDefault();
        this.updateLoadingMessage('Adding user as an admin...')

        let khanaTokenInstance = this.state.contract.instance
        let accounts = this.state.user.accounts
        khanaTokenInstance.addAdmin(event.target.address.value, {from: accounts[0]}).then(() => {
            this.updateLoadingMessage('Waiting for transaction to confirm')

            let addedEvent = khanaTokenInstance.LogAdminAdded({fromBlock: 'latest'}, (err, response) => {
                this.updateState('User added as an admin');
                addedEvent.stopWatching();
            })
        }).catch((error) => {
            this.updateState(error.message)
        })
    }

    removeAdmin = async(event) => {
        event.preventDefault()
        this.updateLoadingMessage('Removing user as an admin...')

        let khanaTokenInstance = this.state.contract.instance
        let accounts = this.state.user.accounts
        khanaTokenInstance.removeAdmin(event.target.address.value, {from: accounts[0], gas: 100000}).then(() => {
            this.updateLoadingMessage('Waiting for transaction to confirm')

            let removedEvent = khanaTokenInstance.LogAdminRemoved({fromBlock: 'latest'}, (err, response) => {
                this.updateState('User removed as an admin');
                removedEvent.stopWatching();
            })
        }).catch((error) => {
            this.updateState(error.message)
        })
    }

    getIpfsReasons = async(ipfsHash) => {
        this.updateLoadingMessage('Loading IPFS reasons...')

        ipfs.files.cat('/ipfs/' + this.state.contract.latestIpfsHash, (err, file) => {
            if (err) {
                this.updateState(err.message)
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
        const contractEnabled = this.state.contract.contractEnabled

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
                {contractEnabled ? (
                    <button onClick={this.tokenEmergencyStop}> Activate Emergency Stop </button>
                ) : (
                    <button onClick={this.tokenResumeContract}> Re-enable Contract </button>
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

            {this.state.contract.latestIpfsHash &&
                <div>
                <h3>Minting transaction history</h3>
                <button onClick={this.getIpfsReasons}> Load reasons from IPFS </button>
                <ul> { transactionList.length > 0 ? transactionList : 'No transactions available' } </ul>
                </div>
            }

            <h3>Your information</h3>
            <p>Your balance: {this.state.user.tokenBalance}  {this.state.contract.tokenSymbol}</p>
            <p>Your address: {this.state.user.currentAddress}</p>
            <p>You have {((this.state.user.tokenBalance / this.state.contract.totalSupply) * 100).toFixed(2)}% of the supply</p>

            <form onSubmit={this.sellTokens}>
            <label> Amount of {this.state.contract.tokenSymbol} to sell: <input type="text" name="amount"/></label>
            <input type="submit" value=" Sell tokens " />
            </form>

            <h2>Token Information</h2>
            <p>Token name: {this.state.contract.tokenName}</p>
            <p>Token contract address: {this.state.contract.address}</p>
            <p>Total supply: {this.state.contract.totalSupply} {this.state.contract.tokenSymbol}</p>
            <p>Amount of ETH in bonding funds contract: {this.state.contract.ethAmount} ETH</p>
            {this.state.contract.fundsInstance &&
                <p>Bonding funds contract address: {this.state.contract.fundsInstance.address}</p>
            }

            </div>
            </div>
            </main>
            </div>
        );
    }
}

export default App
