import React, { useState, useEffect } from 'react';
import {
  Users,
  ShieldAlert,
  BarChart3,
  FileText,
  Search,
  CheckCircle2,
  XCircle,
  Trash2,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import api from '../services/api';
import AdminResolvedItemsPage from '../pages/AdminResolvedItemsPage';
import { useSocket } from '../context/SocketContext';

export default function AdminDashboardPage() {
  const { addToast } = useSocket();
  const [activeTab, setActiveTab] = useState('overview');

  // Stats
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);

  // Users Management
  const [users, setUsers] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Moderation Queue
  const [flaggedItems, setFlaggedItems] = useState([]);
  const [loadingFlags, setLoadingFlags] = useState(false);

  // Audit Logs
  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    if (activeTab === 'users') fetchUsers();
    if (activeTab === 'moderation') fetchModeration();
    if (activeTab === 'audit') fetchLogs();
  }, [activeTab]);

  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const res = await api.get('/admin/stats');
      if (res.data?.success) setStats(res.data.stats);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const params = new URLSearchParams();
      if (userSearch.trim()) params.append('search', userSearch.trim());
      const res = await api.get(`/admin/users?${params.toString()}`);
      if (res.data?.success) setUsers(res.data.users);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchModeration = async () => {
    setLoadingFlags(true);
    try {
      const res = await api.get('/admin/moderation');
      if (res.data?.success) setFlaggedItems(res.data.items);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingFlags(false);
    }
  };

  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      const res = await api.get('/admin/audit-logs');
      if (res.data?.success) setLogs(res.data.logs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      const res = await api.patch(`/admin/users/${userId}/role`, { role: newRole });
      if (res.data?.success) {
        setUsers((prev) => prev.map((u) => (u._id === userId ? { ...u, role: newRole } : u)));
        addToast({ type: 'success', title: 'Role Updated', message: res.data.message });
      }
    } catch (err) {
      addToast({ type: 'alert', title: 'Action Failed', message: err.message });
    }
  };

  const handleStatusToggle = async (userId, currentStatus) => {
    const nextStatus = currentStatus === 'active' ? 'suspended' : 'active';
    try {
      const res = await api.patch(`/admin/users/${userId}/status`, { status: nextStatus });
      if (res.data?.success) {
        setUsers((prev) =>
          prev.map((u) => (u._id === userId ? { ...u, status: nextStatus } : u))
        );
        addToast({ type: 'info', title: 'Status Changed', message: res.data.message });
      }
    } catch (err) {
      addToast({ type: 'alert', title: 'Action Failed', message: err.message });
    }
  };

  const handleDismissFlags = async (itemId) => {
    try {
      const res = await api.patch(`/admin/items/${itemId}/dismiss-flags`);
      if (res.data?.success) {
        setFlaggedItems((prev) => prev.filter((i) => i._id !== itemId));
        addToast({ type: 'success', title: 'Flags Dismissed', message: res.data.message });
        fetchStats();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteItemByAdmin = async (itemId) => {
    if (!window.confirm('Permanently remove this item and notify the user?')) return;
    try {
      const res = await api.delete(`/admin/items/${itemId}`);
      if (res.data?.success) {
        setFlaggedItems((prev) => prev.filter((i) => i._id !== itemId));
        addToast({ type: 'info', title: 'Item Removed', message: res.data.message });
        fetchStats();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-bold mb-2">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Campus Security &amp; Moderation Center</span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Admin Console</h1>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-400 font-semibold block">Total Users</span>
          <span className="text-2xl font-black text-slate-900 mt-1 block">
            {stats?.totalUsers ?? '...'}
          </span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-400 font-semibold block">Total Reports</span>
          <span className="text-2xl font-black text-slate-900 mt-1 block">
            {stats?.totalItems ?? '...'}
          </span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-400 font-semibold block">Ownership Claims</span>
          <span className="text-2xl font-black text-blue-600 mt-1 block">
            {stats?.totalClaims ?? '...'}
          </span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-400 font-semibold block">Recovery Rate</span>
          <span className="text-2xl font-black text-emerald-600 mt-1 block">
            {stats ? `${stats.recoveryRate}%` : '...'}
          </span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm col-span-2 lg:col-span-1">
          <span className="text-xs text-slate-400 font-semibold block">Flagged Items</span>
          <span className="text-2xl font-black text-red-600 mt-1 block">
            {stats?.flaggedCount ?? '0'}
          </span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        {[
          { id: 'overview', label: 'Platform Analytics', icon: BarChart3 },
          { id: 'users', label: 'User Management', icon: Users },
          { id: 'moderation', label: `Moderation Queue (${flaggedItems.length})`, icon: AlertTriangle },
          { id: 'resolved', label: 'Resolved Items', icon: RotateCcw },
          { id: 'audit', label: 'Security Audit Trail', icon: FileText },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition shrink-0 ${
                isActive
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Platform Analytics */}
      {activeTab === 'overview' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
          <h2 className="text-lg font-bold text-slate-900">Category Distribution &amp; Volume</h2>
          <div className="space-y-4">
            {stats?.categoryBreakdown?.map((cat) => {
              const pct =
                stats.totalItems > 0 ? Math.round((cat.count / stats.totalItems) * 100) : 0;
              return (
                <div key={cat._id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-800">{cat._id}</span>
                    <span className="text-slate-500">
                      {cat.count} items ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 2: User Management */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-slate-900">Registered Campus Accounts</h2>
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchUsers()}
                className="w-full pl-9 pr-3.5 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-3 px-2">Name &amp; Email</th>
                  <th className="py-3 px-2">Student ID</th>
                  <th className="py-3 px-2">Role</th>
                  <th className="py-3 px-2">Status</th>
                  <th className="py-3 px-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u._id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-2">
                      <strong className="block text-slate-900">{u.name}</strong>
                      <span className="text-slate-400">{u.email}</span>
                    </td>
                    <td className="py-3 px-2 font-medium text-slate-600">
                      {u.studentId || '—'}
                    </td>
                    <td className="py-3 px-2">
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u._id, e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-semibold"
                      >
                        <option value="user">User</option>
                        <option value="moderator">Moderator</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td className="py-3 px-2">
                      <span
                        className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                          u.status === 'active'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {u.status}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-right">
                      <button
                        onClick={() => handleStatusToggle(u._id, u.status)}
                        className={`px-2.5 py-1 rounded-lg font-bold text-[11px] ${
                          u.status === 'active'
                            ? 'bg-red-50 text-red-600 hover:bg-red-100'
                            : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                        }`}
                      >
                        {u.status === 'active' ? 'Suspend' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Moderation Queue */}
      {activeTab === 'moderation' && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900">
            Flagged Items Awaiting Review ({flaggedItems.length})
          </h2>

          {flaggedItems.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center text-xs text-slate-500">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
              <span>Moderation queue is clean. No flagged items detected!</span>
            </div>
          ) : (
            <div className="space-y-3">
              {flaggedItems.map((item) => (
                <div
                  key={item._id}
                  className="bg-white rounded-2xl border border-red-200 p-5 shadow-sm space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-100 text-red-800 uppercase">
                        {item.flagCount} Flags Received
                      </span>
                      <h3 className="text-base font-bold text-slate-900 mt-1">{item.title}</h3>
                      <p className="text-xs text-slate-500">{item.description}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDismissFlags(item._id)}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                      >
                        Dismiss Flags
                      </button>
                      <button
                        onClick={() => handleDeleteItemByAdmin(item._id)}
                        className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs"
                      >
                        Remove Listing
                      </button>
                    </div>
                  </div>

                  <div className="p-3 bg-red-50/60 rounded-xl text-xs text-red-900">
                    <strong className="block mb-1">Flag Explanations:</strong>
                    <ul className="list-disc pl-4 space-y-0.5">
                      {item.flagReasons?.map((f, i) => (
                        <li key={i}>{f.reason}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

        {/* Tab 4: Resolved Items (Admin) */}
        {activeTab === 'resolved' && (
          <AdminResolvedItemsPage />
        )}

      {/* Tab 4: Security Audit Trail */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-slate-900">System Security Audit Trail</h2>

          <div className="divide-y divide-slate-100">
            {logs.map((log) => (
              <div key={log._id} className="py-3 flex items-start justify-between text-xs">
                <div>
                  <strong className="font-bold text-slate-900 block">{log.action}</strong>
                  <span className="text-slate-500">
                    By: {log.actor?.name || 'System'} ({log.actor?.email || 'N/A'}) • Target:{' '}
                    {log.targetModel}
                  </span>
                </div>
                <div className="text-right text-slate-400">
                  <span>{new Date(log.createdAt).toLocaleString()}</span>
                  <span className="block text-[10px]">{log.ipAddress || '127.0.0.1'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
