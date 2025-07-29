import fetch from 'node-fetch';
import AbortController from 'abort-controller';
import { ethers } from 'ethers';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { buildFallbackProvider, ERC20_ABI as BaseERC20_ABI } from './providerservice.js';
import UserAgent from 'user-agents';
import readline from 'readline';
import fs from 'fs';
import fsp from 'fs/promises';
import process from 'process';
import { FaucetClient } from './faucetservice.js';
import { CheckinClient } from './checkinservice.js';
import axios from 'axios';
import { AutoStakingBot } from './autostakingproservice.js';
import { BrokexClient } from './brokexservice.js';

const GAS_FEE_MULTIPLIER = 2.5;
const DAILY_RUN_INTERVAL_HOURS = 24;
const PHAROS_CHAIN_ID = 688688;
const PHAROS_RPC_URLS = [ 'https://testnet.dplabs-internal.com' ];
const PHAROS_EXPLORER_URL = 'https://pharos-testnet.socialscan.io/tx/';
const API_BASE_URL = "https://api.pharosnetwork.xyz";
const AQUAFLUX_NFT_CONTRACT = '0xcc8cf44e196cab28dba2d514dc7353af0efb370e';
const AQUAFLUX_TOKENS = {
  P: '0xb5d3ca5802453cc06199b9c40c855a874946a92c',
  C: '0x4374fbec42e0d46e66b379c0a6072c910ef10b32',
  S: '0x5df839de5e5a68ffe83b89d430dc45b1c5746851',
  CS: '0xceb29754c54b4bfbf83882cb0dcef727a259d60a'
};
const AQUAFLUX_NFT_ABI = [
    "function claimTokens()",
    "function mint(uint256 nftType, uint256 expiresAt, bytes signature)"
];
const PRIMUS_TIP_CONTRACT = "0xd17512b7ec12880bd94eca9d774089ff89805f02";

let PRIMUS_TIP_ABI;

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const Colors = { Reset: "\x1b[0m", Bright: "\x1b[1m", FgRed: "\x1b[31m", FgGreen: "\x1b[32m", FgYellow: "\x1b[33m", FgBlue: "\x1b[34m", FgMagenta: "\x1b[35m", FgCyan: "\x1b[36m", FgDim: "\x1b[2m"};

function log(prefix, message, color = 'Reset', symbol = '➡️') {
    const timestamp = new Date().toLocaleTimeString();
    const actualColorCode = Colors[color] || Colors.Reset;
    console.log(`${actualColorCode}${symbol} [${timestamp}] ${prefix}: ${message}${Colors.Reset}`);
}
function getRandomNumber(min, max, decimals = 4) { return (Math.random() * (max - min) + min).toFixed(decimals); }
function getRandomElement(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
async function askQuestion(promptOptions) { const isWindows = process.platform === 'win32';
if (isWindows && process.stdin.isTTY) { process.stdin.setRawMode(true); } return new Promise(resolve => { const sigintHandler = () => { log('SYSTEM', 'Ctrl+C detected during input. Exiting script...', 'FgYellow', '⚠️'); rl.removeListener('SIGINT', sigintHandler); if (isWindows && process.stdin.isTTY) process.stdin.setRawMode(false); rl.close(); process.exit(1); }; rl.on('SIGINT', sigintHandler); rl.question(promptOptions.message, (answer) => { if (isWindows && process.stdin.isTTY) process.stdin.setRawMode(false); rl.removeListener('SIGINT', sigintHandler); resolve(answer); }); }); }
async function getPublicIpViaProxy(proxyAgent) { try { const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 3000);
const res = await fetch('http://api.ipify.org', { agent: proxyAgent, signal: controller.signal }); clearTimeout(timeout);
if (!res.ok) throw new Error(`Failed to fetch IP: ${res.statusText}`); return (await res.text()).trim();
} catch (error) { return `Error fetching IP: ${error.message}`; } }
async function showAllBalances(walletAddress, provider) { log('BALANCES', `For ${walletAddress}:`, 'FgCyan', '💰');
let balanceDetails = []; try { const native = await provider.getBalance(walletAddress); balanceDetails.push(`PHRS (native): ${ethers.formatEther(native)}`);
} catch (err) { balanceDetails.push(`PHRS (native): Error fetching`); } log('BALANCES', balanceDetails.join(' | '), 'FgCyan', '✨'); }
async function fetchWithTimeout(url, timeout = 10000, agent = null) { const controller = new AbortController();
const id = setTimeout(() => controller.abort(), timeout); try { const res = await fetch(url, { signal: controller.signal, agent: agent });
clearTimeout(id); return res; } catch (err) { throw new Error('Timeout or network error'); } }

