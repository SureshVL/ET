import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, limit, getDocs, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, auth, storage, handleFirestoreError, OperationType } from '../firebase';
import { useCart } from '../context/CartContext';
import { useCurrency } from '../context/CurrencyContext';
import { useProducts } from '../context/ProductContext';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { ShoppingBag, ShieldCheck, Truck, X, ZoomIn, Star, Send, Plus, Minus, Heart, Loader2, Ruler, Gift, CheckCircle2, MessageCircle, Share2, Sparkles, Camera, Info, ChevronDown, Zap, Facebook, Twitter, Mail, Copy } from 'lucide-react';
import SEO from '../components/SEO';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';

export default function ProductDetail() {
  const { id } = useParams();
  const { products, loading: productsLoading } = useProducts();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [selectedSize, setSelectedSize] = useState<number | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [activeTab, setActiveTab] = useState<'description' | 'reviews' | 'sizeguide'>('description');
  
  // AI & New Features State
  const [isSizeFinderOpen, setIsSizeFinderOpen] = useState(false);
  const [sizeFinderData, setSizeFinderOpenData] = useState({ height: '', weight: '', fit: 'Regular' });
  const [recommendedSize, setRecommendedSize] = useState<number | null>(null);
  
  const [isStoryOpen, setIsStoryOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [heritageStory, setHeritageStory] = useState('');
  const [isGeneratingStory, setIsGeneratingStory] = useState(false);
  
  const [reviewImage, setReviewImage] = useState<string | null>(null);
  const [reviewFile, setReviewFile] = useState<File | null>(null);
  
  const { addToCart } = useCart();
  const { formatPrice } = useCurrency();
  const navigate = useNavigate();

  const DEFAULT_REVIEWS = [
    {
      id: 'default-1',
      userName: 'Rajesh Kumar',
      rating: 5,
      comment: 'The stitching is absolutely perfect. You can really feel the quality of the Haridwar craftsmanship. Highly recommended!',
      createdAt: { toDate: () => new Date('2024-03-15') }
    },
    {
      id: 'default-2',
      userName: 'Priya Sharma',
      rating: 4,
      comment: 'Beautiful fabric and very comfortable. The design is unique and looks even better in person.',
      createdAt: { toDate: () => new Date('2024-03-10') }
    },
    {
      id: 'default-3',
      userName: 'Amit Mehra',
      rating: 5,
      comment: "I've bought several kurtas from Devaragudi, and they never disappoint. The fit is true to size.",
      createdAt: { toDate: () => new Date('2024-03-05') }
    },
    {
      id: 'default-4',
      userName: 'Sunita Rao',
      rating: 5,
      comment: 'Excellent quality and fast delivery. Proud to wear something designed in Devbhumi Uttarakhand.',
      createdAt: { toDate: () => new Date('2024-02-28') }
    }
  ];

  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) return;
      
      // Try to find in context first
      const cachedProduct = products.find(p => p.id === id);
      if (cachedProduct) {
        setProduct(cachedProduct);
        setLoading(false);
        // Increment views
        try {
          await updateDoc(doc(db, 'products', id), {
            views: (cachedProduct.views || 0) + 1
          });
        } catch (e) {
          console.error("Failed to increment views:", e);
        }
        return;
      }

      // If not in context and context is not loading, fetch it
      if (!productsLoading) {
        try {
          const docRef = doc(db, 'products', id);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            setProduct({ id: docSnap.id, ...data });
            // Increment views
            try {
              await updateDoc(docRef, {
                views: (data.views || 0) + 1
              });
            } catch (e) {
              console.error("Failed to increment views:", e);
            }
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `products/${id}`);
        } finally {
          setLoading(false);
        }
      }
    };
    fetchProduct();
  }, [id, products, productsLoading]);

  useEffect(() => {
    if (!id || !auth.currentUser) return;
    const q = query(
      collection(db, 'wishlist'),
      where('userId', '==', auth.currentUser.uid)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const isInWishlist = snapshot.docs.some(doc => doc.data().productId === id);
      setIsInWishlist(isInWishlist);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'wishlist');
    });
    return () => unsubscribe();
  }, [id, auth.currentUser]);

  useEffect(() => {
    if (!id) return;
    const q = query(
      collection(db, 'reviews'),
      where('productId', '==', id)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const reviewsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort on client side to avoid index requirement
      reviewsData.sort((a: any, b: any) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
        return dateB - dateA;
      });
      setReviews(reviewsData);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'reviews');
    });
    return () => unsubscribe();
  }, [id]);

  const relatedProducts = useMemo(() => {
    if (!product || !product.category) return [];
    return products
      .filter(p => p.category === product.category && p.id !== id)
      .slice(0, 4);
  }, [product, products, id]);

  const handleAddToCart = () => {
    if (!selectedSize) {
      toast.error('Please select a size');
      return false;
    }

    const currentStock = selectedVariant 
      ? (selectedVariant.stock?.[selectedSize || 40] || 0)
      : (product.stock?.[selectedSize || 40] || 0);

    if (quantity > currentStock) {
      toast.error(`Only ${currentStock} units available in this size/variant`);
      return false;
    }

    const isFlashSaleActive = product.flashSale && product.flashSale.endTime && new Date(product.flashSale.endTime.toDate()) > new Date();
    const basePrice = isFlashSaleActive 
      ? product.price * (1 - product.flashSale.discount / 100)
      : product.price;

    addToCart({
      productId: product.id,
      name: `${product.name}${selectedVariant ? ` - ${selectedVariant.name}` : ''}`,
      price: basePrice,
      size: selectedSize || 0,
      quantity: quantity,
      image: (selectedVariant?.imageUrls?.[0]) || product?.imageUrls?.[0] || "/images/haridwar-2.jpg",
      variantName: selectedVariant?.name || null,
      maxStock: currentStock
    });
    toast.success('Added to cart');
    return true;
  };

  const handleAddToWishlist = async () => {
    if (!auth.currentUser) {
      toast.error('Please login to add items to your wishlist');
      navigate('/login');
      return;
    }

    if (isInWishlist) {
      toast.info('Item is already in your wishlist');
      return;
    }

    try {
      await addDoc(collection(db, 'wishlist'), {
        userId: auth.currentUser.uid,
        productId: id,
        createdAt: serverTimestamp(),
      });
      toast.success('Added to wishlist');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'wishlist');
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) {
      toast.error('Please login to leave a review');
      return;
    }
    if (!newComment.trim()) {
      toast.error('Please enter a comment');
      return;
    }

    setIsSubmitting(true);
    try {
      let finalImageUrl = null;
      
      if (reviewFile) {
        const storageRef = ref(storage, `reviews/${id}/${auth.currentUser.uid}_${Date.now()}`);
        const uploadResult = await uploadBytes(storageRef, reviewFile);
        finalImageUrl = await getDownloadURL(uploadResult.ref);
      }

      await addDoc(collection(db, 'reviews'), {
        productId: id,
        userId: auth.currentUser.uid,
        userName: auth.currentUser.displayName || 'Anonymous',
        rating: newRating,
        comment: newComment,
        imageUrl: finalImageUrl,
        createdAt: serverTimestamp(),
      });
      setNewComment('');
      setNewRating(5);
      setReviewImage(null);
      setReviewFile(null);
      toast.success('Review submitted successfully');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'reviews');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWhatsAppBuy = () => {
    const message = `Namaste! I'm interested in buying the ${product.name} from Devaragudi Ethnic Threads. 
Price: ₹${product.price}
Product Link: ${window.location.href}`;
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/919121485927?text=${encodedMessage}`, '_blank');
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: product.name,
          text: `Check out this premium ethnic wear from Devaragudi: ${product.name}`,
          url: window.location.href,
        });
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          setIsShareModalOpen(true);
        }
      }
    } else {
      setIsShareModalOpen(true);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Link copied to clipboard!');
  };

  const shareOnSocial = (platform: string) => {
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(`Check out this premium ethnic wear from Devaragudi: ${product.name}`);
    
    let shareUrl = '';
    switch (platform) {
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
        break;
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?url=${url}&text=${text}`;
        break;
      case 'whatsapp':
        shareUrl = `https://wa.me/?text=${text}%20${url}`;
        break;
      case 'email':
        shareUrl = `mailto:?subject=${encodeURIComponent(product.name)}&body=${text}%20${url}`;
        break;
    }
    
    if (shareUrl) {
      window.open(shareUrl, '_blank');
    }
  };

  const generateHeritageStory = async () => {
    if (heritageStory) {
      setIsStoryOpen(true);
      return;
    }

    setIsGeneratingStory(true);
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${import.meta.env.VITE_GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `Write a poetic, heritage-focused story for a premium Indian ethnic wear product called "${product.name}". Description: ${product.description}. Focus on the craftsmanship of Haridwar, the spiritual essence of Devbhumi Uttarakhand, and the traditional stitching techniques. Keep it under 150 words and make it feel premium and authentic.` }] }],
            generationConfig: { temperature: 0.8, maxOutputTokens: 256 }
          })
        }
      );
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
      setHeritageStory(text);
      setIsStoryOpen(true);
    } catch (error) {
      console.error('Error generating story:', error);
      toast.error('Failed to discover the heritage story. Please try again.');
    } finally {
      setIsGeneratingStory(false);
    }
  };

  const findMySize = () => {
    const { height, weight, fit } = sizeFinderData;
    if (!height || !weight) {
      toast.error('Please enter your height and weight');
      return;
    }

    // Simple logic for size recommendation
    // In a real app, this would be a more complex algorithm or AI-based
    const h = parseInt(height);
    const w = parseInt(weight);
    
    let baseSize = 40;
    if (h > 180 || w > 80) baseSize = 44;
    else if (h > 170 || w > 70) baseSize = 42;
    else if (h < 160 || w < 60) baseSize = 38;

    if (fit === 'Slim') baseSize += 2;
    if (fit === 'Loose') baseSize -= 2;

    // Clamp to available sizes
    const availableSizes = product.sizes || [38, 40, 42, 44];
    const recommended = availableSizes.reduce((prev: number, curr: number) => 
      Math.abs(curr - baseSize) < Math.abs(prev - baseSize) ? curr : prev
    );

    setRecommendedSize(recommended);
  };

  const handleReviewImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size should be less than 5MB');
        return;
      }
      setReviewFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setReviewImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-brand-secondary/30">
        <Loader2 className="animate-spin text-brand-primary mb-4" size={48} />
        <p className="text-sm uppercase tracking-[0.3em] font-serif opacity-60">Preparing your collection...</p>
      </div>
    );
  }
  if (!product) return <div className="min-h-screen flex items-center justify-center">Product not found</div>;

  const currentImages = (selectedVariant?.imageUrls?.length > 0) 
    ? selectedVariant.imageUrls 
    : (product?.imageUrls?.length > 0 ? product.imageUrls : ["/images/haridwar-2.jpg"]);

  const currentImage = currentImages[selectedImageIndex] || currentImages[0];

  return (
    <div className="py-24 px-4">
      <SEO 
        title={product.name} 
        description={product.description || `Buy ${product.name} at Devaragudi. Premium ethnic kurta handcrafted in Haridwar with authentic Indian craftsmanship.`}
        image={currentImage}
      />
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
          {/* Image Gallery */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div 
              className="group relative aspect-[3/4] rounded-[40px] overflow-hidden bg-brand-secondary cursor-zoom-in shadow-xl"
              onClick={() => setIsModalOpen(true)}
            >
              <AnimatePresence mode="wait">
                <motion.img 
                  key={currentImage}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  src={currentImage} 
                  alt={product.name} 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  referrerPolicy="no-referrer"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/images/haridwar-2.jpg'; }}
                />
              </AnimatePresence>
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                <div className="bg-white/80 p-3 rounded-full backdrop-blur-sm">
                  <ZoomIn className="text-brand-primary" size={24} />
                </div>
              </div>
            </div>

            {currentImages.length > 1 && (
              <div className="flex flex-wrap gap-4">
                {currentImages.map((url: string, idx: number) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImageIndex(idx)}
                    className={`relative w-20 h-24 rounded-2xl overflow-hidden border-2 transition-all ${
                      selectedImageIndex === idx 
                        ? 'border-brand-primary shadow-md scale-105' 
                        : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={url} alt={`Thumbnail ${idx}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/images/haridwar-2.jpg'; }} />
                  </button>
                ))}
              </div>
            )}
          </motion.div>

          {/* Product Info */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-col"
          >
            <span className="text-sm uppercase tracking-widest text-brand-primary mb-4">Stitched in Devbhumi Uttarakhand</span>
            <h1 className="text-5xl mb-6">{product.name}</h1>
            <div className="flex items-center gap-4 mb-8">
              <p className="text-3xl font-serif text-brand-primary">
                {product.flashSale && product.flashSale.endTime && new Date(product.flashSale.endTime.toDate()) > new Date() ? (
                  <span className="flex items-center gap-3">
                    <span>{formatPrice(product.price * (1 - product.flashSale.discount / 100))}</span>
                    <span className="text-xl line-through opacity-40 font-sans font-light">{formatPrice(product.price)}</span>
                  </span>
                ) : (
                  formatPrice(product.price)
                )}
              </p>
              {product.flashSale && product.flashSale.discount > 0 && new Date(product.flashSale.endTime.toDate()) > new Date() && (
                <motion.span 
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="bg-yellow-400 text-brand-primary px-3 py-1 rounded-full text-xs font-bold tracking-wider shadow-sm flex items-center gap-1"
                >
                  <Zap size={12} fill="currentColor" />
                  {product.flashSale.discount}% OFF
                </motion.span>
              )}
            </div>
            
            <div className="flex gap-4 mb-8">
              <button 
                onClick={generateHeritageStory}
                disabled={isGeneratingStory}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-brand-primary/10 to-brand-rani/10 text-brand-primary rounded-2xl text-xs font-bold hover:from-brand-primary/20 hover:to-brand-rani/20 transition-all shadow-sm"
              >
                {isGeneratingStory ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} className="text-brand-rani" />}
                DISCOVER THE HERITAGE STORY
              </button>
              <button 
                onClick={() => setIsSizeFinderOpen(true)}
                className="flex items-center gap-2 px-6 py-3 bg-brand-teal/5 text-brand-teal rounded-2xl text-xs font-bold hover:bg-brand-teal/10 transition-all shadow-sm"
              >
                <Ruler size={14} />
                FIND MY SIZE
              </button>
            </div>
            {product.variants && product.variants.length > 0 && (
              <div className="mb-10">
                <h3 className="text-sm uppercase tracking-widest mb-6 opacity-60 font-bold">Available Colors & Variants</h3>
                <div className="flex flex-wrap gap-6">
                  {/* Standard / Main Option */}
                  <button
                    onClick={() => {
                      setSelectedVariant(null);
                      setSelectedImageIndex(0);
                    }}
                    className={cn(
                      "group relative flex flex-col items-center gap-3 transition-all",
                      selectedVariant === null ? "scale-110" : "hover:scale-105"
                    )}
                  >
                    <div 
                      className={cn(
                        "w-14 h-14 rounded-full border-4 shadow-lg transition-all flex items-center justify-center overflow-hidden bg-white",
                        selectedVariant === null ? "border-brand-primary ring-4 ring-brand-primary/10" : "border-white group-hover:border-brand-primary/30"
                      )}
                    >
                      {product.color ? (
                        <div className="w-full h-full" style={{ backgroundColor: product.color }} />
                      ) : (
                        <span className="text-[10px] font-bold text-gray-400">STD</span>
                      )}
                    </div>
                    <span className={cn(
                      "text-[10px] font-bold uppercase tracking-[0.2em] transition-all",
                      selectedVariant === null ? "opacity-100 text-brand-primary" : "opacity-40"
                    )}>
                      {product.color || 'Standard'}
                    </span>
                  </button>

                  {product.variants.map((variant: any, idx: number) => {
                    const isSelected = selectedVariant?.name === variant.name;
                    return (
                      <button
                        key={idx}
                        onClick={() => {
                          setSelectedVariant(variant);
                          setSelectedImageIndex(0);
                        }}
                        className={cn(
                          "group relative flex flex-col items-center gap-3 transition-all",
                          isSelected ? "scale-110" : "hover:scale-105"
                        )}
                      >
                        <div 
                          className={cn(
                            "w-14 h-14 rounded-full border-4 shadow-lg transition-all flex items-center justify-center overflow-hidden bg-white",
                            isSelected ? "border-brand-primary ring-4 ring-brand-primary/10" : "border-white group-hover:border-brand-primary/30"
                          )}
                        >
                          {variant.color ? (
                            <div className="w-full h-full" style={{ backgroundColor: variant.color }} />
                          ) : (
                            <span className="text-[10px] font-bold text-gray-400">{variant.name.slice(0, 3).toUpperCase()}</span>
                          )}
                        </div>
                        <span className={cn(
                          "text-[10px] font-bold uppercase tracking-[0.2em] transition-all",
                          isSelected ? "opacity-100 text-brand-primary" : "opacity-40"
                        )}>
                          {variant.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-12 mb-8">
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm uppercase tracking-widest opacity-60">Select Size</h3>
                  <Link 
                    to="/size-guide" 
                    className="text-[10px] font-bold text-brand-primary underline underline-offset-4 hover:opacity-70 transition-opacity"
                  >
                    VIEW SIZE GUIDE
                  </Link>
                </div>
                <div className="flex flex-wrap gap-4">
                  {(product.sizes || [38, 40, 42, 44]).map((size: number) => {
                    const stock = selectedVariant 
                      ? (selectedVariant.stock?.[size] || 0)
                      : (product.stock?.[size] || 0);
                    const isOutOfStock = stock <= 0;
                    
                    return (
                      <button
                        key={size}
                        disabled={isOutOfStock}
                        onClick={() => setSelectedSize(size)}
                        className={`w-14 h-14 rounded-full border-2 flex items-center justify-center transition-all duration-300 relative ${
                          selectedSize === size 
                            ? 'bg-brand-primary border-brand-primary text-white shadow-xl shadow-brand-primary/20 scale-110' 
                            : isOutOfStock
                              ? 'border-gray-200 text-gray-300 cursor-not-allowed bg-gray-50'
                              : 'border-brand-primary/20 hover:border-brand-primary text-brand-primary'
                        }`}
                      >
                        {size}
                        {isOutOfStock && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-full h-[1px] bg-gray-300 rotate-45"></div>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <h3 className="text-sm uppercase tracking-widest mb-4 opacity-60">Quantity</h3>
                <div className="flex items-center gap-4 h-14 bg-brand-secondary rounded-full px-4 border border-brand-primary/10">
                  <button 
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-brand-primary/10 transition-colors text-brand-primary"
                  >
                    <Minus size={18} />
                  </button>
                  <span className="w-8 text-center font-bold text-lg">{quantity}</span>
                  <button 
                    onClick={() => {
                      if (!selectedSize) {
                        toast.error('Please select a size first');
                        return;
                      }
                      const stock = selectedVariant ? (selectedVariant.stock?.[selectedSize!] || 0) : (product.stock?.[selectedSize!] || 0);
                      if (quantity < stock) {
                        setQuantity(quantity + 1);
                      } else {
                        toast.error(`Only ${stock} units available`);
                      }
                    }}
                    disabled={!selectedSize || quantity >= (selectedVariant ? (selectedVariant.stock?.[selectedSize!] || 0) : (product.stock?.[selectedSize!] || 0))}
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors text-brand-primary ${
                      !selectedSize || quantity >= (selectedVariant ? (selectedVariant.stock?.[selectedSize!] || 0) : (product.stock?.[selectedSize!] || 0))
                        ? 'opacity-20 cursor-not-allowed' 
                        : 'hover:bg-brand-primary/10'
                    }`}
                  >
                    <Plus size={18} />
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-6 mb-12">
              <div className="flex gap-4">
                <button 
                  onClick={handleAddToCart}
                  disabled={!selectedSize || (selectedVariant ? (selectedVariant.stock?.[selectedSize!] || 0) : (product.stock?.[selectedSize!] || 0)) <= 0}
                  className="btn-primary flex-grow flex items-center justify-center gap-3 py-5 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ShoppingBag size={20} /> 
                  {!selectedSize
                    ? 'SELECT A SIZE' 
                    : (selectedVariant ? (selectedVariant.stock?.[selectedSize!] || 0) : (product.stock?.[selectedSize!] || 0)) <= 0
                      ? 'OUT OF STOCK'
                      : 'ADD TO CART'}
                </button>
                <button 
                  onClick={handleAddToWishlist}
                  className={`w-16 h-16 rounded-full border-2 flex items-center justify-center transition-all ${
                    isInWishlist 
                      ? 'bg-red-50 border-red-200 text-red-500' 
                      : 'border-brand-primary/20 hover:border-brand-primary text-brand-primary'
                  }`}
                  title={isInWishlist ? "In Wishlist" : "Add to Wishlist"}
                >
                  <Heart size={24} fill={isInWishlist ? "currentColor" : "none"} />
                </button>
              </div>
              <div className="flex gap-4">
                <button 
                  onClick={() => {
                    if (handleAddToCart()) {
                      navigate('/cart');
                    }
                  }}
                  disabled={selectedSize && (selectedVariant ? (selectedVariant.stock?.[selectedSize] || 0) : (product.stock?.[selectedSize] || 0)) <= 0}
                  className="btn-secondary flex-grow py-5 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {selectedSize && (selectedVariant ? (selectedVariant.stock?.[selectedSize] || 0) : (product.stock?.[selectedSize] || 0)) <= 0 
                    ? 'OUT OF STOCK' 
                    : 'BUY IT NOW'}
                </button>
                <button 
                  onClick={handleShare}
                  className="w-16 h-16 rounded-full border-2 border-brand-primary/20 hover:border-brand-primary text-brand-primary flex items-center justify-center transition-all"
                  title="Share Product"
                >
                  <Share2 size={24} />
                </button>
              </div>
              
              <button 
                onClick={handleWhatsAppBuy}
                className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white py-5 rounded-full flex items-center justify-center gap-3 font-bold text-lg transition-all shadow-lg hover:shadow-xl"
              >
                <MessageCircle size={24} /> BUY ON WHATSAPP
              </button>
            </div>

            <div className="border-t border-brand-primary/10 pt-12 space-y-8">
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 flex items-center justify-center text-brand-primary shadow-inner">
                  <Truck size={24} />
                </div>
                <div>
                  <h4 className="font-bold mb-1">Fast Shipping</h4>
                  <p className="text-sm text-gray-500">Dispatched directly from Haridwar within 2-3 days.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-2xl bg-brand-teal/10 flex items-center justify-center text-brand-teal shadow-inner">
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <h4 className="font-bold mb-1">Authentic Craftsmanship</h4>
                  <p className="text-sm text-gray-500">Every piece is verified for quality and stitching perfection.</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Tabs Section */}
        <div className="mt-24 border-t border-brand-primary/10 pt-16">
          <div className="flex justify-center gap-8 md:gap-16 mb-16 border-b border-brand-primary/5">
            {[
              { id: 'description', label: 'Description', icon: <Info size={18} /> },
              { id: 'reviews', label: 'Reviews', icon: <Star size={18} /> },
              { id: 'sizeguide', label: 'Size Guide', icon: <Ruler size={18} /> }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`relative pb-6 text-sm font-bold tracking-[0.2em] uppercase flex items-center gap-2 transition-all ${
                  activeTab === tab.id ? 'text-brand-primary' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {tab.icon}
                {tab.label}
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-1 bg-brand-primary rounded-full"
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )}
              </button>
            ))}
          </div>

          <div className="max-w-4xl mx-auto">
            <AnimatePresence mode="wait">
              {activeTab === 'description' && (
                <motion.div
                  key="description"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="prose prose-brand max-w-none"
                >
                  <p className="text-lg text-gray-600 leading-relaxed">
                    {product.description || "A beautifully crafted kurta that combines traditional Haridwar stitching techniques with modern design. Made from premium fabrics for ultimate comfort and style."}
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
                    <div className="bg-brand-secondary/50 p-8 rounded-[32px]">
                      <h4 className="font-serif text-xl mb-4">Fabric & Care</h4>
                      <ul className="space-y-2 text-sm text-gray-600">
                        <li>• Premium Cotton-Linen Blend</li>
                        <li>• Hand-stitched detailing</li>
                        <li>• Gentle hand wash recommended</li>
                        <li>• Iron on low heat</li>
                      </ul>
                    </div>
                    <div className="bg-brand-secondary/50 p-8 rounded-[32px]">
                      <h4 className="font-serif text-xl mb-4">The Artisan's Touch</h4>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        Each piece is uniquely crafted by artisans in Haridwar. Minor variations in stitching are a mark of authentic hand-craftsmanship.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'reviews' && (
                <motion.div
                  key="reviews"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
                    {/* Review Summary & Form */}
                    <div className="lg:col-span-1">
                      <div className="flex items-center gap-4 mb-8">
                        <div className="flex text-yellow-400">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star 
                              key={star} 
                              size={24} 
                              fill={[...reviews, ...DEFAULT_REVIEWS].length > 0 && ([...reviews, ...DEFAULT_REVIEWS].reduce((acc, r) => acc + r.rating, 0) / [...reviews, ...DEFAULT_REVIEWS].length) >= star ? "currentColor" : "none"} 
                            />
                          ))}
                        </div>
                        <span className="text-xl font-serif">
                          {[...reviews, ...DEFAULT_REVIEWS].length > 0 
                            ? ([...reviews, ...DEFAULT_REVIEWS].reduce((acc, r) => acc + r.rating, 0) / [...reviews, ...DEFAULT_REVIEWS].length).toFixed(1) 
                            : "0.0"}
                        </span>
                        <span className="text-gray-500">({[...reviews, ...DEFAULT_REVIEWS].length} reviews)</span>
                      </div>

                      {auth.currentUser ? (
                        <form onSubmit={handleSubmitReview} className="bg-brand-secondary p-8 rounded-[32px] space-y-6">
                          <h3 className="text-xl mb-4">Write a Review</h3>
                          
                          <div>
                            <label className="block text-sm uppercase tracking-widest mb-2 opacity-60">Rating</label>
                            <div className="flex gap-2">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                  key={star}
                                  type="button"
                                  onClick={() => setNewRating(star)}
                                  className="text-yellow-400 transition-transform hover:scale-110"
                                >
                                  <Star size={28} fill={newRating >= star ? "currentColor" : "none"} />
                                </button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm uppercase tracking-widest mb-2 opacity-60">Your Experience</label>
                            <textarea
                              value={newComment}
                              onChange={(e) => setNewComment(e.target.value)}
                              placeholder="Tell us about the fit, fabric, and stitching..."
                              className="w-full bg-white border border-brand-primary/10 rounded-2xl p-4 min-h-[120px] focus:outline-none focus:border-brand-primary transition-colors resize-none"
                            />
                          </div>

                          <div>
                            <label className="block text-sm uppercase tracking-widest mb-2 opacity-60">Add a Photo (Optional)</label>
                            <div className="flex items-center gap-4">
                              <label className="flex items-center gap-2 px-4 py-2 bg-white border border-brand-primary/10 rounded-xl text-xs font-bold text-brand-primary cursor-pointer hover:bg-brand-primary/5 transition-all">
                                <Camera size={14} /> UPLOAD PHOTO
                                <input type="file" accept="image/*" className="hidden" onChange={handleReviewImageUpload} />
                              </label>
                              {reviewImage && (
                                <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-brand-primary/10">
                                  <img src={reviewImage} className="w-full h-full object-cover" />
                                  <button 
                                    type="button"
                                    onClick={() => setReviewImage(null)}
                                    className="absolute top-0 right-0 bg-red-500 text-white p-0.5 rounded-bl-lg"
                                  >
                                    <X size={10} />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>

                          <button
                            type="submit"
                            disabled={isSubmitting}
                            className="btn-primary w-full flex items-center justify-center gap-2 py-4 disabled:opacity-50"
                          >
                            {isSubmitting ? "SUBMITTING..." : (
                              <>
                                <Send size={18} /> SUBMIT REVIEW
                              </>
                            )}
                          </button>
                        </form>
                      ) : (
                        <div className="bg-brand-secondary p-8 rounded-[32px] text-center">
                          <p className="text-gray-600 mb-4">Please login to share your experience with this product.</p>
                          <button 
                            onClick={() => navigate('/login')}
                            className="text-brand-primary font-bold underline underline-offset-4"
                          >
                            Login to Review
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Reviews List */}
                    <div className="lg:col-span-2 space-y-12">
                      {[...reviews, ...DEFAULT_REVIEWS].map((review) => (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true }}
                          key={review.id}
                          className="border-b border-brand-primary/5 pb-12 last:border-0"
                        >
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <h4 className="font-bold text-lg">{review.userName}</h4>
                              <div className="flex text-yellow-400 mt-1">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star 
                                    key={star} 
                                    size={16} 
                                    fill={review.rating >= star ? "currentColor" : "none"} 
                                  />
                                ))}
                              </div>
                            </div>
                            <span className="text-sm text-gray-400">
                              {review.createdAt?.toDate ? review.createdAt.toDate().toLocaleDateString('en-IN', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              }) : 'Just now'}
                            </span>
                          </div>
                          <p className="text-gray-600 leading-relaxed italic">
                            "{review.comment}"
                          </p>
                          {review.imageUrl && (
                            <div className="mt-4 w-32 h-40 rounded-2xl overflow-hidden border border-brand-primary/5 shadow-sm">
                              <img src={review.imageUrl} className="w-full h-full object-cover" />
                            </div>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'sizeguide' && (
                <motion.div
                  key="sizeguide"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="bg-brand-secondary/50 rounded-[32px] p-8 overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-brand-primary/10">
                          <th className="pb-4 text-sm uppercase tracking-widest opacity-60">Size (IN)</th>
                          <th className="pb-4 text-sm uppercase tracking-widest opacity-60">Chest</th>
                          <th className="pb-4 text-sm uppercase tracking-widest opacity-60">Waist</th>
                          <th className="pb-4 text-sm uppercase tracking-widest opacity-60">Shoulder</th>
                          <th className="pb-4 text-sm uppercase tracking-widest opacity-60">Length</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-brand-primary/5">
                        {[
                          { size: 38, chest: 42, waist: 40, shoulder: 17.5, length: 42 },
                          { size: 40, chest: 44, waist: 42, shoulder: 18, length: 43 },
                          { size: 42, chest: 46, waist: 44, shoulder: 18.5, length: 44 },
                          { size: 44, chest: 48, waist: 46, shoulder: 19, length: 45 },
                          { size: 46, chest: 50, waist: 48, shoulder: 19.5, length: 46 }
                        ].map((row) => (
                          <tr key={row.size} className="hover:bg-brand-primary/5 transition-colors">
                            <td className="py-4 font-bold">{row.size}</td>
                            <td className="py-4 text-gray-600">{row.chest}"</td>
                            <td className="py-4 text-gray-600">{row.waist}"</td>
                            <td className="py-4 text-gray-600">{row.shoulder}"</td>
                            <td className="py-4 text-gray-600">{row.length}"</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <p className="mt-8 text-xs text-gray-500 italic">
                      * All measurements are in inches. For the best fit, we recommend choosing a size that is 4 inches larger than your body chest measurement.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Visual Reviews Gallery */}
        {reviews.filter(r => r.imageUrl).length > 0 && (
          <div className="mt-24 border-t border-brand-primary/10 pt-24">
            <div className="flex items-center justify-between mb-12">
              <div>
                <span className="text-sm uppercase tracking-widest text-brand-primary mb-2 block">Customer Gallery</span>
                <h2 className="text-4xl">Visual Reviews</h2>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Camera size={16} />
                <span>{reviews.filter(r => r.imageUrl).length} Photos shared by customers</span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {reviews.filter(r => r.imageUrl).map((review) => (
                <motion.div
                  key={review.id}
                  whileHover={{ scale: 1.05 }}
                  className="aspect-[3/4] rounded-2xl overflow-hidden bg-brand-secondary cursor-pointer relative group"
                  onClick={() => {
                    toast.info(`Review by ${review.userName}`);
                  }}
                >
                  <img 
                    src={review.imageUrl} 
                    alt={`Review by ${review.userName}`} 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                    <p className="text-white text-[10px] font-bold uppercase tracking-widest">{review.userName}</p>
                    <div className="flex text-yellow-400 mt-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star key={star} size={8} fill={review.rating >= star ? "currentColor" : "none"} />
                      ))}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Complete the Look Section */}
      {relatedProducts.length > 0 && (
        <div className="max-w-7xl mx-auto mt-32 px-4">
          <div className="flex items-center justify-between mb-12">
            <div>
              <span className="text-sm uppercase tracking-widest text-brand-primary mb-2 block">Pair it with</span>
              <h2 className="text-4xl">Complete the Look</h2>
            </div>
            <Link to="/products" className="text-brand-primary font-bold hover:underline underline-offset-4 flex items-center gap-2">
              View All <Plus size={16} />
            </Link>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {relatedProducts.map((p) => (
              <Link 
                key={p.id} 
                to={`/product/${p.id}`}
                className="group"
              >
                <div className="aspect-[3/4] rounded-[32px] overflow-hidden bg-brand-secondary mb-4 relative">
                  <img 
                    src={p.imageUrls?.[0] || "/images/haridwar-2.jpg"} 
                    alt={p.name} 
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-brand-primary">
                    {formatPrice(p.price)}
                  </div>
                </div>
                <h3 className="font-bold group-hover:text-brand-primary transition-colors">{p.name}</h3>
                <p className="text-xs text-gray-500 uppercase tracking-widest mt-1">{p.category}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Heritage Story Modal */}
      <AnimatePresence>
        {isStoryOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsStoryOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white w-full max-w-2xl rounded-[40px] overflow-hidden shadow-2xl"
            >
              <div className="relative aspect-video">
                <img src={currentImage} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-white via-white/20 to-transparent" />
                <button 
                  onClick={() => setIsStoryOpen(false)}
                  className="absolute top-6 right-6 p-2 bg-white/80 backdrop-blur-sm rounded-full text-brand-primary hover:bg-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-10 -mt-20 relative bg-white rounded-t-[40px]">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-brand-primary/10 rounded-xl flex items-center justify-center text-brand-primary">
                    <Sparkles size={20} />
                  </div>
                  <span className="text-xs font-bold tracking-[0.3em] uppercase opacity-40">Heritage Story</span>
                </div>
                <h2 className="text-4xl font-serif mb-6">{product.name}</h2>
                <div className="prose prose-brand max-w-none">
                  <p className="text-gray-600 leading-relaxed italic text-lg whitespace-pre-wrap">
                    {heritageStory}
                  </p>
                </div>
                <div className="mt-10 pt-8 border-t border-brand-primary/5 flex justify-between items-center">
                  <p className="text-[10px] font-bold tracking-widest uppercase opacity-40">Handcrafted in Haridwar</p>
                  <img src="/images/haridwar-2.jpg" className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm" />
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Size Finder Modal */}
      <AnimatePresence>
        {isSizeFinderOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSizeFinderOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white w-full max-w-md rounded-[40px] p-10 shadow-2xl"
            >
              <button 
                onClick={() => setIsSizeFinderOpen(false)}
                className="absolute top-6 right-6 p-2 hover:bg-brand-secondary rounded-full transition-colors"
              >
                <X size={20} />
              </button>
              
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 bg-brand-primary/10 rounded-xl flex items-center justify-center text-brand-primary">
                  <Ruler size={20} />
                </div>
                <h2 className="text-2xl font-serif">AI Size Finder</h2>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] uppercase tracking-widest opacity-40 mb-2">Height (cm)</label>
                  <input 
                    type="number"
                    value={sizeFinderData.height}
                    onChange={(e) => setSizeFinderOpenData({...sizeFinderData, height: e.target.value})}
                    placeholder="e.g. 175"
                    className="w-full bg-brand-secondary/30 border-transparent rounded-2xl p-4 focus:bg-white focus:border-brand-primary/20 focus:ring-4 focus:ring-brand-primary/5 transition-all outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-widest opacity-40 mb-2">Weight (kg)</label>
                  <input 
                    type="number"
                    value={sizeFinderData.weight}
                    onChange={(e) => setSizeFinderOpenData({...sizeFinderData, weight: e.target.value})}
                    placeholder="e.g. 70"
                    className="w-full bg-brand-secondary/30 border-transparent rounded-2xl p-4 focus:bg-white focus:border-brand-primary/20 focus:ring-4 focus:ring-brand-primary/5 transition-all outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-widest opacity-40 mb-2">Preferred Fit</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['Slim', 'Regular', 'Loose'].map((fit) => (
                      <button
                        key={fit}
                        onClick={() => setSizeFinderOpenData({...sizeFinderData, fit})}
                        className={`py-3 rounded-xl text-xs font-bold transition-all ${
                          sizeFinderData.fit === fit 
                            ? 'bg-brand-primary text-white shadow-md' 
                            : 'bg-brand-secondary/30 text-gray-500 hover:bg-brand-secondary'
                        }`}
                      >
                        {fit.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                <button 
                  onClick={findMySize}
                  className="w-full btn-primary py-4 rounded-2xl"
                >
                  FIND MY SIZE
                </button>

                {recommendedSize && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-6 bg-brand-primary/5 rounded-[32px] border border-brand-primary/10 text-center"
                  >
                    <p className="text-xs uppercase tracking-widest opacity-40 mb-2">Recommended Size</p>
                    <p className="text-5xl font-serif text-brand-primary mb-4">{recommendedSize}</p>
                    <button 
                      onClick={() => {
                        setSelectedSize(recommendedSize);
                        setIsSizeFinderOpen(false);
                        toast.success(`Size ${recommendedSize} selected`);
                      }}
                      className="text-xs font-bold text-brand-primary underline underline-offset-4"
                    >
                      SELECT THIS SIZE
                    </button>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Share Modal */}
      <AnimatePresence>
        {isShareModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsShareModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white w-full max-w-md rounded-[40px] p-10 shadow-2xl"
            >
              <button 
                onClick={() => setIsShareModalOpen(false)}
                className="absolute top-6 right-6 p-2 hover:bg-brand-secondary rounded-full transition-colors"
              >
                <X size={20} />
              </button>
              
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 bg-brand-primary/10 rounded-xl flex items-center justify-center text-brand-primary">
                  <Share2 size={20} />
                </div>
                <h2 className="text-2xl font-serif">Share Product</h2>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => shareOnSocial('whatsapp')}
                    className="flex flex-col items-center gap-3 p-6 rounded-3xl bg-brand-secondary/30 hover:bg-brand-secondary transition-all group"
                  >
                    <div className="w-12 h-12 rounded-full bg-[#25D366] text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                      <MessageCircle size={24} />
                    </div>
                    <span className="text-[10px] font-bold tracking-widest uppercase opacity-60">WhatsApp</span>
                  </button>
                  <button 
                    onClick={() => shareOnSocial('facebook')}
                    className="flex flex-col items-center gap-3 p-6 rounded-3xl bg-brand-secondary/30 hover:bg-brand-secondary transition-all group"
                  >
                    <div className="w-12 h-12 rounded-full bg-[#1877F2] text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                      <Facebook size={24} />
                    </div>
                    <span className="text-[10px] font-bold tracking-widest uppercase opacity-60">Facebook</span>
                  </button>
                  <button 
                    onClick={() => shareOnSocial('twitter')}
                    className="flex flex-col items-center gap-3 p-6 rounded-3xl bg-brand-secondary/30 hover:bg-brand-secondary transition-all group"
                  >
                    <div className="w-12 h-12 rounded-full bg-[#1DA1F2] text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                      <Twitter size={24} />
                    </div>
                    <span className="text-[10px] font-bold tracking-widest uppercase opacity-60">Twitter</span>
                  </button>
                  <button 
                    onClick={() => shareOnSocial('email')}
                    className="flex flex-col items-center gap-3 p-6 rounded-3xl bg-brand-secondary/30 hover:bg-brand-secondary transition-all group"
                  >
                    <div className="w-12 h-12 rounded-full bg-brand-primary text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                      <Mail size={24} />
                    </div>
                    <span className="text-[10px] font-bold tracking-widest uppercase opacity-60">Email</span>
                  </button>
                </div>

                <div className="pt-6 border-t border-brand-primary/5">
                  <label className="block text-[10px] uppercase tracking-widest opacity-40 mb-3">Copy Link</label>
                  <div className="flex items-center gap-2 bg-brand-secondary/30 rounded-2xl p-2 pl-4">
                    <span className="text-xs truncate flex-1 opacity-60">{window.location.href}</span>
                    <button 
                      onClick={copyToClipboard}
                      className="p-3 bg-brand-primary text-white rounded-xl hover:bg-brand-primary/90 transition-colors"
                    >
                      <Copy size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Image Zoom Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 md:p-8"
            onClick={() => setIsModalOpen(false)}
          >
            <motion.button
              className="absolute top-6 right-6 text-white hover:text-brand-primary transition-colors z-[110]"
              onClick={() => setIsModalOpen(false)}
            >
              <X size={32} />
            </motion.button>
            
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-5xl w-full h-full flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <img 
                src={currentImage} 
                alt={product?.name || "Product Image"} 
                className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                referrerPolicy="no-referrer"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
