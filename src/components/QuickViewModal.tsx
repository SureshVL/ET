import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ShoppingBag, Heart, Star, ChevronRight, ChevronLeft } from 'lucide-react';
import { useCurrency } from '../context/CurrencyContext';
import { useCart } from '../context/CartContext';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';

interface QuickViewModalProps {
  product: any;
  isOpen: boolean;
  onClose: () => void;
}

export default function QuickViewModal({ product, isOpen, onClose }: QuickViewModalProps) {
  const { formatPrice } = useCurrency();
  const { addToCart } = useCart();
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState<number | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<any | null>(null);

  if (!product) return null;

  const currentImages = (selectedVariant?.imageUrls?.length > 0) 
    ? selectedVariant.imageUrls 
    : (product?.imageUrls?.length > 0 ? product.imageUrls : ["/images/haridwar-2.jpg"]);

  const isFlashSaleActive = product.flashSale && product.flashSale.endTime && new Date(product.flashSale.endTime.toDate()) > new Date();
  const discountedPrice = isFlashSaleActive 
    ? product.price * (1 - product.flashSale.discount / 100)
    : product.price;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!selectedSize) {
      toast.error('Please select a size');
      return;
    }

    addToCart({
      productId: product.id,
      name: product.name,
      price: discountedPrice,
      size: selectedSize,
      quantity: 1,
      image: currentImages[0],
      maxStock: selectedVariant ? (selectedVariant.stock?.[selectedSize] || 0) : (product.stock?.[selectedSize] || 0),
      variantName: selectedVariant?.name
    });
    toast.success('Added to cart');
    onClose();
  };

  const nextImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedImageIndex((prev) => (prev + 1) % (product.imageUrls?.length || 1));
  };

  const prevImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedImageIndex((prev) => (prev - 1 + (product.imageUrls?.length || 1)) % (product.imageUrls?.length || 1));
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 md:p-8">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-5xl bg-white rounded-[48px] shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh]"
          >
            <button 
              onClick={onClose}
              className="absolute top-6 right-6 z-10 p-2 bg-white/80 backdrop-blur-sm hover:bg-white rounded-full transition-colors shadow-lg"
            >
              <X size={20} />
            </button>

            {/* Image Section */}
            <div className="w-full md:w-1/2 relative bg-brand-secondary aspect-[4/5] md:aspect-auto">
              <img 
                src={currentImages[selectedImageIndex]} 
                alt={product.name} 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
                onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/images/haridwar-2.jpg'; }}
              />
              {currentImages.length > 1 && (
                <>
                  <button 
                    onClick={prevImage}
                    className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/80 rounded-full hover:bg-white transition-all shadow-lg"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button 
                    onClick={nextImage}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/80 rounded-full hover:bg-white transition-all shadow-lg"
                  >
                    <ChevronRight size={20} />
                  </button>
                </>
              )}
            </div>

            {/* Content Section */}
            <div className="w-full md:w-1/2 p-8 md:p-12 overflow-y-auto">
              <div className="space-y-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex text-yellow-400">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star 
                          key={s} 
                          size={14} 
                          fill={s <= Math.floor(product.rating || 4.5) ? "currentColor" : "none"} 
                          className={s <= Math.floor(product.rating || 4.5) ? "" : "text-gray-200"}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-gray-400">({product.rating || 4.5}/5)</span>
                  </div>
                  <h2 className="text-3xl md:text-4xl font-serif mb-2">{product.name}</h2>
                  <div className="flex items-center gap-4">
                    <p className="text-2xl text-brand-primary font-display font-bold">{formatPrice(discountedPrice)}</p>
                    {isFlashSaleActive && (
                      <p className="text-lg text-gray-400 line-through">{formatPrice(product.price)}</p>
                    )}
                    {isFlashSaleActive && (
                      <span className="bg-yellow-400 text-black text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1">
                        {product.flashSale.discount}% OFF
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-gray-600 text-sm leading-relaxed line-clamp-3">
                  {product.description || "A beautifully crafted ethnic piece from Haridwar, combining tradition with modern elegance."}
                </p>

                {product.variants && product.variants.length > 0 && (
                  <div className="space-y-3">
                    <span className="text-[10px] font-bold tracking-widest uppercase opacity-60">Select Color</span>
                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={() => {
                          setSelectedVariant(null);
                          setSelectedImageIndex(0);
                        }}
                        className={cn(
                          "w-10 h-10 rounded-full border-2 transition-all p-0.5",
                          selectedVariant === null ? "border-brand-primary scale-110" : "border-transparent hover:scale-105"
                        )}
                      >
                        <div className="w-full h-full rounded-full border border-gray-100" style={{ backgroundColor: product.color || '#FFFFFF' }} />
                      </button>
                      {product.variants.map((v: any, idx: number) => (
                        <button
                          key={idx}
                          onClick={() => {
                            setSelectedVariant(v);
                            setSelectedImageIndex(0);
                          }}
                          className={cn(
                            "w-10 h-10 rounded-full border-2 transition-all p-0.5",
                            selectedVariant?.name === v.name ? "border-brand-primary scale-110" : "border-transparent hover:scale-105"
                          )}
                        >
                          <div className="w-full h-full rounded-full border border-gray-100" style={{ backgroundColor: v.color || '#000' }} />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold tracking-widest uppercase opacity-60">Select Size</span>
                    <Link to="/size-guide" className="text-[10px] font-bold text-brand-primary underline underline-offset-4">SIZE GUIDE</Link>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {product.sizes?.map((size: number) => (
                      <button
                        key={size}
                        onClick={() => setSelectedSize(size)}
                        className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center font-bold transition-all ${
                          selectedSize === size 
                            ? 'border-brand-primary bg-brand-primary text-white shadow-lg shadow-brand-primary/20' 
                            : 'border-brand-primary/10 hover:border-brand-primary/30 text-brand-primary'
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    onClick={handleAddToCart}
                    className="flex-1 btn-primary py-4 flex items-center justify-center gap-3"
                  >
                    <ShoppingBag size={20} /> ADD TO CART
                  </button>
                  <button className="w-14 h-14 rounded-full border-2 border-brand-primary/10 flex items-center justify-center text-brand-primary hover:border-brand-primary transition-all">
                    <Heart size={20} />
                  </button>
                </div>

                <Link 
                  to={`/product/${product.id}`}
                  className="block text-center text-xs font-bold tracking-widest text-gray-400 hover:text-brand-primary transition-colors py-2"
                  onClick={onClose}
                >
                  VIEW FULL DETAILS
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
