
const CONTRACT_ADDRESS = "0x542c62C8E364ba7735a69a47488E617FDAa7E4b9";

// ABI for the Bank6609 contract
const CONTRACT_ABI = [
    "function deposit() payable",
    "function withdraw(uint256 amount)",
    "function checkBlance() view returns (uint256 balance)",
    "event Deposit(address indexed owner, uint256 amount)",
    "event Withdraw(address indexed owner, uint256 amount)"
];

let provider;
let signer;
let contract;

const connectButton = document.getElementById("connectButton");
const checkBalanceButton = document.getElementById("checkBalanceButton");
const walletAddress = document.getElementById("walletAddress");
const balanceDisplay = document.getElementById("balance");
const statusMessage = document.getElementById("statusMessage");

function showStatus(message, type = "secondary") {
    statusMessage.textContent = message;
    statusMessage.className = `alert alert-${type} mb-0`;
}

function getErrorMessage(error) {
    if (error.code === 4001) {
        return "Transaction rejected in MetaMask.";
    }

    return error.shortMessage || error.reason || error.message ||
        "Something went wrong.";
}

// 1. Connect MetaMask
async function connectWallet() {
    try {
        if (!window.ethereum) {
            throw new Error(
                "MetaMask not found. Please install the MetaMask extension."
            );
        }

        showStatus("Connecting to MetaMask...", "info");

        provider = new ethers.BrowserProvider(window.ethereum);

        await provider.send("eth_requestAccounts", []);

        signer = await provider.getSigner();

        contract = new ethers.Contract(
            CONTRACT_ADDRESS,
            CONTRACT_ABI,
            signer
        );

        const address = await signer.getAddress();

        walletAddress.textContent = address;

        connectButton.textContent =
            `${address.slice(0, 6)}...${address.slice(-4)}`;

        connectButton.classList.remove("btn-primary");
        connectButton.classList.add("btn-success");

        showStatus("Wallet connected successfully.", "success");

        await checkBalance();
    } catch (error) {
        showStatus(getErrorMessage(error), "danger");
    }
}

// 2. Check the connected user's bank balance
async function checkBalance() {
    try {
        if (!contract) {
            throw new Error("Please connect MetaMask first.");
        }

        const balanceWei = await contract.checkBlance();

        // Convert wei to ETH without losing precision during conversion
        const balanceEth = ethers.formatEther(balanceWei);

        balanceDisplay.textContent = `${balanceEth} ETH`;

        showStatus("Balance loaded successfully.", "success");
    } catch (error) {
        showStatus(getErrorMessage(error), "danger");
    }
}

// 3. Deposit ETH
async function deposit(event) {
    event.preventDefault();

    try {
        if (!contract) {
            throw new Error("Please connect MetaMask first.");
        }

        const input = document.getElementById("depositAmount").value.trim();

        if (!input || !Number.isFinite(Number(input)) || Number(input) <= 0) {
            throw new Error("Enter a valid deposit amount greater than zero.");
        }

        const amountWei = ethers.parseEther(input);

        if (amountWei <= 0n) {
            throw new Error("Deposit amount must be greater than zero.");
        }

        showStatus("Confirm the deposit in MetaMask...", "info");

        const tx = await contract.deposit({
            value: amountWei
        });

        showStatus("Deposit submitted. Waiting for confirmation...", "info");

        await tx.wait();

        document.getElementById("depositForm").reset();

        await checkBalance();

        showStatus("Deposit successful!", "success");
    } catch (error) {
        showStatus(getErrorMessage(error), "danger");
    }
}

// 4. Withdraw ETH
async function withdraw(event) {
    event.preventDefault();

    try {
        if (!contract) {
            throw new Error("Please connect MetaMask first.");
        }

        const input = document.getElementById("withdrawAmount").value.trim();

        if (!input || !Number.isFinite(Number(input)) || Number(input) <= 0) {
            throw new Error("Enter a valid withdrawal amount greater than zero.");
        }

        // Contract expects the amount in wei, not ETH
        const amountWei = ethers.parseEther(input);

        if (amountWei <= 0n) {
            throw new Error("Withdrawal amount must be greater than zero.");
        }

        showStatus("Confirm the withdrawal in MetaMask...", "info");

        const tx = await contract.withdraw(amountWei);

        showStatus("Withdrawal submitted. Waiting for confirmation...", "info");

        await tx.wait();

        document.getElementById("withdrawForm").reset();

        await checkBalance();

        showStatus("Withdrawal successful!", "success");
    } catch (error) {
        showStatus(getErrorMessage(error), "danger");
    }
}

// Button and form events
connectButton.addEventListener("click", connectWallet);
checkBalanceButton.addEventListener("click", checkBalance);

document.getElementById("depositForm")
    .addEventListener("submit", deposit);

document.getElementById("withdrawForm")
    .addEventListener("submit", withdraw);

// Refresh the page when the MetaMask account or network changes
if (window.ethereum) {
    window.ethereum.on("accountsChanged", () => {
        window.location.reload();
    });

    window.ethereum.on("chainChanged", () => {
        window.location.reload();
    });
}
