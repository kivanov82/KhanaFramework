module.exports = {
    // See <http://truffleframework.com/docs/advanced/configuration>
    // to customize your Truffle configuration!

    networks: {
        development: {
            host: "127.0.0.1",
            port: 7545,
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
    }
};
