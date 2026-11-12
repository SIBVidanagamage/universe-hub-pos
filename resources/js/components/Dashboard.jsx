import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useInventory } from '@/hooks/useInventory';
import { useSales } from '@/hooks/useSales';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer
} from 'recharts';
import {
  Package,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Clock
} from 'lucide-react';

export function Dashboard() {
  const { inventory, lowStockItems } = useInventory();
  // Destructure stats. We will use optional chaining below to ensure it's safe.
  const { stats } = useSales();

  const dashboardStats = [
    {
      title: "Total Items",
      value: inventory.length,
      icon: Package,
      color: "from-cosmic-blue to-cyan-500 shadow-[0_0_15px_rgba(0,122,255,0.4)]",
      description: "Items in inventory"
    },
    {
      title: "Low Stock Alerts",
      value: lowStockItems.length,
      icon: AlertTriangle,
      color: "from-cosmic-error to-red-400 shadow-[0_0_15px_rgba(255,59,48,0.4)]",
      description: "Items need restocking"
    },
    {
      title: "Today's Sales",
      value: `LKR ${parseFloat(stats?.todaysRevenue || 0).toFixed(2)}`,
      icon: DollarSign,
      color: "from-cosmic-success to-emerald-400 shadow-[0_0_15px_rgba(52,199,89,0.4)]",
      description: `${stats?.todaysSalesCount || 0} transactions`
    },
    {
      title: "This Month's Revenue",
      value: `LKR ${parseFloat(stats?.monthlyRevenue || 0).toFixed(2)}`,
      icon: TrendingUp,
      color: "from-cosmic-purple to-fuchsia-500 shadow-[0_0_15px_rgba(123,97,255,0.4)]",
      description: "Revenue for the current month"
    }
  ];

  // This can be replaced with a proper activity log system later
  const recentActivity = JSON.parse(localStorage.getItem('activityLogs') || '[]').slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-white drop-shadow-md">Dashboard</h1>
          <p className="text-cosmic-titanium mt-1 text-lg">Welcome to Universe Hub Inventory</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-cosmic-titanium">Last updated</p>
          <p className="text-xl font-semibold text-white tracking-widest">{new Date().toLocaleTimeString()}</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {dashboardStats.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="glass-effect border-white/10 card-hover">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-cosmic-titanium mb-1">{stat.title}</p>
                    <p className="text-3xl font-bold text-white tracking-tight">{stat.value}</p>
                    <p className="text-xs text-gray-400 mt-1">{stat.description}</p>
                  </div>
                  <div className={`p-3 rounded-full bg-gradient-to-r ${stat.color}`}>
                    <stat.icon className="w-6 h-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Sales Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="glass-effect border-white/10 mb-6">
            <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                    <TrendingUp className="w-6 h-6 text-cosmic-purple drop-shadow-[0_0_8px_rgba(123,97,255,0.5)]" />
                    Sales Overview (Last 30 Days)
                </CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
                {stats?.chartData && stats.chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={260} minHeight={200}>
                        <LineChart data={stats.chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                            <XAxis dataKey="date" stroke="rgba(255,255,255,0.5)" tick={{fill: 'rgba(255,255,255,0.5)', fontSize: 12}} />
                            <YAxis stroke="rgba(255,255,255,0.5)" tick={{fill: 'rgba(255,255,255,0.5)', fontSize: 12}} tickFormatter={(value) => `LKR ${value}`} />
                            <RechartsTooltip 
                                contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                                itemStyle={{ color: '#fff' }}
                            />
                            <Line type="monotone" dataKey="revenue" stroke="#8b5cf6" strokeWidth={3} dot={{ fill: '#8b5cf6', strokeWidth: 2 }} activeDot={{ r: 8 }} />
                        </LineChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-full flex items-center justify-center text-gray-400">
                        No sales data available for the last 30 days.
                    </div>
                )}
            </CardContent>
        </Card>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low Stock Alerts */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="glass-effect border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <AlertTriangle className="w-6 h-6 text-cosmic-warning drop-shadow-[0_0_8px_rgba(255,149,0,0.5)]" />
                Low Stock Alerts
              </CardTitle>
              <CardDescription>Items that need immediate attention</CardDescription>
            </CardHeader>
            <CardContent>
              {lowStockItems.length === 0 ? (
                <p className="text-gray-400 text-center py-4">No low stock items</p>
              ) : (
                <div className="space-y-3">
                  {lowStockItems.slice(0, 5).map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                      <div>
                        <p className="font-medium text-white text-lg">{item.name}</p>
                        <p className="text-sm text-cosmic-titanium tracking-wider">SKU: {item.sku}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant="destructive" className="bg-cosmic-error/20 text-red-400 hover:bg-cosmic-error/30 border border-cosmic-error/30 shadow-[0_0_10px_rgba(255,59,48,0.2)] px-3 py-1 text-sm">{item.quantity} left</Badge>
                        <p className="text-xs text-cosmic-titanium mt-1">Min: {item.minStock}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="glass-effect border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Clock className="w-6 h-6 text-cosmic-blue drop-shadow-[0_0_8px_rgba(0,122,255,0.5)]" />
                Recent Activity
              </CardTitle>
              <CardDescription>Latest system activities</CardDescription>
            </CardHeader>
            <CardContent>
              {recentActivity.length === 0 ? (
                <p className="text-gray-400 text-center py-4">No recent activity</p>
              ) : (
                <div className="space-y-3">
                  {recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-start gap-3 p-3 bg-white/5 rounded-xl border border-white/5 shadow-inner">
                      <div className="w-3 h-3 bg-cosmic-blue rounded-full mt-1 shadow-[0_0_10px_rgba(0,122,255,0.8)]"></div>
                      <div className="flex-1">
                        <p className="text-sm text-white font-medium">{activity.description}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-xs text-cosmic-titanium">{activity.user}</p>
                          <span className="text-xs text-gray-500">•</span>
                          <p className="text-xs text-cosmic-titanium tracking-wider">
                            {new Date(activity.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
