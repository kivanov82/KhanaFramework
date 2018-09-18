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

class TxHistory extends Component {
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
            <div>
            { this.props.contract.latestIpfsHash &&
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
            </div>
        )
    }
}

export default TxHistory;