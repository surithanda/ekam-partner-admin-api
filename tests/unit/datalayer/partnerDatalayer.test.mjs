import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import sinon from 'sinon';
import { createRequire } from 'node:module';
import { partnerInfo, partnerDomainLinks, countries, states } from '../../fixtures/mockData.mjs';

const require = createRequire(import.meta.url);
const pool = { query: sinon.stub() };
require.cache[require.resolve('../../../config/db')] = { id: require.resolve('../../../config/db'), exports: pool, loaded: true, filename: require.resolve('../../../config/db') };

const partnerAdo = require('../../../ado/partnerAdo');
const partnerDatalayer = require('../../../datalayer/partnerDatalayer');
const sandbox = sinon.createSandbox();

afterEach(() => { sandbox.restore(); pool.query.reset(); });

describe('partnerDatalayer', () => {
  it('getPartnerInfo — should return partner info', async () => {
    sandbox.stub(partnerAdo, 'getPartnerById').resolves(partnerInfo);
    assert.deepStrictEqual(await partnerDatalayer.getPartnerInfo(1), partnerInfo);
  });

  it('getPartnerDomainLinks — should return domain links', async () => {
    sandbox.stub(partnerAdo, 'getPartnerDomainLinks').resolves(partnerDomainLinks);
    assert.deepStrictEqual(await partnerDatalayer.getPartnerDomainLinks(1), partnerDomainLinks);
  });

  it('getAllPartners — should return all partners', async () => {
    sandbox.stub(partnerAdo, 'getAllPartners').resolves([partnerInfo]);
    assert.deepStrictEqual(await partnerDatalayer.getAllPartners(), [partnerInfo]);
  });

  it('getCountries — should return countries', async () => {
    sandbox.stub(partnerAdo, 'getCountries').resolves(countries);
    assert.deepStrictEqual(await partnerDatalayer.getCountries(), countries);
  });

  it('getStates — should return states', async () => {
    sandbox.stub(partnerAdo, 'getStates').resolves(states);
    const result = await partnerDatalayer.getStates(1);
    assert.deepStrictEqual(result, states);
    assert.ok(partnerAdo.getStates.calledWith(1));
  });
});