async function runCountdown(hours) {
    const totalSeconds = hours * 3600;
const nextRunTime = new Date(Date.now() + totalSeconds * 1000);
    const nextRunTimeWIB = nextRunTime.toLocaleString('en-GB', { timeZone: 'Asia/Jakarta', hour12: false, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
log('SYSTEM', `All tasks complete. Next run scheduled at: ${nextRunTimeWIB} WIB`, 'FgGreen', '⏰');
return new Promise(resolve => {
        const interval = setInterval(() => {
            const now = Date.now();
            const remaining = Math.round((nextRunTime.getTime() - now) / 1000);

            if (remaining <= 0) {
                clearInterval(interval);
                process.stdout.write('\r' 
+ ' '.repeat(70) + '\r');
                log('SYSTEM', 'Countdown finished. Starting next run...', 'FgGreen', '🚀');
                resolve();
                return;
            }

            const h = Math.floor(remaining / 3600);

const m = Math.floor((remaining % 3600) / 60);
     
const 
s = remaining % 60;

            const countdownStr = `Next run in: ${h.toString().padStart(2, '0')}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`;
            process.stdout.write(`${Colors.FgCyan}   ${countdownStr}${' '.repeat(20)}${Colors.Reset}\r`);
        }, 1000);
    });
}

async function executeTransaction(wallet, txRequest, description) {
    let txResponse;
    const sendMaxRetries = 10;
for (let i = 0; i < sendMaxRetries; i++) {
        try {
            if (i > 0) {
                const delay = Math.min(2000 * Math.pow(2, i), 30000) + getRandomNumber(0, 1000, 0);
log('TX', `Retrying to SEND ${description}... (Attempt ${i + 1}/${sendMaxRetries}, delay ${delay/1000}s)`, 'FgYellow', '🔄');
                await new Promise(r => setTimeout(r, delay));
}
            txResponse = await wallet.sendTransaction(txRequest);
log('TX', `${description} TX sent: ${txResponse.hash}`, 'FgYellow', '🚀');
            break;
        } catch (e) {
            if (e.code === 'TRANSACTION_REPLACED' && e.replacement) {
                log('TX', `${description} TX was replaced. New hash: ${e.replacement.hash}`, 'FgGreen', '✅');
                return e.replacement;
            }
            if (e.code === 'CALL_EXCEPTION' || (e.data && e.data.includes('0x4e487b71')) || e.message.includes('execution reverted')) {
                log('TX', `Transaction reverted on send for ${description}. No point in retrying.`, 'FgRed', '❌');
                throw e;
            }
            log('TX', `Failed to SEND ${description} on attempt ${i + 1}: ${e.message}`, 'FgRed', '❌');
            if (i === sendMaxRetries - 1) {
                log('TX', `Max retries reached for SENDING ${description}. Giving up.`, 'FgRed', '🛑');
                throw e;
            }
        }
    }

    if (!txResponse) {
        throw new Error(`Transaction response was not received for ${description}.`);
    }

    const waitMaxRetries = 3;
    const waitTimeout = 30000;
for (let i = 0; i < waitMaxRetries; i++) {
        try {
            if (i > 0) {
                 const delay = 3000 + getRandomNumber(0, 1000, 0);
log('TX-WAIT', `Retrying to GET RECEIPT for ${txResponse.hash}... (Attempt ${i + 1}/${waitMaxRetries}, delay ${delay/1000}s)`, 'FgYellow', '⏳');
await new Promise(r => setTimeout(r, delay));
            }
            const receipt = await txResponse.wait(1, waitTimeout);
if (receipt && receipt.status === 1) {
                log('TX', `${description} TX confirmed: ${receipt.hash}`, 'FgGreen', '✅');
if (receipt.hash) console.log(`${Colors.FgGreen}   🔗 Explorer: ${PHAROS_EXPLORER_URL}${receipt.hash}${Colors.Reset}`);
                return receipt;
} else if (receipt) {
                 throw new Error(`Transaction reverted on-chain (status: 0). Hash: ${receipt.hash}`);
} else {
                throw new Error('wait() returned null receipt.');
}
        } catch(e) {
            if (e.code === 'CALL_EXCEPTION' || (e.receipt && e.receipt.status === 0)) {
                log('TX-WAIT', `Transaction ${txResponse.hash} has failed on-chain (reverted). Stopping wait.`, 'FgRed', '❌');
throw new Error(`Transaction reverted: ${e.message}`);
            }
            if (e.code === 'TIMEOUT') {
                log('TX-WAIT', `Transaction ${txResponse.hash} timed out waiting for receipt.`, 'FgYellow', '⚠️');
            } else if (e.code === 'TRANSACTION_REPLACED' && e.replacement) {
                log('TX-WAIT', `Transaction ${txResponse.hash} was replaced during receipt wait. New hash: ${e.replacement.hash}`, 'FgGreen', '✅');
                return e.replacement;
            }
            
            log('TX-WAIT', `Failed to GET RECEIPT for ${txResponse.hash} on attempt ${i + 1}: ${e.message}`, 'FgYellow', '⚠️');
            if (i === waitMaxRetries - 1) {
                 log('TX-WAIT', `Max retries reached for GETTING RECEIPT for ${txResponse.hash}. The transaction may still succeed on-chain.`, 'FgRed', '🛑');
throw new Error(`Failed to confirm transaction ${txResponse.hash} after all retries.`);
            }
        }
    }
}


class AccountProcessor {
    constructor(account, operationParams, provider) {
        this.pk = account.pk;
        this.proxyAgent = account.proxyAgent;
        this.accountIndex = account.accountIndex;
        this.provider = provider;
        this.wallet = new ethers.Wallet(this.pk, this.provider);
        this.address = this.wallet.address;
        this.operationParams = operationParams;
        this.authToken = null;
    }

    async #executeTx(txData, description) {
        const txRequest = { ...txData };
const nonce = await this.provider.getTransactionCount(this.address, 'latest');
        txRequest.nonce = nonce;

        try {
            const feeData = await this.provider.getFeeData();
let gasPrice = BigInt(0);
            if (feeData.maxFeePerGas && feeData.maxPriorityFeePerGas) {
                txRequest.maxFeePerGas = BigInt(Math.round(Number(feeData.maxFeePerGas) * GAS_FEE_MULTIPLIER));
const calculatedPrioFee = BigInt(Math.round(Number(feeData.maxPriorityFeePerGas) * GAS_FEE_MULTIPLIER));
                txRequest.maxPriorityFeePerGas = calculatedPrioFee > 0n ? calculatedPrioFee : ethers.parseUnits('1', 'gwei');
} else if (feeData.gasPrice && feeData.gasPrice > 0n) {
                gasPrice = BigInt(Math.round(Number(feeData.gasPrice) * GAS_FEE_MULTIPLIER));
txRequest.gasPrice = gasPrice;
            } else {
                log('GAS', `Fee data from provider is problematic or zero. Falling back to a higher minimum gasPrice (5 Gwei).`, 'FgYellow', '⚠️');
txRequest.gasPrice = ethers.parseUnits('5', 'gwei');
            }
        } catch(e) {
            log('GAS', `Could not get custom fee data. Using default fallback. (${e.message})`, 'FgYellow', '⚠️');
txRequest.gasPrice = ethers.parseUnits('5', 'gwei');
        }

        return executeTransaction(this.wallet, txRequest, description);
}

    async #api_request(endpoint, method = 'post', retries = 5, initialDelay = 1000) {
        const userAgent = new UserAgent();
        for (let i = 0; i < retries; i++) {
            try {
                const options = {
                    method: method,
                    headers: {
                        'User-Agent': userAgent.toString(),
                        'Referer': 'https://testnet.pharosnetwork.xyz/',
                        'Origin': 'https://testnet.pharosnetwork.xyz'
                    },
                    agent: this.proxyAgent,
                };
                if (this.authToken) { options.headers['Authorization'] = `Bearer ${this.authToken}`; }
                const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`API request failed with status ${response.status}: ${errorText}`);
                }
                return response.json();
            } catch (e) {
                log('API_REQUEST', `API request to ${endpoint} failed (attempt ${i + 1}/${retries}): ${e.message}`, 'FgYellow', '⚠️');
                if (i < retries - 1) {
                    const delay = initialDelay * Math.pow(2, i) + getRandomNumber(0, 1000, 0);
                    await new Promise(resolve => setTimeout(resolve, delay));
                } else {
                    log('API_REQUEST', `Max retries reached for API request: ${endpoint}`, 'FgRed', '🛑');
                    throw e;
                }
            }
        }
        return null;
    }
    async #login() { const signature = await this.wallet.signMessage("pharos"); const endpoint = `/user/login?address=${this.address}&signature=${signature}&invite_code=`;
try {
    const data = await this.#api_request(endpoint, 'post');
    if (data && data.data && data.data.jwt) { this.authToken = data.data.jwt; return true; }
    log('LOGIN', `Login failed: ${data?.msg || 'No JWT in response'}`, 'FgRed', '❌');
    return false;
} catch (e) {
    log('LOGIN', `Login process failed due to API request error: ${e.message}`, 'FgRed', '🚨');
    return false;
}
}
    async handleVerifyTaskWithHash({ taskId, txHash }) { log('VERIFY', `Verifying task ${taskId} with hash ${txHash.slice(0,10)}...`, 'FgBlue', '🔍');
if (!this.authToken) { const loggedIn = await this.#login(); if (!loggedIn) { log('VERIFY', 'Verification failed: Could not log in.', 'FgRed', '❌');
return; } } const endpoint = `/task/verify?address=${this.address}&task_id=${taskId}&tx_hash=${txHash}`; try {
    const data = await this.#api_request(endpoint);
    if (data && data.code === 0) { log('VERIFY', `Task ${taskId} verification successful.`, 'FgGreen', '✅'); }
    else { log('VERIFY', `Task ${taskId} verification failed: ${data?.msg || 'Unknown error'}`, 'FgYellow', '⚠️'); }
} catch (e) {
    log('VERIFY', `Task verification failed due to API request error: ${e.message}`, 'FgRed', '❌');
}
}

    async #approveToken(tokenAddress, spender, amount, tokenSymbolForLog, platform) {
        const tokenContract = new ethers.Contract(tokenAddress, BaseERC20_ABI, this.wallet);
