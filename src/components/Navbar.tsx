import { useNavigate, Link, useLocation } from 'react-router-dom';
import { ShoppingCart, User, Menu, X, LogOut, Heart, Search, ChevronRight, BarChart3, MessageCircle, Globe } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useCurrency } from '../context/CurrencyContext';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { user, isAdmin, logout } = useAuth();
  const { items } = useCart();
  const { currency, setCurrency } = useCurrency();
  const navigate = useNavigate();
  const location = useLocation();

  // Update search query state if URL changes (e.g. user clears it on products page)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const q = params.get('search') || '';
    setSearchQuery(q);
  }, [location.search]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate('/products');
    }
    setIsOpen(false);
  };

  const cartCount = items.reduce((acc, item) => acc + item.quantity, 0);

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully');
      navigate('/');
    } catch (error) {
      toast.error('Failed to log out');
    }
  };

  return (
    <header className="sticky top-0 z-50">
      {/* Top Announcement Bar */}
      <div className="bg-gradient-to-r from-brand-primary via-brand-rani to-brand-accent text-white py-2 px-4 text-center overflow-hidden relative">
        <div className="absolute inset-0 bg-black/10 animate-pulse" />
        <motion.p 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-[10px] sm:text-xs font-bold tracking-[0.3em] uppercase relative z-10"
        >
          Free Shipping on all orders above ₹2,999 • Handcrafted with Love
        </motion.p>
      </div>

      <nav className="bg-white/80 backdrop-blur-xl border-b border-brand-primary/5 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            {/* Logo */}
            <Link to="/" className="flex flex-col items-center group flex-shrink-0">
              <span className="text-xl sm:text-2xl font-display font-black tracking-[0.1em] text-brand-primary group-hover:scale-105 transition-transform duration-500 uppercase">
                Devaragudi
              </span>
              <div className="flex items-center gap-2 w-full">
                <div className="h-[1px] flex-grow bg-brand-primary/40" />
                <span className="text-[10px] uppercase tracking-[0.3em] text-brand-primary font-bold">Ethnic Threads</span>
                <div className="h-[1px] flex-grow bg-brand-primary/40" />
              </div>
            </Link>

            {/* Desktop Nav Links */}
            <div className="hidden xl:flex items-center space-x-8">
              {[
                { name: 'Home', path: '/' },
                { name: 'Collection', path: '/products' },
                { name: 'Stylist', path: '/stylist' },
                { name: 'Track Order', path: '/track-order' },
                { name: 'About', path: '/about' },
                { name: 'Contact', path: '/contact' },
              ].map((link) => (
                <Link 
                  key={link.name}
                  to={link.path} 
                  className="relative text-[15px] font-bold tracking-[0.15em] hover:text-brand-primary transition-colors group whitespace-nowrap"
                >
                  {link.name}
                  <span className={cn(
                    "absolute -bottom-1 left-0 w-0 h-[2px] bg-brand-primary transition-all duration-300 group-hover:w-full",
                    location.pathname === link.path && "w-full"
                  )} />
                </Link>
              ))}
              {isAdmin && (
                <Link to="/admin" className="text-[13px] font-bold tracking-[0.2em] text-brand-accent hover:opacity-80 transition-opacity whitespace-nowrap">
                  Admin
                </Link>
              )}
            </div>

            {/* Search Bar - Refined */}
            <div className="hidden 2xl:block flex-1 max-w-xs mx-4">
              <button 
                onClick={() => setIsSearchOpen(true)}
                className="w-full bg-brand-secondary/30 border border-transparent rounded-2xl py-2.5 pl-11 pr-4 text-sm text-left text-gray-400 hover:bg-white hover:border-brand-primary/20 hover:ring-4 hover:ring-brand-primary/5 transition-all duration-300 flex items-center gap-3"
              >
                <Search size={16} className="text-gray-400" />
                <span className="truncate">Search our collection...</span>
              </button>
            </div>

            {/* Action Icons */}
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              {/* Search Icon for Screens where bar is hidden */}
              <button 
                onClick={() => setIsSearchOpen(true)}
                className="2xl:hidden p-2.5 hover:bg-brand-secondary rounded-2xl transition-all duration-300 text-gray-600 hover:text-brand-primary"
              >
                <Search size={20} />
              </button>

              {/* Currency Switcher */}
              <div className="relative group px-1">
                <button className="flex items-center gap-1.5 p-2.5 hover:bg-brand-secondary rounded-2xl transition-all duration-300 text-gray-600 hover:text-brand-primary">
                  <Globe size={18} />
                  <span className="hidden lg:inline text-[10px] font-bold tracking-widest uppercase">{currency}</span>
                </button>
                <div className="absolute top-full right-0 mt-2 w-32 bg-white rounded-2xl shadow-2xl border border-brand-primary/5 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 overflow-hidden z-[60]">
                  {(['INR', 'USD', 'GBP', 'EUR'] as const).map((curr) => (
                    <button
                      key={curr}
                      onClick={() => setCurrency(curr)}
                      className={cn(
                        "w-full px-4 py-3 text-[10px] font-bold tracking-widest text-left hover:bg-brand-secondary transition-colors",
                        currency === curr ? "text-brand-primary bg-brand-secondary/50" : "text-gray-500"
                      )}
                    >
                      {curr}
                    </button>
                  ))}
                </div>
              </div>

              <a 
                href="https://wa.me/919121485927" 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-2.5 hover:bg-[#25D366]/10 rounded-2xl transition-all duration-300 text-[#25D366] hover:text-[#25D366]" 
                title="WhatsApp Support"
              >
                <MessageCircle size={20} />
              </a>

              <Link to="/cart" className="relative p-2.5 hover:bg-brand-secondary rounded-2xl transition-all duration-300 text-gray-600 hover:text-brand-primary">
                <ShoppingCart size={20} />
                {cartCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 bg-brand-accent text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-sm">
                    {cartCount}
                  </span>
                )}
              </Link>

              {user ? (
                <div className="relative group px-1">
                  <button className="flex items-center gap-2 p-2.5 hover:bg-brand-secondary rounded-2xl transition-all duration-300 text-gray-600 hover:text-brand-primary">
                    <div className="w-8 h-8 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary font-bold text-xs">
                      {user.displayName?.[0] || user.email?.[0] || 'U'}
                    </div>
                    <ChevronRight size={14} className="rotate-90 opacity-40 hidden lg:block" />
                  </button>
                  <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-brand-primary/5 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 overflow-hidden z-[60]">
                    <div className="px-4 py-4 border-b border-brand-primary/5 bg-brand-secondary/20">
                      <p className="text-[9px] font-bold tracking-[0.2em] uppercase opacity-40 mb-1">Account</p>
                      <p className="text-xs font-bold truncate text-brand-primary">{user.displayName || user.email}</p>
                    </div>
                    <div className="py-2">
                      <Link to="/profile" className="flex items-center gap-3 px-4 py-3 text-xs font-bold hover:bg-brand-secondary transition-colors text-gray-600">
                        <User size={16} className="text-brand-primary" /> My Profile
                      </Link>
                      <Link to="/profile" className="flex items-center gap-3 px-4 py-3 text-xs font-bold hover:bg-brand-secondary transition-colors text-gray-600">
                        <Heart size={16} className="text-brand-primary" /> Wishlist
                      </Link>
                      {isAdmin && (
                        <Link to="/admin" className="flex items-center gap-3 px-4 py-3 text-xs font-bold hover:bg-brand-secondary transition-colors text-brand-accent">
                          <BarChart3 size={16} /> Admin Panel
                        </Link>
                      )}
                      <div className="mt-2 pt-2 border-t border-brand-primary/5">
                        <button 
                          onClick={handleLogout}
                          className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold hover:bg-red-50 transition-colors text-red-500 text-left"
                        >
                          <LogOut size={16} /> Sign Out
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <Link to="/login" className="p-2.5 hover:bg-brand-secondary rounded-2xl transition-all duration-300 text-gray-600 hover:text-brand-primary">
                  <User size={20} />
                </Link>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="xl:hidden flex items-center">
              <button 
                onClick={() => setIsOpen(!isOpen)} 
                className="p-2 text-brand-primary"
              >
                {isOpen ? <X size={26} /> : <Menu size={26} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu - Enhanced */}
        <AnimatePresence>
          {isOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsOpen(false)}
                className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 xl:hidden"
              />
              <motion.div 
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed inset-y-0 right-0 w-[85%] max-w-sm bg-white z-50 xl:hidden shadow-2xl flex flex-col"
              >
                <div className="p-6 flex justify-between items-center border-b border-brand-primary/5">
                  <span className="text-xs font-bold tracking-[0.3em] uppercase opacity-40">Menu</span>
                  <button 
                    onClick={() => setIsOpen(false)} 
                    className="p-2 text-brand-primary hover:bg-brand-secondary rounded-full transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto px-8 py-10 relative">
                  <div className="absolute inset-0 dynamic-bg opacity-5 pointer-events-none" />
                  <div className="space-y-8 relative z-10">
                    <div className="space-y-4">
                      <p className="text-[10px] font-bold tracking-[0.2em] uppercase opacity-40 mb-2">Navigation</p>
                      {[
                        { name: 'Home', path: '/' },
                        { name: 'Collection', path: '/products' },
                        { name: 'Stylist', path: '/stylist' },
                        { name: 'Track Order', path: '/track-order' },
                        { name: 'About', path: '/about' },
                        { name: 'Contact', path: '/contact' },
                      ].map((link, i) => (
                        <motion.div
                          key={link.name}
                          initial={{ x: 20, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          transition={{ delay: i * 0.1 }}
                        >
                          <Link 
                            to={link.path} 
                            onClick={() => setIsOpen(false)} 
                            className="text-3xl font-serif flex justify-between items-center group py-1"
                          >
                            <span className="group-hover:translate-x-2 transition-transform duration-300">{link.name}</span>
                            <ChevronRight size={20} className="opacity-0 group-hover:opacity-100 -translate-x-4 group-hover:translate-x-0 transition-all duration-300" />
                          </Link>
                        </motion.div>
                      ))}
                    </div>

                    <div className="pt-8 border-t border-brand-primary/5 space-y-4">
                      <p className="text-[10px] font-bold tracking-[0.2em] uppercase opacity-40 mb-2">Account & Support</p>
                      <motion.div
                        initial={{ x: 20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.4 }}
                      >
                        <Link 
                          to={user ? '/profile' : '/login'} 
                          onClick={() => setIsOpen(false)} 
                          className="text-xl font-medium flex items-center gap-3 py-2"
                        >
                          <User size={20} className="text-brand-primary" />
                          {user ? 'My Account' : 'Login / Sign Up'}
                        </Link>
                      </motion.div>

                      {user && (
                        <motion.div
                          initial={{ x: 20, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          transition={{ delay: 0.45 }}
                        >
                          <Link 
                            to="/profile" 
                            onClick={() => setIsOpen(false)} 
                            className="text-xl font-medium flex items-center gap-3 py-2"
                          >
                            <Heart size={20} className="text-brand-primary" />
                            My Wishlist
                          </Link>
                        </motion.div>
                      )}

                      <motion.div
                        initial={{ x: 20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.5 }}
                      >
                        <a 
                          href="https://wa.me/919121485927" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          onClick={() => setIsOpen(false)} 
                          className="text-xl font-medium flex items-center gap-3 py-2 text-[#25D366]"
                        >
                          <MessageCircle size={20} />
                          WhatsApp Support
                        </a>
                      </motion.div>
                      
                      {isAdmin && (
                        <motion.div
                          initial={{ x: 20, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          transition={{ delay: 0.6 }}
                        >
                          <Link 
                            to="/admin" 
                            onClick={() => setIsOpen(false)} 
                            className="text-xl font-medium text-brand-accent flex items-center gap-3 py-2"
                          >
                            <BarChart3 size={20} />
                            Admin Dashboard
                          </Link>
                        </motion.div>
                      )}

                      {user && (
                        <motion.div
                          initial={{ x: 20, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          transition={{ delay: 0.7 }}
                        >
                          <button 
                            onClick={() => {
                              handleLogout();
                              setIsOpen(false);
                            }} 
                            className="text-xl font-medium text-red-500 flex items-center gap-3 py-2 w-full text-left"
                          >
                            <LogOut size={20} />
                            Sign Out
                          </button>
                        </motion.div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-8 bg-brand-secondary/30">
                  <p className="text-[10px] font-bold tracking-[0.1em] text-center opacity-40 uppercase">
                    © 2026 Devaragudi Ethnic Threads
                  </p>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </nav>

      {/* Search Overlay */}
      <AnimatePresence>
        {isSearchOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-white/98 backdrop-blur-2xl flex flex-col"
          >
            <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 h-full flex flex-col">
              <div className="flex justify-between items-center mb-12 md:mb-20">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-brand-primary/5 rounded-full flex items-center justify-center">
                    <Search size={18} className="text-brand-primary" />
                  </div>
                  <span className="text-xs font-bold tracking-[0.3em] uppercase opacity-40">Search Collection</span>
                </div>
                <button 
                  onClick={() => setIsSearchOpen(false)}
                  className="group p-3 hover:bg-brand-secondary rounded-full transition-all duration-300"
                >
                  <X size={32} className="group-hover:rotate-90 transition-transform duration-300" />
                </button>
              </div>

              <div className="flex-1 max-w-5xl mx-auto w-full">
                <form onSubmit={handleSearch} className="relative group">
                  <input
                    autoFocus
                    type="text"
                    placeholder="What are you looking for?"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-transparent border-b-2 border-brand-primary/10 py-10 text-4xl md:text-7xl font-serif focus:outline-none focus:border-brand-primary transition-all duration-500 placeholder:opacity-20"
                  />
                  <button 
                    type="submit" 
                    className="absolute right-0 top-1/2 -translate-y-1/2 p-4 text-brand-primary hover:scale-110 transition-transform"
                  >
                    <ChevronRight size={60} strokeWidth={1} />
                  </button>
                </form>

                <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-12">
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    <p className="text-[10px] font-bold tracking-[0.2em] uppercase opacity-40 mb-8 flex items-center gap-2">
                      <span className="w-4 h-[1px] bg-brand-primary/40" />
                      Popular Searches
                    </p>
                    <div className="flex flex-wrap gap-3">
                      {[
                        'Cotton Kurta', 
                        'Silk Collection', 
                        'New Arrivals', 
                        'Best Sellers', 
                        'Wedding Wear',
                        'Linen Kurtas',
                        'Festive Edit'
                      ].map(term => (
                        <button 
                          key={term}
                          onClick={() => {
                            setSearchQuery(term);
                            navigate(`/products?search=${encodeURIComponent(term)}`);
                            setIsSearchOpen(false);
                          }}
                          className="px-6 py-3 rounded-2xl border border-brand-primary/5 bg-brand-secondary/20 text-sm font-medium hover:bg-brand-primary hover:text-white hover:shadow-xl hover:shadow-brand-primary/20 transition-all duration-300"
                        >
                          {term}
                        </button>
                      ))}
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="hidden md:block"
                  >
                    <p className="text-[10px] font-bold tracking-[0.2em] uppercase opacity-40 mb-8 flex items-center gap-2">
                      <span className="w-4 h-[1px] bg-brand-primary/40" />
                      Trending Categories
                    </p>
                    <div className="space-y-4">
                      {[
                        { name: 'Summer Essentials', count: '24 items' },
                        { name: 'Premium Silk Blend', count: '12 items' },
                        { name: 'Hand-stitched Classics', count: '18 items' }
                      ].map((cat) => (
                        <button
                          key={cat.name}
                          onClick={() => {
                            setSearchQuery(cat.name);
                            navigate(`/products?search=${encodeURIComponent(cat.name)}`);
                            setIsSearchOpen(false);
                          }}
                          className="w-full flex justify-between items-center p-4 rounded-2xl hover:bg-brand-secondary transition-colors group"
                        >
                          <span className="font-serif text-xl group-hover:text-brand-primary transition-colors">{cat.name}</span>
                          <span className="text-[10px] font-bold tracking-widest uppercase opacity-40">{cat.count}</span>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                </div>
              </div>

              <div className="mt-auto py-8 text-center">
                <p className="text-[10px] font-bold tracking-[0.3em] uppercase opacity-20">
                  Devaragudi Ethnic Threads • Est. 2026
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
