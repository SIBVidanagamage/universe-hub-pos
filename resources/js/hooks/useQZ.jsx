import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';

// This hook encapsulates all interaction with the QZ Tray desktop application.
export function useQZ() {
    const { toast } = useToast();

    // Attempt to connect to the QZ Tray desktop app via WebSocket.
    const connect = useCallback(async () => {
        if (typeof qz === 'undefined') {
            const msg = "QZ Tray JS library is not loaded. Please check the script tag in your index.html file.";
            console.error(msg);
            toast({ title: "QZ Tray Error", description: msg, variant: "destructive" });
            return;
        }
        if (qz.websocket.isActive()) {
            return;
        }
        try {
            await qz.websocket.connect();
        } catch (err) {
            if (err.message && (err.message.includes("Waiting for previous disconnect") || err.message.includes("Connection attempt cancelled"))) {
                return;
            }
            console.error("QZ Tray Connection Error:", err);
        }
    }, [toast]);

    const print = useCallback(async (config, data) => {
        if (typeof qz === 'undefined' || !qz.websocket.isActive()) {
            toast({ title: "Printer Error", description: "Not connected to QZ Tray. Please ensure the QZ Tray application is running on your computer.", variant: "destructive" });
            
            // Try to connect again in the background just in case it was started recently
            connect();
            return;
        }
        try {
            await qz.print(config, data);
            toast({ title: "Success", description: "Print job sent to printer." });
        } catch (err) {
            console.error("Printing error:", err);
            toast({ title: "Printing Error", description: err.message, variant: "destructive" });
        }
    }, [toast, connect]);

    return { 
        get isConnected() { return typeof qz !== 'undefined' && qz.websocket.isActive(); }, 
        connect, 
        print 
    };
}
