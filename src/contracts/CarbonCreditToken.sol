// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract CarbonCreditToken is ERC20, Ownable, ReentrancyGuard {
    // Credit types and their prices
    struct CreditType {
        uint256 price;     // Price in wei per token
        bool isActive;     // Whether this credit type can be purchased
        string metadata;   // IPFS hash containing project details
    }

    mapping(bytes32 => CreditType) public creditTypes;
    mapping(address => bool) public verifiers;

    event CreditTypeListed(bytes32 indexed creditTypeId, uint256 price, string metadata);
    event CreditsPurchased(address indexed buyer, bytes32 indexed creditTypeId, uint256 amount);
    event VerifierAdded(address indexed verifier);
    event VerifierRemoved(address indexed verifier);

    constructor() ERC20("Carbon Credit Token", "CCT") Ownable(msg.sender) {}

    // Modifier to check if caller is a verifier
    modifier onlyVerifier() {
        require(verifiers[msg.sender], "Caller is not a verifier");
        _;
    }

    // Add or update a credit type
    function listCreditType(
        bytes32 creditTypeId,
        uint256 price,
        string calldata metadata
    ) external onlyVerifier {
        creditTypes[creditTypeId] = CreditType({
            price: price,
            isActive: true,
            metadata: metadata
        });

        emit CreditTypeListed(creditTypeId, price, metadata);
    }

    // Purchase carbon credits
    function purchaseCredits(
        bytes32 creditTypeId,
        uint256 amount
    ) external payable nonReentrant {
        CreditType storage creditType = creditTypes[creditTypeId];
        require(creditType.isActive, "Credit type not active");
        
        uint256 totalPrice = creditType.price * amount;
        require(msg.value >= totalPrice, "Insufficient payment");

        // Mint new tokens to the buyer
        _mint(msg.sender, amount);

        // Refund excess payment
        if (msg.value > totalPrice) {
            (bool success, ) = payable(msg.sender).call{value: msg.value - totalPrice}("");
            require(success, "Refund failed");
        }

        emit CreditsPurchased(msg.sender, creditTypeId, amount);
    }

    // Add a verifier
    function addVerifier(address verifier) external onlyOwner {
        verifiers[verifier] = true;
        emit VerifierAdded(verifier);
    }

    // Remove a verifier
    function removeVerifier(address verifier) external onlyOwner {
        verifiers[verifier] = false;
        emit VerifierRemoved(verifier);
    }

    // Withdraw contract balance
    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No balance to withdraw");
        
        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "Withdrawal failed");
    }

    // Check if a credit type exists and is active
    function isCreditTypeActive(bytes32 creditTypeId) external view returns (bool) {
        return creditTypes[creditTypeId].isActive;
    }

    // Get credit type details
    function getCreditType(bytes32 creditTypeId) external view returns (
        uint256 price,
        bool isActive,
        string memory metadata
    ) {
        CreditType storage creditType = creditTypes[creditTypeId];
        return (creditType.price, creditType.isActive, creditType.metadata);
    }
}