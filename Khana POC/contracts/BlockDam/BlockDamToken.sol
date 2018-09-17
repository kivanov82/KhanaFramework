pragma solidity ^0.4.24;

import "../KhanaToken.sol";

/**
 * @title Proof of Concept contract for the Khana framework, for BlockDam community
 * @author David Truong <david@truong.vc>
 * @dev This is one of the first prototype deployments of Khana for the BlockDam community
 * For more information, see: https://www.meetup.com/Permissionless-Society/
 */

contract BlockDamToken is KhanaToken {
    string public name = "BlockDam";
    string public symbol = "BCD";
    uint8 public decimals = 18;
}
