const { handler } = require('./server');

module.exports = function cli() {
  const res = {
      send: msg => {
        console.log(msg);
        return res;
      },
      sendStatus: code => {
        console.log(`Empty HTTP response with status code ${code}`);
        return res;
      },
      status: code => {
        console.log(`Setting HTTP status code to ${code}`);
        return res;
      },
      set: (name, value) => {
        return res;
      },
    },
    req = process.argv[2] === 'd'
      ? { method: 'GET', path: process.argv[3] }
      : { method: 'POST', body: process.argv.length > 3 ? process.argv[3] : '' };
    req.get = header => '';
  
  handler(req, res);
};
