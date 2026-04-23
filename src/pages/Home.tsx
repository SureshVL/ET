import { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import UGCGallery from '../components/UGCGallery';
import { Link } from 'react-router-dom';
import { ArrowRight, ShoppingBag, MessageCircle } from 'lucide-react';
import { useProducts } from '../context/ProductContext';
import SEO from '../components/SEO';
import ProductCard from '../components/ProductCard';
import FlashSale from '../components/FlashSale';

export default function Home() {
  const { products, loading } = useProducts();

  const newArrivals = useMemo(() => {
    return [...products]
      .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
      .slice(0, 4);
  }, [products]);

  const flashSaleProduct = useMemo(() => {
    return products.find((p: any) => 
      p.flashSale && 
      p.flashSale.endTime && 
      new Date(p.flashSale.endTime.toDate()) > new Date()
    );
  }, [products]);

  const haridwarImages = [
    "/images/haridwar-4.jfif",
    "/images/haridwar-2.jpg",
    "/images/haridwar-3.jfif",
    "/images/haridwar-2.jpg"
  ];

  return (
    <div className="overflow-hidden">
      <SEO 
        title="Premium Ethnic Threads from Haridwar" 
        description="Discover Devaragudi's collection of premium ethnic kurtas, meticulously designed and stitched with devotion in Haridwar, Uttarakhand. Handcrafted apparel for the modern wardrobe."
      />
      {/* Hero Section */}
      <section className="relative h-[90vh] flex items-center justify-center bg-brand-footer overflow-hidden">
        <div 
          className="absolute inset-0 z-0 bg-cover bg-center opacity-40 scale-105 transition-transform duration-[20s] ease-linear hover:scale-110"
          style={{ backgroundImage: `url(${haridwarImages[0]})` }}
        />
        <div className="absolute inset-0 z-[1] bg-gradient-to-b from-brand-footer/80 via-transparent to-brand-footer/80" />
        <div className="relative z-10 text-center text-white px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
          >
            <span className="text-sm uppercase tracking-[0.6em] mb-6 block font-medium text-brand-accent">Crafted in the Holy City</span>
            <h1 className="text-7xl md:text-9xl font-serif mb-8 text-white drop-shadow-2xl">Devaragudi</h1>
            <p className="text-xl md:text-2xl max-w-2xl mx-auto mb-12 font-light opacity-90 leading-relaxed">
              Premium Ethnic Threads, designed and stitched with devotion in Haridwar.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <Link to="/products" className="btn-primary min-w-[200px]">
                EXPLORE COLLECTION
              </Link>
              <Link to="/stylist" className="btn-secondary border-white text-white hover:bg-white hover:text-brand-primary min-w-[200px]">
                VIRTUAL STYLIST
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Flash Sale Section */}
      {flashSaleProduct && flashSaleProduct.flashSale && (
        <FlashSale 
          endTime={flashSaleProduct.flashSale.endTime.toDate()}
          discount={flashSaleProduct.flashSale.discount}
          productName={flashSaleProduct.name}
          productId={flashSaleProduct.id}
          image={flashSaleProduct.images?.[0] || flashSaleProduct.image}
          price={flashSaleProduct.price}
        />
      )}

      {/* Story Section */}
      <section className="py-24 px-4 bg-brand-secondary">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-4xl md:text-5xl mb-8">The Spirit of Haridwar</h2>
              <p className="text-lg leading-relaxed text-gray-700 mb-6">
                Our kurtas aren't just garments; they are a piece of Haridwar's spiritual heritage. 
                Each piece is meticulously designed and stitched by local artisans who have 
                perfected their craft over generations.
              </p>
              <p className="text-lg leading-relaxed text-gray-700 mb-8">
                From the banks of the holy Ganges to your wardrobe, we bring you the finest 
                ethnic wear that balances tradition with modern comfort.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-8 bg-white rounded-[40px] shadow-xl shadow-brand-primary/5 border border-brand-primary/5 group hover:bg-brand-primary transition-colors duration-500">
                  <span className="block text-4xl font-serif text-brand-primary mb-2 group-hover:text-white transition-colors">100%</span>
                  <span className="text-xs uppercase tracking-widest opacity-60 group-hover:text-white/80 transition-colors">Handcrafted</span>
                </div>
                <div className="p-8 bg-white rounded-[40px] shadow-xl shadow-brand-rani/5 border border-brand-rani/5 group hover:bg-brand-rani transition-colors duration-500">
                  <span className="block text-4xl font-serif text-brand-rani mb-2 group-hover:text-white transition-colors">Pure</span>
                  <span className="text-xs uppercase tracking-widest opacity-60 group-hover:text-white/80 transition-colors">Ethnic Fabrics</span>
                </div>
              </div>
            </motion.div>
            
            <div className="grid grid-cols-2 gap-4">
              <motion.img 
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                src={haridwarImages[1]} 
                alt="Haridwar Shiva" 
                className="w-full h-80 object-cover object-top rounded-[40px] shadow-xl"
                referrerPolicy="no-referrer"
              />
              <motion.img 
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                src={haridwarImages[2]} 
                alt="Haridwar Ghat" 
                className="w-full h-80 object-cover rounded-[40px] shadow-xl mt-12"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Devbhumi Heritage Section */}
      <section className="py-24 px-4 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <motion.span 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-sm uppercase tracking-[0.4em] text-brand-primary mb-4 block"
            >
              Our Heritage
            </motion.span>
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-4xl md:text-6xl mb-6 text-gradient"
            >
              Devbhumi Uttarakhand
            </motion.h2>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="text-xl text-gray-600 max-w-3xl mx-auto italic"
            >
              "These kurtas are meticulously stitched and designed in the sacred Devbhumi Uttarakhand, 
              carrying the blessings and purity of the Himalayas."
            </motion.p>
          </div>

          <div className="flex justify-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="relative aspect-video w-full max-w-4xl rounded-[40px] overflow-hidden shadow-2xl group"
            >
              <img 
                src="/images/himalayas.jpg" 
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&q=80&w=2000";
                }}
                alt="Majestic Himalayas of Uttarakhand" 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-8">
                <p className="text-white text-lg font-serif">The Majestic Himalayas</p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Featured Products Preview */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-end mb-12">
            <div>
              <h2 className="text-4xl md:text-5xl mb-4">New Arrivals</h2>
              <p className="text-gray-500">Discover our latest Haridwar-stitched collection.</p>
            </div>
            <Link to="/products" className="hidden md:flex items-center text-brand-primary font-medium hover:gap-2 transition-all">
              VIEW ALL <ArrowRight size={20} className="ml-2" />
            </Link>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {loading ? (
              [...Array(4)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="aspect-[3/4] bg-gray-100 rounded-[32px] mb-6" />
                  <div className="h-6 bg-gray-100 rounded w-3/4 mb-2" />
                  <div className="h-4 bg-gray-100 rounded w-1/4" />
                </div>
              ))
            ) : newArrivals.length > 0 ? (
              newArrivals.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))
            ) : (
              <div className="col-span-full text-center py-12 opacity-40">
                <ShoppingBag size={48} className="mx-auto mb-4" />
                <p>New collection arriving soon...</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* UGC Gallery */}
      <UGCGallery />

      {/* Testimonials Section */}
      <section className="py-24 bg-brand-secondary/30">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl mb-4">What Our Customers Say</h2>
            <p className="text-gray-500 italic">Voices from our Devaragudi family</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                name: "Rajesh Kumar",
                role: "Verified Buyer",
                text: "The stitching is absolutely perfect. You can really feel the quality of the Haridwar craftsmanship. Highly recommended!",
                rating: 5
              },
              {
                name: "Priya Sharma",
                role: "Verified Buyer",
                text: "Beautiful fabric and very comfortable. The design is unique and looks even better in person.",
                rating: 4
              },
              {
                name: "Amit Mehra",
                role: "Verified Buyer",
                text: "I've bought several kurtas from Devaragudi, and they never disappoint. The fit is true to size.",
                rating: 5
              }
            ].map((testimonial, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-white p-8 rounded-[40px] shadow-sm hover:shadow-md transition-shadow border border-brand-primary/5"
              >
                <div className="flex text-yellow-400 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <span key={i} className="text-lg">★</span>
                  ))}
                </div>
                <p className="text-gray-600 mb-6 italic leading-relaxed">"{testimonial.text}"</p>
                <div>
                  <h4 className="font-bold text-brand-primary">{testimonial.name}</h4>
                  <p className="text-xs uppercase tracking-widest opacity-40">{testimonial.role}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Floating WhatsApp Button */}
      <motion.a
        href="https://wa.me/919121485927?text=Namaste! I'm interested in Devaragudi Ethnic Threads."
        target="_blank"
        rel="noopener noreferrer"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        className="fixed bottom-8 right-8 z-50 bg-[#25D366] text-white p-4 rounded-full shadow-2xl flex items-center gap-2 group"
      >
        <MessageCircle size={24} />
        <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 font-bold text-sm whitespace-nowrap">
          CHAT WITH US
        </span>
      </motion.a>
    </div>
  );
}
