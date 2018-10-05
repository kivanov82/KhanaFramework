import React, { Component } from 'react'
import {shortenAddress} from '../utils/helpers';

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
                            <h4>My information</h4>
                            <p>My address: {shortenAddress(this.props.user.currentAddress)}<br />
                            My balance: {this.props.user.tokenBalance}  {this.props.contract.tokenSymbol}<br />
                            I have {((this.props.user.tokenBalance / this.props.contract.totalSupply) * 100).toFixed(2)}% of the supply</p>
                        </Grid>
                    </Grid>

                    <Grid container justify="left" spacing={16}>
                        <Grid key={0} item>
                            <h4>Token Information</h4>
                            <p>{this.props.contract.tokenName} contract address: {shortenAddress(this.props.contract.address)}<br />
                                Total supply: {this.props.contract.totalSupply} {this.props.contract.tokenSymbol}</p>
                            {this.props.contract.fundsInstance &&
                                <p>Bonding curve address: {shortenAddress(this.props.contract.fundsInstance.address)}<br />
                                    ETH in bonding curve: {this.props.contract.ethAmount} ETH</p>
                            }
                        </Grid>
                    </Grid>

                    {this.props.user.tokenBalance > 0 &&
                        <Grid container justify="left" spacing={16}>
                            <Grid key={0} item>
                                <h4>Sell my tokens</h4>
                                <p>Sell your tokens to the bonding curve below</p>
                                <form onSubmit={this.sellTokens} id="contained-button-submit">
                                    <label htmlFor="contained-button-submit"> Amount of {this.props.contract.tokenSymbol} to sell: <br />
                                        <input type="text" name="amount" />
                                    </label>
                                    <Button variant="outlined" color="primary" size="small" type="submit">Sell tokens</Button>
                                </form>
                                <p></p>
                            </Grid>
                        </Grid>
                    }
                    
                </Grid>
            </Grid>
        )
    }
}

export default UserDashboard;