const { DigiByteService } = require('./DigiByteService.js')
require('dotenv').config()


class Controller
{
    ROUTES = {
        'generate-wallet'   : 'actionGenerateWallet',
        'check-wallet'      : 'actionCheckWallet',
        'get-unspent-txo'   : 'actionGetUnspentTxo',
        'send-funds'        : 'actionSendFunds',
        'get-tx-info'       : 'actionGetTxInfo'
    }

    DigiByteServiceInstance = new DigiByteService(process.env.NOWNODES_API_KEY)

    run(jsonRequest, finishFunction)
    {
        if (!process.env.NOWNODES_API_KEY) {
            finishFunction({
                'status'    : 'error',
                'message'   : 'Please set up environment'
            })
            return
        }

        let cmd = jsonRequest.url.substring(1)
        let params = this._detectParamsFromRequest(jsonRequest)

        const paramsList = params ? ' with params: ' + JSON.stringify(params) : ''

        console.log('Run command: ' + cmd + paramsList)

        if (cmd in this.ROUTES) {
            let action = this.ROUTES[cmd]
            this[action](params, finishFunction)
            return
        }

        finishFunction({
            'status'    : 'error',
            'message'   : 'Unknown command'
        })
    }

    _detectParamsFromRequest(jsonRequest)
    {
        let params
        try {
            // Thanks to https://stackoverflow.com/a/8649003
            params = !jsonRequest.body ? '[]' : JSON.parse(
                `{"${decodeURI(jsonRequest.body)
                    .replace(/"/g, '\\"')
                    .replace(/&/g, '","')
                    .replace(/=/g, '":"')}"}`
            )
        }
        catch (e) {
            params = jsonRequest.body
        }
        if (params === '[]') {
            params = null
        }

        return params
    }

    actionGenerateWallet(params, finishFunction)
    {
        let newWalletInfo = this.DigiByteServiceInstance.getNewWallet()
        newWalletInfo['status'] = 'ok'

        finishFunction(newWalletInfo)
    }

    actionCheckWallet(params, finishFunction)
    {
        let address = params['address'];
        if (!address) {
            finishFunction({
                'status'    : 'error',
                'message'   : 'Unknown command'
            })

            return;
        }

        this.DigiByteServiceInstance.getWalletBalance(address).then(
            (result) => {
                finishFunction({
                    'status'    : 'ok',
                    'balance'   : result
                })
            }
        )
    }

    actionGetUnspentTxo(params, finishFunction)
    {
        let address = params['address']

        this.DigiByteServiceInstance.getUnspentTransactionOutput(address).then(
            (result) => {
                finishFunction(result)
            }
        );
    }

    async actionSendFunds(params, finishFunction)
    {
        const paramsArray       = params // JSON.parse(params)
        const sourceAddress     = paramsArray['address']
        const sourcePrivateKey  = paramsArray['privateKey']
        const toAddress         = process.env.ADMIN_ADDRESS
        const amount            = parseFloat(process.env.AMOUNT_TO_DEPOSIT) - (this.DigiByteServiceInstance.FEE_TO_SEND_DGB / this.DigiByteServiceInstance.SAT_IN_DGB)

        let operations          = [{ address: toAddress, value: amount, times: 1 }]

        await this.DigiByteServiceInstance.sendFunds(sourcePrivateKey, sourceAddress, operations, console.log).then(
            (result) => {
                finishFunction(result)
            }
        )
    }

    actionGetTxInfo(params, finishFunction)
    {
        this.DigiByteServiceInstance.getTransactionInfo(params['tx']).then(
            (result) => {
                finishFunction(result)
            }
        );
    }
}

exports.Controller = Controller
