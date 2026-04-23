import React, { useState, useEffect, useCallback } from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search, Truck, Package, CheckCircle, Clock,
  MapPin, AlertCircle, Loader2, ArrowRight,
  RefreshCw, Download, MessageCircle, Circle
} from 'lucide-react';
import { toast } from 'sonner';
import { useSearchParams, Link } from 'react-router-dom';
import SEO from '../components/SEO';

// ── Status definitions ────────────────────────────────────────────────────
const STATUS_STEPS = [
  { key: 'pending',          label: 'Order Confirmed',    icon: Clock,        color: 'bg-yellow-500' },
  { key: 'pickup_scheduled', label: 'Pickup Scheduled',   icon: MapPin,       color: 'bg-blue-400' },
  { key: 'picked_up',        label: 'Picked Up',          icon: Package,      color: 'bg-blue-500' },
  { key: 'in_transit',       label: 'In Transit',         icon: Truck,        color: 'bg-brand-primary' },
  { key: 'out_for_delivery', label: 'Out for Delivery',   icon: Truck,        color: 'bg-orange-500' },
  { key: 'delivered',        label: 'Delivered',          icon: CheckCircle,  color: 'bg-green-500' },
];

const STATUS_ORDER = STATUS_STEPS.map(s => s.key);

// Map our internal status → step index (0-based)
function getStepIndex(status: string): number {
  const idx = STATUS_ORDER.indexOf(status);
  return idx === -1 ? 0 : idx;
}

function getStatusLabel(status: string): string {
  return STATUS_STEPS.find(s => s.key === status)?.label || 'Processing';
}

function getStatusColor(status: string): string {
  if (status === 'delivered') return 'bg-green-100 text-green-700';
  if (status === 'out_for_delivery') return 'bg-orange-100 text-orange-700';
  if (['in_transit', 'picked_up', 'pickup_scheduled'].includes(status)) return 'bg-blue-100 text-blue-700';
  if (['cancelled', 'rto', 'failed'].includes(status)) return 'bg-red-100 text-red-700';
  return 'bg-yellow-100 text-yellow-700';
}

// ── Live tracking hook ───────────────────────────────────────────────────
function useLiveTracking(awb: string | null) {
  const [trackData, setTrackData] = useState<any>(null);
  const [trackLoading, setTrackLoading] = useState(false);

  const fetchTracking = useCallback(async () => {
    if (!awb) return;
    setTrackLoading(true);
    try {
      const res = await fetch(`/api/shipping/track?awb=${encodeURIComponent(awb)}`);
      if (res.ok) setTrackData(await res.json());
    } catch (e) {
      console.error('Live tracking fetch error:', e);
    } finally {
      setTrackLoading(false);
    }
  }, [awb]);

  useEffect(() => {
    fetchTracking();
    if (!awb) return;
    const interval = setInterval(fetchTracking, 5 * 60 * 1000); // refresh every 5 min
    return () => clearInterval(interval);
  }, [fetchTracking, awb]);

  return { trackData, trackLoading, refresh: fetchTracking };
}

