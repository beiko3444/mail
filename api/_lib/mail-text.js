const { convert } = require('html-to-text');

// Older incoming Workers stored HTML in the text column. Convert on read so
// existing messages are fixed too, without rendering untrusted HTML in the UI.
function readableMailText(value) {
  const text = String(value || '');
  if (!/<(?:!doctype\s+html|html\b|body\b|div\b|p\b|table\b|br\b)/i.test(text)) return text;
  return convert(text, {
    wordwrap: false,
    selectors: [
      { selector: 'head', format: 'skip' },
      { selector: 'script', format: 'skip' },
      { selector: 'style', format: 'skip' },
      { selector: 'img', format: 'skip' },
      { selector: 'a', options: { ignoreHref: true } }
    ]
  }).trim();
}

module.exports = { readableMailText };
