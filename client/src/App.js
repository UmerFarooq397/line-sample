import React, { useState, useEffect } from 'react';
import DappPortalSDK from '@linenext/dapp-portal-sdk';
import './App.css';

// Configuration
const CLIENT_ID = process.env.REACT_APP_CLIENT_ID || 'your_client_id';
const CHAIN_ID = process.env.REACT_APP_CHAIN_ID || '1001'; // 1001 for testnet

function App() {
  const [sdk, setSdk] = useState(null);
  const [walletProvider, setWalletProvider] = useState(null);
  const [paymentProvider, setPaymentProvider] = useState(null);
  const [walletAddress, setWalletAddress] = useState('');
  const [isInitialized, setIsInitialized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [paymentId, setPaymentId] = useState('');
  const [message, setMessage] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [timeoutWarning, setTimeoutWarning] = useState('');
  const [timeoutInterval, setTimeoutInterval] = useState(null);

  // Sample product
  const [product] = useState({
    itemIdentifier: 'ITEM_001',
    name: 'Sample Digital Product',
    imageUrl: 'https://placehold.co/300x200/4A90E2/ffffff?text=Digital+Product',
    price: 1.0,  // 1 KAIA (testMode=true uses kairos testnet)
    currencyCode: 'KAIA'
  });

  // Initialize SDK
  useEffect(() => {
    initializeSDK();
  }, []);

  const initializeSDK = async () => {
    try {
      setMessage('Initializing Line Mini Dapp SDK...');
      
      // Suppress metric errors (non-critical analytics failures)
      const originalError = console.error;
      console.error = (...args) => {
        if (args[0]?.includes?.('metric.dappportal.io')) return;
        originalError.apply(console, args);
      };
      
      // Use static init method instead of constructor
      const sdkInstance = await DappPortalSDK.init({
        clientId: CLIENT_ID,
        chainId: CHAIN_ID
      });
      
      // Restore original console.error
      console.error = originalError;
      
      setSdk(sdkInstance);
      
      // Get providers
      const wallet = sdkInstance.getWalletProvider();
      const payment = sdkInstance.getPaymentProvider();
      
      setWalletProvider(wallet);
      setPaymentProvider(payment);
      
      setIsInitialized(true);
      setMessage('✅ SDK initialized successfully!');
      
      console.log('✅ SDK initialized successfully:', {
        walletProvider: !!wallet,
        paymentProvider: !!payment,
        note: 'Metric tracking errors are suppressed (non-critical)'
      });
    } catch (error) {
      console.error('❌ Failed to initialize SDK:', error);
      setMessage(`SDK initialization failed: ${error.message}. Make sure localhost:3000 is registered in Line Dapp Portal.`);
    }
  };

  // Connect wallet
  const connectWallet = async () => {
    if (!walletProvider) {
      setMessage('Wallet provider not available');
      return;
    }

    try {
      setLoading(true);
      setMessage('Connecting wallet...');
      
      // Use EIP-1193 standard request method to get accounts
      const accounts = await walletProvider.request({ 
        method: 'eth_requestAccounts' 
      });
      
      if (accounts && accounts.length > 0) {
        const address = accounts[0];
        setWalletAddress(address);
        setMessage(`Wallet connected: ${address}`);
        console.log('Wallet connected:', address);
      } else {
        throw new Error('No accounts found');
      }
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      setMessage(`Failed to connect wallet: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Create payment via backend (CLIENT_SECRET required, cannot expose on client)
  const createPayment = async () => {
    if (!walletAddress) {
      setMessage('Please connect wallet first');
      return;
    }

    try {
      setLoading(true);
      setMessage('Creating payment...');

      // Call backend API (which will call Line API with CLIENT_SECRET)
      const response = await fetch('/api/payment/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          buyerDappPortalAddress: walletAddress,
          pgType: 'CRYPTO',  // CRYPTO or STRIPE
          items: [{
            itemIdentifier: product.itemIdentifier,
            name: product.name,
            imageUrl: product.imageUrl,
            price: product.price,
            currencyCode: product.currencyCode
          }],
          price: product.price,
          currencyCode: product.currencyCode,
          testMode: true
        })
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Backend API error:', error);
        throw new Error(error.error || error.details || 'Failed to create payment');
      }

      const result = await response.json();
      setPaymentId(result.id);
      setMessage(`✅ Payment created! ID: ${result.id}`);
      
      console.log('✅ Payment created successfully:', result);
    } catch (error) {
      console.error('❌ Failed to create payment:', error);
      setMessage(`Failed to create payment: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Start payment
  const startPayment = async () => {
    if (!paymentProvider || !paymentId) {
      setMessage('Payment provider or payment ID not available');
      return;
    }

    try {
      setLoading(true);
      setMessage('Starting payment process...');

      // Clear any existing timeout warning
      if (timeoutInterval) {
        clearInterval(timeoutInterval);
      }

      await paymentProvider.startPayment(paymentId);
      
      setMessage('✅ Payment completed! The server will automatically finalize it when CONFIRMED.');
      
      // Start timeout countdown (180 seconds = 3 minutes)
      let timeLeft = 180;
      const interval = setInterval(() => {
        timeLeft--;
        
        if (timeLeft <= 0) {
          clearInterval(interval);
          setTimeoutWarning('❌ Payment may have timed out (3 min limit). Check status or create new payment.');
        } else if (timeLeft <= 30) {
          setTimeoutWarning(`⚠️ URGENT: Only ${timeLeft} seconds remaining to complete payment!`);
        } else if (timeLeft <= 60) {
          setTimeoutWarning(`⚠️ WARNING: ${timeLeft} seconds remaining to complete payment!`);
        } else if (timeLeft <= 120) {
          setTimeoutWarning(`⏱️ ${Math.floor(timeLeft / 60)} minute(s) ${timeLeft % 60} seconds remaining to complete payment.`);
        }
        
        // Clear warning if payment is confirmed/finalized
        if (paymentStatus === 'CONFIRMED' || paymentStatus === 'FINALIZED') {
          clearInterval(interval);
          setTimeoutWarning('');
        }
      }, 1000);
      
      setTimeoutInterval(interval);
      setTimeoutWarning('⏱️ Payment started! You have 3 minutes to complete. Please complete the payment NOW in the LINE UI.');
      
      // Note: Finalization is now handled automatically by the server webhook
      // when it receives CONFIRMED status from LINE
      
      console.log('Payment completed - awaiting server finalization');
    } catch (error) {
      console.error('Payment failed:', error);
      setMessage(`Payment failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Finalize payment via backend (CLIENT_SECRET required)
  // NOTE: This should normally happen automatically via webhook when status is CONFIRMED
  const finalizePayment = async () => {
    try {
      setLoading(true);
      setMessage('⚠️ Manual finalization - checking payment status first...');

      // First check payment status
      const statusResponse = await fetch(`/api/payment/${paymentId}`);
      if (statusResponse.ok) {
        const paymentData = await statusResponse.json();
        if (paymentData.status !== 'CONFIRMED') {
          setMessage(`❌ Cannot finalize: Payment status is "${paymentData.status}". Must be CONFIRMED first.`);
          return;
        }
      }

      setMessage('Finalizing payment...');

      const response = await fetch('/api/payment/finalize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          paymentId: paymentId
        })
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Finalize API error:', error);
        
        // Check if it's an "invalid payment status" error
        if (error.details && error.details.includes('Invalid payment status')) {
          setMessage('❌ Cannot finalize: Payment is not in CONFIRMED status yet. Wait for webhook callback.');
        } else {
          throw new Error(error.error || 'Failed to finalize payment');
        }
        return;
      }

      const result = await response.json();
      setMessage('✅ Payment finalized! Transaction complete.');
      console.log('✅ Payment finalized successfully:', result);
    } catch (error) {
      console.error('❌ Failed to finalize payment:', error);
      setMessage(`Failed to finalize payment: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Check payment status
  const checkPaymentStatus = async () => {
    if (!paymentId) {
      setMessage('No payment ID available');
      return;
    }

    try {
      setLoading(true);
      setMessage('Checking payment status...');

      const response = await fetch(`/api/payment/${paymentId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch payment status');
      }

      const paymentData = await response.json();
      setPaymentStatus(paymentData.status);
      setMessage(`Payment Status: ${paymentData.status}`);
      console.log('Payment data:', paymentData);
      
      // Clear timeout warning if payment is confirmed or finalized
      if (paymentData.status === 'CONFIRMED' || paymentData.status === 'FINALIZED') {
        if (timeoutInterval) {
          clearInterval(timeoutInterval);
          setTimeoutInterval(null);
        }
        setTimeoutWarning('✅ Payment completed successfully!');
      } else if (paymentData.status === 'CANCELED') {
        if (timeoutInterval) {
          clearInterval(timeoutInterval);
          setTimeoutInterval(null);
        }
        setTimeoutWarning('❌ Payment was canceled. Please create a new payment.');
      }
    } catch (error) {
      console.error('Failed to check payment status:', error);
      setMessage(`Failed to check status: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Open payment history
  const openPaymentHistory = async () => {
    if (!paymentProvider) {
      setMessage('Payment provider not available');
      return;
    }

    try {
      await paymentProvider.openPaymentHistory();
      console.log('Payment history opened');
    } catch (error) {
      console.error('Failed to open payment history:', error);
      setMessage(`Failed to open payment history: ${error.message}`);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>🔷 Line Mini Dapp Payment Sample</h1>
        <p className="subtitle">Integration Demo</p>
      </header>

      <main className="App-main">
        {/* Status Card */}
        <div className="card status-card">
          <h2>📊 Status</h2>
          <div className="status-grid">
            <div className="status-item">
              <span className="label">SDK:</span>
              <span className={`value ${isInitialized ? 'success' : 'pending'}`}>
                {isInitialized ? '✓ Initialized' : '⏳ Not initialized'}
              </span>
            </div>
            <div className="status-item">
              <span className="label">Wallet:</span>
              <span className={`value ${walletAddress ? 'success' : 'pending'}`}>
                {walletAddress ? '✓ Connected' : '⏳ Not connected'}
              </span>
            </div>
            <div className="status-item">
              <span className="label">Payment ID:</span>
              <span className="value mono">
                {paymentId || 'N/A'}
              </span>
            </div>
            {paymentStatus && (
              <div className="status-item">
                <span className="label">Status:</span>
                <span className={`value ${paymentStatus === 'CONFIRMED' ? 'success' : paymentStatus === 'CANCELED' ? 'error' : 'pending'}`}>
                  {paymentStatus}
                </span>
              </div>
            )}
          </div>
          {walletAddress && (
            <div className="wallet-address">
              <strong>Address:</strong> <code>{walletAddress}</code>
            </div>
          )}
        </div>

        {/* Product Card */}
        <div className="card product-card">
          <h2>🛍️ Product</h2>
          <div className="product-content">
            <img src={product.imageUrl} alt={product.name} className="product-image" />
            <div className="product-details">
              <h3>{product.name}</h3>
              <p className="product-id">ID: {product.itemIdentifier}</p>
              <p className="product-price">
                {product.currencyCode} ${product.price.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        {/* Actions Card */}
        <div className="card actions-card">
          <h2>🎮 Actions</h2>
          <div className="button-grid">
            <button
              onClick={connectWallet}
              disabled={!isInitialized || walletAddress || loading}
              className="btn btn-primary"
            >
              {walletAddress ? '✓ Wallet Connected' : '1. Connect Wallet'}
            </button>

            <button
              onClick={createPayment}
              disabled={!walletAddress || paymentId || loading}
              className="btn btn-primary"
            >
              {paymentId ? '✓ Payment Created' : '2. Create Payment'}
            </button>

            <button
              onClick={startPayment}
              disabled={!paymentId || loading}
              className="btn btn-success"
            >
              3. Start Payment
            </button>

            <button
              onClick={checkPaymentStatus}
              disabled={!paymentId || loading}
              className="btn btn-secondary"
            >
              📊 Check Payment Status
            </button>

            <button
              onClick={finalizePayment}
              disabled={!paymentId || loading || (paymentStatus && paymentStatus !== 'CONFIRMED')}
              className="btn btn-secondary"
              title="Only works when payment status is CONFIRMED. Server auto-finalizes via webhook."
            >
              4. Manual Finalize (Optional)
            </button>

            <button
              onClick={openPaymentHistory}
              disabled={!isInitialized || loading}
              className="btn btn-secondary"
            >
              📜 Payment History
            </button>
          </div>
        </div>

        {/* Message Card */}
        {message && (
          <div className="card message-card">
            <h2>💬 Messages</h2>
            <p className="message">{message}</p>
          </div>
        )}

        {/* Timeout Warning Card */}
        {timeoutWarning && (
          <div className={`card ${
            timeoutWarning.includes('URGENT') ? 'error-card' : 
            timeoutWarning.includes('WARNING') ? 'warning-card' : 
            timeoutWarning.includes('✅') ? 'success-card' : 
            'info-card'
          }`}>
            <h2>⏱️ Payment Timer</h2>
            <p className="message" style={{ 
              fontSize: '1.1em', 
              fontWeight: 'bold',
              animation: timeoutWarning.includes('URGENT') ? 'pulse 1s infinite' : 'none'
            }}>
              {timeoutWarning}
            </p>
            {timeoutWarning.includes('seconds remaining') && (
              <p style={{ marginTop: '10px', fontSize: '0.9em' }}>
                💡 Tip: Complete the payment in the LINE payment UI immediately to avoid timeout!
              </p>
            )}
          </div>
        )}

        {/* Loading Indicator */}
        {loading && (
          <div className="loading-overlay">
            <div className="spinner"></div>
            <p>Processing...</p>
          </div>
        )}

        {/* Info Card */}
        <div className="card info-card">
          <h2>ℹ️ Important Notes</h2>
          <ul>
            <li>This demo uses testnet (Chain ID: {CHAIN_ID})</li>
            <li>The SDK only works within the Line Mini Dapp environment</li>
            <li>Make sure your CLIENT_ID and CLIENT_SECRET are properly configured</li>
            <li>Test mode is enabled for safe testing</li>
            <li>Follow the steps in order: Connect → Create → Start Payment → Check Status</li>
            <li>
              <strong>⏱️ PAYMENT TIMEOUT WARNING:</strong>
              <ul>
                <li>You have <strong>~3 minutes</strong> to complete payment after clicking "Start Payment"</li>
                <li>Payment status will be CANCELED if not completed within timeout</li>
                <li><strong>Complete payment immediately</strong> - don't just wait or check status!</li>
                <li>If timeout occurs, create a new payment and complete it faster</li>
              </ul>
            </li>
            <li><strong>Automatic Finalization:</strong> When payment status becomes CONFIRMED, the server automatically calls the finalize API via webhook</li>
            <li><strong>Payment Statuses:</strong>
              <ul>
                <li>PENDING → Initial state (after creation)</li>
                <li>STARTED → User initiated payment (⏱️ 3-minute timeout starts here!)</li>
                <li>CONFIRMED → Payment successful (can finalize)</li>
                <li>CANCELED → Payment cancelled or timed out</li>
                <li>FINALIZED → Payment completed</li>
              </ul>
            </li>
            <li><strong>Getting Test Funds:</strong> Get free test KAIA tokens from <a href="https://kairos.wallet.klaytn.foundation/faucet" target="_blank" rel="noopener noreferrer">Kairos Faucet</a></li>
          </ul>
        </div>
      </main>
    </div>
  );
}

export default App;

