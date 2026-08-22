import React, { useState, useEffect } from 'react';
import { Mail, Settings, Send, Users, ShieldAlert, Image as ImageIcon } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';

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

    // Inbox State
    const [inboxEmails, setInboxEmails] = useState([]);
    const [loadingInbox, setLoadingInbox] = useState(false);
    const [selectedEmail, setSelectedEmail] = useState(null);

    useEffect(() => {
        fetchSettings();
    }, [token]);

    const fetchSettings = async () => {
        if (!token) return;
        try {
            const { data, error } = await supabase.from('settings').select('value').eq('key', 'email_config').single();
            if (error) {
                // Ignore if not found
                if (error.code !== 'PGRST116') throw error;
            } else if (data && data.value) {
                setEmailConfig({
                    email: data.value.MAIL_USERNAME || '',
                    password: data.value.MAIL_PASSWORD || ''
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
            const payload = {
                key: 'email_config',
                value: {
                    MAIL_USERNAME: emailConfig.email,
                    MAIL_PASSWORD: emailConfig.password
                }
            };
            // Upsert setting
            const { error } = await supabase.from('settings').upsert([payload], { onConflict: 'key' });
            if (error) throw error;
            
            toast({ title: 'Success', description: 'Email settings saved successfully.' });
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
            // Fetch all unique customer emails from Supabase
            const { data: customers, error } = await supabase
                .from('customers')
                .select('email')
                .not('email', 'is', null)
                .neq('email', '');

            if (error) throw error;

            const emails = [...new Set(customers.map(c => c.email))];
            
            if (emails.length === 0) {
                toast({ title: 'Warning', description: 'No customers with email addresses found.', variant: 'destructive' });
                setSending(false);
                return;
            }

            // Convert newline to HTML breaks for the message
            const htmlMessage = promo.message.replace(/\n/g, '<br/>');

            // Process image to Base64 if attached
            let base64Image = null;
            let imageFileName = null;
            if (image) {
                base64Image = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result);
                    reader.onerror = error => reject(error);
                    reader.readAsDataURL(image);
                });
                imageFileName = image.name;
            }

            const htmlContent = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9f9f9; padding: 20px; border-radius: 10px;">
                    <h2 style="color: #4f46e5; text-align: center;">UNIVERSE HUB</h2>
                    <h3 style="text-align: center; color: #333;">${promo.subject}</h3>
                    ${base64Image ? '<div style="text-align: center; margin-bottom: 20px;"><img src="cid:promo-image" style="max-width: 100%; border-radius: 8px;" alt="Promotion Image" /></div>' : ''}
                    <div style="background-color: #ffffff; padding: 20px; border-radius: 8px; font-size: 16px; color: #444; line-height: 1.5;">
                        <p>${htmlMessage}</p>
                    </div>
                    <p style="text-align: center; font-size: 12px; color: #999; margin-top: 20px;">
                        You are receiving this email because you are a valued customer of Universe Hub.<br/>
                        For inquiries, please contact us.
                    </p>
                </div>
            `;

            const response = await fetch('/api/send-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    bcc: emails.join(','),
                    subject: promo.subject,
                    html: htmlContent,
                    image: base64Image,
                    imageFileName: imageFileName
                })
            });

            if (!response.ok) {
                throw new Error('Email server returned ' + response.status);
            }
            
            toast({ title: 'Success', description: `Promotion successfully sent to ${emails.length} customers!` });
            setPromo({ subject: '', message: '' });
            setImage(null);
            const fileInput = document.getElementById('image');
            if (fileInput) fileInput.value = '';
        } catch (error) {
            console.error("Promotion Error:", error);
            toast({ title: 'Error', description: error.message || 'Failed to send promotion.', variant: 'destructive' });
        } finally {
            setSending(false);
        }
    };

    const fetchInbox = async () => {
        setLoadingInbox(true);
        try {
            const response = await fetch('/api/inbox');
            if (!response.ok) throw new Error('Failed to fetch inbox');
            const data = await response.json();
            setInboxEmails(data);
        } catch (error) {
            toast({ title: 'Inbox Error', description: error.message, variant: 'destructive' });
        } finally {
            setLoadingInbox(false);
        }
    };

    // Auto-fetch inbox when tab becomes active
    useEffect(() => {
        if (activeTab === 'inbox') {
            fetchInbox();
        }
    }, [activeTab]);

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-4xl font-bold tracking-tight text-white drop-shadow-md">Promotions & Marketing</h1>
                    <p className="text-cosmic-titanium mt-1 text-lg">Send marketing emails and read customer replies</p>
                </div>
            </div>

            <div className="w-full">
                <div className="grid w-full grid-cols-3 bg-white/5 border border-white/10 rounded-2xl p-1 mb-6">
                    <button 
                        onClick={() => setActiveTab('send')}
                        className={`flex items-center justify-center py-3 px-4 rounded-xl transition-all text-sm font-medium ${activeTab === 'send' ? 'bg-gradient-to-r from-cosmic-blue to-cosmic-purple text-white shadow-[0_0_15px_rgba(123,97,255,0.4)] border border-white/20' : 'text-cosmic-titanium hover:text-white hover:bg-white/5'}`}
                    >
                        <Send className="w-4 h-4 mr-2" /> Send Promotion
                    </button>
                    <button 
                        onClick={() => setActiveTab('inbox')}
                        className={`flex items-center justify-center py-3 px-4 rounded-xl transition-all text-sm font-medium ${activeTab === 'inbox' ? 'bg-gradient-to-r from-cosmic-blue to-cosmic-purple text-white shadow-[0_0_15px_rgba(123,97,255,0.4)] border border-white/20' : 'text-cosmic-titanium hover:text-white hover:bg-white/5'}`}
                    >
                        <Mail className="w-4 h-4 mr-2" /> Inbox (Replies)
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

                {activeTab === 'inbox' && (
                    <div className="mt-4">
                        <Card className="glass-effect shadow-xl">
                            <CardHeader>
                                <CardTitle className="text-2xl text-white flex items-center gap-2">
                                    <Mail className="w-6 h-6 text-cosmic-blue" /> Customer Replies
                                </CardTitle>
                                <CardDescription className="text-cosmic-titanium text-base">
                                    Recent emails in your shop's Gmail inbox.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {loadingInbox ? (
                                    <div className="text-center py-8 text-cosmic-titanium animate-pulse">
                                        Loading emails from Gmail...
                                    </div>
                                ) : inboxEmails.length === 0 ? (
                                    <div className="text-center py-8 text-cosmic-titanium">
                                        No emails found.
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {inboxEmails.map((email) => (
                                            <div 
                                                key={email.id} 
                                                onClick={() => setSelectedEmail(email)}
                                                className="bg-white/5 border border-white/10 p-4 rounded-xl cursor-pointer hover:bg-white/10 transition-colors"
                                            >
                                                <div className="flex justify-between items-start mb-1">
                                                    <h3 className="text-white font-semibold truncate flex-1">{email.subject || '(No Subject)'}</h3>
                                                    <span className="text-xs text-cosmic-titanium ml-4 shrink-0">
                                                        {new Date(email.date).toLocaleDateString()}
                                                    </span>
                                                </div>
                                                <div className="text-sm text-gray-300 truncate mb-1">From: {email.from}</div>
                                                <div className="text-xs text-gray-500 truncate">{email.snippet}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>

            {/* Email Reader Dialog */}
            <Dialog open={!!selectedEmail} onOpenChange={(open) => !open && setSelectedEmail(null)}>
                <DialogContent className="glass-effect border-white/20 max-w-3xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-xl text-white">{selectedEmail?.subject || '(No Subject)'}</DialogTitle>
                        <DialogDescription className="text-cosmic-titanium">
                            From: {selectedEmail?.from} <br/>
                            Date: {selectedEmail ? new Date(selectedEmail.date).toLocaleString() : ''}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="mt-4 p-4 bg-white/5 border border-white/10 rounded-xl text-white">
                        {selectedEmail?.html ? (
                            <div className="email-html-content" dangerouslySetInnerHTML={{ __html: selectedEmail.html }} />
                        ) : (
                            <pre className="whitespace-pre-wrap font-sans text-sm">{selectedEmail?.text}</pre>
                        )}
                    </div>
                    <div className="mt-4 flex justify-end">
                        <Button variant="outline" onClick={() => setSelectedEmail(null)} className="border-white/20 text-white">
                            Close
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
