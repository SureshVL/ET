import { Link } from 'react-router-dom';
import { Instagram, Facebook, MessageCircle } from 'lucide-react';

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

export default function Footer() {
  return (
    <footer className="bg-brand-footer text-brand-secondary py-24 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-brand-primary rounded-full blur-[150px]" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[50%] h-[50%] bg-brand-rani rounded-full blur-[150px]" />
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-16">
          <div className="col-span-1 md:col-span-2">
            <Link to="/" className="flex flex-col mb-8 group">
              <span className="text-4xl font-display font-bold tracking-[0.1em] text-white group-hover:text-brand-gold transition-colors duration-500 uppercase">Devaragudi</span>
              <span className="text-[12px] uppercase tracking-[0.4em] text-brand-gold font-bold">Ethnic Threads</span>
            </Link>
            <p className="max-w-md opacity-70 text-lg leading-relaxed mb-10 font-light">
              Experience the timeless elegance of kurtas stitched and designed in 
              Devbhumi Uttarakhand. Every thread tells a story of tradition, 
              crafted with precision and devotion.
            </p>
            <div className="flex gap-6">
              {[
                { icon: <Instagram size={24} />, href: import.meta.env.VITE_INSTAGRAM_URL || "https://instagram.com/devaragudi", label: "Instagram" },
                { icon: <Facebook size={24} />, href: import.meta.env.VITE_FACEBOOK_URL || "https://facebook.com/devaragudi", label: "Facebook" },
                { icon: <MessageCircle size={24} />, href: "https://wa.me/919121485927", label: "WhatsApp" },
                { icon: <PinterestIcon size={24} />, href: "https://pinterest.com/devaragudi", label: "Pinterest" }
              ].map((social) => (
                <a 
                  key={social.label}
                  href={social.href} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-white/60 hover:bg-brand-primary hover:text-white hover:scale-110 transition-all duration-300 border border-white/10"
                  aria-label={social.label}
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>
          
          <div>
            <h4 className="font-serif text-xl mb-6">Quick Links</h4>
            <ul className="space-y-4 opacity-80">
              <li><Link to="/" className="hover:underline">Home</Link></li>
              <li><Link to="/products" className="hover:underline">Collection</Link></li>
              <li><Link to="/about" className="hover:underline">About Us</Link></li>
              <li><Link to="/contact" className="hover:underline">Contact</Link></li>
              <li><Link to="/size-guide" className="hover:underline">Size Guide</Link></li>
              <li><Link to="/cart" className="hover:underline">Shopping Cart</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-serif text-xl mb-6">Contact</h4>
            <ul className="space-y-4 opacity-80">
              <li>Devaragudi Ethnic Threads</li>
              <li>HP Road, Moosapet, Hyderabad</li>
              <li>Telangana, 500018</li>
              <li>+91 91214 85927</li>
              <li>{import.meta.env.VITE_CONTACT_EMAIL || "support@devaragudi.in"}</li>
            </ul>
          </div>
        </div>
        
        <div className="mt-16 pt-8 border-t border-white/10 text-center text-sm opacity-60">
          <p>&copy; {new Date().getFullYear()} Devaragudi Ethnic Threads. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
