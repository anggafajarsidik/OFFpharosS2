# Pharos Season 2 Multi-Task Bot

This bot is designed to automate various tasks on the Pharos testnet network, including Faucet interactions, Daily Check-ins, AquaFlux token claiming and crafting, AquaFlux NFT minting, Primus Tip sending, and AutoStaking Pro operations.

## Features

* **Multi-Account Support**: Process transactions for multiple accounts using different private keys.
* **Proxy Support**: Configure individual proxies for each account for anonymity and load distribution.
* **Automated Faucet**: Automatically get tokens from the Pharos Network faucet.
* **Daily Check-in**: Perform daily check-in operations on the Pharos Network.
* **AquaFlux Tokens & NFTs**:
    * Claim daily C & S tokens from AquaFlux.
    * Craft CS tokens from C & S.
    * Mint AquaFlux NFTs.
* **Primus Tip**: Send tips to randomly selected Primus user IDs.
* **AutoStaking Pro**: Execute tasks related to AutoStaking Pro.
* **Reliable Transaction Handling**: Built-in retry logic for sending and confirming transactions.
* **Dynamic Gas Adjustment**: Adjusts gas prices based on network fee data, with fallback values.
* **Random Delays**: Employs random delays between operations to simulate human behavior.
* **Points Check**: Verifies and displays total points for all accounts after each round of operations.
* **Comprehensive Logging**: Detailed, colored console output to monitor progress and identify issues.
* **Daily Loop Mode**: Automatically runs all configured tasks every 24 hours after initial setup.

## Requirements

* Node.js (v18 or higher recommended)
* pnpm (recommended) or npm

## Installation

1.  **Clone this repository**:
    ```bash
    git clone [https://github.com/your-username/pharos-season-2-multi-task-bot.git](https://github.com/your-username/pharos-season-2-multi-task-bot.git)
    cd pharos-season-2-multi-task-bot
    ```

2.  **Install dependencies**:
    ```bash
    pnpm install
    # or
    npm install
    ```

## Configuration

Create the following files in the project's root directory:

1.  **`YourPrivateKey.txt`**:
    Enter one private key per line. These are the private keys of the accounts the bot will use for transactions.
    ```
    0x123...
    0x456...
    ```

2.  **`proxy.txt` (Optional)**:
    If you want to use proxies, enter one proxy per line. The bot will try to match proxies to private keys based on order (the first private key will use the first proxy, etc.). If no proxies are provided or fewer than private keys, accounts without a proxy will run without one.
    Proxy format: `http://user:pass@ip:port` or `http://ip:port`
    ```
    [http://user1:pass1@192.168.1.1:8080](http://user1:pass1@192.168.1.1:8080)
    [http://user2:pass2@192.168.1.2:8080](http://user2:pass2@192.168.1.2:8080)
    ```

3.  **`usernames.txt` (Optional, required for Primus Tip)**:
    If you intend to perform Primus Tip tasks, enter one Primus user ID per line. The bot will randomly select a user ID from this list for each tip.
    ```
    user_id_1
    user_id_2
    ```

4.  **`abiprimuslabs.json`**:
    This file must contain the ABI (Application Binary Interface) for the Primus Tip contract. Place the `abiprimuslabs.json` file in the same directory as `main.js`. It should be a JSON file containing an array.

## How to Run

1.  Ensure all configuration files (`YourPrivateKey.txt`, `proxy.txt`, `usernames.txt`, `abiprimuslabs.json`) are set up.

2.  Run the script:
    ```bash
    node main.js
    ```

3.  Upon the first run, the bot will prompt you to configure the following parameters in the console:
    * **MINIMUM & MAXIMUM delay between TXs (seconds)**: This will be used for random delays between transactions and operations.
    * **Perform AquaFlux tasks?**: Yes/No. If yes, you'll be asked to enter how many AquaFlux mint operations to attempt per wallet.
    * **Perform Primus Tip tasks?**: Yes/No. If yes, the bot will load user IDs from `usernames.txt`, and you'll be asked to enter how many tips to send per wallet per day.
    * **Perform AutoStaking Pro tasks?**: Yes/No. If yes, you'll be asked to enter how many AutoStaking Pro transactions (login + faucet + approval + multicall) to attempt per wallet.

4.  After the initial configuration, the bot will start processing your accounts in a daily loop mode. It will run all selected tasks for each account, wait for the specified daily interval (default 24 hours), and then repeat.

## Logs

The bot provides detailed console logs with colors to indicate different statuses (success, warning, error).

* `➡️`: General information
* `💰`, `✨`: Balance information
* `🚀`: Transaction sent
* `✅`: Transaction/task successfully confirmed
* `❌`: Transaction/task failed
* `⚠️`: Warning
* `⏳`: Waiting/delay
* `🔄`: Retrying
* `🛑`: Failed after maximum retries
* `🔑`: Login/approval
* `💧`, `🛠️`, `🎨`: AquaFlux tasks
* `💸`: Primus Tip tasks
* `⚙️`: AutoStaking Pro tasks
* `🔮`: Starting task flow
* `🌟`: Points Check
* `🌐`: Proxy Information

## Important Notes

* **This is a Testnet**: Interacting with a testnet means the assets used have no real financial value. However, always exercise caution when interacting with smart contracts.
* **Private Keys**: Keep your `YourPrivateKey.txt` file secure. Never share it publicly.
* **Gas Usage**: The bot attempts to dynamically adjust gas. Ensure your accounts have sufficient native PHRS tokens for gas fees.
* **API Dependencies**: The bot relies on the availability of Pharos, AquaFlux, and AutoStaking Pro APIs and RPCs. Network or API issues may lead to failures.

---

## Disclaimer

This script is provided "as-is" for educational purposes only. The author and contributors are not responsible for any damages, losses, or legal issues arising from the use of this script. Users must ensure compliance with local laws and regulations regarding cryptocurrency transactions and blockchain technology.

Use at your own risk.
