import React, { useState, useEffect } from "react";
import {
  TreePine,
  Leaf,
  BarChart3,
  Wallet,
  History,
  Search,
  Filter,
  ArrowUpDown,
  X,
  AlertCircle,
  ChevronUp,
  ChevronDown,
  Loader2,
} from "lucide-react";
import { toast, Toaster } from "react-hot-toast";
import { connectWallet, purchaseCredits, getWalletBalance } from "./lib/web3";

interface CarbonCredit {
  id: string;
  project: string;
  location: string;
  amount: number;
  price: number;
  verified: boolean;
  image: string;
}

interface PurchaseModalProps {
  credit: CarbonCredit;
  onClose: () => void;
  walletAddress: string | null;
}

function PurchaseModal({ credit, onClose, walletAddress }: PurchaseModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const maxQuantity = credit.amount;
  const totalPrice = quantity * credit.price;

  const handleQuantityChange = (value: string) => {
    const newQuantity = parseInt(value);
    if (!isNaN(newQuantity) && newQuantity >= 1 && newQuantity <= maxQuantity) {
      setQuantity(newQuantity);
    }
  };

  const handleIncrement = () => {
    if (quantity < maxQuantity) {
      setQuantity(quantity + 1);
    }
  };

  const handleDecrement = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  const handlePurchase = async () => {
    if (!walletAddress) {
      setError("Please connect your wallet first");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const txHash = await purchaseCredits(quantity, totalPrice);
      toast.success("Purchase successful!");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Transaction failed");
      toast.error("Purchase failed. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Purchase Carbon Credits
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="mb-6">
            <h3 className="font-medium text-gray-900">{credit.project}</h3>
            <p className="text-sm text-gray-500">{credit.location}</p>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quantity (tCO₂e)
            </label>
            <div className="flex items-center">
              <button
                onClick={handleDecrement}
                className="p-2 border border-gray-300 rounded-l-lg hover:bg-gray-50"
                disabled={quantity <= 1}
              >
                <ChevronDown className="h-4 w-4" />
              </button>
              <input
                type="number"
                value={quantity}
                onChange={(e) => handleQuantityChange(e.target.value)}
                min="1"
                max={maxQuantity}
                className="w-20 text-center border-y border-gray-300 py-2 focus:outline-none focus:ring-1 focus:ring-green-600"
              />
              <button
                onClick={handleIncrement}
                className="p-2 border border-gray-300 rounded-r-lg hover:bg-gray-50"
                disabled={quantity >= maxQuantity}
              >
                <ChevronUp className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="mb-6 bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between mb-2">
              <span className="text-gray-600">Price per Credit</span>
              <span className="font-medium">${credit.price.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-semibold">
              <span>Total Price</span>
              <span>${totalPrice.toFixed(2)}</span>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 rounded-lg flex items-start">
              <AlertCircle className="h-5 w-5 text-red-400 mr-2 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <button
            onClick={handlePurchase}
            disabled={isProcessing || !walletAddress}
            className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors disabled:bg-green-400 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Processing...
              </>
            ) : !walletAddress ? (
              "Connect Wallet to Purchase"
            ) : (
              `Purchase Credits for $${totalPrice.toFixed(2)}`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [activeTab, setActiveTab] = useState("marketplace");
  const [selectedCredit, setSelectedCredit] = useState<CarbonCredit | null>(
    null
  );
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [creditBalance, setCreditBalance] = useState<string>("0");

  const handleConnectWallet = async () => {
    try {
      const address = await connectWallet();
      setWalletAddress(address);
      const balance = await getWalletBalance(address);
      setCreditBalance(balance);
      toast.success("Wallet connected successfully!");
    } catch (error) {
      toast.error("Failed to connect wallet");
      console.error(error);
    }
  };

  useEffect(() => {
    // Check if wallet is already connected
    if (window.ethereum?.selectedAddress) {
      setWalletAddress(window.ethereum.selectedAddress);
      getWalletBalance(window.ethereum.selectedAddress).then((balance) =>
        setCreditBalance(balance)
      );
    }

    // Listen for account changes
    if (window.ethereum) {
      window.ethereum.on("accountsChanged", (accounts: string[]) => {
        if (accounts.length > 0) {
          setWalletAddress(accounts[0]);
          getWalletBalance(accounts[0]).then((balance) =>
            setCreditBalance(balance)
          );
        } else {
          setWalletAddress(null);
          setCreditBalance("0");
        }
      });
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener("accountsChanged", () => {});
      }
    };
  }, []);

  const sampleCredits: CarbonCredit[] = [
    {
      id: "CC001",
      project: "Amazon Rainforest Conservation",
      location: "Brazil",
      amount: 1000,
      price: 25.5,
      verified: true,
      image:
        "https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?auto=format&fit=crop&w=800",
    },
    {
      id: "CC002",
      project: "Wind Farm Initiative",
      location: "Denmark",
      amount: 750,
      price: 22.75,
      verified: true,
      image:
        "https://images.unsplash.com/photo-1532601224476-15c79f2f7a51?auto=format&fit=crop&w=800",
    },
    {
      id: "CC003",
      project: "Solar Power Plant",
      location: "UAE",
      amount: 500,
      price: 28.0,
      verified: true,
      image:
        "https://images.unsplash.com/photo-1509391366360-2e959784a276?auto=format&fit=crop&w=800",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />

      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <TreePine className="h-8 w-8 text-green-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">
                Climefy
              </span>
            </div>
            <nav className="flex space-x-8">
              <button
                onClick={() => setActiveTab("marketplace")}
                className={`${
                  activeTab === "marketplace"
                    ? "text-green-600 border-b-2 border-green-600"
                    : "text-gray-500"
                } px-3 py-2 text-sm font-medium`}
              >
                Marketplace
              </button>
              <button
                onClick={() => setActiveTab("portfolio")}
                className={`${
                  activeTab === "portfolio"
                    ? "text-green-600 border-b-2 border-green-600"
                    : "text-gray-500"
                } px-3 py-2 text-sm font-medium`}
              >
                Portfolio
              </button>
              <button
                onClick={() => setActiveTab("analytics")}
                className={`${
                  activeTab === "analytics"
                    ? "text-green-600 border-b-2 border-green-600"
                    : "text-gray-500"
                } px-3 py-2 text-sm font-medium`}
              >
                Analytics
              </button>
            </nav>
            <div className="flex items-center space-x-4">
              {walletAddress && (
                <div className="text-sm">
                  <p className="text-gray-500">Balance</p>
                  <p className="font-medium">{creditBalance} CCT</p>
                </div>
              )}
              <button
                onClick={handleConnectWallet}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <Wallet className="h-4 w-4 mr-2" />
                {walletAddress
                  ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
                  : "Connect Wallet"}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Filter Bar */}
        <div className="mb-8 flex items-center justify-between">
          <div className="relative flex-1 max-w-lg">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-green-600 focus:border-green-600 sm:text-sm"
              placeholder="Search for carbon credits..."
            />
          </div>
          <div className="flex space-x-4">
            <button className="flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </button>
            <button className="flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
              <ArrowUpDown className="h-4 w-4 mr-2" />
              Sort
            </button>
          </div>
        </div>

        {/* Carbon Credits Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {sampleCredits.map((credit) => (
            <div
              key={credit.id}
              className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow"
            >
              <img
                src={credit.image}
                alt={credit.project}
                className="h-48 w-full object-cover"
              />
              <div className="p-6">
                <div className="flex items-center">
                  <Leaf className="h-5 w-5 text-green-600" />
                  <span className="ml-2 text-xs font-medium text-green-600">
                    Verified
                  </span>
                </div>
                <h3 className="mt-2 text-lg font-semibold text-gray-900">
                  {credit.project}
                </h3>
                <p className="mt-1 text-sm text-gray-500">{credit.location}</p>
                <div className="mt-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Available Credits</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {credit.amount.toLocaleString()} tCO₂e
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Price per Credit</p>
                    <p className="text-lg font-semibold text-gray-900">
                      ${credit.price}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedCredit(credit)}
                  className="mt-4 w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors"
                >
                  Purchase Credits
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Purchase Modal */}
      {selectedCredit && (
        <PurchaseModal
          credit={selectedCredit}
          onClose={() => setSelectedCredit(null)}
          walletAddress={walletAddress}
        />
      )}
    </div>
  );
}

export default App;
