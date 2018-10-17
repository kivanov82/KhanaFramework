module.exports = {
  // See <http://truffleframework.com/docs/advanced/configuration>
  // to customize your Truffle configuration!

    networks: {
        development: {
            host: "127.0.0.1",
            port: 7545, // Ganache
            network_id: "*", // Match any network id
            gas: 7000000,
            websockets: true
        },
        rinkeby: {
            host: "127.0.0.1",
            port: 8545,
            network_id: 4,
            gas: 7000000,
            confirmations: 2
        }
    },
    compilers: {
        solc: {
            settings: {
                optimizer: {
                    enabled: true // Default: false
                }
            }
        }
    },

    // Comment out the following if you are running tests locally and need to see the result
    // in terminal.
    // We need this section when committing to Github to have test results shown properly with
    // CI on Azure
    mocha: {
        reporter: "mocha-junit-reporter",
        reporterOptions: {
            mochaFile: 'truffle-test-results.xml'
        }
    }
};
