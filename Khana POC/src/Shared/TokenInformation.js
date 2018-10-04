import React, { Component } from 'react'
import {shortenAddress} from '../utils/helpers';

import Grid from '@material-ui/core/Grid';

class TokenInformation extends Component {
    render() {
        return(
            <Grid container spacing={8}>
                <Grid item md>
                    <Grid container justify="left" spacing={16}>

                        <Grid key={0} item>
                            <h3>Token Information</h3>
                            <p>Token name: {this.props.contract.tokenName}</p>
                            <p>Token contract address: <br />{shortenAddress(this.props.contract.address)}</p>
                            <p>Total supply: <br />{this.props.contract.totalSupply} {this.props.contract.tokenSymbol}</p>
                        </Grid>
                    </Grid>

                    <Grid container justify="left" spacing={16}>
                        <Grid key={0} item>
                            <h3>Bonding Curve Funds contract</h3>
                            <p>Amount of ETH in funds contract: {this.props.contract.ethAmount} ETH</p>
                            {this.props.contract.fundsInstance &&
                                <p>Bonding funds contract address: <br />{shortenAddress(this.props.contract.fundsInstance.address)}</p>
                            }
                            <p>You can send ETH directly to both the token contract or the funds contract, <br />and the ETH will be added to the bonding curve</p>
                        </Grid>
                    </Grid>
                </Grid>
            </Grid>
        )
    }
}

export default TokenInformation;