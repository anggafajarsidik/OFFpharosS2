import Web3 from 'web3';
import axios from 'axios';
import FakeUserAgent from 'fake-useragent';


export class BrokexClient {
    constructor(account, logFunction) {
        this.log = logFunction;
        this.privateKey = account.pk;
        this.address = account.address;
        this.proxyAgent = account.proxyAgent; 

        this.HEADERS = {
            "Accept": "*/*",
            "Accept-Language": "en-US,en-GB;q=0.9,en-US;q=0.8,en;q=0.7,hi;q=0.6,te;q=0.5",
            "Origin": "https://app.brokex.trade",
            "Referer": "https://app.brokex.trade/",
            "Sec-Fetch-Dest": "empty",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Site": "cross-site",
            "User-Agent": new FakeUserAgent().random
        };
        this.BASE_API = "https://proofcrypto-production.up.railway.app";
        this.RPC_URL = "https://testnet.dplabs-internal.com/";
        this.PHRS_CONTRACT_ADDRESS = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
        this.USDT_CONTRACT_ADDRESS = "0x78ac5e2d8a78a8b8e6d10c7b7274b03c10c91cef";
        this.FAUCET_ROUTER_ADDRESS = "0x50576285BD33261DEe1aD99BF766CD8249520a58";
        this.TRADE_ROUTER_ADDRESS = "0xDe897635870b3Dd2e097C09f1cd08841DBc3976a";
        this.POOL_ROUTER_ADDRESS = "0x9A88d07850723267DB386C681646217Af7e220d7";

        this.ERC20_CONTRACT_ABI = [
            {"type":"function","name":"balanceOf","stateMutability":"view","inputs":[{"name":"address","type":"address"}],"outputs":[{"name":"","type":"uint256"}]},
            {"type":"function","name":"allowance","stateMutability":"view","inputs":[{"name":"owner","type":"address"},{"name":"spender","type":"address"}],"outputs":[{"name":"","type":"uint256"}]},
            {"type":"function","name":"approve","stateMutability":"nonpayable","inputs":[{"name":"spender","type":"address"},{"name":"amount","type":"uint256"}],"outputs":[{"name":"","type":"bool"}]},
            {"type":"function","name":"decimals","stateMutability":"view","inputs":[],"outputs":[{"name":"","type":"uint8"}]},
            {"type":"function","name":"hasClaimed","stateMutability":"view","inputs":[{"internalType":"address","name":"","type":"address"}],"outputs":[{"internalType":"bool","name":"","type":"bool"}]},
            {"type":"function","name":"claim","stateMutability":"nonpayable","inputs":[],"outputs":[]}
        ];
        this.BROKEX_CONTRACT_ABI = [
            {
                "name": "openPosition",
                "type": "function",
                "stateMutability": "nonpayable",
                "inputs": [
                    { "internalType": "uint256", "name": "idx", "type": "uint256" },
                    { "internalType": "bytes",   "name": "proof", "type": "bytes" },
                    { "internalType": "bool",    "name": "isLong", "type": "bool" },
                    { "internalType": "uint256", "name": "lev", "type": "uint256" },
                    { "internalType": "uint256", "name": "size", "type": "uint256" },
                    { "internalType": "uint256", "name": "sl", "type": "uint256" },
                    { "internalType": "uint256", "name": "tp", "type": "uint256" }
                ],
                "outputs": [
                    { "internalType": "uint256", "name": "", "type": "uint256" }
                ]
            },
            {
                "name": "getUserOpenIds",
                "type": "function",
                "stateMutability": "view",
                "inputs": [
                    { "internalType": "address", "name": "user", "type": "address" }
                ],
                "outputs": [
                    { "internalType": "uint256[]", "name": "", "type": "uint256[]" }
                ]
            },
            {
                "inputs": [
                    { "internalType": "uint256", "name": "id", "type": "uint256" }
                ],
                "name": "getOpenById",
                "outputs": [
                    {
                        "internalType": "struct IBrokexStorage.Open",
                        "name": "",
                        "type": "tuple",
                        "components": [
                            { "internalType": "address", "name": "trader", "type": "address" },
                            { "internalType": "uint256", "name": "id", "type": "uint256" },
                            { "internalType": "uint256", "name": "assetIndex", "type": "uint256" },
                            { "internalType": "bool",    "name": "isLong",     "type": "bool"    },
                            { "internalType": "uint256", "name": "leverage",   "type": "uint256" },
                            { "internalType": "uint256", "name": "openPrice",  "type": "uint256" },
                            { "internalType": "uint256", "name": "sizeUsd",    "type": "uint256" },
                            { "internalType": "uint256", "name": "timestamp",  "type": "uint256" },
                            { "internalType": "uint256", "name": "stopLossPrice",   "type": "uint256" },
                            { "internalType": "uint256", "name": "takeProfitPrice", "type": "uint256" },
                            { "internalType": "uint256", "name": "liquidationPrice","type": "uint256" }
                        ]
                    }
                ],
                "stateMutability": "view",
                "type": "function"
            },
            {
                "name": "closePosition",
                "type": "function",
                "stateMutability": "nonpayable",
                "inputs": [
                    { "internalType": "uint256", "name": "openId", "type": "uint256" },
                    { "internalType": "bytes",   "name": "proof",  "type": "bytes"  }
                ],
                "outputs": []
            },
            {
                "name": "depositLiquidity",
                "type": "function",
                "stateMutability": "nonpayable",
                "inputs": [
                    { "internalType": "uint256", "name": "usdtAmount", "type": "uint256" }
                ],
                "outputs": []
            },
            {
                "name": "balanceOf",
                "type": "function",
                "stateMutability": "view",
                "inputs": [
                    { "internalType": "address", "name": "account", "type": "address" }
                ],
                "outputs": [
                    { "internalType": "uint256", "name": "", "type": "uint256" }
                ],
            },
            {
                "name": "withdrawLiquidity",
                "type": "function",
                "stateMutability": "nonpayable",
                "inputs": [
                    { "internalType": "uint256", "name": "lpAmount", "type":"uint256" }
                ],
                "outputs": []
            }
        ];
        this.pairs = [
            { "name": "AMD_USDT", "desimal": 6005 },
            { "name": "GOOG_USDT", "desimal": 6011 },
            { "name": "INTL_USDT", "desimal": 6010 },
            { "name": "GME_USDT", "desimal": 6004 },
            { "name": "MCD_USDT", "desimal": 6009 },
            { "name": "MSFT_USDT", "desimal": 6068 },
            { "name": "NVDA_USDT", "desimal": 6001 },
            { "name": "TSLA_USDT", "desimal": 6066 },
            { "name": "AUD_USDT", "desimal": 6006 },
            { "name": "EUR_USDT", "desimal": 6002 },
            { "name": "GBP_USDT", "desimal": 6000 },
            { "name": "JPY_USDT", "desimal": 5010 },
            { "name": "NZD_USDT", "desimal": 5000 },
            { "name": "USD_CAD", "desimal": 5002 },
            { "name": "USD_CHF", "desimal": 5013 },
            { "name": "XAU_USD", "desimal": 5012 },
            { "name": "XAG_USD", "desimal": 5001 }
        ];
        this.usedNonce = {};
        this._web3Instance = null;
        this.openIds = {};
    }

