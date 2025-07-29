import fs from "fs";
import path from "path";
import axios from "axios";
import { HttpsProxyAgent } from "https-proxy-agent";
import { ethers } from "ethers";
import { jwtDecode } from "jwt-decode";
import AsyncLock from "async-lock";
const lock = new AsyncLock();

function _isArray(obj) {
  return Array.isArray(obj) && obj.length > 0;
}

const faucetInternalSettings = {
  BASE_URL: "https://api.pharosnetwork.xyz",
  DELAY_BETWEEN_REQUESTS: [3, 20],
};

async function sleep(seconds = null) {
  if (seconds && typeof seconds === "number") return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
  let min = faucetInternalSettings.DELAY_BETWEEN_REQUESTS[0];
  let max = faucetInternalSettings.DELAY_BETWEEN_REQUESTS[1];
  if (seconds && Array.isArray(seconds)) {
    min = seconds[0];
    max = seconds[1];
  }
  min = min || faucetInternalSettings.DELAY_BETWEEN_REQUESTS[0];
  max = max || faucetInternalSettings.DELAY_BETWEEN_REQUESTS[1];
  return await new Promise((resolve) => {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    setTimeout(resolve, delay * 1000);
  });
}

function isTokenExpired(token) {
  if (!token) return { isExpired: true, expirationDate: new Date().toLocaleString() };
  try {
    const payload = jwtDecode(token);
    if (!payload) return { isExpired: true, expirationDate: new Date().toLocaleString() };
    const now = Math.floor(Date.now() / 1000);
    const expirationDate = payload.exp ? new Date(payload.exp * 1000).toLocaleString() : "Infinity";
    const isExpired = now > payload.exp;
    return { isExpired, expirationDate };
  } catch (error) {
    return { isExpired: true, expirationDate: new Date().toLocaleString() };
  }
}

function getRandomElement(arr) {
  const randomIndex = Math.floor(Math.random() * arr.length);
  return arr[randomIndex];
}

function getRandomNumber(min, max, fix = 2) {
  return Number((Math.random() * (max - min) + min).toFixed(fix));
}

async function saveJson(id, value, filename) {
  await lock.acquire("fileLock", async () => {
    const filePath = path.join(process.cwd(), filename);
    try {
      let jsonData = {};
      if (fs.existsSync(filePath)) {
        const data = fs.readFileSync(filePath, "utf8");
        if (data) {
          jsonData = JSON.parse(data);
        }
      }
      jsonData[id] = value;
      fs.writeFileSync(filePath, JSON.stringify(jsonData, null, 4));
    } catch (error) {
      console.error(`Error saving JSON to ${filename}: ${error.message}`);
    }
  });
}

const headers = {
  Accept: "*/*",
  "Accept-Encoding": "gzip, deflate, br",
  "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
  Origin: "https://testnet.pharosnetwork.xyz",
  Referer: "https://testnet.pharosnetwork.xyz/",
  "Sec-Ch-Ua-Mobile": "?0",
  "Sec-Fetch-Dest": "empty",
  "Sec-Fetch-Mode": "cors",
  "Sec-Fetch-Site": "same-origin",
  "Cache-Control": "no-cache",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
};
export class FaucetClient {
  constructor(accountData, accountIndex, proxy, baseURL, walletInstance, providerInstance, logFunction) {
    this.baseURL = baseURL;
    this.accountIndex = accountIndex;
    this.proxy = proxy;
    this.log = logFunction;
    this.session_name = accountData.address;
    this.token = null;
    this.localStorage = {};
    this.wallet = walletInstance;
    this.provider = providerInstance;

    this.headers = headers;

    this.axiosInstance = axios.create({
      timeout: 120000,
      headers: this.headers,
      ...(this.proxy ? { httpsAgent: new HttpsProxyAgent(this.proxy), httpAgent: new HttpsProxyAgent(this.proxy) } : {}),
    });
  }

