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
            },
            user: {
                accounts: null,
                currentAddress: null,
                tokenBalance: 0,
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
                 let awardEventsAll = contractInstance.Awarded({}, {
                     fromBlock: 0,
                     toBlock: 'latest'
                 })

                 awardEventsAll.get((err, result) => {
                     console.log(err)
                     console.log(result)
                     let ipfsEventLogged = result[result.length - 1]

                     // Get latest IPFS hash if it exists

                     if (ipfsEventLogged != null) {
                         this.setState({
                             contract: {
                                 instance: contractInstance,
                                 tokenName: name,
                                 tokenSymbol: symbol,
                                 latestIpfsHash: ipfsEventLogged.args.ipfsHash
                             },
                             user: {
                                 accounts: accounts
                             }
                         })
                     } else {
                         this.setState({
                             contract: {
                                 instance: contractInstance,
                                 tokenName: name,
                                 tokenSymbol: symbol,
                             },
                             user: {
                                 accounts: accounts
                             }
                         })
                     }
                     this.updateState();
                 })
            }).then(() => {

            }).then(() => {

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
    }

    updateLoadingMessage = async(message) => {
        let appState = this.state.app
        appState.status = message
        appState.isLoading = true
        this.setState({ app: appState })
    }

    awardTokens =(event) => {
        event.preventDefault();

        let web3 = this.state.web3

        // Set state
        let address = event.target.address.value
        let amount = web3.toWei(event.target.amount.value, 'ether')
        let reason = event.target.reason.value
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

                this.updateLoadingMessage('Creating inital IPFS file...')

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

                    this.updateLoadingMessage('Adding details to IPFS file...')

                    // Write description to IPFS, return hash
                    ipfsResult(ipfs.add(ipfsContent))
                })
            }
        })

        getIpfsFile.then((ipfsResult) => {

            // Then store the recent tx and record on blockchain (and events log)
            console.log(ipfsResult[0].hash)
            let ipfsHash = ipfsResult[0].hash
            this.updateLoadingMessage('Entry added to IPFS file successfully (with IPFS hash: ' + ipfsHash + ') \nNow adding IPFS hash permanently to minting transaction on ethereum...')

            // Make contract changes
            let khanaTokenInstance = this.state.contract.instance
            let accounts = this.state.user.accounts

            khanaTokenInstance.award(address, amount, ipfsHash, {from: accounts[0]}).then((result) => {
                this.updateLoadingMessage('Waiting for transaction to confirm...')

                // TODO: - if running on private blockchain / dev (ganache or truffle dev), the latest block may already have an event (not the pending block to be mined), therefore two events will be detected

                // watch for tx completion
                khanaTokenInstance.Awarded({fromBlock: 'latest'}, (err, response) => {
                    console.log('Tx hash: ' + response.transactionHash);
                    console.log(response);

                    // Update latest ipfsHash
                    let contractState = this.state.contract
                    contractState.latestIpfsHash = ipfsHash
                    this.setState({ contract: contractState })
                    this.updateState('Transaction confirmed with hash: ' + response.transactionHash);
                })
            })
        })
    };

    tokenEmergencyStop = async () => {
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

    render() {
        const isLoading = this.state.app.isLoading
        const hasStatusMessage = this.state.app.status
        const mintingEnabled = this.state.contract.mintingEnabled

        return (
            <div className="App">
            <nav className="navbar pure-menu pure-menu-horizontal">
            <a href="#" className="pure-menu-heading pure-menu-link">Khana: a tokenized framework for community building</a>
            </nav>

            <main className="container">
            <div className="pure-g">
            <div className="pure-u-1-1">
            <h1>Admin abilities</h1>

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

            <h2>Award tokens</h2>
            {/* TODO: - form validation */}
            <form onSubmit={this.awardTokens}>
                <label> Address: <input type="text" name="address"/></label>
                <label> Amount: <input type="number" name="amount"/></label>
                <label> Reason: <input type="text" name="reason" /></label>
                <input type="submit" value=" Award " />
            </form>

            <h2>Admin Settings</h2>
            {mintingEnabled ? (
                <button onClick={this.tokenEmergencyStop}> Activate Emergency Minting Stop </button>
            ) : (
                <button onClick={this.tokenEnableMinting}> Re-enable minting </button>
            )}

            <h1>Dashboard</h1>
            <h2>Your information</h2>
            <p>Your balance: {this.state.user.tokenBalance}</p>
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
