import Web3 from 'web3';
import { ethers } from 'ethers';
import axios from 'axios';
import moment from 'moment-timezone';
import fs from 'fs/promises';
import readline from 'readline';

const Colors = {
    RESET: '\x1b[0m',
    BRIGHT: '\x1b[1m',
    DIM: '\x1b[2m',
    UNDERSCORE: '\x1b[4m',
    BLINK: '\x1b[5m',
    REVERSE: '\x1b[7m',
    HIDDEN: '\x1b[8m',

    FG_BLACK: '\x1b[30m',
    FG_RED: '\x1b[31m',
    FG_GREEN: '\x1b[32m',
    FG_YELLOW: '\x1b[33m',
    FG_BLUE: '\x1b[34m',
    FG_MAGENTA: '\x1b[35m',
    FG_CYAN: '\x1b[36m',
    FG_WHITE: '\x1b[37m',
    FG_LIGHTGREEN: '\x1b[92m',

    BG_BLACK: '\x1b[40m',
    
    BG_RED: '\x1b[41m',
    BG_GREEN: '\x1b[42m',
    BG_YELLOW: '\x1b[43m',
    BG_BLUE: '\x1b[44m',
    BG_MAGENTA: '\x1b[45m',
    BG_CYAN: '\x1b[46m',
    BG_WHITE: '\x1b[47m'
};
class AutoStakingConfig {
    constructor() {
        this.HEADERS = {
            "Accept": "application/json, text/plain, */*",
            "Accept-Encoding": "gzip, deflate, br, zstd",
            "Accept-Language": "en-IN,en-GB;q=0.9,en-US;q=0.8,en;q=0.7,hi;q=0.6,te;q=0.5",
            "Origin": "https://autostaking.pro",
            "Referer": "https://autostaking.pro/",
            "Sec-Fetch-Dest": 
            "empty",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Site": "same-site",
            "Content-Type": "application/json",
            "sec-ch-ua": '"Not)A;Brand";v="8", "Chromium";v="138", "Google Chrome";v="138"',
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": '"Windows"',
            "priority": "u=1, i",
     
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36"
        };
        this.BASE_API = "https://api.autostaking.pro";

        this.RPC_URL = "https://testnet.dplabs-internal.com";
        this.CHAIN_ID = 688688;
        this.SIWE_CHAIN_ID_FOR_LOGIN = 688688;
        this.FAUCET_CONTRACT = "0xF1CF5D79bE4682D50f7A60A047eACa9bD351fF8e";
        this.TOKEN_CONTRACT = "0x72df0bcd7276f2dFbAc900D1CE63c272C4BCcCED";
        this.APPROVAL_SPENDER = "0x11cd3700b310339003641fdce57c1f9bd21ae015";
        this.APPROVAL_AMOUNT = "0x000000000000000000000000000000000000000000000000000000003b9f537a";

        this.CONTRACT_ABI = [
            {
                "inputs": [{"internalType": "address", "name": "owner", "type": "address"},
                          {"internalType": "address", "name": "spender", "type": "address"}],
                "name": "allowance",
          
                "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
                "stateMutability": "view",
                "type": "function"
            },
            {
                "inputs": [{"internalType": "address", "name": "user", "type": "address"}],
        
                "name": "canClaimFaucet",
                "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
                "stateMutability": "view",
                "type": "function"
            },
            {
           
                "inputs": [{"internalType": "address", "name": "user", "type": "address"}],
                "name": "getNextFaucetClaimTime",
                "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
                "stateMutability": "view",
                "type": "function"
            },
    
            {
                "constant": false,
                "inputs": [
                    { "name": "_spender", "type": "address" },
                    { "name": "_value", "type": "uint256" }
        
                ],
                "name": "approve",
                "outputs": [{ "name": "", "type": "bool" }],
                "payable": false,
                "stateMutability": "nonpayable",
                "type": "function"
  
            }
        ];
        this.DEBUG_MODE = false;
    }
}

