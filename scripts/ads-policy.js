const guidePaths = new Set(require('../content/guides.json').map(article => '/guides/' + article.slug + '/'));
function validatePublisher(id) {
  if (!/^pub-\d{16}$/.test(id) || /^pub-0+$/.test(id)) throw new Error('A real AdSense publisher ID is required.');
  return id;
}
function canShowAds(path, config) {
  try { validatePublisher(config.publisherId); } catch { return false; }
  return guidePaths.has(path) && config.approved === true && config.consentReady === true && /^\d{10}$/.test(config.slotId || '');
}
module.exports = { validatePublisher, canShowAds };