    formatBigIntBalance(balanceBigInt, decimals) {
        if (balanceBigInt === null || balanceBigInt === undefined || decimals === null || decimals === undefined) {
            return 'N/A';
        }
        const divisor = BigInt(10) ** BigInt(decimals);
        const wholePart = balanceBigInt / divisor;
        const fractionalPart = (balanceBigInt % divisor).toString().padStart(decimals, '0');
        
        if (decimals > 0 && fractionalPart.length > 0) {
            let formattedFractional = fractionalPart.slice(0, decimals);
            formattedFractional = formattedFractional.replace(/0+$/, ''); 
            if (formattedFractional === '') {
                return `${wholePart.toString()}`;
            } else {
                return `${wholePart.toString()}.${formattedFractional}`;
            }
        } else {
            return wholePart.toString();
        }
    }

    maskAccount(account) {
        try {
            return account.slice(0, 6) + '*'.repeat(6) + account.slice(-6);
        } catch (e) {
            return null;
        }
    }

    async _getWeb3Instance() {
        if (!this._web3Instance) {
            const requestOptions = {};
            if (this.proxyAgent) {
                requestOptions.agent = this.proxyAgent;
            }
            this._web3Instance = new Web3(new Web3.providers.HttpProvider(this.RPC_URL, requestOptions));
            try {
                await this._web3Instance.eth.getBlockNumber();
            } catch (e) {
                this.log(`BROKEX`, `Failed to initialize Web3 instance for ${this.maskAccount(this.address)}: ${e.message}`, 'FgRed', '❌');
                throw e;
            }
        }
        return this._web3Instance;
    }

    async getTokenBalance(contractAddress) {
        try {
            const web3 = await this._getWeb3Instance();
            let balanceWeiBigInt;
            let decimals;
            if (contractAddress === this.PHRS_CONTRACT_ADDRESS) {
                balanceWeiBigInt = await web3.eth.getBalance(this.address);
                decimals = 18;
            } else {
                const tokenContract = new web3.eth.Contract(this.ERC20_CONTRACT_ABI, web3.utils.toChecksumAddress(contractAddress));
                balanceWeiBigInt = await tokenContract.methods.balanceOf(this.address).call();
                decimals = await tokenContract.methods.decimals().call();
            }
            return { balance: balanceWeiBigInt, decimals: Number(decimals) };
        } catch (e) {
            this.log(`BROKEX`, `Balance error for ${this.maskAccount(this.address)}: ${e.message}`, 'FgRed', '❌');
            return { balance: null, decimals: null };
        }
    }

    async getLpBalance() {
        try {
            const web3 = await this._getWeb3Instance();
            const tokenContract = new web3.eth.Contract(this.BROKEX_CONTRACT_ABI, web3.utils.toChecksumAddress(this.POOL_ROUTER_ADDRESS));
            const balanceWeiBigInt = await tokenContract.methods.balanceOf(this.address).call();
            return { balance: balanceWeiBigInt, decimals: 18 };
        } catch (e) {
            this.log(`BROKEX`, `LP Balance error for ${this.maskAccount(this.address)}: ${e.message}`, 'FgRed', '❌');
            return { balance: null, decimals: null };
        }
    }

    async getUserOpenIds() {
        try {
            const web3 = await this._getWeb3Instance();
            const tokenContract = new web3.eth.Contract(this.BROKEX_CONTRACT_ABI, web3.utils.toChecksumAddress(this.TRADE_ROUTER_ADDRESS));
            const openIds = await tokenContract.methods.getUserOpenIds(this.address).call();
            return openIds;
        } catch (e) {
            this.log(`BROKEX`, `Get Open IDs error for ${this.maskAccount(this.address)}: ${e.message}`, 'FgRed', '❌');
            return null;
        }
    }

    async getOpenDataById(openId) {
        try {
            const web3 = await this._getWeb3Instance();
            const tokenContract = new web3.eth.Contract(this.BROKEX_CONTRACT_ABI, web3.utils.toChecksumAddress(this.TRADE_ROUTER_ADDRESS));
            const openData = await tokenContract.methods.getOpenById(openId).call();
            return {
                trader: openData[0],
                id: openData[1],
                assetIndex: openData[2],
                isLong: openData[3],
                leverage: openData[4],
                openPrice: openData[5],
                sizeUsd: openData[6],
                timestamp: openData[7],
                stopLossPrice: openData[8],
                takeProfitPrice: openData[9],
                liquidationPrice: openData[10]
            };
        } catch (e) {
            this.log(`BROKEX`, `Get Open Data error for ${this.maskAccount(this.address)}: ${e.message}`, 'FgRed', '❌');
            return null;
        }
    }