class AutoStakingUtils {
    constructor(config) {
        this.config = config;
        this.proxies = [];
        this.proxy_index = 0;
        this.account_proxies = {};
        this.EXPLORER_BASE_URL = "https://testnet.pharosscan.xyz/tx/";
        this._currentProxyAgent = null;
    }

    clearTerminal() {
    }

    log(message, color = Colors.RESET, symbol = '➡️') {
        const timestamp = new Date().toLocaleTimeString();
        const prefix = 'AUTOSTAKING_PRO';
        console.log(`${color}${symbol} [${timestamp}] ${prefix}: ${message}${Colors.RESET}`);
    }

    welcome() {
    }

    formatSeconds(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const remainingSeconds = seconds % 60;
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
    }

    async loadProxies(filename = "proxy.txt") {
        try {
            await fs.access(filename);
            const data = await fs.readFile(filename, 'utf8');
            const proxies = data.split('\n').map(line => line.trim()).filter(line => line.length > 0);
            if (!proxies.length) {
                this.log(`${Colors.FG_RED}${Colors.BRIGHT}No proxies found in ${filename}${Colors.RESET}`);
                return;
            }

            this.proxies = proxies;
            this.log(`${Colors.FG_GREEN}${Colors.BRIGHT}Loaded ${this.proxies.length} proxies${Colors.RESET}`);
        } catch (e) {
            if (e.code === 'ENOENT') {
                this.log(`${Colors.FG_RED}${Colors.BRIGHT}Proxy file not found: ${filename}${Colors.RESET}`);
            } else {
                this.log(`${Colors.FG_RED}${Colors.BRIGHT}Error loading proxies: ${e.message}${Colors.RESET}`);
            }
        }
    }

    checkProxySchemes(proxyAddress) {
        const schemes = ["http://", "https://", "socks4://", "socks5://"];
        if (schemes.some(scheme => proxyAddress.startsWith(scheme))) {
            return proxyAddress;
        }
        return `http://${proxyAddress}`;
    }

    getNextProxyForAccount(accountKey) {
        if (!this.account_proxies[accountKey]) {
            this.account_proxies[accountKey] = this.rotateProxyForAccount(accountKey);
        }
        return this.account_proxies[accountKey];
    }

    rotateProxyForAccount(accountKey) {
        if (!this.proxies.length) {
            return null;
        }
        const proxy = this.checkProxySchemes(this.proxies[this.proxy_index]);
        this.account_proxies[accountKey] = proxy;
        this.proxy_index = (this.proxy_index + 1) % this.proxies.length;
        return proxy;
    }

    setProxyAgent(agent) {
        this._currentProxyAgent = agent;
    }

    getProxyAgent() {
        return this._currentProxyAgent;
    }

    generateAddress(privateKey) {
        try {
            if (typeof privateKey !== 'string' || !privateKey.match(/^(0x)?[0-9a-fA-F]{64}$/)) {
                this.log(`${Colors.FG_RED}${Colors.BRIGHT}Invalid private key format. Must be a 64-char hex string (optional 0x prefix).${Colors.RESET}`);
                return null;
            }
            const wallet = new ethers.Wallet(privateKey);
            return wallet.address;
        } catch (e) {
            this.log(`${Colors.FG_RED}${Colors.BRIGHT}Error generating address: ${e.message}${Colors.RESET}`);
            return null;
        }
    }

    maskAccount(account) {
        try {
            if (account.length <= 10) {
                return `${account.substring(0, 4)}...${account.substring(account.length - 2)}`;
            }
            return `${account.substring(0, 6)}...${account.substring(account.length - 4)}`;
        } catch (e) {
            this.log(`${Colors.FG_RED}${Colors.BRIGHT}Error masking account: ${e.message}${Colors.RESET}`);
            return "Unknown";
        }
    }

    generateNonce() {
        return Math.random().toString(36).substring(2, 22);
    }

