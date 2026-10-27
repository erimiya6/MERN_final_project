import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  MapPin,
  Calendar,
  Clock,
  ShieldCheck,
  User as UserIcon,
  Phone,
  Mail,
  Flag,
  Share2,
  CheckCircle2,
  AlertCircle,
  Package,
  ArrowLeft,
  Trash2,
  Edit,
  Eye,
  EyeOff,
  Send,
  X,
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import ItemCard from '../components/ItemCard';

export default function ItemDetailsPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { addToast } = useSocket();
  const navigate = useNavigate();

  const [item, setItem] = useState(null);
  const [similarItems, setSimilarItems] = useState([]);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modals
  const [claimModalOpen, setClaimModalOpen] = useState(false);
  const [flagModalOpen, setFlagModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // Claim Form State
  const [claimMessage, setClaimMessage] = useState('');
  const [claimProof, setClaimProof] = useState('');
  const [submittingClaim, setSubmittingClaim] = useState(false);

  // Flag Form State
  const [flagReason, setFlagReason] = useState('');
  const [submittingFlag, setSubmittingFlag] = useState(false);

  useEffect(() => {
    fetchItem();
  }, [id]);

  const fetchItem = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/items/${id}`);
      if (res.data?.success) {
        setItem(res.data.item);
        setIsOwner(res.data.isOwner);
        setSimilarItems(res.data.similarItems || []);
      }
    } catch (err) {
      setError(err.message || 'Item not found');
    } finally {
      setLoading(false);
    }
  };

  const handleClaimSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      navigate('/login');
      return;
    }

    setSubmittingClaim(true);
    try {
      const res = await api.post('/claims', {
        itemId: item._id,
        privateMessage: claimMessage,
        proofDetails: claimProof,
      });

      if (res.data?.success) {
        addToast({
          type: 'success',
          title: 'Claim Request Submitted!',
          message: 'The finder has been notified with your proof details.',
        });
        setClaimModalOpen(false);
        fetchItem();
      }
    } catch (err) {
      addToast({
        type: 'alert',
        title: 'Claim Failed',
        message: err.message,
      });
    } finally {
      setSubmittingClaim(false);
    }
  };

  const handleFlagSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      navigate('/login');
      return;
    }

    setSubmittingFlag(true);
    try {
      const res = await api.post(`/items/${item._id}/flag`, { reason: flagReason });
      if (res.data?.success) {
        addToast({
          type: 'info',
          title: 'Report Flagged',
          message: 'Campus moderators have been notified.',
        });
        setFlagModalOpen(false);
      }
    } catch (err) {
      addToast({
        type: 'alert',
        title: 'Flagging Failed',
        message: err.message,
      });
    } finally {
      setSubmittingFlag(false);
    }
  };

  const handleMarkResolved = async () => {
    try {
      const res = await api.patch(`/items/${item._id}/status`, { status: 'resolved' });
      if (res.data?.success) {
        addToast({
          type: 'success',
          title: 'Marked as Resolved',
          message: 'Item has been successfully marked as resolved!',
        });
        fetchItem();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteItem = async () => {
    try {
      const res = await api.delete(`/items/${item._id}`);
      if (res.data?.success) {
        addToast({
          type: 'info',
          title: 'Report Deleted',
          message: 'The report has been permanently removed.',
        });
        navigate('/browse');
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="bg-white rounded-3xl h-96 p-8 border border-slate-200 skeleton-shimmer" />
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-slate-800">Report Unavailable</h2>
        <p className="text-xs text-slate-500 mt-1">{error || 'This item could not be loaded.'}</p>
        <Link
          to="/browse"
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-xl"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Browse
        </Link>
      </div>
    );
  }

  const imageUrl = item.images && item.images.length > 0 ? item.images[0].url : null;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Back button */}
      <div>
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
      </div>

      {/* Main Details Card */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden grid grid-cols-1 md:grid-cols-12 gap-0">
        {/* Left Column: Image Area */}
        <div className="md:col-span-5 bg-slate-100 flex items-center justify-center p-6 border-b md:border-b-0 md:border-r border-slate-200">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={item.title}
              className="max-h-96 w-full object-cover rounded-2xl shadow-sm"
            />
          ) : (
            <div className="w-full h-72 flex flex-col items-center justify-center text-slate-400">
              <Package className="w-20 h-20 stroke-[1.2] mb-2" />
              <span className="text-xs font-medium">No photograph uploaded</span>
            </div>
          )}
        </div>

        {/* Right Column: Information & Actions */}
        <div className="md:col-span-7 p-6 sm:p-8 flex flex-col justify-between space-y-6">
          <div>
            {/* Badges Bar */}
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  item.reportType === 'lost'
                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                    : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                }`}
              >
                {item.reportType}
              </span>

              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                {item.category}
              </span>

              {item.status === 'resolved' && (
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-teal-100 text-teal-800 border border-teal-200 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Resolved &amp; Returned
                </span>
              )}

              {item.status === 'pending_claim' && (
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
                  Claim Under Review
                </span>
              )}
            </div>

            {/* Title */}
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {item.title}
            </h1>

            {/* Public Description */}
            <div className="mt-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Public Description
              </h3>
              <p className="text-sm text-slate-700 mt-1 leading-relaxed whitespace-pre-line">
                {item.description}
              </p>
            </div>

            {/* Metadata Grid */}
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs">
              <div className="space-y-1">
                <span className="text-slate-400 font-semibold block">Location</span>
                <div className="flex items-start gap-1.5 font-bold text-slate-800">
                  <MapPin className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <span>
                    {item.location?.building}
                    {item.location?.room ? ` (${item.location.room})` : ''}
                    <span className="block text-[11px] font-normal text-slate-500">
                      {item.location?.campusZone}
                    </span>
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-slate-400 font-semibold block">Incident Date</span>
                <div className="flex items-center gap-1.5 font-bold text-slate-800">
                  <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>
                    {new Date(item.dateLostFound).toLocaleDateString()}
                    {item.timeLostFound ? ` at ${item.timeLostFound}` : ''}
                  </span>
                </div>
              </div>
            </div>

            {/* Secret identifying details displayed to owner/staff */}
            {item.privateIdentifyingInfo && (
              <div className="mt-4 p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <Eye className="w-4 h-4 text-amber-700" />
                  <span>Secret Identifying Details (Visible to you only):</span>
                </div>
                <p className="leading-relaxed">{item.privateIdentifyingInfo}</p>
              </div>
            )}
          </div>

          {/* Reporter Information & Action Buttons */}
          <div className="pt-6 border-t border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm shadow-sm">
                  {item.reporter?.name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div>
                  <span className="text-xs text-slate-400 font-medium block">Reported By</span>
                  <span className="text-sm font-bold text-slate-900">{item.reporter?.name}</span>
                </div>
              </div>

              {/* Flag button */}
              {!isOwner && (
                <button
                  onClick={() => setFlagModalOpen(true)}
                  className="text-xs text-slate-400 hover:text-red-600 flex items-center gap-1 transition"
                  title="Report inappropriate content"
                >
                  <Flag className="w-3.5 h-3.5" /> Flag
                </button>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3">
              {isOwner ? (
                <>
                  {item.status !== 'resolved' && (
                    <button
                      onClick={handleMarkResolved}
                      className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Mark as Resolved
                    </button>
                  )}
                  <Link
                    to={`/dashboard?tab=reports`}
                    className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
                  >
                    View Claim Requests
                  </Link>
                  <button
                    onClick={() => setDeleteConfirmOpen(true)}
                    className="px-4 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold flex items-center gap-1.5 transition ml-auto"
                  >
                    <Trash2 className="w-4 h-4" /> Delete Report
                  </button>
                </>
              ) : item.status === 'resolved' ? (
                <div className="w-full p-3 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 text-xs font-semibold text-center">
                  This item has already been successfully recovered and returned to its owner.
                </div>
              ) : (
                <button
                  onClick={() => setClaimModalOpen(true)}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 transition transform hover:scale-[1.02]"
                >
                  <ShieldCheck className="w-4 h-4" />
                  {item.reportType === 'found' ? 'Claim This Item' : 'I Found This Item'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Similar Items Section */}
      {similarItems.length > 0 && (
        <div className="space-y-4 pt-6">
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Similar Items in {item.category}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {similarItems.map((sim) => (
              <ItemCard key={sim._id} item={sim} />
            ))}
          </div>
        </div>
      )}

      {/* Claim Modal */}
      {claimModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative space-y-5 animate-in fade-in duration-200">
            <button
              onClick={() => setClaimModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                Ownership Verification
              </span>
              <h3 className="text-xl font-bold text-slate-900 mt-1">
                Submit Claim for "{item.title}"
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Please provide accurate proof of ownership. The reporter will inspect your details before approving handover.
              </p>
            </div>

            <form onSubmit={handleClaimSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                  Message to Finder *
                </label>
                <textarea
                  required
                  rows="2"
                  value={claimMessage}
                  onChange={(e) => setClaimMessage(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                ></textarea>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                  Proof of Ownership (Secret details) *
                </label>
                <textarea
                  required
                  rows="3"
                  value={claimProof}
                  onChange={(e) => setClaimProof(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                ></textarea>
              </div>

              <div className="p-3 bg-blue-50 rounded-xl text-[11px] text-blue-800 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Anti-fraud policy: Fraudulent claims violate the SST student conduct code. Your student profile is tied to this submission.
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setClaimModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingClaim}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md disabled:opacity-50 flex items-center gap-2"
                >
                  {submittingClaim ? 'Submitting...' : 'Send Claim Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Flag Modal */}
      {flagModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl relative space-y-4">
            <button
              onClick={() => setFlagModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-900">Flag Report for Moderation</h3>
            <p className="text-xs text-slate-500">
              Help campus administration maintain safety by reporting fraudulent or inappropriate listings.
            </p>

            <form onSubmit={handleFlagSubmit} className="space-y-3">
              <textarea
                required
                rows="3"
                value={flagReason}
                onChange={(e) => setFlagReason(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-red-500"
              ></textarea>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setFlagModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingFlag}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg shadow-sm"
                >
                  {submittingFlag ? 'Flagging...' : 'Submit Flag'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Delete this report?</h3>
            <p className="text-xs text-slate-500">
              This action cannot be undone. The report and associated claim requests will be permanently deleted.
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteItem}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-sm"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
