pragma solidity ^0.4.24;

import 'openzeppelin-solidity/contracts/token/ERC20/MintableToken.sol';
import "openzeppelin-solidity/contracts/math/SafeMath.sol";

/**
 * @title Proof of Concept contract for the Khana framework
 * @author David Truong <david@truong.vc>
 * @dev This is a mintable token with a group of admins who can mint them (i.e.
 * award them) to community members, along with recording the IPFS hash of the
 * latest audit logs.
 */

contract KhanaToken is MintableToken {
    using SafeMath for uint256;

    string public name = "KhanaToken";
    string public symbol = "KHNA";
    uint8 public decimals = 18;
    uint public INITIAL_SUPPLY = 500000000000000000000;
    uint public minimumEthBalance = 1000000000000000000; // Minimum ETH contract should have

    bool public contractEnabled = true;

    mapping (address => bool) public adminAccounts;

    event LogContractDisabled();
    event LogContractEnabled();
    event LogAdminAdded(address indexed account);
    event LogAdminRemoved(address indexed account);
    event LogAwarded(
        address indexed awardedTo,
        address indexed minter,
        uint amount,
        string ipfsHash
    );
    event LogSell(
        address sellingAccount,
        uint256 sellAmount,
        uint256 ethReceived
    );

    /**
     * @dev The owner is automatically set by Ownable.sol. The owner is also added
     * as an admin.
     */
    constructor() public {
        adminAccounts[msg.sender] = true;
        mint(msg.sender, INITIAL_SUPPLY);
    }

    /**
     * @dev Throws if called by a non-admin account.
     */
    modifier onlyAdmins() {
        require(adminAccounts[msg.sender] == true);
        _;
    }

    /**
     * @dev Throws if called by a non-admin account.
     * @notice This modifier overrides the modifier of the same name in
     * MintableToken.sol. We want to keep the safety of Zeppelin's mintableToken,
     * but expand the usecase slightly with more admins with mint permissions.
     */
    modifier hasMintPermission() {
        require(adminAccounts[msg.sender] == true);
        _;
    }

    /**
     * @dev Throws if called when contract has been disabled via 'emergencyStop()'.
     */
    modifier contractIsEnabled() {
        require(contractEnabled);
        _;
    }

    /**
     * @dev The fallback function, which is also used to 'fund' the token for
     * liquidity of the token (see 'sell' function).
     * @notice Anyone can fund the token contract with ETH to increase the 'pot'
     * associated with the token. However this would normally be done by the
     * community organisers, who may send a portion of sponsorship money or ticket
     * sales from community organised events.
     */
    function () public contractIsEnabled payable { }

    /**
     * @dev Award tokens to users with relevant audit information in an IPFS file.
     * @notice The IPFS hash should always be included with any reward of tokens,
     * to ensure auditing of the minting process can be done at anytime in the future.
     * The event emitted must also specify the IPFS hash so that it is permanently
     * recorded on the blockchain, and that the IPFS hash related to the most up
     * to date audit log can be found easily.
     * We do not want to record the IPFS hashes in an array on the blockchain as
     * it would end up costing too much, hence we 'store' them in emitted event logs.
     * @param _account The address of the user to awarded.
     * @param _amount The amount to be awarded.
     * @param _ipfsHash The IPFS hash of the latest audit log, which includes the
     * details and reason for the current award of tokens.
     */
    function award(
        address _account,
        uint256 _amount,
        string _ipfsHash
    )
        public
        onlyAdmins
        contractIsEnabled
    {
        mint(_account, _amount);
        emit LogAwarded(_account, msg.sender, _amount, _ipfsHash);
    }

    /**
     * @dev Allow token holders to sell their tokens in return for ETH.
     * @notice At the moment the calculation for how much ETH is returned is very
     * simplistic. Depending on the portion of the supply they hold, they can
     * liquidate a larger amount of the ETH 'pot', to a maximum of 50% of the pot.
     * E.g. User A holds 25% of the supply and the ETH pot is 100 ETH. Therefore
     * they can sell all their tokens for a maximum amount of 12.5 ETH.
     * (0.25 * 0.5 * 100 = 12.5 ETH) See 'whitepaper' for more details around
     * game theory and how this may work as an incentive mechanism. This will
     * likely change in the near future to a bonding curve implementation.
     * @param _amount The amount to sell.
     */
    function sell(uint256 _amount) public contractIsEnabled returns (bool) {
        uint256 tokenBalanceOfSender = balanceOf(msg.sender);
        require(_amount > 0 && tokenBalanceOfSender >= _amount);

        uint256 redeemableEth = calculateSellReturn(_amount, tokenBalanceOfSender);
        _burn(msg.sender, _amount);
        msg.sender.transfer(redeemableEth);

        emit LogSell(msg.sender, _amount, redeemableEth);

        return true;
    }

    /**
     * @dev Allow token hold to calculate the potential ETH return they will receive
     * from selling a certain amount of tokens.
     * @notice This is also used in the 'sell' function. See above for discussion.
     * @param _sellAmount The amount of tokens to sell.
     * @param _tokenBalance Their entire token balance.
     */
    function calculateSellReturn(uint256 _sellAmount, uint256 _tokenBalance) public view returns (uint256) {
        require(address(this).balance >= minimumEthBalance);
        require(_tokenBalance >= _sellAmount);

        uint256 tokenSupply = getSupply();

        // EVM doesn't deal with floating points well, so multiple and divide by
        // 10e18 to retain accuracy
        uint256 multiplier = 10**18;

        // User can redeem a maximum 50% of the 'pot' if they own 100% of the supply
        uint256 maxRedeemableEth = address(this).balance.div(2);

        // Essentially ((tokens i have) / (total supply)) * (ETH in contract * 0.5),
        // using a multiplier due to EVM constraints
        uint256 redeemableEth = (_sellAmount.mul(multiplier).div(tokenSupply).mul(maxRedeemableEth)).div(multiplier);

        return redeemableEth;
    }

    /**
     * @dev An emergency stop for minting that can only be called by the admins.
     * @notice This is an alternative to 'finishMinting()' in MintableToken.sol
     * to enable admins to stop the minting process (not just the owner).
     * @return A bool indicating if the emergency stop was successful.
     */
    // override onlyOwner in mintableToken
    function emergencyStop() public onlyAdmins contractIsEnabled returns (bool) {
        contractEnabled = false;
        emit LogContractDisabled();
        return true;
    }

    /**
     * @dev Restore minting ability for all admins.
     * @return A bool indicating if the resuming of minting was successful.
     */
    function resumeContract() public onlyAdmins returns (bool) {
        contractEnabled = true;
        emit LogContractEnabled();
        return true;
    }

    /**
     * @dev Add an admin.
     * @param _account The address of the new admin.
     */
    function addAdmin(address _account) public onlyAdmins {
        adminAccounts[_account] = true;
        emit LogAdminAdded(_account);
    }

    /**
     * @dev Remove an admin.
     * @notice The original owner (i.e. contract creator) should always have the
     * power to restore things, so cannot be removed as an admin. If the owner
     * role needs to be transfered, then call 'transferOwnership()' in Ownable.sol.
     * @param _account The address of the admin to be removed.
     */
    function removeAdmin(address _account) public onlyAdmins {
        require(_account != owner);
        adminAccounts[_account] = false;
        emit LogAdminRemoved(_account);
    }

    /**
     * @dev Check if a user is an admin.
     * @param _account The address of the user to check.
     * @return A bool indicating if the specified account is an admin.
     */
    function checkIfAdmin(address _account) public view returns (bool) {
        return adminAccounts[_account];
    }

    /**
     * @dev Burn tokens from a specific account.
     * @notice This should be used very carefully, as it will affect the audit
     * trail being saved in IPFS and the trust in being awarded the tokens.
     * Still not sure if this function will remain enabled in future versions.
     * For now, only the owner can burn tokens
     * @param _account The address of the account to burn tokens.
     * @param _amount The amount of tokens to burn.
     */
    function burn(
        address _account,
        uint256 _amount
    ) public onlyOwner {
        _burn(_account, _amount);
    }

    /**
     * @dev Get the total supply of tokens in circulation.
     * @return A uint256 specifying the total supply of tokens.
     */
    function getSupply() public view returns (uint256) {
        return totalSupply();
    }

}
