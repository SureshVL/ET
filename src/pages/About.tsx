import React from 'react';
import { motion } from 'motion/react';
import SEO from '../components/SEO';

export default function About() {
  return (
    <div className="bg-brand-secondary min-h-screen">
      <SEO 
        title="Our Story" 
        description="Learn about Devaragudi's heritage. Rooted in the sacred ghats of Haridwar, we preserve the art of hand-stitched elegance and traditional Indian craftsmanship."
      />
      {/* Hero Section */}
      <section className="relative h-[60vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&q=80&w=2000" 
            alt="Majestic Himalayas" 
            className="w-full h-full object-cover opacity-40"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-brand-secondary/0 via-brand-secondary/50 to-brand-secondary" />
        </div>
        
        <div className="relative z-10 text-center px-4">
          <motion.span 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xs uppercase tracking-[0.5em] font-bold text-brand-primary mb-4 block"
          >
            Our Heritage
          </motion.span>
          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-5xl md:text-7xl font-serif text-brand-primary"
          >
            The Story of Devaragudi
          </motion.h1>
        </div>
      </section>

      {/* Story Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-8"
          >
            <h2 className="text-4xl font-serif text-brand-primary leading-tight">
              Rooted in the Sacred <br /> 
              <span className="italic">Ghats of Haridwar</span>
            </h2>
            <p className="text-lg leading-relaxed text-gray-700">
              Founded in the heart of Haridwar, Devaragudi is more than just a brand; it's a tribute to the timeless artistry of Indian weavers. Our journey began with a simple vision: to bring the spiritual elegance and cultural richness of the Ganges to the modern wardrobe.
            </p>
            <p className="text-lg leading-relaxed text-gray-700">
              Every kurta we create is a masterpiece of craftsmanship. We work directly with local artisans who have inherited centuries-old techniques, ensuring that every stitch carries the soul of our heritage.
            </p>
            <div className="pt-4">
              <div className="h-[1px] w-24 bg-brand-primary mb-4" />
              <p className="font-serif italic text-xl text-brand-primary">"Tradition is not the worship of ashes, but the preservation of fire."</p>
            </div>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="relative"
          >
            <div className="aspect-[4/5] rounded-[48px] overflow-hidden shadow-2xl bg-brand-primary/5 flex items-center justify-center p-12">
              <img 
                src="/public/images/company-logo.jpg" 
                alt="Devaragudi Company Logo" 
                className="w-full h-auto object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="absolute -bottom-8 -left-8 bg-white p-8 rounded-[32px] shadow-xl max-w-xs hidden md:block">
              <p className="text-sm font-bold tracking-widest uppercase opacity-40 mb-2">Since 1994</p>
              <p className="font-serif text-lg">Preserving the art of hand-stitched elegance for over three decades.</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Values Section */}
      <section className="bg-brand-footer text-brand-secondary py-24 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-primary rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-brand-rani rounded-full blur-[120px]" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-6xl font-serif mb-4">Our Core Values</h2>
            <p className="opacity-70 uppercase tracking-[0.4em] text-[10px] font-bold">What defines every Devaragudi creation</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              {
                title: "Authentic Craft",
                desc: "We prioritize hand-stitched techniques over mass production, ensuring every piece is unique.",
                color: "brand-primary"
              },
              {
                title: "Sustainable Soul",
                desc: "Our fabrics are sourced ethically, supporting local farmers and eco-friendly practices.",
                color: "brand-teal"
              },
              {
                title: "Modern Tradition",
                desc: "We blend classic silhouettes with contemporary designs for the modern Indian soul.",
                color: "brand-rani"
              }
            ].map((value, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="text-center space-y-6 group"
              >
                <div className={`w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-white/10 transition-all duration-500 group-hover:scale-110 group-hover:bg-white/10 group-hover:border-white/20`}>
                  <span className="text-3xl font-serif text-brand-gold">{idx + 1}</span>
                </div>
                <h3 className="text-3xl font-serif group-hover:text-brand-gold transition-colors">{value.title}</h3>
                <p className="opacity-70 leading-relaxed text-lg">{value.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
