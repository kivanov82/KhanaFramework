import React, { Component } from 'react'

import TxHistory from './TxHistory';

import Grid from '@material-ui/core/Grid';
import Button from '@material-ui/core/Button';


class UserDashboard extends Component {

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

        return (
            <Grid container spacing={8}>
                <Grid item md>
                    <Grid container justify="left" spacing={16}>
                        <Grid key={0} item>
                            <h3>My information</h3>
                            <p>My address: <br />{this.props.user.currentAddress}</p>
                            <p>My balance: <br />{this.props.user.tokenBalance}  {this.props.contract.tokenSymbol}</p>
                            <p>I have {((this.props.user.tokenBalance / this.props.contract.totalSupply) * 100).toFixed(2)}% of the supply</p>
                        </Grid>
                    </Grid>

                    <Grid container justify="left" spacing={16}>
                        <Grid key={0} item>
                            <h3>Sell my tokens</h3>
                            <p>You can easily liquidate your tokens back to the contract, <br />receiving ETH based on a bonding curve.</p>
                            <form onSubmit={this.sellTokens} id="contained-button-submit">
                                <label htmlFor="contained-button-submit"> Amount of {this.props.contract.tokenSymbol} to sell: <br />
                                    <input type="text" name="amount" />
                                </label>
                                <Button variant="outlined" color="primary" size="small" type="submit">Sell tokens</Button>
                            </form>
                            <p></p>
                        </Grid>
                    </Grid>

                    <Grid container justify="center" spacing={16}>
                        <TxHistory 
                            user={this.props.user}
                            contract={this.props.contract} 
                            updateLoadingMessage={this.props.updateLoadingMessage} 
                            updateState={this.props.updateState}
                            updateStaticState={this.props.updateStaticState}
                            />
                    </Grid>
                </Grid>
            </Grid>
        )
    }
}

export default UserDashboard;