import React, { Component } from 'react'
import ipfs from '../utils/ipfs';

import Grid from '@material-ui/core/Grid';
import Button from '@material-ui/core/Button';
import Typography from '@material-ui/core/Typography';
import Paper from '@material-ui/core/Paper';
import Table from '@material-ui/core/Table';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import TableCell from '@material-ui/core/TableCell';
import TableBody from '@material-ui/core/TableBody';

class UserDashboard extends Component {

    getIpfsReasons = async (ipfsHash) => {
        this.props.updateLoadingMessage('Loading IPFS reasons...')

        ipfs.files.cat('/ipfs/' + this.props.contract.latestIpfsHash, (err, file) => {
            if (err) {
                this.props.updateState(err.message)
            }

            // Parse JSON to object
            let auditLog = JSON.parse(file.toString('utf8'))

            let contractState = this.props.contract
            contractState.ipfsLogHistory.forEach((value, index) => {
                value.reason = auditLog[index].reason
            })
            this.props.updateStaticState({ contract: contractState })
            this.props.updateState('IPFS reasons loaded')
        })
    }

    sellTokens = async (event) => {
        event.preventDefault();
        this.props.updateLoadingMessage('Selling tokens...')

        let khanaTokenInstance = this.props.contract.instance
        let accounts = this.props.user.accounts
        let amount = this.props.web3.toWei(event.target.amount.value, 'ether')
        let tokenBalance = this.props.web3.toWei(this.props.user.tokenBalance, 'ether')

        if (amount === 0) {
            this.props.updateState('An amount must be entered');
            return
        }

        khanaTokenInstance.calculateSellReturn.call(amount, tokenBalance).then((redeemableEth) => {
            let alert = confirm("You will receive " + this.props.web3.fromWei(redeemableEth, 'ether') + ' ETH in return for ' + this.props.web3.fromWei(amount, 'ether') + ' ' + this.props.contract.tokenSymbol + '. Are you sure?')

            if (alert === true) {
                khanaTokenInstance.sell(amount, { from: accounts[0], gas: 100000 }).then((success) => {
                    this.props.updateLoadingMessage('Waiting for transaction to confirm...')

                    let sellEvent = khanaTokenInstance.LogSell({ fromBlock: 'latest' }, (err, response) => {
                        let ethReceived = this.props.web3.fromWei(response.args.ethReceived.toString(), 'ether')

                        this.props.updateState('Sell completed, received ' + ethReceived + ' ETH');
                        sellEvent.stopWatching();
                    })
                }).catch((error) => {
                    this.props.updateState(error.message)
                })
            } else {
                this.props.updateState()
            }
        }).catch((error) => {
            this.props.updateState(error.message)
        })
    }

    render() {

        const transactionList = this.props.contract.ipfsLogHistory.sort((a, b) => {
            return a.blockNumber < b.blockNumber ? 1 : -1
        }).map(tx => {

            // If normal user (i.e. non-admin) then only show their transactions
            if (!this.props.user.isAdmin && tx.awardedTo !== this.props.user.currentAddress) {
                return null
            } else {
                return (
                    <TableRow key={tx.ethTxHash}>
                        <TableCell component="th" scope="row">
                            {tx.minter}
                        </TableCell>
                        <TableCell>{tx.amount} {this.props.contract.tokenSymbol}</TableCell>
                        <TableCell>{tx.awardedTo}</TableCell>
                        <TableCell numeric>{tx.blockNumber}</TableCell>
                        <TableCell><Button variant="outlined" size="small" href={"https://gateway.ipfs.io/ipfs/" + tx.ipfsHash} target="_blank">IPFS log</Button></TableCell>
                        <TableCell>{tx.reason != null ? tx.reason : "reason not loaded"}</TableCell>
                    </TableRow>
                )
            }
        })

        return (
            <Grid container spacing={8}>
                <Grid item md>
                    <Grid container justify="center" spacing={16}>

                        <Grid key={0} item>
                            <h3>My information</h3>
                            <p>My address: <br />{this.props.user.currentAddress}</p>
                            <p>My balance: <br />{this.props.user.tokenBalance}  {this.props.contract.tokenSymbol}</p>
                            <p>I have {((this.props.user.tokenBalance / this.props.contract.totalSupply) * 100).toFixed(2)}% of the supply</p>
                        </Grid>

                        <Grid key={1} item>
                            <h3>Sell my tokens</h3>
                            <p>You can easily liquidate your tokens back to the contract, <br />receiving ETH based on a bonding curve.</p>
                            <form onSubmit={this.sellTokens} id="contained-button-submit">
                                <label htmlFor="contained-button-submit"> Amount of {this.props.contract.tokenSymbol} to sell: <br />
                                    <input type="text" name="amount" />
                                </label>
                                <Button variant="outlined" color="primary" size="small" type="submit">Sell tokens</Button>
                            </form>
                        </Grid>

                        {this.props.contract.latestIpfsHash &&
                            <Grid key={2} item>

                                <Typography variant="headline" component="h3">
                                    Minting transaction history
                                    </Typography>
                                <br />
                                <Button variant="outlined" size="small" onClick={this.getIpfsReasons}>Load reasons from IPFS</Button>
                                <p></p>

                                {transactionList.length > 0 &&

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
                                                {transactionList}
                                            </TableBody>
                                        </Table>
                                    </Paper>
                                }
                            </Grid>
                        }

                    </Grid>
                </Grid>
            </Grid>
        )
    }
}

export default UserDashboard;