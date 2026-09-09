// pages/Welcome.jsx
import React, { useEffect, useRef } from "react";
import { Link } from "react-router";
import { Fuel, Zap, Tag, MapPin, CreditCard, Truck, Flame } from "lucide-react";

const Welcome = () => {
  const heroRef = useRef(null);

  useEffect(() => {
    if (heroRef.current) {
      heroRef.current.style.opacity = "0";
      heroRef.current.style.transform = "translateY(20px)";
      requestAnimationFrame(() => {
        heroRef.current.style.transition = "opacity 0.8s ease, transform 0.8s ease";
        heroRef.current.style.opacity = "1";
        heroRef.current.style.transform = "translateY(0)";
      });
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-slate-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-800 flex flex-col font-sans overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <img src="/flanorx.png" alt="Flanorx" className="h-8 w-auto" />
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/login"
            className="hidden sm:inline-block text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-[#13ec5b] dark:hover:text-[#13ec5b] transition"
          >
            Log In
          </Link>
          <Link
            to="/register"
            className="text-sm font-medium bg-[#13ec5b] text-white px-4 py-2 rounded-lg hover:bg-[#10d04e] transition shadow-sm"
          >
            Sign Up
          </Link>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center px-6 py-8 md:py-12">
        <div
          ref={heroRef}
          className="max-w-6xl w-full mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center opacity-0"
        >
          {/* Left side – text & CTAs */}
          <div className="text-center lg:text-left">
            <div className="mb-6 flex justify-center lg:justify-start">
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-[#13ec5b]/20 blur-xl animate-pulse"></div>
                <div className="relative h-20 w-20 rounded-full bg-[#13ec5b]/10 flex items-center justify-center border-2 border-[#13ec5b]/30 animate-float">
                  <Fuel className="h-10 w-10 text-[#13ec5b]" />
                </div>
              </div>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-slate-900 dark:text-white leading-tight">
              Fuel & Gas <br className="sm:hidden" />
              <span className="text-[#13ec5b]">at your doorstep</span>
            </h1>

            <p className="mt-4 text-base sm:text-lg text-slate-500 dark:text-slate-400 max-w-lg mx-auto lg:mx-0">
              Skip the queue. We deliver premium fuel and gas straight to your
              home, office, or wherever you need it. Fast, reliable, and hassle‑free.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center lg:items-start gap-4">
              <Link
                to="/register"
                className="w-full sm:w-auto px-8 py-3 bg-[#13ec5b] hover:bg-[#10d04e] text-white font-bold rounded-xl transition shadow-md hover:shadow-lg text-center transform hover:scale-105 duration-200"
              >
                Get Started
              </Link>
              <Link
                to="/login"
                className="w-full sm:w-auto px-8 py-3 border-2 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium rounded-xl transition text-center transform hover:scale-105 duration-200"
              >
                I already have an account
              </Link>
            </div>

            {/* Feature chips – only on mobile, we'll show them below the text */}
            <div className="mt-8 flex flex-wrap justify-center lg:justify-start gap-3 text-sm text-slate-600 dark:text-slate-400">
              <span className="flex items-center gap-1.5 bg-white/80 dark:bg-gray-800/80 px-3 py-1.5 rounded-full shadow-sm">
                <Zap className="h-4 w-4 text-[#13ec5b]" />
                30-min delivery
              </span>
              <span className="flex items-center gap-1.5 bg-white/80 dark:bg-gray-800/80 px-3 py-1.5 rounded-full shadow-sm">
                <Tag className="h-4 w-4 text-[#13ec5b]" />
                Member pricing
              </span>
              <span className="flex items-center gap-1.5 bg-white/80 dark:bg-gray-800/80 px-3 py-1.5 rounded-full shadow-sm">
                <MapPin className="h-4 w-4 text-[#13ec5b]" />
                Real-time tracking
              </span>
              <span className="flex items-center gap-1.5 bg-white/80 dark:bg-gray-800/80 px-3 py-1.5 rounded-full shadow-sm">
                <CreditCard className="h-4 w-4 text-[#13ec5b]" />
                Secure payment
              </span>
            </div>
          </div>

          {/* Right side – illustration/visual on desktop */}
          <div className="hidden lg:flex lg:items-center lg:justify-center">
            <div className="relative w-full max-w-sm">
              <div className="absolute -inset-4 bg-[#13ec5b]/10 rounded-3xl blur-2xl"></div>
              <div className="relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-3xl p-8 border border-slate-200 dark:border-slate-700 shadow-xl">
                <div className="grid grid-cols-2 gap-6">
                  <div className="flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-gray-700/50 rounded-xl">
                    <Fuel className="h-10 w-10 text-[#13ec5b]" />
                    <span className="text-xs font-medium mt-2 text-slate-600 dark:text-slate-300">Fuel</span>
                  </div>
                  <div className="flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-gray-700/50 rounded-xl">
                    <Flame className="h-10 w-10 text-[#13ec5b]" />
                    <span className="text-xs font-medium mt-2 text-slate-600 dark:text-slate-300">Gas</span>
                  </div>
                  <div className="flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-gray-700/50 rounded-xl">
                    <Truck className="h-10 w-10 text-[#13ec5b]" />
                    <span className="text-xs font-medium mt-2 text-slate-600 dark:text-slate-300">Delivery</span>
                  </div>
                  <div className="flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-gray-700/50 rounded-xl">
                    <MapPin className="h-10 w-10 text-[#13ec5b]" />
                    <span className="text-xs font-medium mt-2 text-slate-600 dark:text-slate-300">Tracking</span>
                  </div>
                </div>
                <div className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
                  <span className="font-semibold text-[#13ec5b]">15k+</span> happy customers
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-slate-400 dark:text-slate-600 border-t border-slate-200/50 dark:border-slate-800/50">
        <p>© {new Date().getFullYear()} Flanorx. All rights reserved.</p>
      </footer>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default Welcome;