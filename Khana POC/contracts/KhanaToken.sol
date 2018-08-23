pragma solidity ^0.4.24;

import 'openzeppelin-solidity/contracts/token/ERC20/MintableToken.sol';

contract KhanaToken is MintableToken {

    string public name = "KhanaToken";
    string public symbol = "KHNA";
    uint8 public decimals = 18;
    uint public INITIAL_SUPPLY = 500000000000000000000;

    event Awarded(address accountAddress, uint amount);
    event MintingEnabled();

    constructor() public {
        mint(msg.sender, INITIAL_SUPPLY);
    }

    function award(address _account, uint256 _amount) public {
        mint(_account, _amount);
        emit Awarded(_account, _amount);
    }

    // TODO: - Should only allow 'admins' to stop and resume

    function emergencyStop() public returns (bool) {
        return finishMinting();
    }

    function resumeMinting() public onlyOwner returns (bool) {
        mintingFinished = false;
        emit MintingEnabled();
        return true;
    }

    function getSupply() public view returns (uint256) {
        return totalSupply();
    }

    // Not sure if we enable this
    function burn(address _account, uint256 _amount) public {
        _burn(_account, _amount);
    }
}
