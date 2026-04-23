import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';

interface AuthContextType {
  user: User | null;
  profile: any | null;
  loading: boolean;
  isAdmin: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isAdmin: false,
  logout: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("AuthContext: Setting up onAuthStateChanged listener...");
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log("AuthContext: Auth state changed. User:", firebaseUser?.email || "null", "DisplayName:", firebaseUser?.displayName || "null");
      
      // Clean up previous profile listener if it exists
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      try {
        setUser(firebaseUser);
        if (firebaseUser) {
          const docRef = doc(db, 'users', firebaseUser.uid);
          
          // Set up real-time listener for profile
          unsubscribeProfile = onSnapshot(docRef, async (docSnap) => {
            if (docSnap.exists()) {
              console.log("AuthContext: Profile updated via onSnapshot:", docSnap.data());
              setProfile(docSnap.data());
              setLoading(false);
            } else {
              console.log("AuthContext: No profile found in onSnapshot, attempting creation...");
              // Create initial profile if it doesn't exist
              const newProfile = {
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                role: firebaseUser.email === import.meta.env.VITE_ADMIN_EMAIL ? 'admin' : 'customer',
                name: firebaseUser.displayName || '',
              };
              try {
                await setDoc(docRef, newProfile);
                console.log("AuthContext: Profile created successfully via onSnapshot fallback");
                // The next snapshot will trigger setProfile
              } catch (err) {
                console.error("AuthContext: Error creating profile:", err);
                handleFirestoreError(err, OperationType.WRITE, `users/${firebaseUser.uid}`);
                setLoading(false);
              }
            }
          }, (err) => {
            console.error("AuthContext: Profile listener error:", err);
            handleFirestoreError(err, OperationType.GET, `users/${firebaseUser.uid}`);
            setLoading(false);
          });
        } else {
          setProfile(null);
          setLoading(false);
        }
      } catch (error) {
        console.error("AuthContext: Unexpected error in auth listener:", error);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile, 
      loading, 
      isAdmin: profile?.role === 'admin' || user?.email === import.meta.env.VITE_ADMIN_EMAIL, 
      logout 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
