const { start, handler } = require('./server');
const cli = require('./cli');

if (module === require.main) {
  if (process.argv.length > 2) {
    cli();
  }
  else {
    start();
  }
}

module.exports = handler;
