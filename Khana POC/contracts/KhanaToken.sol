pragma solidity ^0.4.24;

import 'openzeppelin-solidity/contracts/token/ERC20/MintableToken.sol';

/**
 * @title Proof of Concept contract for the Khana framework
 * @author David Truong <david@truong.vc>
 * @dev This is a mintable token with a group of admins who can mint them (i.e.
 * award them) to community members, along with recording the IPFS hash of the
 * latest audit logs.
 */

contract KhanaToken is MintableToken {

    string public name = "KhanaToken";
    string public symbol = "KHNA";
    uint8 public decimals = 18;
    uint public INITIAL_SUPPLY = 500000000000000000000;

    mapping (address => bool) public adminAccounts;

    event MintingEnabled();
    event AdminAdded();
    event AdminRemoved();
    event Awarded(
        address indexed awardedTo,
        address indexed minter,
        uint amount,
        string ipfsHash
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
     * @dev The core of the contract, award tokens with relevant audit information.
     * @notice The IPFS hash should always be included with any reward of tokens,
     * to ensure auditing of the minting process can be done at anytime in the future.
     * The event emitted must also specify the IPFS hash so that it is permanently
     * recorded on the blockchain, and that the IPFS hash related to the most up
     * to date audit log can be found easily.
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
    {
        mint(_account, _amount);
        emit Awarded(_account, msg.sender, _amount, _ipfsHash);
    }

    /**
     * @dev An emergency stop for minting that can only be called by the admins.
     * @notice This is an alternative to 'finishMinting()' in MintableToken.sol
     * to enable admins to stop the minting process (not just the owner).
     * @return A bool indicating if the emergency stop was successful.
     */
    // override onlyOwner in mintableToken
    function emergencyStop() public onlyAdmins canMint returns (bool) {
        mintingFinished = true;
        emit MintFinished();
        return true;
    }

    /**
     * @dev Restore minting ability for all admins.
     * @return A bool indicating if the resuming of minting was successful.
     */
    function resumeMinting() public onlyAdmins returns (bool) {
        mintingFinished = false;
        emit MintingEnabled();
        return true;
    }

    /**
     * @dev Add an admin.
     * @param _account The address of the new admin.
     */
    function addAdmin(address _account) public onlyAdmins {
        adminAccounts[_account] = true;
        emit AdminAdded();
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
        emit AdminRemoved();
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
