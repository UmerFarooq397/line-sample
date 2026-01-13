# Line Mini Dapp Payment Integration Sample

A complete working sample demonstrating how to integrate Line Mini Dapp payment functionality into a web application. This project includes both frontend (React) and backend (Node.js/Express) implementations.

## ⚠️ Critical Requirements

**Before testing payments, you MUST:**

1. **Use a publicly accessible URL for `SERVER_URL`** - LINE API requires webhooks to be sent to public URLs, NOT localhost
   ```bash
   # Install and use ngrok for local testing
   npm install -g ngrok
   ngrok http 3001
   # Set SERVER_URL in .env to the ngrok HTTPS URL
   ```

2. **Set `lockUrl` and `unlockUrl` to `null`** - Only use these if you have limited stock items (already configured correctly in this sample)

3. **Ensure valid credentials** - Use correct `CLIENT_ID` and `CLIENT_SECRET` from [LINE Dapp Portal](https://dappportal.io)

**Common Error:** If you see payment status as "CANCELED" with Internal Server Error (500), it's likely because `SERVER_URL` is set to localhost or lock/unlock URLs are configured incorrectly.

**Payment Timeout:** If payment status changes from "STARTED" to "CANCELED" after ~3 minutes, see [PAYMENT_TIMEOUT_FIX.md](./PAYMENT_TIMEOUT_FIX.md) for detailed explanation and solution.

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Project Structure](#project-structure)
- [Setup Instructions](#setup-instructions)
- [Usage](#usage)
- [API Endpoints](#api-endpoints)
- [Payment Flow](#payment-flow)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)

## 🎯 Overview

This sample application demonstrates the complete payment flow for Line Mini Dapp:
1. SDK initialization
2. Wallet connection
3. Payment creation
4. Payment processing
5. Payment finalization

## ✨ Features

- ✅ Line Mini Dapp SDK integration
- ✅ Wallet connection and management
- ✅ Payment creation and processing
- ✅ Payment status webhooks
- ✅ Payment history access
- ✅ Beautiful and responsive UI
- ✅ Complete error handling
- ✅ Test mode support
- ℹ️ Item locking/unlocking endpoints available (use only for limited stock items)

## 📦 Prerequisites

Before you begin, ensure you have:

1. **Node.js** (version 14 or higher)
2. **npm** or **yarn** package manager
3. **Line Mini Dapp Credentials**:
   - Client ID
   - Client Secret
   - Registered service domain

### How to Get Line Mini Dapp Credentials

1. Visit [Line Dapp Portal](https://dappportal.io)
2. Register your application
3. Register your service domain
4. Obtain your `CLIENT_ID` and `CLIENT_SECRET`

## 📁 Project Structure

```
line-mini-dapp-payment-sample/
├── server/                 # Backend server
│   └── index.js           # Express server with payment endpoints
├── client/                # Frontend React app
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── App.js         # Main React component
│   │   ├── App.css        # Styles
│   │   ├── index.js       # React entry point
│   │   └── index.css
│   ├── package.json
│   └── .env.example
├── package.json           # Server package.json
├── .env.example           # Environment variables template
└── README.md
```

## 🚀 Setup Instructions

### Step 1: Clone or Download the Project

```bash
# Navigate to the project directory
cd line-mini-dapp-payment-sample
```

### Step 2: Install Backend Dependencies

```bash
# Install server dependencies
npm install
```

### Step 3: Install Frontend Dependencies

```bash
# Navigate to client directory
cd client

# Install client dependencies
npm install

# Return to root directory
cd ..
```

### Step 4: Configure Environment Variables

#### Backend Configuration

Create `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit `.env` and add your credentials:

```env
CLIENT_ID=your_actual_client_id
CLIENT_SECRET=your_actual_client_secret
PORT=3001
# ⚠️ CRITICAL: SERVER_URL MUST be publicly accessible (NOT localhost)
# Use ngrok or similar service for local testing
SERVER_URL=https://your-ngrok-url.ngrok.io
```

**⚠️ IMPORTANT:** LINE API requires `SERVER_URL` to be publicly accessible. For local testing, use [ngrok](https://ngrok.com/):

```bash
# Install ngrok
npm install -g ngrok

# Expose your local server (port 3001)
ngrok http 3001

# Copy the HTTPS URL (e.g., https://abc123.ngrok.io)
# Set it as SERVER_URL in your .env file
```

#### Frontend Configuration

Create `.env` file in the client directory:

```bash
cd client
cp .env.example .env
```

Edit `client/.env`:

```env
REACT_APP_CLIENT_ID=your_actual_client_id
REACT_APP_CHAIN_ID=1001
```

### Step 5: Start the Application

#### Option A: Run Both Frontend and Backend Together

```bash
# From root directory
npm run dev:all
```

#### Option B: Run Separately

Terminal 1 - Backend:
```bash
npm run dev
```

Terminal 2 - Frontend:
```bash
cd client
npm start
```

### Step 6: Access the Application

- Frontend: http://localhost:3000
- Backend: http://localhost:3001
- Health Check: http://localhost:3001/health

## 📱 Usage

### Step-by-Step Payment Flow

1. **Open the Application**
   - Navigate to http://localhost:3000
   - The SDK will automatically initialize

2. **Connect Wallet**
   - Click "1. Connect Wallet" button
   - Your wallet address will be displayed

3. **Create Payment**
   - Click "2. Create Payment" button
   - A payment ID will be generated

4. **Start Payment**
   - Click "3. Start Payment" button
   - Follow the payment process in Line's payment interface

5. **View Payment History** (Optional)
   - Click "📜 Payment History" to view past transactions

## 🔌 API Endpoints

### Backend Server Endpoints

#### Create Payment
```
POST /api/payment/create
```
**Request Body:**
```json
{
  "buyerDappPortalAddress": "wallet_address",
  "items": [{
    "itemIdentifier": "ITEM_001",
    "name": "Product Name",
    "imageUrl": "https://...",
    "price": 10.00,
    "currencyCode": "USD"
  }],
  "price": 10.00,
  "currencyCode": "USD",
  "testMode": true
}
```

#### Payment Status Callback
```
POST /api/payment/callback
```
Receives payment status updates from Line.

#### Lock Item
```
POST /api/payment/lock
```
Called before payment starts to reserve items.

**Note:** This endpoint is implemented but `lockUrl` is set to `null` by default. Only configure `lockUrl` and `unlockUrl` in the payment creation if your items have **limited stock**. Otherwise, leave them as `null` to avoid LINE API errors.

#### Unlock Item
```
POST /api/payment/unlock
```
Called if payment fails or is cancelled to release reserved items.

**Note:** This endpoint is implemented but `unlockUrl` is set to `null` by default.

#### Finalize Payment
```
POST /api/payment/finalize
```
**Request Body:**
```json
{
  "paymentId": "payment_id_here"
}
```

#### Get Payment Status
```
GET /api/payment/:id
```
Returns the current status of a payment.

## 💳 Payment Flow

```
User Action → Frontend → Backend → Line Payment API
                ↓           ↓
            SDK Methods   Webhooks
                ↓           ↓
            UI Updates   Status Changes
```

### Detailed Flow:

1. **Initialization**
   ```javascript
   SDK.init() → walletProvider → paymentProvider
   ```

2. **Payment Creation**
   ```
   Frontend → Backend → Line API → Payment ID
   ```

3. **Payment Processing**
   ```
   startPayment() → Line Payment UI → User Completes Payment
   ```

4. **Webhooks**
   ```
   Line → /api/payment/callback → Status Update
   Line → /api/payment/lock → Reserve Items
   Line → /api/payment/unlock → Release Items (if failed)
   ```

5. **Finalization**
   ```
   Frontend → Backend → Line API → Payment Confirmed
   ```

## 🧪 Testing

### Test Mode

The application is configured for test mode by default:
- `testMode: true` in payment creation
- `CHAIN_ID: 1001` (testnet)

### Test Payment

Use Line's test payment methods:
- Test credit cards
- Test cryptocurrency wallets

### Verify Payment Status

1. Check console logs for payment flow
2. Use the `/api/payment/:id` endpoint to check status
3. View payment history in the app

## 🔍 Troubleshooting

### Common Issues

#### 1. SDK Initialization Failed

**Problem:** "SDK initialization failed: ..."

**Solution:**
- Ensure you're running the app within Line Mini Dapp environment
- Verify your CLIENT_ID is correct
- Check that your domain is registered with Line

#### 2. Wallet Connection Failed

**Problem:** Cannot connect wallet

**Solution:**
- Make sure SDK is initialized first
- Check browser console for errors
- Verify you're in a Line environment

#### 3. Payment Creation Failed

**Problem:** "Failed to create payment" or "Internal Server error" (500) with payment status showing "CANCELED"

**Solution:**
- ✅ **CRITICAL:** Verify `SERVER_URL` is a publicly accessible URL (NOT localhost)
  - Use ngrok: `ngrok http 3001` and update `.env` with the ngrok HTTPS URL
- ✅ Verify `CLIENT_ID` and `CLIENT_SECRET` in `.env`
- ✅ Check that backend server is running on port 3001
- ✅ Ensure `lockUrl` and `unlockUrl` are set to `null` (unless you have limited stock items)
- ✅ Verify callback URLs are reachable from LINE's servers

**Common Error from LINE:**
```
For the payment with ID xxx, the error occurred because the lockUrl and unlockUrl 
are temporarily set. Please note that lockUrl and unlockUrl should only be configured 
when the item has limited stock. Otherwise, please set them to null.
```

**Fix:** The server code has been updated to set `lockUrl` and `unlockUrl` to `null` by default. If you need to use them for limited stock items, update the payment creation logic in `server/index.js`.

#### 4. Payment Timeout - Status Changes to CANCELED After ~3 Minutes

**Problem:** Payment status stays "STARTED" for 2-3 minutes, then changes to "CANCELED" automatically.

**Timeline Example:**
```
07:49:15 - Payment created → STARTED
07:49:20 - Still STARTED (user checking status)
07:52:29 - Payment CANCELED (3 min 14 sec after creation)
```

**Cause:** LINE automatically cancels payments that remain in "STARTED" status for more than ~3 minutes without completion.

**Solution:**
- ✅ **Complete the payment within 3 minutes** after clicking "Start Payment"
- ✅ **Don't just wait** - actively complete the payment in the LINE UI
- ✅ Have test funds ready in your wallet before starting
- ✅ If timeout occurs, create a new payment and complete it faster

**📖 Full Details:** See [PAYMENT_TIMEOUT_FIX.md](./PAYMENT_TIMEOUT_FIX.md) for comprehensive explanation, testing guide, and best practices.

#### 5. Payment Callbacks Not Received

**Problem:** Webhooks not triggering

**Solution:**
- Ensure your SERVER_URL is publicly accessible
- For local testing, use ngrok or similar tunneling service:
  ```bash
  ngrok http 3001
  ```
- Update SERVER_URL in `.env` with the ngrok URL

#### 5. CORS Errors

**Problem:** CORS policy blocking requests

**Solution:**
- Backend already has CORS enabled
- Check that proxy is configured in client/package.json
- Verify backend is running on port 3001

### Debug Mode

Enable detailed logging:

```javascript
// In App.js, add console logs
console.log('SDK initialized:', sdk);
console.log('Payment created:', paymentId);
console.log('Payment status:', status);
```

## 🌐 Production Deployment

### Backend Deployment

1. Deploy to your preferred platform (Heroku, AWS, Google Cloud, etc.)
2. Update environment variables:
   ```env
   CLIENT_ID=production_client_id
   CLIENT_SECRET=production_client_secret
   SERVER_URL=https://your-domain.com
   ```
3. Set `testMode: false` in payment creation

### Frontend Deployment

1. Build the React app:
   ```bash
   cd client
   npm run build
   ```
2. Deploy the build folder to your hosting service
3. Update `.env` with production values

### Important Security Notes

- ⚠️ Never expose CLIENT_SECRET in frontend code
- ⚠️ Always validate webhook signatures in production
- ⚠️ Use HTTPS for all endpoints
- ⚠️ Implement proper authentication and authorization
- ⚠️ Store sensitive data securely (use database, not in-memory)

## 📚 Additional Resources

### Official LINE Documentation
- [Line Mini Dapp Documentation](https://docs.dappportal.io/mini-dapp)
- [Payment SDK Documentation](https://docs.dappportal.io/mini-dapp/mini-dapp-sdk/payment)
- [Line Dapp Portal](https://dappportal.io)

### Project Documentation Files
- [QUICK_START.md](./QUICK_START.md) - Quick setup guide for getting started
- [SETUP_CHECKLIST.md](./SETUP_CHECKLIST.md) - Complete setup checklist
- [PAYMENT_FLOW.md](./PAYMENT_FLOW.md) - Detailed payment flow explanation
- [PAYMENT_ERROR_FIX.md](./PAYMENT_ERROR_FIX.md) - How to fix 500 errors and canceled payments
- [PAYMENT_TIMEOUT_FIX.md](./PAYMENT_TIMEOUT_FIX.md) - **NEW: How to fix payment timeout issues (STARTED → CANCELED)**

## 🤝 Support

For issues and questions:
1. Check the troubleshooting section
2. Review Line's official documentation
3. Contact Line support for API-related issues

## 📄 License

MIT License - feel free to use this sample for your projects.

---

**Note:** This is a sample application for demonstration purposes. For production use, implement proper security measures, error handling, database storage, and follow Line's guidelines and best practices.

# line-sample
