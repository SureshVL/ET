import React from 'react';
import { motion } from 'motion/react';
import { Ruler, CheckCircle2, Info, ChevronRight } from 'lucide-react';
import SEO from '../components/SEO';

export default function SizeGuide() {
  const sizes = [
    { size: 38, label: 'Small (S)', chest: 42, shoulder: 17.5, length: 40, sleeve: 24 },
    { size: 40, label: 'Medium (M)', chest: 44, shoulder: 18.5, length: 42, sleeve: 25 },
    { size: 42, label: 'Large (L)', chest: 46, shoulder: 19.5, length: 44, sleeve: 26 },
    { size: 44, label: 'Extra Large (XL)', chest: 48, shoulder: 20.5, length: 45, sleeve: 26.5 },
  ];

  return (
    <div className="pt-32 pb-24 px-4 bg-brand-secondary/30 min-h-screen">
      <SEO 
        title="Size Guide - Devaragudi Ethnic Threads" 
        description="Find your perfect fit with Devaragudi's comprehensive kurta size guide. Detailed measurements for sizes 38, 40, 42, and 44."
      />
      
      <div className="max-w-4xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <span className="text-sm uppercase tracking-[0.3em] text-brand-primary mb-4 block">Perfect Fit</span>
          <h1 className="text-5xl md:text-6xl font-serif mb-6">Size Guide</h1>
          <p className="text-gray-600 max-w-2xl mx-auto leading-relaxed">
            At Devaragudi, we want you to feel as good as you look. Use our detailed size guide 
            to ensure your handcrafted kurta fits you perfectly.
          </p>
        </motion.div>

        {/* Size Chart */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-[40px] shadow-xl overflow-hidden mb-16 border border-brand-primary/5"
        >
          <div className="p-8 md:p-12">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 bg-brand-primary/10 rounded-2xl flex items-center justify-center text-brand-primary">
                <Ruler size={24} />
              </div>
              <h2 className="text-3xl font-serif">Kurta Size Chart</h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-brand-primary/10">
                    <th className="py-4 px-4 text-xs uppercase tracking-widest opacity-40">Size</th>
                    <th className="py-4 px-4 text-xs uppercase tracking-widest opacity-40">Label</th>
                    <th className="py-4 px-4 text-xs uppercase tracking-widest opacity-40">Garment Chest (in)</th>
                    <th className="py-4 px-4 text-xs uppercase tracking-widest opacity-40">Shoulder (in)</th>
                    <th className="py-4 px-4 text-xs uppercase tracking-widest opacity-40">Length (in)</th>
                    <th className="py-4 px-4 text-xs uppercase tracking-widest opacity-40">Sleeve (in)</th>
                  </tr>
                </thead>
                <tbody>
                  {sizes.map((item, idx) => (
                    <tr key={idx} className="border-b border-brand-primary/5 hover:bg-brand-primary/5 transition-colors">
                      <td className="py-6 px-4 font-bold text-brand-primary">{item.size}</td>
                      <td className="py-6 px-4 text-sm">{item.label}</td>
                      <td className="py-6 px-4 text-sm">{item.chest}"</td>
                      <td className="py-6 px-4 text-sm">{item.shoulder}"</td>
                      <td className="py-6 px-4 text-sm">{item.length}"</td>
                      <td className="py-6 px-4 text-sm">{item.sleeve}"</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="mt-8 p-6 bg-brand-secondary/50 rounded-2xl flex items-start gap-4">
              <Info className="text-brand-primary shrink-0 mt-1" size={20} />
              <p className="text-sm text-gray-600 leading-relaxed">
                <span className="font-bold text-brand-primary">Pro Tip:</span> For a comfortable fit, your garment chest 
                measurement should be 4-6 inches larger than your actual body chest measurement.
              </p>
            </div>
          </div>
        </motion.div>

        {/* How to Measure */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-16">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <h2 className="text-3xl font-serif mb-8">How to Measure</h2>
            <div className="space-y-8">
              <div className="flex gap-6">
                <div className="w-10 h-10 rounded-full bg-brand-primary text-white flex items-center justify-center shrink-0 font-bold">1</div>
                <div>
                  <h4 className="font-bold mb-2">Chest</h4>
                  <p className="text-sm text-gray-500 leading-relaxed">
                    Measure around the fullest part of your chest, keeping the tape horizontal. 
                    Add 4-6 inches for a standard kurta fit.
                  </p>
                </div>
              </div>
              <div className="flex gap-6">
                <div className="w-10 h-10 rounded-full bg-brand-primary text-white flex items-center justify-center shrink-0 font-bold">2</div>
                <div>
                  <h4 className="font-bold mb-2">Shoulder</h4>
                  <p className="text-sm text-gray-500 leading-relaxed">
                    Measure from one shoulder point to the other across the back, following the natural curve.
                  </p>
                </div>
              </div>
              <div className="flex gap-6">
                <div className="w-10 h-10 rounded-full bg-brand-primary text-white flex items-center justify-center shrink-0 font-bold">3</div>
                <div>
                  <h4 className="font-bold mb-2">Length</h4>
                  <p className="text-sm text-gray-500 leading-relaxed">
                    Measure from the highest point of the shoulder (where the neck meets the shoulder) 
                    down to the desired length.
                  </p>
                </div>
              </div>
              <div className="flex gap-6">
                <div className="w-10 h-10 rounded-full bg-brand-primary text-white flex items-center justify-center shrink-0 font-bold">4</div>
                <div>
                  <h4 className="font-bold mb-2">Sleeve</h4>
                  <p className="text-sm text-gray-500 leading-relaxed">
                    Measure from the shoulder point down to the wrist or desired sleeve length.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
            className="relative aspect-[3/4] rounded-[40px] overflow-hidden shadow-2xl"
          >
            <img 
              src="https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&q=80" 
              alt="Tailoring craftsmanship" 
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-brand-primary/20 mix-blend-multiply" />
            <div className="absolute bottom-8 left-8 right-8 p-8 bg-white/90 backdrop-blur-md rounded-3xl">
              <p className="text-brand-primary font-serif italic text-lg">
                "A perfect fit is the foundation of elegance."
              </p>
            </div>
          </motion.div>
        </div>

        {/* Custom Fit CTA */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="bg-brand-primary text-white p-12 rounded-[40px] text-center shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full -ml-32 -mb-32" />
          
          <h2 className="text-3xl font-serif mb-6 relative z-10">Still Unsure About Your Size?</h2>
          <p className="opacity-80 mb-8 max-w-xl mx-auto relative z-10">
            We offer a "Made-to-Measure" service where our master tailors in Haridwar 
            will stitch a kurta specifically to your measurements.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center relative z-10">
            <button className="bg-white text-brand-primary px-8 py-4 rounded-2xl font-bold hover:bg-brand-secondary transition-colors flex items-center justify-center gap-2">
              EXPLORE CUSTOM FIT <ChevronRight size={18} />
            </button>
            <button className="bg-transparent border border-white/30 text-white px-8 py-4 rounded-2xl font-bold hover:bg-white/10 transition-colors">
              CONTACT STYLIST
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
