
const DigiByte  = require('digibyte')
const Request   = require('request')

class DigiByteService
{
    EXPLORER_URL    = 'https://dgb.nownodes.io/api/v2/'
    SAT_IN_DGB      = 100000000
    FEE_TO_SEND_DGB = 0.0001 * this.SAT_IN_DGB

    constructor(nowNodesApiKey)
    {
        this.nowNodesApiKey = nowNodesApiKey
    }

    getNewWallet()
    {
        let wallet = DigiByte.PrivateKey()

        return {
            address     : wallet.toLegacyAddress().toString(),
            privateKey  : wallet.toWIF()
        }
    }

    getNowNodesOptions()
    {
        return {'headers': {'api-key': this.nowNodesApiKey}}
    }

    async getWalletBalance(address)
    {
        let url         = this.EXPLORER_URL + 'address/' + address
        let options     = this.getNowNodesOptions()
        let response    = await this._sendRequestToUrl(url, options)
        let resultJson  = JSON.parse(response.toString())

        return resultJson.balance
    }

    async getTransactionInfo(tx)
    {
        let url = this.EXPLORER_URL + 'tx/' + tx
        let options = this.getNowNodesOptions()
        let response = await this._sendRequestToUrl(url, options)

        return JSON.parse(response.toString())
    }

    async getUnspentTransactionOutput(address)
    {
        let url = this.EXPLORER_URL + 'ut' + 'xo/' + address
        let options = this.getNowNodesOptions()
        let response = await this._sendRequestToUrl(url, options)

        return JSON.parse(response.toString())
    }

    async sendFunds(sourcePrivateKeyWIF, sourceAddress, operations, callbackFunction, data)
    {
        let sourcePrivateKey = DigiByte.PrivateKey.fromWIF(sourcePrivateKeyWIF)

        return new Promise((resolve, reject) => {
            this.getWalletBalance(sourceAddress).then(balance => {
                this.getUnspentTransactionOutput(sourceAddress).then(async (UTXOs) => {
                    if (!UTXOs.length) {
                        return reject({
                            'result'    : 'error',
                            'message'   : 'The source address has no unspent transactions'
                        });
                    }

                    let changePrivateKey    = new DigiByte.PrivateKey()
                    let changeAddress       = changePrivateKey.toAddress()
                    let transaction         = this._makeTransactionFromFromUTXOs(UTXOs, sourceAddress)
                    this.satoshiLeft        = parseInt(balance)
                    transaction             = this._addTransactionToFromOperations(transaction, operations, sourceAddress)

                    if (data) {
                        transaction.addData(data)
                    }
                    transaction.change(changeAddress)
                    transaction.sign(sourcePrivateKey)

                    let txData = {
                        'source_private_key': sourcePrivateKeyWIF,
                        'source_address'    : sourceAddress,
                        'change_private_key': changePrivateKey.toWIF(),
                        'change_address'    : changeAddress,
                        'sent_amount'       : balance
                    };

                    let result = await this._sendTransaction(transaction)

                    resolve(Object.assign(result, txData))
                    if (callbackFunction) {
                        callbackFunction('ok', 'deposited to pay fee for issue');
                    }
                }, error => {
                    console.log('Error happened', error)
                    if (callbackFunction) {
                        callbackFunction('error', error)
                    }
                    reject(error)
                })
            })
        }).then(result => {
            return result;
        })
    }

    async _sendTransaction(transaction)
    {
        let url = this.EXPLORER_URL + 'send' + 'tx/' + transaction.serialize(true)
        let options = this.getNowNodesOptions()
        let response = await this._sendRequestToUrl(url, options).catch(error => {
            return error;
        })
        return JSON.parse(response.toString())
    }

    async _sendRequestToUrl(url, options = {})
    {
        return new Promise(function (resolve, reject) {
            Request(url, options, function (error, res, body) {
                if (!error && res.statusCode === 200) {
                    resolve(body);
                } else {
                    reject(res.body);
                }
            });
        });
    }

    _makeTransactionFromFromUTXOs(UTXOs, sourceAddress)
    {
        let transaction = new DigiByte.Transaction()

        for (let index = 0; index < UTXOs.length; index++) {
            let ut = {
                address     : sourceAddress,
                txid        : UTXOs[index]['txid'],
                vout        : UTXOs[index]['vout'],
                ts          : UTXOs[index]['height'],
                scriptPubKey: UTXOs[index]['scriptPubKey'],
                amount      : parseFloat(UTXOs[index]['value']) / this.SAT_IN_DGB,
                confirmationsFromCache: false
            }

            transaction.from(ut)
        }

        return transaction
    }

    _addTransactionToFromOperations(transaction, operations, sourceAddress)
    {
        for (let index in operations) {
            if (!operations.hasOwnProperty(index)) {
                continue
            }

            let line = operations[index]
            if (!line.times) {
                line.times = 1
            }

            for (let i = 0; i < line.times; i++) {
                if (line.address === 'issueAddress') {
                    line.address = sourceAddress
                }

                let sum = parseInt(line.value * this.SAT_IN_DGB)
                if (sum < 0) {
                    sum += this.satoshiLeft
                }
                transaction.to(line.address, sum)

                this.satoshiLeft -= sum
                if (this.satoshiLeft < this.FEE_TO_SEND_DGB) {
                    console.log('!!! No satoshi left in send-us: ' + this.satoshiLeft  + '<' + this.FEE_TO_SEND_DGB)
                }
            }
        }

        if (this.satoshiLeft > this.FEE_TO_SEND_DGB) {
            let sum = this.satoshiLeft - this.FEE_TO_SEND_DGB
            transaction.to(sourceAddress, sum)
        }

        return transaction
    }
}

exports.DigiByteService = DigiByteService
