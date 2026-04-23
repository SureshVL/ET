import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Star, ShoppingBag, Heart, Eye } from 'lucide-react';
import { useCurrency } from '../context/CurrencyContext';
import { useCart } from '../context/CartContext';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import QuickViewModal from './QuickViewModal';

export default function ProductCard(props: any) {
  const { product } = props;
  const { formatPrice } = useCurrency();
  const { addToCart } = useCart();
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);
  const [selectedSize, setSelectedSize] = useState<number | null>(null);
  const [isWishlisted, setIsWishlisted] = useState(false);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!selectedSize) {
      toast.error('Please select a size first');
      return;
    }

    const stockForSize = product.stock?.[selectedSize] || 0;
    if (stockForSize <= 0) {
      toast.error('This size is currently out of stock');
      return;
    }

    addToCart({
      productId: product.id,
      name: product.name,
      price: product.price,
      size: selectedSize,
      quantity: 1,
      image: product.imageUrls?.[0] || "/images/haridwar-2.jpg",
      maxStock: stockForSize
    });
    toast.success('Added to cart');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="group bg-white rounded-2xl overflow-hidden border border-gray-100 hover:shadow-xl transition-all duration-500"
    >
      <div className="flex flex-col sm:flex-row">
        {/* Image Section */}
        <Link to={`/product/${product.id}`} className="relative w-full sm:w-64 aspect-[3/4] overflow-hidden bg-gray-100 flex-shrink-0">
          <img 
            src={product.imageUrls?.[0] || "/images/haridwar-2.jpg"} 
            alt={product.name} 
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            referrerPolicy="no-referrer"
            onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/images/haridwar-2.jpg'; }}
          />
          
          {/* Bestseller Badge */}
          <div className="absolute top-4 left-0 bg-gradient-to-r from-brand-primary to-brand-rani text-white px-4 py-1.5 text-[10px] font-black tracking-[0.2em] uppercase shadow-lg">
            Bestseller
          </div>

          {/* Quick View Overlay */}
          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <button 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsQuickViewOpen(true);
              }}
              className="bg-white text-black p-3 rounded-full shadow-lg hover:scale-110 transition-transform"
            >
              <Eye size={20} />
            </button>
          </div>
        </Link>

        {/* Details Section */}
        <div className="flex-1 p-6 sm:p-8 flex flex-col relative">
          {/* Wishlist Button */}
          <button 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsWishlisted(!isWishlisted);
              toast.success(isWishlisted ? 'Removed from wishlist' : 'Added to wishlist');
            }}
            className={cn(
              "absolute top-6 right-6 p-2 rounded-full transition-colors",
              isWishlisted ? "text-red-500 bg-red-50" : "text-gray-400 hover:text-red-500 hover:bg-red-50"
            )}
          >
            <Heart size={20} fill={isWishlisted ? "currentColor" : "none"} />
          </button>

          {/* Category & Colors */}
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] font-bold tracking-[0.2em] text-gray-400 uppercase">
              {product.category || 'Collection'}
            </span>
            {product.variants && product.variants.length > 0 && (
              <div className="flex gap-1.5">
                <div 
                  className="w-3 h-3 rounded-full border border-gray-200 shadow-sm"
                  style={{ backgroundColor: product.color || '#FFFFFF' }}
                />
                {product.variants.slice(0, 3).map((v: any, idx: number) => (
                  v.color && (
                    <div 
                      key={idx}
                      className="w-3 h-3 rounded-full border border-gray-200 shadow-sm"
                      style={{ backgroundColor: v.color }}
                    />
                  )
                ))}
                {product.variants.length > 3 && (
                  <span className="text-[8px] font-bold text-gray-400">+{product.variants.length - 3}</span>
                )}
              </div>
            )}
          </div>

          {/* Title */}
          <Link to={`/product/${product.id}`}>
            <h3 className="text-xl sm:text-2xl font-serif font-bold mb-3 hover:text-brand-primary transition-colors leading-tight">
              {product.name}
            </h3>
          </Link>

          {/* Description Snippet */}
          <p className="text-sm text-gray-500 mb-4 line-clamp-2 max-w-xl">
            {product.description || 'Handcrafted premium ethnic wear with traditional craftsmanship and modern elegance.'}
          </p>

          {/* Rating */}
          <div className="flex items-center gap-1 mb-6">
            <div className="flex gap-0.5">
              {[...Array(5)].map((_, i) => (
                <Star 
                  key={i} 
                  size={14} 
                  className={cn(
                    i < Math.floor(product.rating || 4.5) 
                      ? "fill-yellow-400 text-yellow-400" 
                      : "text-gray-200"
                  )} 
                />
              ))}
            </div>
            <span className="text-xs text-gray-400 ml-2">({product.reviewCount || 0})</span>
          </div>

          {/* Price & Actions Row */}
          <div className="mt-auto flex flex-col lg:flex-row lg:items-center justify-between gap-6 pt-6 border-t border-brand-primary/5">
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-serif font-bold text-brand-primary">{formatPrice(product.price)}</span>
              {product.oldPrice && (
                <span className="text-gray-400 line-through text-sm">{formatPrice(product.oldPrice)}</span>
              )}
              {!product.oldPrice && (
                <span className="text-gray-400 line-through text-sm">{formatPrice(product.price * 1.4)}</span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-4">
              {/* Size Selection */}
              <div className="flex gap-2">
                {(product.sizes || [38, 40, 42, 44]).map((size: number) => (
                  <button
                    key={size}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setSelectedSize(size);
                    }}
                    className={cn(
                      "w-10 h-10 border-2 rounded-xl flex items-center justify-center text-xs font-bold transition-all duration-300",
                      selectedSize === size 
                        ? "border-brand-primary bg-brand-primary text-white shadow-lg shadow-brand-primary/20" 
                        : "border-brand-primary/10 hover:border-brand-primary/40 text-gray-600"
                    )}
                  >
                    {size}
                  </button>
                ))}
              </div>

              {/* Add to Cart Button */}
              <button 
                onClick={handleAddToCart}
                className="btn-primary"
              >
                <ShoppingBag size={18} />
                Add to Cart
              </button>
            </div>
          </div>
        </div>
      </div>

      <QuickViewModal 
        product={product}
        isOpen={isQuickViewOpen}
        onClose={() => setIsQuickViewOpen(false)}
      />
    </motion.div>
  );
}
