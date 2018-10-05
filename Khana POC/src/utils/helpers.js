import React from 'react';

export let endPoints = {
    blockExplorer: "https://rinkeby.etherscan.io/",
    ipfsEndpoint: "https://gateway.ipfs.io/ipfs/"
}

export function shortenAddress(address) {
    if (address == null) { return null }
    let shortAddress = address.substr(0, 6) + '...' + address.substr(address.length - 4)
    return <a href={endPoints.blockExplorer + "address/" + address} target="_blank">{shortAddress}</a>
}
