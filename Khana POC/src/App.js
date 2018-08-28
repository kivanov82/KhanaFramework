import React, { Component } from 'react'
import KhanaToken from '../build/contracts/KhanaToken.json'
import BondingCurveFunds from '../build/contracts/BondingCurveFunds.json'
import getWeb3 from './utils/getWeb3'
import ipfs from './utils/ipfs';

import './App.css'

import Button from '@material-ui/core/Button';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
import Paper from '@material-ui/core/Paper';
import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';
import Grid from '@material-ui/core/Grid';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import LinearProgress from '@material-ui/core/LinearProgress';
import Snackbar from '@material-ui/core/Snackbar';
import CloseIcon from '@material-ui/icons/Close';
import IconButton from '@material-ui/core/IconButton';


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

        if (this.state.user.isAdmin && this.state.navigation === 2) {
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
            this.updateLoadingMessage('Entry added to IPFS audit file successfully (with IPFS hash: ' + ipfsHash + '). Please confirm the ethereum transaction via your MetaMask wallet')

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

    handleNavigation = (event, value) => {
        let state = this.state
        state.navigation = value
        this.setState(state)
    };

    handleClose = (event, reason) => {
        if (reason === 'clickaway') {
          return;
        }

        if (this.state.app.isLoading) {
            return;
        }

        let state = this.state
        state.app.status = ''
        this.setState(state)
    };

    render() {
        const isLoading = this.state.app.isLoading
        const hasStatusMessage = this.state.app.status
        const contractEnabled = this.state.contract.contractEnabled

        const transactionList = this.state.contract.ipfsLogHistory.sort((a, b) => {
            return a.blockNumber < b.blockNumber ? 1 : -1
        }).map(tx => {

            // If normal user (i.e. non-admin) then only show their transactions
            if (!this.state.user.isAdmin && tx.awardedTo !== this.state.user.currentAddress) {
                return null
            } else {
                return (
                    <TableRow key={tx.ethTxHash}>
                      <TableCell component="th" scope="row">
                        {tx.minter}
                      </TableCell>
                      <TableCell>{tx.amount} {this.state.contract.tokenSymbol}</TableCell>
                      <TableCell>{tx.awardedTo}</TableCell>
                      <TableCell numeric>{tx.blockNumber}</TableCell>
                      <TableCell><Button variant="outlined" size="small" href={"https://gateway.ipfs.io/ipfs/" + tx.ipfsHash} target="_blank">IPFS log</Button></TableCell>
                      <TableCell>{ tx.reason != null ? tx.reason : <Button variant="outlined" size="small" onClick={this.getIpfsReasons}>Load from IPFS</Button>}</TableCell>
                    </TableRow>
                )
            }
        })

        return (
            <div className="App">
            {isLoading &&
                <LinearProgress />
            }
            <AppBar position="static" color="default">
                <Toolbar>
                  <Typography variant="title" color="inherit">
                    Khana: a tokenized framework for community building
                  </Typography>
                </Toolbar>
              </AppBar>

              <Paper>
                <Tabs
                  value={this.state.navigation}
                  onChange={this.handleNavigation}
                  indicatorColor="primary"
                  textColor="primary"
                  centered
                >
                  <Tab label="User dashboard" />
                  <Tab label="Token information" />
                  { this.state.user.isAdmin &&
                     <Tab label="Admin" />
                  }
                </Tabs>
              </Paper>

              <main className="container">

            { /* User dashboard section */}
            { this.state.navigation === 0 &&
                <Grid container spacing={8}>
                    <Grid item md>
                      <Grid container justify="center" spacing={16}>

                          <Grid key={0} item>
                            <h3>Your information</h3>
                            <p>Your address: <br/>{this.state.user.currentAddress}</p>
                            <p>Your balance: <br/>{this.state.user.tokenBalance}  {this.state.contract.tokenSymbol}</p>
                            <p>You have {((this.state.user.tokenBalance / this.state.contract.totalSupply) * 100).toFixed(2)}% of the supply</p>
                          </Grid>

                          <Grid key={1} item>
                            <h3>Sell my tokens</h3>
                            <p>You can easily liquidate your tokens back to the contract, <br/>receiving ETH based on a bonding curve.</p>
                            <form onSubmit={this.sellTokens} id="contained-button-submit">
                            <label htmlFor="contained-button-submit"> Amount of {this.state.contract.tokenSymbol} to sell: <br />
                            <input type="text" name="amount"/>
                            </label>
                            <Button variant="outlined" color="primary" size="small" type="submit">Sell tokens</Button>
                            </form>
                          </Grid>

                          {this.state.contract.latestIpfsHash &&
                              <Grid key={2} item>

                                    <Typography variant="headline" component="h3">
                                     Minting transaction history
                                    </Typography>
                                    <br />

                                     { transactionList.length > 0 &&

                                         <Paper>
                                           <Table>
                                             <TableHead>
                                               <TableRow>
                                                 <TableCell>Minter address</TableCell>
                                                 <TableCell>Amount minted</TableCell>
                                                 <TableCell>Receiver address</TableCell>
                                                 <TableCell>Block #</TableCell>
                                                 <TableCell>Audit trail</TableCell>
                                                 <TableCell>Reason given</TableCell>
                                               </TableRow>
                                             </TableHead>
                                             <TableBody>
                                             { transactionList }
                                             </TableBody>
                                           </Table>
                                         </Paper>
                                     }
                              </Grid>
                          }

                      </Grid>
                    </Grid>
                </Grid>
            }

            { /* Token information section */}
            { this.state.navigation === 1 &&
                <Grid container spacing={8}>
                    <Grid item md>
                      <Grid container justify="center" spacing={16}>

                       <Grid key={0} item>
                        <h3>Token Information</h3>
                        <p>Token name: {this.state.contract.tokenName}</p>
                        <p>Token contract address: <br/>{this.state.contract.address}</p>
                        <p>Total supply: <br/>{this.state.contract.totalSupply} {this.state.contract.tokenSymbol}</p>
                      </Grid>

                      <Grid key={1} item>
                        <h3>Bonding Curve Funds contract</h3>
                        <p>Amount of ETH in funds contract: {this.state.contract.ethAmount} ETH</p>
                        {this.state.contract.fundsInstance &&
                            <p>Bonding funds contract address: <br/>{this.state.contract.fundsInstance.address}</p>
                        }
                        <p>You can send ETH directly to both the token contract or the funds contract, <br/>and the ETH will be added to the bonding curve</p>
                       </Grid>
                     </Grid>
                    </Grid>
                </Grid>
            }

            { /* Admin section */}
            { this.state.navigation === 2 &&
                <Grid container>
                    <Grid item md>
                        <Grid container justify="center">
                            <Grid key={0} item>
                            <h3>Award tokens</h3>
                            <p>Award tokens to community members for their contributions and participation.</p>
                            {/* TODO: - form validation */}
                            <form onSubmit={this.awardTokens} id="awardTokens">
                            <label> Address: <input type="text" name="address"/></label>
                            <label> Amount: <input type="number" name="amount"/></label>
                            <label> Reason: <input type="text" name="reason" /></label>
                            <Button variant="outlined" color="primary" size="small" type="submit" id="awardButton">Award</Button>
                            </form>
                            </Grid>
                        </Grid>

                        <Grid container justify="center">
                            <Grid key={0} item>
                                <h3>Admin Tools</h3>

                                <form onSubmit={this.checkAdmin} id="checkAdmin">
                                <label> Check address if admin: <input type="text" name="address"/></label>
                                <Button variant="outlined" color="primary" size="small" type="submit">Check</Button>
                                </form>

                                <form onSubmit={this.addAdmin} id="addAdmin">
                                <label> Add address as admin: <input type="text" name="address"/></label>
                                <Button variant="outlined" color="primary" size="small" type="submit">Add Admin</Button>
                                </form>

                                <form onSubmit={this.removeAdmin}>
                                <label> Remove address as admin: <input type="text" name="address"/></label>
                                <Button variant="outlined" color="primary" size="small" type="submit">Remove Admin</Button>
                                </form>

                                <p></p>

                                {contractEnabled ? (
                                    <Button variant="contained" color="primary" onClick={this.tokenEmergencyStop}> Activate Emergency Stop </Button>
                                ) : (
                                    <Button variant="contained" color="primary" onClick={this.tokenResumeContract}> Re-enable Contract </Button>
                                )}
                            </Grid>
                        </Grid>
                    </Grid>
                </Grid>
            }

            <Snackbar
              anchorOrigin={{
                vertical: 'top',
                horizontal: 'center',
              }}
              open={hasStatusMessage !== ''}
              autoHideDuration={4000}
              message={this.state.app.status}
              onClose={this.handleClose}
              action={[
                <IconButton
                  key="close"
                  aria-label="Close"
                  color="inherit"
                  onClick={this.handleClose}
                >
                 <CloseIcon />
                </IconButton>,
              ]}
            >
            </Snackbar>

            </main>
            </div>
        );
    }
}

export default App
