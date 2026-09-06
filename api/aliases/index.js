const { json } = require('../_lib/http');
module.exports = (req, res) => json(res, 410, { error: '공유 주소 목록은 더 이상 제공하지 않습니다. 홈페이지에서 개인 메일함을 만들어 주세요.' });
