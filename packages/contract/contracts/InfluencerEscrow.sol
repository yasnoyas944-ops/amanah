// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title InfluencerEscrow
 * @dev Escrow contract for holding funds until content verification is simulated/confirmed by an Oracle.
 */
contract InfluencerEscrow {
    struct Campaign {
        address brand;
        address influencer;
        uint256 amount;
        string requirements; // e.g. "@BrandTag #Campaign2024"
        bool isReleased;
        bool isLocked;
    }

    uint256 public campaignCount;
    mapping(uint256 => Campaign) public campaigns;
    
    address public oracle; // The "AI Agent" (or Admin for demo)

    event CampaignCreated(uint256 indexed campaignId, address indexed brand, address indexed influencer, uint256 amount, string requirements);
    event FundsReleased(uint256 indexed campaignId, address indexed influencer, uint256 amount);

    modifier onlyOracle() {
        require(msg.sender == oracle, "Only Oracle can verify");
        _;
    }

    constructor() {
        oracle = msg.sender;
    }

    // 1. Brand locks funds (BNB for simplicity, can handle tokens too)
    function createCampaign(address _influencer, string memory _requirements) external payable {
        require(msg.value > 0, "Must lock funds");
        require(_influencer != address(0), "Invalid influencer");

        campaignCount++;
        campaigns[campaignCount] = Campaign({
            brand: msg.sender,
            influencer: _influencer,
            amount: msg.value,
            requirements: _requirements,
            isReleased: false,
            isLocked: true
        });

        emit CampaignCreated(campaignCount, msg.sender, _influencer, msg.value, _requirements);
    }

    // 2. Oracle (AI Agent) verifies post and releases funds
    // Check http status, content match off-chain, then call this.
    function verifyAndRelease(uint256 _campaignId) external onlyOracle {
        Campaign storage c = campaigns[_campaignId];
        require(c.isLocked, "Campaign not found or already closed");
        require(!c.isReleased, "Funds already released");

        c.isReleased = true;
        c.isLocked = false;

        // Transfer funds to influencer
        (bool sent, ) = c.influencer.call{value: c.amount}("");
        require(sent, "Failed to send BNB");

        emit FundsReleased(_campaignId, c.influencer, c.amount);
    }

    // Safety: Allow brand to withdraw if verification fails/times out (simplified)
    function refund(uint256 _campaignId) external {
        Campaign storage c = campaigns[_campaignId];
        require(msg.sender == c.brand, "Only brand can refund");
        require(c.isLocked, "Not locked");
        require(!c.isReleased, "Already released");

        c.isLocked = false;
        (bool sent, ) = c.brand.call{value: c.amount}("");
        require(sent, "Refund failed");
    }
}
