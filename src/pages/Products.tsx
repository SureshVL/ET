import { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useProducts } from '../context/ProductContext';
import ProductCard from '../components/ProductCard';
import { motion, AnimatePresence } from 'motion/react';
import { Filter, X, ChevronDown, Check, Star } from 'lucide-react';
import { cn } from '../lib/utils';
import SEO from '../components/SEO';

const COLOR_MAP: Record<string, string> = {
  'White':'#FFFFFF','Saffron':'#F4C430','Royal Blue':'#4169E1','Maroon':'#800000','Black':'#000000',
  'Red':'#FF0000','Green':'#008000','Blue':'#0000FF','Yellow':'#FFFF00','Pink':'#FFC0CB','Orange':'#FFA500',
  'Purple':'#800080','Brown':'#A52A2A','Grey':'#808080','Navy':'#000080','Beige':'#F5F5DC','Cream':'#FFFDD0',
  'Gold':'#FFD700','Silver':'#C0C0C0','Peach':'#FFDAB9','Olive':'#808000','Teal':'#008080','Indigo':'#4B0082',
};

export default function Products() {
  const { products, loading } = useProducts();
  const [selectedSize, setSelectedSize] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [stockStatus, setStockStatus] = useState<'all' | 'in-stock' | 'out-of-stock'>('all');
  const [maxPrice, setMaxPrice] = useState<number>(10000);
  const [sortBy, setSortBy] = useState<string>('newest');
  // FIX: Mobile filter panel toggle
  const [showFilters, setShowFilters] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const searchParams = new URLSearchParams(location.search);
  const searchQuery = searchParams.get('search') || '';
  const sizes = [38, 40, 42, 44, 46];

  const categories = useMemo(() => {
    const cats = new Set(products.map(p => p.category).filter(Boolean));
    const derived = Array.from(cats) as string[];
    return derived.length > 0 ? derived : ['Cotton', 'Silk', 'Linen', 'Festive', 'Daily Wear'];
  }, [products]);

  const colors = useMemo(() => {
    const cols = new Set<string>();
    products.forEach(p => {
      if (p.color) cols.add(p.color);
      p.variants?.forEach((v: any) => { if (v.color) cols.add(v.color); });
    });
    const derived = Array.from(cols);
    return derived.length > 0 ? derived : Object.keys(COLOR_MAP).slice(0, 8);
  }, [products]);

  useEffect(() => {
    if (products.length > 0) {
      setMaxPrice(Math.max(...products.map(p => p.price)));
    }
  }, [products]);

  const filteredProducts = useMemo(() => {
    let result = products.filter(product => {
      const matchesSize = !selectedSize || (product.sizes && product.sizes.includes(selectedSize));
      const matchesCategory = !selectedCategory || product.category === selectedCategory;
      const productColors = new Set<string>();
      if (product.color) productColors.add(product.color);
      product.variants?.forEach((v: any) => { if (v.color) productColors.add(v.color); });
      const matchesColor = !selectedColor || productColors.has(selectedColor);
      const matchesPrice = product.price <= maxPrice;
      const matchesSearch = !searchQuery || product.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRating = !selectedRating || (product.rating && product.rating >= selectedRating);
      const totalStock = Object.values(product.stock || {}).reduce((a: number, b: any) => a + Number(b), 0);
      const matchesStock = stockStatus === 'all' || (stockStatus === 'in-stock' ? totalStock > 0 : totalStock === 0);
      return matchesSize && matchesCategory && matchesColor && matchesPrice && matchesSearch && matchesRating && matchesStock;
    });

    switch (sortBy) {
      case 'price-asc': result.sort((a, b) => a.price - b.price); break;
      case 'price-desc': result.sort((a, b) => b.price - a.price); break;
      case 'rating': result.sort((a, b) => (b.rating || 0) - (a.rating || 0)); break;
      case 'popular': result.sort((a, b) => (b.addToCarts || 0) - (a.addToCarts || 0)); break;
      default: result.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    }
    return result;
  }, [products, selectedSize, selectedCategory, selectedColor, maxPrice, searchQuery, selectedRating, stockStatus, sortBy]);

  const clearAllFilters = () => {
    setSelectedSize(null); setSelectedCategory(null); setSelectedColor(null);
    setSelectedRating(null); setStockStatus('all'); setSortBy('newest');
    if (searchQuery) navigate('/products');
  };

  const activeFilterCount = [selectedSize, selectedCategory, selectedColor, selectedRating]
    .filter(Boolean).length + (stockStatus !== 'all' ? 1 : 0);

  const FiltersPanel = () => (
    <div className="space-y-8">
      {/* Sort */}
      <div>
        <h3 className="text-sm uppercase tracking-widest mb-4 opacity-60">Sort By</h3>
        <select
          value={sortBy} onChange={e => setSortBy(e.target.value)}
          className="w-full p-3 rounded-xl border border-brand-primary/10 bg-white focus:border-brand-primary outline-none text-sm"
        >
          <option value="newest">Newest First</option>
          <option value="price-asc">Price: Low to High</option>
          <option value="price-desc">Price: High to Low</option>
          <option value="rating">Top Rated</option>
          <option value="popular">Most Popular</option>
        </select>
      </div>

      {/* Size */}
      <div>
        <h3 className="text-sm uppercase tracking-widest mb-4 opacity-60">Size</h3>
        <div className="flex flex-wrap gap-2">
          {sizes.map(s => (
            <button key={s} onClick={() => setSelectedSize(selectedSize === s ? null : s)}
              className={cn('w-12 h-12 rounded-xl border-2 font-bold text-sm transition-all', selectedSize === s ? 'border-brand-primary bg-brand-primary text-white' : 'border-brand-primary/10 hover:border-brand-primary/30')}
            >{s}</button>
          ))}
        </div>
      </div>

      {/* Category */}
      <div>
        <h3 className="text-sm uppercase tracking-widest mb-4 opacity-60">Category</h3>
        <div className="flex flex-col gap-2">
          {categories.map(cat => (
            <button key={cat} onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
              className={cn('flex items-center justify-between p-3 rounded-xl border text-sm font-medium transition-all text-left', selectedCategory === cat ? 'border-brand-primary bg-brand-primary/5 text-brand-primary' : 'border-brand-primary/10 hover:border-brand-primary/20')}
            >
              {cat} {selectedCategory === cat && <Check size={14} />}
            </button>
          ))}
        </div>
      </div>

      {/* Price */}
      <div>
        <h3 className="text-sm uppercase tracking-widest mb-4 opacity-60">Max Price</h3>
        <input type="range" min={500} max={products.length ? Math.max(...products.map(p => p.price)) : 10000}
          value={maxPrice} step={100} onChange={e => setMaxPrice(+e.target.value)}
          className="w-full accent-brand-primary"
        />
        <p className="text-brand-primary font-bold mt-2">₹ {maxPrice.toLocaleString()}</p>
      </div>

      {/* Stock */}
      <div>
        <h3 className="text-sm uppercase tracking-widest mb-4 opacity-60">Availability</h3>
        <div className="flex gap-2">
          {(['all','in-stock','out-of-stock'] as const).map(s => (
            <button key={s} onClick={() => setStockStatus(s)}
              className={cn('px-3 py-2 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all', stockStatus === s ? 'border-brand-primary bg-brand-primary text-white' : 'border-brand-primary/10 hover:border-brand-primary/20')}
            >{s.replace('-',' ')}</button>
          ))}
        </div>
      </div>

      {activeFilterCount > 0 && (
        <button onClick={clearAllFilters} className="w-full py-3 text-sm text-red-500 border border-red-200 rounded-xl hover:bg-red-50 transition-colors flex items-center justify-center gap-2">
          <X size={14} /> Clear All Filters ({activeFilterCount})
        </button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-brand-secondary/20">
      <SEO title="Shop Ethnic Wear | Devaragudi" description="Browse our premium collection of handcrafted kurtas from Haridwar." />

      <div className="max-w-8xl mx-auto px-4 py-12">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-4xl mb-1">Our Collection</h1>
            {searchQuery && <p className="text-gray-500">Results for "{searchQuery}"</p>}
          </div>
          {/* FIX: Mobile filter toggle button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-5 py-3 bg-white rounded-2xl border border-brand-primary/10 hover:border-brand-primary/30 transition-all shadow-sm sm:hidden font-medium text-sm"
          >
            <Filter size={16} className="text-brand-primary" />
            Filters {activeFilterCount > 0 && <span className="bg-brand-primary text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{activeFilterCount}</span>}
          </button>
        </div>

        <div className="flex gap-8">
          {/* Sidebar — hidden on mobile, visible md+ */}
          <aside className="hidden md:block w-64 flex-shrink-0">
            <div className="bg-white rounded-[32px] p-8 shadow-sm sticky top-28">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl">Filters</h2>
                {activeFilterCount > 0 && (
                  <button onClick={clearAllFilters} className="text-xs text-red-500 font-bold hover:underline flex items-center gap-1">
                    <X size={12} /> Clear ({activeFilterCount})
                  </button>
                )}
              </div>
              <FiltersPanel />
            </div>
          </aside>

          {/* FIX: Mobile filter drawer as overlay */}
          <AnimatePresence>
            {showFilters && (
              <>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black/40 z-40 md:hidden" onClick={() => setShowFilters(false)} />
                <motion.div initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'tween' }}
                  className="fixed left-0 top-0 bottom-0 w-80 bg-white z-50 overflow-y-auto p-6 md:hidden"
                >
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-serif">Filters</h2>
                    <button onClick={() => setShowFilters(false)} className="w-8 h-8 bg-brand-secondary rounded-full flex items-center justify-center">
                      <X size={16} />
                    </button>
                  </div>
                  <FiltersPanel />
                  <button onClick={() => setShowFilters(false)} className="btn-primary w-full mt-6 py-4">
                    VIEW {filteredProducts.length} RESULTS
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>

          {/* Product Grid */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-6">
              <p className="text-sm text-gray-500">{filteredProducts.length} products</p>
              <div className="hidden sm:flex items-center gap-2">
                <span className="text-sm opacity-60">Sort:</span>
                <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                  className="text-sm border border-brand-primary/10 rounded-xl px-3 py-2 outline-none focus:border-brand-primary bg-white"
                >
                  <option value="newest">Newest</option>
                  <option value="price-asc">Price ↑</option>
                  <option value="price-desc">Price ↓</option>
                  <option value="rating">Rating</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-white rounded-[32px] overflow-hidden animate-pulse">
                    <div className="h-72 bg-brand-secondary/50" />
                    <div className="p-6 space-y-3">
                      <div className="h-4 bg-brand-secondary/50 rounded w-3/4" />
                      <div className="h-4 bg-brand-secondary/50 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24">
                <div className="text-6xl mb-6">🔍</div>
                <h3 className="text-2xl mb-2">No products found</h3>
                <p className="text-gray-500 mb-8">Try adjusting your filters</p>
                <button onClick={clearAllFilters} className="btn-primary px-8 py-3">CLEAR FILTERS</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence>
                  {filteredProducts.map((product, i) => (
                    <motion.div key={product.id} layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i * 0.04, 0.3) }}
                    >
                      <ProductCard product={product} />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
