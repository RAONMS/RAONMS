'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import styles from './login.module.css';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            console.log('Attempting sign in for:', email);
            const { data, error: authError } = await supabase.auth.signInWithPassword({
                email: email.trim(),
                password: password,
            });

            if (authError) {
                console.error('Auth Error Details:', authError);
                throw authError;
            }

            console.log('Sign in successful, session:', data.session ? 'exists' : 'missing');

            router.replace('/');
            router.refresh();
            
        } catch (err: any) {
            console.error('Login caught error:', err);
            setError(err.message || 'Failed to sign in. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.loginContainer}>
            <div className={styles.loginCard}>
                <div className={styles.loginHeader}>
                    <div className={styles.logoOuter}>
                        <img src="/RSP_LOGO.png" alt="RSP Logo" className={styles.loginLogo} />
                    </div>
                    <h1>Raon Sales Portal</h1>
                    <p>Enter your credentials to access the RSP Customer Dashboard</p>
                </div>

                <form onSubmit={handleLogin} className={styles.loginForm}>
                    <div className={styles.formGroup}>
                        <label>Email Address</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="name@raontech.com"
                            className={styles.input}
                            required
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label>Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Type your password"
                            className={styles.input}
                            required
                        />
                    </div>

                    {error && (
                        <div className={styles.loginError}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                            </svg>
                            <span>{error}</span>
                        </div>
                    )}

                    <button type="submit" className={styles.loginButton} disabled={loading}>
                        {loading ? 'Authenticating...' : 'Sign In to Portal'}
                    </button>
                </form>

                <div className={styles.loginFooter}>
                    &copy; {new Date().getFullYear()} Raontech Inc. All rights reserved.
                </div>
            </div>
        </div>
    );
}
