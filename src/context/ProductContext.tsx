import React, { createContext, useContext, useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';

interface Variant {
  name: string;
  color?: string; // Hex code or color name
  imageUrls: string[];
  stock: Record<string, number>;
}

interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
  sizes: number[];
  imageUrls: string[];
  stock: Record<string, number>;
  category?: string;
  color?: string;
  flashSale?: {
    endTime: any;
    discount: number;
  };
  variants?: Variant[];
  images?: string[];
  image?: string;
  createdAt?: any;
  updatedAt?: any;
  rating?: number;
  reviewCount?: number;
  views?: number;
  addToCarts?: number;
}

interface ProductContextType {
  products: Product[];
  loading: boolean;
  refreshProducts: () => Promise<void>;
}

const ProductContext = createContext<ProductContextType>({
  products: [],
  loading: true,
  refreshProducts: async () => {},
});

export const ProductProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastFetched, setLastFetched] = useState<number>(0);

  const fetchProducts = async (force = false) => {
    // Cache for 5 minutes unless forced
    const now = Date.now();
    if (!force && products.length > 0 && now - lastFetched < 5 * 60 * 1000) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const querySnapshot = await getDocs(collection(db, 'products'));
      const prods = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      setProducts(prods);
      setLastFetched(now);
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  return (
    <ProductContext.Provider value={{ products, loading, refreshProducts: () => fetchProducts(true) }}>
      {children}
    </ProductContext.Provider>
  );
};

export const useProducts = () => useContext(ProductContext);