  async #load_localStorage() {
    const filePath = path.join(process.cwd(), "localStorage.json");
    try {
      if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify({}, null, 4));
      }
      const data = fs.readFileSync(filePath, "utf8");
      if (data) {
        this.localStorage = JSON.parse(data);
      } else {
        this.localStorage = {};
      }
    } catch (error) {
      this.log('FAUCET', `Error loading or creating localStorage.json: ${error.message}`, 'FgRed', '❌');
      this.localStorage = {};
    }
  }

  async makeRequest(
    url,
    method,
    data = {},
    options = {
      retries: 2,
      isAuth: false,
      extraHeaders: {},
      refreshToken: null,
    }
  ) {
    const { retries, isAuth, extraHeaders } = options;
    const currentHeaders = {
      ...this.headers,
      ...extraHeaders,
    };
    if (this.token && !isAuth) {
      currentHeaders["authorization"] = `Bearer ${this.token}`;
    }

    let currRetries = 0;
    do {
      try {
        const response = await this.axiosInstance({
          method,
          url: `${url}`,
          headers: currentHeaders,
          ...(method.toLowerCase() !== "get" ? { data: data } : {}),
        });
        if (response?.data?.code == 0 || response?.data?.msg == "ok") {
          return { success: true, data: response.data.data || response.data, status: response.status };
        } else {
          return { success: false, data: response.data, error: response.data?.msg || response.data?.error || response.data, status: response.status };
        }
      } catch (error) {
        const errorMessage = error?.response?.data?.error || error?.response?.data?.msg || error.message;
        const errorStatus = error?.response?.status || 0;
        this.log('FAUCET', `Request failed (${currRetries + 1}/${retries + 1}): ${url} | ${JSON.stringify(errorMessage)}`, 'FgYellow', '⚠️');
        if (errorStatus === 401 && !isAuth) {
          this.log('FAUCET', `Token invalid or expired, trying to get a new token...`, 'FgYellow', '⚠️');
          const newToken = await this.getValidToken(true);
          if (newToken) {
            this.token = newToken;
            return this.makeRequest(url, method, data, options);
          } else {
            this.log('FAUCET', `Failed to get a new token after 401.`, 'FgRed', '❌');
            return { success: false, status: errorStatus, error: errorMessage, data: null };
          }
        } else if (errorStatus === 400) {
          this.log('FAUCET', `Invalid request for ${url}, there might be a new update from the server!`, 'FgRed', '❌');
          return { success: false, status: errorStatus, error: errorMessage, data: null };
        } else if (errorStatus === 429) {
          this.log('FAUCET', `Rate limit exceeded, waiting 30 seconds to retry`, 'FgYellow', '⚠️');
          await sleep(30);
        } else {
          await sleep(getRandomNumber(faucetInternalSettings.DELAY_BETWEEN_REQUESTS[0], faucetInternalSettings.DELAY_BETWEEN_REQUESTS[1]));
        }
        currRetries++;
        if (currRetries > retries) {
          return { success: false, status: errorStatus, error: errorMessage, data: null };
        }
      }
    } while (currRetries <= retries);
    return { success: false, status: errorStatus, error: errorMessage, data: null };
  }

  async auth() {
    const signedMessage = await this.wallet.signMessage("pharos");
    return this.makeRequest(`${this.baseURL}/user/login?address=${this.wallet.address}&signature=${signedMessage}`, "post", null, { isAuth: true });
  }

  async getFaucetStatus() {
    return this.makeRequest(`${this.baseURL}/faucet/status?address=${this.wallet.address}`, "get");
  }

  async faucet() {
    return this.makeRequest(`${this.baseURL}/faucet/daily?address=${this.wallet.address}`, "post");
  }

  async getValidToken(isNew = false) {
    await this.#load_localStorage();
    const existingTokenData = this.localStorage[this.session_name];
    let existingToken = null;
    if (existingTokenData) {
      try {
        const parsedData = JSON.parse(existingTokenData);
        existingToken = parsedData.jwt;
      } catch (e) {
        this.log('FAUCET', `Failed to parse token from localStorage for ${this.session_name}: ${e.message}`, 'FgYellow', '⚠️');
      }
    }

    const { isExpired: isExp, expirationDate } = isTokenExpired(existingToken);
    this.log('FAUCET', `Access token status: ${isExp ? "Expired" : "Valid"} | Access token exp: ${expirationDate}`, isExp ? "FgYellow" : "FgGreen", isExp ? '⚠️' : '✅');
    if (existingToken && !isNew && !isExp) {
      this.log('FAUCET', "Using valid token", 'FgGreen', '✅');
      this.token = existingToken;
      return existingToken;
    }

    this.log('FAUCET', "No token found or expired, trying to get a new token...", 'FgYellow', '⚠️');
    const loginRes = await this.auth();
    if (!loginRes.success) {
      this.log('FAUCET', `Authentication failed: ${JSON.stringify(loginRes.error || loginRes.data)}`, 'FgRed', '❌');
      return null;
    }
    const newToken = loginRes.data;
    if (newToken?.jwt) {
      this.token = newToken.jwt;
      await saveJson(this.session_name, JSON.stringify(newToken), "localStorage.json");
      return newToken.jwt;
    }
    this.log('FAUCET', "Could not get a new token...", 'FgYellow', '⚠️');
    return null;
  }

  async handleFaucet() {
    this.log('FAUCET', `Initiating claim process...`, 'FgCyan', '➡️');
    const resGetPHRS = await this.getFaucetStatus();
    if (resGetPHRS.success && resGetPHRS.data?.is_able_to_faucet) {
      this.log('FAUCET', "Attempting daily PHRS claim...", 'FgBlue', '💧');
      const resPHRS = await this.faucet();
      if (resPHRS.success) {
        this.log('FAUCET', `PHRS claim successful!`, 'FgGreen', '✅');
      } else {
        this.log('FAUCET', `PHRS claim failed: ${JSON.stringify(resPHRS.error || resPHRS.data)}`, 'FgYellow', '⚠️');
      }
    } else {
      if (resGetPHRS.success && resGetPHRS.data?.avaliable_timestamp) {
        this.log('FAUCET', `Next PHRS claim available on: ${new Date(resGetPHRS.data?.avaliable_timestamp * 1000).toLocaleString()}`, 'FgYellow', '⚠️');
      } else {
        this.log('FAUCET', `PHRS claim not available or failed to get status: ${JSON.stringify(resGetPHRS.error || resGetPHRS.data)}`, 'FgYellow', '⚠️');
      }
    }
  }

  async runFaucetForAccount() {
    this.log('FAUCET', `Starting Faucet tasks for ${this.session_name.slice(0, 8)}...`, 'Bright', '💰');
    await this.handleFaucet();
  }
}
