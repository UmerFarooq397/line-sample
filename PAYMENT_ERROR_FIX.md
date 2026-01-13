# Payment Error Fix - Internal Server Error (500)

## 🐛 Problem Summary

Your payment was failing with:
- **Error:** Internal Server Error (500)
- **Payment Status:** CANCELED
- **Payment ID:** 89df12f4-7b2e-4fad-9d33-530822fb5133 (and 41167910-d0de-49f7-95cf-c032365183d6)

LINE's response indicated two critical issues:
1. `lockUrl` and `unlockUrl` were set but should be `null` (unless you have limited stock items)
2. Callback URLs must be publicly accessible (cannot use localhost)

## ✅ What Was Fixed

### 1. Server Code (`server/index.js`)

**Changed:**
- ✅ Set `lockUrl` to `null` (line 82)
- ✅ Set `unlockUrl` to `null` (line 83)
- ✅ Added validation to prevent localhost URLs and return a clear error message
- ✅ Updated server startup logs to show current SERVER_URL

**Before:**
```javascript
lockUrl: `${serverUrl}/api/payment/lock`,
unlockUrl: `${serverUrl}/api/payment/unlock`,
```

**After:**
```javascript
// NOTE: lockUrl and unlockUrl should ONLY be set when items have limited stock
// Otherwise, set them to null to avoid LINE API errors
lockUrl: null,
unlockUrl: null,
```

### 2. Documentation Updates

Updated all documentation to emphasize the critical requirements:
- ✅ **README.md** - Added critical requirements section at the top
- ✅ **SETUP_CHECKLIST.md** - Added critical requirements as first section
- ✅ **QUICK_START.md** - Updated with ngrok setup as mandatory step

## 🚀 How to Fix Your Setup

### Step 1: Install ngrok

```bash
npm install -g ngrok
```

### Step 2: Start ngrok

```bash
# In a new terminal, run:
ngrok http 3001

# Keep this terminal open!
```

You'll see output like:
```
Forwarding  https://abc123.ngrok.io -> http://localhost:3001
```

### Step 3: Update Your .env File

Open your root `.env` file and update `SERVER_URL`:

```env
CLIENT_ID=your_client_id
CLIENT_SECRET=your_client_secret
PORT=3001
# ⚠️ Replace with your actual ngrok HTTPS URL
SERVER_URL=https://abc123.ngrok.io
```

### Step 4: Restart Your Server

Stop and restart your backend server:

```bash
# Press Ctrl+C to stop the current server
# Then restart it:
npm run dev
```

You should see:
```
📝 Current SERVER_URL: https://abc123.ngrok.io
```

If you see a localhost warning, the fix hasn't been applied correctly.

### Step 5: Test Payment Again

1. Go to your frontend (http://localhost:3000)
2. Connect Wallet
3. Create Payment
4. Start Payment

✅ **Expected Result:** Payment should proceed without errors and not show "CANCELED" status.

## 🔍 How to Verify the Fix

### Check 1: Server Logs
When you start the server, you should see:
```
✓ Using public callback URL: https://abc123.ngrok.io/api/payment/callback
```

NOT:
```
❌ CRITICAL ERROR: SERVER_URL cannot be localhost!
```

### Check 2: Payment Creation
When creating a payment, check the console logs. The payment data should show:
```json
{
  "lockUrl": null,
  "unlockUrl": null,
  "paymentStatusChangeCallbackUrl": "https://abc123.ngrok.io/api/payment/callback"
}
```

### Check 3: Payment Status
After creating a payment, it should have status `PENDING`, not `CANCELED`.

## 📝 Important Notes

### About lockUrl and unlockUrl

The lock/unlock endpoints are still implemented in the server (`/api/payment/lock` and `/api/payment/unlock`), but they're set to `null` in the payment creation request.

**When to use them:**
- Only if you have items with **limited stock** that need to be reserved during payment
- For most use cases (like this sample), leave them as `null`

**How to enable them (if needed):**
1. Open `server/index.js`
2. Find the `paymentData` object (around line 74)
3. Change:
   ```javascript
   lockUrl: null,
   unlockUrl: null,
   ```
   To:
   ```javascript
   lockUrl: `${serverUrl}/api/payment/lock`,
   unlockUrl: `${serverUrl}/api/payment/unlock`,
   ```

### About ngrok

**Why is ngrok needed?**
- LINE's servers need to send webhook callbacks to your server
- Webhooks cannot reach localhost (it's only accessible on your machine)
- ngrok creates a public URL that tunnels to your local server

**ngrok limitations (free tier):**
- URL changes every time you restart ngrok
- Limited sessions per minute
- For production, deploy to a real server with a permanent URL

**ngrok alternatives:**
- [localtunnel](https://localtunnel.github.io/www/)
- [serveo](https://serveo.net/)
- Deploy to a cloud provider (Heroku, AWS, Google Cloud, etc.)

## 🎯 Next Steps

1. ✅ Install and start ngrok
2. ✅ Update SERVER_URL in .env
3. ✅ Restart your server
4. ✅ Test payment flow
5. ✅ Verify webhooks are received

## 💡 Production Deployment

For production, you should:
1. Deploy your server to a cloud provider
2. Use the production URL as SERVER_URL (e.g., `https://api.yourdomain.com`)
3. Set `testMode: false` in payment creation
4. Implement proper security measures (webhook signature verification, HTTPS, etc.)

## ❓ Still Having Issues?

If payments still fail after these fixes:

1. **Check SERVER_URL**
   - Verify it's the ngrok HTTPS URL in .env
   - Restart server after changing .env
   - Check server logs confirm the correct URL

2. **Check ngrok**
   - Ensure ngrok is still running
   - Verify the URL hasn't changed
   - Try restarting ngrok and updating .env

3. **Check LINE credentials**
   - Verify CLIENT_ID and CLIENT_SECRET are correct
   - Ensure your domain is registered with LINE

4. **Check payment data**
   - Review server console logs for the payment creation request
   - Verify lockUrl and unlockUrl are null

## 📚 References

- [LINE Mini Dapp Payment Documentation](https://docs.dappportal.io/mini-dapp/mini-dapp-sdk/payment)
- [ngrok Documentation](https://ngrok.com/docs)
- See [README.md](./README.md) for full documentation
- See [QUICK_START.md](./QUICK_START.md) for quick setup guide
- See [SETUP_CHECKLIST.md](./SETUP_CHECKLIST.md) for complete checklist

---

**Summary:** The payment error was caused by using localhost for webhook URLs and setting lock/unlock URLs unnecessarily. The fix requires using ngrok (or similar) to expose your local server publicly and setting lockUrl/unlockUrl to null.