try {
            const allowance = await tokenContract.allowance(this.address, spender);
if (allowance < amount) {

    log(platform, `Approving ${tokenSymbolForLog} for ${platform}...`, 'FgYellow', '🔑');
const txData = await tokenContract.approve.populateTransaction(spender, ethers.MaxUint256);
                await this.#executeTx(txData, `Approve ${tokenSymbolForLog} for ${platform}`);
} else {
                log(platform, `Token ${tokenSymbolForLog} already approved for ${platform}.`, 'FgGreen', '👍');
}
        } catch (e) {
            log(platform, `Could not approve token ${tokenSymbolForLog}: ${e.message}`, 'FgRed', '❌');
throw e;
        }
    }

    async aquaFluxLogin(wallet, proxyAgent, retries = 5, initialDelay = 1000) {
        for (let i = 0; i < retries; i++) {
            try {
                const timestamp = Date.now();
                const message = `Sign in to AquaFlux with timestamp: ${timestamp}`;
                const signature = await wallet.signMessage(message);
                const response = await axios.post('https://api.aquaflux.pro/api/v1/users/wallet-login', {
                    address: wallet.address,
                    message: message,
                    signature: signature
                }, {
                    headers: {
                        'accept': 'application/json, text/plain, */*',
                        'accept-language': 'en-US,en-GB;q=0.9,en-US;q=0.8,en;q=0.7,hi;q=0.6,te;q=0.5',
                        'content-type': 'application/json',
                        'user-agent': new UserAgent().toString()
                    },
                    httpsAgent: proxyAgent,
                    validateStatus: (status) => status >= 200 && status < 500
                });

                if (response.data.status === 'success') {
                    log('AQUAFLUX', 'AquaFlux login successful!', 'FgGreen', '🔑');
                    return response.data.data.accessToken;
                } else {
                    const errorMessage = `Login failed: ${JSON.stringify(response.data)}`;
                    if (i < retries - 1 && response.status >= 500) {
                        log('AQUAFLUX', `${errorMessage} (attempt ${i + 1}/${retries}). Retrying...`, 'FgYellow', '⚠️');
                        const delay = initialDelay * Math.pow(2, i) + getRandomNumber(0, 1000, 0);
                        await new Promise(resolve => setTimeout(resolve, delay));
                        continue;
                    } else {
                        throw new Error(errorMessage);
                    }
                }
            } catch (e) {
                log('AQUAFLUX', `AquaFlux login failed (attempt ${i + 1}/${retries}): ${e.message}`, 'FgYellow', '⚠️');
                if (i < retries - 1) {
                    const delay = initialDelay * Math.pow(2, i) + getRandomNumber(0, 1000, 0);
                    await new Promise(resolve => setTimeout(resolve, delay));
                } else {
                    log('AQUAFLUX', `AquaFlux login failed after max retries.`, 'FgRed', '❌');
                    throw e;
                }
            }
        }
        return null;
    }

    async claimAquaFluxTokens(wallet) {
        log('AQUAFLUX', 'Claiming free AquaFlux tokens (C & S)...', 'FgMagenta', '💧');
try {
            const nftContract = new ethers.Contract(AQUAFLUX_NFT_CONTRACT, AQUAFLUX_NFT_ABI, this.wallet);
const txData = await nftContract.claimTokens.populateTransaction();
            const receipt = await this.#executeTx(txData, 'Claim AquaFlux Tokens');

            log('AQUAFLUX', 'Tokens claimed successfully!', 'FgGreen', '✅');
return true;
        } catch (e) {
            if (e.message.includes('already claimed')) {
                log('AQUAFLUX', 'Tokens have already been claimed for today.', 'FgYellow', '⚠️');
return true;
            }
            log('AQUAFLUX', `Claim tokens failed: ${e.reason || e.message}`, 'FgRed', '❌');
throw e;
        }
    }

    async craftAquaFluxTokens(wallet) {
        log('AQUAFLUX', 'Crafting 100 CS tokens from C and S tokens...', 'FgMagenta', '🛠️');
try {
            const cTokenContract = new ethers.Contract(AQUAFLUX_TOKENS.C, BaseERC20_ABI, this.wallet);
const sTokenContract = new ethers.Contract(AQUAFLUX_TOKENS.S, BaseERC20_ABI, this.wallet);
            const csTokenContract = new ethers.Contract(AQUAFLUX_TOKENS.CS, BaseERC20_ABI, this.wallet);

            const requiredAmount = ethers.parseUnits('100', 18);
const cBalance = await cTokenContract.balanceOf(wallet.address);
            if (cBalance < requiredAmount) {
                throw new Error(`Insufficient C tokens. Required: 100, Available: ${ethers.formatUnits(cBalance, 18)}`);
}

            const sBalance = await sTokenContract.balanceOf(wallet.address);
if (sBalance < requiredAmount) {
                throw new Error(`Insufficient S tokens. Required: 100, Available: ${ethers.formatUnits(sBalance, 18)}`);
}

            const cAllowance = await cTokenContract.allowance(wallet.address, AQUAFLUX_NFT_CONTRACT);
if (cAllowance < requiredAmount) {
                log('AQUAFLUX', 'Approving C tokens...', 'FgYellow', '🔑');
const cApproveTx = await cTokenContract.approve(AQUAFLUX_NFT_CONTRACT, ethers.MaxUint256);
                await cApproveTx.wait();
                log('AQUAFLUX', 'C tokens approved', 'FgGreen', '✅');
}

            const sAllowance = await sTokenContract.allowance(wallet.address, AQUAFLUX_NFT_CONTRACT);
if(sAllowance < requiredAmount) {
                log('AQUAFLUX', 'Approving S tokens...', 'FgYellow', '🔑');
const sApproveTx = await sTokenContract.approve(AQUAFLUX_NFT_CONTRACT, ethers.MaxUint256);
                await sApproveTx.wait();
                log('AQUAFLUX', 'S tokens approved', 'FgGreen', '✅');
}

            const csBalanceBefore = await csTokenContract.balanceOf(wallet.address);
log('AQUAFLUX', `CS Token balance before crafting: ${ethers.formatUnits(csBalanceBefore, 18)}`, 'FgCyan');

            log('AQUAFLUX', "Crafting CS tokens...", 'FgMagenta', '⚙️');

            const CRAFT_METHOD_ID = '0x4c10b523';
const abiCoder = ethers.AbiCoder.defaultAbiCoder();
            const encodedParams = abiCoder.encode(['uint256'], [requiredAmount]);
            const calldata = CRAFT_METHOD_ID + encodedParams.substring(2);
const craftTx = await this.wallet.sendTransaction({
                to: AQUAFLUX_NFT_CONTRACT,
                data: calldata,
                gasLimit: 300000
            });
log('AQUAFLUX', `Crafting transaction sent! TX Hash: ${craftTx.hash}`, 'FgYellow', '🚀');
            const receipt = await craftTx.wait();
if (receipt.status === 0) {
                throw new Error('Transaction reverted on-chain');
}

            log('AQUAFLUX', 'Crafting transaction confirmed.', 'FgGreen', '✅');
const csBalanceAfter = await csTokenContract.balanceOf(wallet.address);
            const craftedAmount = csBalanceAfter - csBalanceBefore;

log('AQUAFLUX', `CS Token balance after crafting: ${ethers.formatUnits(csBalanceAfter, 18)}`, 'FgCyan');
log('AQUAFLUX', `Successfully crafted: ${ethers.formatUnits(craftedAmount, 18)} CS tokens`, 'FgGreen', '✅');
            if (craftedAmount < requiredAmount) {
                throw new Error(`Crafting incomplete. Expected 100 CS tokens, got ${ethers.formatUnits(craftedAmount, 18)}`);
}

            return true;
} catch (e) {
            log('AQUAFLUX', `NFT mint failed: ${e.reason || e.message}`, 'FgRed', '❌');
throw e;
        }
    }

    async checkAquaFluxTokenHolding(accessToken, proxyAgent, retries = 5, initialDelay = 1000) {
        for (let i = 0; i < retries; i++) {
            try {
                const response = await axios.post('https://api.aquaflux.pro/api/v1/users/check-token-holding', null, {
                    headers: {
                        'accept': 'application/json, text/plain, */*',
                        'accept-language': 'en-US,en-GB;q=0.9,en-US;q=0.8,en;q=0.7,hi;q=0.6,te;q=0.5',
                        'authorization': `Bearer ${accessToken}`,
                        'content-type': 'application/json',
                        'user-agent': new UserAgent().toString()
                    },
                    httpsAgent: proxyAgent,
                    validateStatus: (status) => status >= 200 && status < 500
                });
                if (response.data.status === 'success') {
                    const isHolding = response.data.data.isHoldingToken;
                    log('AQUAFLUX', `API Token holding check: ${isHolding ? 'YES' : 'NO'}`, 'FgCyan', '🔍');
                    return isHolding;
                } else {
                    const errorMessage = `Check holding failed: ${JSON.stringify(response.data)}`;
                    if (i < retries - 1 && response.status >= 500) {
                        log('AQUAFLUX', `${errorMessage} (attempt ${i + 1}/${retries}). Retrying...`, 'FgYellow', '⚠️');
                        const delay = initialDelay * Math.pow(2, i) + getRandomNumber(0, 1000, 0);
                        await new Promise(resolve => setTimeout(resolve, delay));
                        continue;
                    } else {
                        throw new Error(errorMessage);
                    }
                }
            } catch (e) {
                log('AQUAFLUX', `Check token holding failed (attempt ${i + 1}/${retries}): ${e.message}`, 'FgYellow', '⚠️');
                if (i < retries - 1) {
                    const delay = initialDelay * Math.pow(2, i) + getRandomNumber(0, 1000, 0);
                    await new Promise(resolve => setTimeout(resolve, delay));
                } else {
                    log('AQUAFLUX', `Check token holding failed after max retries.`, 'FgRed', '❌');
                    throw e;
                }
            }
        }
        return false;
    }

    async checkAquaFluxTokenHolding(accessToken, proxyAgent) {
        try {
            const response = await axios.post('https://api.aquaflux.pro/api/v1/users/check-token-holding', null, {
                headers: {

'accept': 'application/json, text/plain, */*',
                    'accept-language': 'en-US,en-GB;q=0.9,en-US;q=0.8,en;q=0.7,hi;q=0.6,te;q=0.5',
                   
'authorization': `Bearer ${accessToken}`,
                    'user-agent': new UserAgent().toString()
                },
                httpsAgent: proxyAgent
            });
if (response.data.status === 'success') {
                const isHolding = response.data.data.isHoldingToken;
log('AQUAFLUX', `API Token holding check: ${isHolding ? 'YES' : 'NO'}`, Colors.FgCyan, '🔍');
return isHolding;
} else {
                throw new Error('Check holding failed: ' + JSON.stringify(response.data));
}
        } catch (e) {
            log('AQUAFLUX', `Check token holding failed: ${e.message}`, Colors.FgRed, '❌');
throw e;
        }
    }

    async getAquaFluxSignature(wallet, accessToken, proxyAgent) {
        try {
            const response = await axios.post('https://api.aquaflux.pro/api/v1/users/get-signature', {
                walletAddress: wallet.address,
                requestedNftType: 0
            }, {

      headers: {
   
'accept': 'application/json, text/plain, */*',
                    'accept-language': 'en-US,en-GB;q=0.9,en-US;q=0.8,en;q=0.7,hi;q=0.6,te;q=0.5',
                    'authorization': `Bearer ${accessToken}`,
                    'content-type': 'application/json',

               'user-agent': new UserAgent().toString()
                
},
   
              httpsAgent: proxyAgent
            });
if (response.data.status === 'success') {
                log('AQUAFLUX', 'Signature obtained successfully!', Colors.FgGreen, '✍️');
return response.data.data;
            } else {
                throw new Error('Get signature failed: ' + JSON.stringify(response.data));
}
        } catch (e) {
            log('AQUAFLUX', `Get signature failed: ${e.message}`, Colors.FgRed, '❌');
throw e;
        }
    }

    async mintAquaFluxNFT(wallet, signatureData) {
        log('AQUAFLUX', 'Minting AquaFlux NFT...', 'FgMagenta', '🎨');
try {
            const csTokenContract = new ethers.Contract(AQUAFLUX_TOKENS.CS, BaseERC20_ABI, this.wallet);
const requiredAmount = ethers.parseUnits('100', 18);

            const csBalance = await csTokenContract.balanceOf(wallet.address);
if (csBalance < requiredAmount) {
                throw new Error(`Insufficient CS tokens. Required: 100, Available: ${ethers.formatUnits(csBalance, 18)}`);
}

            const allowance = await csTokenContract.allowance(wallet.address, AQUAFLUX_NFT_CONTRACT);
if (allowance < requiredAmount) {
                const approvalTx = await csTokenContract.approve(AQUAFLUX_NFT_CONTRACT, ethers.MaxUint256);
await approvalTx.wait();
            }

            const currentTime = Math.floor(Date.now() / 1000);
if (currentTime >= signatureData.expiresAt) {
                throw new Error(`Signature is already expired! Check your system's clock.`);
}

            const CORRECT_METHOD_ID = '0x75e7e053';
const abiCoder = ethers.AbiCoder.defaultAbiCoder();
const encodedParams = abiCoder.encode(
                ['uint256', 'uint256', 'bytes'],
                [signatureData.nftType, signatureData.expiresAt, signatureData.signature]
            );
const calldata = CORRECT_METHOD_ID + encodedParams.substring(2);

            const tx = await this.wallet.sendTransaction({
                to: AQUAFLUX_NFT_CONTRACT,
                data: calldata,
                gasLimit: 400000
            });
log('AQUAFLUX', `NFT mint transaction sent! TX Hash: ${tx.hash}`, 'FgYellow', '🚀');
            const receipt = await tx.wait();
if (receipt.status === 0) {
                throw new Error('Transaction reverted on-chain');
}

            log('AQUAFLUX', 'NFT minted successfully!', 'FgGreen', '✅');
return true;
} catch (e) {
            log('AQUAFLUX', `NFT mint failed: ${e.reason || e.message}`, 'FgRed', '❌');
throw e;
        }
    }

    async executeAquaFluxFlow(wallet, proxyAgent) {
        log('AQUAFLUX', 'Starting AquaFlux tasks...', 'Bright', '🔮');
        try {
            const accessToken = await this.aquaFluxLogin(wallet, proxyAgent);
            const claimSuccess = await this.claimAquaFluxTokens(wallet);
            if (!claimSuccess) {
                log('AQUAFLUX', `Skipping remaining AquaFlux flow steps due to claim failure.`, 'FgYellow', '⚠️');
                return false;
            }
            
            const craftSuccess = await this.craftAquaFluxTokens(wallet);
            if (!craftSuccess) {
                log('AQUAFLUX', `Skipping remaining AquaFlux flow steps due to crafting failure.`, 'FgYellow', '⚠️');
                return false;
            }

            let checkHoldingSuccess = false;
            try {
                checkHoldingSuccess = await this.checkAquaFluxTokenHolding(accessToken, proxyAgent);
            } catch (e) {
                log('AQUAFLUX', `AquaFlux Token Holding Check failed: ${e.message}. Skipping remaining steps.`, 'FgRed', '❌');
                return false;
            }
            if (!checkHoldingSuccess) {
                log('AQUAFLUX', `AquaFlux Token Holding Check returned false. Skipping remaining steps.`, 'FgYellow', '⚠️');
                return false;
            }

            let signatureData = null;
            try {
                signatureData = await this.getAquaFluxSignature(wallet, accessToken, proxyAgent);
            } catch (e) {
                log('AQUAFLUX', `AquaFlux Get Signature failed: ${e.message}. Skipping remaining steps.`, 'FgRed', '❌');
                return false;
            }
            if (!signatureData) {
                log('AQUAFLUX', `AquaFlux Get Signature returned null. Skipping remaining steps.`, 'FgYellow', '⚠️');
                return false;
            }

            const mintSuccess = await this.mintAquaFluxNFT(wallet, signatureData);
            if (!mintSuccess) {
                log('AQUAFLUX', `AquaFlux NFT mint failed.`, 'FgRed', '❌');
                return false;
            }

            log('AQUAFLUX', 'AquaFlux flow completed successfully!', 'FgGreen', '✅');
            return true;
        } catch (e) {
            log('AQUAFLUX', `AquaFlux flow failed: ${e.message}`, 'FgRed', '❌');
            return false;
        }
    }

    async sendPrimusTip(wallet, user_ids) {
        log('PRIMUS', `Starting "Send Tip" process for wallet ${wallet.address.slice(0, 8)}...`, 'Bright', '💸');
try {
            if (user_ids.length === 0) {
                log('PRIMUS', 'No user IDs loaded from usernames.txt. Skipping tip.', 'FgYellow', '⚠️');
return false;
            }

            const user = getRandomElement(user_ids);
const amounts = [0.00001, 0.002];
            const randomAmountEth = amounts[Math.floor(Math.random() * amounts.length)];
            const amountWei = ethers.parseEther(randomAmountEth.toFixed(18));
log('PRIMUS', `Attempting to send to user: ${user} | Amount: ${randomAmountEth.toFixed(8)} PHRS`, 'FgBlue', '➡️');
const recipient = {
                idSource: "x",
                id: user,
                amount: amountWei,
                nftIds: []
            };
const token = {
                tokenType: 1,
                tokenAddress: ethers.ZeroAddress
            };
const tipContract = new ethers.Contract(PRIMUS_TIP_CONTRACT, PRIMUS_TIP_ABI, wallet);

            const txOptions = {
                value: amountWei,
                gasLimit: 300000,
            };
const transactionRequest = await tipContract.tip.populateTransaction(token, recipient, txOptions);

            const receipt = await this.#executeTx(transactionRequest, `Primus Tip ${randomAmountEth.toFixed(8)} PHRS to ${user}`);
if (receipt && receipt.status === 1) {
                log('PRIMUS', `✅ Transaction successful! User: ${user} | Amount: ${randomAmountEth.toFixed(8)} PHRS | Tx: ${receipt.hash}`, 'FgGreen', '✅');
return true;
} else if (receipt) {
                 throw new Error(`Transaction failed on chain! User: ${user} | Tx: ${receipt.hash} | Status: ${receipt.status}`);
} else {
                throw new Error('Transaction receipt was null.');
}
        } catch (error) {
            log('PRIMUS', `❌ Error occurred for user (${error.message})`, 'FgRed', '❌');
if (error.code) {
                if (error.code === 'INSUFFICIENT_FUNDS') {
                    log('PRIMUS', "Reason: Insufficient funds in wallet for transaction or gas.", 'FgRed');
} else if (error.code === 'NONCE_EXPIRED' || error.code === 'REPLACEMENT_UNDERPRICED') {
                    log('PRIMUS', "Reason: Nonce issue or transaction replaced. Retrying with updated nonce/gas.", 'FgRed');
} else if (error.code === 'TRANSACTION_REPLACED') {
                    log('PRIMUS', `Reason: Transaction replaced. New hash: ${error.replacement.hash}`, 'FgRed');
} else if (error.code === 'UNPREDICTABLE_GAS_LIMIT') {
                    log('PRIMUS', "Reason: Gas estimation failed. This often means the transaction would revert on-chain.", 'FgRed');
log('PRIMUS', "Check contract logic, input parameters, or if the wallet has enough native token for gas.", 'FgRed');
} else if (error.code === 'CALL_EXCEPTION') {
                    log('PRIMUS', "Reason: Contract call reverted. Review contract's `tip` function for requirements.", 'FgRed');
log('PRIMUS', `Data: ${error.data}`, 'FgRed');
                } else if (error.code === 'NETWORK_ERROR' || error.code === 'SERVER_ERROR') {
                    log('PRIMUS', `Reason: RPC network issue. Code: ${error.code}`, 'FgRed');
}
            }
            throw error;
}
    }

    async run() {
        try {
            const { runAquaFlux, aquaFluxMintsPerWallet, runPrimusTip, primusTipCountPerWallet, primusUsernames, runAutoStaking, autoStakingTxCountPerWallet, runBrokex, brokexFaucet, brokexOpenPositionCount, brokexOpenPositionAmount, brokexClosePositionCount, brokexDepositLpCount, brokexDepositLpAmount, brokexWithdrawLpCount, brokexWithdrawLpAmount, brokexPositionOption, brokexLpOption } = this.operationParams;
            await showAllBalances(this.address, this.provider);
            const checkinClient = new CheckinClient({ address: this.address, wallet: this.wallet, userAgent: new UserAgent().toString(), proxyAgent: this.proxyAgent }, log);
            await checkinClient.runCheckinForAccount();
            const faucetClient = new FaucetClient({ address: this.address, privateKey: this.pk }, this.accountIndex, this.proxyAgent ? this.proxyAgent.proxy : null, API_BASE_URL, this.wallet, this.provider, log);
            await faucetClient.runFaucetForAccount();

            if (runAquaFlux) {
                for (let i = 0; i < aquaFluxMintsPerWallet; i++) {
                    log('SYSTEM', `--- Starting AquaFlux Mint #${i + 1}/${aquaFluxMintsPerWallet} for ${this.address} ---`, 'Bright', '💧');
                    const aquaFluxSuccess = await this.executeAquaFluxFlow(this.wallet, this.proxyAgent);
                    if (!aquaFluxSuccess) {
                        log('AQUAFLUX', `AquaFlux Mint #${i + 1} failed. Skipping remaining AquaFlux mints for this wallet.`, 'FgRed', '❌');
                    }
                    if (i < aquaFluxMintsPerWallet - 1) {
                        const delay = getRandomNumber(this.operationParams.minDelayMs, this.operationParams.maxDelayMs, 0);
                        log('SYSTEM', `Waiting ${delay/1000}s before next AquaFlux mint...`, 'FgDim', '⏳');
                        await new Promise(r => setTimeout(r, delay));
                    }
                }
            }

            if (runPrimusTip) {
                for (let i = 0; i < primusTipCountPerWallet; i++) {
                    log('SYSTEM', `--- Starting Primus Tip #${i + 1}/${primusTipCountPerWallet} for ${this.address} ---`, 'Bright', '💸');
                    try {
                        await this.sendPrimusTip(this.wallet, primusUsernames);
                    } catch (e) {
                        log('PRIMUS', `Primus Tip #${i + 1} failed for ${this.address}: ${e.message}`, 'FgRed', '❌');
                        const failDelay = getRandomNumber(this.operationParams.maxDelayMs * 2, this.operationParams.maxDelayMs * 4, 0);
                        log('SYSTEM', `Waiting ${failDelay/1000}s due to tip failure...`, 'FgDim', '⏳');
                        await new Promise(r => setTimeout(r, failDelay));
                    }
                    if (i < primusTipCountPerWallet - 1) {
                        const delay = getRandomNumber(this.operationParams.minDelayMs, this.operationParams.maxDelayMs, 0);
                        log('SYSTEM', `Waiting ${delay/1000}s before next Primus tip...`, 'FgDim', '⏳');
                        await new Promise(r => setTimeout(r, delay));
                    }
                }
            }

            if (runAutoStaking) {
                const autoStakingBot = new AutoStakingBot();
                let autoStakingOverallSuccess = true;
                for (let i = 0; i < autoStakingTxCountPerWallet; i++) {
                    log('SYSTEM', `--- Starting AutoStaking Pro tasks #${i + 1}/${autoStakingTxCountPerWallet} for ${this.address} ---`, 'Bright', '⚙️');
                    const autoStakingSuccess = await autoStakingBot.processPerformLoginAndTransactions(this.pk, this.address, this.proxyAgent);
                    if (autoStakingSuccess) {
                        log('AUTOSTAKING', `AutoStaking Pro transaction #${i + 1} completed successfully for ${this.address}!`, 'FgGreen', '✅');
                    } else {
                        log('AUTOSTAKING', `AutoStaking Pro transaction #${i + 1} failed for ${this.address}.`, 'FgRed', '❌');
                        autoStakingOverallSuccess = false;
                    }
                    if (i < autoStakingTxCountPerWallet - 1) {
                        const delay = getRandomNumber(this.operationParams.minDelayMs, this.operationParams.maxDelayMs, 0);
                        log('SYSTEM', `Waiting ${delay/1000}s before next AutoStaking Pro transaction...`, 'FgDim', '⏳');
                        await new Promise(r => setTimeout(r, delay));
                    }
                }
                if (autoStakingOverallSuccess) {
                    log('AUTOSTAKING', `Finished all AutoStaking Pro operations for ${this.address}!`, 'FgGreen', '✅');
                } else {
                    log('AUTOSTAKING', `Finished all AutoStaking Pro operations for ${this.address} with some failures.`, 'FgYellow', '⚠️');
                }
            }

            if (runBrokex) {
                log('SYSTEM', `--- Starting Brokex tasks for ${this.address} ---`, 'Bright', '💼');
                // Penting: Teruskan getRandomElement dari main.js ke BrokexClient
                const brokexClient = new BrokexClient(
                    { pk: this.pk, address: this.address, proxyAgent: this.proxyAgent }, 
                    log, 
                    getRandomElement // Teruskan fungsi getRandomElement
                );
                
                await brokexClient.initNonce();

                if (brokexFaucet) {
                    log('SYSTEM', `--- Starting Brokex Faucet Claim for ${this.address} ---`, 'Bright', '💧');
                    await brokexClient.runClaimFaucet();
                    const delay = getRandomNumber(this.operationParams.minDelayMs, this.operationParams.maxDelayMs, 0);
                    log('SYSTEM', `Waiting ${delay/1000}s before next Brokex task...`, 'FgDim', '⏳');
                    await new Promise(r => setTimeout(r, delay));
                }

                if (brokexPositionOption === 1) {
                    log('SYSTEM', `--- Starting Brokex Open Position tasks (${brokexOpenPositionCount}) for ${this.address} ---`, 'Bright', '📊');
                    await brokexClient.runOpenPosition(brokexOpenPositionCount, brokexOpenPositionAmount);
                    const delay = getRandomNumber(this.operationParams.minDelayMs, this.operationParams.maxDelayMs, 0);
                    log('SYSTEM', `Waiting ${delay/1000}s before next Brokex task...`, 'FgDim', '⏳');
                    await new Promise(r => setTimeout(r, delay));
                } else if (brokexPositionOption === 2) {
                    log('SYSTEM', `--- Starting Brokex Close Position tasks (${brokexClosePositionCount}) for ${this.address} ---`, 'Bright', '❌');
                    await brokexClient.runClosePosition(brokexClosePositionCount);
                    const delay = getRandomNumber(this.operationParams.minDelayMs, this.operationParams.maxDelayMs, 0);
                    log('SYSTEM', `Waiting ${delay/1000}s before next Brokex task...`, 'FgDim', '⏳');
                    await new Promise(r => setTimeout(r, delay));
                }

                if (brokexLpOption === 1) {
                    log('SYSTEM', `--- Starting Brokex Deposit Liquidity tasks (${brokexDepositLpCount}) for ${this.address} ---`, 'Bright', '💰');
                    await brokexClient.runDepositLiquidity(brokexDepositLpCount, brokexDepositLpAmount);
                    const delay = getRandomNumber(this.operationParams.minDelayMs, this.operationParams.maxDelayMs, 0);
                    log('SYSTEM', `Waiting ${delay/1000}s before next Brokex task...`, 'FgDim', '⏳');
                    await new Promise(r => setTimeout(r, delay));
                } else if (brokexLpOption === 2) {
                    log('SYSTEM', `--- Starting Brokex Withdraw Liquidity tasks (${brokexWithdrawLpCount}) for ${this.address} ---`, 'Bright', ' withdrawal');
                    await brokexClient.runWithdrawLiquidity(brokexWithdrawLpCount, brokexWithdrawLpAmount);
                    const delay = getRandomNumber(this.operationParams.minDelayMs, this.operationParams.maxDelayMs, 0);
                    log('SYSTEM', `Waiting ${delay/1000}s before next Brokex task...`, 'FgDim', '⏳');
                    await new Promise(r => setTimeout(r, delay));
                }

                log('BROKEX', `Finished all Brokex operations for ${this.address}!`, 'FgGreen', '✅');
            }

            log('ACCOUNT', `Finished all operations for ${this.address}.`, 'FgGreen', '✅');
            return { success: true, address: this.address, mintedNft: false };
        } catch (error) {
            log('ACCOUNT', `An error occurred during operations for ${this.address}: ${error.message}.`, 'FgRed', '❌');
            return { success: false, address: this.address, error: error.message };
        }
    }
}

