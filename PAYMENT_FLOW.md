# LINE Mini Dapp Payment Flow

## ✅ Correct Payment Flow (Now Implemented)

This document explains the complete payment flow with automatic finalization.

## 📋 Flow Diagram

```
1. Client: Create Payment
   ↓
2. Backend: POST to LINE API /payment/create
   ↓
3. LINE: Returns payment ID (Status: PENDING)
   ↓
4. Client: Start Payment (paymentProvider.startPayment)
   ↓
5. LINE: Opens payment UI (Status: STARTED)
   ↓
6. User: Completes payment
   ↓
7. LINE: Sends webhook → Backend /api/payment/callback
   ├─ Status: STARTED → Log and store
   ├─ Status: CONFIRMED → **AUTOMATICALLY FINALIZE** ⭐️
   └─ Status: CANCELED/FAILED → Log and store
   ↓
8. Backend: Calls LINE API /payment/finalize (automatic)
   ↓
9. Payment Complete (Status: FINALIZED) ✅
```

## 📊 Payment Status Flow

```
PENDING → STARTED → CONFIRMED → FINALIZED ✅
                      ↓
                   CANCELED ❌
```

**Status Descriptions:**

| Status | Description | Can Finalize? |
|--------|-------------|---------------|
| **PENDING** | Payment created, not yet started | ❌ No |
| **STARTED** | User initiated payment, in progress | ❌ No |
| **CONFIRMED** | Payment successful, ready to finalize | ✅ **YES** |
| **CANCELED** | Payment cancelled or failed | ❌ No |
| **FINALIZED** | Payment completed and finalized | N/A (already done) |

**⚠️ CRITICAL:** You can ONLY finalize when status is **CONFIRMED**!

## 🔄 Step-by-Step Flow

### Step 1: Create Payment (Client → Backend)

**Client Request:**
```javascript
POST /api/payment/create
{
  "buyerDappPortalAddress": "0x...",
  "items": [...],
  "price": 1.0,
  "currencyCode": "KAIA",
  "testMode": true
}
```

**Backend → LINE API:**
```bash
POST https://payment.dappportal.io/api/payment-v1/payment/create
Headers:
  X-Client-Id: {CLIENT_ID}
  X-Client-Secret: {CLIENT_SECRET}
Body:
{
  "buyerDappPortalAddress": "0x...",
  "pgType": "CRYPTO",
  "currencyCode": "KAIA",
  "price": "1",
  "paymentStatusChangeCallbackUrl": "https://your-server.com/api/payment/callback",
  "lockUrl": null,
  "unlockUrl": null,
  "items": [...],
  "testMode": true
}
```

**Response:**
```json
{
  "id": "payment-uuid"
}
```

### Step 2: Start Payment (Client → LINE SDK)

**Client:**
```javascript
await paymentProvider.startPayment(paymentId);
```

This opens LINE's payment UI where the user completes the payment.

### Step 3: Webhook Callbacks (LINE → Backend)

**LINE sends status updates to your webhook URL:**

#### 3a. STARTED Status
```json
POST https://your-server.com/api/payment/callback
{
  "paymentId": "payment-uuid",
  "status": "STARTED",
  "cryptoPaymentInfo": null
}
```

**Backend Action:** Log and update status

#### 3b. CONFIRMED Status ⭐️ **CRITICAL**
```json
POST https://your-server.com/api/payment/callback
{
  "paymentId": "payment-uuid",
  "status": "CONFIRMED",
  "cryptoPaymentInfo": {
    "transactionHash": "0x...",
    ...
  }
}
```

**Backend Action:** **AUTOMATICALLY call finalize API**

```javascript
// Inside /api/payment/callback handler
if (status === 'CONFIRMED') {
  // Automatically finalize
  const response = await fetch('https://payment.dappportal.io/api/payment-v1/payment/finalize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: paymentId })
  });
}
```

#### 3c. CANCELED/FAILED Status
```json
POST https://your-server.com/api/payment/callback
{
  "paymentId": "payment-uuid",
  "status": "CANCELED"
}
```

**Backend Action:** Log and update status

### Step 4: Finalize Payment (Backend → LINE API)

**This happens AUTOMATICALLY when webhook receives CONFIRMED status:**

```bash
POST https://payment.dappportal.io/api/payment-v1/payment/finalize
Content-Type: application/json

{
  "id": "payment-uuid"
}
```

**Response:**
```json
{
  "success": true,
  "payment": {
    "id": "payment-uuid",
    "status": "FINALIZED",
    ...
  }
}
```

## 🎯 Implementation Details

### Backend: Webhook Handler

