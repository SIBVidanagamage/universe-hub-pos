import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';

// This hook encapsulates all interaction with the QZ Tray desktop application.
export function useQZ() {
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState(null);
    const { toast } = useToast();

    // Attempt to connect to the QZ Tray desktop app via WebSocket.
    const connect = useCallback(async () => {
        if (typeof qz === 'undefined') {
            const msg = "QZ Tray JS library is not loaded. Please check the script tag in your Blade file.";
            console.error(msg);
            setError(msg);
            toast({ title: "QZ Tray Error", description: msg, variant: "destructive" });
            return;
        }
        if (qz.websocket.isActive()) {
            setIsConnected(true);
            return;
        }
        try {
            await qz.websocket.connect();
            setIsConnected(true);
            toast({ title: "Success", description: "Connected to QZ Tray." });
        } catch (err) {
            console.error("QZ Tray Connection Error:", err);
            const errMsg = "Could not connect to QZ Tray. Please ensure it is running.";
            setError(errMsg);
            toast({ title: "Connection Error", description: errMsg, variant: "destructive" });
        }
    }, [toast]);

    // Send print data to the specified printer configuration.
    // FIX: The function now correctly accepts a 'config' object and the 'data' payload.
    const print = useCallback(async (config, data) => {
        if (!isConnected) {
            toast({ title: "Printer Error", description: "Not connected to QZ Tray.", variant: "destructive" });
            return;
        }
        try {
            // Pass the config and data directly to the QZ Tray print function.
            await qz.print(config, data);
            toast({ title: "Success", description: "Print job sent to printer." });
        } catch (err) {
            console.error("Printing error:", err);
            toast({ title: "Printing Error", description: err.message, variant: "destructive" });
        }
    }, [isConnected, toast]);

    // Disconnect when the application closes.
    useEffect(() => {
        return () => {
            if (typeof qz !== 'undefined' && qz.websocket.isActive()) {
                qz.websocket.disconnect();
            }
        };
    }, []);

    return { isConnected, error, connect, print };
}
