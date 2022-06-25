const crypto = require('crypto');

let id = null;

const genId = () => {
  if (!id) {
    id = crypto.randomBytes(20);
    Buffer.from('-AT0001-').copy(id, 0);
  }
  return id;
};

module.exports = {
  genId
}
