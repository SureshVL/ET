import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { motion } from 'motion/react';
import { Instagram, Heart, MessageCircle } from 'lucide-react';

interface UGCItem {
  id: string;
  imageUrl: string;
  userName: string;
  caption: string;
  createdAt: any;
}

export default function UGCGallery() {
  const [items, setItems] = useState<UGCItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUGC = async () => {
      try {
        const q = query(
          collection(db, 'ugc'),
          where('status', '==', 'approved'),
          orderBy('createdAt', 'desc'),
          limit(8)
        );
        const snapshot = await getDocs(q);
        const ugcData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as UGCItem[];
        setItems(ugcData);
      } catch (error) {
        console.error("Error fetching UGC:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUGC();
  }, []);

  if (loading) return null;
  if (items.length === 0) return null;

  return (
    <section className="py-24 bg-white overflow-hidden">
      <div className="container-custom">
        <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-8">
          <div className="max-w-2xl">
            <h2 className="text-5xl mb-6 font-serif">Worn by the World</h2>
            <p className="text-gray-500 text-lg">
              Our community of seekers and explorers wearing Devaragudi. Share your journey with #DevaragudiThreads.
            </p>
          </div>
          <a 
            href="https://instagram.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-brand-primary font-bold tracking-widest text-sm hover:opacity-70 transition-opacity"
          >
            <Instagram size={20} /> FOLLOW ON INSTAGRAM
          </a>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
          {items.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              viewport={{ once: true }}
              className="group relative aspect-square rounded-[32px] overflow-hidden bg-brand-secondary"
            >
              <img 
                src={item.imageUrl} 
                alt={item.caption}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6 text-white">
                <p className="text-sm font-medium mb-2">@{item.userName}</p>
                <p className="text-xs line-clamp-2 opacity-80 mb-4">{item.caption}</p>
                <div className="flex gap-4">
                  <div className="flex items-center gap-1 text-[10px]">
                    <Heart size={12} fill="currentColor" /> {Math.floor(Math.random() * 500) + 100}
                  </div>
                  <div className="flex items-center gap-1 text-[10px]">
                    <MessageCircle size={12} fill="currentColor" /> {Math.floor(Math.random() * 50) + 10}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
