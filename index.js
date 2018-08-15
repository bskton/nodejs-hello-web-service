const fs = require('fs');
const http = require('http');
const https = require('https');
const url = require('url');
const StringDecoder = require('string_decoder').StringDecoder;

const config = require('./config');

const httpServer = http.createServer((req, res) => {
  unifiedServer(req, res);
});
httpServer.listen(config.httpPort, () => {
  console.log('The http server is listening on port ' + config.httpPort + ' now.');
});

const httpsServerOptions = {
  key: fs.readFileSync('./https/key.pem'),
  cert: fs.readFileSync('./https/cert.pem')
};
const httpsServer = https.createServer(httpsServerOptions, (req, res) => {
  unifiedServer(req, res);
});
httpsServer.listen(config.httpsPort, () => {
  console.log('The https server is listening on port ' + config.httpsPort + ' now.');
});

const unifiedServer = (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;
  const trimmedPath = path.replace(/^\/+|\/+$/g, '');
  const headers = req.headers;
  const decoder = new StringDecoder('utf-8');
  let buffer = '';

  req.on('data', data => {
    buffer += decoder.write(data);
  });

  req.on('end', () => {
    buffer += decoder.end();

    const chosenHandler = typeof(router[trimmedPath]) !== 'undefined' 
      ? router[trimmedPath] : handlers.notFound;

    let payload;
    try {
      let payload = JSON.parse(buffer);

      const data = {
        trimmedPath: trimmedPath,
        payload: payload
      };
  
      chosenHandler(data, (statusCode, payload) => {
        statusCode = typeof(statusCode) == 'number' ? statusCode : 200;
        payload = typeof(payload) == 'object' ? payload : {};
        const payloadString = JSON.stringify(payload);
        res.setHeader('Content-Type', 'application/json')
        res.writeHead(statusCode);
        res.end(payloadString);
      });
    } catch (e) {
      res.writeHead(400);
      res.end();
    }
  });
};

const handlers = {
  hello: (data, callback) => {
    let name = typeof(data.payload.name) !== 'undefined' ? data.payload.name : 'World';
    name = name.trim();
    name = name == '' ? 'World' : name;
    const result = {
      message: 'Hello ' + name + '!'
    };
    callback(200, result);
  },
  notFound: (data, callback) => {
    callback(404);
  }
};

const  router = {
  'hello': handlers.hello
};