    async sendRawTransactionWithRetries(web3, tx, retries = 5) {
        for (let attempt = 0; attempt < retries; attempt++) {
            try {
                const signedTx = await web3.eth.accounts.signTransaction(tx, this.privateKey);
                const result = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
                
                let txHash;
                if (result && result.transactionHash) {
                    txHash = result.transactionHash;
                    this.log(`BROKEX`, `Transaction broadcasted. Hash: https://testnet.pharosscan.xyz/tx/${txHash}`, 'FgGreen', '✅');
                } else {
                    this.log(`BROKEX`, `WARNING: Transaction broadcasted but no hash returned or invalid result object for ${this.maskAccount(this.address)}. Attempt ${attempt + 1}.`, 'FgYellow', '⚠️');
                    throw new Error("No transaction hash returned from sendSignedTransaction.");
                }
                return txHash;
            } catch (e) {
                if (e.code === 'TRANSACTION_REPLACED' && e.replacement) {
                    this.log(`BROKEX`, `Transaction was replaced. New hash: https://testnet.pharosscan.xyz/tx/${e.replacement.hash}`, 'FgGreen', '✅');
                    return e.replacement.hash;
                }
                if (e.message.includes("nonce too low")) {
                    this.log(`BROKEX`, `Send TX Error [Attempt ${attempt + 1} for ${this.maskAccount(this.address)}]: ${e.message} (Nonce issue)`, 'FgYellow', '⚠️');
                    this.usedNonce[this.address] = await web3.eth.getTransactionCount(this.address, "pending");
                } else {
                    this.log(`BROKEX`, `Send TX Error [Attempt ${attempt + 1} for ${this.maskAccount(this.address)}]: ${e.message}`, 'FgRed', '❌');
                }
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
            }
        }
        throw new Error("Transaction Hash Not Found After Maximum Retries");
    }