async function saveMintedAddress(address, filename) {
    try {
        await fsp.appendFile(filename, `${address}\n`);
} catch (e) {
        log('SYSTEM', `Failed to save minted address to ${filename}: ${e.message}`, 'FgRed', '❌');
}
}

async function checkAllAccountPoints(accounts, operationParams) {
    log('POINTS', '--- Starting Point Check for All Accounts ---', 'Bright', '🌟');
let totalPoints = 0;

    for (const account of accounts) {
        const wallet = new ethers.Wallet(account.pk);
const address = wallet.address;
log('POINTS', `Checking points for ${address.slice(0, 10)}...`, 'FgCyan', '🔍');
try {
            const signature = await wallet.signMessage("pharos");
const loginUrl = `${API_BASE_URL}/user/login?address=${address}&signature=${signature}`;
            const loginRes = await fetch(loginUrl, {
                method: 'POST',
                headers: { 'Origin': 'https://testnet.pharosnetwork.xyz', 'Referer': 'https://testnet.pharosnetwork.xyz' },
                agent: account.proxyAgent
            });
if (!loginRes.ok) {
                log('POINTS', `[FAIL] Login failed for ${address.slice(0,10)}. Status: ${loginRes.status}`, 'FgRed', '❌');
continue;
            }

            const loginData = await loginRes.json();
const token = loginData?.data?.jwt;

            if (!token) {
                log('POINTS', `[FAIL] Could not get JWT token for ${address.slice(0,10)}.`, 'FgRed', '❌');
continue;
            }

            const profileUrl = `${API_BASE_URL}/user/profile?address=${address}`;
const profileRes = await fetch(profileUrl, {
                headers: { 'Authorization': `Bearer ${token}`, 'Origin': 'https://testnet.pharosnetwork.xyz', 'Referer': 'https://testnet.pharosnetwork.xyz' },
                agent: account.proxyAgent
            });
if (!profileRes.ok) {
                log('POINTS', `[FAIL] Profile fetch failed for ${address.slice(0,10)}. Status: ${profileRes.status}`, 'FgRed', '❌');
continue;
            }

            const profileData = await profileRes.json();
const points = profileData?.data?.user_info?.TotalPoints ?? 0;

log('POINTS', `${address}: ${points} Points`, 'FgGreen', '✅');
            totalPoints += points;
} catch (e) {
            log('POINTS', `[FAIL] Error checking points for ${address.slice(0,10)}: ${e.message}`, 'FgRed', '❌');
}

        const delay = getRandomNumber(operationParams.minDelayMs, operationParams.minDelayMs * 2, 0);
await new Promise(r => setTimeout(r, delay));
}

log('POINTS', `--- Total Points From All Accounts: ${totalPoints} ---`, 'Bright', '🌟');
}


