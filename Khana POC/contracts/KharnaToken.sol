pragma solidity ^0.4.24;

import 'openzeppelin-solidity/contracts/token/ERC20/MintableToken.sol';

contract KharnaToken is MintableToken {

    string public name = "KharnaToken";
    string public symbol = "KRNA";
    uint8 public decimals = 2;
    uint public INITIAL_SUPPLY = 500;

    constructor() public {
        mint(msg.sender, INITIAL_SUPPLY);
    }

    function award(address _account, uint256 _amount) public {
        mint(_account, _amount);
    }

    function emergencyStop() public returns (bool) {
        return finishMinting();
    }

    function resumeMinting() public onlyOwner returns (bool) {
        mintingFinished = false;
    }

    function getSupply() public view returns (uint256) {
        return totalSupply();
    }

    function burn(address _account, uint256 _amount) public {
        _burn(_account, _amount);
    }
}
