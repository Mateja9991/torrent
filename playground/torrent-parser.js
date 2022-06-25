const fs = require("fs");
const bencode = require("bencode");
const crypto = require("crypto");

const open = (filepath) => {
  return bencode.decode(fs.readFileSync(filepath));
};

const size = (torrent) => {
  const size = torrent.info.files
    ? torrent.info.files
        .map((file) => file.length)
        .reduce((acc, val) => acc + val, 0)
    : torrent.info.length;
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(size));
  return buf;
};

const infoHash = (torrent) => {
  const info = bencode.encode(torrent.info);
  return crypto.createHash("sha1").update(info).digest();
};

module.exports = {
  open,
  size,
  infoHash,
};
