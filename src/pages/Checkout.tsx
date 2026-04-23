import React, { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, serverTimestamp, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { toast } from 'sonner';
import { motion } from 'motion/react';
import { CreditCard, Truck, ShieldCheck, MapPin, Check, AlertCircle, Loader2 } from 'lucide-react';
import { normalisePhone, validatePhone, validatePincode, normalisePincode } from '../lib/phoneUtils';

declare global {
  interface Window { Razorpay: any; }
}

export default function Checkout() {
  const { items, total, clearCart } = useCart();
  const { user } = useAuth();
  const { formatPrice } = useCurrency();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [calculatingShipping, setCalculatingShipping] = useState(false);
  const [address, setAddress] = useState('');
  const [shippingInfo, setShippingInfo] = useState<any>(null);
  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: user?.displayName || '',
    street: '',
    city: '',
    state: '',
    pincode: '',
    phone: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user) setFormData(prev => ({ ...prev, name: user.displayName || '' }));
  }, [user]);

  // FIX: Normalise phone/pincode before validation
  const validateField = (name: string, value: string): boolean => {
    let error = '';
    switch (name) {
      case 'name':
        if (!value.trim()) error = 'Full name is required';
        break;
      case 'street':
        if (!value.trim()) error = 'Street address is required';
        break;
      case 'city':
        if (!value.trim()) error = 'City is required';
        break;
      case 'state':
        if (!value.trim()) error = 'State is required';
        break;
      case 'pincode':
        if (!validatePincode(value)) error = 'Invalid pincode (6 digits required)';
        break;
      case 'phone':
        if (!validatePhone(value)) error = 'Invalid phone (10 digits, with or without +91)';
        break;
    }
    setErrors(prev => ({ ...prev, [name]: error }));
    return error === '';
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    // Auto-normalise pincode to digits only
    const processed = name === 'pincode' ? normalisePincode(value) : value;
    setFormData(prev => ({ ...prev, [name]: processed }));
    validateField(name, processed);

    if (name === 'pincode' && validatePincode(processed)) {
      calculateShipping({ ...formData, pincode: processed });
    }
  };

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'addresses'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, snapshot => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      setSavedAddresses(list);
      if (selectedAddressId === null) {
        const def = list.find((a: any) => a.isDefault);
        if (def) handleSelectAddress(def);
      }
    }, err => handleFirestoreError(err, OperationType.GET, 'addresses'));
    return () => unsub();
  }, [user]);

  const calculateShipping = async (addr: any) => {
    setCalculatingShipping(true);
    try {
      const res = await fetch('/api/shipping/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pincode: addr.pincode,
          city: addr.city,
          state: addr.state,
          country: addr.country || 'India',
          totalWeight: items.reduce((acc, item) => acc + item.quantity * 500, 0)
        }),
      });
      // FIX: Graceful fallback if shipping API fails
      if (!res.ok) throw new Error('Shipping API unavailable');
      setShippingInfo(await res.json());
    } catch {
      // Fallback: flat free shipping
      setShippingInfo({ rate: 0, estimatedDelivery: '5-7 days', courierPartner: 'Delhivery', zone: 'NATIONAL' });
    } finally {
      setCalculatingShipping(false);
    }
  };

  const handleSelectAddress = (addr: any) => {
    setSelectedAddressId(addr.id);
    setAddress(`${addr.name}\n${addr.street}\n${addr.city}, ${addr.state} - ${addr.pincode}\nPhone: ${addr.phone}`);
    calculateShipping(addr);
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    let finalAddress = address;

    if (selectedAddressId === 'new' || !selectedAddressId) {
      let isValid = true;
      Object.keys(formData).forEach(key => {
        if (!validateField(key, (formData as any)[key])) isValid = false;
      });
      if (!isValid) { toast.error('Please fix the errors in the form'); return; }

      // FIX: Normalise phone/pincode before storing
      const normPhone = normalisePhone(formData.phone);
      const normPin = normalisePincode(formData.pincode);
      finalAddress = `${formData.name}\n${formData.street}\n${formData.city}, ${formData.state} - ${normPin}\nPhone: ${normPhone}`;
    }

    if (!finalAddress) { toast.error('Please enter your shipping address'); return; }
    if (items.length === 0) { toast.error('Your cart is empty'); return; }

    setLoading(true);
    try {
      const normPhone = selectedAddressId && selectedAddressId !== 'new' ? '' : normalisePhone(formData.phone);
      // Build structured address for Shiprocket API
      const isNewAddr = selectedAddressId === 'new' || !selectedAddressId;
      const structuredAddress = isNewAddr ? {
        customerName: formData.name,
        phone: normalisePhone(formData.phone),
        addressLine: formData.street,
        city: formData.city,
        state: formData.state,
        pincode: normalisePincode(formData.pincode),
        country: 'India',
      } : (() => {
        const saved = savedAddresses.find(a => a.id === selectedAddressId);
        return saved ? {
          customerName: saved.name,
          phone: normalisePhone(saved.phone || ''),
          addressLine: saved.street,
          city: saved.city,
          state: saved.state,
          pincode: saved.pincode,
          country: 'India',
        } : {};
      })();

      const orderData = {
        userId: user?.uid,
        userEmail: user?.email || '',
        items: items.map(i => ({ productId: i.productId, name: i.name, price: i.price, size: i.size, quantity: i.quantity, image: i.image })),
        totalAmount: total + (shippingInfo?.rate || 0),
        subtotal: total,
        shippingFee: shippingInfo?.rate || 0,
        estimatedDelivery: shippingInfo?.estimatedDelivery || '5-7 days',
        status: 'pending',
        paymentStatus: 'pending',
        createdAt: serverTimestamp(),
        shippingAddress: finalAddress,
        // Structured fields for Shiprocket
        ...structuredAddress,
      };

      const docRef = await addDoc(collection(db, 'orders'), orderData);
      const orderId = docRef.id;

      // Load Razorpay
      await new Promise<void>((resolve, reject) => {
        if (window.Razorpay) { resolve(); return; }
        const s = document.createElement('script');
        s.src = 'https://checkout.razorpay.com/v1/checkout.js';
        s.onload = () => resolve();
        s.onerror = () => reject(new Error('Razorpay SDK failed to load'));
        document.body.appendChild(s);
      });

      const [keyRes, orderRes] = await Promise.all([
        fetch('/api/razorpay-key'),
        fetch('/api/create-razorpay-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: total + (shippingInfo?.rate || 0), currency: 'INR', receipt: orderId }),
        })
      ]);

      if (!keyRes.ok || !orderRes.ok) throw new Error('Payment gateway configuration error');

      const { key } = await keyRes.json();
      const razorpayOrder = await orderRes.json();

      if (!key) throw new Error('Razorpay Key ID is not configured on the server');
      if (razorpayOrder.error) throw new Error(razorpayOrder.error);

      const options = {
        key,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        name: 'Devaragudi Ethnic Threads',
        description: 'Premium Handcrafted Ethnic Wear from Haridwar',
        order_id: razorpayOrder.id,
        handler: async (response: any) => {
          try {
            const verifyRes = await fetch('/api/verify-razorpay-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });
            const verifyData = await verifyRes.json();
            if (verifyData.status === 'success') {
              clearCart();
              // Fire-and-forget confirmation email
              fetch('/api/send-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  to: user?.email,
                  subject: `Order Confirmed — #${orderId.slice(-6).toUpperCase()}`,
                  html: `<h3>Thank you for your order!</h3><p>Order ID: <strong>${orderId}</strong></p><p>Total: ₹${(total + (shippingInfo?.rate || 0)).toLocaleString()}</p><p>We'll notify you once shipped.</p>`,
                }),
              }).catch(console.error);
              navigate(`/checkout/success?order_id=${orderId}`);
            } else {
              toast.error('Payment verification failed. Contact support.');
            }
          } catch {
            toast.error('Error verifying payment. Please contact support.');
          }
        },
        prefill: { name: user?.displayName || '', email: user?.email || '' },
        theme: { color: '#8B4513' },
        modal: { ondismiss: () => { toast('Payment cancelled'); navigate(`/checkout/cancel?order_id=${orderId}`); } }
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (response: any) => {
        toast.error(response.error.description || 'Payment failed');
        navigate(`/checkout/cancel?order_id=${orderId}`);
      });
      rzp.open();

    } catch (err: any) {
      console.error('Checkout error:', err);
      toast.error(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="py-24 px-4 bg-brand-secondary/30">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-5xl mb-16">Checkout</h1>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-12">

            {/* Shipping */}
            <div className="bg-white p-10 rounded-[40px] shadow-sm">
              <h2 className="text-3xl mb-8 flex items-center gap-4">
                <Truck className="text-brand-primary" /> Shipping Details
              </h2>

              {savedAddresses.length > 0 && (
                <div className="mb-10">
                  <h3 className="text-sm uppercase tracking-widest mb-4 opacity-60 flex items-center gap-2">
                    <MapPin size={14} /> Select Saved Address
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {savedAddresses.map(addr => (
                      <button
                        key={addr.id} type="button" onClick={() => handleSelectAddress(addr)}
                        className={`p-4 rounded-2xl border-2 text-left transition-all relative ${selectedAddressId === addr.id ? 'border-brand-primary bg-brand-primary/5' : 'border-brand-primary/10 hover:border-brand-primary/30'}`}
                      >
                        {selectedAddressId === addr.id && (
                          <div className="absolute top-3 right-3 w-5 h-5 bg-brand-primary rounded-full flex items-center justify-center text-white">
                            <Check size={12} />
                          </div>
                        )}
                        <p className="font-bold text-sm mb-1 truncate pr-6">{addr.name}</p>
                        <p className="text-xs opacity-60 line-clamp-2">{addr.street}, {addr.city}</p>
                        <p className="text-[10px] opacity-40 mt-2 uppercase tracking-tighter">{addr.pincode}</p>
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => { setSelectedAddressId('new'); setAddress(''); }}
                      className={`p-4 rounded-2xl border-2 border-dashed text-left transition-all ${selectedAddressId === 'new' ? 'border-brand-primary bg-brand-primary/5' : 'border-brand-primary/10'}`}
                    >
                      <p className="font-bold text-sm mb-1">New Address</p>
                      <p className="text-xs opacity-60">Enter a different address</p>
                    </button>
                  </div>
                </div>
              )}

              <form onSubmit={handlePlaceOrder}>
                {(selectedAddressId === 'new' || !selectedAddressId || savedAddresses.length === 0) ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {[
                        { id: 'name', label: 'Full Name', placeholder: "Recipient's name", type: 'text' },
                        { id: 'phone', label: 'Phone', placeholder: '+91 or 10-digit number', type: 'tel' },
                      ].map(f => (
                        <div key={f.id}>
                          <label htmlFor={f.id} className="block text-sm uppercase tracking-widest mb-2 opacity-60">{f.label}</label>
                          <input
                            id={f.id} name={f.id} type={f.type}
                            value={(formData as any)[f.id]}
                            onChange={handleInputChange}
                            placeholder={f.placeholder}
                            className={`w-full p-4 rounded-2xl border outline-none transition-colors ${errors[f.id] ? 'border-red-500 bg-red-50' : 'border-brand-primary/10 focus:border-brand-primary'}`}
                          />
                          {errors[f.id] && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle size={12} />{errors[f.id]}</p>}
                        </div>
                      ))}
                    </div>
                    <div>
                      <label htmlFor="street" className="block text-sm uppercase tracking-widest mb-2 opacity-60">Street Address</label>
                      <textarea
                        id="street" name="street" value={formData.street} onChange={handleInputChange}
                        placeholder="House No., Building, Street, Area..."
                        className={`w-full p-4 rounded-2xl border outline-none h-24 transition-colors ${errors.street ? 'border-red-500 bg-red-50' : 'border-brand-primary/10 focus:border-brand-primary'}`}
                      />
                      {errors.street && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle size={12} />{errors.street}</p>}
                    </div>
                    <div className="grid grid-cols-3 gap-6">
                      {[
                        { id: 'city', label: 'City', placeholder: 'City' },
                        { id: 'state', label: 'State', placeholder: 'State' },
                        { id: 'pincode', label: 'Pincode', placeholder: '6-digit PIN' },
                      ].map(f => (
                        <div key={f.id}>
                          <label htmlFor={f.id} className="block text-sm uppercase tracking-widest mb-2 opacity-60">{f.label}</label>
                          <input
                            id={f.id} name={f.id} type="text"
                            value={(formData as any)[f.id]}
                            onChange={handleInputChange}
                            placeholder={f.placeholder}
                            maxLength={f.id === 'pincode' ? 6 : undefined}
                            className={`w-full p-4 rounded-2xl border outline-none transition-colors ${errors[f.id] ? 'border-red-500 bg-red-50' : 'border-brand-primary/10 focus:border-brand-primary'}`}
                          />
                          {errors[f.id] && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle size={12} />{errors[f.id]}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-6 bg-brand-primary/5 rounded-[32px] border border-brand-primary/10">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="font-bold text-lg">Selected Address</h3>
                      <button type="button" onClick={() => setSelectedAddressId('new')} className="text-xs font-bold text-brand-primary hover:underline">CHANGE</button>
                    </div>
                    <p className="text-gray-600 leading-relaxed whitespace-pre-line">{address}</p>
                  </div>
                )}
              </form>
            </div>

            {/* Payment method info */}
            <div className="bg-white p-10 rounded-[40px] shadow-sm">
              <h2 className="text-3xl mb-8 flex items-center gap-4">
                <CreditCard className="text-brand-primary" /> Payment Method
              </h2>
              <div className="p-6 border-2 border-brand-primary rounded-3xl bg-brand-primary/5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center">
                    <CreditCard className="text-brand-primary" />
                  </div>
                  <div>
                    <p className="font-bold">Online Payment via Razorpay</p>
                    <p className="text-sm opacity-60">UPI · Cards · Net Banking · Wallets</p>
                  </div>
                </div>
                <div className="w-6 h-6 rounded-full bg-brand-primary flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-white" />
                </div>
              </div>
              <p className="mt-6 text-sm text-gray-500 italic">* No Cash on Delivery. Online payments only.</p>
            </div>
          </motion.div>

          {/* Order Summary */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="bg-white p-10 rounded-[40px] shadow-sm h-fit sticky top-32">
            <h2 className="text-3xl mb-8">Order Review</h2>
            <div className="space-y-6 mb-12 max-h-80 overflow-y-auto pr-2">
              {items.map(item => (
                <div key={`${item.productId}-${item.size}`} className="flex justify-between items-center">
                  <div className="flex gap-4">
                    <div className="w-14 h-18 rounded-xl overflow-hidden bg-brand-secondary flex-shrink-0">
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <h4 className="font-serif text-base">{item.name}</h4>
                      <p className="text-sm opacity-60">Size {item.size} × {item.quantity}</p>
                    </div>
                  </div>
                  <p className="font-medium">{formatPrice(item.price * item.quantity)}</p>
                </div>
              ))}
            </div>
            <div className="space-y-4 pt-8 border-t border-brand-primary/10 mb-12">
              <div className="flex justify-between text-lg">
                <span className="opacity-60">Subtotal</span><span>{formatPrice(total)}</span>
              </div>
              <div className="flex justify-between text-lg">
                <span className="opacity-60 flex items-center gap-2">
                  Shipping {calculatingShipping && <div className="w-3 h-3 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />}
                </span>
                <span className={shippingInfo?.rate === 0 ? 'text-green-600 font-medium' : ''}>
                  {shippingInfo ? (shippingInfo.rate === 0 ? 'FREE' : formatPrice(shippingInfo.rate)) : 'Enter pincode'}
                </span>
              </div>
              {shippingInfo && (
                <div className="bg-brand-primary/5 p-4 rounded-2xl flex items-center gap-3 text-sm">
                  <Truck size={16} className="text-brand-primary" />
                  <div>
                    <p className="font-bold">Est. Delivery: {shippingInfo.estimatedDelivery}</p>
                    <p className="opacity-60">Via {shippingInfo.courierPartner}</p>
                  </div>
                </div>
              )}
              <div className="flex justify-between text-2xl font-serif pt-4 border-t border-brand-primary/5">
                <span>Total</span><span>{formatPrice(total + (shippingInfo?.rate || 0))}</span>
              </div>
            </div>
            <button
              onClick={handlePlaceOrder}
              disabled={loading || items.length === 0}
              className="btn-primary w-full py-5 text-lg flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : <ShieldCheck size={20} />}
              {loading ? 'Processing...' : 'PAY & PLACE ORDER'}
            </button>
            <p className="text-xs text-center text-gray-400 mt-4">🔒 Payments secured by Razorpay</p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
