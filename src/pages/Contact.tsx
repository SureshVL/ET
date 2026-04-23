import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Mail, Phone, MapPin, Send, Instagram, Facebook, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import SEO from '../components/SEO';

const PinterestIcon = ({ size = 24 }: { size?: number }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="currentColor" 
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.965 1.406-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.261 7.929-7.261 4.162 0 7.396 2.966 7.396 6.937 0 4.134-2.607 7.462-6.223 7.462-1.214 0-2.354-.63-2.746-1.37l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146 1.124.347 2.317.535 3.554.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.39 18.592.026 11.985.026L12.017 0z"/>
  </svg>
);

export default function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: import.meta.env.VITE_CONTACT_EMAIL || 'support@devaragudi.in',
          subject: `Contact Form: ${formData.subject}`,
          text: `Name: ${formData.name}\nEmail: ${formData.email}\n\nMessage:\n${formData.message}`,
          html: `
            <h3>New Contact Form Submission</h3>
            <p><strong>Name:</strong> ${formData.name}</p>
            <p><strong>Email:</strong> ${formData.email}</p>
            <p><strong>Subject:</strong> ${formData.subject}</p>
            <p><strong>Message:</strong></p>
            <p>${formData.message.replace(/\n/g, '<br>')}</p>
          `
        }),
      });

      if (response.ok) {
        toast.success("Message sent successfully! We'll get back to you soon.");
        setFormData({ name: '', email: '', subject: '', message: '' });
      } else {
        throw new Error('Failed to send email');
      }
    } catch (error) {
      console.error('Email error:', error);
      toast.error('Failed to send message. Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-brand-secondary min-h-screen">
      <SEO 
        title="Contact Us" 
        description="Get in touch with Devaragudi Ethnic Threads. Whether you have questions about our Haridwar-stitched kurtas or need styling advice, we're here to help."
      />
      {/* Hero Section */}
      <section className="bg-brand-footer text-brand-secondary py-32 relative overflow-hidden">
        <div className="absolute inset-0 dynamic-bg opacity-20 pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <motion.span 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xs uppercase tracking-[0.5em] font-bold mb-6 block text-brand-gold"
          >
            Connect With Us
          </motion.span>
          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-6xl md:text-8xl font-serif mb-8 leading-tight"
          >
            We'd Love to <br /> <span className="italic text-brand-gold">Hear from You</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="max-w-2xl mx-auto opacity-70 text-xl font-light leading-relaxed"
          >
            Whether you have a question about our collection, need styling advice, or just want to share your Devaragudi experience, our team is here to help.
          </motion.p>
        </div>
      </section>

      {/* Contact Content */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 -mt-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Contact Info */}
          <div className="lg:col-span-1 space-y-8">
            <motion.div 
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="bg-white p-12 rounded-[48px] shadow-sm space-y-12"
            >
              <div>
                <h3 className="text-xs font-bold tracking-[0.2em] uppercase opacity-40 mb-6">Our Studio</h3>
                <div className="flex gap-4 group">
                  <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 flex items-center justify-center text-brand-primary shrink-0 transition-all duration-500 group-hover:scale-110 group-hover:bg-brand-primary group-hover:text-white">
                    <MapPin size={24} />
                  </div>
                  <p className="text-lg leading-relaxed text-gray-700">
                    HP Road, Moosapet, <br />
                    Hyderabad, Telangana 500018, <br />
                    India
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold tracking-[0.2em] uppercase opacity-40 mb-6">Get in Touch</h3>
                <div className="space-y-6">
                  <div className="flex items-center gap-4 group">
                    <div className="w-12 h-12 rounded-2xl bg-brand-teal/10 flex items-center justify-center text-brand-teal shrink-0 transition-all duration-500 group-hover:scale-110 group-hover:bg-brand-teal group-hover:text-white">
                      <Mail size={24} />
                    </div>
                    <a href={`mailto:${import.meta.env.VITE_CONTACT_EMAIL || "support@devaragudi.in"}`} className="text-lg hover:text-brand-primary transition-colors">
                      {import.meta.env.VITE_CONTACT_EMAIL || "support@devaragudi.in"}
                    </a>
                  </div>
                  <div className="flex items-center gap-4 group">
                    <div className="w-12 h-12 rounded-2xl bg-brand-rani/10 flex items-center justify-center text-brand-rani shrink-0 transition-all duration-500 group-hover:scale-110 group-hover:bg-brand-rani group-hover:text-white">
                      <Phone size={24} />
                    </div>
                    <a href="tel:+919121485927" className="text-lg hover:text-brand-primary transition-colors">
                      +91 91214 85927
                    </a>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold tracking-[0.2em] uppercase opacity-40 mb-6">Follow Our Journey</h3>
                <div className="flex gap-6">
                  <a 
                    href="https://instagram.com/devaragudi" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="p-3 bg-brand-secondary/50 rounded-2xl text-brand-primary hover:bg-brand-primary hover:text-white transition-all duration-300"
                    aria-label="Instagram"
                  >
                    <Instagram size={24} />
                  </a>
                  <a 
                    href="https://facebook.com/devaragudi" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="p-3 bg-brand-secondary/50 rounded-2xl text-brand-primary hover:bg-brand-primary hover:text-white transition-all duration-300"
                    aria-label="Facebook"
                  >
                    <Facebook size={24} />
                  </a>
                  <a 
                    href="https://wa.me/919121485927" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="p-3 bg-brand-secondary/50 rounded-2xl text-brand-primary hover:bg-brand-primary hover:text-white transition-all duration-300"
                    aria-label="WhatsApp"
                  >
                    <MessageCircle size={24} />
                  </a>
                  <a 
                    href="https://pinterest.com/devaragudi" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="p-3 bg-brand-secondary/50 rounded-2xl text-brand-primary hover:bg-brand-primary hover:text-white transition-all duration-300"
                    aria-label="Pinterest"
                  >
                    <PinterestIcon size={24} />
                  </a>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-2">
            <motion.div 
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-white p-12 md:p-16 rounded-[48px] shadow-xl"
            >
              <h2 className="text-3xl font-serif text-brand-primary mb-12">Send a Message</h2>
              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-xs font-bold tracking-widest uppercase opacity-40">Full Name</label>
                  <input 
                    type="text" 
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full bg-brand-secondary/30 border-b border-brand-primary/10 py-4 px-2 focus:outline-none focus:border-brand-primary transition-colors"
                    placeholder="John Doe"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold tracking-widest uppercase opacity-40">Email Address</label>
                  <input 
                    type="email" 
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full bg-brand-secondary/30 border-b border-brand-primary/10 py-4 px-2 focus:outline-none focus:border-brand-primary transition-colors"
                    placeholder="john@example.com"
                  />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="text-xs font-bold tracking-widest uppercase opacity-40">Subject</label>
                  <input 
                    type="text" 
                    required
                    value={formData.subject}
                    onChange={(e) => setFormData({...formData, subject: e.target.value})}
                    className="w-full bg-brand-secondary/30 border-b border-brand-primary/10 py-4 px-2 focus:outline-none focus:border-brand-primary transition-colors"
                    placeholder="Inquiry about Silk Collection"
                  />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="text-xs font-bold tracking-widest uppercase opacity-40">Message</label>
                  <textarea 
                    required
                    rows={6}
                    value={formData.message}
                    onChange={(e) => setFormData({...formData, message: e.target.value})}
                    className="w-full bg-brand-secondary/30 border-b border-brand-primary/10 py-4 px-2 focus:outline-none focus:border-brand-primary transition-colors resize-none"
                    placeholder="Tell us how we can help..."
                  />
                </div>
                <div className="md:col-span-2 pt-8">
                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="btn-primary w-full md:w-auto px-12 py-5 flex items-center justify-center gap-3 group"
                  >
                    {isSubmitting ? 'SENDING...' : 'SEND MESSAGE'}
                    <Send size={20} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
}
