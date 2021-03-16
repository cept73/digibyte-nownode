
// dotenv is good to store secrets.
// just copy .env.example to .env and edit it to take from application later
require('dotenv').config()

// you might get api key from NowNode
const NowNodesApiKey = process.env.NOWNODES_API_KEY

// initialize library using specified API key
const { DigiByteService } = require('./DigiByteService.js')
DigiByteServiceInstance = new DigiByteService(NowNodesApiKey)

// generate wallet
let wallet = DigiByteServiceInstance.getNewWallet()
console.log('wallet is', wallet)
/* => wallet is {
    address: 'DRKX2cTQgUHnkP3JWB7rKmzkCA2tgXG756',
    privateKey: 'L21sBxCsKqar3WBy88kjGZHdK2pTryCTq63qXnJ7MYihWKu6XhKK'
} */

// get balance of address. callbackFunction get 1 param with result
DigiByteServiceInstance.getWalletBalance(wallet.address).then((balance) => {
    console.log('balance is', balance, 'sat')
    // => balance is 0
})

// send funds
const sourcePrivateKey  = wallet.privateKey
const sourceAddress     = wallet.address
const thanksToAddress   = 'DFG49nPLCtKF4RkH9vSp6rQpJogo2L8ReF';
let operations          = [{ address: thanksToAddress, value: 0.001, times: 1 }]
// also 0.0001 will be used as fee (specified in DigiByteService)

DigiByteServiceInstance.sendFunds(sourcePrivateKey, sourceAddress, operations, (status, result) => {
    console.log('send result:', status, 'result:', result)
    // => send result: ok result: deposited
}).then((result) => {
    console.log('after all: ', result);
    // => after all: {
    //   result: '...',
    //   source_private_key: '...',
    //   source_address: '...',
    //   change_private_key: '...',
    //   change_address: Address {
    //     ...
    //     },
    //     type: 'paytowitnesspublickeyhash'
    //   },
    //   sent_amount: '1000000'
    // }
})

