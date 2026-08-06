import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import bcrypt from 'bcryptjs';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Smartphone, Lock, Mail } from 'lucide-react'; // Changed User to Mail icon

// The onLogin function will now be provided by a custom hook or context
export function Login({ onLogin }) {
  // State now holds email and password, matching the backend
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // --- Database Call to Supabase ---
      const { data: users, error: dbError } = await supabase
        .from('users')
        .select('*')
        .eq('email', credentials.email);

      if (dbError) throw dbError;

      const user = users?.[0];
      if (!user) {
        throw new Error('Invalid credentials');
      }

      // Verify password using bcryptjs
      const isMatch = await bcrypt.compare(credentials.password, user.password);
      
      if (!isMatch) {
        throw new Error('Invalid credentials');
      }

      // --- Handle Successful Login ---
      toast({
        title: "Login Successful",
        description: `Welcome back!`,
      });
      
      // Simulate a token for local state management
      const fakeToken = btoa(user.email + Date.now());
      onLogin({ token: fakeToken, user }); 
    } catch (error) {
      toast({
        title: "Login Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-800 relative z-10 pointer-events-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="glass-effect border-white/20">
          <CardHeader className="text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="mx-auto mb-4 w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center"
            >
              <Smartphone className="w-8 h-8 text-white" />
            </motion.div>
            <CardTitle className="text-2xl gradient-text">UNIVERSE HUB</CardTitle>
            <CardDescription className="text-gray-300">
              Inventory Management & Billing System
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                {/* Changed from Username to Email to match backend */}
                <Label htmlFor="email" className="text-gray-200">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={credentials.email}
                    onChange={(e) => setCredentials(prev => ({ ...prev, email: e.target.value }))}
                    className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-200">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter password"
                    value={credentials.password}
                    onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
                    className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                    required
                  />
                </div>
              </div>
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                disabled={loading}
              >
                {loading ? 'Signing In...' : 'Sign In'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
