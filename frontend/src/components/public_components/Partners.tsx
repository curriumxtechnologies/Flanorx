import { CheckCircle2, ArrowRight, Shield, Truck, Eye } from 'lucide-react';

const Partners = () => {
  const highlights = [
    {
      icon: Shield,
      text: "Verified Supply Chain",
      color: "#15563A" // Primary Green
    },
    {
      icon: Truck,
      text: "Licensed Operators",
      color: "#F5B400" // Energy Yellow
    },
    {
      icon: Eye,
      text: "Monitored Deliveries",
      color: "#E21C23" // Flame Red
    }
  ];

  return (
    <section id="partners" className="relative py-20 md:py-28 bg-white overflow-hidden">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          
          {/* LEFT SIDE - Text Content */}
          <div className="max-w-xl">
            {/* Section Label */}
            <div className="inline-block mb-6">
              <span className="text-sm font-semibold tracking-wider text-[#15563A] bg-[#15563A]/10 px-4 py-2 rounded-full">
                ENTERPRISE PARTNERSHIP
              </span>
            </div>

            {/* Title */}
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#15563A] mb-6 leading-tight">
              Built on Verified Supply Networks
            </h2>

            {/* Description */}
            <p className="text-[#4A4A4A]/80 text-lg md:text-xl mb-8 leading-relaxed">
              Flanorx partners with licensed depots, logistics operators, 
              and energy suppliers to guarantee consistent, safe, and timely 
              fuel delivery.
            </p>

            {/* Trust Highlights */}
            <div className="space-y-4 mb-10">
              {highlights.map((item, index) => {
                const Icon = item.icon;
                return (
                  <div key={index} className="flex items-center gap-4 group">
                    <div 
                      className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover:scale-110"
                      style={{ backgroundColor: `${item.color}15` }}
                    >
                      <Icon className="w-4 h-4" style={{ color: item.color }} />
                    </div>
                    <span className="text-[#4A4A4A] font-medium text-lg">
                      {item.text}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* CTA Button */}
            <button className="group bg-[#15563A] text-white px-8 py-4 rounded-full font-semibold text-lg hover:bg-[#0e3f2b] transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center gap-3">
              Become a Partner
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>

            {/* Optional partner count */}
            <p className="text-sm text-[#4A4A4A]/50 mt-6">
              Join 50+ licensed partners across the region
            </p>
          </div>

          {/* RIGHT SIDE - Visual (Fuel Depot / Control Room) */}
          <div className="relative hidden lg:block">
            {/* Main visual container */}
            <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl">
              
              {/* Background gradient */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#15563A] to-[#0A2F1F]">
                {/* Grid overlay for industrial feel */}
                <div className="absolute inset-0" style={{
                  backgroundImage: `radial-gradient(circle at 1px 1px, rgba(245, 180, 0, 0.1) 1px, transparent 0)`,
                  backgroundSize: '40px 40px'
                }}></div>
              </div>

              {/* Abstract Fuel Depot Visualization */}
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 600 400" preserveAspectRatio="xMidYMid meet">
                {/* Storage Tanks */}
                <g className="animate-pulse" style={{ animationDuration: '4s' }}>
                  {/* Large tank */}
                  <rect x="100" y="150" width="120" height="160" rx="8" fill="none" stroke="#F5B400" strokeWidth="3" strokeDasharray="6 6" />
                  <rect x="100" y="150" width="120" height="160" rx="8" fill="url(#tankGradient)" opacity="0.2" />
                  <circle cx="160" cy="230" r="30" fill="none" stroke="#F5B400" strokeWidth="2" />
                  
                  {/* Medium tank */}
                  <rect x="280" y="120" width="100" height="190" rx="8" fill="none" stroke="#E21C23" strokeWidth="3" strokeDasharray="6 6" />
                  <rect x="280" y="120" width="100" height="190" rx="8" fill="url(#tankGradient)" opacity="0.2" />
                  
                  {/* Small tank */}
                  <rect x="420" y="90" width="80" height="220" rx="8" fill="none" stroke="#15563A" strokeWidth="3" strokeDasharray="6 6" />
                  <rect x="420" y="90" width="80" height="220" rx="8" fill="url(#tankGradient)" opacity="0.2" />
                </g>

                {/* Pipelines/Connections */}
                <path d="M160 150 L160 120 L300 80 L420 90" stroke="url(#pipelineGradient)" strokeWidth="2" strokeDasharray="8 4" fill="none" />
                <path d="M330 120 L330 80 L420 90" stroke="url(#pipelineGradient)" strokeWidth="2" strokeDasharray="8 4" fill="none" />

                {/* Control Room / Dashboard Elements */}
                <g transform="translate(50, 280)">
                  {/* Monitor/Display */}
                  <rect x="0" y="0" width="180" height="100" rx="4" fill="none" stroke="#F5B400" strokeWidth="2" />
                  <line x1="20" y1="20" x2="60" y2="20" stroke="#F5B400" strokeWidth="2" />
                  <line x1="20" y1="40" x2="80" y2="40" stroke="#E21C23" strokeWidth="2" />
                  <line x1="20" y1="60" x2="100" y2="60" stroke="#15563A" strokeWidth="2" />
                  
                  {/* Live tracking dot */}
                  <circle cx="140" cy="30" r="4" fill="#F5B400">
                    <animate attributeName="r" values="4;6;4" dur="2s" repeatCount="indefinite" />
                  </circle>
                </g>

                {/* Gradients */}
                <defs>
                  <linearGradient id="tankGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#F5B400" stopOpacity="0.1" />
                    <stop offset="50%" stopColor="#E21C23" stopOpacity="0.1" />
                    <stop offset="100%" stopColor="#15563A" stopOpacity="0.1" />
                  </linearGradient>
                  <linearGradient id="pipelineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#F5B400" />
                    <stop offset="50%" stopColor="#E21C23" />
                    <stop offset="100%" stopColor="#15563A" />
                  </linearGradient>
                </defs>

                {/* Animated flow indicators */}
                <circle cx="200" cy="110" r="4" fill="#F5B400" opacity="0.6">
                  <animateMotion path="M0 0 L100 0 L100 0" dur="3s" repeatCount="indefinite" />
                </circle>
                <circle cx="280" cy="95" r="4" fill="#E21C23" opacity="0.6">
                  <animateMotion path="M0 0 L80 0 L80 0" dur="2.5s" repeatCount="indefinite" />
                </circle>
              </svg>

              {/* Live monitoring badge */}
              <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm px-3 py-1 rounded-full flex items-center gap-2">
                <div className="w-2 h-2 bg-[#F5B400] rounded-full animate-pulse"></div>
                <span className="text-white text-xs font-medium">LIVE MONITORING</span>
              </div>
            </div>

            {/* Floating stats card */}
            <div className="absolute -bottom-6 -left-6 bg-white rounded-xl shadow-xl p-4 min-w-[200px]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#15563A]/10 rounded-lg flex items-center justify-center">
                  <Truck className="w-5 h-5 text-[#15563A]" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-[#15563A]">50+</div>
                  <div className="text-xs text-[#4A4A4A]/60">Licensed Partners</div>
                </div>
              </div>
            </div>

            {/* Verified badge */}
            <div className="absolute top-6 -right-4 bg-[#15563A] text-white px-4 py-2 rounded-lg shadow-lg transform rotate-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-sm font-medium">Verified Network</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Subtle background pattern */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#15563A]/5 to-transparent pointer-events-none"></div>
    </section>
  );
};

export default Partners;