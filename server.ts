import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import crypto from "crypto";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Add JSON parsing middleware
  app.use(express.json());

  // LINE Pay Config
  const LINE_PAY_CHANNEL_ID = process.env.LINE_PAY_CHANNEL_ID || '2001461542';
  const LINE_PAY_CHANNEL_SECRET = process.env.LINE_PAY_CHANNEL_SECRET || 'ede83729f93fd6d4f26cda8dd74ebaaf';
  const LINE_PAY_API_URL = process.env.LINE_PAY_API_URL || 'https://sandbox-api-pay.line.me';

  // API routes
  app.post("/api/linepay/request", async (req, res) => {
    try {
      const { amount, currency = 'TWD', orderId, productName, confirmUrl, cancelUrl } = req.body;
      
      const uri = '/v3/payments/request';
      const nonce = uuidv4();
      
      const requestBody = {
        amount,
        currency,
        orderId,
        packages: [
          {
            id: 'zenflow_pkg',
            amount,
            name: 'ZEN FLOW 預約服務',
            products: [
              {
                id: 'course',
                name: productName || '預約服務',
                quantity: 1,
                price: amount,
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
      
      const hmac = crypto.createHmac('sha256', LINE_PAY_CHANNEL_SECRET);
      hmac.update(signaturePayload);
      const signature = hmac.digest('base64');
      
      const headers = {
        'Content-Type': 'application/json',
        'X-LINE-ChannelId': LINE_PAY_CHANNEL_ID,
        'X-LINE-Authorization-Nonce': nonce,
        'X-LINE-Authorization': signature,
      };

      const response = await axios.post(`${LINE_PAY_API_URL}${uri}`, requestBody, { headers });
      
      res.json(response.data);
    } catch (error: any) {
      console.error('LINE Pay Request Error:', error.response?.data || error.message);
      res.status(500).json({ error: 'LINE Pay Request Failed', details: error.response?.data || error.message });
    }
  });

  app.post("/api/linepay/confirm", async (req, res) => {
    try {
      const { amount, currency = 'TWD', transactionId } = req.body;
      
      const uri = `/v3/payments/${transactionId}/confirm`;
      const nonce = uuidv4();
      
      const requestBody = {
        amount,
        currency,
      };

      const requestBodyStr = JSON.stringify(requestBody);
      const signaturePayload = LINE_PAY_CHANNEL_SECRET + uri + requestBodyStr + nonce;
      
      const hmac = crypto.createHmac('sha256', LINE_PAY_CHANNEL_SECRET);
      hmac.update(signaturePayload);
      const signature = hmac.digest('base64');
      
      const headers = {
        'Content-Type': 'application/json',
        'X-LINE-ChannelId': LINE_PAY_CHANNEL_ID,
        'X-LINE-Authorization-Nonce': nonce,
        'X-LINE-Authorization': signature,
      };

      const response = await axios.post(`${LINE_PAY_API_URL}${uri}`, requestBody, { headers });
      
      res.json(response.data);
    } catch (error: any) {
      console.error('LINE Pay Confirm Error:', error.response?.data || error.message);
      res.status(500).json({ error: 'LINE Pay Confirm Failed', details: error.response?.data || error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