async function processAccountOperation(account, operationParams) {
    const accountFullAddress = new ethers.Wallet(account.pk).address;

    const initialDelay = Math.floor(Math.random() * 5000);
await new Promise(r => setTimeout(r, initialDelay));
    console.log(`\n${Colors.Bright}--- Wallet: ${accountFullAddress} (starting after ${initialDelay/1000}s delay) ---${Colors.Reset}`);
if (account.proxyAgent) {
        const publicIp = await getPublicIpViaProxy(account.proxyAgent);
log('PROXY', `Connected via proxy. Public IP: ${publicIp}`, 'FgCyan', '🌐');
    } else {
        log('PROXY', 'No proxy configured for this account.', 'FgYellow', '⚠️');
}

    try {
        const provider = await buildFallbackProvider(PHAROS_RPC_URLS, PHAROS_CHAIN_ID, account.proxyAgent, accountFullAddress);
const processor = new AccountProcessor(account, operationParams, provider);
        return await processor.run();
} catch (err) {
        log('ACCOUNT', `A critical error occurred for ${accountFullAddress}: ${err.message}.`, 'FgRed', '❌');
return { success: false, address: accountFullAddress, error: `Unhandled system error: ${err.message}` };
}
}

async function loadPrivateKeys() {
    try {
        const data = fs.readFileSync('YourPrivateKey.txt', 'utf8');
return data.split('\n').map(line => line.trim()).filter(Boolean);
    } catch (e) {
        log('ERROR', 'YourPrivateKey.txt not found or empty. Please create it and add your private keys.', 'FgRed', '❌');
process.exit(1);
    }
}

