var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_vite = require("vite");
var import_path = __toESM(require("path"), 1);
var import_crypto = __toESM(require("crypto"), 1);
var import_axios = __toESM(require("axios"), 1);
var import_uuid = require("uuid");
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = 3e3;
  app.use(import_express.default.json());
  const LINE_PAY_CHANNEL_ID = process.env.LINE_PAY_CHANNEL_ID;
  const LINE_PAY_CHANNEL_SECRET = process.env.LINE_PAY_CHANNEL_SECRET;
  const LINE_PAY_API_URL = process.env.LINE_PAY_API_URL || "https://sandbox-api-pay.line.me";
  app.post("/api/linepay/request", async (req, res) => {
    try {
      if (!LINE_PAY_CHANNEL_ID || !LINE_PAY_CHANNEL_SECRET) return res.status(503).json({ error: "LINE Pay is not configured" });
      const { amount, currency = "TWD", orderId, productName, confirmUrl, cancelUrl } = req.body;
      const uri = "/v3/payments/request";
      const nonce = (0, import_uuid.v4)();
      const requestBody = {
        amount,
        currency,
        orderId,
        packages: [
          {
            id: "zenflow_pkg",
            amount,
            name: "ZEN FLOW \u9810\u7D04\u670D\u52D9",
            products: [
              {
                id: "course",
                name: productName || "\u9810\u7D04\u670D\u52D9",
                quantity: 1,
                price: amount
              }
            ]
          }
        ],
        redirectUrls: {
          confirmUrl,
          cancelUrl
        }
      };
      const requestBodyStr = JSON.stringify(requestBody);
      const signaturePayload = LINE_PAY_CHANNEL_SECRET + uri + requestBodyStr + nonce;
      const hmac = import_crypto.default.createHmac("sha256", LINE_PAY_CHANNEL_SECRET);
      hmac.update(signaturePayload);
      const signature = hmac.digest("base64");
      const headers = {
        "Content-Type": "application/json",
        "X-LINE-ChannelId": LINE_PAY_CHANNEL_ID,
        "X-LINE-Authorization-Nonce": nonce,
        "X-LINE-Authorization": signature
      };
      const response = await import_axios.default.post(`${LINE_PAY_API_URL}${uri}`, requestBody, { headers });
      res.json(response.data);
    } catch (error) {
      console.error("LINE Pay Request Error:", error.response?.data || error.message);
      res.status(500).json({ error: "LINE Pay Request Failed", details: error.response?.data || error.message });
    }
  });
  app.post("/api/linepay/confirm", async (req, res) => {
    try {
      if (!LINE_PAY_CHANNEL_ID || !LINE_PAY_CHANNEL_SECRET) return res.status(503).json({ error: "LINE Pay is not configured" });
      const { amount, currency = "TWD", transactionId } = req.body;
      const uri = `/v3/payments/${transactionId}/confirm`;
      const nonce = (0, import_uuid.v4)();
      const requestBody = {
        amount,
        currency
      };
      const requestBodyStr = JSON.stringify(requestBody);
      const signaturePayload = LINE_PAY_CHANNEL_SECRET + uri + requestBodyStr + nonce;
      const hmac = import_crypto.default.createHmac("sha256", LINE_PAY_CHANNEL_SECRET);
      hmac.update(signaturePayload);
      const signature = hmac.digest("base64");
      const headers = {
        "Content-Type": "application/json",
        "X-LINE-ChannelId": LINE_PAY_CHANNEL_ID,
        "X-LINE-Authorization-Nonce": nonce,
        "X-LINE-Authorization": signature
      };
      const response = await import_axios.default.post(`${LINE_PAY_API_URL}${uri}`, requestBody, { headers });
      res.json(response.data);
    } catch (error) {
      console.error("LINE Pay Confirm Error:", error.response?.data || error.message);
      res.status(500).json({ error: "LINE Pay Confirm Failed", details: error.response?.data || error.message });
    }
  });
  app.post("/api/linepay/refund", async (req, res) => {
    try {
      if (!LINE_PAY_CHANNEL_ID || !LINE_PAY_CHANNEL_SECRET) return res.status(503).json({ error: "LINE Pay is not configured" });
      const { transactionId, refundAmount } = req.body;
      if (!transactionId) {
        return res.status(400).json({ error: "LINE Pay transactionId is required" });
      }
      const uri = `/v3/payments/${String(transactionId)}/refund`;
      const nonce = (0, import_uuid.v4)();
      const requestBody = refundAmount == null ? {} : { refundAmount };
      const requestBodyStr = JSON.stringify(requestBody);
      const signaturePayload = LINE_PAY_CHANNEL_SECRET + uri + requestBodyStr + nonce;
      const hmac = import_crypto.default.createHmac("sha256", LINE_PAY_CHANNEL_SECRET);
      hmac.update(signaturePayload);
      const response = await import_axios.default.post(`${LINE_PAY_API_URL}${uri}`, requestBody, {
        timeout: 25e3,
        headers: {
          "Content-Type": "application/json",
          "X-LINE-ChannelId": LINE_PAY_CHANNEL_ID,
          "X-LINE-Authorization-Nonce": nonce,
          "X-LINE-Authorization": hmac.digest("base64")
        }
      });
      res.json(response.data);
    } catch (error) {
      console.error("LINE Pay Refund Error:", error.response?.data || error.message);
      res.status(500).json({ error: "LINE Pay Refund Failed", details: error.response?.data || error.message });
    }
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