    async waitForReceiptWithRetries(web3, txHash, retries = 5) {
        for (let attempt = 0; attempt < retries; attempt++) {
            try {
                const receipt = await web3.eth.getTransactionReceipt(txHash);
                if (receipt) return receipt;
            } catch (e) {
                if (e) { 
                     this.log(`BROKEX`, `Wait for Receipt Error [Attempt ${attempt + 1} for ${this.maskAccount(this.address)}]: ${e.message}`, 'FgYellow', '⚠️');
                }
            }
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000 + 1000));
        }
        throw new Error("Transaction Receipt Not Found After Maximum Retries");
    }

    async checkFaucetStatus() {
        try {
            const web3 = await this._getWeb3Instance();
            const contractAddress = web3.utils.toChecksumAddress(this.FAUCET_ROUTER_ADDRESS);
            const tokenContract = new web3.eth.Contract(this.ERC20_CONTRACT_ABI, contractAddress);
            const claimData = await tokenContract.methods.hasClaimed(web3.utils.toChecksumAddress(this.address)).call();
            return claimData;
        } catch (e) {
            this.log(`BROKEX`, `Faucet status error for ${this.maskAccount(this.address)}: ${e.message}`, 'FgRed', '❌');
            return null;
        }
    }

    async performClaimFaucet() {
        try {
            const web3 = await this._getWeb3Instance();
            const contractAddress = web3.utils.toChecksumAddress(this.FAUCET_ROUTER_ADDRESS);
            const tokenContract = new web3.eth.Contract(this.ERC20_CONTRACT_ABI, contractAddress);

            const claimData = tokenContract.methods.claim();
            const gasEstimate = await claimData.estimateGas({ from: this.address });

            const maxPriorityFeePerGas = web3.utils.toWei('3', 'gwei');
            const maxFeePerGas = maxPriorityFeePerGas;
            const tx = {
                from: this.address,
                to: contractAddress,
                data: claimData.encodeABI(),
                gas: Math.floor(Number(gasEstimate) * 1.2),
                maxFeePerGas: maxFeePerGas,
                maxPriorityFeePerGas: maxPriorityFeePerGas,
                nonce: this.usedNonce[this.address],
                chainId: await web3.eth.getChainId(),
            };
            const txHash = await this.sendRawTransactionWithRetries(web3, tx);
            const receipt = await this.waitForReceiptWithRetries(web3, txHash);

            this.usedNonce[this.address]++;
            this.log(`BROKEX`, `Faucet claimed for ${this.maskAccount(this.address)}. Block: ${receipt.blockNumber}`, 'FgGreen', '✅');
            return { txHash: receipt.hash, blockNumber: receipt.blockNumber, success: true };
        } catch (e) {
            this.log(`BROKEX`, `Claim faucet failed for ${this.maskAccount(this.address)}: ${e.message}`, 'FgRed', '❌');
            return { txHash: null, blockNumber: null, success: false };
        }
    }

    async approvingToken(routerAddress, assetAddress, amountFloat, decimals) {
        try {
            const web3 = await this._getWeb3Instance();
            const spender = web3.utils.toChecksumAddress(routerAddress);
            const tokenContract = new web3.eth.Contract(this.ERC20_CONTRACT_ABI, web3.utils.toChecksumAddress(assetAddress));
            
            const amountInSmallestUnit = BigInt(Math.floor(amountFloat * (10 ** decimals)));
            const allowanceBigInt = BigInt(await tokenContract.methods.allowance(this.address, spender).call());

            const tokenSymbol = (assetAddress === this.USDT_CONTRACT_ADDRESS) ? "USDT" : "Token";
            const spenderName = (routerAddress === this.POOL_ROUTER_ADDRESS) ? "Pool Router" : 
                                (routerAddress === this.TRADE_ROUTER_ADDRESS) ? "Trade Router" : 
                                this.maskAccount(spender);
            if (allowanceBigInt < amountInSmallestUnit) { 
                this.log(`BROKEX`, `Approving ${tokenSymbol} for ${spenderName} for ${this.maskAccount(this.address)}...`, 'FgYellow', '🔑');
                const maxUint256 = BigInt(2)**BigInt(256) - BigInt(1); 
                const approveData = tokenContract.methods.approve(spender, maxUint256);
                
                const gasEstimate = await approveData.estimateGas({ from: this.address });
                const maxPriorityFeePerGas = web3.utils.toWei('3', 'gwei');
                const maxFeePerGas = maxPriorityFeePerGas;
                const tx = {
                    from: this.address,
                    to: web3.utils.toChecksumAddress(assetAddress),
                    data: approveData.encodeABI(),
                    gas: Math.floor(Number(gasEstimate) * 1.2),
                    maxFeePerGas: maxFeePerGas,
                    maxPriorityFeePerGas: maxPriorityFeePerGas,
                    nonce: this.usedNonce[this.address],
                    chainId: await web3.eth.getChainId(),
                };
                const txHash = await this.sendRawTransactionWithRetries(web3, tx);
                const receipt = await this.waitForReceiptWithRetries(web3, txHash);

                this.usedNonce[this.address]++;

                this.log(`BROKEX`, `Approve success for ${this.maskAccount(this.address)}. Block: ${receipt.blockNumber}`, 'FgGreen', '✅');
            } else {
                this.log(`BROKEX`, `${tokenSymbol} already approved for ${spenderName} for ${this.maskAccount(this.address)}.`, 'FgGreen', '👍');
            }
            return true;
        } catch (e) {
            throw new Error(`Approving Token Contract Failed for ${this.maskAccount(this.address)}: ${e.message}`);
        }
    }

    async performOpenPosition(pairIndex, isLong, openAmount, lev = 1, sl = 0, tp = 0) {
        try {
            const web3 = await this._getWeb3Instance();
            const assetAddress = web3.utils.toChecksumAddress(this.USDT_CONTRACT_ADDRESS);
            
            const usdtTokenData = await this.getTokenBalance(this.USDT_CONTRACT_ADDRESS);
            if (!usdtTokenData || usdtTokenData.decimals === null) {
                throw new Error("Could not get USDT decimals for open position.");
            }
            const usdtDecimals = usdtTokenData.decimals;
            const openAmountInSmallestUnit = BigInt(Math.floor(openAmount * (10 ** usdtDecimals)));

            let effectiveLev = BigInt(lev);
            let effectiveSl = BigInt(0);
            let effectiveTp = BigInt(0); 

            this.log(`BROKEX`, `Open Position Parameters for ${this.maskAccount(this.address)}: Pair=${pairIndex}, isLong=${isLong}, Leverage=${Number(effectiveLev)}, Size=${openAmount} USDT, SL=${this.formatBigIntBalance(effectiveSl, usdtDecimals)} USDT, TP=${this.formatBigIntBalance(effectiveTp, usdtDecimals)} USDT (Note: Actual values sent as BigInt. Using SL/TP=0 as per successful website transaction.)`, 'FgYellow', '📊');
            await this.approvingToken(web3.utils.toChecksumAddress(this.POOL_ROUTER_ADDRESS), assetAddress, openAmount, usdtDecimals);
            await this.approvingToken(web3.utils.toChecksumAddress(this.TRADE_ROUTER_ADDRESS), assetAddress, openAmount, usdtDecimals);
            const proof = await this.getProof(this.address, pairIndex);
            if (!proof) {
                throw new Error("Failed to Fetch Proof for Open Position.");
            }

            const tokenContract = new web3.eth.Contract(this.BROKEX_CONTRACT_ABI, web3.utils.toChecksumAddress(this.TRADE_ROUTER_ADDRESS));
            const openPositionData = tokenContract.methods.openPosition(pairIndex, proof.proof, isLong, effectiveLev, openAmountInSmallestUnit, effectiveSl, effectiveTp);
            
            let gasEstimate;
            try {
                gasEstimate = await openPositionData.estimateGas({ from: this.address });
                this.log(`BROKEX`, `Gas estimated successfully for ${this.maskAccount(this.address)}: ${Number(gasEstimate)}`, 'FgGreen', '✅'); 
            } catch (estimateError) {
                const errorDetails = estimateError.message || "Unknown error during gas estimation";
                throw new Error(`Gas estimation failed for open position for ${this.maskAccount(this.address)}: ${errorDetails}. This likely means INVALID INPUT PARAMETERS (SL/TP values, leverage, trade size, OR PROOF FORMAT) or UNMET CONTRACT CONDITIONS (e.g., liquidity issues, oracle prices).`);
            }

            const maxPriorityFeePerGas = web3.utils.toWei('3', 'gwei');
            const maxFeePerGas = maxPriorityFeePerGas;

            const tx = {
                from: this.address,
                to: web3.utils.toChecksumAddress(this.TRADE_ROUTER_ADDRESS),
                data: openPositionData.encodeABI(),
                gas: Math.floor(Number(gasEstimate) * 1.2),
                maxFeePerGas: maxFeePerGas,
                maxPriorityFeePerGas: maxPriorityFeePerGas,
                nonce: this.usedNonce[this.address],
                chainId: await web3.eth.getChainId(),
            };
            const txHash = await this.sendRawTransactionWithRetries(web3, tx);
            const receipt = await this.waitForReceiptWithRetries(web3, txHash);

            this.usedNonce[this.address]++;
            this.log(`BROKEX`, `Open position success for ${this.maskAccount(this.address)}. Block: ${receipt.blockNumber}`, 'FgGreen', '✅');
            return { txHash: receipt.hash, blockNumber: receipt.blockNumber, success: true };
        } catch (e) {
            const errorMessage = e && e.message ? e.message : "Unknown error";
            this.log(`BROKEX`, `Open position failed for ${this.maskAccount(this.address)}: ${errorMessage}`, 'FgRed', '❌');
            return { txHash: null, blockNumber: null, success: false };
        }
    }
    
    async getRevertReason(web3, txHash) {
        try {
            const tx = await web3.eth.getTransaction(txHash);
            if (!tx) return 'Transaction not found for revert reason check.';
            
            const receipt = await web3.eth.getTransactionReceipt(txHash);
            if (receipt && receipt.status) {
                return 'Transaction successful, no revert reason.';
            }

            if (receipt) {
                const callTx = {
                    to: tx.to,
                    from: tx.from,
                    data: tx.input,
                    gas: tx.gas,
                    gasPrice: tx.gasPrice || web3.utils.toWei('3', 'gwei'), 
                    value: tx.value,
                };
                try {
                    await web3.eth.call(callTx, tx.blockNumber);
                    return 'Execution failed (reverted), but no specific error message provided by contract.';
                } catch (callError) {
                    if (callError.message) {
                        const match = callError.message.match(/revert(?:ed)? with reason string '([^']*)'|execution reverted: ([^\n]*)/);
                        if (match && match[1]) return `Contract reverted with reason: "${match[1]}"`;
                        if (match && match[2]) return `Contract reverted: "${match[2]}"`;
                        const panicMatch = callError.message.match(/Panic \(0x(\d+)\)/);
                        if (panicMatch) return `Contract panicked with code 0x${panicMatch[1]}.`;

                        const hexData = callError.data || (callError.message.includes('revert ') ? '0x' + callError.message.split('revert ')[1].slice(0, 138) : null);
                        if (hexData) {
                            if (hexData.startsWith('0x08c379a0')) { 
                                try {
                                    return `Contract reverted with reason: "${web3.utils.hexToUtf8('0x' + hexData.slice(138))}"`;
                                } catch (decodeError) {
                                    return `Contract reverted with undecodable string error: ${hexData}`;
                                }
                            } else if (hexData.startsWith('0x4e487b71')) { 
                                const panicCode = parseInt(hexData.slice(10), 16);
                                return `Contract panicked with code ${panicCode}.`;
                            }
                        }
                        return `Transaction failed on call simulation: ${callError.message}.`;
                    }
                    return `Unknown error during call simulation.`;
                }
            }
            return `Transaction was not mined or status is unknown.`;
        } catch (e) {
            return `Failed to analyze revert reason: ${e.message}`;
        }
    }


    async performClosePosition(openId, pairIndex) {
        try {
            const web3 = await this._getWeb3Instance();
            const proof = await this.getProof(this.address, pairIndex);
            if (!proof) {
                throw new Error("Failed to Fetch Proof");
            }

            const tokenContract = new web3.eth.Contract(this.BROKEX_CONTRACT_ABI, web3.utils.toChecksumAddress(this.TRADE_ROUTER_ADDRESS));
            const closePositionData = tokenContract.methods.closePosition(openId, proof.proof);
            
            let gasEstimate;
            try {
                gasEstimate = await closePositionData.estimateGas({ from: this.address });
                this.log(`BROKEX`, `Gas estimated successfully for close position for ${this.maskAccount(this.address)}: ${Number(gasEstimate)}`, 'FgGreen', '✅'); 
            } catch (estimateError) {
                const errorDetails = estimateError.message || "Unknown error during gas estimation";
                throw new Error(`Gas estimation failed for close position for ${this.maskAccount(this.address)}: ${errorDetails}. This likely means the transaction would revert on-chain due to invalid position state.`);
            }

            const maxPriorityFeePerGas = web3.utils.toWei('3', 'gwei');
            const maxFeePerGas = maxPriorityFeePerGas;

            const tx = {
                from: this.address,
                to: web3.utils.toChecksumAddress(this.TRADE_ROUTER_ADDRESS),
                data: closePositionData.encodeABI(),
                gas: Math.floor(Number(gasEstimate) * 1.2),
                maxFeePerGas: maxFeePerGas,
                maxPriorityFeePerGas: maxPriorityFeePerGas,
                nonce: this.usedNonce[this.address],
                chainId: await web3.eth.getChainId(),
            };
            const txHash = await this.sendRawTransactionWithRetries(web3, tx);
            const receipt = await this.waitForReceiptWithRetries(web3, txHash);

            this.usedNonce[this.address]++;
            this.log(`BROKEX`, `Close position success for ${this.maskAccount(this.address)}. Block: ${receipt.blockNumber}`, 'FgGreen', '✅');
            return { txHash: receipt.hash, blockNumber: receipt.blockNumber, success: true };
        } catch (e) {
            const errorMessage = e && e.message ? e.message : "Unknown error";
            this.log(`BROKEX`, `Close position failed for ${this.maskAccount(this.address)}: ${errorMessage}`, 'FgRed', '❌');
            return { txHash: null, blockNumber: null, success: false };
        }
    }

    async performDepositLp(depositLpAmount) {
        try {
            const web3 = await this._getWeb3Instance();
            const assetAddress = web3.utils.toChecksumAddress(this.USDT_CONTRACT_ADDRESS);

            const usdtTokenData = await this.getTokenBalance(this.USDT_CONTRACT_ADDRESS);
            if (!usdtTokenData || usdtTokenData.decimals === null) {
                throw new Error("Could not get USDT decimals for LP deposit.");
            }
            const usdtDecimals = usdtTokenData.decimals;
            const depositLpAmountInSmallestUnit = BigInt(Math.floor(depositLpAmount * (10 ** usdtDecimals)));

            await this.approvingToken(web3.utils.toChecksumAddress(this.POOL_ROUTER_ADDRESS), assetAddress, depositLpAmount, usdtDecimals);
            const tokenContract = new web3.eth.Contract(this.BROKEX_CONTRACT_ABI, web3.utils.toChecksumAddress(this.POOL_ROUTER_ADDRESS));

            const lpData = tokenContract.methods.depositLiquidity(depositLpAmountInSmallestUnit);
            
            let gasEstimate;
            try {
                gasEstimate = await lpData.estimateGas({ from: this.address });
                this.log(`BROKEX`, `Gas estimated successfully for deposit LP for ${this.maskAccount(this.address)}: ${Number(gasEstimate)}`, 'FgGreen', '✅');
            } catch (estimateError) {
                const errorDetails = estimateError.message || "Unknown error during gas estimation";
                throw new Error(`Gas estimation failed for deposit LP for ${this.maskAccount(this.address)}: ${errorDetails}.`);
            }

            const maxPriorityFeePerGas = web3.utils.toWei('3', 'gwei');
            const maxFeePerGas = maxPriorityFeePerGas;

            const tx = {
                from: this.address,
                to: web3.utils.toChecksumAddress(this.POOL_ROUTER_ADDRESS),
                data: lpData.encodeABI(),
                gas: Math.floor(Number(gasEstimate) * 1.2),
                maxFeePerGas: maxFeePerGas,
                maxPriorityFeePerGas: maxPriorityFeePerGas,
                nonce: this.usedNonce[this.address],
                chainId: await web3.eth.getChainId(),
            };
            const txHash = await this.sendRawTransactionWithRetries(web3, tx);
            const receipt = await this.waitForReceiptWithRetries(web3, txHash);

            this.usedNonce[this.address]++;
            this.log(`BROKEX`, `Deposit LP success for ${this.maskAccount(this.address)}. Block: ${receipt.blockNumber}`, 'FgGreen', '✅');
            return { txHash: receipt.hash, blockNumber: receipt.blockNumber, success: true };
        } catch (e) {
            const errorMessage = e && e.message ? e.message : "Unknown error";
            this.log(`BROKEX`, `Deposit LP failed for ${this.maskAccount(this.address)}: ${errorMessage}`, 'FgRed', '❌');
            return { txHash: null, blockNumber: null, success: false };
        }
    }

    async performWithdrawLp(withdrawLpAmount) {
        try {
            const web3 = await this._getWeb3Instance();
            const lpDecimals = 18;
            const withdrawLpAmountInSmallestUnit = BigInt(Math.floor(withdrawLpAmount * (10 ** lpDecimals)));

            const tokenContract = new web3.eth.Contract(this.BROKEX_CONTRACT_ABI, web3.utils.toChecksumAddress(this.POOL_ROUTER_ADDRESS));
            const lpData = tokenContract.methods.withdrawLiquidity(withdrawLpAmountInSmallestUnit);
            
            let gasEstimate;
            try {
                gasEstimate = await lpData.estimateGas({ from: this.address });
                this.log(`BROKEX`, `Gas estimated successfully for withdraw LP for ${this.maskAccount(this.address)}: ${Number(gasEstimate)}`, 'FgGreen', '✅');
            } catch (estimateError) {
                const errorDetails = estimateError.message || "Unknown error during gas estimation";
                throw new Error(`Gas estimation failed for withdraw LP for ${this.maskAccount(this.address)}: ${errorDetails}.`);
            }

            const maxPriorityFeePerGas = web3.utils.toWei('3', 'gwei');
            const maxFeePerGas = maxPriorityFeePerGas;

            const tx = {
                from: this.address,
                to: web3.utils.toChecksumAddress(this.POOL_ROUTER_ADDRESS),
                data: lpData.encodeABI(),
                gas: Math.floor(Number(gasEstimate) * 1.2),
                maxFeePerGas: maxFeePerGas,
                maxPriorityFeePerGas: maxPriorityFeePerGas,
                nonce: this.usedNonce[this.address],
                chainId: await web3.eth.getChainId(),
            };
            const txHash = await this.sendRawTransactionWithRetries(web3, tx);
            const receipt = await this.waitForReceiptWithRetries(web3, txHash);

            this.usedNonce[this.address]++;
            this.log(`BROKEX`, `Withdraw LP success for ${this.maskAccount(this.address)}. Block: ${receipt.blockNumber}`, 'FgGreen', '✅');
            return { txHash: receipt.hash, blockNumber: receipt.blockNumber, success: true };
        } catch (e) {
            const errorMessage = e && e.message ? e.message : "Unknown error";
            this.log(`BROKEX`, `Withdraw LP failed for ${this.maskAccount(this.address)}: ${errorMessage}`, 'FgRed', '❌');
            return { txHash: null, blockNumber: null, success: false };
        }
    }

    async getProof(address, pairIndex, retries = 5) {
        const url = `${this.BASE_API}/proof?pairs=${pairIndex}`;
        for (let attempt = 0; attempt < retries; attempt++) {
            try {
                const axiosConfig = {
                    headers: this.HEADERS,
                    timeout: 60000,
                    ...(this.proxyAgent && { httpsAgent: this.proxyAgent, httpAgent: this.proxyAgent })
                };

                const response = await axios.get(url, axiosConfig);
                const proofData = response.data; 
                
                if (proofData && typeof proofData.proof === 'string' && proofData.proof.startsWith('0x')) {
                    this.log(`BROKEX`, `DEBUG: Proof string from API for ${this.maskAccount(this.address)}: ${proofData.proof.substring(0, 100)}... (truncated)`, 'FgMagenta', '🐛');
                    this.log(`BROKEX`, `DEBUG: Proof length (with 0x): ${proofData.proof.length}`, 'FgMagenta', '🐛');
                    this.log(`BROKEX`, `DEBUG: Proof length (without 0x): ${proofData.proof.length - 2}`, 'FgMagenta', '🐛');
                    if ((proofData.proof.length - 2) % 2 !== 0) {
                        this.log(`BROKEX`, `ERROR: Proof string has odd length without 0x for ${this.maskAccount(this.address)}. This might be the issue! Length: ${proofData.proof.length - 2}`, 'FgRed', '❌');
                        return null;
                    }
                } else {
                    this.log(`BROKEX`, `ERROR: Proof data or proof string is invalid/missing from API response for ${this.maskAccount(this.address)}.`, 'FgRed', '❌');
                    return null;
                }

                return proofData;
            } catch (e) {
                if (attempt < retries - 1) {
                    this.log(`BROKEX`, `Failed to get proof for ${this.maskAccount(this.address)} [Attempt ${attempt + 1}/${retries}]: ${e.message}`, 'FgYellow', '⚠️');
                    await new Promise(resolve => setTimeout(resolve, 5000));
                    continue;
                }
                this.log(`BROKEX`, `Failed to get proof for ${this.maskAccount(this.address)} after multiple attempts: ${e.message}`, 'FgRed', '❌');
                return null;
            }
        }
    }

    async runClaimFaucet() {
        this.log('BROKEX', 'Starting Brokex Faucet Claim...', 'FgMagenta', '💧');
        try {
            const hasClaimed = await this.checkFaucetStatus();
            if (!hasClaimed) {
                const { success, txHash, blockNumber } = await this.performClaimFaucet();
                if (success) {
                    this.log('BROKEX', `Faucet claimed successfully for ${this.maskAccount(this.address)}! Block: ${blockNumber}`, 'FgGreen', '✅');
                } else {
                    this.log('BROKEX', `Faucet claim failed for ${this.maskAccount(this.address)}.`, 'FgRed', '❌');
                }
                return success;
            } else {
                this.log('BROKEX', `Faucet already claimed for ${this.maskAccount(this.address)}. Skipping.`, 'FgYellow', '⚠️');
                return true;
            }
        } catch (e) {
            this.log('BROKEX', `An error occurred during faucet claim for ${this.maskAccount(this.address)}: ${e.message}`, 'FgRed', '❌');
            return false;
        }
    }

    async runOpenPosition(positionCount, openAmount) {
        this.log('BROKEX', `Starting Brokex Open Position tasks (${positionCount} trades)...`, 'FgMagenta', '📊');
        let successfulTrades = 0;
        const maxAttemptsPerPosition = this.pairs.length * 2;

        for (let i = 0; i < positionCount; i++) {
            let tradeAttempt = 0;
            let tradeSuccessful = false;

            while (tradeAttempt < maxAttemptsPerPosition && !tradeSuccessful) {
                tradeAttempt++;
                this.log('BROKEX', `Attempt ${tradeAttempt} for Trade ${i + 1} of ${positionCount} for ${this.maskAccount(this.address)}`, 'FgBlue', '🔄');

                const usdtTokenData = await this.getTokenBalance(this.USDT_CONTRACT_ADDRESS);
                const balanceBigInt = usdtTokenData ? usdtTokenData.balance : null;
                const usdtDecimals = usdtTokenData ? usdtTokenData.decimals : null;
                const balanceDisplay = this.formatBigIntBalance(balanceBigInt, usdtDecimals);

                let openAmountToCompareBigInt = null;
                if (usdtDecimals !== null) {
                    try {
                        openAmountToCompareBigInt = BigInt(Math.floor(openAmount * (10 ** usdtDecimals)));
                    } catch (e) {
                        this.log('BROKEX', `Error converting open amount to BigInt for ${this.maskAccount(this.address)}: ${e.message}`, 'FgRed', '❌');
                        this.log('BROKEX', `Skipping trade due to conversion error for ${this.maskAccount(this.address)}.`, 'FgYellow', '⚠️');
                        break;
                    }
                }

                const shuffledPairs = [...this.pairs].sort(() => 0.5 - Math.random());
                const pairs = shuffledPairs[0];
                
                const isLong = Math.random() < 0.5;
                const name = pairs.name;
                const pair = pairs.desimal;
                const action = isLong ? "Long" : "Short";
                
                const lev = 1; 
                const sl = 0;  
                const tp = 0;

                this.log('BROKEX', `Balance: ${balanceDisplay} USDT, Attempting Open Position with Amount: ${openAmount} USDT, Pair: ${action} - ${name} for ${this.maskAccount(this.address)}`, 'FgCyan');
                
                if (balanceBigInt === null || openAmountToCompareBigInt === null || balanceBigInt < openAmountToCompareBigInt) {
                    this.log('BROKEX', `Insufficient USDT Token Balance or invalid amount for comparison for ${this.maskAccount(this.address)}. Balance: ${balanceDisplay} USDT, Required: ${openAmount} USDT.`, 'FgYellow', '⚠️');
                    break; 
                }

                const { success, txHash, blockNumber } = await this.performOpenPosition(pair, isLong, openAmount, lev, sl, tp);
                if (success) {
                    successfulTrades++;
                    tradeSuccessful = true;
                    this.log('BROKEX', `Open position successful for ${this.maskAccount(this.address)}. Trades completed: ${successfulTrades} of ${positionCount}. Block: ${blockNumber}`, 'FgGreen', '✅');
                } else {
                    this.log('BROKEX', `Open position failed for ${this.maskAccount(this.address)}. Attempt ${tradeAttempt} for this trade.`, 'FgRed', '❌');
                }
            }
        }
        if (successfulTrades < positionCount) {
            this.log('BROKEX', `Could not complete all ${positionCount} open positions for ${this.maskAccount(this.address)}. Only ${successfulTrades} were successful.`, 'FgRed', '🛑');
            return false;
        }
        this.log('BROKEX', `Completed all Brokex Open Position tasks for ${this.maskAccount(this.address)}!`, 'FgGreen', '✅');
        return true;
    }

    async runClosePosition(positionCount) {
        this.log('BROKEX', `Starting Brokex Close Position tasks (${positionCount} closes)...`, 'FgMagenta', '❌');
        let successfulCloses = 0;

        if (!this.openIds[this.address]) {
            this.openIds[this.address] = [];
        }

        const openIds = await this.getUserOpenIds();
        if (!openIds || openIds.length === 0) {
            this.log('BROKEX', `No Open Positions found for ${this.maskAccount(this.address)}. Skipping Close Position task.`, 'FgYellow', '⚠️');
            return true;
        }

        this.openIds[this.address] = openIds;
        this.log('BROKEX', `Fetched ${openIds.length} Open IDs for ${this.maskAccount(this.address)}.`, 'FgGreen', '🔍');
        const usedIds = new Set();

        for (let i = 0; i < positionCount; i++) {
            const availableIds = this.openIds[this.address].filter(oid => !usedIds.has(oid));
            if (availableIds.length === 0) {
                this.log('BROKEX', `No more unique Open IDs available for ${this.maskAccount(this.address)}. Stopping Close Position task early.`, 'FgYellow', '⚠️');
                break;
            }

            const openId = availableIds[Math.floor(Math.random() * availableIds.length)];
            const openData = await this.getOpenDataById(openId);
            if (!openData) {
                this.log('BROKEX', `Could not retrieve data for Open ID ${openId} for ${this.maskAccount(this.address)}. Skipping.`, 'FgYellow', '⚠️');
                continue;
            }

            const pair = openData.assetIndex;
            const isLong = openData.isLong;
            const sizeUsdDisplay = this.formatBigIntBalance(openData.sizeUsd, 6);

            const pairInfo = this.pairs.find(p => p.desimal === Number(pair));
            const name = pairInfo ? pairInfo.name : "UNKNOWN_PAIR";
            const action = isLong ? "Long" : "Short";

            this.log('BROKEX', `Attempting to close Open ID: ${openId}, Size: ${sizeUsdDisplay} USDT, Pair: ${action} - ${name} for ${this.maskAccount(this.address)}`, 'FgCyan');

            const { success, txHash, blockNumber } = await this.performClosePosition(openId, pair);
            if (success) {
                successfulCloses++;
                usedIds.add(openId);
                this.log('BROKEX', `Close position successful for ${this.maskAccount(this.address)}. Closes completed: ${successfulCloses} of ${positionCount}. Block: ${blockNumber}`, 'FgGreen', '✅');
            } else {
                this.log('BROKEX', `Close position failed for ${this.maskAccount(this.address)}.`, 'FgRed', '❌');
            }
        }

        if (successfulCloses < positionCount) {
            this.log('BROKEX', `Could not complete all ${positionCount} close positions for ${this.maskAccount(this.address)}. Only ${successfulCloses} were successful.`, 'FgRed', '🛑');
            return false;
        }
        this.log('BROKEX', `Completed all Brokex Close Position tasks for ${this.maskAccount(this.address)}!`, 'FgGreen', '✅');
        return true;
    }

    async runDepositLiquidity(depositLpCount, depositLpAmount) {
        this.log('BROKEX', `Starting Brokex Deposit Liquidity tasks (${depositLpCount} deposits)...`, 'FgMagenta', '💰');
        let successfulDeposits = 0;
        for (let i = 0; i < depositLpCount; i++) {
            this.log('BROKEX', `Deposit LP ${i + 1} of ${depositLpCount} for ${this.maskAccount(this.address)}`, 'FgBlue', '💸');
            const usdtTokenData = await this.getTokenBalance(this.USDT_CONTRACT_ADDRESS);
            const balanceBigInt = usdtTokenData ? usdtTokenData.balance : null;
            const usdtDecimals = usdtTokenData ? usdtTokenData.decimals : null;

            const balanceDisplay = this.formatBigIntBalance(balanceBigInt, usdtDecimals);

            let depositLpAmountToCompareBigInt = null;
            if (usdtDecimals !== null) {
                try {
                    depositLpAmountToCompareBigInt = BigInt(Math.floor(depositLpAmount * (10 ** usdtDecimals)));
                } catch (e) {
                    this.log('BROKEX', `Error converting deposit LP amount to BigInt for ${this.maskAccount(this.address)}: ${e.message}`, 'FgRed', '❌');
                    this.log('BROKEX', `Skipping deposit due to conversion error for ${this.maskAccount(this.address)}.`, 'FgYellow', '⚠️');
                    continue;
                }
            }

            this.log('BROKEX', `Balance: ${balanceDisplay} USDT, Attempting Deposit Liquidity with Amount: ${depositLpAmount} USDT for ${this.maskAccount(this.address)}`, 'FgCyan');
            if (balanceBigInt === null || depositLpAmountToCompareBigInt === null || balanceBigInt < depositLpAmountToCompareBigInt) {
                this.log('BROKEX', `Insufficient USDT Token Balance or invalid amount for comparison for ${this.maskAccount(this.address)}. Balance: ${balanceDisplay} USDT, Required: ${depositLpAmount} USDT.`, 'FgYellow', '⚠️');
                continue;
            }

            const { success, txHash, blockNumber } = await this.performDepositLp(depositLpAmount);
            if (success) {
                successfulDeposits++;
                this.log('BROKEX', `Deposit LP successful for ${this.maskAccount(this.address)}. Deposits completed: ${successfulDeposits} of ${depositLpCount}. Block: ${blockNumber}`, 'FgGreen', '✅');
            } else {
                this.log('BROKEX', `Deposit LP failed for ${this.maskAccount(this.address)}.`, 'FgRed', '❌');
            }
        }
        if (successfulDeposits < depositLpCount) {
            this.log('BROKEX', `Could not complete all ${depositLpCount} deposit LP tasks for ${this.maskAccount(this.address)}. Only ${successfulDeposits} were successful.`, 'FgRed', '🛑');
            return false;
        }
        this.log('BROKEX', `Completed all Brokex Deposit Liquidity tasks for ${this.maskAccount(this.address)}!`, 'FgGreen', '✅');
        return true;
    }

    async runWithdrawLiquidity(withdrawLpCount, withdrawLpAmount) {
        this.log('BROKEX', `Starting Brokex Withdraw Liquidity tasks (${withdrawLpCount} withdrawals)...`, 'FgMagenta', ' withdrawal');
        let successfulWithdrawals = 0;
        for (let i = 0; i < withdrawLpCount; i++) {
            this.log('BROKEX', `Withdraw LP ${i + 1} of ${withdrawLpCount} for ${this.maskAccount(this.address)}`, 'FgBlue', ' withdrawal');
            const lpTokenData = await this.getLpBalance();
            const balanceBigInt = lpTokenData ? lpTokenData.balance : null;
            const lpDecimals = lpTokenData ? lpTokenData.decimals : null;

            const lpBalanceDisplay = this.formatBigIntBalance(balanceBigInt, lpDecimals);

            let withdrawLpAmountToCompareBigInt = null;
            if (lpDecimals !== null) {
                try {
                    withdrawLpAmountToCompareBigInt = BigInt(Math.floor(withdrawLpAmount * (10 ** lpDecimals)));
                } catch (e) {
                    this.log('BROKEX', `Error converting withdraw LP amount to BigInt for ${this.maskAccount(this.address)}: ${e.message}`, 'FgRed', '❌');
                    this.log('BROKEX', `Skipping withdrawal due to conversion error for ${this.maskAccount(this.address)}.`, 'FgYellow', '⚠️');
                    continue;
                }
            }

            this.log('BROKEX', `LP Held: ${lpBalanceDisplay}, Attempting Withdraw Liquidity with Amount: ${withdrawLpAmount} for ${this.maskAccount(this.address)}`, 'FgCyan');
            if (balanceBigInt === null || withdrawLpAmountToCompareBigInt === null || balanceBigInt < withdrawLpAmountToCompareBigInt) {
                this.log('BROKEX', `Insufficient LP Tokens Held or invalid amount for comparison for ${this.maskAccount(this.address)}. LP Held: ${withdrawLpAmount}, Required: ${withdrawLpAmount}.`, 'FgYellow', '⚠️');
                continue;
            }

            const { success, txHash, blockNumber } = await this.performWithdrawLp(withdrawLpAmount);
            if (success) {
                successfulWithdrawals++;
                this.log('BROKEX', `Withdraw LP successful for ${this.maskAccount(this.address)}. Withdrawals completed: ${successfulWithdrawals} of ${withdrawLpCount}. Block: ${blockNumber}`, 'FgGreen', '✅');
            } else {
                this.log('BROKEX', `Withdraw LP failed for ${this.maskAccount(this.address)}.`, 'FgRed', '❌');
            }
        }
        if (successfulWithdrawals < withdrawLpCount) {
            this.log('BROKEX', `Could not complete all ${withdrawLpCount} withdraw LP tasks for ${this.maskAccount(this.address)}. Only ${successfulWithdrawals} were successful.`, 'FgRed', '🛑');
            return false;
        }
        this.log('BROKEX', `Completed all Brokex Withdraw Liquidity tasks for ${this.maskAccount(this.address)}!`, 'FgGreen', '✅');
        return true;
    }

    async initNonce() {
        try {
            const web3 = await this._getWeb3Instance();
            this.usedNonce[this.address] = await web3.eth.getTransactionCount(this.address, "pending");
            this.log('BROKEX', `Initialized nonce for ${this.maskAccount(this.address)} to ${this.usedNonce[this.address]}`, 'FgGreen', '🔢');
            return true;
        } catch (error) {
            this.log('BROKEX', `Failed to initialize nonce for ${this.maskAccount(this.address)}: ${error.message}`, 'FgRed', '❌');
            return false;
        }
    }
}
