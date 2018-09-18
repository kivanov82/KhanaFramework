import React, { Component } from 'react'

import Snackbar from '@material-ui/core/Snackbar';
import CloseIcon from '@material-ui/icons/Close';
import IconButton from '@material-ui/core/IconButton';

class Notifications extends Component {

    handleClose = (event, reason) => {
        if (reason === 'clickaway') {
            return;
        }

        if (this.props.state.app.isLoading) {
            return;
        }

        let state = this.props.state
        state.app.status = ''
        this.props.updateStaticState(state)
    };

    render() {
        return (
            <Snackbar
                anchorOrigin={{
                    vertical: 'top',
                    horizontal: 'center',
                }}
                open={this.props.state.app.status !== ''}
                autoHideDuration={4000}
                message={this.props.state.app.status}
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
        )
    }
}

export default Notifications;