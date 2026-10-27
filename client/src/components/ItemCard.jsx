import React from 'react';
import { Link } from 'react-router-dom';
import {
  MapPin,
  Calendar,
  Tag,
  Laptop,
  CreditCard,
  Book,
  Shirt,
  Key,
  Package,
  CheckCircle2,
  Clock,
  AlertCircle,
} from 'lucide-react';

const categoryIcons = {
  Electronics: Laptop,
  'ID Cards': CreditCard,
  Books: Book,
  Clothing: Shirt,
  Accessories: Shirt,
  'Keys & Wallets': Key,
  'Bottles & Bags': Package,
  Other: Package,
};

export default function ItemCard({ item }) {
  const IconComponent = categoryIcons[item.category] || Package;
  const imageUrl = item.images && item.images.length > 0 ? item.images[0].url : null;

  const getStatusBadge = () => {
    switch (item.status) {
      case 'resolved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-100 text-teal-800 border border-teal-200">
            <CheckCircle2 className="w-3 h-3" /> Resolved
          </span>
        );
      case 'pending_claim':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
            <Clock className="w-3 h-3" /> Claim Pending
          </span>
        );
      case 'found':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            Found
          </span>
        );
      case 'lost':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-200">
            <AlertCircle className="w-3 h-3" /> Lost
          </span>
        );
    }
  };

  return (
    <Link
      to={`/items/${item._id}`}
      className="bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden group hover:-translate-y-1 cursor-pointer"
    >
      {/* Image / Thumbnail Container */}
      <div className="relative aspect-[16/10] bg-slate-100 overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={item.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-slate-400">
            <IconComponent className="w-12 h-12 stroke-[1.5]" />
            <span className="text-[11px] font-medium mt-1">No Photo Provided</span>
          </div>
        )}

        {/* Status Tag Overlay */}
        <div className="absolute top-3 left-3 flex gap-1.5">{getStatusBadge()}</div>

        {/* Category Pill Overlay */}
        <div className="absolute top-3 right-3">
          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-black/60 backdrop-blur-md text-white">
            {item.category}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <h3 className="font-bold text-slate-900 text-base leading-snug group-hover:text-blue-600 transition-colors line-clamp-1">
            {item.title}
          </h3>
          <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
            {item.description}
          </p>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col gap-1.5 text-xs text-slate-600">
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span className="truncate font-medium">
              {item.location?.building || 'Campus'}
              {item.location?.room ? ` • ${item.location.room}` : ''}
            </span>
          </div>

          <div className="flex items-center text-[11px] text-slate-400 mt-1">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {new Date(item.dateLostFound || item.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
