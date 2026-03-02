const { BlobServiceClient, generateBlobSASQueryParameters, BlobSASPermissions, StorageSharedKeyCredential, SASProtocol } = require('@azure/storage-blob');

const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
const containerName = process.env.AZURE_STORAGE_CONTAINER || 'profile-photos';

let blobServiceClient;
let containerClient;
let sharedKeyCredential;

/**
 * Initialise Azure Blob clients lazily (first call).
 * Throws if connection string is missing or malformed.
 */
function init() {
  if (containerClient) return;
  if (!connectionString) throw new Error('AZURE_STORAGE_CONNECTION_STRING is not set');

  blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
  containerClient = blobServiceClient.getContainerClient(containerName);

  // Extract account name + key from connection string for SAS generation
  const accountName = connectionString.match(/AccountName=([^;]+)/)?.[1];
  const accountKey = connectionString.match(/AccountKey=([^;]+)/)?.[1];
  if (!accountName || !accountKey) throw new Error('Invalid Azure connection string — missing AccountName or AccountKey');
  sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);
}

/**
 * Generate a time-limited SAS URL for uploading (PUT) a blob.
 * @param {string} blobName - e.g. "1/100/clear_headshot.jpg"
 * @param {number} expiryMinutes - default 15
 * @returns {string} Full URL with SAS token for PUT upload
 */
function generateSasUploadUrl(blobName, expiryMinutes = 15) {
  init();
  const blobClient = containerClient.getBlockBlobClient(blobName);
  const startsOn = new Date();
  const expiresOn = new Date(startsOn.getTime() + expiryMinutes * 60 * 1000);

  const sasToken = generateBlobSASQueryParameters({
    containerName,
    blobName,
    permissions: BlobSASPermissions.parse('cw'), // create + write
    startsOn,
    expiresOn,
    protocol: SASProtocol.Https,
  }, sharedKeyCredential).toString();

  return `${blobClient.url}?${sasToken}`;
}

/**
 * Generate a time-limited SAS URL for reading (GET) a blob.
 * @param {string} blobName - e.g. "1/100/clear_headshot.jpg"
 * @param {number} expiryMinutes - default 60
 * @returns {string} Full URL with SAS token for GET read
 */
function generateSasReadUrl(blobName, expiryMinutes = 60) {
  init();
  const blobClient = containerClient.getBlockBlobClient(blobName);
  const startsOn = new Date();
  const expiresOn = new Date(startsOn.getTime() + expiryMinutes * 60 * 1000);

  const sasToken = generateBlobSASQueryParameters({
    containerName,
    blobName,
    permissions: BlobSASPermissions.parse('r'), // read only
    startsOn,
    expiresOn,
    protocol: SASProtocol.Https,
  }, sharedKeyCredential).toString();

  return `${blobClient.url}?${sasToken}`;
}

/**
 * Upload a buffer directly to Azure Blob Storage.
 * @param {string} blobName - e.g. "1/100/clear_headshot.jpg"
 * @param {Buffer} buffer - Image data
 * @param {string} contentType - e.g. "image/jpeg"
 * @returns {Promise<string>} The base blob URL (without SAS token)
 */
async function uploadBuffer(blobName, buffer, contentType = 'image/jpeg') {
  init();
  const blobClient = containerClient.getBlockBlobClient(blobName);
  await blobClient.uploadData(buffer, {
    blobHTTPHeaders: { blobContentType: contentType },
    overwrite: true,
  });
  return blobClient.url;
}

/**
 * Delete a blob from Azure Storage.
 * @param {string} blobName - e.g. "1/100/clear_headshot.jpg"
 * @returns {Promise<boolean>} true if deleted or not found
 */
async function deleteBlob(blobName) {
  init();
  const blobClient = containerClient.getBlockBlobClient(blobName);
  try {
    await blobClient.deleteIfExists({ deleteSnapshots: 'include' });
    return true;
  } catch (err) {
    console.error(`Azure deleteBlob failed for ${blobName}:`, err.message);
    return false;
  }
}

/**
 * Build a blob name from parts.
 * Convention: {partner_id}/{profile_id}/{category_slug}.{ext}
 * @param {number} partnerId
 * @param {number} profileId
 * @param {string} categoryName - e.g. "Clear Headshot"
 * @param {string} ext - file extension without dot, e.g. "jpg"
 * @returns {string}
 */
function buildBlobName(partnerId, profileId, categoryName, ext) {
  const slug = categoryName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/(^_|_$)/g, '');
  return `${partnerId}/${profileId}/${slug}.${ext}`;
}

module.exports = {
  generateSasUploadUrl,
  generateSasReadUrl,
  uploadBuffer,
  deleteBlob,
  buildBlobName,
  getContainerName: () => containerName,
};
