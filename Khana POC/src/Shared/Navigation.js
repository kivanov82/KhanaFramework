import React, { Component } from 'react';

import AppBar from '@material-ui/core/AppBar';
import LinearProgress from '@material-ui/core/LinearProgress';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
import Paper from '@material-ui/core/Paper';
import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';

class Navigation extends Component {

    handleNavigation = (event, value) => {
        let state = this.props.state
        state.navigation = value
        this.props.updateStaticState(state)
    }

    render() {
        return (
            <div>
                {this.props.state.app.isLoading &&
                        <LinearProgress />
                }
                <AppBar position="static" color={this.props.state.contract.contractEnabled ? "primary" : "secondary"} >
                    <Toolbar>
                        <Typography variant="title" color="inherit">
                            Khana framework: {this.props.state.contract.tokenName} ({this.props.state.contract.tokenSymbol})
                            <br />
                        </Typography>
                    </Toolbar>
                    
                </AppBar >

                <Paper>
                    <Tabs
                        value={this.props.state.navigation}
                        onChange={this.handleNavigation}
                        indicatorColor="primary"
                        textColor="primary"
                        centered
                    >
                        <Tab label="Dashboard" />
                        <Tab label="History" />
                        {this.props.state.user.isAdmin &&
                            <Tab label="Admin" />
                        }
                    </Tabs>
                </Paper>
            </div>
        )
    }
}

export default Navigation;