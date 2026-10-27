import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Package,
  ShieldCheck,
  Bell,
  User as UserIcon,
  CheckCircle2,
  Clock,
  XCircle,
  Trash2,
  MapPin,
  Calendar,
  ExternalLink,
  Save,
  Database,
  ArrowRight,
  Eye,
  Check,
  X,
  AlertCircle,
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

export default function DashboardPage() {
  const { user, updateUser } = useAuth();
  const { addToast, setUnreadNotifications } = useSocket();
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab = searchParams.get('tab') || 'reports';

  // Data States
  const [reports, setReports] = useState([]);
  const [claims, setClaims] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  // Profile Form State
  const [profileName, setProfileName] = useState(user?.name || '');
  const [profilePhone, setProfilePhone] = useState(user?.phone || '');
  const [profileContactPref, setProfileContactPref] = useState(user?.contactPreference || 'in_app');
  const [savingProfile, setSavingProfile] = useState(false);

  // Claim Review Drawer / Modal for Finder
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedItemClaims, setSelectedItemClaims] = useState([]);
  const [selectedItemTitle, setSelectedItemTitle] = useState('');
  const [secretIdentifyingInfo, setSecretIdentifyingInfo] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // Legacy LocalStorage Migration State
  const [legacyItems, setLegacyItems] = useState([]);
  const [migrating, setMigrating] = useState(false);

  useEffect(() => {
    fetchDashboardData();
    checkLegacyLocalStorage();
  }, [activeTab]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'reports') {
        const res = await api.get('/items/my-reports');
        if (res.data?.success) setReports(res.data.items);
      } else if (activeTab === 'claims') {
        const res = await api.get('/claims/my-claims');
        if (res.data?.success) setClaims(res.data.claims);
      } else if (activeTab === 'notifications') {
        const res = await api.get('/notifications');
        if (res.data?.success) {
          setNotifications(res.data.notifications);
          setUnreadNotifications(0);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const checkLegacyLocalStorage = () => {
    try {
      const keys = ['sst_lost_found_items', 'lostAndFoundItems', 'items'];
      let found = [];
      for (const k of keys) {
        const raw = localStorage.getItem(k);
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) {
              found = parsed;
              break;
            }
          } catch (e) {}
        }
      }
      setLegacyItems(found);
    } catch (e) {
      setLegacyItems([]);
    }
  };

  const handleMigrateLegacy = async () => {
    if (legacyItems.length === 0) return;
    setMigrating(true);
    try {
      const res = await api.post('/items/migrate-legacy', { items: legacyItems });
      if (res.data?.success) {
        addToast({
          type: 'success',
          title: 'Legacy Items Migrated!',
          message: res.data.message,
        });
        // Clear old localStorage keys
        localStorage.removeItem('sst_lost_found_items');
        localStorage.removeItem('lostAndFoundItems');
        setLegacyItems([]);
        setSearchParams({ tab: 'reports' });
      }
    } catch (err) {
      addToast({
        type: 'alert',
        title: 'Migration Failed',
        message: err.message,
      });
    } finally {
      setMigrating(false);
    }
  };

  const handleOpenReviewModal = async (itemId) => {
    try {
      const res = await api.get(`/claims/item/${itemId}`);
      if (res.data?.success) {
        setSelectedItemClaims(res.data.claims);
        setSelectedItemTitle(res.data.itemTitle);
        setSecretIdentifyingInfo(res.data.privateIdentifyingInfo || 'None specified on this item');
        setReviewModalOpen(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleReviewAction = async (claimId, newStatus) => {
    setSubmittingReview(true);
    try {
      const res = await api.patch(`/claims/${claimId}/review`, {
        status: newStatus,
        reviewNotes,
      });

      if (res.data?.success) {
        addToast({
          type: newStatus === 'approved' ? 'success' : 'info',
          title: `Claim ${newStatus === 'approved' ? 'Approved' : 'Rejected'}`,
          message: res.data.message,
        });
        setReviewModalOpen(false);
        setReviewNotes('');
        fetchDashboardData();
      }
    } catch (err) {
      addToast({
        type: 'alert',
        title: 'Review Action Failed',
        message: err.message,
      });
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await api.put('/auth/profile', {
        name: profileName,
        phone: profilePhone,
        contactPreference: profileContactPref,
      });

      if (res.data?.success) {
        updateUser(res.data.user);
        addToast({
          type: 'success',
          title: 'Profile Updated',
          message: 'Your campus details have been saved.',
        });
      }
    } catch (err) {
      addToast({
        type: 'alert',
        title: 'Update Failed',
        message: err.message,
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleDeleteReport = async (itemId) => {
    if (!window.confirm('Are you sure you want to delete this report?')) return;
    try {
      await api.delete(`/items/${itemId}`);
      setReports((prev) => prev.filter((i) => i._id !== itemId));
      addToast({
        type: 'info',
        title: 'Report Deleted',
        message: 'Your report has been removed.',
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkResolved = async (itemId) => {
    try {
      await api.patch(`/items/${itemId}/status`, { status: 'resolved' });
      setReports((prev) =>
        prev.map((i) => (i._id === itemId ? { ...i, status: 'resolved' } : i))
      );
      addToast({
        type: 'success',
        title: 'Item Resolved',
        message: 'Marked as successfully resolved!',
      });
    } catch (err) {
      console.error(err);
    }
  };

  const tabs = [
    { id: 'reports', label: 'My Reports', icon: Package },
    { id: 'claims', label: 'My Claims', icon: ShieldCheck },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'profile', label: 'Profile Settings', icon: UserIcon },
    { id: 'migration', label: 'Legacy Data Migration', icon: Database },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Welcome Card */}
      <div className="bg-gradient-to-r from-blue-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center font-black text-2xl text-white border border-white/20">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <span className="text-xs text-blue-300 font-semibold uppercase tracking-wider">
              Student Dashboard
            </span>
            <h1 className="text-2xl font-black tracking-tight">{user?.name}</h1>
            <p className="text-xs text-slate-300 mt-0.5">
              {user?.email} • {user?.email?.split('.')[1]?.split('@')[0]?.toUpperCase() || ''}
            </p>
          </div>
        </div>

        <Link
          to="/report"
          className="px-4 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-400 text-slate-950 font-bold text-xs transition shadow-md"
        >
          + Report New Item
        </Link>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setSearchParams({ tab: tab.id })}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition shrink-0 ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.id === 'migration' && legacyItems.length > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab 1: My Reported Items */}
      {activeTab === 'reports' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Items You Reported ({reports.length})</h2>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-28 rounded-2xl bg-white border border-slate-200 skeleton-shimmer" />
              ))}
            </div>
          ) : reports.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
              <Package className="w-12 h-12 text-slate-300 mx-auto mb-2" />
              <h3 className="font-bold text-slate-700">No reports created yet</h3>
              <p className="text-xs text-slate-500 mt-1">
                You haven't reported any lost or found items so far.
              </p>
              <Link
                to="/report"
                className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold"
              >
                Report an Item Now
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map((item) => (
                <div
                  key={item._id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-slate-300 transition"
                >
                  <div className="flex items-start gap-4">
                    {item.images && item.images.length > 0 ? (
                      <img
                        src={item.images[0].url}
                        alt={item.title}
                        className="w-16 h-16 rounded-xl object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                        <Package className="w-8 h-8" />
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                            item.reportType === 'lost'
                              ? 'bg-amber-100 text-amber-900'
                              : 'bg-emerald-100 text-emerald-900'
                          }`}
                        >
                          {item.reportType}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            item.status === 'resolved'
                              ? 'bg-teal-100 text-teal-800'
                              : item.status === 'pending_claim'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {item.status.toUpperCase()}
                        </span>
                      </div>
                      <h3 className="font-bold text-slate-900 text-base mt-1">{item.title}</h3>
                      <p className="text-xs text-slate-500 flex items-center gap-2 mt-1">
                        <MapPin className="w-3.5 h-3.5 text-blue-600" />
                        <span>{item.location?.building}</span>
                        <span>•</span>
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{new Date(item.dateLostFound).toLocaleDateString()}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => handleOpenReviewModal(item._id)}
                      className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs transition"
                    >
                      Review Claims
                    </button>
                    {item.status !== 'resolved' && (
                      <button
                        onClick={() => handleMarkResolved(item._id)}
                        className="px-3 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 font-semibold text-xs transition"
                      >
                        ✓ Mark Resolved
                      </button>
                    )}
                    <Link
                      to={`/items/${item._id}`}
                      className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition"
                    >
                      View
                    </Link>
                    <button
                      onClick={() => handleDeleteReport(item._id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 transition"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: My Submitted Claims */}
      {activeTab === 'claims' && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900">
            Ownership Claims You Submitted ({claims.length})
          </h2>

          {loading ? (
            <div className="space-y-3">
              {[1, 2].map((n) => (
                <div key={n} className="h-28 rounded-2xl bg-white border border-slate-200 skeleton-shimmer" />
              ))}
            </div>
          ) : claims.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
              <ShieldCheck className="w-12 h-12 text-slate-300 mx-auto mb-2" />
              <h3 className="font-bold text-slate-700">No claims submitted</h3>
              <p className="text-xs text-slate-500 mt-1">
                When you discover your lost item in the browse feed, submit a claim with proof of ownership.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {claims.map((claim) => (
                <div
                  key={claim._id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                          claim.claimStatus === 'approved'
                            ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                            : claim.claimStatus === 'rejected'
                            ? 'bg-red-100 text-red-900 border border-red-300'
                            : 'bg-amber-100 text-amber-900 border border-amber-300'
                        }`}
                      >
                        Status: {claim.claimStatus.toUpperCase()}
                      </span>
                      <h3 className="font-bold text-slate-900 text-base mt-1">
                        {claim.item?.title || 'Reported Item'}
                      </h3>
                    </div>

                    <Link
                      to={`/items/${claim.item?._id}`}
                      className="inline-flex items-center gap-1 text-xs text-blue-600 font-semibold hover:underline"
                    >
                      View Original Report <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1">
                    <span className="font-bold text-slate-700 block">Your Proof Submission:</span>
                    <p className="text-slate-600">{claim.proofDetails}</p>
                  </div>

                  {claim.reviewNotes && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs space-y-1">
                      <span className="font-bold text-blue-900 block">Reviewer Notes:</span>
                      <p className="text-blue-800">{claim.reviewNotes}</p>
                    </div>
                  )}

                  {claim.claimStatus === 'approved' && (
                    <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                      <div>
                        <strong className="block">Claim Approved!</strong>
                        <span>
                          Please coordinate pickup at the campus security office or contact the finder directly.
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Notifications */}
      {activeTab === 'notifications' && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900">Notifications ({notifications.length})</h2>
          {notifications.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
              <Bell className="w-12 h-12 text-slate-300 mx-auto mb-2" />
              <h3 className="font-bold text-slate-700">No notifications</h3>
              <p className="text-xs text-slate-500 mt-1">You're completely caught up!</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden shadow-sm">
              {notifications.map((n) => (
                <div
                  key={n._id}
                  className={`p-4 flex items-start gap-3 transition ${
                    !n.isRead ? 'bg-blue-50/50' : 'bg-white'
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-sm text-slate-900">{n.title}</h4>
                    <p className="text-xs text-slate-600 mt-0.5">{n.message}</p>
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      {new Date(n.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Profile Settings */}
      {activeTab === 'profile' && (
        <div className="max-w-xl bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-1">Account &amp; Contact Preferences</h2>
          <p className="text-xs text-slate-500 mb-6">
            Configure how other students and campus safety officers reach you regarding items.
          </p>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Student ID (from email)
              </label>
              <input
                type="text"
                value={user?.email?.split('.')[1]?.split('@')[0]?.toUpperCase() || '—'}
                disabled
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50 text-slate-400 cursor-not-allowed"
              />
              <p className="text-[10px] text-slate-400 mt-1">Derived automatically from your campus email.</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                value={profilePhone}
                onChange={(e) => setProfilePhone(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Contact Preference
              </label>
              <select
                value={profileContactPref}
                onChange={(e) => setProfileContactPref(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
              >
                <option value="in_app">In-App Claims Only (Hides phone number)</option>
                <option value="email">College Email</option>
                <option value="phone">Direct Phone Call / WhatsApp</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={savingProfile}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {savingProfile ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>
      )}

      {/* Tab 5: Legacy LocalStorage Migration */}
      {activeTab === 'migration' && (
        <div className="max-w-2xl bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Legacy LocalStorage Data Migration
              </h2>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                If you created reports using the old vanilla JS SST Lost &amp; Found project, they were stored only inside your browser's LocalStorage. This assistant scans your browser and securely imports them to your cloud account.
              </p>
            </div>
          </div>

          {legacyItems.length > 0 ? (
            <div className="space-y-4">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                <strong>{legacyItems.length} legacy items found in your browser cache!</strong> Review them below and click Import.
              </div>

              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                {legacyItems.map((item, idx) => (
                  <div key={idx} className="p-3 text-xs bg-white">
                    <span className="font-bold text-slate-800">{item.name || item.title}</span>
                    <p className="text-slate-500 mt-0.5">{item.description}</p>
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      Location: {item.location || 'N/A'} • Contact: {item.contact || 'N/A'}
                    </span>
                  </div>
                ))}
              </div>

              <button
                onClick={handleMigrateLegacy}
                disabled={migrating}
                className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2"
              >
                {migrating ? 'Importing...' : `Import ${legacyItems.length} Legacy Items to Cloud`}
              </button>
            </div>
          ) : (
            <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-500">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <span>No unmigrated legacy LocalStorage records found on this browser. All data is synchronized!</span>
            </div>
          )}
        </div>
      )}

      {/* Review Claims Modal */}
      {reviewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative space-y-6 animate-in fade-in max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setReviewModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
                Ownership Claims
              </span>
              <h2 className="text-xl font-bold text-slate-900 mt-1">
                Review Claims for "{selectedItemTitle}"
              </h2>
              <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                <strong>Your Secret Identifying Details:</strong>
                <p className="mt-0.5">{secretIdentifyingInfo}</p>
              </div>
            </div>

            {selectedItemClaims.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No claims submitted on this item yet.
              </div>
            ) : (
              <div className="space-y-4">
                {selectedItemClaims.map((claim) => (
                  <div
                    key={claim._id}
                    className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                          {claim.claimant?.name?.charAt(0) || 'U'}
                        </div>
                        <span className="text-xs font-bold text-slate-800">
                          {claim.claimant?.name} ({claim.claimant?.email?.split('.')[1]?.split('@')[0]?.toUpperCase() || 'Student'})
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                          claim.claimStatus === 'approved'
                            ? 'bg-emerald-100 text-emerald-800'
                            : claim.claimStatus === 'rejected'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {claim.claimStatus}
                      </span>
                    </div>

                    <div className="text-xs space-y-1">
                      <span className="font-semibold text-slate-600 block">Message:</span>
                      <p className="text-slate-800 bg-white p-2.5 rounded-lg border border-slate-200">
                        {claim.privateMessage}
                      </p>
                    </div>

                    <div className="text-xs space-y-1">
                      <span className="font-semibold text-slate-600 block">Claimant Proof Details:</span>
                      <p className="text-slate-800 bg-white p-2.5 rounded-lg border border-slate-200">
                        {claim.proofDetails}
                      </p>
                    </div>

                    {claim.claimStatus === 'pending' && (
                      <div className="pt-2 flex flex-col gap-2">
                        <input
                          type="text"
                          value={reviewNotes}
                          onChange={(e) => setReviewNotes(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none"
                        />
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            onClick={() => handleReviewAction(claim._id, 'rejected')}
                            disabled={submittingReview}
                            className="px-3 py-1.5 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 font-bold text-xs flex items-center gap-1"
                          >
                            <X className="w-3.5 h-3.5" /> Reject Claim
                          </button>
                          <button
                            onClick={() => handleReviewAction(claim._id, 'approved')}
                            disabled={submittingReview}
                            className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 shadow-sm"
                          >
                            <Check className="w-3.5 h-3.5" /> Approve &amp; Resolve Item
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
