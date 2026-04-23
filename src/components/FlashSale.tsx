import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Timer, Zap, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCurrency } from '../context/CurrencyContext';

interface FlashSaleProps {
  endTime: Date;
  discount: number;
  productName: string;
  productId: string;
  image: string;
  price: number;
}

export default function FlashSale({ endTime, discount, productName, productId, image, price }: FlashSaleProps) {
  const [timeLeft, setTimeLeft] = useState({
    hours: 0,
    minutes: 0,
    seconds: 0
  });
  const { formatPrice } = useCurrency();

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const distance = endTime.getTime() - now;

      if (distance < 0) {
        clearInterval(timer);
        return;
      }

      setTimeLeft({
        hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((distance % (1000 * 60)) / 1000)
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [endTime]);

  const discountedPrice = price * (1 - discount / 100);

  return (
    <section className="py-12 px-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="max-w-7xl mx-auto bg-brand-primary rounded-[48px] overflow-hidden shadow-2xl relative group"
      >
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
        
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 items-center">
          <div className="p-12 lg:p-20 text-white">
            <div className="flex items-center gap-3 mb-8">
              <div className="bg-yellow-400 text-brand-primary p-2 rounded-xl animate-pulse">
                <Zap size={24} fill="currentColor" />
              </div>
              <span className="text-sm font-bold tracking-[0.4em] uppercase">Flash Sale Live</span>
            </div>
            
            <h2 className="text-5xl md:text-7xl font-serif mb-8 leading-tight">
              {discount}% OFF <br />
              <span className="text-3xl md:text-4xl opacity-80 font-sans font-light italic">on {productName}</span>
            </h2>

            <div className="flex gap-6 mb-12">
              {[
                { label: 'HRS', value: timeLeft.hours },
                { label: 'MIN', value: timeLeft.minutes },
                { label: 'SEC', value: timeLeft.seconds }
              ].map((unit, i) => (
                <div key={i} className="text-center">
                  <div className="w-20 h-20 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center text-3xl font-serif mb-2 border border-white/20">
                    {unit.value.toString().padStart(2, '0')}
                  </div>
                  <span className="text-[10px] font-bold tracking-widest opacity-60">{unit.label}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-8">
              <Link 
                to={`/product/${productId}`}
                className="bg-white text-brand-primary px-10 py-5 rounded-full font-bold text-sm tracking-widest hover:bg-yellow-400 hover:scale-105 transition-all flex items-center gap-3"
              >
                SHOP NOW <ArrowRight size={18} />
              </Link>
              <div>
                <p className="text-xs opacity-60 uppercase tracking-widest mb-1">Starting at</p>
                <p className="text-3xl font-serif">{formatPrice(discountedPrice)}</p>
              </div>
            </div>
          </div>

          <div className="relative h-full min-h-[400px] lg:min-h-[600px] overflow-hidden">
            <img 
              src={image} 
              alt={productName}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-brand-primary via-brand-primary/20 to-transparent lg:from-brand-primary lg:via-transparent" />
            
            <div className="absolute top-12 right-12 bg-yellow-400 text-brand-primary w-24 h-24 rounded-full flex flex-col items-center justify-center rotate-12 shadow-xl">
              <span className="text-2xl font-bold leading-none">{discount}%</span>
              <span className="text-[10px] font-bold uppercase tracking-tighter">OFF</span>
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
