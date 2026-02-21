import { Zap, Truck, Building2 } from 'lucide-react';

const WhatWeDo = () => {
  const features = [
    {
      icon: Zap,
      title: "Instant Fuel Requests",
      description: "Order fuel in seconds from your phone.",
      color: "#F5B400" // Energy Yellow
    },
    {
      icon: Truck,
      title: "Fast & Secure Delivery",
      description: "Track your delivery in real-time.",
      color: "#E21C23" // Flame Red
    },
    {
      icon: Building2,
      title: "Built for Homes & Industries",
      description: "Scalable solutions for any need.",
      color: "#15563A" // Primary Green
    }
  ];

  return (
    <section id="how-it-works" className="py-20 md:py-28 bg-white">
      <div className="container mx-auto px-4 md:px-6">
        {/* Section Title */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#15563A] mb-3">
            Reliable Energy. Delivered.
          </h2>
          <div className="w-20 h-1 bg-[#F5B400] mx-auto rounded-full"></div>
        </div>

        {/* 3 Simple Blocks */}
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="group relative bg-white p-8 rounded-2xl text-center hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-transparent"
              >
                {/* Icon with colored background */}
                <div 
                  className="w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:rotate-3"
                  style={{ backgroundColor: `${feature.color}15` }} // 15% opacity version of the color
                >
                  <Icon 
                    className="w-10 h-10 transition-all duration-300 group-hover:scale-110" 
                    style={{ color: feature.color }}
                  />
                </div>

                {/* Title */}
                <h3 className="text-xl font-bold text-[#4A4A4A] mb-3">
                  {feature.title}
                </h3>

                {/* Description line */}
                <p className="text-[#4A4A4A]/70 text-sm leading-relaxed">
                  {feature.description}
                </p>

                {/* Subtle decorative element */}
                <div 
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0.5 group-hover:w-12 transition-all duration-300"
                  style={{ backgroundColor: feature.color }}
                ></div>
              </div>
            );
          })}
        </div>

        {/* Optional subtle background pattern */}
        <div className="absolute left-0 right-0 -z-10 opacity-5">
          <svg className="w-full h-40" preserveAspectRatio="none" viewBox="0 0 1440 120">
            <path d="M0,64L80,69.3C160,75,320,85,480,80C640,75,800,53,960,48C1120,43,1280,53,1360,58.7L1440,64L1440,120L1360,120C1280,120,1120,120,960,120C800,120,640,120,480,120C320,120,160,120,80,120L0,120Z" fill="#15563A"></path>
          </svg>
        </div>
      </div>
    </section>
  );
};

export default WhatWeDo;