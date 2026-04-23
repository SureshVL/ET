import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { XCircle } from 'lucide-react';

export default function CheckoutCancel() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('order_id');

  return (
    <div className="py-32 px-4 bg-brand-secondary/30 min-h-screen flex items-center justify-center">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-xl w-full bg-white p-12 rounded-[48px] shadow-xl text-center"
      >
        <div className="w-24 h-24 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-8">
          <XCircle size={48} />
        </div>
        <h1 className="text-4xl font-serif mb-4">Payment Cancelled</h1>
        <p className="text-gray-500 mb-10 text-lg">
          Your payment was not completed. You can try again from your cart or contact support if you're having issues.
        </p>
        
        {orderId && (
          <div className="bg-brand-secondary/50 p-8 rounded-3xl mb-10 border border-brand-primary/5">
            <p className="text-xs uppercase tracking-widest opacity-40 font-bold mb-2">Reference Order ID</p>
            <p className="text-2xl font-mono font-bold text-brand-primary">#{orderId.toUpperCase()}</p>
          </div>
        )}

        <div className="space-y-4">
          <button 
            onClick={() => navigate('/cart')}
            className="btn-primary w-full py-4 text-lg"
          >
            RETURN TO CART
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
