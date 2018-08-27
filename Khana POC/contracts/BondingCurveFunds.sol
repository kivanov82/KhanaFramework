pragma solidity ^0.4.24;

import 'openzeppelin-solidity/contracts/ownership/Ownable.sol';

/**
 * @title Proof of Concept contract for the Funds contract
 * @author David Truong <david@truong.vc>
 * @dev This contract is meant to ONLY hold and send ETH funds (or maybe an
 * alternative token in the future). This is to isolate funds from logic and
 * increase safety and upgradability.
 */

contract BondingCurveFunds is Ownable {

    address public tokenContract;
    bool public contractEnabled = true;

    event LogContractDisabled();
    event LogContractEnabled();
    event LogTokenContractChanged(
        address indexed fromAccount,
        address indexed oldAddress,
        address indexed newAddress
        );
    event LogFundingReceived(
        address indexed account,
        uint amount
        );
    event LogEthSent(
        uint256 amount,
        address indexed account
        );

    /**
     * @dev Throws if called when contract has been disabled via 'emergencyStop()'.
     */
    modifier contractIsEnabled() {
        require(contractEnabled);
        _;
    }

    /**
     * @dev Throws if not called from the authorised token contract.
     */
    modifier onlyTokenContract() {
        require(msg.sender == tokenContract);
        _;
    }

    /**
     * @dev Throws if not called from the authorised token contract or owner.
     */
    modifier onlyTokenContractOrOwner() {
        require(msg.sender == tokenContract || msg.sender == owner);
        _;
    }

    /**
     * @dev The owner is automatically set by Ownable.sol.
     * @param _tokenAddress The address of the token contract associated with
     * this funds contract
     */
    constructor(address _tokenAddress) public {
        tokenContract = _tokenAddress;
        emit LogTokenContractChanged(msg.sender, address(0), _tokenAddress);
    }

    /**
     * @dev The fallback function, which is used to 'fund' the bonding curve for
     * liquidity of the token.
     * @notice Anyone can fund the token contract with ETH to increase the 'pot'
     * associated with the token. However this would normally be done by the
     * community organisers, who may send a portion of sponsorship money or ticket
     * sales from community organised events.
     */
    function () public payable contractIsEnabled {
        emit LogFundingReceived(msg.sender, msg.value);
    }

    /**
     * @dev Send ETH from this funds contract to the relevant account
     * @notice This function is protected by the modifiers, ensuring only the
     * authorised tokenContract can call this function.
     * @param _amount The amount of ETH to send in wei.
     * @param _account The account address to send the ETH to.
     */
    function sendEth(uint256 _amount, address _account) public onlyTokenContract contractIsEnabled {
        _account.transfer(_amount);
        emit LogEthSent(_amount, _account);
    }

    /**
     * @dev Change the token contract associated with this funds contract.
     * @param _tokenAddress The address of the token contract associated with
     * this funds contract
     */
    function setTokenContract(address _tokenAddress) public onlyOwner contractIsEnabled {
        address oldAddress = tokenContract;
        tokenContract = _tokenAddress;
        emit LogTokenContractChanged(msg.sender, oldAddress, _tokenAddress);
    }

    /**
     * @dev An emergency stop for funding and withdrawing from the contracts.
     * @return A bool indicating if the emergency stop was successful.
     */
    function emergencyStop() public onlyTokenContractOrOwner contractIsEnabled returns (bool) {
        contractEnabled = false;
        emit LogContractDisabled();
        return true;
    }

    /**
     * @dev Restore contract.
     * @return A bool indicating if the restoring was successful.
     */
    function resumeContract() public onlyTokenContractOrOwner returns (bool) {
        contractEnabled = true;
        emit LogContractEnabled();
        return true;
    }

    /**
     * @dev Return the value for the token contract address
     * @return The address of the token contract address
     */
    function getTokenAddress() public view returns (address) {
        return tokenContract;
    }
}
