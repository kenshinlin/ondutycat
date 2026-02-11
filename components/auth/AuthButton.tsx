'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslations } from 'next-intl';
import SignInModal from './SignInModal';
import SignUpModal from './SignUpModal';

export default function AuthButton() {
  const { user, signOut, loading } = useAuth();
  const t = useTranslations('auth');
  const [showSignIn, setShowSignIn] = useState(false);
  const [showSignUp, setShowSignUp] = useState(false);
  const [isSignIn, setIsSignIn] = useState(true);

  const handleSwitchToSignUp = () => {
    setIsSignIn(false);
    setShowSignIn(false);
    setShowSignUp(true);
  };

  const handleSwitchToSignIn = () => {
    setIsSignIn(true);
    setShowSignUp(false);
    setShowSignIn(true);
  };

  if (loading) {
    return <div className="h-10 w-24 bg-gray-200 dark:bg-zinc-700 animate-pulse rounded-lg" />;
  }

  if (user) {
    return (
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {user.email}
        </span>
        <button
          onClick={() => signOut()}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-all duration-300"
        >
          {t('signOut')}
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-3">
        <button
          onClick={() => {
            setIsSignIn(true);
            setShowSignIn(true);
          }}
          className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 transition-colors"
        >
          {t('signIn')}
        </button>
        <button
          onClick={() => {
            setIsSignIn(false);
            setShowSignUp(true);
          }}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-all duration-300"
        >
          {t('signUp')}
        </button>
      </div>

      <SignInModal
        isOpen={showSignIn}
        onClose={() => setShowSignIn(false)}
        onSwitchToSignUp={handleSwitchToSignUp}
      />

      <SignUpModal
        isOpen={showSignUp}
        onClose={() => setShowSignUp(false)}
        onSwitchToSignIn={handleSwitchToSignIn}
      />
    </>
  );
}
