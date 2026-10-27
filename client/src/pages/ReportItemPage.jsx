import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import {
  Upload,
  Image as ImageIcon,
  ShieldCheck,
  MapPin,
  Calendar,
  Clock,
  Phone,
  AlertCircle,
  HelpCircle,
  X,
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

export default function ReportItemPage() {
  const [searchParams] = useSearchParams();
  const initialType = searchParams.get('type') === 'found' ? 'found' : 'lost';

  const [reportType, setReportType] = useState(initialType);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');

  const { user } = useAuth();
  const { addToast } = useSocket();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      category: 'Electronics',
      campusZone: 'Central Hub',
      contactPreference: user?.contactPreference || 'in_app',
      contactPhone: user?.phone || '',
      dateLostFound: new Date().toISOString().split('T')[0],
      timeLostFound: '12:00',
    },
  });

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setServerError('Image size must be less than 5MB');
        return;
      }
      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(file));
      setServerError('');
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
  };

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    setServerError('');

    try {
      const formData = new FormData();
      formData.append('title', data.title);
      formData.append('description', data.description);
      formData.append('reportType', reportType);
      formData.append('category', data.category);
      formData.append(
        'location',
        JSON.stringify({
          building: data.building,
          room: data.room || '',
          campusZone: data.campusZone,
        })
      );
      formData.append('dateLostFound', data.dateLostFound);
      formData.append('timeLostFound', data.timeLostFound);
      formData.append('contactPhone', data.contactPhone || '');
      formData.append('contactPreference', data.contactPreference);
      formData.append('privateIdentifyingInfo', data.privateIdentifyingInfo || '');

      if (selectedImage) {
        formData.append('image', selectedImage);
      }

      const res = await api.post('/items', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (res.data?.success) {
        addToast({
          type: 'success',
          title: 'Report Submitted Successfully!',
          message: `Your ${reportType} report has been posted to the campus network.`,
        });
        navigate(`/items/${res.data.item._id}`);
      }
    } catch (err) {
      setServerError(err.message || 'Failed to submit report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Report an Item</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-md mx-auto">
          Help our campus community locate and return lost belongings by providing clear and accurate details.
        </p>
      </div>

      {/* Mode Switcher: Lost vs Found */}
      <div className="grid grid-cols-2 p-1.5 bg-slate-200/80 rounded-2xl max-w-md mx-auto mb-8">
        <button
          type="button"
          onClick={() => setReportType('lost')}
          className={`py-2.5 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 ${
            reportType === 'lost'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-slate-950"></span>
          I Lost An Item
        </button>
        <button
          type="button"
          onClick={() => setReportType('found')}
          className={`py-2.5 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 ${
            reportType === 'found'
              ? 'bg-emerald-500 text-slate-950 shadow-md'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-slate-950"></span>
          I Found An Item
        </button>
      </div>

      {serverError && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{serverError}</span>
        </div>
      )}

      {/* Main Form */}
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6"
      >
        {/* Title */}
        <div>
          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
            Item Title *
          </label>
          <input
            type="text"
            {...register('title', {
              required: 'Title is required',
              maxLength: { value: 100, message: 'Max 100 characters' },
            })}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
          {errors.title && (
            <p className="text-red-600 text-xs mt-1">{errors.title.message}</p>
          )}
        </div>

        {/* Category & Campus Zone */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
              Category *
            </label>
            <select
              {...register('category')}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
            >
              <option value="Electronics">Electronics &amp; Laptops</option>
              <option value="ID Cards">ID Cards &amp; Documents</option>
              <option value="Books">Books &amp; Study Materials</option>
              <option value="Clothing">Clothing &amp; Apparels</option>
              <option value="Accessories">Accessories &amp; Jewelry</option>
              <option value="Keys & Wallets">Keys &amp; Wallets</option>
              <option value="Bottles & Bags">Bottles &amp; Backpacks</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
              Campus Zone *
            </label>
            <select
              {...register('campusZone')}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
            >
              <option value="Central Hub">Central Hub</option>
              <option value="North Campus">North Campus</option>
              <option value="South Campus">South Campus</option>
              <option value="Library Zone">Library Zone</option>
              <option value="Sports Complex">Sports Complex</option>
              <option value="Hostels">Student Hostels</option>
              <option value="Other">Other Area</option>
            </select>
          </div>
        </div>

        {/* Location Breakdown */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
              Building or Campus Landmark *
            </label>
            <input
              type="text"
              {...register('building', { required: 'Building or landmark is required' })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
            {errors.building && (
              <p className="text-red-600 text-xs mt-1">{errors.building.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
              Specific Room / Area
            </label>
            <input
              type="text"
              {...register('room')}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Date and Time */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
              Date {reportType === 'lost' ? 'Lost' : 'Found'} *
            </label>
            <input
              type="date"
              {...register('dateLostFound', { required: 'Date is required' })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
              Approximate Time
            </label>
            <input
              type="time"
              {...register('timeLostFound')}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
            />
          </div>
        </div>

        {/* Public Description */}
        <div>
          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
            Public Description *
          </label>
          <textarea
            rows="3"
            {...register('description', {
              required: 'Description is required',
              maxLength: { value: 2000, message: 'Max 2000 characters' },
            })}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          ></textarea>
          {errors.description && (
            <p className="text-red-600 text-xs mt-1">{errors.description.message}</p>
          )}
        </div>

        {/* Image Upload Area */}
        <div>
          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
            Item Photo (Optional)
          </label>
          {imagePreview ? (
            <div className="relative w-48 h-36 rounded-xl overflow-hidden border border-slate-200 group">
              <img
                src={imagePreview}
                alt="Preview"
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={removeImage}
                className="absolute top-2 right-2 p-1.5 bg-black/70 hover:bg-black text-white rounded-full transition"
                title="Remove photo"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <label className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition bg-slate-50 hover:bg-blue-50/30">
              <Upload className="w-8 h-8 text-slate-400 mb-2" />
              <span className="text-xs font-semibold text-slate-700">
                Click to upload a photo
              </span>
              <span className="text-[11px] text-slate-400 mt-0.5">
                JPG, PNG, WebP up to 5MB
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
            </label>
          )}
        </div>

        {/* Anti-Fraud Secret Details Field */}
        <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200/80 space-y-2">
          <div className="flex items-center gap-2 text-amber-900 font-bold text-xs uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4 text-amber-700" />
            <span>Private Identifying Information (Anti-Fraud Proof)</span>
          </div>
          <p className="text-[11px] text-amber-800 leading-relaxed">
            Specify secret identifiers <strong>hidden from public view</strong>. When someone attempts to claim this item, they must provide these details to prove ownership (e.g. serial numbers, stickers, specific wallpaper, inside pocket items).
          </p>
          <textarea
            rows="2"
            {...register('privateIdentifyingInfo')}
            className="w-full px-3.5 py-2 rounded-lg border border-amber-300 text-xs bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
          ></textarea>
        </div>

        {/* Contact Preferences */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
              Contact Preference
            </label>
            <select
              {...register('contactPreference')}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
            >
              <option value="in_app">In-App Claim Requests (Safest)</option>
              <option value="email">College Email</option>
              <option value="phone">Phone / WhatsApp</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
              Phone Number (Optional)
            </label>
            <input
              type="text"
              {...register('contactPhone')}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full py-3 rounded-xl font-bold text-sm shadow-md transition flex items-center justify-center gap-2 ${
              reportType === 'lost'
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
            } disabled:opacity-50`}
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
                Publishing Report...
              </span>
            ) : (
              <span>Submit {reportType === 'lost' ? 'Lost' : 'Found'} Report</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