```javascript
app.post('/api/payment/callback', async (req, res) => {
  const { paymentId, status } = req.body;
  
  console.log(`Payment ${paymentId} status: ${status}`);
  
  // Update local storage
  updatePaymentStatus(paymentId, status);
  
  // ⭐️ AUTOMATICALLY FINALIZE ON CONFIRMED
  if (status === 'CONFIRMED') {
    try {
      const finalizeResponse = await fetch(
        'https://payment.dappportal.io/api/payment-v1/payment/finalize',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: paymentId })
        }
      );
      
      if (finalizeResponse.ok) {
        console.log(`✅ Payment ${paymentId} finalized successfully`);
        updatePaymentStatus(paymentId, 'FINALIZED');
      }
    } catch (error) {
      console.error('Finalization error:', error);
    }
  }
  
  res.json({ success: true });
});
```

### Client: Start Payment

```javascript
const startPayment = async () => {
  await paymentProvider.startPayment(paymentId);
  
  // ✅ That's it! Server handles finalization automatically via webhook
  console.log('Payment completed - server will finalize when CONFIRMED');
};
```

## ❌ Common Mistakes

### 1. ❌ Trying to Finalize Before CONFIRMED Status

**Error:**
```json
{
  "code": 1004,
  "detail": "Invalid payment status",
  "cause": null
}
```

**What happened:**
```
Payment created → PENDING
↓
User starts payment → STARTED
↓
❌ Try to finalize HERE → ERROR! (status is STARTED, not CONFIRMED)
```

**Why it's wrong:**
- You can ONLY finalize when status is **CONFIRMED**
- Trying to finalize at STARTED, PENDING, or CANCELED will fail with "Invalid payment status"
- Must wait for webhook to receive CONFIRMED status

**Solution:**
- Wait for webhook callback with CONFIRMED status
- Server automatically finalizes when it receives CONFIRMED
- If manually finalizing, check status first:
  ```javascript
  // Check status before finalizing
  const payment = await fetch(`/api/payment/${paymentId}`);
  if (payment.status === 'CONFIRMED') {
    await finalizePayment(paymentId);
  }
  ```

### 2. ❌ Manual Finalization from Client

**Wrong:**
```javascript
await paymentProvider.startPayment(paymentId);
await manuallyCallFinalizeAPI(); // Don't do this!
```

**Why it's wrong:** 
- Finalization should happen server-side when webhook receives CONFIRMED
- Client doesn't have CLIENT_SECRET
- Race conditions possible

### 3. ❌ Not Handling CONFIRMED in Webhook

**Wrong:**
```javascript
app.post('/api/payment/callback', (req, res) => {
  console.log('Payment status:', req.body.status);
  res.json({ success: true }); // Just logging, not finalizing!
});
```

**Why it's wrong:**
- Payment never gets finalized
- LINE expects finalize to be called after CONFIRMED

### 4. ❌ Using localhost for Webhooks

**Wrong:**
```env
SERVER_URL=http://localhost:3001
```

**Why it's wrong:**
- LINE servers cannot reach localhost
- Webhooks will never be delivered
- Use ngrok or deploy to public server

## ✅ Best Practices

1. **Automatic Finalization**: Always finalize in webhook when status is CONFIRMED
2. **Error Handling**: Catch finalization errors but still respond 200 to webhook
3. **Idempotency**: Handle duplicate webhooks gracefully
4. **Logging**: Log all webhook calls for debugging
5. **Public URL**: Use ngrok locally, deploy to public server for production

## 🔍 Testing the Flow

### 1. Start Services
```bash
# Terminal 1: ngrok
ngrok http 3001

# Terminal 2: Backend
npm run dev

# Terminal 3: Frontend
cd client && npm start
```

### 2. Create and Start Payment
1. Open http://localhost:3000
2. Connect Wallet
3. Create Payment
4. Start Payment

### 3. Monitor Server Logs

You should see:
```
Payment status callback received: { paymentId: "xxx", status: "STARTED" }
Payment status callback received: { paymentId: "xxx", status: "CONFIRMED" }
✅ Payment xxx confirmed, automatically finalizing...
✅ Payment xxx finalized successfully
```

## 📝 Summary

| Step | Who | Action |
|------|-----|--------|
| 1 | Client | Create payment via backend |
| 2 | Backend | Call LINE create API, return payment ID |
| 3 | Client | Call `startPayment()` with payment ID |
| 4 | LINE | User completes payment |
| 5 | LINE | Send webhook: STARTED |
| 6 | Backend | Log status |
| 7 | LINE | Send webhook: CONFIRMED |
| 8 | **Backend** | **Automatically call finalize API** ⭐️ |
| 9 | Complete | Payment finalized ✅ |

## 🎓 Key Takeaways

1. ✅ Finalization is **server-side only** (requires CLIENT_SECRET)
2. ✅ Finalization is **automatic** when webhook receives CONFIRMED
3. ✅ Webhook URL must be **publicly accessible**
4. ✅ `lockUrl` and `unlockUrl` should be **null** unless using limited stock
5. ✅ Client just calls `startPayment()` - server handles the rest

---

For more details, see:
- [README.md](./README.md) - Full documentation
- [PAYMENT_ERROR_FIX.md](./PAYMENT_ERROR_FIX.md) - Error troubleshooting
- [LINE Payment API Docs](https://docs.dappportal.io/mini-dapp/mini-dapp-sdk/payment)

