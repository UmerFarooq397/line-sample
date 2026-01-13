const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Configuration
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const PAYMENT_API_BASE = 'https://payment.dappportal.io/api/payment-v1';

// Store payment status in memory (use database in production)
const paymentStore = new Map();

/**
 * Create a new payment
 */
app.post('/api/payment/create', async (req, res) => {
  try {
    const {
      buyerDappPortalAddress,
      items,
      pgType = 'CRYPTO',
      currencyCode = 'KAIROS',  // KAIA currency (testMode determines network: true=kairos, false=kaia)
      price,
      testMode = true  // true = kairos testnet, false = kaia mainnet
    } = req.body;

    // Validate required fields
    if (!buyerDappPortalAddress || !items || !price) {
      return res.status(400).json({
        error: 'Missing required fields: buyerDappPortalAddress, items, price'
      });
    }

    // Helper function to convert price to Line API format
    const convertPriceToAPIFormat = (amount, currency, paymentType) => {
      if (paymentType === 'CRYPTO') {
        // CRYPTO: Use actual amount
        const numAmount = parseFloat(amount);
        if (currency === 'KAIA') {
          // KAIA: up to 4 decimals (testMode determines network: kairos or kaia)
          return numAmount.toFixed(4).replace(/\.?0+$/, ''); // Remove trailing zeros
        } else if (currency === 'USDT') {
          return numAmount.toFixed(2); // Up to 2 decimals
        }
        return numAmount.toString();
      }
      
      // STRIPE: Convert to minimum unit
      const centsBasedCurrencies = ['USD', 'THB', 'TWD'];
      if (centsBasedCurrencies.includes(currency)) {
        // Multiply by 100 to convert to cents (e.g., $10.00 = 1000 cents)
        return Math.round(parseFloat(amount) * 100).toString();
      }
      
      // KRW and JPY don't use decimal places, use amount as-is
      return Math.round(parseFloat(amount)).toString();
    };

    // Create payment request
    // IMPORTANT: paymentStatusChangeCallbackUrl MUST be publicly accessible (not localhost)
    // Use ngrok or similar service to expose your local server for testing
    const serverUrl = process.env.SERVER_URL || 'http://localhost:3001';
    
    const paymentData = {
      buyerDappPortalAddress,
      pgType,
      currencyCode,
      price: convertPriceToAPIFormat(price, currencyCode, pgType),
      paymentStatusChangeCallbackUrl: `${serverUrl}/api/payment/callback`,
      // NOTE: lockUrl and unlockUrl should ONLY be set when items have limited stock
      // Otherwise, set them to null to avoid LINE API errors
      lockUrl: null,
      unlockUrl: null,
      items: items.map(item => ({
        itemIdentifier: item.itemIdentifier,
        name: item.name,
        imageUrl: item.imageUrl || 'https://placehold.co/150',
        price: convertPriceToAPIFormat(item.price, item.currencyCode || currencyCode, pgType),
        currencyCode: item.currencyCode || currencyCode
      })),
      testMode
    };

    // Validate callback URL is public
    if (serverUrl.includes('localhost') || serverUrl.includes('127.0.0.1')) {
      console.error('❌ CRITICAL ERROR: SERVER_URL cannot be localhost!');
      console.error('❌ LINE API requires publicly accessible URLs for callbacks.');
      console.error('💡 Solution: Use ngrok or similar service to expose your local server:');
      console.error('   1. Install ngrok: npm install -g ngrok');
      console.error('   2. Run: ngrok http 3001');
      console.error('   3. Set SERVER_URL in .env to the ngrok HTTPS URL');
      console.error('   Example: SERVER_URL=https://abc123.ngrok.io');
      return res.status(400).json({
        error: 'Invalid SERVER_URL: must be publicly accessible',
        message: 'Cannot use localhost for callback URLs. Use ngrok or similar service.',
        solution: 'Set SERVER_URL environment variable to a public URL (e.g., ngrok HTTPS URL)'
      });
    }
    
    console.log('✓ Using public callback URL:', `${serverUrl}/api/payment/callback`);

    console.log('Creating payment with data:', JSON.stringify(paymentData, null, 2));

    const response = await fetch(`${PAYMENT_API_BASE}/payment/create`, {
      method: 'POST',
      headers: {
        'X-Client-Id': CLIENT_ID,
        'X-Client-Secret': CLIENT_SECRET,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(paymentData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Payment creation failed:', errorText);
      return res.status(response.status).json({
        error: 'Failed to create payment',
        details: errorText
      });
    }

    const result = await response.json();
    console.log('Payment created successfully:', result);

    // Store payment info
    paymentStore.set(result.id, {
      ...result,
      status: 'PENDING',
      createdAt: new Date().toISOString()
    });

    res.json(result);
  } catch (error) {
    console.error('Error creating payment:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * Payment status change callback
 */
app.post('/api/payment/callback', async (req, res) => {
  try {
    console.log('Payment status callback received:', JSON.stringify(req.body, null, 2));

    const { paymentId, status } = req.body;

    if (paymentStore.has(paymentId)) {
      const payment = paymentStore.get(paymentId);
      payment.status = status;
      payment.updatedAt = new Date().toISOString();
      paymentStore.set(paymentId, payment);
      console.log(`Payment ${paymentId} status updated to ${status}`);
    }

    // If payment is confirmed, automatically finalize it
    if (status === 'CONFIRMED') {
      console.log(`✅ Payment ${paymentId} confirmed, automatically finalizing...`);
      
      try {
        const finalizeResponse = await fetch(`${PAYMENT_API_BASE}/payment/finalize`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ id: paymentId })
        });

        if (finalizeResponse.ok) {
          const finalizeResult = await finalizeResponse.json();
          console.log(`✅ Payment ${paymentId} finalized successfully:`, finalizeResult);
          
          // Update local store
          if (paymentStore.has(paymentId)) {
            const payment = paymentStore.get(paymentId);
            payment.status = 'FINALIZED';
            payment.finalizedAt = new Date().toISOString();
            paymentStore.set(paymentId, payment);
          }
        } else {
          const errorText = await finalizeResponse.text();
          console.error(`❌ Failed to finalize payment ${paymentId}:`, errorText);
        }
      } catch (finalizeError) {
        console.error(`❌ Error finalizing payment ${paymentId}:`, finalizeError.message);
        // Don't throw error - we still want to respond to LINE's webhook
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error in payment callback:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Lock item callback - called before payment starts
 */
app.post('/api/payment/lock', async (req, res) => {
  try {
    console.log('Lock callback received:', JSON.stringify(req.body, null, 2));
    const { id, items } = req.body;

    // Implement your item locking logic here
    // For example: mark items as "reserved" in your database

    res.json({ success: true });
  } catch (error) {
    console.error('Error in lock callback:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Unlock item callback - called if payment fails or is cancelled
 */
app.post('/api/payment/unlock', async (req, res) => {
  try {
    console.log('Unlock callback received:', JSON.stringify(req.body, null, 2));
    const { id, items } = req.body;

    // Implement your item unlocking logic here
    // For example: remove "reserved" status from items

    res.json({ success: true });
  } catch (error) {
    console.error('Error in unlock callback:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Finalize payment
 */
app.post('/api/payment/finalize', async (req, res) => {
  try {
    const { paymentId } = req.body;

    console.log('Finalizing payment:', paymentId);

    const response = await fetch(`${PAYMENT_API_BASE}/payment/finalize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ id: paymentId })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Payment finalization failed:', errorText);
      return res.status(response.status).json({
        error: 'Failed to finalize payment',
        details: errorText
      });
    }

    const result = await response.json();
    console.log('Payment finalized successfully:', result);

    // Update local store
    if (paymentStore.has(paymentId)) {
      const payment = paymentStore.get(paymentId);
      payment.status = 'FINALIZED';
      payment.finalizedAt = new Date().toISOString();
      paymentStore.set(paymentId, payment);
    }

    res.json(result);
  } catch (error) {
    console.error('Error finalizing payment:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * Get payment status
 */
app.get('/api/payment/:id', (req, res) => {
  const { id } = req.params;

  if (paymentStore.has(id)) {
    res.json(paymentStore.get(id));
  } else {
    res.status(404).json({ error: 'Payment not found' });
  }
});

/**
 * Health check
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log('\n⚠️  REQUIRED ENVIRONMENT VARIABLES:');
  console.log('- CLIENT_ID: Your LINE Dapp Portal Client ID');
  console.log('- CLIENT_SECRET: Your LINE Dapp Portal Client Secret');
  console.log('- SERVER_URL: MUST be a publicly accessible URL (NOT localhost)');
  console.log('\n💡 To expose local server for testing:');
  console.log('   1. Install ngrok: npm install -g ngrok');
  console.log('   2. Run: ngrok http 3001');
  console.log('   3. Set SERVER_URL=https://your-ngrok-url.ngrok.io in .env');
  console.log('\n📝 Current SERVER_URL:', process.env.SERVER_URL || 'NOT SET (will fail)');
});

module.exports = app;

