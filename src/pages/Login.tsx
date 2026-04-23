import React, { useState } from 'react';
import { signInWithPopup, GoogleAuthProvider, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { motion } from 'motion/react';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleGoogleLogin = async () => {
    console.log("Starting Google Login...");
    const provider = new GoogleAuthProvider();
    // Force account selection to help with debugging/switching accounts
    provider.setCustomParameters({ prompt: 'select_account' });
    
    setLoading(true);
    try {
      console.log("Calling signInWithPopup...");
      const result = await signInWithPopup(auth, provider);
      console.log("Google Login Success:", result.user.email);
      
      toast.success('Logged in successfully');
      navigate('/');
    } catch (error: any) {
      console.error("Google Login Error Details:", {
        code: error.code,
        message: error.message,
        customData: error.customData,
        email: error.customData?.email
      });

      if (error.code === 'auth/operation-not-allowed') {
        toast.error('Google sign-in is not enabled in Firebase Console. Please enable it in Authentication > Sign-in method.');
      } else if (error.code === 'auth/popup-blocked') {
        toast.error('Sign-in popup was blocked by your browser. Please allow popups for this site.');
      } else if (error.code === 'auth/unauthorized-domain') {
        toast.error('This domain is not authorized for Firebase Auth. Please add it in Firebase Console > Authentication > Settings > Authorized domains.');
      } else if (error.code === 'auth/popup-closed-by-user') {
        toast.error('Sign-in popup was closed before completion.');
      } else if (error.code === 'auth/network-request-failed') {
        toast.error('Network request failed. This often happens if an ad-blocker or tracking protection is blocking the sign-in popup. Please disable them and try again.');
      } else if (error.code === 'auth/internal-error') {
        toast.error('Internal authentication error. This often happens if the Firebase configuration is incorrect or Google Sign-in is disabled.');
      } else {
        toast.error(error.message || 'Failed to sign in with Google');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log(`Starting ${isLogin ? 'Login' : 'Signup'} for:`, email);
    setLoading(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        console.log("Login Success");
        toast.success('Logged in successfully');
      } else {
        console.log("Calling createUserWithEmailAndPassword...");
        const result = await createUserWithEmailAndPassword(auth, email, password);
        const user = result.user;
        console.log("Signup Success, updating profile name...");
        
        // Update the Firebase Auth profile first so AuthContext picks it up
        await updateProfile(user, { displayName: name });
        console.log("Auth profile name updated to:", name);
        
        // We still call setDoc here to ensure the profile is created with all fields
        // AuthContext also has a fallback, but this is more direct for the signup flow
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          email: user.email,
          name: name,
          role: 'customer'
        });
        console.log("Profile created successfully in Login.tsx");
        toast.success('Account created successfully');
      }
      navigate('/');
    } catch (error: any) {
      console.error(`${isLogin ? 'Login' : 'Signup'} Error:`, error);
      
      if (error.code === 'auth/operation-not-allowed') {
        toast.error('Email/Password sign-in is not enabled in Firebase Console. Please enable it in Authentication > Sign-in method.');
      } else if (error.code === 'auth/email-already-in-use') {
        toast.error('An account with this email already exists.');
      } else if (error.code === 'auth/weak-password') {
        toast.error('Password is too weak. Please use at least 6 characters.');
      } else if (error.code === 'auth/invalid-email') {
        toast.error('Invalid email address format.');
      } else if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        toast.error('Invalid email or password.');
      } else if (error.message && error.message.includes('operationType')) {
        // This is a Firestore error wrapped by handleFirestoreError
        throw error;
      } else if (error.code?.includes('permission-denied')) {
        handleFirestoreError(error, OperationType.WRITE, `users/${auth.currentUser?.uid}`);
      } else {
        toast.error(error.message || `Failed to ${isLogin ? 'login' : 'create account'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-brand-secondary/30">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-white p-12 rounded-[48px] shadow-sm"
      >
        <div className="text-center mb-12">
          <h1 className="text-4xl font-serif mb-4">{isLogin ? 'Welcome Back' : 'Join Us'}</h1>
          <p className="text-gray-500">Experience the spirit of Haridwar.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {!isLogin && (
            <div>
              <label className="block text-sm uppercase tracking-widest mb-2 opacity-60">Full Name</label>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-4 rounded-2xl border border-brand-primary/10 focus:border-brand-primary outline-none"
                required
              />
            </div>
          )}
          <div>
            <label className="block text-sm uppercase tracking-widest mb-2 opacity-60">Email Address</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-4 rounded-2xl border border-brand-primary/10 focus:border-brand-primary outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm uppercase tracking-widest mb-2 opacity-60">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-4 rounded-2xl border border-brand-primary/10 focus:border-brand-primary outline-none"
              required
            />
          </div>
          
          <button 
            type="submit" 
            disabled={loading}
            className="btn-primary w-full py-5 text-lg"
          >
            {loading ? 'Processing...' : (isLogin ? 'LOGIN' : 'CREATE ACCOUNT')}
          </button>
        </form>

        <div className="mt-8 text-center space-y-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-brand-primary/10"></div></div>
            <div className="relative flex justify-center text-xs uppercase tracking-widest"><span className="bg-white px-4 text-gray-400">Or continue with</span></div>
          </div>
          
          <button 
            onClick={handleGoogleLogin}
            className="w-full p-4 rounded-2xl border border-brand-primary/10 flex items-center justify-center gap-3 hover:bg-brand-secondary transition-colors"
          >
            <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
            <span className="font-medium">Google</span>
          </button>

          <p className="text-sm">
            {isLogin ? "Don't have an account?" : "Already have an account?"}{' '}
            <button 
              onClick={() => setIsLogin(!isLogin)}
              className="text-brand-primary font-bold hover:underline"
            >
              {isLogin ? 'Sign Up' : 'Login'}
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