async function loadProxies() {
    try {
        const data = fs.readFileSync('proxy.txt', 'utf8');
return data.split('\n').map(line => line.trim()).filter(Boolean);
    } catch (e) {
        log('WARNING', 'proxy.txt not found. Running without proxies.', 'FgYellow', '⚠️');
return [];
    }
}

function loadUsernames() {
    try {
        const data = fs.readFileSync('usernames.txt', 'utf8');
const user_ids = data.split('\n').map(line => line.trim()).filter(line => line.length > 0);
if (user_ids.length === 0) {
            log('WARNING', 'usernames.txt is empty. No user IDs to process.', 'FgYellow', '⚠️');
return [];
        }
log('CONFIG', `${user_ids.length} user IDs loaded from usernames.txt`, 'FgCyan', '✅');
return user_ids;
} catch (error) {
        if (error.code === 'ENOENT') {
            log('WARNING', 'usernames.txt not found. No user IDs will be used for Primus tipping.', 'FgYellow', '⚠️');
} else {
            log('ERROR', `Error reading usernames.txt: ${error.message}`, 'FgRed', '❌');
}
return [];
    }
}

async function loadPrimusTipAbi() {
    try {
        const abiString = fs.readFileSync('abiprimuslabs.json', 'utf8');
const abi = JSON.parse(abiString);
        if (!Array.isArray(abi)) {
            log('ERROR', "ABI loaded from abiprimuslabs.json is not a valid JSON array.", 'FgRed', '❌');
log('ERROR', "Please ensure the content of abiprimuslabs.json is an array (starts with '[' and ends with ']').", 'FgRed', '❌');
            process.exit(1);
}
log('CONFIG', "abiprimuslabs.json loaded successfully.", 'FgCyan', '✅');
return abi;
    } catch (error) {
        log('ERROR', `Error reading or parsing abiprimuslabs.json: ${error.message}`, 'FgRed', '❌');
log('ERROR', "Please ensure abiprimuslabs.json exists and is a valid JSON file.", 'FgRed', '❌');
        process.exit(1);
}
}


