import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, addDoc, updateDoc, doc, query, orderBy, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { Package, ShoppingCart, BarChart3, Plus, RefreshCw, CheckCircle, Truck, PackageCheck, X, Upload, Image as ImageIcon, Loader2, Trash2, Eye, Sparkles, Globe, Instagram, Facebook, Share2, ExternalLink, Copy, MessageCircle, MapPin, FileSpreadsheet, Download, Zap } from 'lucide-react';
import ConfirmationModal from '../components/ConfirmationModal';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

export default function AdminDashboard() {
  const { user, isAdmin } = useAuth();
  const LOW_STOCK_THRESHOLD = 5;
  const [activeTab, setActiveTab] = useState<'orders' | 'inventory' | 'add' | 'reports' | 'channels' | 'analytics' | 'seo'>('orders');
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [shippingLoading, setShippingLoading] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null); // Track which field is uploading
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [selectedOrderForDetails, setSelectedOrderForDetails] = useState<any | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [seoOptimizingId, setSeoOptimizingId] = useState<string | null>(null);
  const [seoSuggestions, setSeoSuggestions] = useState<Record<string, any>>({});
  const [productToDelete, setProductToDelete] = useState<any | null>(null);
  const [isBulkUpdateMode, setIsBulkUpdateMode] = useState(false);
  const [bulkStockData, setBulkStockData] = useState<Record<string, any>>({});
  const [isBulkSaving, setIsBulkSaving] = useState(false);
  const [isEditingShipping, setIsEditingShipping] = useState(false);
  const [isGeneratingModelPhoto, setIsGeneratingModelPhoto] = useState(false);
  const [suggestedImages, setSuggestedImages] = useState<string[]>([]);
  const [editingShippingData, setEditingShippingData] = useState({
    option: 'Standard',
    fee: 0
  });

  const DELIVERY_OPTIONS = [
    { name: 'Standard', cost: 0 },
    { name: 'Express', cost: 150 },
    { name: 'Next Day', cost: 300 },
    { name: 'Custom', cost: 0 }
  ];

  const handleBulkStockSave = async () => {
    setIsBulkSaving(true);
    try {
      const updatePromises = Object.entries(bulkStockData).map(([productId, data]) => {
        return updateDoc(doc(db, 'products', productId), data);
      });
      await Promise.all(updatePromises);
      toast.success('Inventory updated successfully');
      setIsBulkUpdateMode(false);
      setBulkStockData({});
    } catch (error) {
      console.error('Bulk update error:', error);
      toast.error('Failed to update inventory');
    } finally {
      setIsBulkSaving(false);
    }
  };

  const generateSEOSuggestions = async (product: any) => {
    setSeoOptimizingId(product.id);
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${import.meta.env.VITE_GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `Return ONLY a JSON object (no markdown) for SEO of this ethnic wear product:\nName: ${product.name}\nDescription: ${product.description}\nCategory: ${product.category}\n\n{"optimizedTitle":"...","optimizedDescription":"...","keywords":["..."]}` }] }],
            generationConfig: { temperature: 0.4, maxOutputTokens: 512 }
          })
        }
      );
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const result = JSON.parse(text.replace(/\`\`\`json|\`\`\`/g, '').trim());
      setSeoSuggestions(prev => ({ ...prev, [product.id]: result }));
      toast.success('SEO suggestions generated!');
    } catch (error) {
      console.error('SEO generation error:', error);
      toast.error('Failed to generate SEO suggestions');
    } finally {
      setSeoOptimizingId(null);
    }
  };

  const applySEOSuggestions = async (productId: string) => {
    const suggestions = seoSuggestions[productId];
    if (!suggestions) return;

    setProcessingId(productId);
    try {
      await updateDoc(doc(db, 'products', productId), {
        name: suggestions.optimizedTitle,
        description: suggestions.optimizedDescription,
        seoKeywords: suggestions.keywords
      });
      toast.success('SEO updates applied successfully');
      setSeoSuggestions(prev => {
        const next = { ...prev };
        delete next[productId];
        return next;
      });
    } catch (error) {
      console.error('Apply SEO error:', error);
      toast.error('Failed to apply SEO updates');
    } finally {
      setProcessingId(null);
    }
  };

  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const rows = text.split('\n').map(row => row.split(','));
      
      const newBulkData = { ...bulkStockData };
      let updatedCount = 0;

      for (let i = 1; i < rows.length; i++) {
        const [id, productName, variantName, size, stock] = rows[i].map(s => s?.trim());
        if (!id || !size || isNaN(Number(stock))) continue;

        const product = products.find(p => p.id === id);
        if (!product) continue;

        if (!newBulkData[id]) {
          newBulkData[id] = { 
            stock: { ...product.stock },
            variants: product.variants ? product.variants.map((v: any) => ({ ...v, stock: { ...v.stock } })) : []
          };
        }

        if (variantName) {
          const vIdx = newBulkData[id].variants.findIndex((v: any) => v.name === variantName);
          if (vIdx !== -1) {
            newBulkData[id].variants[vIdx].stock[size] = Number(stock);
            updatedCount++;
          }
        } else {
          newBulkData[id].stock[size] = Number(stock);
          updatedCount++;
        }
      }

      setBulkStockData(newBulkData);
      setIsBulkUpdateMode(true);
      toast.success(`Processed ${updatedCount} stock updates from CSV`);
      // Reset input
      e.target.value = '';
    };
    reader.readAsText(file);
  };

  const downloadInventoryCSV = () => {
    let csv = 'ProductID,ProductName,VariantName,Size,CurrentStock\n';
    products.forEach(p => {
      p.sizes.forEach((s: number) => {
        csv += `${p.id},${p.name},,${s},${p.stock[s] || 0}\n`;
      });
      if (p.variants) {
        p.variants.forEach((v: any) => {
          p.sizes.forEach((s: number) => {
            csv += `${p.id},${p.name},${v.name},${s},${v.stock[s] || 0}\n`;
          });
        });
      }
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', 'inventory_template.csv');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const generateAIDescription = async () => {
    if (!newProduct.name) {
      toast.error('Please enter a product name first');
      return;
    }
    setIsGeneratingDescription(true);
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${import.meta.env.VITE_GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `Generate a compelling product description for a premium ethnic wear kurta named "${newProduct.name}" from Devaragudi Ethnic Threads, Haridwar. Highlight craftsmanship and fabric. Under 150 words. Plain text only.` }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 256 }
          })
        }
      );
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (text) {
        setNewProduct(prev => ({ ...prev, description: text }));
        toast.success('Description generated!');
      }
    } catch (error) {
      console.error('AI generation error:', error);
      toast.error('Failed to generate description');
    } finally {
      setIsGeneratingDescription(false);
    }
  };

  const generateModelPhoto = async (base64Kurta: string) => {
    setIsGeneratingModelPhoto(true);
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${import.meta.env.VITE_GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                { inlineData: { data: base64Kurta.split(',')[1], mimeType: 'image/jpeg' } },
                { text: 'A professional fashion model wearing this exact kurta in a studio setting. Full body shot, high quality, realistic.' }
              ]
            }],
            generationConfig: { maxOutputTokens: 1024 }
          })
        }
      );
      if (!res.ok) throw new Error(`Gemini API error ${res.status}`);
      const response = await res.json();

      if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            // Convert base64 back to blob and upload to Firebase Storage
            const base64Data = part.inlineData.data;
            const byteChars = atob(base64Data);
            const byteArr = new Uint8Array(byteChars.length);
            for (let i = 0; i < byteChars.length; i++) byteArr[i] = byteChars.charCodeAt(i);
            const blob = new Blob([byteArr], { type: 'image/png' });
            const file = new File([blob], `ai-model-${Date.now()}.png`, { type: 'image/png' });
            const url = await uploadToStorage(file, 'products/ai-generated');
            if (url) {
              setSuggestedImages(prev => [...prev, url]);
              toast.success('Model photo generated!');
              return url;
            }
          }
        }
      }
      toast.error('Model photo generation did not return an image.');
    } catch (error) {
      console.error('Error generating model photo:', error);
      toast.error('Failed to generate model photo');
    } finally {
      setIsGeneratingModelPhoto(false);
    }
    return null;
  };

  // Upload a single file to Firebase Storage and return the public download URL
  const uploadToStorage = async (file: File, folder = 'products'): Promise<string | null> => {
    if (file.size > 10 * 1024 * 1024) {
      toast.error(`${file.name} is too large (max 10 MB)`);
      return null;
    }
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      return url;
    } catch (err: any) {
      console.error('Storage upload error:', err);
      toast.error(`Failed to upload ${file.name}: ${err.message}`);
      return null;
    }
  };

  // Upload multiple files in parallel, return array of download URLs
  const uploadFiles = async (files: File[], slotKey: string): Promise<string[]> => {
    setUploading(slotKey);
    try {
      const results = await Promise.all(files.map(f => uploadToStorage(f)));
      return results.filter((u): u is string => u !== null);
    } finally {
      setUploading(null);
    }
  };

  // Keep processFile for generateModelPhoto (still needs base64 for Gemini inline image)
  const processFile = (file: File): Promise<string | null> => {
    return new Promise<string | null>((resolve) => {
      if (file.size > 5 * 1024 * 1024) {
        resolve(null);
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
  };

  // Legacy shim — only used by generateModelPhoto path
  const handleImageUpload = async (file: File, path: string) => {
    return uploadToStorage(file, 'products');
  };

  // Form state for new product
  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    price: '' as any,
    category: '',
    color: '',
    sizes: [] as number[],
    stock: {} as Record<string, number>,
    imageUrls: [] as string[],
    variants: [] as { name: string, color?: string, stock: any, imageUrls: string[] }[],
    flashSale: null as { discount: number, endTime: any } | null,
    rating: 4.5,
    reviewCount: 0
  });

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'orders') {
        const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        setOrders(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } else if (activeTab === 'inventory' || activeTab === 'reports' || activeTab === 'analytics') {
        const querySnapshot = await getDocs(collection(db, 'products'));
        setProducts(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        
        if (activeTab === 'analytics') {
          const ordersSnapshot = await getDocs(collection(db, 'orders'));
          setOrders(ordersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, activeTab === 'orders' ? 'orders' : 'products');
    } finally {
      setLoading(false);
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Sanitize data (remove undefined values which Firestore doesn't like)
    const sanitizedProduct = JSON.parse(JSON.stringify({
      ...newProduct,
      price: Number(newProduct.price) || 0,
      rating: Number(newProduct.rating) || 4.5,
      reviewCount: Number(newProduct.reviewCount) || 0
    }));
    
    try {
      if (editingProduct) {
        console.log('Updating existing product:', editingProduct.id);
        await updateDoc(doc(db, 'products', editingProduct.id), {
          ...sanitizedProduct,
          updatedAt: serverTimestamp()
        });
        toast.success('Product updated successfully');
      } else {
        console.log('Adding new product to collection');
        await addDoc(collection(db, 'products'), {
          ...sanitizedProduct,
          createdAt: serverTimestamp()
        });
        toast.success('Product added successfully');
      }
      setNewProduct({
        name: '',
        description: '',
        price: '' as any,
        category: '',
        color: '',
        sizes: [],
        stock: {},
        imageUrls: [],
        variants: [],
        flashSale: null,
        rating: 4.5,
        reviewCount: 0
      });
      setEditingProduct(null);
      setActiveTab('inventory');
    } catch (error: any) {
      console.error('Product save error:', error);
      toast.error(editingProduct ? `Failed to update product: ${error.message || 'Unknown error'}` : `Failed to add product: ${error.message || 'Unknown error'}`);
      handleFirestoreError(error, OperationType.WRITE, 'products');
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    setProcessingId(orderId);
    try {
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, { status: newStatus });
      
      // WhatsApp Status Updates
      const order = orders.find(o => o.id === orderId);
      if (order && order.shippingAddress) {
        // Extract phone from address (assuming standard format)
        const phoneMatch = order.shippingAddress.match(/Phone: (\d+)/);
        const phoneNumber = phoneMatch ? phoneMatch[1] : null;
        
        if (phoneNumber) {
          const orderIdShort = orderId.slice(-6);
          const message = `Namaste! Your Devaragudi order #${orderIdShort} status has been updated to: ${newStatus.toUpperCase()}. Thank you for shopping with us!`;
          const whatsappUrl = `https://wa.me/91${phoneNumber}?text=${encodeURIComponent(message)}`;
          
          // Show info toast as requested
          toast.info(`WhatsApp notification prepared for Order #${orderIdShort}`, {
            description: `Status updated to ${newStatus.toUpperCase()}`,
            action: {
              label: 'SEND NOW',
              onClick: () => window.open(whatsappUrl, '_blank')
            }
          });

          // Attempt to open automatically
          window.open(whatsappUrl, '_blank');
        }
      }

      toast.success(`Order marked as ${newStatus}`);
      await fetchData();
    } catch (error) {
      toast.error('Failed to update order status');
      handleFirestoreError(error, OperationType.UPDATE, `orders/${orderId}`);
    } finally {
      setProcessingId(null);
    }
  };

  const updateOrderShipping = async (orderId: string, option: string, fee: number) => {
    try {
      const order = orders.find(o => o.id === orderId);
      if (!order) return;

      const subtotal = order.subtotal || (order.totalAmount - (order.shippingFee || 0));
      const newTotal = subtotal + Number(fee);
      
      await updateDoc(doc(db, 'orders', orderId), {
        shippingFee: Number(fee),
        totalAmount: newTotal,
        deliveryOption: option
      });

      toast.success('Shipping updated successfully');
      setIsEditingShipping(false);
      
      // Update local state for modal
      setSelectedOrderForDetails({
        ...selectedOrderForDetails,
        shippingFee: Number(fee),
        totalAmount: newTotal,
        deliveryOption: option
      });
      
      await fetchData();
    } catch (error) {
      console.error('Update shipping error:', error);
      toast.error('Failed to update shipping');
    }
  };

  const handleShipOrder = async (order: any) => {
    setShippingLoading(true);
    try {
      const response = await fetch('/api/shipping/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          shippingAddress: order.shippingAddress,
          items: order.items,
          // Structured fields saved at checkout time
          customerName: order.customerName || order.shippingAddress?.split('\n')[0] || 'Customer',
          phone: order.phone || order.shippingAddress?.match(/Phone:\s*(\d+)/)?.[1] || '',
          addressLine: order.addressLine || order.shippingAddress?.split('\n')[1] || '',
          city: order.city || '',
          state: order.state || '',
          pincode: order.pincode || '',
          totalAmount: order.totalAmount,
        }),
      });
      const data = await response.json();

      if (data.success) {
        await updateDoc(doc(db, 'orders', order.id), {
          status: 'shipped',
          shippingStatus: 'pickup_scheduled',
          trackingId: data.trackingId,
          labelUrl: data.labelUrl || '',
          courierPartner: data.courierPartner,
          shiprocketOrderId: data.shiprocketOrderId || null,
          shiprocketShipmentId: data.shiprocketShipmentId || null,
          shippedAt: serverTimestamp(),
        });

        // WhatsApp notification
        const phoneNumber = order.phone || order.shippingAddress?.match(/Phone:\s*(\d+)/)?.[1];
        if (phoneNumber) {
          const short = order.id.slice(-6).toUpperCase();
          const trackUrl = `${window.location.origin}/track-order?id=${order.id}`;
          const msg = `Namaste! 🙏 Your Devaragudi order #${short} has been shipped via ${data.courierPartner}.${data.trackingId ? ` AWB: ${data.trackingId}.` : ''} Track here: ${trackUrl}`;
          const waUrl = `https://wa.me/91${phoneNumber}?text=${encodeURIComponent(msg)}`;
          toast.success(`Order shipped! AWB: ${data.trackingId}`, {
            description: `via ${data.courierPartner}${data.mock ? ' (test mode)' : ''}`,
            action: { label: 'WhatsApp Customer', onClick: () => window.open(waUrl, '_blank') },
            duration: 8000,
          });
        } else {
          toast.success(`Shipment created — AWB: ${data.trackingId}`);
        }

        // Download label if available
        if (data.labelUrl) {
          window.open(data.labelUrl, '_blank');
        }

        setSelectedOrderForDetails({
          ...order, status: 'shipped',
          trackingId: data.trackingId, labelUrl: data.labelUrl,
          courierPartner: data.courierPartner,
        });
        await fetchData();
      } else {
        toast.error(data.error || 'Failed to create shipment');
      }
    } catch (error) {
      console.error('Shipping error:', error);
      toast.error('Error connecting to shipping partner');
    } finally {
      setShippingLoading(false);
    }
  };

  const handleDeleteProduct = (product: any) => {
    setProductToDelete(product);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!productToDelete) return;
    
    setProcessingId(productToDelete.id);
    try {
      await deleteDoc(doc(db, 'products', productToDelete.id));
      toast.success('Product deleted successfully');
      await fetchData();
    } catch (error) {
      toast.error('Failed to delete product');
      handleFirestoreError(error, OperationType.DELETE, `products/${productToDelete.id}`);
    } finally {
      setProcessingId(null);
      setProductToDelete(null);
    }
  };

  const seedData = async () => {
    setLoading(true);
    const initialProducts = [
      {
        name: "Classic White Cotton Kurta",
        description: "Pure cotton white kurta with intricate hand-stitched detailing on the neck. Perfect for spiritual gatherings and summer comfort.",
        price: 1299,
        rating: 4.8,
        reviewCount: 124,
        category: "Cotton",
        color: "#FFFFFF",
        sizes: [38, 40, 42],
        stock: { '38': 10, '40': 15, '42': 5 },
        imageUrls: ["/images/haridwar-2.jpg"],
        variants: [
          { name: "Pure White", color: "#FFFFFF", stock: { '38': 5, '40': 10, '42': 5 }, imageUrls: ["/images/haridwar-2.jpg"] },
          { name: "Off White", color: "#F5F5F5", stock: { '38': 5, '40': 5, '42': 0 }, imageUrls: ["/images/haridwar-3.jfif"] }
        ]
      },
      {
        name: "Royal Blue Silk Blend Kurta",
        description: "Elegant silk blend kurta in deep royal blue. Designed for festive occasions with a premium finish and comfortable fit.",
        price: 1899,
        rating: 4.9,
        reviewCount: 86,
        category: "Silk",
        color: "#002366",
        sizes: [38, 40, 42, 44],
        stock: { '38': 8, '40': 12, '42': 10, '44': 5 },
        imageUrls: ["/images/haridwar-2.jpg"],
        variants: [
          { name: "Royal Blue", color: "#002366", stock: { '38': 4, '40': 6, '42': 5, '44': 2 }, imageUrls: ["/images/haridwar-2.jpg"] },
          { name: "Midnight Blue", color: "#191970", stock: { '38': 4, '40': 6, '42': 5, '44': 3 }, imageUrls: ["/images/haridwar-3.jfif"] }
        ]
      },
      {
        name: "Saffron Spiritual Kurta",
        description: "A traditional saffron-colored kurta, reflecting the spiritual essence of Haridwar. Made from breathable linen-cotton mix.",
        price: 1499,
        rating: 4.7,
        reviewCount: 42,
        category: "Linen",
        color: "Saffron",
        sizes: [38],
        stock: { '38': 1 },
        imageUrls: ["/images/haridwar-3.jfif"],
        variants: []
      },
      {
        name: "Embroidered Festive Kurta",
        description: "Luxurious kurta with subtle embroidery. Stitched with precision in Haridwar for a perfect ethnic look.",
        price: 2499,
        rating: 4.6,
        reviewCount: 31,
        category: "Festive",
        color: "Maroon",
        sizes: [38],
        stock: { '38': 1 },
        imageUrls: ["/images/haridwar-2.jpg"],
        variants: []
      }
    ];

    try {
      for (const p of initialProducts) {
        await addDoc(collection(db, 'products'), p);
      }
      toast.success('Initial products seeded successfully');
      fetchData();
    } catch (error) {
      toast.error('Failed to seed initial data');
      handleFirestoreError(error, OperationType.WRITE, 'products');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="py-24 px-4 bg-brand-secondary/30 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-16 gap-8">
          <div>
            <h1 className="text-5xl mb-4 font-serif">Admin Dashboard</h1>
            <p className="text-gray-500">Manage your Haridwar-crafted collection and orders.</p>
          </div>
          <button 
            onClick={seedData}
            disabled={loading}
            className="btn-secondary flex items-center gap-2"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} /> SEED INITIAL DATA
          </button>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-4 mb-12">
          {[
            { id: 'orders', label: 'Orders', icon: ShoppingCart },
            { id: 'inventory', label: 'Inventory', icon: Package },
            { id: 'add', label: editingProduct ? 'Edit Product' : 'Add Product', icon: Plus },
            { id: 'channels', label: 'Channels', icon: Globe },
            { id: 'reports', label: 'Reports', icon: FileSpreadsheet },
            { id: 'analytics', label: 'Analytics', icon: BarChart3 },
            { id: 'seo', label: 'SEO', icon: Sparkles }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-3 px-8 py-4 rounded-3xl transition-all ${
                activeTab === tab.id 
                  ? 'bg-brand-primary text-white shadow-lg' 
                  : 'bg-white hover:bg-brand-primary/5'
              }`}
            >
              <tab.icon size={20} />
              <span className="font-medium">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="bg-white p-10 rounded-[48px] shadow-sm min-h-[500px] relative">
          {loading && (orders.length === 0 && products.length === 0) && (
            <div className="flex flex-col items-center justify-center h-64 space-y-4">
              <Loader2 className="animate-spin text-brand-primary" size={48} />
              <p className="text-sm font-bold tracking-widest uppercase opacity-40">Loading Dashboard...</p>
            </div>
          )}

          {loading && (orders.length > 0 || products.length > 0) && (
            <div className="absolute top-10 right-10 flex items-center gap-2 bg-brand-primary/10 px-4 py-2 rounded-full z-10">
              <Loader2 className="animate-spin text-brand-primary" size={16} />
              <span className="text-[10px] font-bold tracking-widest uppercase text-brand-primary">Refreshing...</span>
            </div>
          )}

          <div className={cn(
            "transition-all duration-500",
            loading && (orders.length === 0 && products.length === 0) ? "opacity-0 invisible" : "opacity-100 visible",
            loading && (orders.length > 0 || products.length > 0) && "opacity-50 pointer-events-none grayscale-[0.5]"
          )}>
            {activeTab === 'orders' && (
              <div className="space-y-8">
              {/* Filters */}
              <div className="flex flex-wrap gap-6 mb-8 p-6 bg-brand-secondary/20 rounded-3xl border border-brand-primary/5">
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-[10px] uppercase tracking-widest mb-2 opacity-60 font-bold">Status Filter</label>
                  <select 
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full p-3 rounded-xl border border-brand-primary/10 focus:border-brand-primary outline-none text-sm bg-white appearance-none cursor-pointer"
                  >
                    <option value="all">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                    <option value="test case">Test Case</option>
                  </select>
                </div>
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-[10px] uppercase tracking-widest mb-2 opacity-60 font-bold">Start Date</label>
                  <input 
                    type="date" 
                    value={dateRange.start}
                    onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                    className="w-full p-3 rounded-xl border border-brand-primary/10 focus:border-brand-primary outline-none text-sm bg-white"
                  />
                </div>
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-[10px] uppercase tracking-widest mb-2 opacity-60 font-bold">End Date</label>
                  <input 
                    type="date" 
                    value={dateRange.end}
                    onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                    className="w-full p-3 rounded-xl border border-brand-primary/10 focus:border-brand-primary outline-none text-sm bg-white"
                  />
                </div>
                <div className="flex items-end">
                  <button 
                    onClick={() => {
                      setStatusFilter('all');
                      setDateRange({ start: '', end: '' });
                    }}
                    className="p-3 text-brand-primary hover:bg-brand-primary/10 rounded-xl transition-colors text-xs font-bold uppercase tracking-widest"
                  >
                    Reset Filters
                  </button>
                </div>
              </div>

              {orders.filter(order => {
                const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
                let matchesDate = true;
                if (dateRange.start || dateRange.end) {
                  const orderDate = order.createdAt?.toDate ? order.createdAt.toDate() : new Date(order.createdAt);
                  if (dateRange.start) {
                    const start = new Date(dateRange.start);
                    start.setHours(0, 0, 0, 0);
                    if (orderDate < start) matchesDate = false;
                  }
                  if (dateRange.end) {
                    const end = new Date(dateRange.end);
                    end.setHours(23, 59, 59, 999);
                    if (orderDate > end) matchesDate = false;
                  }
                }
                return matchesStatus && matchesDate;
              }).length === 0 ? (
                <p className="text-center text-gray-400 py-24">No orders found matching your filters.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-brand-primary/10">
                        <th className="pb-6 font-serif text-lg">Order ID</th>
                        <th className="pb-6 font-serif text-lg">Date & Time</th>
                        <th className="pb-6 font-serif text-lg">Items</th>
                        <th className="pb-6 font-serif text-lg">Total</th>
                        <th className="pb-6 font-serif text-lg">Status</th>
                        <th className="pb-6 font-serif text-lg">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-primary/5">
                      {orders
                        .filter(order => {
                          const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
                          let matchesDate = true;
                          if (dateRange.start || dateRange.end) {
                            const orderDate = order.createdAt?.toDate ? order.createdAt.toDate() : new Date(order.createdAt);
                            if (dateRange.start) {
                              const start = new Date(dateRange.start);
                              start.setHours(0, 0, 0, 0);
                              if (orderDate < start) matchesDate = false;
                            }
                            if (dateRange.end) {
                              const end = new Date(dateRange.end);
                              end.setHours(23, 59, 59, 999);
                              if (orderDate > end) matchesDate = false;
                            }
                          }
                          return matchesStatus && matchesDate;
                        })
                        .map((order) => (
                        <tr key={order.id} className="group">
                          <td className="py-6 font-mono text-sm opacity-60">#{order.id.slice(-6)}</td>
                          <td className="py-6 text-sm opacity-60">
                            {order.createdAt?.toDate ? order.createdAt.toDate().toLocaleString() : new Date(order.createdAt).toLocaleString()}
                          </td>
                          <td className="py-6">
                            {order.items.map((item: any, idx: number) => (
                              <div key={idx} className="text-sm">
                                {item.name} (Size: {item.size}) x {item.quantity}
                              </div>
                            ))}
                          </td>
                          <td className="py-6 font-bold">₹ {order.totalAmount.toLocaleString()}</td>
                          <td className="py-6">
                            <div className="relative inline-block">
                              <select 
                                value={order.status}
                                disabled={processingId === order.id}
                                onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                                className={`px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest outline-none border-none cursor-pointer transition-colors ${
                                  order.status === 'delivered' ? 'bg-green-100 text-green-700' :
                                  order.status === 'shipped' ? 'bg-blue-100 text-blue-700' :
                                  order.status === 'test case' ? 'bg-purple-100 text-purple-700' :
                                  'bg-yellow-100 text-yellow-700'
                                } ${processingId === order.id ? 'opacity-50' : ''}`}
                              >
                                <option value="pending">Pending</option>
                                <option value="shipped">Shipped</option>
                                <option value="delivered">Delivered</option>
                                <option value="test case">Test Case</option>
                              </select>
                              {processingId === order.id && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <Loader2 className="animate-spin text-brand-primary" size={14} />
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="py-6">
                            <div className="flex gap-2">
                              <button 
                                onClick={() => setSelectedOrderForDetails(order)}
                                className="p-2 hover:bg-brand-primary/10 text-brand-primary rounded-xl transition-colors"
                                title="View Details"
                              >
                                <Eye size={20} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'inventory' && (
            <div className="space-y-8">
              <div className="flex flex-wrap justify-between items-center gap-6 p-6 bg-brand-secondary/20 rounded-3xl border border-brand-primary/5">
                <div className="flex items-center gap-4">
                  <h2 className="text-2xl font-serif">Inventory Management</h2>
                  {isBulkUpdateMode && (
                    <span className="px-3 py-1 bg-brand-primary text-white text-[10px] font-bold rounded-full uppercase tracking-widest animate-pulse">
                      Bulk Edit Mode
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  {!isBulkUpdateMode ? (
                    <>
                      <button 
                        onClick={() => setIsBulkUpdateMode(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-brand-primary/10 rounded-xl text-xs font-bold text-brand-primary hover:bg-brand-primary/5 transition-all"
                      >
                        <RefreshCw size={14} /> BULK EDIT
                      </button>
                      <button 
                        onClick={downloadInventoryCSV}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-brand-primary/10 rounded-xl text-xs font-bold text-brand-primary hover:bg-brand-primary/5 transition-all"
                      >
                        <Download size={14} /> TEMPLATE
                      </button>
                      <label className="flex items-center gap-2 px-4 py-2 bg-brand-primary text-white rounded-xl text-xs font-bold cursor-pointer hover:opacity-90 transition-all">
                        <FileSpreadsheet size={14} /> UPLOAD CSV
                        <input type="file" accept=".csv" className="hidden" onChange={handleCSVUpload} />
                      </label>
                    </>
                  ) : (
                    <>
                      <button 
                        onClick={() => {
                          setIsBulkUpdateMode(false);
                          setBulkStockData({});
                        }}
                        className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-700"
                      >
                        CANCEL
                      </button>
                      <button 
                        onClick={handleBulkStockSave}
                        disabled={isBulkSaving || Object.keys(bulkStockData).length === 0}
                        className="flex items-center gap-2 px-6 py-2 bg-brand-primary text-white rounded-xl text-xs font-bold hover:opacity-90 transition-all disabled:opacity-50"
                      >
                        {isBulkSaving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                        SAVE ALL CHANGES
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {products.map((product) => {
                  const bulkData = bulkStockData[product.id];
                  return (
                    <div key={product.id} className={`p-8 border rounded-[40px] hover:shadow-md transition-shadow ${
                      Object.values(product.stock).some((s: any) => s < LOW_STOCK_THRESHOLD) || 
                      (product.variants && product.variants.some((v: any) => Object.values(v.stock).some((s: any) => s < LOW_STOCK_THRESHOLD)))
                        ? 'border-red-200 bg-red-50/30'
                        : 'border-brand-primary/10 bg-brand-secondary/10'
                    }`}>
                        <div className="flex justify-between items-start mb-8">
                          <div className="flex gap-6">
                            <div className="relative">
                              <img src={product.imageUrls?.[0] || "/images/haridwar-2.jpg"} className="w-24 h-32 object-cover rounded-2xl shadow-sm" onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/images/haridwar-2.jpg'; }} />
                              {(Object.values(product.stock).some((s: any) => s < LOW_STOCK_THRESHOLD) || 
                                (product.variants && product.variants.some((v: any) => Object.values(v.stock).some((s: any) => s < LOW_STOCK_THRESHOLD)))) && (
                                <div className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-lg flex items-center gap-1">
                                  <Package size={10} /> LOW
                                </div>
                              )}
                            </div>
                            <div>
                              <h3 className="font-serif text-2xl mb-2">{product.name}</h3>
                              <p className="text-brand-primary font-bold text-xl">₹ {product.price.toLocaleString()}</p>
                              <div className="flex items-center gap-4 mt-2">
                                <p className="text-sm opacity-60">{product.variants?.length || 0} Variants</p>
                                {Object.values(product.stock).some((s: any) => s === 0) && (
                                  <span className="text-[10px] font-bold text-red-600 uppercase tracking-widest">Out of Stock</span>
                                )}
                              </div>
                            </div>
                          </div>
                          {!isBulkUpdateMode && (
                            <div className="flex gap-2">
                              <button 
                                onClick={() => {
                                  setEditingProduct(product);
                                  setNewProduct({
                                    name: product.name,
                                    description: product.description,
                                    price: product.price,
                                    category: product.category || '',
                                    color: product.color || '',
                                    sizes: product.sizes,
                                    stock: product.stock,
                                    imageUrls: product.imageUrls,
                                    variants: product.variants || [],
                                    flashSale: product.flashSale || null,
                                    rating: product.rating || 4.5,
                                    reviewCount: product.reviewCount || 0
                                  });
                                  setActiveTab('add');
                                }}
                                className="p-3 hover:bg-brand-primary/10 text-brand-primary rounded-2xl transition-colors"
                                title="Edit Product"
                              >
                                <Plus size={20} className="rotate-45" />
                              </button>
                              <button 
                                onClick={() => handleDeleteProduct(product)}
                                disabled={processingId === product.id}
                                className="p-3 hover:bg-red-50 text-red-500 rounded-2xl transition-colors disabled:opacity-50"
                                title="Delete Product"
                              >
                                {processingId === product.id ? (
                                  <Loader2 size={20} className="animate-spin" />
                                ) : (
                                  <Trash2 size={20} />
                                )}
                              </button>
                            </div>
                          )}
                        </div>

                      <div className="space-y-6">
                        <div>
                          <h4 className="text-xs uppercase tracking-widest mb-3 opacity-40">Main Stock</h4>
                          <div className="grid grid-cols-4 gap-3">
                            {(product.sizes || []).map((size: number) => {
                              const currentStock = product.stock[size] || 0;
                              const bulkStock = bulkData?.stock?.[size];
                              const displayStock = bulkStock !== undefined ? bulkStock : currentStock;
                              
                              return (
                                <div key={size} className={`flex flex-col items-center p-2 rounded-xl border transition-colors ${
                                  displayStock < LOW_STOCK_THRESHOLD ? 'bg-red-100 border-red-200' : 'bg-white border-brand-primary/5'
                                }`}>
                                  <span className="text-[10px] opacity-40 uppercase">Size {size}</span>
                                  {isBulkUpdateMode ? (
                                    <input 
                                      type="number"
                                      value={displayStock}
                                      onChange={(e) => {
                                        const val = parseInt(e.target.value) || 0;
                                        setBulkStockData(prev => ({
                                          ...prev,
                                          [product.id]: {
                                            ...(prev[product.id] || { 
                                              stock: { ...product.stock },
                                              variants: product.variants ? product.variants.map((v: any) => ({ ...v, stock: { ...v.stock } })) : []
                                            }),
                                            stock: {
                                              ...(prev[product.id]?.stock || product.stock),
                                              [size]: val
                                            }
                                          }
                                        }));
                                      }}
                                      className="w-full text-center font-bold bg-transparent outline-none"
                                    />
                                  ) : (
                                    <span className={`font-bold ${displayStock < LOW_STOCK_THRESHOLD ? 'text-red-600' : ''}`}>{displayStock}</span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {product.variants && product.variants.length > 0 && (
                          <div className="pt-6 border-t border-brand-primary/5">
                            <h4 className="text-xs uppercase tracking-widest mb-4 opacity-40">Variant Stock</h4>
                            <div className="space-y-4">
                              {product.variants.map((variant: any, vIdx: number) => (
                                <div key={vIdx} className="bg-white/50 p-4 rounded-2xl">
                                  <p className="text-sm font-bold mb-3">{variant.name}</p>
                                  <div className="grid grid-cols-4 gap-2">
                                    {(product.sizes || []).map((size: number) => {
                                      const currentStock = variant.stock[size] || 0;
                                      const bulkVariantStock = bulkData?.variants?.[vIdx]?.stock?.[size];
                                      const displayStock = bulkVariantStock !== undefined ? bulkVariantStock : currentStock;
                                      
                                      return (
                                        <div key={size} className="text-center">
                                          <span className="text-[9px] block opacity-40">S{size}</span>
                                          {isBulkUpdateMode ? (
                                            <input 
                                              type="number"
                                              value={displayStock}
                                              onChange={(e) => {
                                                const val = parseInt(e.target.value) || 0;
                                                setBulkStockData(prev => {
                                                  const productData = prev[product.id] || { 
                                                    stock: { ...product.stock },
                                                    variants: product.variants.map((v: any) => ({ ...v, stock: { ...v.stock } }))
                                                  };
                                                  const updatedVariants = [...productData.variants];
                                                  updatedVariants[vIdx] = {
                                                    ...updatedVariants[vIdx],
                                                    stock: {
                                                      ...updatedVariants[vIdx].stock,
                                                      [size]: val
                                                    }
                                                  };
                                                  return {
                                                    ...prev,
                                                    [product.id]: {
                                                      ...productData,
                                                      variants: updatedVariants
                                                    }
                                                  };
                                                });
                                              }}
                                              className="w-full text-center text-xs font-medium bg-transparent outline-none"
                                            />
                                          ) : (
                                            <span className={`text-xs font-medium ${displayStock < LOW_STOCK_THRESHOLD ? 'text-red-600 font-bold' : ''}`}>
                                              {displayStock}
                                            </span>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'add' && (
            <form onSubmit={handleAddProduct} className="max-w-2xl space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <label className="block text-sm uppercase tracking-widest mb-2 opacity-60">Product Name</label>
                  <input 
                    type="text" 
                    value={newProduct.name}
                    onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                    className="w-full p-4 rounded-2xl border border-brand-primary/10 focus:border-brand-primary outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm uppercase tracking-widest mb-2 opacity-60">Price (₹)</label>
                  <input 
                    type="number" 
                    value={newProduct.price}
                    onChange={(e) => setNewProduct({...newProduct, price: e.target.value === '' ? '' : Number(e.target.value)})}
                    className="w-full p-4 rounded-2xl border border-brand-primary/10 focus:border-brand-primary outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm uppercase tracking-widest mb-2 opacity-60">Rating (0-5)</label>
                  <input 
                    type="number" 
                    step="0.1"
                    min="0"
                    max="5"
                    value={newProduct.rating}
                    onChange={(e) => setNewProduct({...newProduct, rating: Number(e.target.value)})}
                    className="w-full p-4 rounded-2xl border border-brand-primary/10 focus:border-brand-primary outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm uppercase tracking-widest mb-2 opacity-60">Review Count</label>
                  <input 
                    type="number" 
                    value={newProduct.reviewCount}
                    onChange={(e) => setNewProduct({...newProduct, reviewCount: Number(e.target.value)})}
                    className="w-full p-4 rounded-2xl border border-brand-primary/10 focus:border-brand-primary outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm uppercase tracking-widest mb-4 opacity-60">Main Product Images</label>
                <div className="flex flex-wrap gap-4">
                  {newProduct.imageUrls.map((url, idx) => (
                    <div key={idx} className="relative w-32 h-40 rounded-2xl overflow-hidden group">
                      <img src={url} alt={`Preview ${idx}`} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity gap-3">
                        <button 
                          type="button"
                          onClick={() => generateModelPhoto(url)}
                          className="bg-white text-brand-primary p-2 rounded-full hover:bg-brand-secondary transition-colors"
                          title="Generate Model Photo"
                        >
                          <Sparkles size={20} />
                        </button>
                        <button 
                          type="button"
                          onClick={() => {
                            const updated = [...newProduct.imageUrls];
                            updated.splice(idx, 1);
                            setNewProduct({...newProduct, imageUrls: updated});
                          }}
                          className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors"
                          title="Remove Image"
                        >
                          <X size={20} />
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  <label className={`w-32 h-40 rounded-2xl border-2 border-dashed border-brand-primary/20 flex flex-col items-center justify-center cursor-pointer hover:bg-brand-primary/5 transition-colors ${uploading === 'main' ? 'opacity-50 cursor-wait' : ''}`}>
                    <input 
                      type="file" 
                      accept="image/*"
                      multiple
                      className="hidden"
                      disabled={!!uploading}
                      onChange={async (e) => {
                        const files = Array.from(e.target.files || []);
                        if (files.length > 0) {
                          const urls = await uploadFiles(files, 'main');
                          setNewProduct(prev => ({...prev, imageUrls: [...prev.imageUrls, ...urls]}));
                          // Generate model photos from base64 preview (separate from Storage URLs)
                          for (const file of files) {
                            const b64 = await processFile(file);
                            if (b64) generateModelPhoto(b64);
                          }
                        }
                        e.target.value = '';
                      }}
                    />
                    {uploading === 'main' ? (
                      <Loader2 className="animate-spin text-brand-primary" size={24} />
                    ) : (
                      <>
                        <Upload className="text-brand-primary/40 mb-2" size={24} />
                        <span className="text-[10px] uppercase font-bold opacity-40">Upload Images</span>
                      </>
                    )}
                  </label>
                </div>

                {/* Suggested AI Images */}
                {suggestedImages.length > 0 && (
                  <div className="mt-6 p-6 bg-brand-primary/5 rounded-[32px] border-2 border-dashed border-brand-primary/20">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Sparkles className="text-brand-primary" size={18} />
                        <h4 className="font-bold text-sm">AI Suggested Model Photos</h4>
                      </div>
                      <button 
                        type="button"
                        onClick={() => setSuggestedImages([])}
                        className="text-[10px] font-bold text-red-500 hover:opacity-70"
                      >
                        CLEAR ALL
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-4">
                      {suggestedImages.map((url, idx) => (
                        <div key={idx} className="relative w-32 h-40 rounded-2xl overflow-hidden group shadow-md">
                          <img src={url} alt={`Suggested ${idx}`} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity gap-2">
                            <button 
                              type="button"
                              onClick={() => {
                                setNewProduct({...newProduct, imageUrls: [...newProduct.imageUrls, url]});
                                const updated = [...suggestedImages];
                                updated.splice(idx, 1);
                                setSuggestedImages(updated);
                                toast.success('Added to product images');
                              }}
                              className="bg-white text-brand-primary px-3 py-1 rounded-full text-[10px] font-bold hover:bg-brand-secondary"
                            >
                              USE PHOTO
                            </button>
                            <button 
                              type="button"
                              onClick={() => {
                                const updated = [...suggestedImages];
                                updated.splice(idx, 1);
                                setSuggestedImages(updated);
                              }}
                              className="text-white text-[10px] font-bold hover:underline"
                            >
                              DISCARD
                            </button>
                          </div>
                        </div>
                      ))}
                      {isGeneratingModelPhoto && (
                        <div className="w-32 h-40 rounded-2xl border-2 border-brand-primary/10 flex flex-col items-center justify-center bg-white/50">
                          <Loader2 className="animate-spin text-brand-primary mb-2" size={24} />
                          <span className="text-[10px] font-bold opacity-40 text-center px-2">Generating...</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <label className="block text-sm uppercase tracking-widest mb-2 opacity-60">Category</label>
                  <select 
                    value={newProduct.category}
                    onChange={(e) => setNewProduct({...newProduct, category: e.target.value})}
                    className="w-full p-4 rounded-2xl border border-brand-primary/10 focus:border-brand-primary outline-none bg-white"
                  >
                    <option value="">Select Category</option>
                    <option value="Cotton">Cotton</option>
                    <option value="Silk">Silk</option>
                    <option value="Linen">Linen</option>
                    <option value="Festive">Festive</option>
                    <option value="Daily Wear">Daily Wear</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm uppercase tracking-widest mb-2 opacity-60">Color</label>
                  <input 
                    type="text" 
                    value={newProduct.color}
                    onChange={(e) => setNewProduct({...newProduct, color: e.target.value})}
                    className="w-full p-4 rounded-2xl border border-brand-primary/10 focus:border-brand-primary outline-none"
                    placeholder="e.g. Saffron, White, Royal Blue"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm uppercase tracking-widest opacity-60">Description</label>
                  <button
                    type="button"
                    onClick={generateAIDescription}
                    disabled={isGeneratingDescription || !newProduct.name}
                    className="flex items-center gap-2 text-xs font-bold text-brand-primary hover:opacity-70 disabled:opacity-30 transition-opacity"
                  >
                    {isGeneratingDescription ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Sparkles size={14} />
                    )}
                    GENERATE WITH AI
                  </button>
                </div>
                <textarea 
                  value={newProduct.description}
                  onChange={(e) => setNewProduct({...newProduct, description: e.target.value})}
                  className="w-full p-4 rounded-2xl border border-brand-primary/10 focus:border-brand-primary outline-none h-32"
                  required
                />
              </div>

              <div>
                <label className="block text-sm uppercase tracking-widest mb-4 opacity-60">Flash Sale (Optional)</label>
                <div className={`p-6 rounded-[32px] border-2 transition-all ${newProduct.flashSale ? 'border-brand-primary bg-brand-primary/5' : 'border-brand-primary/10 bg-white'}`}>
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${newProduct.flashSale ? 'bg-brand-primary text-white' : 'bg-brand-secondary text-brand-primary'}`}>
                        <Zap size={20} />
                      </div>
                      <div>
                        <h4 className="font-bold">Active Flash Sale</h4>
                        <p className="text-xs text-gray-500">Set a timed discount for this product</p>
                      </div>
                    </div>
                    <button 
                      type="button"
                      onClick={() => {
                        if (newProduct.flashSale) {
                          setNewProduct({...newProduct, flashSale: null});
                        } else {
                          setNewProduct({...newProduct, flashSale: { discount: 10, endTime: '' }});
                        }
                      }}
                      className={`w-12 h-6 rounded-full transition-colors relative ${newProduct.flashSale ? 'bg-brand-primary' : 'bg-gray-200'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${newProduct.flashSale ? 'left-7' : 'left-1'}`} />
                    </button>
                  </div>

                  {newProduct.flashSale && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-brand-primary/10">
                      <div>
                        <label className="block text-[10px] uppercase tracking-widest opacity-40 mb-2 font-bold">Discount Percentage (%)</label>
                        <input 
                          type="number"
                          value={newProduct.flashSale.discount}
                          onChange={(e) => setNewProduct({
                            ...newProduct, 
                            flashSale: { ...newProduct.flashSale!, discount: Number(e.target.value) }
                          })}
                          className="w-full p-3 rounded-xl border border-brand-primary/10 focus:border-brand-primary outline-none text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase tracking-widest opacity-40 mb-2 font-bold">End Time</label>
                        <input 
                          type="datetime-local"
                          value={newProduct.flashSale.endTime instanceof Date ? newProduct.flashSale.endTime.toISOString().slice(0, 16) : newProduct.flashSale.endTime}
                          onChange={(e) => setNewProduct({
                            ...newProduct, 
                            flashSale: { ...newProduct.flashSale!, endTime: new Date(e.target.value) }
                          })}
                          className="w-full p-3 rounded-xl border border-brand-primary/10 focus:border-brand-primary outline-none text-sm"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm uppercase tracking-widest mb-4 opacity-60">Sizes & Main Stock</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[38, 40, 42, 44, 46].map((size) => {
                    const isSelected = newProduct.sizes.includes(size);
                    return (
                      <div key={size} className={`p-4 rounded-2xl border transition-all ${isSelected ? 'border-brand-primary bg-brand-primary/5' : 'border-brand-primary/10 bg-white'}`}>
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-bold">Size {size}</span>
                          <input 
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              let updatedSizes = [...newProduct.sizes];
                              let updatedStock = { ...newProduct.stock };
                              if (e.target.checked) {
                                if (!updatedSizes.includes(size)) updatedSizes.push(size);
                                if (!(size in updatedStock)) updatedStock[size as unknown as keyof typeof updatedStock] = 0;
                              } else {
                                updatedSizes = updatedSizes.filter(s => s !== size);
                                delete updatedStock[size as unknown as keyof typeof updatedStock];
                              }
                              setNewProduct({ ...newProduct, sizes: updatedSizes.sort((a, b) => a - b), stock: updatedStock });
                            }}
                            className="w-5 h-5 rounded border-brand-primary/20 text-brand-primary focus:ring-brand-primary"
                          />
                        </div>
                        {isSelected && (
                          <input 
                            type="number"
                            placeholder="Stock"
                            value={newProduct.stock[size as unknown as keyof typeof newProduct.stock] || 0}
                            onChange={(e) => {
                              const updatedStock = { ...newProduct.stock, [size]: Number(e.target.value) };
                              setNewProduct({ ...newProduct, stock: updatedStock });
                            }}
                            className="w-full p-2 rounded-xl border border-brand-primary/10 focus:border-brand-primary outline-none text-sm"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-4">
                  <label className="block text-sm uppercase tracking-widest opacity-60">Variants (Colors/Patterns)</label>
                  <button 
                    type="button"
                    onClick={() => {
                      const initialVariantStock: Record<string, number> = {};
                      newProduct.sizes.forEach(size => {
                        initialVariantStock[size] = 0;
                      });
                      setNewProduct({
                        ...newProduct,
                        variants: [...newProduct.variants, { 
                          name: '', 
                          color: '#000000',
                          stock: initialVariantStock, 
                          imageUrls: [] 
                        }]
                      });
                    }}
                    className="text-brand-primary text-sm font-bold flex items-center gap-1 hover:opacity-70"
                  >
                    <Plus size={16} /> ADD VARIANT
                  </button>
                </div>
                
                <div className="space-y-6">
                  {newProduct.variants.map((variant, vIdx) => (
                    <div key={vIdx} className="p-6 bg-brand-secondary/50 rounded-3xl border border-brand-primary/5 relative">
                      <button 
                        type="button"
                        onClick={() => {
                          const updated = [...newProduct.variants];
                          updated.splice(vIdx, 1);
                          setNewProduct({...newProduct, variants: updated});
                        }}
                        className="absolute top-4 right-4 text-red-500 hover:opacity-70"
                      >
                        <X size={18} />
                      </button>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                        <div>
                          <label className="block text-[10px] uppercase tracking-widest mb-1 opacity-60">Variant Name</label>
                          <input 
                            type="text" 
                            value={variant.name}
                            onChange={(e) => {
                              const updated = [...newProduct.variants];
                              updated[vIdx].name = e.target.value;
                              setNewProduct({...newProduct, variants: updated});
                            }}
                            className="w-full p-3 rounded-xl border border-brand-primary/10 focus:border-brand-primary outline-none text-sm"
                            placeholder="e.g. Saffron"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase tracking-widest mb-1 opacity-60">Color Swatch</label>
                          <div className="flex gap-2">
                            <input 
                              type="color" 
                              value={variant.color || '#000000'}
                              onChange={(e) => {
                                const updated = [...newProduct.variants];
                                updated[vIdx].color = e.target.value;
                                setNewProduct({...newProduct, variants: updated});
                              }}
                              className="w-12 h-11 p-1 rounded-xl border border-brand-primary/10 cursor-pointer bg-white"
                            />
                            <input 
                              type="text" 
                              value={variant.color || '#000000'}
                              onChange={(e) => {
                                const updated = [...newProduct.variants];
                                updated[vIdx].color = e.target.value;
                                setNewProduct({...newProduct, variants: updated});
                              }}
                              className="flex-grow p-3 rounded-xl border border-brand-primary/10 focus:border-brand-primary outline-none text-sm font-mono"
                              placeholder="#HEX"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase tracking-widest mb-1 opacity-60">Variant Images</label>
                          <div className="flex flex-wrap gap-3">
                            {variant.imageUrls.map((url, imgIdx) => (
                              <div key={imgIdx} className="relative w-12 h-16 rounded-lg overflow-hidden group">
                                <img src={url} alt={`Variant Preview ${imgIdx}`} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity gap-1">
                                  <button 
                                    type="button"
                                    onClick={() => generateModelPhoto(url)}
                                    className="text-white hover:text-brand-secondary"
                                    title="Generate Model Photo"
                                  >
                                    <Sparkles size={12} />
                                  </button>
                                  <button 
                                    type="button"
                                    onClick={() => {
                                      const updated = [...newProduct.variants];
                                      const updatedImages = [...updated[vIdx].imageUrls];
                                      updatedImages.splice(imgIdx, 1);
                                      updated[vIdx].imageUrls = updatedImages;
                                      setNewProduct({...newProduct, variants: updated});
                                    }}
                                    className="text-white hover:text-red-500"
                                    title="Remove Image"
                                  >
                                    <X size={12} />
                                  </button>
                                </div>
                              </div>
                            ))}
                            
                            <label className={`w-12 h-16 rounded-lg border-2 border-dashed border-brand-primary/20 flex flex-col items-center justify-center cursor-pointer hover:bg-brand-primary/5 transition-colors ${uploading === `variant-${vIdx}` ? 'opacity-50 cursor-wait' : ''}`}>
                              <input 
                                type="file" 
                                accept="image/*"
                                multiple
                                className="hidden"
                                disabled={!!uploading}
                                onChange={async (e) => {
                                  const files = Array.from(e.target.files || []);
                                  if (files.length > 0) {
                                    const urls = await uploadFiles(files, `variant-${vIdx}`);
                                    const updated = [...newProduct.variants];
                                    updated[vIdx].imageUrls = [...updated[vIdx].imageUrls, ...urls];
                                    setNewProduct(prev => ({...prev, variants: updated}));
                                    for (const file of files) {
                                      const b64 = await processFile(file);
                                      if (b64) generateModelPhoto(b64);
                                    }
                                  }
                                  e.target.value = '';
                                }}
                              />
                              {uploading === `variant-${vIdx}` ? (
                                <Loader2 className="animate-spin text-brand-primary" size={14} />
                              ) : (
                                <Upload className="text-brand-primary/40" size={14} />
                              )}
                            </label>
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] uppercase tracking-widest mb-3 opacity-60">Variant Stock</label>
                        <div className="grid grid-cols-4 gap-3">
                          {newProduct.sizes.map((size) => (
                            <div key={size}>
                              <span className="text-[9px] block mb-1 opacity-40">Size {size}</span>
                              <input 
                                type="number" 
                                value={variant.stock[size as unknown as keyof typeof variant.stock] || 0}
                                onChange={(e) => {
                                  const updated = [...newProduct.variants];
                                  updated[vIdx].stock = { ...updated[vIdx].stock, [size]: Number(e.target.value) };
                                  setNewProduct({...newProduct, variants: updated});
                                }}
                                className="w-full p-2 rounded-lg border border-brand-primary/10 focus:border-brand-primary outline-none text-xs"
                              />
                            </div>
                          ))}
                        </div>
                        {newProduct.sizes.length === 0 && (
                          <p className="text-[10px] text-red-500 opacity-60 italic">Please select main sizes first</p>
                        )}
                      </div>
                    </div>
                  ))}
                  {newProduct.variants.length === 0 && (
                    <p className="text-center py-8 text-sm text-gray-400 border-2 border-dashed border-brand-primary/10 rounded-3xl">
                      No variants added. The main stock will be used.
                    </p>
                  )}
                </div>
              </div>

              <button 
                type="submit" 
                disabled={loading || !!uploading}
                className="btn-primary w-full py-5 text-lg flex items-center justify-center gap-3"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={24} />
                    {editingProduct ? 'UPDATING...' : 'ADDING...'}
                  </>
                ) : (
                  editingProduct ? 'UPDATE PRODUCT' : 'ADD PRODUCT TO CATALOG'
                )}
              </button>
              {editingProduct && (
                <button 
                  type="button" 
                  onClick={() => {
                    setEditingProduct(null);
                    setNewProduct({
                      name: '',
                      description: '',
                      price: '' as any,
                      category: '',
                      color: '',
                      sizes: [],
                      stock: {},
                      imageUrls: [],
                      variants: [],
                      flashSale: null,
                      rating: 4.5,
                      reviewCount: 0
                    });
                  }}
                  className="w-full py-2 text-sm opacity-60 hover:opacity-100"
                >
                  Cancel Editing
                </button>
              )}
            </form>
          )}

            {activeTab === 'channels' && (
              <div className="space-y-12">
                <div>
                  <h2 className="text-3xl font-serif mb-4">Multi-Channel Selling</h2>
                  <p className="text-gray-500">Sync your Haridwar-crafted collection across global marketplaces and social platforms.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Meta / Instagram / Facebook */}
                  <div className="p-8 border border-brand-primary/10 rounded-[40px] bg-brand-secondary/10">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center text-white">
                        <Instagram size={24} />
                      </div>
                      <div>
                        <h3 className="font-bold text-xl">Meta Catalog (Instagram/FB)</h3>
                        <p className="text-xs opacity-60">Sync products to Instagram & Facebook Shops</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="p-4 bg-white rounded-2xl border border-brand-primary/5">
                        <label className="block text-[10px] uppercase tracking-widest mb-2 opacity-40 font-bold">Product Feed URL</label>
                        <div className="flex gap-2">
                          <input 
                            readOnly 
                            value={`${window.location.origin}/api/products/feed`}
                            className="flex-grow bg-transparent text-sm font-mono outline-none"
                          />
                          <button 
                            onClick={() => {
                              navigator.clipboard.writeText(`${window.location.origin}/api/products/feed`);
                              toast.success('Feed URL copied!');
                            }}
                            className="p-2 hover:bg-brand-primary/10 text-brand-primary rounded-lg"
                          >
                            <Copy size={16} />
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 italic">Copy this URL to your Meta Commerce Manager to enable automated product syncing.</p>
                      <button className="btn-primary w-full py-3 text-sm">OPEN COMMERCE MANAGER</button>
                    </div>
                  </div>

                  {/* Amazon Integration */}
                  <div className="p-8 border border-brand-primary/10 rounded-[40px] bg-brand-secondary/10">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-12 h-12 rounded-2xl bg-[#FF9900] flex items-center justify-center text-white">
                        <ShoppingCart size={24} />
                      </div>
                      <div>
                        <h3 className="font-bold text-xl">Amazon Integration</h3>
                        <p className="text-xs opacity-60">Sync inventory with Amazon Seller Central</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-brand-primary/5">
                        <span className="text-sm font-medium">Sync Status</span>
                        <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-[10px] font-bold uppercase">Pending Setup</span>
                      </div>
                      <div className="p-4 bg-white rounded-2xl border border-brand-primary/5">
                        <label className="block text-[10px] uppercase tracking-widest mb-2 opacity-40 font-bold">Amazon Region</label>
                        <select className="w-full bg-transparent text-sm outline-none">
                          <option>India (amazon.in)</option>
                          <option>USA (amazon.com)</option>
                          <option>UK (amazon.co.uk)</option>
                        </select>
                      </div>
                      <button className="btn-secondary w-full py-3 text-sm flex items-center justify-center gap-2">
                        <ExternalLink size={16} /> CONNECT SELLER CENTRAL
                      </button>
                    </div>
                  </div>

                  {/* WhatsApp Selling */}
                  <div className="p-8 border border-brand-primary/10 rounded-[40px] bg-brand-secondary/10">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-12 h-12 rounded-2xl bg-[#25D366] flex items-center justify-center text-white">
                        <MessageCircle size={24} />
                      </div>
                      <div>
                        <h3 className="font-bold text-xl">WhatsApp Selling</h3>
                        <p className="text-xs opacity-60">Direct sales via WhatsApp Business</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="p-4 bg-white rounded-2xl border border-brand-primary/5">
                        <label className="block text-[10px] uppercase tracking-widest mb-2 opacity-40 font-bold">WhatsApp Number</label>
                        <input 
                          type="text" 
                          defaultValue="+91 91214 85927"
                          className="w-full bg-transparent text-sm outline-none"
                        />
                      </div>
                      <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-brand-primary/5">
                        <span className="text-sm font-medium">"Buy on WhatsApp" Button</span>
                        <div className="w-10 h-5 bg-brand-primary rounded-full relative">
                          <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full" />
                        </div>
                      </div>
                      <p className="text-xs text-gray-500">Enables a direct purchase button on all product pages that opens a pre-filled chat.</p>
                    </div>
                  </div>

                  {/* Google Merchant Center */}
                  <div className="p-8 border border-brand-primary/10 rounded-[40px] bg-brand-secondary/10">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-12 h-12 rounded-2xl bg-white border border-gray-100 flex items-center justify-center">
                        <Globe size={24} className="text-blue-500" />
                      </div>
                      <div>
                        <h3 className="font-bold text-xl">Google Shopping</h3>
                        <p className="text-xs opacity-60">List products on Google Search & Shopping</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-brand-primary/5">
                        <span className="text-sm font-medium">Feed Status</span>
                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-[10px] font-bold uppercase">Active</span>
                      </div>
                      <p className="text-xs text-gray-500">Your product feed is automatically optimized for Google Merchant Center. Use the same feed URL as Meta Catalog.</p>
                      <button className="btn-primary w-full py-3 text-sm">VIEW GOOGLE MERCHANT CENTER</button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'analytics' && (
              <div className="space-y-12">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Views vs Add to Carts vs Purchases */}
                  <div className="p-8 border border-brand-primary/10 rounded-[40px] bg-white">
                    <h3 className="text-2xl mb-8 font-serif">Product Performance</h3>
                    <div className="h-[400px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={products.slice(0, 10).map(p => {
                            const purchases = orders.reduce((acc, order) => {
                              const items = order.items || [];
                              const count = items.filter((item: any) => item.productId === p.id).reduce((sum: number, item: any) => sum + item.quantity, 0);
                              return acc + count;
                            }, 0);
                            return {
                              name: p.name.split(' ').slice(0, 2).join(' '),
                              views: p.views || 0,
                              addToCarts: p.addToCarts || 0,
                              purchases: purchases
                            };
                          })}
                          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                          <Tooltip 
                            contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}
                          />
                          <Legend verticalAlign="top" height={36}/>
                          <Bar dataKey="views" fill="#B71C1C" radius={[4, 4, 0, 0]} name="Views" />
                          <Bar dataKey="addToCarts" fill="#C2185B" radius={[4, 4, 0, 0]} name="Add to Carts" />
                          <Bar dataKey="purchases" fill="#E65100" radius={[4, 4, 0, 0]} name="Purchases" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Conversion Rates */}
                  <div className="p-8 border border-brand-primary/10 rounded-[40px] bg-white">
                    <h3 className="text-2xl mb-8 font-serif">Conversion Funnel</h3>
                    <div className="space-y-8">
                      {products.slice(0, 5).map(p => {
                        const views = p.views || 1; // Avoid division by zero
                        const addToCarts = p.addToCarts || 0;
                        const purchases = orders.reduce((acc, order) => {
                          const items = order.items || [];
                          const count = items.filter((item: any) => item.productId === p.id).reduce((sum: number, item: any) => sum + item.quantity, 0);
                          return acc + count;
                        }, 0);
                        
                        const cartRate = ((addToCarts / views) * 100).toFixed(1);
                        const purchaseRate = ((purchases / views) * 100).toFixed(1);

                        return (
                          <div key={p.id} className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="font-medium">{p.name}</span>
                              <span className="opacity-60">{purchaseRate}% Conversion</span>
                            </div>
                            <div className="relative h-4 bg-brand-secondary rounded-full overflow-hidden">
                              <div 
                                className="absolute left-0 top-0 h-full bg-brand-primary/20"
                                style={{ width: '100%' }}
                              />
                              <div 
                                className="absolute left-0 top-0 h-full bg-brand-rani/40"
                                style={{ width: `${Math.min(100, (addToCarts / views) * 100)}%` }}
                              />
                              <div 
                                className="absolute left-0 top-0 h-full bg-brand-primary"
                                style={{ width: `${Math.min(100, (purchases / views) * 100)}%` }}
                              />
                            </div>
                            <div className="flex gap-4 text-[10px] uppercase tracking-widest opacity-40">
                              <span>Views: {views}</span>
                              <span>ATC: {addToCarts} ({cartRate}%)</span>
                              <span>Bought: {purchases}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Top Selling Products Pie Chart */}
                <div className="p-8 border border-brand-primary/10 rounded-[40px] bg-white">
                  <h3 className="text-2xl mb-8 font-serif">Sales Distribution</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={products.map(p => {
                              const sales = orders.reduce((acc, order) => {
                                const items = order.items || [];
                                return acc + items.filter((item: any) => item.productId === p.id).reduce((sum: number, item: any) => sum + item.quantity, 0);
                              }, 0);
                              return { name: p.name, value: sales };
                            }).filter(d => d.value > 0).sort((a, b) => b.value - a.value).slice(0, 5)}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {products.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={['#B71C1C', '#C2185B', '#E65100', '#006064', '#D4AF37'][index % 5]} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="space-y-4">
                      <h4 className="text-sm font-bold uppercase tracking-widest opacity-40">Insights</h4>
                      <ul className="space-y-3 text-sm">
                        <li className="flex gap-3">
                          <div className="w-5 h-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center flex-shrink-0">✓</div>
                          <p>Most customers are viewing <strong>{products.sort((a, b) => (b.views || 0) - (a.views || 0))[0]?.name}</strong>, but conversion is highest on <strong>{products.sort((a, b) => {
                            const aRate = (orders.reduce((acc, o) => acc + (o.items?.filter((i:any) => i.productId === a.id).length || 0), 0)) / (a.views || 1);
                            const bRate = (orders.reduce((acc, o) => acc + (o.items?.filter((i:any) => i.productId === b.id).length || 0), 0)) / (b.views || 1);
                            return bRate - aRate;
                          })[0]?.name}</strong>.</p>
                        </li>
                        <li className="flex gap-3">
                          <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">i</div>
                          <p>Average Add-to-Cart rate across all products is <strong>{((products.reduce((acc, p) => acc + (p.addToCarts || 0), 0) / products.reduce((acc, p) => acc + (p.views || 1), 0)) * 100).toFixed(1)}%</strong>.</p>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Predictive Inventory Alerts */}
                <div className="p-8 border border-brand-primary/10 rounded-[40px] bg-white">
                  <div className="flex items-center gap-3 mb-8">
                    <Zap className="text-brand-primary" size={24} />
                    <h3 className="text-2xl font-serif">Predictive Inventory Alerts</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {products.map(p => {
                      // Calculate total stock
                      const totalStock = Object.values(p.stock || {}).reduce((a: any, b: any) => a + b, 0) as number;
                      
                      // Calculate sales in last 30 days
                      const thirtyDaysAgo = new Date();
                      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                      
                      const recentSales = orders.filter(o => {
                        const orderDate = o.createdAt?.toDate ? o.createdAt.toDate() : new Date(o.createdAt);
                        return orderDate > thirtyDaysAgo;
                      }).reduce((acc, order) => {
                        const items = order.items || [];
                        return acc + items.filter((item: any) => item.productId === p.id).reduce((sum: number, item: any) => sum + item.quantity, 0);
                      }, 0) as number;

                      const velocity = recentSales / 30; // sales per day
                      const daysRemaining = velocity > 0 ? Math.floor(totalStock / velocity) : Infinity;

                      if (daysRemaining > 30 && totalStock > 10) return null;

                      return (
                        <div key={p.id} className={`p-6 rounded-3xl border ${daysRemaining < 7 ? 'bg-red-50 border-red-100' : 'bg-orange-50 border-orange-100'}`}>
                          <div className="flex justify-between items-start mb-4">
                            <h4 className="font-bold text-sm line-clamp-1">{p.name}</h4>
                            <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase ${daysRemaining < 7 ? 'bg-red-200 text-red-700' : 'bg-orange-200 text-orange-700'}`}>
                              {daysRemaining === Infinity ? 'No Sales' : `${daysRemaining} Days Left`}
                            </span>
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between text-xs">
                              <span className="opacity-60">Current Stock</span>
                              <span className="font-bold">{totalStock} units</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="opacity-60">Sales Velocity</span>
                              <span className="font-bold">{velocity.toFixed(2)} / day</span>
                            </div>
                          </div>
                          {daysRemaining < 14 && (
                            <button className="w-full mt-4 py-2 bg-white border border-current text-[10px] font-bold rounded-xl hover:bg-brand-primary hover:text-white transition-colors">
                              REORDER NOW
                            </button>
                          )}
                        </div>
                      );
                    }).filter(Boolean).slice(0, 6)}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'seo' && (
              <div className="space-y-8">
                <div className="flex justify-between items-center mb-8">
                  <div>
                    <h2 className="text-3xl font-serif mb-2">Automated SEO Optimizer</h2>
                    <p className="text-gray-500">Use AI to optimize your product titles and descriptions for search engines.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  {products.map(product => (
                    <div key={product.id} className="p-8 border border-brand-primary/10 rounded-[40px] bg-white hover:shadow-xl transition-all duration-500">
                      <div className="flex flex-col md:flex-row gap-8">
                        <div className="w-full md:w-48 h-48 rounded-3xl overflow-hidden flex-shrink-0">
                          <img 
                            src={product.imageUrls?.[0] || "/images/haridwar-2.jpg"} 
                            alt={product.name} 
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div className="flex-grow space-y-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="text-xl font-bold text-brand-primary">{product.name}</h3>
                              <p className="text-sm opacity-60 mt-1">{product.category}</p>
                            </div>
                            <button
                              onClick={() => generateSEOSuggestions(product)}
                              disabled={seoOptimizingId === product.id}
                              className="flex items-center gap-2 px-6 py-3 bg-brand-primary text-white rounded-2xl hover:bg-brand-primary/90 transition-all disabled:opacity-50"
                            >
                              {seoOptimizingId === product.id ? (
                                <Loader2 size={18} className="animate-spin" />
                              ) : (
                                <Sparkles size={18} />
                              )}
                              OPTIMIZE SEO
                            </button>
                          </div>

                          {seoSuggestions[product.id] ? (
                            <motion.div 
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="p-6 bg-brand-secondary/30 rounded-3xl border border-brand-primary/10 space-y-4"
                            >
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                  <h4 className="text-xs font-bold uppercase tracking-widest opacity-40 mb-2">Suggested Title</h4>
                                  <p className="text-sm font-medium">{seoSuggestions[product.id].optimizedTitle}</p>
                                </div>
                                <div>
                                  <h4 className="text-xs font-bold uppercase tracking-widest opacity-40 mb-2">Suggested Keywords</h4>
                                  <div className="flex flex-wrap gap-2">
                                    {seoSuggestions[product.id].keywords.map((kw: string, i: number) => (
                                      <span key={i} className="px-2 py-1 bg-white text-[10px] rounded-lg border border-brand-primary/10">{kw}</span>
                                    ))}
                                  </div>
                                </div>
                              </div>
                              <div>
                                <h4 className="text-xs font-bold uppercase tracking-widest opacity-40 mb-2">Suggested Description</h4>
                                <p className="text-sm leading-relaxed opacity-80">{seoSuggestions[product.id].optimizedDescription}</p>
                              </div>
                              <div className="flex justify-end gap-4 pt-4">
                                <button 
                                  onClick={() => setSeoSuggestions(prev => {
                                    const next = { ...prev };
                                    delete next[product.id];
                                    return next;
                                  })}
                                  className="px-6 py-2 text-sm font-bold opacity-60 hover:opacity-100"
                                >
                                  DISCARD
                                </button>
                                <button 
                                  onClick={() => applySEOSuggestions(product.id)}
                                  className="px-6 py-2 bg-brand-primary text-white text-sm font-bold rounded-xl hover:bg-brand-primary/90"
                                >
                                  APPLY UPDATES
                                </button>
                              </div>
                            </motion.div>
                          ) : (
                            <p className="text-sm opacity-60 line-clamp-2">{product.description}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'reports' && (
            <div className="space-y-12">
              {/* Debug Section */}
              <div className="p-6 bg-blue-50 border border-blue-200 rounded-3xl mb-8">
                <h4 className="text-sm font-bold text-blue-800 uppercase tracking-widest mb-4">System Status (Debug)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="flex justify-between p-2 bg-white rounded-lg">
                    <span className="opacity-60">User Email:</span>
                    <span className="font-mono">{user?.email || 'Not logged in'}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-white rounded-lg">
                    <span className="opacity-60">Admin Status:</span>
                    <span className={`font-bold ${isAdmin ? 'text-green-600' : 'text-red-600'}`}>{isAdmin ? 'VERIFIED ADMIN' : 'NOT ADMIN'}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-white rounded-lg">
                    <span className="opacity-60">Auth Ready:</span>
                    <span>{user ? 'YES' : 'NO'}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-white rounded-lg">
                    <span className="opacity-60">Firestore DB:</span>
                    <span className="font-mono">{(db as any).databaseId || 'default'}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="p-8 bg-brand-secondary rounded-[32px]">
                  <h4 className="text-sm uppercase tracking-widest opacity-60 mb-2">Total Revenue</h4>
                  <p className="text-4xl font-serif text-brand-primary">₹ {orders.reduce((acc, o) => acc + o.totalAmount, 0).toLocaleString()}</p>
                </div>
                <div className="p-8 bg-brand-secondary rounded-[32px]">
                  <h4 className="text-sm uppercase tracking-widest opacity-60 mb-2">Total Orders</h4>
                  <p className="text-4xl font-serif text-brand-primary">{orders.length}</p>
                </div>
                <div className="p-8 bg-brand-secondary rounded-[32px]">
                  <h4 className="text-sm uppercase tracking-widest opacity-60 mb-2">Total Products</h4>
                  <p className="text-4xl font-serif text-brand-primary">{products.length}</p>
                </div>
              </div>
              
              <div className="p-8 border border-brand-primary/10 rounded-[40px]">
                <h3 className="text-2xl mb-8 font-serif">Inventory Health</h3>
                <div className="space-y-6">
                  {products.map(p => {
                    const totalStock = Object.values(p.stock).reduce((a: any, b: any) => a + b, 0) as number;
                    return (
                      <div key={p.id}>
                        <div className="flex justify-between mb-2">
                          <span className="font-medium">{p.name}</span>
                          <span className="text-sm opacity-60">{totalStock} units left</span>
                        </div>
                        <div className="w-full h-2 bg-brand-secondary rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all ${totalStock < 10 ? 'bg-red-500' : 'bg-brand-primary'}`}
                            style={{ width: `${Math.min(100, (totalStock / 50) * 100)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>

    {/* Order Details Modal */}
      <AnimatePresence>
        {selectedOrderForDetails && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setSelectedOrderForDetails(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white max-w-2xl w-full rounded-[48px] shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-10">
                <div className="flex justify-between items-center mb-10">
                  <div>
                    <h2 className="text-3xl font-serif mb-2">Order Details</h2>
                    <p className="text-sm opacity-60 font-mono">#{selectedOrderForDetails.id}</p>
                  </div>
                  <button 
                    onClick={() => setSelectedOrderForDetails(null)}
                    className="w-12 h-12 rounded-full bg-brand-secondary flex items-center justify-center hover:bg-brand-primary/10 transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>

                <div className="space-y-10">
                  {/* Items Section */}
                  <div>
                    <h3 className="text-xs uppercase tracking-widest mb-6 opacity-40 font-bold">Ordered Items</h3>
                    <div className="space-y-4">
                      {selectedOrderForDetails.items.map((item: any, idx: number) => (
                        <div key={idx} className="flex items-center gap-6 p-4 bg-brand-secondary/30 rounded-3xl border border-brand-primary/5">
                          <div className="w-16 h-20 rounded-xl overflow-hidden bg-white shadow-sm">
                            <img 
                              src={item.image || "/images/haridwar-2.jpg"} 
                              alt={item.name} 
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                          <div className="flex-grow">
                            <h4 className="font-bold">{item.name}</h4>
                            <p className="text-sm opacity-60">Size: {item.size} {item.variantName ? `| Variant: ${item.variantName}` : ''}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold">₹ {item.price.toLocaleString()}</p>
                            <p className="text-sm opacity-60">Qty: {item.quantity}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Shipping & Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10 pt-10 border-t border-brand-primary/10">
                    <div>
                      <h3 className="text-xs uppercase tracking-widest mb-4 opacity-40 font-bold">Shipping Address</h3>
                      <p className="text-gray-600 leading-relaxed mb-6">
                        {selectedOrderForDetails.shippingAddress || "No address provided."}
                      </p>
                      
                      <div className="pt-6 border-t border-brand-primary/5">
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="text-xs uppercase tracking-widest opacity-40 font-bold">Delivery Option</h3>
                          {!isEditingShipping && selectedOrderForDetails.status === 'pending' && (
                            <button 
                              onClick={() => {
                                setIsEditingShipping(true);
                                setEditingShippingData({
                                  option: selectedOrderForDetails.deliveryOption || 'Standard',
                                  fee: selectedOrderForDetails.shippingFee || 0
                                });
                              }}
                              className="text-[10px] font-bold text-brand-primary hover:underline"
                            >
                              EDIT
                            </button>
                          )}
                        </div>
                        
                        {isEditingShipping ? (
                          <div className="space-y-4 bg-brand-secondary/50 p-4 rounded-2xl">
                            <div className="grid grid-cols-2 gap-3">
                              {DELIVERY_OPTIONS.map(opt => (
                                <button
                                  key={opt.name}
                                  onClick={() => setEditingShippingData({ ...editingShippingData, option: opt.name, fee: opt.cost })}
                                  className={cn(
                                    "px-3 py-2 rounded-xl text-[10px] font-bold transition-all",
                                    editingShippingData.option === opt.name 
                                      ? "bg-brand-primary text-white shadow-lg" 
                                      : "bg-white text-gray-500 border border-brand-primary/10"
                                  )}
                                >
                                  {opt.name}
                                </button>
                              ))}
                            </div>
                            
                            <div className="flex items-center gap-3">
                              <div className="flex-grow">
                                <label className="text-[9px] uppercase tracking-widest opacity-40 block mb-1">Shipping Cost (₹)</label>
                                <input 
                                  type="number"
                                  value={editingShippingData.fee}
                                  onChange={(e) => setEditingShippingData({ ...editingShippingData, fee: Number(e.target.value) })}
                                  className="w-full bg-white border border-brand-primary/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                                />
                              </div>
                            </div>
                            
                            <div className="flex gap-2">
                              <button 
                                onClick={() => setIsEditingShipping(false)}
                                className="flex-1 py-2 text-[10px] font-bold text-gray-500 hover:bg-gray-100 rounded-xl transition-colors"
                              >
                                CANCEL
                              </button>
                              <button 
                                onClick={() => updateOrderShipping(selectedOrderForDetails.id, editingShippingData.option, editingShippingData.fee)}
                                className="flex-1 py-2 text-[10px] font-bold bg-brand-primary text-white rounded-xl shadow-lg hover:opacity-90 transition-opacity"
                              >
                                SAVE
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between p-4 bg-brand-secondary/30 rounded-2xl border border-brand-primary/5">
                            <div>
                              <p className="font-bold text-sm">{selectedOrderForDetails.deliveryOption || 'Standard'}</p>
                              <p className="text-[10px] opacity-60 uppercase tracking-widest">Delivery Method</p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-sm text-brand-primary">₹ {(selectedOrderForDetails.shippingFee || 0).toLocaleString()}</p>
                              <p className="text-[10px] opacity-60 uppercase tracking-widest">Cost</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="bg-brand-secondary p-6 rounded-3xl">
                      <h3 className="text-xs uppercase tracking-widest mb-4 opacity-40 font-bold">Order Summary</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Subtotal</span>
                          <span>₹ {(selectedOrderForDetails.subtotal || (selectedOrderForDetails.totalAmount - (selectedOrderForDetails.shippingFee || 0))).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Shipping</span>
                          <span>₹ {(selectedOrderForDetails.shippingFee || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between pt-4 border-t border-brand-primary/10 font-bold text-lg">
                          <span>Total</span>
                          <span className="text-brand-primary">₹ {selectedOrderForDetails.totalAmount.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Shipping Info if Shipped */}
                  {selectedOrderForDetails.trackingId && (
                    <div className="p-6 bg-brand-primary/5 rounded-3xl border border-brand-primary/10 flex flex-wrap gap-8">
                      <div>
                        <h4 className="text-[10px] uppercase tracking-widest opacity-40 mb-1 font-bold">Courier Partner</h4>
                        <p className="font-bold">{selectedOrderForDetails.courierPartner}</p>
                      </div>
                      <div>
                        <h4 className="text-[10px] uppercase tracking-widest opacity-40 mb-1 font-bold">Tracking ID</h4>
                        <p className="font-mono font-bold text-brand-primary">{selectedOrderForDetails.trackingId}</p>
                      </div>
                      <div className="flex-grow text-right">
                        <a 
                          href={selectedOrderForDetails.labelUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs font-bold text-brand-primary hover:underline flex items-center justify-end gap-2"
                        >
                          <Upload size={14} className="rotate-180" /> VIEW SHIPPING LABEL
                        </a>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-12 flex gap-4">
                  <button 
                    onClick={() => setSelectedOrderForDetails(null)}
                    className="btn-secondary flex-grow py-4"
                  >
                    CLOSE
                  </button>
                  {selectedOrderForDetails.status === 'pending' && (
                    <button 
                      onClick={() => handleShipOrder(selectedOrderForDetails)}
                      disabled={shippingLoading}
                      className="btn-primary flex-grow py-4 flex items-center justify-center gap-2"
                    >
                      {shippingLoading ? (
                        <Loader2 className="animate-spin" size={18} />
                      ) : (
                        <Truck size={18} />
                      )}
                      {shippingLoading ? 'CREATING SHIPMENT...' : 'CREATE SHIPMENT & SHIP'}
                    </button>
                  )}
                  {selectedOrderForDetails.status === 'shipped' && (
                    <div className="flex flex-col gap-4 flex-grow">
                      <button 
                        onClick={() => {
                          updateOrderStatus(selectedOrderForDetails.id, 'delivered');
                          setSelectedOrderForDetails(null);
                        }}
                        className="btn-primary w-full py-4 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700"
                      >
                        <PackageCheck size={18} /> MARK AS DELIVERED
                      </button>
                      <Link 
                        to={`/track-order?id=${selectedOrderForDetails.id}`}
                        className="btn-secondary w-full py-4 flex items-center justify-center gap-2"
                      >
                        <MapPin size={18} /> TRACK SHIPMENT
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Product"
        message={`Are you sure you want to delete "${productToDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />
    </div>
  );
}
