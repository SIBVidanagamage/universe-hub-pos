import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export function Repairs() {
    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight text-white mb-6">Repair Management</h1>
            <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
                <CardHeader>
                    <CardTitle className="text-white">Active Repairs</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-gray-400">Repair module coming soon...</p>
                </CardContent>
            </Card>
        </div>
    );
}
