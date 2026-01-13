# Payment Timeout & Cancellation Issue

## 🐛 Problem Summary

Your payment is being automatically canceled after ~3 minutes:

```json
// At 07:49:15 - Created
{
    "id": "14c2ade5-5699-495d-9084-936bbbb2b065",
    "status": "STARTED",
    "createdAt": "2025-10-21T07:49:15.013Z",
    "updatedAt": "2025-10-21T07:49:20.346Z"
}

// At 07:52:29 - Canceled (3 min 14 sec later)
{
    "id": "14c2ade5-5699-495d-9084-936bbbb2b065",
    "status": "CANCELED",
    "createdAt": "2025-10-21T07:49:15.013Z",
    "updatedAt": "2025-10-21T07:52:29.628Z"
}
```

**Timeline:**
- Payment started at: 07:49:15
- Status stayed "STARTED" for ~2 minutes
- Automatically canceled at: 07:52:29 (3 min 14 sec after creation)

## 🎯 Root Cause

According to [LINE's Cancellation Policy](https://docs.dappportal.io/mini-dapp/mini-dapp-sdk/payment/policy/cancellation), payments are automatically canceled when:

1. **Timeout Expiry** - User doesn't complete payment within the timeout window (typically 2-3 minutes)
2. **User Action** - User closes payment screen without completing
3. **Payment Failure** - Insufficient funds, network issues, or blockchain errors

In your case, the payment is reaching the **timeout limit** because:
- Payment status stays at `STARTED` (payment initiated but not completed)
- No `CONFIRMED` status is received within the timeout window
- LINE automatically cancels after ~3 minutes

## ✅ Solution

### Understanding the Payment Flow

```
Step 1: Create Payment
  ↓
Status: PENDING
  ↓
Step 2: User clicks "Start Payment"
  ↓
Status: STARTED (⏱️ Timeout countdown begins here!)
  ↓
Step 3: User MUST complete payment in LINE UI within ~3 minutes
  ↓
Status: CONFIRMED (✅ Payment successful)
  ↓
Step 4: Server auto-finalizes via webhook
  ↓
Status: FINALIZED (✅ Complete!)
```

**❌ What's happening now:**
```
PENDING → STARTED → (waiting... 3 min timeout) → CANCELED
```

**✅ What should happen:**
```
PENDING → STARTED → (user completes payment) → CONFIRMED → FINALIZED
```

## 🔧 How to Fix

### 1. Complete the Payment Within the Timeout Window

**When testing payments:**

1. Click "Start Payment" button
2. **LINE payment UI will open** - this is where you actually complete the payment
3. **Within 3 minutes**, you must:
   - Review the payment details
   - Click "Confirm" or "Pay"
   - Complete the blockchain transaction
   - Wait for transaction confirmation

**⚠️ CRITICAL**: Don't just click "Start Payment" and then check status every 30 seconds. You need to **actually complete** the payment in the LINE UI!

### 2. Check Your Test Environment

#### A. Verify Test Mode is Enabled

In `server/index.js` (line 34), ensure:
```javascript
testMode = true  // Uses Kairos testnet
```

In `client/src/App.js` (line 138), ensure:
```javascript
testMode: true
```

✅ Your code already has this set correctly!

#### B. Ensure You Have Test Funds

For crypto payments on Kairos testnet:
- You need **test KAIA tokens** in your wallet
- Get test tokens from [Kairos Faucet](https://kairos.wallet.klaytn.foundation/faucet)
- Check your wallet balance before attempting payment

### 3. Verify Webhook Configuration

Your server must receive webhooks for payment status updates.

#### Check 1: Is SERVER_URL Public?

```bash
# In your .env file
SERVER_URL=https://your-ngrok-url.ngrok.io  # ✅ Good
SERVER_URL=http://localhost:3001           # ❌ Bad - LINE can't reach this
```

#### Check 2: Is ngrok Running?

```bash
# In a separate terminal, ensure this is running:
ngrok http 3001

# You should see:
# Forwarding  https://abc-123.ngrok.io -> http://localhost:3001
```

**⚠️ Important**: If ngrok restarts, the URL changes! Update your `.env` and restart your server.

#### Check 3: Server Logs

When you complete a payment, you should see in server logs:

```
Payment status callback received: {
  "paymentId": "xxx",
  "status": "STARTED"
}

Payment status callback received: {
  "paymentId": "xxx", 
  "status": "CONFIRMED"
}

✅ Payment xxx confirmed, automatically finalizing...
✅ Payment xxx finalized successfully
```

**If you don't see these logs**, webhooks aren't being received!

## 🧪 Step-by-Step Testing Guide

### Terminal 1: Start ngrok
```bash
ngrok http 3001

# Copy the HTTPS URL (e.g., https://abc-123.ngrok.io)
```

### Terminal 2: Update .env and Start Server
```bash
# Update .env file
echo "SERVER_URL=https://abc-123.ngrok.io" >> .env

# Start server
npm run dev

# Verify output shows:
# 📝 Current SERVER_URL: https://abc-123.ngrok.io
```

### Terminal 3: Start Frontend
```bash
cd client
npm start

# Opens http://localhost:3000
```

### Browser: Complete Payment Flow
1. **Connect Wallet** (Step 1)
   - Click "Connect Wallet"
   - Approve in LINE Mini Dapp
   - Verify wallet address appears

2. **Create Payment** (Step 2)
   - Click "Create Payment"
   - Wait for payment ID to appear
   - Status should be `PENDING`

3. **Start Payment** (Step 3) - ⏱️ **CRITICAL: 3-minute timer starts here!**
   - Click "Start Payment"
   - LINE payment UI opens
   - **DO NOT CLOSE OR WAIT!**

4. **Complete Payment in LINE UI** (within 3 minutes!)
   - Review payment details
   - Click "Confirm" / "Pay"
   - Approve blockchain transaction
   - Wait for confirmation

5. **Check Status** (Step 4)
   - Click "Check Payment Status"
   - Should show: `CONFIRMED` → `FINALIZED`
   - Server logs should show auto-finalization

### Expected Timeline
```
00:00 - Create Payment → PENDING
00:05 - Start Payment → STARTED (timeout countdown begins)
00:15 - User completes payment → CONFIRMED
00:16 - Server auto-finalizes → FINALIZED
✅ Total time: ~20 seconds (well under 3-minute limit)
```

### Timeout Scenario (What You're Experiencing)
```
00:00 - Create Payment → PENDING
00:05 - Start Payment → STARTED
00:10 - [User waits, checks status]
01:00 - [Still waiting, still STARTED]
02:00 - [Still waiting, approaching timeout]
03:20 - [Timeout exceeded] → CANCELED ❌
```

## 🔍 Troubleshooting

### Issue 1: Payment Immediately Cancels
**Symptom**: Payment status is `CANCELED` right after creation

**Causes**:
- Webhooks aren't reaching your server (localhost URL issue)
- LINE API rejected the payment (invalid data)
- Client credentials incorrect

**Solution**:
1. Check server logs for errors
2. Verify SERVER_URL is public (ngrok)
3. Verify CLIENT_ID and CLIENT_SECRET in .env

### Issue 2: Payment Stays STARTED Forever Then Cancels
**Symptom**: Status is `STARTED` for 2-3 minutes, then becomes `CANCELED`

**Causes**:
- **User didn't complete payment** in LINE UI (most common!)
- User closed payment screen
- Insufficient test funds in wallet
- Network/blockchain issues

**Solution**:
1. **Actually complete the payment** in the LINE UI (don't just wait!)
2. Check wallet has sufficient test KAIA
3. Use faster blockchain (testnet should be fast)
4. Complete payment within 2 minutes (don't wait)

### Issue 3: Payment Completes But Not Finalized
**Symptom**: Status reaches `CONFIRMED` but never becomes `FINALIZED`

**Causes**:
- Webhook not calling finalize API
- Finalize API failing
- Server error during auto-finalization

**Solution**:
1. Check server logs for finalization errors
2. Verify webhook handler in `server/index.js` (lines 170-202)
3. Manually call finalize if needed (button in UI)

### Issue 4: No Webhook Callbacks Received
**Symptom**: Server logs show no callback messages

**Causes**:
- SERVER_URL is localhost (not public)
- ngrok not running or URL changed
- Firewall blocking webhooks

**Solution**:
1. Ensure ngrok is running: `ngrok http 3001`
2. Update SERVER_URL in .env with ngrok HTTPS URL
3. Restart server after updating .env
4. Check ngrok web interface: http://127.0.0.1:4040

## 📊 Understanding Payment Timeouts

### LINE's Timeout Policy

According to the [official documentation](https://docs.dappportal.io/mini-dapp/mini-dapp-sdk/payment/policy/cancellation):

| Status | Timeout Period | What Happens After Timeout |
|--------|----------------|---------------------------|
| PENDING | 10 minutes | Auto-canceled if user doesn't start payment |
| STARTED | ~3 minutes | Auto-canceled if user doesn't complete payment |
| CONFIRMED | No timeout | Must be finalized (no time limit) |

**Key Points:**
- ⏱️ **STARTED timeout is ~3 minutes** - this is what you're hitting!
- ⚡ User must complete payment within this window
- 🔄 Timeout is reset if user retries payment
- ❌ Once canceled, payment cannot be resumed (create new one)

### Why Timeouts Exist

1. **Prevent resource locking** - Items reserved during payment get released
2. **User experience** - Clear feedback if payment isn't progressing
3. **Blockchain efficiency** - Don't hold transactions indefinitely
4. **Security** - Prevent abuse/DoS attacks

## ✅ Best Practices

1. **Quick Completion**: Complete payments within 1-2 minutes after starting
2. **User Guidance**: Add timeout warnings in your UI
3. **Webhook Monitoring**: Log all webhook calls for debugging
4. **Error Handling**: Handle CANCELED status gracefully
5. **Retry Logic**: Allow users to create new payment if timeout occurs

### Example: Adding Timeout Warning to UI

You can update your `App.js` to show a countdown:

```javascript
// After clicking "Start Payment"
const startPayment = async () => {
  // ... existing code ...
  
  // Show timeout warning
  setMessage('⏱️ Payment started! Please complete within 3 minutes.');
  
  // Optional: Add countdown timer
  let timeLeft = 180; // 3 minutes
  const countdownInterval = setInterval(() => {
    timeLeft--;
    if (timeLeft <= 60) {
      setMessage(`⚠️ ${timeLeft} seconds remaining to complete payment!`);
    }
    if (timeLeft <= 0) {
      clearInterval(countdownInterval);
      setMessage('❌ Payment may have timed out. Check status.');
    }
  }, 1000);
};
```

## 📚 Additional Resources

- [LINE Payment API Documentation](https://docs.dappportal.io/mini-dapp/mini-dapp-sdk/payment)
- [Cancellation Policy](https://docs.dappportal.io/mini-dapp/mini-dapp-sdk/payment/policy/cancellation)
- [Kairos Testnet Faucet](https://kairos.wallet.klaytn.foundation/faucet)
- [ngrok Documentation](https://ngrok.com/docs)

## 🎯 Quick Checklist

Before testing payments, verify:

- [ ] ngrok is running (`ngrok http 3001`)
- [ ] SERVER_URL in .env is the ngrok HTTPS URL
- [ ] Server is running (`npm run dev`)
- [ ] Server logs show correct SERVER_URL (not localhost)
- [ ] Frontend is running (`cd client && npm start`)
- [ ] Wallet is connected
- [ ] Wallet has test KAIA funds
- [ ] testMode is set to `true`
- [ ] Ready to **complete payment immediately** after clicking "Start Payment"

## 💡 TL;DR (Too Long; Didn't Read)

**Your payment is timing out because you're not completing it fast enough!**

**The Fix:**
1. ✅ Make sure ngrok is running and SERVER_URL is set correctly
2. ✅ Click "Start Payment"
3. ✅ **Immediately complete the payment** in the LINE UI (don't wait!)
4. ✅ Payment should go: STARTED → CONFIRMED → FINALIZED
5. ✅ Total time should be under 1 minute, definitely under 3 minutes

**Don't:**
- ❌ Click "Start Payment" then just check status every 30 seconds
- ❌ Leave the payment screen open without completing
- ❌ Wait 2+ minutes before completing the payment

**Do:**
- ✅ Complete the payment immediately after starting it
- ✅ Have test funds ready in your wallet
- ✅ Monitor server logs to see webhook callbacks

---

**Still having issues?** Check if:
1. Your wallet has test KAIA tokens
2. Your SERVER_URL is actually public (test by visiting https://your-ngrok-url.ngrok.io/health)
3. You're actually completing the payment in the LINE UI (not just waiting)

