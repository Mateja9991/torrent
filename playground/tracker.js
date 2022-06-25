const bencode = require("bencode");
const fs = require("fs");
const dgram = require("dgram");
const Buffer = require("buffer").Buffer;
const urlParse = require("url").parse;
const crypto = require("crypto");
const util = require("util");
const { genId } = require("./util.js");
const dns = require("dns");
const lookup = util.promisify(dns.lookup);
const torrentParser = require("./torrent-parser");
const { PING_INTERVAL } = require("./constants.js");

const getPeers = (torrent, callback) => {
  const connectToTracker = (url, torrent) => {
    const socket = dgram.createSocket("udp4");
    udpSend(socket, buildConnReq(), url);
    const exponentialBackoff = (retryNum = 1) => {
      if (retryNum > 2 || isConnected) return;
      udpSend(socket, buildConnReq(), url);
      timeoutId = setTimeout(
        exponentialBackoff.bind(null, retryNum + 1),
        Math.pow(2, retryNum) * PING_INTERVAL
      );
    };
    let timeoutId = setTimeout(exponentialBackoff, PING_INTERVAL);
    socket.on("message", (response) => {
      console.log("Message!!!\n");
      if (timeoutId) clearTimeout(timeoutId);
      if (respType(response) === "connect") {
        if (isConnected) return;
        isConnected = true;
        console.log("pre");
        const connResp = parseConnResp(response);
        console.log("pre");
        const announceReq = buildAnnounceReq(connResp.connectionId, torrent);
        console.log("pre");
        udpSend(socket, announceReq, url);
      } else if (respType(response) === "announce") {
        const announceResp = parseAnnounceResp(response);
        callback(announceResp.peers);
      }
    });
  };
  sockets = [];
  let isConnected = false;
  getTrackers(torrent).forEach((url, i) => {
    if (isConnected) return;
    connectToTracker(url, torrent);
  });
};

const getTrackers = (torrent) => {
  //  return [ torrent.announce.toString('utf8'), ...torrent['announce-list'].map(buf => buf.toString('utf8')) ]
  return torrent["announce-list"].map((buf) => buf.toString("utf8"));
};
const udpSend = async (
  socket,
  message,
  rawUrl,
  callback = () => {
    console.log(`Message is sent.\n${message}`);
  }
) => {
  const url = urlParse(rawUrl);
  result = await lookup(url.hostname);
  console.log(url);
  socket.send(
    message,
    0,
    message.length,
    url.port ? url.port : 6969,
    result.address,
    callback
  );
};

const respType = (resp) => {
  const action = resp.readUInt32BE(0);
  if (action === 0) return "connect";
  if (action === 1) return "announce";
};

const buildConnReq = () => {
  const buf = Buffer.alloc(16); // 2
  // connection id
  buf.writeUInt32BE(0x417, 0); // 3
  buf.writeUInt32BE(0x27101980, 4);
  // action
  buf.writeUInt32BE(0, 8); // 4
  // transaction id
  crypto.randomBytes(4).copy(buf, 12); // 5
  return buf;
};

const parseConnResp = (resp) => {
  return {
    action: resp.readUInt32BE(0),
    transactionId: resp.readUInt32BE(4),
    connectionId: resp.slice(8),
  };
};

const buildAnnounceReq = (connId, torrent, port = 6881) => {
  const buf = Buffer.allocUnsafe(98);
  // connection id
  connId.copy(buf, 0);
  // action
  buf.writeUInt32BE(1, 8);
  // transaction id
  crypto.randomBytes(4).copy(buf, 12);
  // info hash
  torrentParser.infoHash(torrent).copy(buf, 16);
  // peerId
  genId().copy(buf, 36);
  // downloaded
  Buffer.alloc(8).copy(buf, 56);
  // left
  torrentParser.size(torrent).copy(buf, 64);
  // uploaded
  Buffer.alloc(8).copy(buf, 72);
  // event
  buf.writeUInt32BE(0, 80);
  // ip address
  buf.writeUInt32BE(0, 84);
  // key
  crypto.randomBytes(4).copy(buf, 88);
  // num want
  buf.writeInt32BE(-1, 92);
  // port
  buf.writeUInt16BE(port, 96);
  return buf;
};

const parseAnnounceResp = (resp) => {
  function group(iterable, groupSize) {
    let groups = [];
    for (let i = 0; i < iterable.length; i += groupSize) {
      groups.push(iterable.slice(i, i + groupSize));
    }
    return groups;
  }

  return {
    action: resp.readUInt32BE(0),
    transactionId: resp.readUInt32BE(4),
    leechers: resp.readUInt32BE(8),
    seeders: resp.readUInt32BE(12),
    peers: group(resp.slice(20), 6).map((address) => {
      return {
        ip: address.slice(0, 4).join("."),
        port: address.readUInt16BE(4),
      };
    }),
  };
};

module.exports = {
  getPeers,
};
