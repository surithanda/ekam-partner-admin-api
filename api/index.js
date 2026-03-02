const app = require('../server');
const { initErrorCodes } = require('../config/errorCodes');

let initialized = false;

module.exports = async (req, res) => {
  if (!initialized) {
    await initErrorCodes();
    initialized = true;
  }
  return app(req, res);
};
