# Setup Checklist

Follow this checklist to ensure your Line Mini Dapp Payment integration is set up correctly.

## 🚨 CRITICAL REQUIREMENTS (Must Do First!)

- [ ] **Install ngrok for local testing:** `npm install -g ngrok`
- [ ] **Run ngrok:** `ngrok http 3001`
- [ ] **Copy the ngrok HTTPS URL** (e.g., https://abc123.ngrok.io)
- [ ] **Set SERVER_URL to ngrok URL** in root `.env` (NOT localhost)
- [ ] **Verify lockUrl and unlockUrl are set to null** in server/index.js (already done in this sample)

⚠️ **Why?** LINE API requires publicly accessible webhook URLs. Using localhost will cause payment creation to fail with status "CANCELED".

## ✅ Pre-Setup

- [ ] Obtained CLIENT_ID from Line Dapp Portal
- [ ] Obtained CLIENT_SECRET from Line Dapp Portal
- [ ] Registered service domain with Line
- [ ] Node.js v14+ installed
- [ ] npm or yarn installed

## ✅ Project Setup

- [ ] Downloaded/cloned the project
- [ ] Navigated to project directory
- [ ] Installed server dependencies (`npm install`)
- [ ] Installed client dependencies (`cd client && npm install`)

## ✅ Configuration

- [ ] Created `.env` file in root directory
- [ ] Added CLIENT_ID to root `.env`
- [ ] Added CLIENT_SECRET to root `.env`
- [ ] ⚠️ **Set SERVER_URL to ngrok HTTPS URL** in root `.env` (e.g., https://abc123.ngrok.io)
- [ ] Created `client/.env` file
- [ ] Added REACT_APP_CLIENT_ID to `client/.env`
- [ ] Set REACT_APP_CHAIN_ID to 1001 for testnet

**Important:** Never use `http://localhost:3001` for SERVER_URL - it will cause payment failures!

## ✅ Testing

- [ ] Started backend server (port 3001)
- [ ] Started frontend app (port 3000)
- [ ] Opened http://localhost:3000 in browser
- [ ] SDK initialized successfully
- [ ] Connected wallet successfully
- [ ] Created payment successfully
- [ ] Started payment flow

## ✅ Production Preparation

- [ ] Set testMode to false
- [ ] Updated to production CLIENT_ID
- [ ] Updated to production CLIENT_SECRET
- [ ] Set CHAIN_ID to mainnet value
- [ ] Configured public SERVER_URL
- [ ] Implemented database storage
- [ ] Added authentication
- [ ] Implemented webhook signature verification
- [ ] Set up HTTPS
- [ ] Tested full payment flow on production

## 🚨 Common Mistakes to Avoid

1. ❌ **CRITICAL:** Using localhost for SERVER_URL (causes payment failures!)
2. ❌ Setting lockUrl/unlockUrl when not using limited stock
3. ❌ Forgetting to create `.env` files
4. ❌ Using CLIENT_SECRET in frontend code
5. ❌ Not setting proxy in client/package.json
6. ❌ Running on non-registered domain
7. ❌ Testing outside Line Mini Dapp environment

## 📝 Environment Variables Reference

### Root `.env`
```env
CLIENT_ID=your_client_id
CLIENT_SECRET=your_client_secret
PORT=3001
# ⚠️ MUST be publicly accessible (use ngrok for local testing)
SERVER_URL=https://abc123.ngrok.io
```

**To get ngrok URL:**
```bash
ngrok http 3001
# Copy the "Forwarding" HTTPS URL and use it as SERVER_URL
```

### `client/.env`
```
REACT_APP_CLIENT_ID=your_client_id
REACT_APP_CHAIN_ID=1001
```

## 🎯 Success Indicators

When everything is set up correctly, you should see:

1. **Console Logs:**
   - "SDK initialized successfully!"
   - "Wallet connected: [address]"
   - "Payment created! ID: [payment_id]"

2. **UI Indicators:**
   - ✓ SDK: Initialized (green)
   - ✓ Wallet: Connected (green)
   - Payment ID displayed

3. **Server Logs:**
   - "Server running on port 3001"
   - "Payment created successfully: [details]"
   - Webhook callbacks received

## 🆘 Need Help?

If any item is not checked or failing:
1. Review [README.md](./README.md) troubleshooting section
2. Check console logs for error messages
3. Verify all environment variables are set correctly
4. Ensure backend server is running before starting frontend
5. Confirm you're testing within Line Mini Dapp environment

