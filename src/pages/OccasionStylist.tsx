import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Loader2, ChevronRight, ShoppingBag, Info } from 'lucide-react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';

export default function OccasionStylist() {
  const [occasion, setOccasion] = useState('');
  const [preference, setPreference] = useState('');
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [aiResponse, setAiResponse] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'products'));
        setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'products');
      }
    };
    fetchProducts();
  }, []);

  const handleGetRecommendations = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!occasion.trim()) return;

    setLoading(true);
    setRecommendations([]);
    setAiResponse('');
    setError('');

    try {
      const productContext = products.map(p => ({
        id: p.id,
        name: p.name,
        category: p.category,
        price: p.price,
        description: p.description,
        fabric: p.fabric || 'Premium Cotton',
        color: p.color || 'Multicolor',
        isTrending: p.isTrending || false,
        tags: p.tags || []
      }));

      // FIX: Use correct Gemini model name
      const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + import.meta.env.VITE_GEMINI_API_KEY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `You are an expert ethnic wear stylist for "Devaragudi Ethnic Threads", a premium brand from Haridwar.
A customer is looking for an outfit for: "${occasion}".
Their preferences: "${preference || 'None'}".
Available products: ${JSON.stringify(productContext)}

Return ONLY a valid JSON object with:
{
  "stylistAdvice": "one sentence of styling advice",
  "recommendations": [{ "id": "product_id", "reason": "why this suits the occasion" }]
}
Pick 2-3 most relevant products. No markdown, no extra text.`
            }]
          }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 512 }
        })
      });

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

      // Parse response safely
      const clean = text.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(clean);

      setAiResponse(parsed.stylistAdvice || '');

      const recommended = (parsed.recommendations || [])
        .map((rec: any) => {
          const product = products.find(p => p.id === rec.id);
          return product ? { ...product, stylistReason: rec.reason } : null;
        })
        .filter(Boolean);

      setRecommendations(recommended);
    } catch (err: any) {
      console.error('Stylist error:', err);
      setError('Unable to get AI recommendations right now. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="py-24 px-4 max-w-6xl mx-auto">
      <SEO
        title="AI Occasion Stylist | Devaragudi Ethnic Threads"
        description="Get personalised ethnic wear recommendations for any occasion from our AI stylist."
      />

      <div className="text-center mb-16">
        <div className="inline-flex items-center gap-2 px-5 py-2 bg-brand-primary/10 rounded-full text-brand-primary font-bold text-xs uppercase tracking-widest mb-6">
          <Sparkles size={14} /> AI-Powered Styling
        </div>
        <h1 className="text-5xl mb-4">Occasion Stylist</h1>
        <p className="text-gray-500 max-w-lg mx-auto">
          Tell us your occasion and we'll recommend the perfect ethnic outfit from our Haridwar collection.
        </p>
      </div>

      <form onSubmit={handleGetRecommendations} className="max-w-2xl mx-auto bg-white rounded-[40px] p-10 shadow-sm mb-16">
        <div className="space-y-6">
          <div>
            <label htmlFor="occasion" className="block text-sm uppercase tracking-widest mb-2 opacity-60">
              Occasion *
            </label>
            <input
              id="occasion"
              type="text"
              value={occasion}
              onChange={e => setOccasion(e.target.value)}
              className="w-full p-4 rounded-2xl border border-brand-primary/10 focus:border-brand-primary outline-none transition-colors"
              placeholder="e.g. Diwali pooja, friend's wedding, office Navratri..."
              required
            />
          </div>
          <div>
            <label htmlFor="preference" className="block text-sm uppercase tracking-widest mb-2 opacity-60">
              Preferences (optional)
            </label>
            <input
              id="preference"
              type="text"
              value={preference}
              onChange={e => setPreference(e.target.value)}
              className="w-full p-4 rounded-2xl border border-brand-primary/10 focus:border-brand-primary outline-none transition-colors"
              placeholder="e.g. light colour, cotton, traditional style..."
            />
          </div>
          <button
            type="submit"
            disabled={loading || !occasion.trim()}
            className="btn-primary w-full py-5 flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
            {loading ? 'Finding perfect outfits...' : 'GET RECOMMENDATIONS'}
          </button>
        </div>
      </form>

      {error && (
        <div className="max-w-2xl mx-auto mb-8 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm text-center">
          {error}
        </div>
      )}

      <AnimatePresence>
        {(aiResponse || recommendations.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-12"
          >
            {aiResponse && (
              <div className="bg-brand-primary text-white p-10 rounded-[40px] shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                  <Sparkles size={120} />
                </div>
                <div className="relative z-10">
                  <h2 className="text-3xl mb-4 flex items-center gap-3">
                    <Info size={24} /> Stylist's Advice
                  </h2>
                  <p className="text-xl opacity-90 leading-relaxed font-serif italic">"{aiResponse}"</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {recommendations.map((p, idx) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="bg-white rounded-[40px] overflow-hidden shadow-lg group hover:shadow-2xl transition-all border border-brand-primary/5"
                >
                  <div className="flex flex-col h-full">
                    <div className="aspect-[4/3] relative overflow-hidden">
                      <img
                        src={p.imageUrls?.[0] || '/images/haridwar-2.jpg'}
                        alt={p.name}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute top-6 right-6 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full font-bold text-brand-primary shadow-lg">
                        ₹{p.price?.toLocaleString()}
                      </div>
                    </div>
                    <div className="p-8 flex-1 flex flex-col">
                      <h3 className="text-2xl mb-1 group-hover:text-brand-primary transition-colors">{p.name}</h3>
                      <p className="text-xs uppercase tracking-widest opacity-40 mb-4">{p.category}</p>
                      <div className="bg-brand-secondary/50 p-6 rounded-3xl mb-8 flex-1">
                        <p className="text-sm text-gray-600 leading-relaxed italic">
                          <span className="text-brand-primary font-bold not-italic block mb-2 uppercase tracking-widest text-[10px]">Why it works:</span>
                          "{p.stylistReason}"
                        </p>
                      </div>
                      <Link
                        to={`/product/${p.id}`}
                        className="btn-primary w-full py-4 flex items-center justify-center gap-2 group/btn"
                      >
                        VIEW DETAILS <ChevronRight size={18} className="group-hover/btn:translate-x-1 transition-transform" />
                      </Link>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!loading && recommendations.length === 0 && !aiResponse && !error && (
        <div className="text-center py-20 opacity-20">
          <ShoppingBag size={80} className="mx-auto mb-4" />
          <p className="text-xl uppercase tracking-widest">Your curated collection will appear here</p>
        </div>
      )}
    </div>
  );
}
