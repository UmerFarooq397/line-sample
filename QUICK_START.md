# Quick Start Guide

Get your Line Mini Dapp Payment sample running in 5 minutes!

## ⚠️ CRITICAL: Before You Start

**You MUST use a publicly accessible URL for webhooks!**

LINE's payment API requires `SERVER_URL` to be publicly accessible. Using localhost will cause payments to fail with status "CANCELED".

## Prerequisites Checklist

- [ ] Node.js installed (v14+)
- [ ] Line Mini Dapp CLIENT_ID
- [ ] Line Mini Dapp CLIENT_SECRET
- [ ] **ngrok installed** (for exposing local server)

## Installation Steps

### 1. Install Dependencies (2 minutes)

```bash
# Install server dependencies
npm install

# Install client dependencies
cd client && npm install && cd ..

# Install ngrok globally
npm install -g ngrok
```

### 2. Setup ngrok (1 minute)

**This is REQUIRED for payments to work!**

```bash
# Start ngrok to expose your local server
ngrok http 3001

# Keep this terminal open and copy the HTTPS URL
# Example: https://abc123.ngrok.io
```

### 3. Configure Environment (1 minute)

Create `.env` file in root:
```env
CLIENT_ID=your_client_id
CLIENT_SECRET=your_client_secret
PORT=3001
# ⚠️ USE YOUR NGROK HTTPS URL HERE (NOT localhost)
SERVER_URL=https://abc123.ngrok.io
```

Create `client/.env` file:
```env
REACT_APP_CLIENT_ID=your_client_id
REACT_APP_CHAIN_ID=1001
```

### 4. Start the App (1 minute)

**Important:** Make sure ngrok is still running in a separate terminal!

```bash
# Option 1: Run both frontend and backend together
npm run dev:all

# Option 2: Run separately
# Terminal 1:
npm run dev

# Terminal 2:
cd client && npm start
```

You should see:
- Server running on port 3001
- Current SERVER_URL displayed (should be your ngrok URL, NOT localhost)

### 5. Test the Payment Flow (1 minute)

1. Open http://localhost:3000
2. Click "1. Connect Wallet"
3. Click "2. Create Payment"
4. Click "3. Start Payment"

✅ **Success Indicators:**
- Payment should proceed without errors
- No "CANCELED" status
- No "Internal Server Error (500)"

❌ **If you see errors:**
- Check that `SERVER_URL` in `.env` is your ngrok HTTPS URL (not localhost)
- Verify ngrok is still running
- Check server logs for validation errors

## That's It! 🎉

You now have a working Line Mini Dapp payment integration with proper webhook support!

## Next Steps

- Customize the product details in `client/src/App.js`
- Add your own payment items
- Implement database storage (replace in-memory store in `server/index.js`)
- Deploy to production

## Need Help?

See [README.md](./README.md) for detailed documentation and troubleshooting.

