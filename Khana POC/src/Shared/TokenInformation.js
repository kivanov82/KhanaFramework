import React, { Component } from 'react'
import TxHistory from './TxHistory';

import Grid from '@material-ui/core/Grid';

class TokenInformation extends Component {
    render() {
        return(
            <Grid container spacing={8}>
                <Grid item md>
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

export default TokenInformation;