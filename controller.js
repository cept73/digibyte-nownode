const { DigiByteService } = require('./DigiByteService.js')
require('dotenv').config()


class Controller
{
    ROUTES = {
        'test-connect'      : 'actionTestConnect',
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
            return finishFunction({
                'status'    : 'error',
                'message'   : 'Please set up environment'
            })
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
            return finishFunction({
                'status'    : 'error',
                'message'   : 'address is not specified'
            })
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
        if (!address) {
            return finishFunction({
                'status'    : 'error',
                'message'   : 'address is not specified'
            })
        }

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
        let paymentFee          = this.DigiByteServiceInstance.FEE_TO_SEND_DGB / this.DigiByteServiceInstance.SAT_IN_DGB

        let operations;

	    let operationInfoByIndex = function (params, index) {
            let indexBase = 'operations[' + index + ']';
            let address = paramsArray[indexBase + '[addr]'];
            if (!address) {
                return null;
            }

            let value = paramsArray[indexBase + '[value]'];
            let times = paramsArray[indexBase + '[times]'];
            if (!times) {
                times = 1;
            }

            return {
                address	: address,
                value	: value,
                times	: times
            }
        }

        let info = operationInfoByIndex(paramsArray, 0);
        if (info) {
            operations = []
            let index = 0
            while (info) {
                operations.push(info)

                index ++
                info = operationInfoByIndex(paramsArray, index)
            }
        } else {
            let amount = parseFloat(paramsArray['overallSum']) - paymentFee
            let address = paramsArray['destinationAddress']
            if (!address) {
                address = process.env.ADMIN_ADDRESS;
            }
            operations = [{ address: address, value: amount, times: 1 }]
        }

        await this.DigiByteServiceInstance.sendFunds(sourcePrivateKey, sourceAddress, operations, console.log).then(
            (result) => {
                finishFunction(result)
            }
        )
    }

    actionGetTxInfo(params, finishFunction)
    {
        let tx = params['tx'];
        if (!tx) {
            return finishFunction({
                'status'    : 'error',
                'message'   : 'tx is not specified'
            })
        }

        this.DigiByteServiceInstance.getTransactionInfo(tx).then(
            (result) => {
                finishFunction(result)
            }
        );
    }

    actionTestConnect(params, finishFunction)
    {
        finishFunction({
            'status'    : 'ok',
        })
    }
}

exports.Controller = Controller
