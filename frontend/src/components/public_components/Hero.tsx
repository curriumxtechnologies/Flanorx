import { ArrowRight, Zap } from 'lucide-react';

const Hero = () => {
  return (
    <section id="home" className="relative min-h-screen overflow-hidden">
      {/* Deep Forest Green Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0A2F1F] via-[#15563A] to-[#1A6B48]">
        {/* Subtle Energy Lines */}
        <div className="absolute inset-0 opacity-20">
          <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 1920 1080">
            <defs>
              <linearGradient id="energy-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#F5B400" stopOpacity="0.4" />
                <stop offset="50%" stopColor="#F05A00" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#E21C23" stopOpacity="0.1" />
              </linearGradient>
            </defs>
            <path
              d="M0,300 Q200,250 300,400 T600,350 T900,400 T1200,300 T1500,350 T1800,300"
              stroke="url(#energy-gradient)"
              strokeWidth="2"
              fill="none"
              className="animate-pulse"
            />
          </svg>
        </div>
      </div>

      {/* Content Container */}
      <div className="relative z-10 container mx-auto px-4 md:px-6 h-screen flex items-center">
        <div className="grid lg:grid-cols-2 gap-12 items-center w-full">
          
          {/* LEFT SIDE - Bold Text */}
          <div className="text-center lg:text-left">
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-black mb-6 leading-tight">
              <span className="text-white">Power Down?</span>
              <br />
              <span className="text-[#F5B400]">No Wahala.</span>
            </h1>

            <p className="text-white/90 text-base sm:text-lg md:text-xl lg:text-2xl mb-8 max-w-2xl mx-auto lg:mx-0">
              On-demand fuel and energy delivery built for homes, businesses, and industries.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-6">
              <button className="group bg-[#F5B400] hover:bg-[#E21C23] text-[#15563A] hover:text-white px-6 sm:px-8 py-3 sm:py-4 rounded-full font-bold text-base sm:text-lg transition-all duration-300 transform hover:scale-105 shadow-xl flex items-center justify-center gap-2">
                Get Fuel Now
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" />
              </button>

              <button className="group border-2 border-white/30 hover:border-white bg-transparent text-white px-6 sm:px-8 py-3 sm:py-4 rounded-full font-bold text-base sm:text-lg transition-all duration-300 hover:bg-white/10 flex items-center justify-center gap-2">
                Join Flanorx
                <Zap className="w-4 h-4 sm:w-5 sm:h-5 group-hover:scale-110 transition-transform" />
              </button>
            </div>

            <button className="text-white/70 hover:text-[#F5B400] text-sm transition-colors underline underline-offset-4">
              Already have an account? Sign in
            </button>
          </div>

          {/* RIGHT SIDE - Visual (Hidden on mobile) */}
          <div className="hidden lg:block relative">
            <div className="relative w-full max-w-lg mx-auto">
              {/* Energy ring */}
              <div className="absolute inset-0 bg-[#F5B400]/10 rounded-full blur-3xl animate-pulse"></div>
              
              {/* Abstract truck silhouette */}
              <svg className="w-full h-auto relative z-10" viewBox="0 0 400 200" fill="none">
                <circle cx="200" cy="100" r="80" fill="url(#energyGlow)" opacity="0.1" />
                
                <defs>
                  <radialGradient id="energyGlow">
                    <stop offset="0%" stopColor="#F5B400" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#F05A00" stopOpacity="0" />
                  </radialGradient>
                </defs>

                <rect x="80" y="80" width="180" height="60" rx="8" stroke="#F5B400" strokeWidth="2" strokeDasharray="4 4" fill="none" />
                <rect x="220" y="60" width="80" height="80" rx="8" stroke="#F5B400" strokeWidth="2" strokeDasharray="4 4" fill="none" />
                
                <circle cx="120" cy="140" r="20" stroke="#F5B400" strokeWidth="2" fill="none" />
                <circle cx="260" cy="140" r="20" stroke="#F5B400" strokeWidth="2" fill="none" />
                
                <circle cx="120" cy="140" r="10" fill="#F5B400" fillOpacity="0.3" className="animate-ping" />
                <circle cx="260" cy="140" r="10" fill="#F5B400" fillOpacity="0.3" className="animate-ping" style={{ animationDelay: '0.5s' }} />
                
                <path d="M320 100 L360 80 L340 100 L380 120" stroke="#E21C23" strokeWidth="2" strokeDasharray="6 4" fill="none" />
                <circle cx="300" cy="90" r="6" fill="#F5B400" fillOpacity="0.6">
                  <animate attributeName="r" values="6;8;6" dur="2s" repeatCount="indefinite" />
                </circle>
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#0A2F1F] to-transparent pointer-events-none"></div>
    </section>
  );
};

export default Hero;