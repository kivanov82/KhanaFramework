# Design Pattern Decisions

### Emergency stop
An emergency stop is implemented in the contracts. This allows admins (not only the owner of the contracts) to stop the operations of the contract at any time. While the emergency stop is activated, some changes to the contract state can still be made such as adding/removing admins, changing the funds address, or burning tokens.

### Upgradeable contracts
The token contract is separate from the funds contract. This is to ensure that both contracts can be upgraded at some time in the future, without compromising or locking either contract state.

For example, we can upgrade KhanaToken.sol, deploy it to the blockchain, then have the owner of BondingCurveFunds.sol call `setTokenContract()` to set the new associated token contract. This ensures that the funds are safe and won't be locked to an outdated token contract.

Similarly, we can upgrade BondingCurveFunds.sol, deploy it to the blockchain, and have the owner of KhanaToken.sol call `setFundsContract()` to set the new associated funds contract.

In this way, both contracts can be perpetually upgraded into the future since both are replaceable.

### Multiple admins
The KhanaToken.sol contract has multiple admins to allow multiple community leaders to award tokens and perform 'admin' related tasks. However very sensitive operations are only executable by the owner of the contract (for now).

### `onlyTokenContract` modifier in BondingCurveFunds.sol
This modifier ensures that only the approved token contract is able to withdraw ETH from the BondingCurveFunds.sol contract. We do not want admins being able to withdraw ETH from the contract.

### Funding BondingCurveFunds.sol
Both contracts are `payable`, however all funds received end up in the BondingCurveFunds.sol contract. This is to allow multiple ways to fund the bonding curve and to ensure accidental ETH transactions to KhanaToken.sol end up in BondingCurveFunds.sol.

### Storage of audit records in IPFS
Audit records are stored in IPFS, with the IPFS hash recorded in `LogAwarded()` event in KhanaToken.sol.

It would have been possible to store the IPFS hash directly in the blockchain state, however this would be a very costly operation and as the audit logs grow, would become expensive to maintain. Recording it in the emitted events allows us to still permanently record the IPFS hash associated with a transaction, but with minimal cost and bloat added to the blockchain.

Since only admins can mint tokens, only the most recent legitimate IPFS hash will be recorded in the event logs. Therefore at anytime, anyone can transverse the event logs to get the most recent hash, then audit the minting logs. If an admin is compromised and deletes entries from the audit logs, then we can still transverse the event logs to find the minting log before the compromise happened.

Although the IPFS files are garbage collected, we can solve this easily by running our own IPFS node and pinning the files. Different communities (or any individual) can also do the same, ensuring permanent storage of audit logs.
