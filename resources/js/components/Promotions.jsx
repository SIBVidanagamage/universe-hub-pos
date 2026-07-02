import React, { useState, useEffect } from 'react';
import { Mail, Settings, Send, Users, ShieldAlert, Image as ImageIcon } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';

export function Promotions() {
    const { token } = useAuth();
    const { toast } = useToast();
    
    // UI State
    const [activeTab, setActiveTab] = useState('send');

    // Settings State
    const [emailConfig, setEmailConfig] = useState({ email: '', password: '' });
    const [savingSettings, setSavingSettings] = useState(false);
    
    // Promotion State
    const [promo, setPromo] = useState({ subject: '', message: '' });
    const [image, setImage] = useState(null);
    const [sending, setSending] = useState(false);

    useEffect(() => {
        fetchSettings();
    }, [token]);

    const fetchSettings = async () => {
        if (!token) return;
        try {
            const response = await fetch('/api/v1/settings/email', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });
            if (response.ok) {
                const data = await response.json();
                setEmailConfig({
                    email: data.MAIL_USERNAME || '',
                    password: data.MAIL_PASSWORD || ''
                });
            }
        } catch (error) {
            console.error('Failed to load settings', error);
        }
    };

    const handleSaveSettings = async (e) => {
        e.preventDefault();
        setSavingSettings(true);
        try {
            const response = await fetch('/api/v1/settings/email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                },
                body: JSON.stringify(emailConfig)
            });
            const data = await response.json();
            if (response.ok) {
                toast({ title: 'Success', description: 'Email settings saved successfully.' });
            } else {
                throw new Error(data.message || 'Failed to save settings');
            }
        } catch (error) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        } finally {
            setSavingSettings(false);
        }
    };

    const handleSendPromotion = async (e) => {
        e.preventDefault();
        if (!promo.subject || !promo.message) {
            toast({ title: 'Validation Error', description: 'Subject and message are required.', variant: 'destructive' });
            return;
        }

        setSending(true);
        try {
            const formData = new FormData();
            formData.append('subject', promo.subject);
            formData.append('message', promo.message);
            if (image) {
                formData.append('image', image);
            }

            const response = await fetch('/api/v1/promotions/send', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                },
                body: formData
            });
            const data = await response.json();
            
            if (response.ok) {
                toast({ title: 'Success', description: data.message });
                setPromo({ subject: '', message: '' });
                setImage(null);
                // Reset file input by clearing its value
                const fileInput = document.getElementById('image');
                if (fileInput) fileInput.value = '';
            } else {
                throw new Error(data.message || 'Failed to send promotions');
            }
        } catch (error) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-4xl font-bold tracking-tight text-white drop-shadow-md">Promotions & Marketing</h1>
                    <p className="text-cosmic-titanium mt-1 text-lg">Send marketing emails and configure email settings</p>
                </div>
            </div>

            <div className="w-full">
                <div className="grid w-full grid-cols-2 bg-white/5 border border-white/10 rounded-2xl p-1 mb-6">
                    <button 
                        onClick={() => setActiveTab('send')}
                        className={`flex items-center justify-center py-3 px-4 rounded-xl transition-all text-sm font-medium ${activeTab === 'send' ? 'bg-gradient-to-r from-cosmic-blue to-cosmic-purple text-white shadow-[0_0_15px_rgba(123,97,255,0.4)] border border-white/20' : 'text-cosmic-titanium hover:text-white hover:bg-white/5'}`}
                    >
                        <Send className="w-4 h-4 mr-2" /> Send Promotion
                    </button>
                    <button 
                        onClick={() => setActiveTab('settings')}
                        className={`flex items-center justify-center py-3 px-4 rounded-xl transition-all text-sm font-medium ${activeTab === 'settings' ? 'bg-gradient-to-r from-cosmic-blue to-cosmic-purple text-white shadow-[0_0_15px_rgba(123,97,255,0.4)] border border-white/20' : 'text-cosmic-titanium hover:text-white hover:bg-white/5'}`}
                    >
                        <Settings className="w-4 h-4 mr-2" /> Email Settings
                    </button>
                </div>

                {activeTab === 'send' && (
                    <div className="mt-4">
                        <Card className="glass-effect shadow-xl">
                            <CardHeader>
                                <CardTitle className="text-2xl text-white flex items-center gap-2">
                                    <Mail className="w-6 h-6 text-cosmic-blue drop-shadow-[0_0_8px_rgba(0,122,255,0.5)]" /> Compose Email
                                </CardTitle>
                                <CardDescription className="text-cosmic-titanium text-base">
                                    This message will be sent to all customers who have an email address registered in the system.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleSendPromotion} className="space-y-4">
                                    <div>
                                        <Label htmlFor="subject" className="text-white font-medium">Email Subject</Label>
                                        <Input 
                                            id="subject"
                                            placeholder="e.g. 50% Off on all Phone Cases!" 
                                            value={promo.subject}
                                            onChange={(e) => setPromo({ ...promo, subject: e.target.value })}
                                            className="bg-white/5 border-white/10 text-white mt-1 focus-visible:ring-cosmic-blue rounded-xl"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="image" className="text-white font-medium">Promotion Image (Optional)</Label>
                                        <div className="flex items-center gap-3 mt-1">
                                            <div className="relative flex-1">
                                                <Input 
                                                    id="image"
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={(e) => setImage(e.target.files[0])}
                                                    className="bg-white/5 border-white/10 text-white file:text-cosmic-blue file:bg-cosmic-blue/10 file:border-0 file:rounded-lg file:px-4 file:py-2 file:mr-3 hover:file:bg-cosmic-blue/20 rounded-xl"
                                                />
                                            </div>
                                            {image && (
                                                <span className="text-xs text-green-400 flex items-center shrink-0">
                                                    <ImageIcon className="w-4 h-4 mr-1" />
                                                    Selected
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <Label htmlFor="message" className="text-white font-medium">Message Body</Label>
                                        <textarea
                                            id="message"
                                            rows="8"
                                            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-cosmic-blue mt-1 transition-all"
                                            placeholder="Write your promotional message here..."
                                            value={promo.message}
                                            onChange={(e) => setPromo({ ...promo, message: e.target.value })}
                                            required
                                        ></textarea>
                                    </div>
                                    <Button 
                                        type="submit" 
                                        className="liquid-button w-full bg-gradient-to-r from-cosmic-blue to-cosmic-purple text-white border border-white/20 rounded-xl py-6 text-lg font-medium shadow-[0_0_15px_rgba(123,97,255,0.4)]"
                                        disabled={sending}
                                    >
                                        {sending ? 'Sending to Customers...' : (
                                            <><Send className="w-4 h-4 mr-2" /> Send to All Customers</>
                                        )}
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {activeTab === 'settings' && (
                    <div className="mt-4">
                        <Card className="glass-effect shadow-xl">
                            <CardHeader>
                                <CardTitle className="text-2xl text-white flex items-center gap-2">
                                    <Settings className="w-6 h-6 text-cosmic-titanium" /> Gmail Configuration
                                </CardTitle>
                                <CardDescription className="text-cosmic-titanium text-base">
                                    Enter your shop's Gmail address and an App Password to allow the system to send emails (Bills and Promotions).
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-md p-4 mb-6 text-sm text-yellow-200 flex gap-3">
                                    <ShieldAlert className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-semibold mb-1">Important: Regular passwords will NOT work!</p>
                                        <p>You must use a 16-character <strong>App Password</strong> generated from your Google Account.</p>
                                        <ol className="list-decimal ml-4 mt-2 space-y-1 opacity-90">
                                            <li>Go to Google Account Manage &gt; Security</li>
                                            <li>Enable 2-Step Verification</li>
                                            <li>Search for "App Passwords" and create one</li>
                                            <li>Paste the 16-character password below</li>
                                        </ol>
                                    </div>
                                </div>
                                
                                <form onSubmit={handleSaveSettings} className="space-y-4">
                                    <div>
                                        <Label htmlFor="email" className="text-white font-medium">Shop Gmail Address</Label>
                                        <Input 
                                            id="email"
                                            type="email"
                                            placeholder="shop@gmail.com" 
                                            value={emailConfig.email}
                                            onChange={(e) => setEmailConfig({ ...emailConfig, email: e.target.value })}
                                            className="bg-white/5 border-white/10 text-white mt-1 focus-visible:ring-cosmic-purple rounded-xl"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="password" className="text-white font-medium">Google App Password (16 characters)</Label>
                                        <Input 
                                            id="password"
                                            type="password"
                                            placeholder="abcd efgh ijkl mnop" 
                                            value={emailConfig.password}
                                            onChange={(e) => setEmailConfig({ ...emailConfig, password: e.target.value })}
                                            className="bg-white/5 border-white/10 text-white mt-1 font-mono tracking-widest focus-visible:ring-cosmic-purple rounded-xl"
                                            required
                                        />
                                    </div>
                                    <Button 
                                        type="submit" 
                                        className="liquid-button w-full bg-white/10 hover:bg-white/20 text-white border border-white/20 mt-4 rounded-xl py-6 text-lg font-medium shadow-[0_0_15px_rgba(255,255,255,0.1)]"
                                        disabled={savingSettings}
                                    >
                                        {savingSettings ? 'Saving Configuration...' : 'Save Email Settings'}
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>
        </div>
    );
}
