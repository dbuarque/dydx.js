declare var require: any
declare var process: any
import { DYDX } from './DYDX';
import { TestToken as TestTokenContract } from '@dydxprotocol/protocol';
import { Margin as MarginContract } from '@dydxprotocol/protocol';
import Web3Utils from 'web3-utils';
const contract  = require('truffle-contract');
const fs =require('fs');
const solc = require('solc');
const Web3 = require('web3');
const BigNumber = require('bignumber.js');

// Connect to local Ethereum node
const web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));
web3.eth.defaultAccount = web3.eth.accounts[0];

// Compile the source code
const BIGNUMBERS = {
    ZERO: new BigNumber(0),
    ONE_DAY_IN_SECONDS: new BigNumber(60 * 60 * 24),
    ONE_YEAR_IN_SECONDS: new BigNumber(60 * 60 * 24 * 365),
    ONES_127: new BigNumber("340282366920938463463374607431768211455"), // 2**128-1
    ONES_255: new BigNumber(
        "115792089237316195423570985008687907853269984665640564039457584007913129639935"
    ), // 2**256-1
};

const TestToken = contract({
  abi: TestTokenContract.abi,
  bytecode: TestTokenContract.bytecode
});
TestToken.setProvider(web3.currentProvider);
TestToken.defaults({
  from: web3.eth.coinbase,
  gas: 1000000
});


const abi = TestTokenContract.abi;
const bytecode = TestTokenContract.bytecode;
// Contract object
const tcontract = web3.eth.contract(abi);
let dydx = null;
function setDYDXProvider(provider) {
  if (dydx == null) {
    dydx = new DYDX(provider, Number(1212));
  } else {
    dydx.setProvider(provider);
  }
}


//Deploy ERC20
function deployERC20() {
  return new Promise((resolve, reject) => {
    const HeldTokenInstance = tcontract.new({
      data: '0x' + bytecode,
      from: web3.eth.coinbase,
      gas: 1000000
    },(err,res) => {
      console.log("hi");
      if(err) reject(err);

      if(res.address) {
        resolve(res.address);
      }
    })
  })
}

function getAccounts() {
  return new Promise((resolve,reject)=>{
    const accounts = web3.eth.getAccounts((err,res)=>{
      if(err) reject(err);
      else {
        resolve(res);
      }
    })
  })
}

async function openPositionWithoutCounterparty() {
  setDYDXProvider(web3.currentProvider);
  const HeldToken = await TestToken.new();
  const OwedToken = await TestToken.new();
  const accounts = await getAccounts();
  console.log(HeldToken, OwedToken);

  //console.log(dydx.contracts.proxy.address);
  //console.log(accounts);
  //
  const trader = accounts[1];
  const positionOwner = accounts[2];
  const loanOwner =  accounts[3];
  const deposit =  new BigNumber('10000');
  const principal = new BigNumber('5000');
  const nonce = new BigNumber('19238');
  const callTimeLimit = new BigNumber('1000');
  const maxDuration = new BigNumber('10000');
  const interestRate = new BigNumber('6');
  const interestPeriod = new BigNumber('1000');


  // issue and set allowances of the tokens
  await issueAndSetAllowance(
      HeldToken.address,
      trader,
      deposit,
      dydx.contracts.proxy.address);
//
// //get the starting balances
  const startingBalances = await getBalances(HeldToken.address, trader);
  console.log(startingBalances);
//
  let openedPosition;
  let myPos;
//
//
//
  openedPosition = await dydx.margin.openWithoutCounterparty(
      trader,
      positionOwner,
      loanOwner,
      OwedToken.address,
      HeldToken.address,
      nonce,
      deposit,
      principal,
      callTimeLimit,
      maxDuration,
      interestRate,
      interestPeriod );
      // console.log(openedPosition);
      // const isThere = await dydx.margin.containsPosition(openedPosition.id);
      // console.log('Position has been stored', isThere);
  console.log(openedPosition);


}
// unclear if i need this just yet
async function issueAndSetAllowance(
  tokenAddress,
  account,
  amount,
  allowed
) {
  console.log(allowed);
  const tokenInstance = TestToken.at(tokenAddress);
  try{
  await Promise.all([
    tokenInstance.issueTo(account, amount),
    tokenInstance.approve(allowed, amount, { from: account })
  ]); } catch(err) {
    console.log(err);
  }
}

async function getBalances(tokenAddress,trader ) {
  const heldToken = TestToken.at(tokenAddress);
  const [
    traderHeldToken,
    vaultHeldToken
  ] = await Promise.all([
    heldToken.balanceOf.call(trader),
    heldToken.balanceOf.call(dydx.contracts.vault.address),
  ]);

  return { traderHeldToken, vaultHeldToken };
}

// Deploy contract instance
//
openPositionWithoutCounterparty();
