const addressService = require('../services/addressVerification');
const { createAppError } = require('../config/errorCodes');

const addressController = {
  /**
   * POST /api/address/lookup-by-zip
   * Body: { zip, country? }
   */
  async lookupByZip(req, res, next) {
    try {
      const { zip, country } = req.body;
      if (!zip || zip.toString().trim().length < 3) {
        throw createAppError('PA_AVLK_001_INVALID_ZIP');
      }
      const results = await addressService.lookupByZip(zip.toString().trim(), country);
      return res.json({ success: true, data: results });
    } catch (error) { next(error); }
  },

  /**
   * POST /api/address/lookup-by-city
   * Body: { city, country? }
   */
  async lookupByCity(req, res, next) {
    try {
      const { city, country } = req.body;
      if (!city || city.toString().trim().length < 3) {
        throw createAppError('PA_AVLK_002_INVALID_CITY');
      }
      const results = await addressService.lookupByCity(city.toString().trim(), country);
      return res.json({ success: true, data: results });
    } catch (error) { next(error); }
  },

  /**
   * POST /api/address/verify
   * Body: { address_line1, address_line2?, city, state, zip, country? }
   */
  async verifyAddress(req, res, next) {
    try {
      const { address_line1, address_line2, city, state, zip, country } = req.body;
      if (!address_line1 || !city || !state || !zip) {
        throw createAppError('PA_AVVR_001_INVALID_ADDRESS');
      }
      const result = await addressService.verifyAddress({
        address_line1: address_line1.toString().trim(),
        address_line2: (address_line2 || '').toString().trim(),
        city: city.toString().trim(),
        state: state.toString().trim(),
        zip: zip.toString().trim(),
        country: (country || 'us').toString().trim()
      });
      return res.json({ success: true, data: result });
    } catch (error) { next(error); }
  },

  /**
   * POST /api/address/autocomplete
   * Body: { query, country? }
   */
  async autocomplete(req, res, next) {
    try {
      const { query, country } = req.body;
      if (!query || query.toString().trim().length < 3) {
        throw createAppError('PA_AVAC_001_QUERY_TOO_SHORT');
      }
      const results = await addressService.autocomplete(query.toString().trim(), country);
      return res.json({ success: true, data: results });
    } catch (error) { next(error); }
  }
};

module.exports = addressController;
