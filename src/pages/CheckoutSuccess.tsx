import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { motion } from 'motion/react';
import { ShieldCheck, Loader2, Download } from 'lucide-react';
import { toast } from 'sonner';
import { downloadInvoice } from '../lib/invoice';

export default function CheckoutSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<any>(null);
  const orderId = searchParams.get('order_id');

  useEffect(() => {
    const finalizeOrder = async () => {
      if (!orderId) {
        setLoading(false);
        return;
      }

      try {
        const orderRef = doc(db, 'orders', orderId);
        const orderSnap = await getDoc(orderRef);

        if (orderSnap.exists()) {
          const orderData = { id: orderSnap.id, ...orderSnap.data() } as any;
          setOrder(orderData);
          // Payment status + stock already updated server-side after verification
          toast.success('Payment successful! Your order is confirmed.');
          
          // Auto-download invoice
          setTimeout(() => {
            downloadInvoice(orderData);
          }, 1500);
        }
      } catch (error) {
        console.error('Error finalizing order:', error);
        toast.error('There was an issue confirming your payment status.');
      } finally {
        setLoading(false);
      }
    };

    finalizeOrder();
  }, [orderId, clearCart]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-secondary/30">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-brand-primary mx-auto mb-4" />
          <p className="text-xl font-serif">Confirming your payment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="py-32 px-4 bg-brand-secondary/30 min-h-screen flex items-center justify-center">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-xl w-full bg-white p-12 rounded-[48px] shadow-xl text-center"
      >
        <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-8">
          <ShieldCheck size={48} />
        </div>
        <h1 className="text-4xl font-serif mb-4">Order Confirmed!</h1>
        <p className="text-gray-500 mb-10 text-lg">
          Thank you for your purchase. Your premium Haridwar-crafted threads are being prepared.
        </p>
        
        {orderId && (
          <div className="bg-brand-secondary/50 p-8 rounded-3xl mb-10 border border-brand-primary/5">
            <p className="text-xs uppercase tracking-widest opacity-40 font-bold mb-2">Your Order ID</p>
            <p className="text-2xl font-mono font-bold text-brand-primary">#{orderId.toUpperCase()}</p>
          </div>
        )}

        <div className="space-y-4">
          {order && (
            <button 
              onClick={() => downloadInvoice(order)}
              className="btn-secondary w-full py-4 text-lg flex items-center justify-center gap-2"
            >
              <Download size={20} /> DOWNLOAD INVOICE
            </button>
          )}
          <button 
            onClick={() => navigate('/profile')}
            className="btn-primary w-full py-4 text-lg"
          >
            VIEW ORDER STATUS
          </button>
          <button 
            onClick={() => navigate('/')}
            className="w-full py-4 text-brand-primary font-bold hover:opacity-70 transition-opacity"
          >
            CONTINUE SHOPPING
          </button>
        </div>
      </motion.div>
    </div>
  );
}