    createSiweMessage(address, nonce) {
        const timestamp = moment().utc().format('YYYY-MM-DDTHH:mm:ss.SSS') + 'Z';
        const message =
            `autostaking.pro wants you to sign in with your Ethereum account:\n${address}\n\nWelcome to AutoStaking!
Sign in to authenticate your wallet.\n\nURI: https://autostaking.pro\nVersion: 1\nChain ID: ${this.config.SIWE_CHAIN_ID_FOR_LOGIN}\nNonce: ${nonce}\nIssued At: ${timestamp}`;

        return message;
    }

    async signMessage(privateKey, message) {
        try {
            const wallet = new ethers.Wallet(privateKey);
            const signature = await wallet.signMessage(message);

            if (typeof signature !== 'string' || !signature.startsWith('0x') || signature.length !== 132) {
                this.log(`${Colors.FG_RED}${Colors.BRIGHT}Warning: Signature format is incorrect. Expected 0x-prefixed 130-char hex string (total 132 chars). Got: ${signature ? signature.length : 'undefined'} chars. Signature value: ${signature}${Colors.RESET}`);
                return null;
            }
            return signature;
        } catch (e) {
            this.log(`${Colors.FG_RED}${Colors.BRIGHT}Error signing message: ${e.message}${Colors.RESET}`);
            return null;
        }
    }
}

class AutoStakingWeb3Operations {
    constructor(config, utils) {
        this.config = config;
        this.utils = utils;
    }

