import { ethers } from 'ethers';

// Updated ABI to match our new contract
export const CARBON_CREDIT_ABI = [
  // ERC20 functions
  "function balanceOf(address owner) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  
  // Custom contract functions
  "function purchaseCredits(bytes32 creditTypeId, uint256 amount) payable",
  "function getCreditType(bytes32 creditTypeId) view returns (uint256 price, bool isActive, string memory metadata)",
  "function isCreditTypeActive(bytes32 creditTypeId) view returns (bool)",
  
  // Events
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event CreditsPurchased(address indexed buyer, bytes32 indexed creditTypeId, uint256 amount)"
];

// Replace with your deployed contract address
export const CARBON_CREDIT_ADDRESS = "0x0000000000000000000000000000000000000000";

export async function connectWallet(): Promise<string> {
  if (!window.ethereum) {
    throw new Error("MetaMask is not installed");
  }

  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const accounts = await provider.send("eth_requestAccounts", []);
    return accounts[0];
  } catch (error) {
    console.error("Error connecting wallet:", error);
    throw error;
  }
}

export async function purchaseCredits(creditTypeId: string, amount: number, price: number) {
  if (!window.ethereum) {
    throw new Error("MetaMask is not installed");
  }

  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const contract = new ethers.Contract(CARBON_CREDIT_ADDRESS, CARBON_CREDIT_ABI, signer);

    // Calculate total price in wei
    const totalPrice = ethers.parseEther((price * amount).toString());

    // Purchase transaction
    const tx = await contract.purchaseCredits(
      ethers.id(creditTypeId), // Convert string to bytes32
      amount,
      { value: totalPrice }
    );
    await tx.wait();

    return tx.hash;
  } catch (error) {
    console.error("Error purchasing credits:", error);
    throw error;
  }
}

export async function getWalletBalance(address: string): Promise<string> {
  if (!window.ethereum) {
    throw new Error("MetaMask is not installed");
  }

  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const contract = new ethers.Contract(CARBON_CREDIT_ADDRESS, CARBON_CREDIT_ABI, provider);
    const balance = await contract.balanceOf(address);
    return ethers.formatUnits(balance, 18);
  } catch (error) {
    console.error("Error getting balance:", error);
    throw error;
  }
}

export async function getCreditTypeDetails(creditTypeId: string) {
  if (!window.ethereum) {
    throw new Error("MetaMask is not installed");
  }

  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const contract = new ethers.Contract(CARBON_CREDIT_ADDRESS, CARBON_CREDIT_ABI, provider);
    const details = await contract.getCreditType(ethers.id(creditTypeId));
    return {
      price: ethers.formatEther(details.price),
      isActive: details.isActive,
      metadata: details.metadata
    };
  } catch (error) {
    console.error("Error getting credit type details:", error);
    throw error;
  }
}