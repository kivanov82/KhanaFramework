# Avoiding Common Attacks

### OpenZeppelin libraries
We make use of the battle tested OpenZeppelin libraries to form the backbone of our contracts. More specifically, `MintableToken.sol` (and the inherited safe token contracts), `SafeMath.sol`, and `Ownable.sol`.

Not coding everything from scratch ensures we receive the same safety and security of the OpenZeppelin libraries that other larger projects also rely on.

### Preventing buffer over/underflows
All math operations make use of the `SafeMath.sol` library to prevent these attacks.

### Preventing reentrency and other attacks
We make use of the OpenZeppelin libraries, and also ensure that all of our code completes all internal work before calling any external functions.

### Emergency stops and upgrades
We implement an emergency stop mechanism to freeze the contracts during a security incident, with an easy to deploy contract upgrade path if needed.
