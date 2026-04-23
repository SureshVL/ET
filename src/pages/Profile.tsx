import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { collection, query, where, onSnapshot, doc, getDoc, deleteDoc, orderBy, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';
import { User, LogOut, Package, Heart, Trash2, ChevronRight, MapPin, Plus, Edit2, X, Check, Truck, ExternalLink, Download } from 'lucide-react';
import { toast } from 'sonner';
import ConfirmationModal from '../components/ConfirmationModal';
import SEO from '../components/SEO';
import { downloadInvoice } from '../lib/invoice';

const INDIAN_STATES_CITIES: Record<string, string[]> = {
  "Andhra Pradesh": ["Visakhapatnam", "Vijayawada", "Guntur", "Nellore", "Kurnool"],
  "Assam": ["Guwahati", "Dibrugarh", "Silchar", "Jorhat", "Nagaon"],
  "Bihar": ["Patna", "Gaya", "Bhagalpur", "Muzaffarpur", "Purnia"],
  "Delhi": ["New Delhi", "North Delhi", "South Delhi", "West Delhi", "East Delhi"],
  "Gujarat": ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Bhavnagar"],
  "Haryana": ["Gurugram", "Faridabad", "Panipat", "Ambala", "Yamunanagar"],
  "Karnataka": ["Bengaluru", "Mysuru", "Hubballi", "Mangaluru", "Belagavi"],
  "Kerala": ["Kochi", "Thiruvananthapuram", "Kozhikode", "Thrissur", "Kollam"],
  "Madhya Pradesh": ["Indore", "Bhopal", "Jabalpur", "Gwalior", "Ujjain"],
  "Maharashtra": ["Mumbai", "Pune", "Nagpur", "Nashik", "Thane"],
  "Odisha": ["Bhubaneswar", "Cuttack", "Rourkela", "Berhampur", "Sambalpur"],
  "Punjab": ["Ludhiana", "Amritsar", "Jalandhar", "Patiala", "Bathinda"],
  "Rajasthan": ["Jaipur", "Jodhpur", "Udaipur", "Kota", "Bikaner"],
  "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Salem"],
  "Telangana": ["Hyderabad", "Warangal", "Nizamabad", "Karimnagar", "Khammam"],
  "Uttar Pradesh": ["Lucknow", "Kanpur", "Varanasi", "Agra", "Meerut"],
  "Uttarakhand": ["Dehradun", "Haridwar", "Roorkee", "Haldwani", "Rudrapur"],
  "West Bengal": ["Kolkata", "Howrah", "Durgapur", "Siliguri", "Asansol"]
};

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [wishlist, setWishlist] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [addressesLoading, setAddressesLoading] = useState(true);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<any>(null);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [addressForm, setAddressForm] = useState({
    name: '',
    phone: '',
    street: '',
    city: '',
    state: '',
    pincode: '',
    isDefault: false
  });
  const [addressToDelete, setAddressToDelete] = useState<string | null>(null);
  const [wishlistItemToRemove, setWishlistItemToRemove] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    const q = query(
      collection(db, 'wishlist'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const items = [];
      for (const wishlistDoc of snapshot.docs) {
        const productId = wishlistDoc.data().productId;
        const productRef = doc(db, 'products', productId);
        const productSnap = await getDoc(productRef);
        if (productSnap.exists()) {
          items.push({
            wishlistId: wishlistDoc.id,
            id: productId,
            ...productSnap.data()
          });
        }
      }
      setWishlist(items);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'wishlist');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, navigate]);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'orders'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const orderList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setOrders(orderList);
      setOrdersLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'orders');
      setOrdersLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'addresses'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const addressList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAddresses(addressList);
      setAddressesLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'addresses');
      setAddressesLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleAddressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      if (editingAddress) {
        await updateDoc(doc(db, 'addresses', editingAddress.id), {
          ...addressForm,
          updatedAt: serverTimestamp()
        });
        toast.success('Address updated successfully');
      } else {
        await addDoc(collection(db, 'addresses'), {
          ...addressForm,
          userId: user.uid,
          createdAt: serverTimestamp()
        });
        toast.success('Address added successfully');
      }
      resetAddressForm();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'addresses');
    }
  };

  const resetAddressForm = () => {
    setAddressForm({
      name: '',
      phone: '',
      street: '',
      city: '',
      state: '',
      pincode: '',
      isDefault: false
    });
    setEditingAddress(null);
    setShowAddressForm(false);
  };

  const handleEditAddress = (address: any) => {
    setAddressForm({
      name: address.name,
      phone: address.phone,
      street: address.street,
      city: address.city,
      state: address.state,
      pincode: address.pincode,
      isDefault: address.isDefault || false
    });
    setEditingAddress(address);
    setShowAddressForm(true);
  };

  const handleDeleteAddress = async (addressId: string) => {
    try {
      await deleteDoc(doc(db, 'addresses', addressId));
      toast.success('Address deleted');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `addresses/${addressId}`);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully');
      navigate('/');
    } catch (error) {
      toast.error('Failed to log out');
    }
  };

  const removeFromWishlist = async (wishlistId: string) => {
    try {
      await deleteDoc(doc(db, 'wishlist', wishlistId));
      toast.success('Removed from wishlist');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `wishlist/${wishlistId}`);
    }
  };

  if (!user) return null;

  return (
    <div className="py-24 px-4 bg-brand-secondary/30 min-h-screen">
      <SEO 
        title="My Profile" 
        description="Manage your Devaragudi account, view your wishlist, track your orders, and manage your shipping addresses."
      />
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-16 gap-8">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-full bg-brand-primary text-white flex items-center justify-center shadow-lg">
              <User size={40} />
            </div>
            <div>
              <h1 className="text-4xl font-serif mb-2">My Profile</h1>
              <p className="text-gray-500">{user.email}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="btn-secondary flex items-center gap-2 text-red-600 border-red-200 hover:bg-red-50"
          >
            <LogOut size={18} /> SIGN OUT
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Sidebar/Stats */}
          <div className="md:col-span-1 space-y-6">
            <div className="bg-white p-8 rounded-[32px] shadow-sm">
              <h3 className="text-xs uppercase tracking-widest mb-6 opacity-40 font-bold">Account Overview</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm opacity-60">Member since</span>
                  <span className="text-sm font-medium">2026</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm opacity-60">Total Orders</span>
                  <span className="text-sm font-medium">{orders.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm opacity-60">Wishlist Items</span>
                  <span className="text-sm font-medium">{wishlist.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm opacity-60">Saved Addresses</span>
                  <span className="text-sm font-medium">{addresses.length}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="md:col-span-2 space-y-12">
            {/* Wishlist Section */}
            <div className="bg-white p-10 rounded-[48px] shadow-sm">
              <div className="flex items-center gap-3 mb-8">
                <Heart className="text-brand-accent" size={24} fill="currentColor" />
                <h2 className="text-2xl font-serif">My Wishlist</h2>
              </div>

              {loading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div>
                </div>
              ) : wishlist.length === 0 ? (
                <div className="text-center py-12 space-y-4">
                  <p className="text-gray-400">Your wishlist is empty.</p>
                  <Link to="/products" className="btn-primary inline-block">EXPLORE COLLECTION</Link>
                </div>
              ) : (
                <div className="space-y-6">
                  {wishlist.map((item) => (
                    <div key={item.wishlistId} className="flex items-center gap-6 p-4 bg-brand-secondary/30 rounded-3xl border border-brand-primary/5 group">
                      <Link to={`/product/${item.id}`} className="w-20 h-24 rounded-xl overflow-hidden bg-white shadow-sm shrink-0">
                        <img 
                          src={item.imageUrls?.[0] || "/images/haridwar-2.jpg"} 
                          alt={item.name} 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </Link>
                      <div className="flex-grow">
                        <Link to={`/product/${item.id}`} className="font-bold hover:text-brand-primary transition-colors block mb-1">
                          {item.name}
                        </Link>
                        <p className="text-brand-primary font-bold">₹ {item.price.toLocaleString()}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => setWishlistItemToRemove(item.wishlistId)}
                          className="p-3 hover:bg-red-50 text-red-500 rounded-2xl transition-colors"
                          title="Remove from Wishlist"
                        >
                          <Trash2 size={20} />
                        </button>
                        <Link 
                          to={`/product/${item.id}`}
                          className="p-3 hover:bg-brand-primary/10 text-brand-primary rounded-2xl transition-colors"
                        >
                          <ChevronRight size={20} />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Addresses Section */}
            <div className="bg-white p-10 rounded-[48px] shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <MapPin className="text-brand-primary" size={24} />
                  <h2 className="text-2xl font-serif">My Addresses</h2>
                </div>
                {!showAddressForm && (
                  <button 
                    onClick={() => setShowAddressForm(true)}
                    className="flex items-center gap-2 text-sm font-bold text-brand-primary hover:opacity-70 transition-opacity"
                  >
                    <Plus size={18} /> ADD NEW
                  </button>
                )}
              </div>

              <AnimatePresence>
                {showAddressForm && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden mb-12"
                  >
                    <form onSubmit={handleAddressSubmit} className="bg-brand-secondary/30 p-8 rounded-[32px] space-y-6 border border-brand-primary/5">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold">{editingAddress ? 'Edit Address' : 'Add New Address'}</h3>
                        <button type="button" onClick={resetAddressForm} className="text-gray-400 hover:text-gray-600">
                          <X size={20} />
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-xs uppercase tracking-widest mb-2 opacity-60">Full Name</label>
                          <input
                            required
                            type="text"
                            value={addressForm.name}
                            onChange={(e) => setAddressForm({...addressForm, name: e.target.value})}
                            className="w-full bg-white border border-brand-primary/10 rounded-2xl px-4 py-3 focus:outline-none focus:border-brand-primary transition-colors"
                          />
                        </div>
                        <div>
                          <label className="block text-xs uppercase tracking-widest mb-2 opacity-60">Phone Number</label>
                          <input
                            required
                            type="tel"
                            value={addressForm.phone}
                            onChange={(e) => setAddressForm({...addressForm, phone: e.target.value})}
                            className="w-full bg-white border border-brand-primary/10 rounded-2xl px-4 py-3 focus:outline-none focus:border-brand-primary transition-colors"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-xs uppercase tracking-widest mb-2 opacity-60">Street Address</label>
                          <input
                            required
                            type="text"
                            value={addressForm.street}
                            onChange={(e) => setAddressForm({...addressForm, street: e.target.value})}
                            className="w-full bg-white border border-brand-primary/10 rounded-2xl px-4 py-3 focus:outline-none focus:border-brand-primary transition-colors"
                          />
                        </div>
                        <div className="relative">
                          <label className="block text-xs uppercase tracking-widest mb-2 opacity-60">State</label>
                          <div className="relative">
                            <select
                              required
                              value={addressForm.state}
                              onChange={(e) => {
                                const newState = e.target.value;
                                setAddressForm({
                                  ...addressForm, 
                                  state: newState,
                                  city: '' // Reset city when state changes
                                });
                              }}
                              className="w-full bg-white border border-brand-primary/10 rounded-2xl px-4 py-3 focus:outline-none focus:border-brand-primary transition-colors appearance-none pr-10"
                            >
                              <option value="">Select State</option>
                              {Object.keys(INDIAN_STATES_CITIES).sort().map(state => (
                                <option key={state} value={state}>{state}</option>
                              ))}
                            </select>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
                              <ChevronRight size={16} className="rotate-90" />
                            </div>
                          </div>
                        </div>
                        <div className="relative">
                          <label className="block text-xs uppercase tracking-widest mb-2 opacity-60">City</label>
                          <div className="relative">
                            <select
                              required
                              disabled={!addressForm.state}
                              value={addressForm.city}
                              onChange={(e) => setAddressForm({...addressForm, city: e.target.value})}
                              className="w-full bg-white border border-brand-primary/10 rounded-2xl px-4 py-3 focus:outline-none focus:border-brand-primary transition-colors appearance-none disabled:opacity-50 pr-10"
                            >
                              <option value="">Select City</option>
                              {addressForm.state && INDIAN_STATES_CITIES[addressForm.state].sort().map(city => (
                                <option key={city} value={city}>{city}</option>
                              ))}
                            </select>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
                              <ChevronRight size={16} className="rotate-90" />
                            </div>
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs uppercase tracking-widest mb-2 opacity-60">Pincode</label>
                          <input
                            required
                            type="text"
                            value={addressForm.pincode}
                            onChange={(e) => setAddressForm({...addressForm, pincode: e.target.value})}
                            className="w-full bg-white border border-brand-primary/10 rounded-2xl px-4 py-3 focus:outline-none focus:border-brand-primary transition-colors"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          id="isDefault"
                          checked={addressForm.isDefault}
                          onChange={(e) => setAddressForm({...addressForm, isDefault: e.target.checked})}
                          className="w-5 h-5 rounded border-brand-primary/20 text-brand-primary focus:ring-brand-primary"
                        />
                        <label htmlFor="isDefault" className="text-sm opacity-70">Set as default address</label>
                      </div>

                      <button type="submit" className="btn-primary w-full py-4">
                        {editingAddress ? 'UPDATE ADDRESS' : 'SAVE ADDRESS'}
                      </button>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>

              {addressesLoading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div>
                </div>
              ) : addresses.length === 0 ? (
                <p className="text-center py-12 text-gray-400">No addresses saved yet.</p>
              ) : (
                <div className="grid grid-cols-1 gap-6">
                  {addresses.map((address) => (
                    <div key={address.id} className="p-6 bg-brand-secondary/30 rounded-3xl border border-brand-primary/5 relative group">
                      {address.isDefault && (
                        <span className="absolute top-6 right-6 flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-green-600 bg-green-50 px-2 py-1 rounded-full">
                          <Check size={10} /> Default
                        </span>
                      )}
                      <div className="pr-20">
                        <h4 className="font-bold mb-2">{address.name}</h4>
                        <p className="text-sm opacity-70 mb-1">{address.street}</p>
                        <p className="text-sm opacity-70 mb-1">{address.city}, {address.state} - {address.pincode}</p>
                        <p className="text-sm opacity-70">Phone: {address.phone}</p>
                      </div>
                      <div className="absolute bottom-6 right-6 flex gap-2">
                        <button 
                          onClick={() => handleEditAddress(address)}
                          className="p-2 hover:bg-brand-primary/10 text-brand-primary rounded-xl transition-colors"
                          title="Edit Address"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button 
                          onClick={() => setAddressToDelete(address.id)}
                          className="p-2 hover:bg-red-50 text-red-500 rounded-xl transition-colors"
                          title="Delete Address"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Orders Section */}
            <div className="bg-white p-10 rounded-[48px] shadow-sm">
              <div className="flex items-center gap-3 mb-8">
                <Package className="text-brand-primary" size={24} />
                <h2 className="text-2xl font-serif">Recent Orders</h2>
              </div>
              
              {ordersLoading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div>
                </div>
              ) : orders.length === 0 ? (
                <p className="text-center py-12 text-gray-400">No orders placed yet.</p>
              ) : (
                <div className="space-y-6">
                  {orders.map((order) => (
                    <button 
                      key={order.id} 
                      onClick={() => setSelectedOrder(order)}
                      className="w-full text-left p-6 bg-brand-secondary/30 rounded-3xl border border-brand-primary/5 hover:border-brand-primary/20 transition-all group"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <p className="text-xs uppercase tracking-widest opacity-40 font-bold mb-1">Order ID</p>
                          <p className="font-mono text-sm">#{order.id.slice(-6).toUpperCase()}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs uppercase tracking-widest opacity-40 font-bold mb-1">Status</p>
                          <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                            order.status === 'delivered' ? 'bg-green-100 text-green-700' :
                            order.status === 'shipped' ? 'bg-blue-100 text-blue-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            {order.status}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {order.items.slice(0, 2).map((item: any, idx: number) => (
                          <div key={idx} className="flex justify-between text-sm">
                            <span className="opacity-70 truncate pr-4">{item.name} x {item.quantity}</span>
                            <span className="font-medium shrink-0">₹ {item.price.toLocaleString()}</span>
                          </div>
                        ))}
                        {order.items.length > 2 && (
                          <p className="text-xs text-brand-primary font-medium">+ {order.items.length - 2} more items</p>
                        )}
                      </div>
                      <div className="mt-4 pt-4 border-t border-brand-primary/10 flex justify-between items-center">
                        <p className="text-xs opacity-40">
                          {order.createdAt?.seconds 
                            ? new Date(order.createdAt.seconds * 1000).toLocaleDateString() 
                            : 'Processing...'}
                        </p>
                        <div className="flex items-center gap-2 text-brand-primary font-bold">
                          <span>Total: ₹ {order.totalAmount.toLocaleString()}</span>
                          <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Order Details Modal */}
      <AnimatePresence>
        {selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedOrder(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-[48px] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="p-8 border-b border-brand-primary/5 flex justify-between items-center bg-brand-secondary/30">
                <div>
                  <h2 className="text-2xl font-serif">Order Details</h2>
                  <p className="text-sm opacity-60 font-mono">#{selectedOrder.id.toUpperCase()}</p>
                </div>
                <button 
                  onClick={() => setSelectedOrder(null)}
                  className="p-2 hover:bg-white rounded-full transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-8 overflow-y-auto space-y-8">
                {/* Status & Date */}
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-xs uppercase tracking-widest opacity-40 font-bold mb-1">Order Date</p>
                    <p className="font-medium">
                      {selectedOrder.createdAt?.seconds 
                        ? new Date(selectedOrder.createdAt.seconds * 1000).toLocaleString() 
                        : 'Processing...'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs uppercase tracking-widest opacity-40 font-bold mb-1">Status</p>
                    <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest ${
                      selectedOrder.status === 'delivered' ? 'bg-green-100 text-green-700' :
                      selectedOrder.status === 'shipped' ? 'bg-blue-100 text-blue-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {selectedOrder.status}
                    </span>
                  </div>
                </div>

                {/* Items */}
                <div>
                  <h3 className="text-sm uppercase tracking-widest mb-4 opacity-60 font-bold">Items Ordered</h3>
                  <div className="space-y-4">
                    {selectedOrder.items.map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center p-4 bg-brand-secondary/20 rounded-2xl">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-16 rounded-lg overflow-hidden bg-white">
                            <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                          </div>
                          <div>
                            <p className="font-bold text-sm">{item.name}</p>
                            <p className="text-xs opacity-60">Size: {item.size} | Qty: {item.quantity}</p>
                          </div>
                        </div>
                        <p className="font-bold">₹ {(item.price * item.quantity).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tracking Info if Shipped */}
                {selectedOrder.trackingId && (
                  <div className="p-6 bg-brand-primary/5 rounded-3xl border border-brand-primary/10">
                    <div className="flex items-center gap-3 mb-4">
                      <Truck className="text-brand-primary" size={20} />
                      <h3 className="text-sm uppercase tracking-widest opacity-60 font-bold">Tracking Information</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <p className="text-[10px] uppercase tracking-widest opacity-40 mb-1">Courier</p>
                        <p className="font-bold text-sm">{selectedOrder.courierPartner}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-widest opacity-40 mb-1">Tracking ID</p>
                        <p className="font-mono font-bold text-sm text-brand-primary">{selectedOrder.trackingId}</p>
                      </div>
                    </div>
                    <div className="mt-6 pt-4 border-t border-brand-primary/10">
                      <a 
                        href={selectedOrder.labelUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs font-bold text-brand-primary hover:underline flex items-center justify-center gap-2"
                      >
                        VIEW SHIPPING LABEL <ExternalLink size={14} />
                      </a>
                    </div>
                  </div>
                )}

                {/* Shipping Address */}
                <div>
                  <h3 className="text-sm uppercase tracking-widest mb-4 opacity-60 font-bold">Shipping Address</h3>
                  <div className="p-6 bg-brand-secondary/20 rounded-2xl border border-brand-primary/5">
                    <pre className="font-sans text-sm whitespace-pre-wrap leading-relaxed opacity-80">
                      {selectedOrder.shippingAddress}
                    </pre>
                  </div>
                </div>

                {/* Summary */}
                <div className="pt-6 border-t border-brand-primary/10">
                  <div className="flex justify-between items-center text-xl">
                    <span className="font-serif">Total Amount Paid</span>
                    <span className="font-bold text-brand-primary">₹ {selectedOrder.totalAmount.toLocaleString()}</span>
                  </div>
                  <p className="text-[10px] uppercase tracking-widest opacity-40 mt-2 text-right">Paid via Online Payment</p>
                </div>
              </div>

              <div className="p-8 bg-brand-secondary/30 border-t border-brand-primary/5 space-y-4">
                <button 
                  onClick={() => downloadInvoice(selectedOrder)}
                  className="btn-secondary w-full py-4 flex items-center justify-center gap-2"
                >
                  <Download size={20} /> DOWNLOAD INVOICE
                </button>
                <button 
                  onClick={() => setSelectedOrder(null)}
                  className="btn-primary w-full py-4"
                >
                  CLOSE DETAILS
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmationModal
        isOpen={!!addressToDelete}
        onClose={() => setAddressToDelete(null)}
        onConfirm={() => {
          if (addressToDelete) {
            handleDeleteAddress(addressToDelete);
          }
        }}
        title="Delete Address?"
        message="Are you sure you want to delete this address? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
      />

      <ConfirmationModal
        isOpen={!!wishlistItemToRemove}
        onClose={() => setWishlistItemToRemove(null)}
        onConfirm={() => {
          if (wishlistItemToRemove) {
            removeFromWishlist(wishlistItemToRemove);
          }
        }}
        title="Remove from Wishlist?"
        message="Are you sure you want to remove this item from your wishlist?"
        confirmText="Remove"
        cancelText="Keep"
      />
    </div>
  );
}
