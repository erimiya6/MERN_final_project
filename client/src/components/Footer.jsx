import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, MapPin, Phone, Mail, Heart } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300 pt-12 pb-8 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand Column */}
          <div className="space-y-3 md:col-span-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-extrabold text-sm">
                SST
              </div>
              <span className="font-bold text-white text-base">Lost &amp; Found</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Official campus item recovery platform. Helping students, faculty, and staff safely report, locate, and reclaim lost property across campus.
            </p>
            <div className="flex items-center gap-2 text-xs text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
              <span>Anti-Fraud Proof Verification Enabled</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">
              Platform
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/browse" className="hover:text-white transition">
                  Browse All Items
                </Link>
              </li>
              <li>
                <Link to="/report?type=lost" className="hover:text-white transition">
                  Report a Lost Item
                </Link>
              </li>
              <li>
                <Link to="/report?type=found" className="hover:text-white transition">
                  Report a Found Item
                </Link>
              </li>
              <li>
                <Link to="/dashboard?tab=migration" className="hover:text-white transition">
                  Legacy LocalStorage Import
                </Link>
              </li>
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">
              Categories
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/browse?category=Electronics" className="hover:text-white transition">
                  Electronics &amp; Laptops
                </Link>
              </li>
              <li>
                <Link to="/browse?category=ID Cards" className="hover:text-white transition">
                  College ID Cards &amp; Keys
                </Link>
              </li>
              <li>
                <Link to="/browse?category=Books" className="hover:text-white transition">
                  Books &amp; Study Materials
                </Link>
              </li>
              <li>
                <Link to="/browse?category=Bottles & Bags" className="hover:text-white transition">
                  Backpacks &amp; Bottles
                </Link>
              </li>
            </ul>
          </div>

          {/* Campus Support */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">
              Campus Security &amp; Helpdesk
            </h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span>Central Security Office, Admin Block Ground Floor</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span>Helpline: +91 (011) 2468-1000 (Ext. 204)</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span>lostandfound@sst.scaler.com</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-800 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3">
          <p>© {new Date().getFullYear()} SST Lost &amp; Found. All rights reserved.</p>
          <p className="flex items-center gap-1">
            Built for SST College Community with <Heart className="w-3 h-3 text-red-500 fill-red-500" />
          </p>
        </div>
      </div>
    </footer>
  );
}
