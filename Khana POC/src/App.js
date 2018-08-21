import React, { Component } from 'react'
import KharnaToken from '../build/contracts/KharnaToken.json'
import getWeb3 from './utils/getWeb3'

import './css/oswald.css'
import './css/open-sans.css'
import './css/pure-min.css'
import './App.css'

class App extends Component {
  constructor(props) {
    super(props)

    this.state = {
      storageValue: 0,
      addressBalance: 0,
      currentAddress: null,
      web3: null
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
    /*
     * SMART CONTRACT EXAMPLE
     *
     * Normally these functions would be called in the context of a
     * state management library, but for convenience I've placed them here.
     */

    const contract = require('truffle-contract')
    // const simpleStorage = contract(SimpleStorageContract)
    // simpleStorage.setProvider(this.state.web3.currentProvider)
    // // Declaring this for later so we can chain functions on SimpleStorage.
    // var simpleStorageInstance


    const kharnaToken = contract(KharnaToken)
    kharnaToken.setProvider(this.state.web3.currentProvider)
    var kharnaTokenInstance
    var supply
    // Get accounts.
    this.state.web3.eth.getAccounts((error, accounts) => {
      kharnaToken.deployed().then((instance) => {
        kharnaTokenInstance = instance
      //
        // return kharnaTokenInstance.award(accounts[0], 100, {from: accounts[0]})
      }).then(() => {
        return kharnaTokenInstance.getSupply.call()
    }).then((result) => {
        supply = result.toString(10);
        return kharnaTokenInstance.balanceOf(accounts[0])
      }).then((balance) => {
        // Update state with the result.
        let bal = balance.toString(10);
        return this.setState({ storageValue: supply, addressBalance: bal, currentAddress: accounts[0]})
      })
    })
  }

  render() {
    return (
      <div className="App">
        <nav className="navbar pure-menu pure-menu-horizontal">
            <a href="#" className="pure-menu-heading pure-menu-link">Truffle Box</a>
        </nav>

        <main className="container">
          <div className="pure-g">
            <div className="pure-u-1-1">
              <h1>Good to Go!</h1>
              <p>Your Truffle Box is installed and ready.</p>
              <h2>Smart Contract Example</h2>
              <p>Total supply: {this.state.storageValue}</p>
              <p>Current address balance: {this.state.addressBalance}</p>
              <p>Current address: {this.state.currentAddress}</p>
            </div>
          </div>
        </main>
      </div>
    );
  }
}

export default App
