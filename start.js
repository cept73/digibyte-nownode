const http = require('http');
const { Controller } = require('./controller.js');

const server = http.createServer((request, response) => {
    const { headers, method, url } = request;

    // Website you wish to allow to connect
    response.setHeader('Access-Control-Allow-Origin', '*');

    // Request methods you wish to allow
    response.setHeader('Access-Control-Allow-Methods', 'GET, POST');

    // Request headers you wish to allow
    // response.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

    // Set to true if you need the website to include cookies in the requests sent
    // to the API (e.g. in case you use sessions)
    // response.setHeader('Access-Control-Allow-Credentials', true);

    let responseEnd = (el) => {
        console.log('=>', el)
        response.end(el)
    }

    let body = [];
    request
        .on('error', (err) => { console.error(err) })
        .on('data', (chunk) => { body.push(chunk) })
        .on('end', async () => {
            body = Buffer.concat(body).toString()
            const responseBody = { headers, method, url, body }

            response.on('error', (err) => {
                console.error(err);
            });

            response.writeHead(200, {'Content-Type': 'application/json'})

            let controller = new Controller()
            await controller.run(
                responseBody,
                (result) => {
                    responseEnd(JSON.stringify(result))
                }
            )
        });
})

server.listen(60001);
