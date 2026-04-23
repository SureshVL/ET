import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, Plus, Minus, ShoppingBag, LogIn, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';
import ConfirmationModal from '../components/ConfirmationModal';

export default function Cart() {
  const { items, removeFromCart, addToCart, total } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [itemToRemove, setItemToRemove] = useState<{ productId: string, size: number, variantName?: string } | null>(null);

  if (items.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden">
        <div className="absolute inset-0 dynamic-bg opacity-5 pointer-events-none" />
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative z-10 text-center"
        >
          <div className="w-32 h-32 bg-brand-primary/10 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
            <ShoppingBag size={48} className="text-brand-primary" />
          </div>
          <h1 className="text-5xl font-serif mb-4 text-brand-primary">Your cart is empty</h1>
          <p className="text-xl text-gray-500 mb-12 font-light">Looks like you haven't added any kurtas yet.</p>
          <Link to="/products" className="btn-primary px-12 py-5 text-lg">
            BROWSE COLLECTION
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="py-24 px-4 bg-brand-secondary/30">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-5xl mb-16">Shopping Cart</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
          <div className="lg:col-span-2 space-y-8">
              {items.map((item) => (
                <motion.div 
                  key={`${item.productId}-${item.size}-${item.variantName || 'standard'}`}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white p-6 rounded-[32px] flex flex-col sm:flex-row gap-8 items-center shadow-sm"
                >
                <div className="w-32 h-40 rounded-2xl overflow-hidden bg-brand-secondary flex-shrink-0">
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                </div>
                
                <div className="flex-grow text-center sm:text-left">
                  <h3 className="text-2xl mb-1 font-serif group-hover:text-brand-primary transition-colors">{item.name}</h3>
                  <div className="flex flex-wrap gap-3 mb-4 justify-center sm:justify-start">
                    <p className="text-brand-primary font-bold bg-brand-primary/5 px-3 py-1 rounded-full text-xs uppercase tracking-widest">Size: {item.size}</p>
                    {item.variantName && (
                      <p className="text-brand-teal font-bold bg-brand-teal/5 px-3 py-1 rounded-full text-xs uppercase tracking-widest">{item.variantName}</p>
                    )}
                  </div>

                  <div className="flex items-center justify-center sm:justify-start gap-4">
                    <button 
                      onClick={() => item.quantity > 1 && addToCart({ ...item, quantity: -1 })}
                      className="w-10 h-10 rounded-xl border-2 border-brand-primary/10 flex items-center justify-center hover:bg-brand-primary hover:text-white transition-all duration-300"
                    >
                      <Minus size={16} />
                    </button>
                    <span className="font-bold text-xl w-10 text-center">{item.quantity}</span>
                    <button 
                      onClick={() => {
                        if (item.quantity < item.maxStock) {
                          addToCart({ ...item, quantity: 1 });
                        }
                      }}
                      disabled={item.quantity >= item.maxStock}
                      className={`w-10 h-10 rounded-xl border-2 border-brand-primary/10 flex items-center justify-center transition-all duration-300 ${
                        item.quantity >= item.maxStock 
                          ? 'opacity-20 cursor-not-allowed' 
                          : 'hover:bg-brand-primary hover:text-white'
                      }`}
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
                
                  <div className="flex flex-col items-center sm:items-end gap-4">
                    <p className="text-2xl font-serif">₹ {(item.price * item.quantity).toLocaleString()}</p>
                    <button 
                      onClick={() => setItemToRemove({ productId: item.productId, size: item.size, variantName: item.variantName || undefined })}
                      className="p-3 text-red-500 hover:bg-red-50 rounded-full transition-colors"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
              </motion.div>
            ))}
          </div>
          
          <div className="lg:col-span-1">
            <div className="bg-white p-10 rounded-[40px] shadow-sm sticky top-32">
              <h2 className="text-3xl mb-8">Order Summary</h2>
              <div className="space-y-6 mb-12">
                <div className="flex justify-between text-lg">
                  <span className="opacity-60">Subtotal</span>
                  <span>₹ {total.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-lg">
                  <span className="opacity-60">Shipping</span>
                  <span className="text-green-600 font-medium">FREE</span>
                </div>
                <div className="pt-6 border-t border-brand-primary/10 flex justify-between text-2xl font-serif">
                  <span>Total</span>
                  <span>₹ {total.toLocaleString()}</span>
                </div>
              </div>
              
              <button 
                onClick={() => navigate(user ? '/checkout' : '/login')}
                className="btn-primary w-full py-5 text-lg flex items-center justify-center gap-3"
              >
                {user ? (
                  <>
                    PROCEED TO CHECKOUT <ArrowRight size={20} />
                  </>
                ) : (
                  <>
                    <LogIn size={20} /> LOGIN TO CHECKOUT
                  </>
                )}
              </button>
              
              <p className="mt-8 text-center text-sm text-gray-500">
                No Cash on Delivery. Online payments only.
              </p>
            </div>
          </div>
        </div>
      </div>

      <ConfirmationModal
        isOpen={!!itemToRemove}
        onClose={() => setItemToRemove(null)}
        onConfirm={() => {
          if (itemToRemove) {
            removeFromCart(itemToRemove.productId, itemToRemove.size, itemToRemove.variantName);
            setItemToRemove(null);
          }
        }}
        title="Remove Item?"
        message="Are you sure you want to remove this item from your cart?"
        confirmText="Remove"
        cancelText="Keep Item"
      />
    </div>
  );
}
