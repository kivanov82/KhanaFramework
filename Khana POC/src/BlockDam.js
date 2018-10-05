//
// BlockDam (BCD) based imports
//

import KhanaToken from '../build/contracts/BlockDamToken.json'
import BondingCurveFunds from '../build/contracts/BlockDamBondingCurveFunds.json'

//
// Update this value so we don't have to transverse the entire blockchain to find events
//

// const contractDeployBlockNumber = 0   // For use when developing
const contractDeployBlockNumber = 3009499   // KHNA Rinkeby deployment block

//
// Shared components
//

import Navigation from './Shared/Navigation';
import UserDashboard from './Shared/UserDashboard';
import TokenInformation from './Shared/TokenInformation';
import Admin from './Shared/Admin';
import Notifications from './Shared/Notifications';

//
// Styling
//

import './App.css'

//
// Other
//

import React, { Component } from 'react'
import getWeb3 from './utils/getWeb3'

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
            },
            navigation: 0,
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
            this.updateLoadingMessage('Error finding web3.')
        })
    }

    instantiateContract = async () => {
        const contract = require('truffle-contract')
        const tokenContract = contract(KhanaToken)
        tokenContract.setProvider(this.state.web3.currentProvider)

        const bondingCurveContract = contract(BondingCurveFunds)
        bondingCurveContract.setProvider(this.state.web3.currentProvider)

        var contractInstance;
        var name;
        var symbol;
        var fundsInstance;

        this.updateStaticState({ app: { status: 'Loading from blockchain', isLoading: true } })

        this.state.web3.eth.getAccounts((error, accounts) => {
            if (error) {
                this.updateStaticState({ app: { status: 'Error occured: ' + error, isLoading: true } })
                return
            }

            if (accounts.length === 0) {
                this.updateStaticState({ app: { status: 'No accounts detected! Have you unlocked your wallet?', isLoading: true } })
                return
            }
            
            tokenContract.deployed().then((tokenInstance) => {
                contractInstance = tokenInstance
            }).then(() => {
                return contractInstance.name()
            }).then((instanceName) => {
                name = instanceName
            }).then(() => {
                return contractInstance.symbol()
            }).then((instanceSymbol) => {
                symbol = instanceSymbol
            }).then(() => {
                return bondingCurveContract.deployed()
            }).then((bondingFundsInstance) => {
                fundsInstance = bondingFundsInstance
            }).then(() => {
                return contractInstance.checkIfAdmin.call(accounts[0])
            }).then((isAdmin) => {

                let awardEventsAll = contractInstance.LogAwarded({}, {
                    fromBlock: contractDeployBlockNumber,
                    toBlock: 'latest'
                })

                awardEventsAll.get((err, result) => {

                    if (error) {
                        this.updateLoadingMessage(error)
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
                        this.updateStaticState({
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
                        this.updateStaticState({
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
                this.updateLoadingMessage(error)
            })
        })

    }

    // Updates state and gets live data from contracts
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

        if (this.state.user.isAdmin && this.state.navigation === 2) {
            document.getElementById("awardButton").disabled = false;
        }

        if (message) {
            console.log(message);
        }
    }

    // Update state (without live data from contracts)
    updateStaticState = async (state) => {
        this.setState(state)
    }

    // Updates loading / status message
    updateLoadingMessage = async(message) => {
        let appState = this.state.app
        appState.status = message
        appState.isLoading = true
        this.setState({ app: appState })
        if (message !== '') {
            console.log(message)
        }
    }

    render() {
        return (
            <div className="App">
                <Navigation 
                    state={this.state}
                    updateStaticState={this.updateStaticState}
                    />

                <main className="container">
                    { /* User dashboard section */}
                    { this.state.navigation === 0 &&
                        <UserDashboard 
                            user={this.state.user} 
                            contract={this.state.contract} 
                            web3={this.state.web3} 
                            updateStaticState={this.updateStaticState} 
                            updateState={this.updateState} 
                            updateLoadingMessage={this.updateLoadingMessage}
                            />
                    }

                    { /* Token information section */}
                    { this.state.navigation === 1 &&
                        <TokenInformation contract={this.state.contract} />
                    }

                    { /* Admin section */}
                    { this.state.navigation === 2 &&
                        <Admin 
                            state={this.state} 
                            updateState={this.updateState} 
                            updateLoadingMessage={this.updateLoadingMessage} 
                            />
                    }
            
                    <Notifications 
                        state={this.state}
                        message={this.state.app.status} 
                        updateStaticState={this.updateStaticState} 
                        />

                </main>
            </div>
        );
    }
}

export default App
