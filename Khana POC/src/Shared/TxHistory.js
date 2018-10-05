import React, { Component } from 'react'
import ipfs from '../utils/ipfs';
import {shortenAddress, endPoints} from '../utils/helpers';

import Grid from '@material-ui/core/Grid';
import Button from '@material-ui/core/Button';
import Paper from '@material-ui/core/Paper';
import Table from '@material-ui/core/Table';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import TableCell from '@material-ui/core/TableCell';
import TableBody from '@material-ui/core/TableBody';

class TxHistory extends Component {

    constructor(props) {
        super(props)

        this.state = {
            reasonsLoaded: false
        }
    }
    
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
            this.setState({ reasonsLoaded: true })
        })

    }

    render() {
        const sortedTxList = this.props.contract.ipfsLogHistory.sort((a, b) => {
            return a.blockNumber < b.blockNumber ? 1 : -1
        })
        
        const transactionList = sortedTxList.map(tx => {
            if (tx.minter == null) { return null }
            return (
                <TableRow key={tx.ethTxHash} hover>
                    <TableCell component="th" scope="row">
                        {shortenAddress(tx.minter)}
                    </TableCell>
                    <TableCell>{tx.amount} {this.props.contract.tokenSymbol}</TableCell>
                    <TableCell>{shortenAddress(tx.awardedTo)}</TableCell>
                    <TableCell numeric><a href={endPoints.blockExplorer + "tx/" + tx.ethTxHash} target="_blank">{tx.blockNumber}</a></TableCell>
                    {tx.reason != null ? (
                        <TableCell>{tx.reason}</TableCell>
                    ) : (
                        <TableCell><a href={endPoints.ipfsEndpoint + tx.ipfsHash} target="_blank">Raw Log</a></TableCell>
                    )
                    }
                </TableRow>
            )
        })

        return (
            <div>
            { this.props.contract.latestIpfsHash &&
                <Grid key={0} item xs={8} sm={10} md={12}>
                    {this.state.reasonsLoaded === false &&
                        <Button variant="outlined" size="small" onClick={this.getIpfsReasons}>Load minting reasons</Button>
                    }
                    <Button variant="outlined" size="small" href={endPoints.ipfsEndpoint + sortedTxList[0].ipfsHash} target="_blank">Get latest raw log</Button>
                    <p></p>

                    {transactionList.length > 0 &&
                        <Paper style={{ display: 'flex', overflowX: 'auto' }}>
                            <Table padding='dense'>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Minter</TableCell>
                                        <TableCell>Amount</TableCell>
                                        <TableCell>Receiver</TableCell>
                                        <TableCell>Block #</TableCell>
                                        <TableCell>Reasons</TableCell>
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