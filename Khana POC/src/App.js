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
            contract: null,
            accounts: null,
            tokenName: '',
            tokenSymbol: '',
            totalSupply: 0,
            mintingEnabled: null,
            addressBalance: 0,
            currentAddress: null,
            awardAmount: 0,
            awardReason:'',
            latestIpfsHash: null,
            status:'waiting...',
            isLoading: false
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
        var instance;
        var name;
        var symbol;

        this.setState({isLoading: true})

        this.state.web3.eth.getAccounts((error, accounts) => {
            khanaToken.deployed().then((khanaInstance) => {
                instance = khanaInstance
            }).then(() => {
                return instance.name()
            }).then((instanceName) => {
                name = instanceName
            }).then(() => {
                return instance.symbol()
            }).then((instanceSymbol) => {
                symbol = instanceSymbol
            }).then(() => {
                 let awardEventsAll = instance.Awarded({}, {
                     fromBlock: 0,
                     toBlock: 'latest'
                 })

                 awardEventsAll.get((err, result) => {
                     console.log(err)
                     console.log(result)

                     let ipfsEventLogged = result[result.length - 1]

                     if (ipfsEventLogged != null) {
                         this.setState({ contract: instance, accounts: accounts, tokenName: name, tokenSymbol: symbol, latestIpfsHash: ipfsEventLogged.args.ipfsHash })
                     } else {
                         this.setState({ contract: instance, accounts: accounts, tokenName: name, tokenSymbol: symbol })
                     }
                     this.updateState();
                 })
            }).then(() => {

            }).then(() => {

            })
        })
    }

    updateState = async () => {
        let web3 = this.state.web3
        let khanaTokenInstance = this.state.contract
        let accounts = this.state.accounts
        var supply
        var balance

        khanaTokenInstance.getSupply.call().then((newSupply) => {
            supply = (web3.fromWei(newSupply, 'ether')).toString(10);
            return khanaTokenInstance.balanceOf(accounts[0])
        }).then((newBalance) => {
            balance = (web3.fromWei(newBalance, 'ether')).toString(10);
            return khanaTokenInstance.mintingFinished()
        }).then((mintingDisabled) => {
            return this.setState({totalSupply: supply, mintingEnabled: !mintingDisabled, addressBalance: balance, currentAddress: accounts[0], status: '', isLoading: false})
        })
    }

    awardTokens =(event) => {
        event.preventDefault();

        let web3 = this.state.web3

        // Set state
        let address = event.target.address.value
        let amount = web3.toWei(event.target.amount.value, 'ether')
        let reason = event.target.reason.value
        this.setState({awardAmount: amount, awardReason: reason, status: 'Processing...', isLoading: true});

        let getIpfsFile = new Promise((ipfsResult) => {
            let latestIpfsHash = this.state.latestIpfsHash
            // If there is no existing hash, then we are running for first time
            if (!latestIpfsHash) {
                //Set up IPFS details
                let newContents = Date.now() + ', ' + address + ', ' + amount + ', ' + reason

                let ipfsContent = {
                    path: '/' + this.state.tokenName,
                    content: Buffer.from(newContents)
                }

                // Write description to IPFS, return hash
                ipfsResult(ipfs.add(ipfsContent))
            } else {
                // Get most recent version of logs first
                ipfs.files.cat('/ipfs/' + this.state.latestIpfsHash).then((file) => {
                    let previousContents = file.toString('utf8');
                    let newContents = Date.now() + ', ' + address + ', ' + amount + ', ' + reason + '\n' + previousContents

                    //Set up IPFS details
                    let ipfsContent = {
                        path: '/' + this.state.tokenName,
                        content: Buffer.from(newContents)
                    }

                    // Write description to IPFS, return hash
                    ipfsResult(ipfs.add(ipfsContent))
                })
            }
        })

        getIpfsFile.then((ipfsResult) => {

            // Then store the recent tx and record on blockchain (and events log)
            console.log(ipfsResult[0].hash)
            let ipfsHash = ipfsResult[0].hash

            // Make contract changes
            let khanaTokenInstance = this.state.contract
            let accounts = this.state.accounts

            console.log('sending tx')
            khanaTokenInstance.award(address, amount, ipfsHash, {from: accounts[0]}).then((result) => {
                this.setState({status: 'Waiting for transaction to confirm...'});

                // TODO: - if running on private blockchain / dev (ganache or truffle dev), the latest block may already have an event (not the pending block to be mined), therefore two events will be detected

                // watch for tx completion
                khanaTokenInstance.Awarded({fromBlock: 'latest'}, (err, response) => {
                    console.log('Tx hash: ' + response.transactionHash);
                    console.log(response);

                    // Update latest ipfsHash
                    this.setState({latestIpfsHash: ipfsHash})
                    this.updateState();
                })
            })
        })
    };

    tokenEmergencyStop = async () => {
        this.setState({status: 'Processing...', isLoading: true});

        let khanaTokenInstance = this.state.contract
        let accounts = this.state.accounts

        khanaTokenInstance.emergencyStop({from: accounts[0]}).then((success) => {
            this.setState({status: 'Waiting for transaction to confirm...'});
            khanaTokenInstance.MintFinished({fromBlock: 'latest'}, (err, response) => {
                console.log('emergency stop activated')
                this.updateState();
            })
        })
    }

    tokenEnableMinting = async () => {
        this.setState({status: 'Processing...', isLoading: true});

        let khanaTokenInstance = this.state.contract
        let accounts = this.state.accounts

        khanaTokenInstance.resumeMinting({from: accounts[0]}).then((success) => {
            this.setState({status: 'Waiting for transaction to confirm...'});
            khanaTokenInstance.MintingEnabled({fromBlock: 'latest'}, (err, response) => {
                console.log('Minting reenabled')
                this.updateState();
            })
        })
    }

    render() {
        const isLoading = this.state.isLoading;
        const mintingEnabled = this.state.mintingEnabled

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
                    <p>{this.state.status}</p>
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
            <p>Your balance: {this.state.addressBalance}</p>
            <p>Your address: {this.state.currentAddress}</p>
            <p>You have {((this.state.addressBalance / this.state.totalSupply) * 100).toFixed(2)}% of the supply</p>

            <h2>Token Information</h2>
            <p>Token name: {this.state.tokenName}</p>
            <p>Token symbol: {this.state.tokenSymbol}</p>
            <p>Total supply: {this.state.totalSupply}</p>

            </div>
            </div>
            </main>
            </div>
        );
    }
}

export default App