(async () => {
    process.on('uncaughtException', (err) => { log('CRITICAL', `UNCAUGHT EXCEPTION: ${err.message}.`, 'FgRed', '🚨'); console.error(err.stack); });
    process.on('unhandledRejection', (reason, promise) => { log('CRITICAL', `UNHANDLED REJECTION: ${reason?.stack || reason}.`, 'FgRed', '🚨'); });
    process.on('SIGINT', () => { log('SYSTEM', 'Ctrl+C detected. Exiting script...', 'FgYellow', '⚠️'); rl.close(); process.exit(); });

    let privateKeys = [], proxyUrls = [];
    try { privateKeys = fs.readFileSync('YourPrivateKey.txt', 'utf8').split('\n').map(line => line.trim()).filter(Boolean); log('CONFIG', `Loaded ${privateKeys.length} private keys.`, 'FgCyan', '✅'); } catch (e) { log('ERROR', 'YourPrivateKey.txt not found.', 'FgRed', '❌'); process.exit(1); }

    try {
        proxyUrls = fs.readFileSync('proxy.txt', 'utf8')
            .split('\n')
            .map(line => line.trim())
            .filter(Boolean);
        log('CONFIG', `Loaded ${proxyUrls.length} proxy entries.`, 'FgCyan', '✅');
} catch (e) {
        log('WARNING', 'proxy.txt not found.', 'FgYellow', '⚠️');
}

    PRIMUS_TIP_ABI = await loadPrimusTipAbi();


    if (privateKeys.length === 0) { log('ERROR', 'No valid accounts to process.', 'FgRed', '❌');
process.exit(1);
}

    const accountsToProcess = privateKeys.map((pk, i) => ({
        pk,
        address: new ethers.Wallet(pk).address,
        proxyAgent: proxyUrls[i] ? new HttpsProxyAgent(proxyUrls[i]) : null,
        accountIndex: i,
    }));
log('SYSTEM', 'Welcome! Please configure the tasks for the first run.', 'Bright', '👋');
    const operationParams = { aquaFluxMintsPerWallet: 0, primusTipCountPerWallet: 0, primusUsernames: [], runAutoStaking: false, autoStakingTxCountPerWallet: 0, runBrokex: false, brokexFaucet: false, brokexOpenPositionCount: 0, brokexOpenPositionAmount: 0, brokexClosePositionCount: 0, brokexDepositLpCount: 0, brokexDepositLpAmount: 0, brokexWithdrawLpCount: 0, brokexWithdrawLpAmount: 0, brokexPositionOption: 0, brokexLpOption: 0 };
const minSecs = await askQuestion({ message: `${Colors.FgBlue}⏳ Enter MINIMUM delay between TXs (seconds): ${Colors.Reset}` });
const maxSecs = await askQuestion({ message: `${Colors.FgBlue}⏳ Enter MAXIMUM delay between TXs (seconds): ${Colors.Reset}` });
    operationParams.minDelayMs = parseInt(minSecs) * 1000;
operationParams.maxDelayMs = parseInt(maxSecs) * 1000;
    if (isNaN(operationParams.minDelayMs) || isNaN(operationParams.maxDelayMs) || operationParams.maxDelayMs < operationParams.minDelayMs) { log('ERROR', 'Invalid delay settings.', 'FgRed', '❌');
process.exit(1); }

    const aquaFluxPrompt = `${Colors.FgBlue}💧 Perform AquaFlux tasks?\n   1. Yes\n   2. No\nEnter number: ${Colors.Reset}`;
const aquaFluxAnswer = await askQuestion({ message: aquaFluxPrompt });
    operationParams.runAquaFlux = aquaFluxAnswer.trim() === '1';
if (operationParams.runAquaFlux) {
        const aquaFluxMints = parseInt(await askQuestion({ message: `${Colors.FgBlue}[AquaFlux] How many mint operations per wallet?: ${Colors.Reset}` }));
if (isNaN(aquaFluxMints) || aquaFluxMints <= 0) {
            log('ERROR', 'Invalid AquaFlux mint count. Must be a positive number.', 'FgRed', '❌');
process.exit(1);
        }
        operationParams.aquaFluxMintsPerWallet = aquaFluxMints;
}

    const primusTipPrompt = `${Colors.FgBlue}💸 Perform Primus Tip tasks?\n   1. Yes\n   2. No\nEnter number: ${Colors.Reset}`;
const primusTipAnswer = await askQuestion({ message: primusTipPrompt });
    operationParams.runPrimusTip = primusTipAnswer.trim() === '1';
if (operationParams.runPrimusTip) {
        const loadedUsernames = loadUsernames();
if (loadedUsernames.length === 0) {
            log('ERROR', 'Cannot run Primus Tip. "usernames.txt" is empty or not found. Please create it and add usernames.', 'FgRed', '❌');
operationParams.runPrimusTip = false;
        } else {
            operationParams.primusUsernames = loadedUsernames;
const tipCount = parseInt(await askQuestion({ message: `${Colors.FgBlue}[Primus Tip] How many tips (to random usernames) to send per wallet per day?: ${Colors.Reset}` }));
if (isNaN(tipCount) || tipCount <= 0) {
                log('ERROR', 'Invalid Primus Tip count. Must be a positive number.', 'FgRed', '❌');
process.exit(1);
            }
            operationParams.primusTipCountPerWallet = tipCount;
}
    }

    const autoStakingPrompt = `${Colors.FgBlue}💰 Perform AutoStaking Pro tasks?\n   1. Yes\n   2. No\nEnter number: ${Colors.Reset}`;
const autoStakingAnswer = await askQuestion({ message: autoStakingPrompt });
    operationParams.runAutoStaking = autoStakingAnswer.trim() === '1';
if (operationParams.runAutoStaking) {
        const autoStakingTxCount = parseInt(await askQuestion({ message: `${Colors.FgBlue}[AutoStaking Pro] How many transactions (login + faucet + approval + multicall) to attempt per wallet?: ${Colors.Reset}` }));
if (isNaN(autoStakingTxCount) || autoStakingTxCount <= 0) {
            log('ERROR', 'Invalid AutoStaking Pro transaction count. Must be a positive number.', 'FgRed', '❌');
process.exit(1);
        }
        operationParams.autoStakingTxCountPerWallet = autoStakingTxCount;
}

    const brokexPrompt = `${Colors.FgBlue}💼 Perform Brokex tasks?\n   1. Yes\n   2. No\nEnter number: ${Colors.Reset}`;
    const brokexAnswer = await askQuestion({ message: brokexPrompt });
    operationParams.runBrokex = brokexAnswer.trim() === '1';

    if (operationParams.runBrokex) {
        const brokexFaucetPrompt = `${Colors.FgBlue}[Brokex] Claim Faucet?\n   1. Yes\n   2. No\nEnter number: ${Colors.Reset}`;
        const brokexFaucetAnswer = await askQuestion({ message: brokexFaucetPrompt });
        operationParams.brokexFaucet = brokexFaucetAnswer.trim() === '1';

        const brokexPositionPrompt = `${Colors.FgBlue}[Brokex] Choose Position Option:\n   1. Open Position\n   2. Close Position\n   3. Skipped\nEnter number: ${Colors.Reset}`;
        const brokexPositionAnswer = await askQuestion({ message: brokexPositionPrompt });
        operationParams.brokexPositionOption = parseInt(brokexPositionAnswer.trim());
        if (isNaN(operationParams.brokexPositionOption) || ![1, 2, 3].includes(operationParams.brokexPositionOption)) {
            log('ERROR', 'Invalid Brokex Position Option. Must be 1, 2, or 3.', 'FgRed', '❌');
            process.exit(1);
        }

        if (operationParams.brokexPositionOption === 1) {
            const openPosCount = parseInt(await askQuestion({ message: `${Colors.FgBlue}[Brokex] Open Position Count Per Wallet?: ${Colors.Reset}` }));
            if (isNaN(openPosCount) || openPosCount <= 0) {
                log('ERROR', 'Invalid Open Position Count. Must be a positive number.', 'FgRed', '❌');
                process.exit(1);
            }
            operationParams.brokexOpenPositionCount = openPosCount;

            const openPosAmount = parseFloat(await askQuestion({ message: `${Colors.FgBlue}[Brokex] Open Position Amount [Min 10] USDT?: ${Colors.Reset}` }));
            if (isNaN(openPosAmount) || openPosAmount < 10) {
                log('ERROR', 'Invalid Open Position Amount. Must be >= 10.', 'FgRed', '❌');
                process.exit(1);
            }
            operationParams.brokexOpenPositionAmount = openPosAmount;
        } else if (operationParams.brokexPositionOption === 2) {
            const closePosCount = parseInt(await askQuestion({ message: `${Colors.FgBlue}[Brokex] Close Position Count Per Wallet?: ${Colors.Reset}` }));
            if (isNaN(closePosCount) || closePosCount <= 0) {
                log('ERROR', 'Invalid Close Position Count. Must be a positive number.', 'FgRed', '❌');
                process.exit(1);
            }
            operationParams.brokexClosePositionCount = closePosCount;
        }

        const brokexLpPrompt = `${Colors.FgBlue}[Brokex] Choose LP Option:\n   1. Deposit Liquidity\n   2. Withdraw Liquidity\n   3. Skipped\nEnter number: ${Colors.Reset}`;
        const brokexLpAnswer = await askQuestion({ message: brokexLpPrompt });
        operationParams.brokexLpOption = parseInt(brokexLpAnswer.trim());
        if (isNaN(operationParams.brokexLpOption) || ![1, 2, 3].includes(operationParams.brokexLpOption)) {
            log('ERROR', 'Invalid Brokex LP Option. Must be 1, 2, or 3.', 'FgRed', '❌');
            process.exit(1);
        }

        if (operationParams.brokexLpOption === 1) {
            const depositLpCount = parseInt(await askQuestion({ message: `${Colors.FgBlue}[Brokex] Deposit Liquidity Count Per Wallet?: ${Colors.Reset}` }));
            if (isNaN(depositLpCount) || depositLpCount <= 0) {
                log('ERROR', 'Invalid Deposit Liquidity Count. Must be a positive number.', 'FgRed', '❌');
                process.exit(1);
            }
            operationParams.brokexDepositLpCount = depositLpCount;

            const depositLpAmount = parseFloat(await askQuestion({ message: `${Colors.FgBlue}[Brokex] Deposit Liquidity Amount USDT?: ${Colors.Reset}` }));
            if (isNaN(depositLpAmount) || depositLpAmount <= 0) {
                log('ERROR', 'Invalid Deposit Liquidity Amount. Must be > 0.', 'FgRed', '❌');
                process.exit(1);
            }
            operationParams.brokexDepositLpAmount = depositLpAmount;
        } else if (operationParams.brokexLpOption === 2) {
            const withdrawLpCount = parseInt(await askQuestion({ message: `${Colors.FgBlue}[Brokex] Withdraw Liquidity Count Per Wallet?: ${Colors.Reset}` }));
            if (isNaN(withdrawLpCount) || withdrawLpCount <= 0) {
                log('ERROR', 'Invalid Withdraw Liquidity Count. Must be a positive number.', 'FgRed', '❌');
                process.exit(1);
            }
            operationParams.brokexWithdrawLpCount = withdrawLpCount;

            const withdrawLpAmount = parseFloat(await askQuestion({ message: `${Colors.FgBlue}[Brokex] Withdraw Liquidity Amount LP?: ${Colors.Reset}` }));
            if (isNaN(withdrawLpAmount) || withdrawLpAmount <= 0) {
                log('ERROR', 'Invalid Withdraw Liquidity Amount. Must be > 0.', 'FgRed', '❌');
                process.exit(1);
            }
            operationParams.brokexWithdrawLpAmount = withdrawLpAmount;
        }
    }

log('SYSTEM', 'Configuration saved. These settings will be used for all subsequent daily runs.', 'FgGreen', '⚙️');
let runCount = 0;
while(true) {
        runCount++;
log('SYSTEM', `--- Starting Daily Run #${runCount} ---`, 'Bright', '☀️');
const results = await Promise.all(accountsToProcess.map(account =>
            processAccountOperation(account, operationParams).catch(err => {
                const address = new ethers.Wallet(account.pk).address;
                log('SYSTEM', `Caught an unhandled error for account ${address}: ${err.message}.`, 'FgRed', '🚨');
                return { success: false, address: address, error: `Unhandled system error: ${err.message}` };
            })
        ));
log('SUMMARY', '\n--- Account Processing Summary ---', 'Bright');
results.forEach(res => {
            if (res && res.address) {
                if (res.skipped) {
                    log('SUMMARY', `Account ${res.address}: ✅ SKIPPED (Already minted/registered)`, 'FgYellow');
                } else if (res.success) {
                    log('SUMMARY', `Account ${res.address}: ✅ SUCCESS`, 'FgGreen');
                } else {
                    log('SUMMARY', `Account ${res.address}: ❌ FAILED - ${res.error}`, 'FgRed');
                }
            } else {
                log('SUMMARY', `An unknown result was found.`, 'FgRed', '❓');
            }
        });
log('SUMMARY', '----------------------------------', 'Bright');

        await checkAllAccountPoints(accountsToProcess, operationParams);

        log('SYSTEM', 'The point summary above is based on the latest API data. You can also verify your stats on the here: https://pharoshub.xyz/', 'Bright', '🎉');
await runCountdown(DAILY_RUN_INTERVAL_HOURS);
    }
})();
