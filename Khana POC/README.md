# Khana: Proof of Concept

![PoC interface v.0.1 image](https://raw.githubusercontent.com/mrdavey/KhanaFramework/master/Khana%20POC/PoC.v.0.1.png)

This repo is the Proof of Concept, more info on Medium
 - [Incentivising participation and growth in communities (using crypto-economics)](https://medium.com/@mrdavey/incentivising-participation-and-growth-in-communities-using-crypto-economics-5a369dd7f5fc)
  - [Dynamic Token Bonding Curves](https://medium.com/@mrdavey/dynamic-token-bonding-curves-41d36e43befa)

_Note: I'm not a web developer so this is the first time i've used React, forgive the messy front-end code._

### What is Khana?
Khana is a framework for tokenized community building. It is a framework to incentivise the growth of a community, from communities which are just starting out, to large mature communities. This is not exclusive to online communities.

### How does it work?
##### Community members
Community members can be rewarded, awarded, and incentivised to contribute to the community.
* Rewarded tokens for contributing or participating at community events
* Awarded tokens for completing 'bounties' that the community leaders need completed to help grow the community
* Incentivised with tokens to regularly contribute to the community

##### Community leaders
The community leaders (i.e. admins) 'mint' the tokens and give them to community members. Each 'minting' has an associated reason for minting (e.g. volunteered at Friday's event), which is recorded permanently to IPFS. The IPFS hash of the file is recorded permanently on the Ethereum blockchain via logged events. This serves as an audit trail and ensures responsible minting by community leaders, as anyone can read the audit trail at any time.

##### Value of the token
The economic value of the token comes from ETH stored in a funds contract (BondingCurveFunds.sol), which allows community members to trade in the tokens they have for ETH. The calculation for the ETH returned is based on a simple bonding curve formula which allows liquidity for all community members. This results in the 'token value' being captured by the amount of ETH in the funds contract. If many community members liquidate their tokens and reduce the ETH funds, then the 'token value' is reduced, indicating the economic value of the community, as perceived by the community.

Where does the ETH come from? This should come from activity of the community. For example, a portion of ticket sales, sponsorships, or donations could be directly sent to the funds contract.

There is also the non-economic value of the token, which can be acknowledged by the community in various ways. E.g. community token leaderboards, invites to exclusive events for community members with tokens above a certain threshold, trading tokens for services of the community, etc.

##### The effect of the funds contract
One of the problems when building a community is how to incentivise participation and contributions from community members. With Khana, community members are incentivised by the token, which will increase in economic value if the activities of the community grows. If life gets in the way and a community member can no longer contribute, they still retain their tokens and can receive some of the future value if they trade their tokens into the bonding curve.
Due to the new minting of tokens, we create an 'inflation penalty' or tax for non-active members. For example, an early contributor may hold a large portion of the token supply early on, but if they are in-active, then their portion of the supply will reduce as more tokens are minted. This results in a dynamic which fairly rewards early contributors and at the same time, rewards new contributors with the expanding supply.
A basic simulation of token dynamics can be found here: https://goo.gl/jeJkV5

## How to setup
Requirements:
* node
* npm
* ganache-cli
* truffle
* metamask

#### Steps to run locally
1. In the project directory: `npm install`
2. Run ganache: `ganache-cli`
    * take note of the accounts and private keys (especially the first one)
3. In a new terminal window
    * go to the project directory
    * open truffle console: `truffle console`
    * compile contracts: `compile`
    * migrate contracts onto ganache: `migrate` (if any errors, then force a reset with `migrate --reset`)
4. In another terminal window: `npm run start`
5. Open the metamask plugin and select the relevant private network (the one on port 8545). This will connect your metamask with your ganache instance. If you don't see it there, then add a Custom RPC with URL `127.0.01:8545`
6. Once you've connected, make sure you add the ganache accounts to metamask by importing the private keys. The first account listed in ganache is the default owner and admin.

#### Steps to run on Rinkeby
1. In the project directory: `npm install`
2. Run the front end: `npm run start`.
3. Connect MetMask to the Rinkeby network by selecting it in the MetaMask dropdown.
4. Message me on [Twitter](https://twitter.com/daveytea) with your Rinkeby address and i'll mint you some KHNA tokens.
    * Also let me know if you'd like to be an admin with another Rinkeby address, so you can mint your own.

#### Running tests
Navigate to the project directory and in terminal: `truffle test`

## Misc
* A discussion on Khana's [design pattern decisions here](https://github.com/mrdavey/KhanaFramework/blob/master/Khana%20POC/design_pattern_desicions.md)
* A discussion on [avoiding common solidity attacks here](https://github.com/mrdavey/KhanaFramework/blob/master/Khana%20POC/avoiding_common_attacks.md)
* Tests are [here](https://github.com/mrdavey/KhanaFramework/tree/master/Khana%20POC/test) and should be self explanatory
* The main token contract is [here](https://github.com/mrdavey/KhanaFramework/blob/master/Khana%20POC/contracts/KhanaToken.sol)
* The funds contract is [here](https://github.com/mrdavey/KhanaFramework/blob/master/Khana%20POC/contracts/BondingCurveFunds.sol)
* The simple bonding curve calculation is [here](https://github.com/mrdavey/KhanaFramework/blob/03a96a0a5d9535c53daf961e745d760e5e08c9ca/Khana%20POC/contracts/KhanaToken.sol#L198)
* IPFS file creation/modification/upload is done via the front end in [App.js](https://github.com/mrdavey/KhanaFramework/blob/master/Khana%20POC/src/App.js). Discussion of why this works [here](https://github.com/mrdavey/KhanaFramework/blob/master/Khana%20POC/design_pattern_desicions.md#storage-of-audit-records-in-ipfs).
* Discussion of dynamic token bonding curves to be implemented [here](https://medium.com/@mrdavey/dynamic-token-bonding-curves-41d36e43befa)


😇🤗📈

## Current deployments
*subject to regular changes

### KhanaToken Rinkeby
This is the proof of concept, used for testing and showing the concept.

[Basic front end](http://khana.io/app/) - requires either Metamask or viewing via Web3 compatible app (Status / Coinbase wallet)

[KhanaToken contract](https://rinkeby.etherscan.io/address/0xafcb7969c32e213ab5482c972f151154c1a73f77)

[BondingCurve contract](https://rinkeby.etherscan.io/address/0x7b12642dfc0a675f2c6edc6515a2b5e6a1003972)

### BlockDam Token Rinkeby
This is a pilot project for the [BlockDam commmunity](https://www.meetup.com/Permissionless-Society/), based in Amsterdam.

[Basic front end](http://khana.io/app/blockdam) - requires either Metamask or viewing via Web3 compatible app (Status / Coinbase wallet)

[BlockDam contract](https://rinkeby.etherscan.io/address/0xafcb7969c32e213ab5482c972f151154c1a73f77)

[BondingCurve contract](https://rinkeby.etherscan.io/address/0x7b12642dfc0a675f2c6edc6515a2b5e6a1003972)

