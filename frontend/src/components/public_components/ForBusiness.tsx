
import { Shield, Truck, CreditCard, MapPin } from 'lucide-react';

const ForBusiness = () => {
  const trustPoints = [
    {
      icon: Truck,
      text: "Verified Supply Chain",
      color: "#15563A" // Primary Green
    },
    {
      icon: MapPin,
      text: "Track Your Delivery Live",
      color: "#F5B400" // Energy Yellow
    },
    {
      icon: CreditCard,
      text: "Secure Payment System",
      color: "#E21C23" // Flame Red
    }
  ];

  const partners = [
    { name: "TotalEnergies", color: "#15563A" },
    { name: "Shell", color: "#F5B400" },
    { name: "ExxonMobil", color: "#E21C23" }
  ];

  return (
    <section id="for-business" className="py-20 md:py-28 bg-gray-50">
      <div className="container mx-auto px-4 md:px-6">
        <div className="max-w-6xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#15563A] mb-4">
              Infrastructure You Can Trust
            </h2>
            <p className="text-[#4A4A4A]/80 text-lg md:text-xl max-w-3xl mx-auto">
              Powered by verified logistics partners, monitored delivery systems, 
              and a dedicated operations network.
            </p>
          </div>

          {/* Main Trust Indicators */}
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            {trustPoints.map((point, index) => {
              const Icon = point.icon;
              return (
                <div 
                  key={index}
                  className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100"
                >
                  <div className="flex items-start gap-4">
                    <div 
                      className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${point.color}10` }}
                    >
                      <Icon className="w-6 h-6" style={{ color: point.color }} />
                    </div>
                    <div>
                      <p className="font-semibold text-[#4A4A4A] text-lg">
                        {point.text}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Verified Partners / Enterprise Logos */}
          <div className="text-center">
            <p className="text-sm uppercase tracking-wider text-[#4A4A4A]/50 mb-6">
              Trusted by Industry Leaders
            </p>
            <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12">
              {partners.map((partner, index) => (
                <div key={index} className="group cursor-default">
                  <div className="text-xl md:text-2xl font-light tracking-wide relative">
                    <span style={{ color: partner.color }}>{partner.name}</span>
                    <div 
                      className="absolute -bottom-2 left-0 right-0 h-0.5 scale-x-0 group-hover:scale-x-100 transition-transform duration-300"
                      style={{ backgroundColor: partner.color }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Enterprise Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-16 pt-8 border-t border-gray-200">
            {[
              { number: "500+", label: "Daily Deliveries", color: "#15563A" },
              { number: "100%", label: "Verified Partners", color: "#F5B400" },
              { number: "24/7", label: "Live Tracking", color: "#E21C23" },
              { number: "0", label: "Security Breaches", color: "#15563A" }
            ].map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-2xl md:text-3xl font-bold" style={{ color: stat.color }}>
                  {stat.number}
                </div>
                <div className="text-xs md:text-sm text-[#4A4A4A]/60 uppercase tracking-wider mt-1">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>

          {/* Optional Enterprise Badge */}
          <div className="flex justify-center mt-12">
            <div className="inline-flex items-center gap-3 bg-white px-6 py-3 rounded-full shadow-sm">
              <Shield className="w-5 h-5 text-[#15563A]" />
              <span className="text-sm text-[#4A4A4A]">ISO 27001 Certified • SOC 2 Type II</span>
            </div>
          </div>
        </div>
      </div>

      {/* Subtle grid pattern overlay */}
      <div className="absolute left-0 right-0 -z-10 opacity-[0.02] pointer-events-none">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#15563A" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>
    </section>
  );
};

export default ForBusiness;