// ── Component ────────────────────────────────────────────────────────────
export default function TrackOrder() {
  const [searchParams] = useSearchParams();
  const [orderId, setOrderId] = useState(searchParams.get('id') || '');
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const { trackData, trackLoading, refresh } = useLiveTracking(order?.trackingId || null);

  useEffect(() => {
    const id = searchParams.get('id');
    if (id) fetchOrder(id);
  }, [searchParams]);

  const fetchOrder = async (id: string) => {
    setLoading(true);
    setError(null);
    setOrder(null);
    try {
      const snap = await getDoc(doc(db, 'orders', id.trim()));
      if (snap.exists()) {
        setOrder({ id: snap.id, ...snap.data() });
      } else {
        setError('Order not found. Please check your Order ID.');
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `orders/${id}`);
      setError('An error occurred while fetching order details.');
    } finally {
      setLoading(false);
    }
  };

  // Merge Firestore status with live tracking status (live tracking wins if more advanced)
  const firestoreStatus = order?.shippingStatus || order?.status || 'pending';
  const liveStatus = trackData?.status;
  const displayStatus = liveStatus
    ? (getStepIndex(liveStatus) > getStepIndex(firestoreStatus) ? liveStatus : firestoreStatus)
    : firestoreStatus;

  const currentStep = getStepIndex(displayStatus);
  const isCancelled = ['cancelled', 'rto', 'failed'].includes(displayStatus);

  return (
    <div className="py-24 px-4 bg-brand-secondary/30 min-h-screen">
      <SEO title="Track Order | Devaragudi Ethnic Threads" description="Track your order from Haridwar to your doorstep." />

      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <motion.h1 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-5xl font-serif mb-6">
            Track Your Order
          </motion.h1>
          <p className="text-gray-500 max-w-lg mx-auto">
            Real-time updates on your Haridwar-crafted ethnic wear — from our hands to yours.
          </p>
        </div>

        {/* Search */}
        <div className="bg-white p-8 md:p-12 rounded-[48px] shadow-sm mb-12">
          <form onSubmit={e => { e.preventDefault(); if (orderId.trim()) fetchOrder(orderId); }} className="flex flex-col md:flex-row gap-4">
            <div className="flex-grow relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-primary/40" size={20} />
              <input
                type="text" value={orderId} onChange={e => setOrderId(e.target.value)}
                placeholder="Enter Order ID"
                className="w-full pl-12 pr-4 py-4 rounded-2xl border border-brand-primary/10 focus:border-brand-primary outline-none transition-all"
                required
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary px-10 py-4 flex items-center justify-center gap-2 whitespace-nowrap">
              {loading ? <Loader2 className="animate-spin" size={20} /> : <Truck size={20} />}
              {loading ? 'TRACKING...' : 'TRACK ORDER'}
            </button>
          </form>
        </div>

        <AnimatePresence mode="wait">
          {error && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="bg-red-50 border border-red-100 p-6 rounded-3xl flex items-center gap-4 text-red-600 mb-8"
            >
              <AlertCircle size={24} /><p className="font-medium">{error}</p>
            </motion.div>
          )}

          {order && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-8">

              {/* Status header */}
              <div className="bg-white p-10 rounded-[48px] shadow-sm">
                <div className="flex flex-wrap justify-between items-start gap-4 mb-10">
                  <div>
                    <p className="text-xs uppercase tracking-widest opacity-40 font-bold mb-1">Order ID</p>
                    <p className="font-mono font-bold text-brand-primary text-lg">#{order.id.slice(-8).toUpperCase()}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider ${getStatusColor(displayStatus)}`}>
                      {getStatusLabel(displayStatus)}
                    </span>
                    {order.trackingId && (
                      <button onClick={refresh} disabled={trackLoading} title="Refresh live tracking"
                        className="w-9 h-9 border border-brand-primary/10 rounded-full flex items-center justify-center hover:bg-brand-secondary/50 transition-all"
                      >
                        <RefreshCw size={14} className={trackLoading ? 'animate-spin text-brand-primary' : 'text-brand-primary/50'} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Progress stepper */}
                {!isCancelled ? (
                  <div className="relative">
                    {/* Track line */}
                    <div className="absolute top-5 left-5 right-5 h-0.5 bg-brand-secondary -z-0 hidden sm:block">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(currentStep / (STATUS_STEPS.length - 1)) * 100}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        className="h-full bg-brand-primary"
                      />
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-4 sm:gap-0">
                      {STATUS_STEPS.map((step, idx) => {
                        const done = idx <= currentStep;
                        const active = idx === currentStep;
                        const Icon = step.icon;
                        return (
                          <div key={step.key} className="flex flex-col items-center gap-2 relative">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-500 z-10
                              ${done ? `${step.color} border-transparent text-white ${active ? 'scale-125 shadow-lg' : ''}` : 'bg-white border-brand-secondary text-brand-secondary/40'}`}
                            >
                              <Icon size={16} />
                            </div>
                            <span className={`text-[10px] font-bold uppercase tracking-wider text-center leading-tight ${done ? 'text-brand-primary' : 'opacity-30'}`}>
                              {step.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="bg-red-50 border border-red-100 rounded-2xl p-6 text-center">
                    <AlertCircle className="text-red-500 mx-auto mb-2" size={32} />
                    <p className="font-bold text-red-700">Shipment {displayStatus === 'rto' ? 'Returned to Sender' : 'Cancelled / Undelivered'}</p>
                    <p className="text-sm text-red-500 mt-1">Please contact support for assistance.</p>
                  </div>
                )}
              </div>

              {/* Courier + Live tracking details */}
              {order.trackingId && (
                <div className="bg-white p-10 rounded-[48px] shadow-sm">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-xs uppercase tracking-widest opacity-40 font-bold flex items-center gap-2">
                      <Truck size={14} /> Courier Details
                    </h3>
                    {trackLoading && <span className="text-xs text-brand-primary animate-pulse">Updating...</span>}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-8">
                    <div>
                      <p className="text-[10px] uppercase tracking-widest opacity-40 mb-1">Courier</p>
                      <p className="font-bold">{trackData?.courierName || order.courierPartner || '—'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-widest opacity-40 mb-1">AWB / Tracking No.</p>
                      <p className="font-mono font-bold text-brand-primary">{order.trackingId}</p>
                    </div>
                    {(trackData?.etd || order.estimatedDelivery) && (
                      <div>
                        <p className="text-[10px] uppercase tracking-widest opacity-40 mb-1">Expected Delivery</p>
                        <p className="font-bold text-green-600">{trackData?.etd || order.estimatedDelivery}</p>
                      </div>
                    )}
                  </div>

                  {/* Event timeline */}
                  {trackData?.events?.length > 0 && (
                    <div>
                      <p className="text-[10px] uppercase tracking-widest opacity-40 font-bold mb-4">Tracking Timeline</p>
                      <div className="space-y-0">
                        {trackData.events.map((ev: any, idx: number) => (
                          <div key={idx} className="flex gap-4 relative">
                            <div className="flex flex-col items-center">
                              <div className={`w-3 h-3 rounded-full flex-shrink-0 mt-1 ${idx === 0 ? 'bg-brand-primary' : 'bg-brand-secondary border-2 border-brand-primary/20'}`} />
                              {idx < trackData.events.length - 1 && <div className="w-0.5 bg-brand-secondary flex-grow my-1" />}
                            </div>
                            <div className={`pb-5 flex-1 ${idx === 0 ? 'opacity-100' : 'opacity-60'}`}>
                              <p className={`text-sm font-medium ${idx === 0 ? 'text-brand-primary' : 'text-slate-700'}`}>{ev.activity}</p>
                              {ev.location && <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1"><MapPin size={10} />{ev.location}</p>}
                              <p className="text-[10px] text-gray-400 mt-0.5">{ev.date}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-4 mt-6 pt-6 border-t border-brand-primary/10">
                    {order.labelUrl && (
                      <a href={order.labelUrl} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 text-xs font-bold text-brand-primary hover:underline"
                      >
                        <Download size={14} /> Download Shipping Label
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Shipping address */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white p-10 rounded-[48px] shadow-sm">
                  <h3 className="text-xs uppercase tracking-widest mb-6 opacity-40 font-bold flex items-center gap-2">
                    <MapPin size={14} /> Shipping Address
                  </h3>
                  <p className="text-gray-600 leading-relaxed whitespace-pre-line">{order.shippingAddress}</p>
                </div>

                <div className="bg-white p-10 rounded-[48px] shadow-sm">
                  <h3 className="text-xs uppercase tracking-widest mb-6 opacity-40 font-bold flex items-center gap-2">
                    <Package size={14} /> Order Summary
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm"><span className="opacity-60">Items</span><span>{order.items?.length || 0} product(s)</span></div>
                    <div className="flex justify-between text-sm"><span className="opacity-60">Subtotal</span><span>₹ {order.subtotal?.toLocaleString()}</span></div>
                    <div className="flex justify-between text-sm"><span className="opacity-60">Shipping</span><span className={order.shippingFee === 0 ? 'text-green-600 font-medium' : ''}>{order.shippingFee === 0 ? 'FREE' : `₹ ${order.shippingFee}`}</span></div>
                    <div className="flex justify-between font-serif text-lg pt-3 border-t border-brand-primary/10">
                      <span>Total Paid</span><span className="text-brand-primary">₹ {order.totalAmount?.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Order items */}
              <div className="bg-white p-10 rounded-[48px] shadow-sm">
                <h3 className="text-xs uppercase tracking-widest mb-8 opacity-40 font-bold flex items-center gap-2">
                  <Package size={14} /> Items Ordered
                </h3>
                <div className="space-y-6">
                  {order.items?.map((item: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-6">
                      <div className="w-16 h-20 rounded-xl overflow-hidden bg-brand-secondary/30 flex-shrink-0">
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover"
                          onError={e => { (e.currentTarget as HTMLImageElement).src = '/images/haridwar-2.jpg'; }} />
                      </div>
                      <div className="flex-grow">
                        <h4 className="font-bold">{item.name}</h4>
                        <p className="text-sm opacity-60">Size: {item.size} × {item.quantity}</p>
                      </div>
                      <p className="font-bold whitespace-nowrap">₹ {(item.price * item.quantity).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Help */}
              <div className="bg-brand-primary/5 border border-brand-primary/10 p-8 rounded-[40px] text-center">
                <p className="text-sm opacity-70 mb-4">Need help with your order? Reach out to us directly.</p>
                <a href="https://wa.me/918978561958" target="_blank" rel="noopener noreferrer"
                  className="btn-primary inline-flex items-center gap-2 px-8 py-3"
                >
                  <MessageCircle size={16} /> WhatsApp Support
                </a>
              </div>

            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