    async getWeb3WithCheck(address, proxyAgent, retries = 3) {
        let web3Instance;
        for (let attempt = 0; attempt < retries; attempt++) {
            try {
                let providerOptions = {};
                if (proxyAgent) {
                    providerOptions.agent = proxyAgent;
                }
                web3Instance = new Web3(new Web3.providers.HttpProvider(this.config.RPC_URL, providerOptions));
                const latestBlockNumber = await web3Instance.eth.getBlockNumber();
                if (latestBlockNumber !== null && latestBlockNumber !== undefined) {
                    this.utils.log(`Web3 connected - Latest Block: ${latestBlockNumber}`);
                    return web3Instance;
                } else {
                    this.utils.log(`Web3 connection failed: getBlockNumber returned null/undefined.`);
                }
            } catch (e) {
                this.utils.log(`Web3 connection attempt ${attempt + 1} failed: ${e.message}`);
            }
            if (attempt < retries - 1) {
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
        return null;
    }

    async sendRawTransactionWithRetries(privateKey, web3, tx, retries = 3) {
        for (let attempt = 0; attempt < retries; attempt++) {
            try {
                const formattedPrivateKey = privateKey.startsWith('0x') ?
                privateKey : '0x' + privateKey;
                const account = web3.eth.accounts.privateKeyToAccount(formattedPrivateKey);
                const signedTx = await account.signTransaction(tx);

                const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
                return receipt.transactionHash;
            } catch (e) {
                this.utils.log(`Transaction attempt ${attempt + 1} failed: ${e.message}`);
                if (attempt < retries - 1) {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }
        }
        throw new Error("Transaction failed after maximum retries");
    }

    async waitForReceiptWithRetries(web3, txHash, retries = 5) {
        for (let attempt = 0; attempt < retries; attempt++) {
            try {
                const receipt = await web3.eth.getTransactionReceipt(txHash);
                if (receipt) {
                    return receipt;
                }
            } catch (e) {
                this.utils.log(`Receipt attempt ${attempt + 1} failed: ${e.message}`);
            }
            if (attempt < retries - 1) {
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }
        throw new Error("Transaction receipt not found after maximum retries");
    }

    async checkFaucetEligibility(web3, address) {
        try {
            const contract = new web3.eth.Contract(this.config.CONTRACT_ABI, this.config.FAUCET_CONTRACT);
            const canClaim = await contract.methods.canClaimFaucet(web3.utils.toChecksumAddress(address)).call();

            if (!canClaim) {
                const nextClaimTime = await contract.methods.getNextFaucetClaimTime(web3.utils.toChecksumAddress(address)).call();
                const currentTime = Math.floor(Date.now() / 1000);
                const waitTime = Number(nextClaimTime) - currentTime;
                if (waitTime > 0) {
                    this.utils.log(`⏳ Faucet cooldown: ${Math.floor(waitTime / 3600)}h ${Math.floor((waitTime % 3600) / 60)}m remaining`);
                }
            }
            return canClaim;
        } catch (e) {
            this.utils.log(`⚠️ Error checking faucet eligibility: ${e.message}`);
            return true;
        }
    }

    async checkAllowance(web3, address) {
        try {
            const contract = new web3.eth.Contract(this.config.CONTRACT_ABI, this.config.TOKEN_CONTRACT);
            const allowance = await contract.methods.allowance(
                web3.utils.toChecksumAddress(address),
                web3.utils.toChecksumAddress(this.config.APPROVAL_SPENDER)
            ).call();
            const requiredAmount = BigInt(this.config.APPROVAL_AMOUNT);
            this.utils.log(`🔍 Current Allowance: ${allowance} | Required: ${requiredAmount}`);

            return BigInt(allowance) >= requiredAmount;
        } catch (e) {
            this.utils.log(`⚠️ Error checking allowance: ${e.message}`);
            return false;
        }
    }

    async getActualAllowance(web3, address) {
        try {
            const contract = new web3.eth.Contract(this.config.CONTRACT_ABI, this.config.TOKEN_CONTRACT);
            const allowance = await contract.methods.allowance(
                web3.utils.toChecksumAddress(address),
                web3.utils.toChecksumAddress(this.config.APPROVAL_SPENDER)
            ).call();
            return BigInt(allowance);
        } catch (e) {
            this.utils.log(`❌ Error getting actual allowance value: ${e.message}`);
            return BigInt(0);
        }
    }

    async sendApprovalTransaction(privateKey, web3, address, amount, logDetails = false) {
        const currentNonce = await web3.eth.getTransactionCount(address);
        const tokenContract = new web3.eth.Contract(this.config.CONTRACT_ABI, this.config.TOKEN_CONTRACT);
        const approvalData = tokenContract.methods.approve(
            web3.utils.toChecksumAddress(this.config.APPROVAL_SPENDER),
            amount
        ).encodeABI();
        let gasPrice;
        try {
            gasPrice = await web3.eth.getGasPrice();
        } catch (err) {
            gasPrice = web3.utils.toWei('2.6', 'gwei');
        }

        const tx = {
            chainId: this.config.CHAIN_ID,
            data: approvalData,
            from: address,
            gas: '0xbf3f',
            gasPrice: gasPrice,
            nonce: currentNonce,
           
            to: web3.utils.toChecksumAddress(this.config.TOKEN_CONTRACT),
            value: '0x0'
        };
        if (logDetails) {
            this.utils.log(`🔧 Gas Price: ${web3.utils.fromWei(gasPrice, 'gwei')} gwei`);
            this.utils.log(`🎯 Approving spender: ${this.config.APPROVAL_SPENDER} with amount: ${amount}`);
        }

        try {
            const txHash = await this.sendRawTransactionWithRetries(privateKey, web3, tx);
            return txHash;
        } catch (e) {
            this.utils.log(`❌ Failed to send approval transaction: ${e.message}`);
            return null;
        }
    }
}

class AutoStakingAPIOperations {
    constructor(config, utils) {
        this.config = config;
        this.utils = utils;
        this.privateKey = null;
        this.address = null;
    }

    async performLogin(privateKey, address, proxyAgent) {
        this.utils.log(`ℹ️ Autentikasi langsung dengan API (tanpa endpoint /user/login eksplisit).`, Colors.FgYellow, '➡️');
        this.privateKey = privateKey;
        this.address = address;

        return [true, "DUMMY_JWT_TOKEN"];
    }

    async makeApiRequest(endpoint, payload, privateKey, address, proxyAgent) {
        const agent = proxyAgent;
        let axiosConfig = {
            timeout: 30000,
            headers: { ...this.config.HEADERS }
        };
        if (agent) {
            axiosConfig.httpsAgent = agent;
            axiosConfig.httpAgent = agent;
        }

        try {
            const nonce = this.utils.generateNonce();
            const message = this.utils.createSiweMessage(address, nonce);
            const signature = await this.utils.signMessage(privateKey, message);

            if (signature) {
                axiosConfig.headers['Authorization'] = `Bearer ${signature}`;
                axiosConfig.headers['X-Signature'] = signature;
                axiosConfig.headers['X-Address'] = address;
                const currentTimestamp = Math.floor(Date.now() / 1000);
                axiosConfig.headers['Cookie'] = `_ga=GA1.1.943571911.${currentTimestamp}; _ga_ZRD7GRM6F8=GS2.1.s${currentTimestamp}$o6$g1$t{currentTimestamp}$j60$l0$h0`;

            } else {
                this.utils.log(`⚠️ Gagal membuat tanda tangan untuk permintaan API ke ${endpoint}.`, Colors.FgYellow, '⚠️');
            }
        } catch (signError) {
            this.utils.log(`❌ Error saat menyiapkan tanda tangan untuk API ke ${endpoint}: ${signError.message}`, Colors.FgRed, '🛑');
        }

        const apiUrl = `${this.config.BASE_API}${endpoint}`;

        try {
            const response = await axios.post(apiUrl, payload, axiosConfig);
            return response.data;
        } catch (e) {
            this.utils.log(`❌ Error API ${endpoint}: ${e.message}`, Colors.FgRed, '🛑');
            if (e.response) {
                this.utils.log(`Response Status (Error): ${e.response.status}`, Colors.FgRed, '⚠️');
                this.utils.log(`Response Data (Error): ${JSON.stringify(e.response.data || {})}`, Colors.FgRed, '🐛');
            } else if (e.request) {
                this.utils.log(`No response received: ${e.request}`, Colors.FgRed, '⚠️');
            } else {
                this.utils.log(`Error setting up request: ${e.message}`, Colors.FgRed, '⚠️');
            }
            throw e;
        }
    }

    async getMulticallTransactionData(jwtToken, address, proxyAgent) {
        const privateKey = this.privateKey;

        const payload = {
            "user": address,
            "changes": [
                {
                    "type": "deposit",
                  
                    "id": "deposit-1",
                    "token": {
                        "name": "USDC",
                        "address": "0x72df0bcd7276f2dFbAc900D1CE63c272C4BCcCED",
          
                        "decimals": 6,
                        "chainId": 688688,
                        "price": 1,
                       
                        "amount": "1000000"
                    },
                    "product": {
                        "provider": "MockVault",
                
                        "chainId": 688688,
                        "address": "0xC6858c1C7047cEc35355Feb2a5Eb7bd1E051dDDf",
                        "depositAsset": {
                             
                            "address": "0x72df0bcd7276f2dFbAc900D1CE63c272C4BCcCED",
                            "symbol": "USDC",
                            "name": "USDC",
                              
                            "decimals": 6,
                            "chain": {"id": 688688}
                        },
                        "asset": {
      
                            "address": "0xC6858c1C7047cEc35355Feb2a5Eb7bd1E051dDDf",
                            "symbol": "mvUSDC",
                            "decimals": 6,
       
                            "name": "USDC Vault Shares",
                            "chain": {"id": 688688}
                        },
          
                        "name": "USDC Vault",
                        "tvl": 25960387.547369,
                        "fee": 0,
                      
                        "dailyApy": 0.08
                    },
                    "costs": {
                        "gasFee": 0.0075,
               
                        "platformFee": 0
                    }
                }
            ],
            "prevTransactionResults": {
         
                [`688688-0x72df0bcd7276f2dFbAc900D1CE63c272C4BCcCED`]: {
                    "progress": 0.5,
                    "type": "tx",
                    "ids": ["approval-1"],
             
                    "from": address.toLowerCase(),
                    "to": "0x72df0bcd7276f2dFbAc900D1CE63c272C4BCcCED",
                    "data": `0x095ea7b300000000000000000000000011cd3700b310339003641fdce57c1f9bd21ae015${this.config.APPROVAL_AMOUNT.substring(2)}`,
                    "value": "0x0",
             
                    "result": "0x" + "0".repeat(64)
                }
            }
        };

        this.utils.log(`🔄 Calling AutoStaking API for multicall data...`, Colors.FgBlue, '🔄');
        
        try {
            const responseData = await this.makeApiRequest(
                '/investment/generate-change-transactions',
                payload,
                privateKey,
                address,
                proxyAgent
            );

            if (this.config.DEBUG_MODE) { 
                this.utils.log(`🔍 Full Response: ${JSON.stringify(responseData)}`, Colors.FgCyan, '🔎');
            } else { 
                 this.utils.log(`🔍 Multicall API Response: Code ${responseData?.code}`, Colors.FgCyan, '🔍');
            }

            if (responseData && responseData.code === 0 && responseData.data) {
                for (const key in responseData.data) {
                    const txData = responseData.data[key];
                    if (txData.progress === 1 && txData.to === "0x11cD3700B310339003641Fdce57c1f9BD21aE015") {
                        this.utils.log(`✅ Got multicall transaction data from API`, Colors.FgGreen, '✅');
                        if (this.config.DEBUG_MODE) {
                            this.utils.log(`   Tx Data: ${txData.data.substring(0, 50)}...`, Colors.FgDim);
                            this.utils.log(`   To: ${txData.to}`, Colors.FgDim);
                        }
                        return [txData.data, txData.to];
                    }
                }
                this.utils.log(`⚠️ No relevant multicall transaction found in API response`, Colors.FgYellow, '⚠️');
                return [null, null];
            } else {
                this.utils.log(`❌ Multicall API call failed - ${responseData?.message || 'No specific message'}`, Colors.FgRed, '❌');
                if (this.config.DEBUG_MODE) { 
                    this.utils.log(`Response Data (Error): ${JSON.stringify(responseData || {})}`, Colors.FgRed, '🐛');
                }
                return [null, null];
            }
        } catch (e) {
            return [false, null];
        }
    }
}

export class AutoStakingBot {
    constructor() {
        this.config = new AutoStakingConfig();
        this.utils = new AutoStakingUtils(this.config);
        this.web3_ops = new AutoStakingWeb3Operations(this.config, this.utils);
        this.api_ops = new AutoStakingAPIOperations(this.config, this.utils);
        this.login_count = 0;
        this.min_delay = 0;
        this.max_delay = 0;
    }

    async processPerformLoginAndTransactions(privateKey, address, proxyAgent) {
        let overallOperationSuccess = true;
        this.utils.setProxyAgent(proxyAgent);

        this.utils.log(`--- Performing AutoStaking Login ---`, Colors.Bright, '🔑');
        const [loginSuccess, jwtToken] = await this.api_ops.performLogin(privateKey, address, proxyAgent);
        if (!loginSuccess) {
            this.utils.log(`❌ AutoStaking Login Failed`, Colors.FgRed, '❌');
            return false;
        }
        this.utils.log(`✅ AutoStaking Login Success`, Colors.FgGreen, '✅');
        await new Promise(resolve => setTimeout(resolve, 2000));

        this.utils.log(`--- Connecting to Web3 Provider ---`, Colors.Bright, '🔗');
        const web3 = await this.web3_ops.getWeb3WithCheck(address, proxyAgent);
        if (!web3) {
            this.utils.log(`❌ Failed to connect to Web3`, Colors.FgRed, '❌');
            return false;
        }

        this.utils.log(`--- Checking Faucet Eligibility ---`, Colors.Bright, '💧');
        const canClaim = await this.web3_ops.checkFaucetEligibility(web3, address);
        if (!canClaim) {
            this.utils.log(`⏳ Faucet cooldown: Faucet claim not available yet (cooldown active)`);
        } else {
            this.utils.log(`🚰 Claiming faucet tokens...`, Colors.FgMagenta, '💸');
            const currentNonce = await web3.eth.getTransactionCount(address);
            this.utils.log(`🔧 Using nonce: ${currentNonce}`, Colors.FgDim);
            
            const transactionData = "0x4fe15335";
            let gasPrice;
            try { gasPrice = await web3.eth.getGasPrice();
            } catch (err) { gasPrice = web3.utils.toWei('2.5', 'gwei');
            }
            
            const tx = {
                chainId: this.config.CHAIN_ID,
                data: transactionData, from: address, gas: '0x21db8', gasPrice: gasPrice, nonce: currentNonce,
                to: web3.utils.toChecksumAddress(this.config.FAUCET_CONTRACT)
      
            };
            this.utils.log(`🔧 Faucet Gas Price: ${web3.utils.fromWei(gasPrice, 'gwei')} gwei`, Colors.FgDim);
            const txHash = await this.web3_ops.sendRawTransactionWithRetries(privateKey, web3, tx);
            if (txHash) {
                this.utils.log(`✅ Faucet claim transaction sent: ${this.utils.EXPLORER_BASE_URL}${txHash}`, Colors.FgGreen, '✅');
            } else {
                this.utils.log(`❌ Faucet claim failed to send. Check logs for details.`, Colors.FgRed, '❌');
                overallOperationSuccess = false;
            }
        }
        if (!overallOperationSuccess) return false;
        await new Promise(resolve => setTimeout(resolve, 2000));

        this.utils.log(`--- Approving Token Spending ---`, Colors.Bright, '💰');
        let hasSufficientAllowance = await this.web3_ops.checkAllowance(web3, address);
        if (hasSufficientAllowance) {
            this.utils.log(`✅ Sufficient allowance already exists - skipping approval`, Colors.FgGreen, '👍');
        } else {
            this.utils.log(`ℹ️ Current allowance insufficient or not found, attempting approval. Required: ${BigInt(this.config.APPROVAL_AMOUNT)}`, Colors.FgYellow, '⚠️');
            let approvalStepSuccess = true;
            let currentAllowanceCheckValue = await this.web3_ops.getActualAllowance(web3, address);
            this.utils.log(`Actual current allowance value: ${currentAllowanceCheckValue}`, Colors.FgDim);
            const requiredAmountBigInt = BigInt(this.config.APPROVAL_AMOUNT);
            if (currentAllowanceCheckValue > BigInt(0) && currentAllowanceCheckValue < requiredAmountBigInt) {
                this.utils.log(`Current allowance (${currentAllowanceCheckValue}) is non-zero but insufficient. Attempting to reset allowance to 0 first...`, Colors.FgYellow, '🔄');
                const txHashZero = await this.web3_ops.sendApprovalTransaction(privateKey, web3, address, BigInt(0), true);
                if (txHashZero) {
                    this.utils.log(`✅ Allowance reset to 0 transaction sent: ${this.utils.EXPLORER_BASE_URL}${txHashZero}`, Colors.FgGreen, '✅');
                    await new Promise(resolve => setTimeout(resolve, 3000));
                    currentAllowanceCheckValue = await this.web3_ops.getActualAllowance(web3, address);
                    this.utils.log(`Allowance after reset to 0 (sent): ${currentAllowanceCheckValue}`, Colors.FgDim);
                } else {
                    this.utils.log(`❌ Sending allowance reset transaction failed.`, Colors.FgRed, '❌');
                    approvalStepSuccess = false;
                }
            }
            
            if (approvalStepSuccess) {
                this.utils.log(`Attempting to approve full amount: ${requiredAmountBigInt}`, Colors.FgBlue, '🔑');
                const txHashFull = await this.web3_ops.sendApprovalTransaction(privateKey, web3, address, requiredAmountBigInt, true);
                
                if (txHashFull) {
                    this.utils.log(`✅ Token approval transaction sent: ${this.utils.EXPLORER_BASE_URL}${txHashFull}`, Colors.FgGreen, '✅');
                } else {
                    this.utils.log(`❌ Sending full approval transaction failed.`, Colors.FgRed, '❌');
                    overallOperationSuccess = false;
                }
            } else {
                 overallOperationSuccess = false;
            }
        }
        if (!overallOperationSuccess) return false;
        await new Promise(resolve => setTimeout(resolve, 2000));

        this.utils.log(`--- Performing Multicall Transaction ---`, Colors.Bright, '⚙️');
        const currentNonce = await web3.eth.getTransactionCount(address);
        this.utils.log(`🔧 Using nonce: ${currentNonce}`, Colors.FgDim);
        let transactionData = null;
        let targetContract = null;
        const [apiData, apiContract] = await this.api_ops.getMulticallTransactionData(jwtToken, address, proxyAgent);
        if (apiData && apiContract) {
            transactionData = apiData;
            targetContract = apiContract;
            this.utils.log(`✅ Using API-generated multicall data`, Colors.FgGreen, '✅');
        }
        
        if (!transactionData) {
            this.utils.log(`⚠️ Using fallback transaction data for multicall`, Colors.FgYellow, '⚠️');
            const exactTransactionData = "0xac9650d80000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000064f9984acd000000000000000000000000c6858c1c7047cec35355feb2a5eb7bd1e051dDDf000000000000000000000000000000000000000000000000000000003b9f5379";
            
            const dynamicAddressPart = `00000000000000000000000${address.substring(2).toLowerCase()}`;
            const finalPadding = "00000000000000000000000000000000000000000000000000000000";
            
            transactionData = `${exactTransactionData}${dynamicAddressPart}${finalPadding}`;
            targetContract = "0x11cD3700B310339003641Fdce57c1f9BD21aE015";
        }
        
        const gasPrice = web3.utils.toWei('2.5', 'gwei');
        const tx = {
            chainId: this.config.CHAIN_ID,
            data: transactionData,
            from: address,
            gas: '0x44e5b',
            gasPrice: gasPrice,
            nonce: currentNonce,
            to: web3.utils.toChecksumAddress(targetContract),
      
            value: '0x0'
        };
        this.utils.log(`🔧 Multicall Tx Data (first 100 chars): ${transactionData.substring(0, 100)}...`, Colors.FgDim); 
        this.utils.log(`🔧 Multicall Target Contract: ${targetContract}`, Colors.FgDim);
        this.utils.log(`🔧 Multicall Gas Price: ${web3.utils.fromWei(tx.gasPrice, 'gwei')} gwei`, Colors.FgDim);

        const txHash = await this.web3_ops.sendRawTransactionWithRetries(privateKey, web3, tx);
        if (txHash) {
            this.utils.log(`✅ Multicall transaction sent: ${this.utils.EXPLORER_BASE_URL}${txHash}`, Colors.FgGreen, '✅');
        } else {
            this.utils.log(`❌ Multicall transaction failed to send. Check logs for details.`, Colors.FgRed, '❌');
            overallOperationSuccess = false;
        }
            
        return overallOperationSuccess;
    }

    async processAccounts(privateKey, address, option, useProxy, rotateProxy) {
        this.utils.log(`${Colors.FgYELLOW}${Colors.BRIGHT}👤 Account: ${this.utils.maskAccount(privateKey)} | Address: ${address}${Colors.RESET}`);
        if (option === 1) {
            const success = await this.processPerformLoginAndTransactions(privateKey, address, this.utils.getProxyAgent());
            return success;
        }
        return false;
    }
}
