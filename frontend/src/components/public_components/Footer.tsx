

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#111111] text-white">
      {/* Same gradient top line */}
      <div className="h-1 w-full bg-gradient-to-r from-[#F5B400] via-[#E21C23] to-[#15563A]"></div>
      
      {/* Main Footer */}
      <div className="container mx-auto px-4 md:px-6 py-16 md:py-20">
        <div className="grid md:grid-cols-12 gap-10">
          
          {/* LEFT - Brand */}
          <div className="md:col-span-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 bg-[#F5B400] rounded-lg flex items-center justify-center">
                <span className="text-[#111111] font-bold text-xl">F</span>
              </div>
              <span className="text-2xl font-bold text-white">FLANORX</span>
            </div>
            <p className="text-white/60 text-lg">
              Power Down? No Wahala.
            </p>
            
            {/* Optional contact info */}
            <div className="mt-6 space-y-2">
              <p className="text-white/40 text-xs flex items-center gap-2">
                <span className="w-4 h-4 bg-[#F5B400]/20 rounded-full flex items-center justify-center text-[#F5B400] text-[10px]">📞</span>
                24/7 Support: +1 (800) 555-0123
              </p>
              <p className="text-white/40 text-xs flex items-center gap-2">
                <span className="w-4 h-4 bg-[#F5B400]/20 rounded-full flex items-center justify-center text-[#F5B400] text-[10px]">✉</span>
                hello@flanorx.com
              </p>
            </div>
          </div>

          {/* MIDDLE - Navigation */}
          <div className="md:col-span-3 md:col-start-6">
            <h3 className="text-sm font-semibold text-[#F5B400] uppercase tracking-wider mb-5">
              Navigation
            </h3>
            <ul className="space-y-3">
              {['About', 'Services', 'Join as Partner', 'Contact'].map((item) => (
                <li key={item}>
                  <button className="text-white/60 hover:text-[#F5B400] transition-colors text-sm">
                    {item}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* RIGHT - Account & Legal */}
          <div className="md:col-span-3 md:col-end-13">
            <div className="mb-8">
              <h3 className="text-sm font-semibold text-[#F5B400] uppercase tracking-wider mb-5">
                Account
              </h3>
              <ul className="space-y-3">
                {['Sign In', 'Create Account'].map((item) => (
                  <li key={item}>
                    <button className="text-white/60 hover:text-[#F5B400] transition-colors text-sm">
                      {item}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            
            <div>
              <h3 className="text-sm font-semibold text-[#F5B400] uppercase tracking-wider mb-5">
                Legal
              </h3>
              <ul className="space-y-3">
                {['Terms', 'Privacy'].map((item) => (
                  <li key={item}>
                    <button className="text-white/60 hover:text-[#F5B400] transition-colors text-sm">
                      {item}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/10">
        <div className="container mx-auto px-4 md:px-6 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-white/30 text-xs">
              © {currentYear} Flanorx Energy Logistics. All rights reserved.
            </p>
            
            <div className="flex gap-6">
              <button className="text-white/30 hover:text-[#F5B400] transition-colors text-xs">
                LinkedIn
              </button>
              <button className="text-white/30 hover:text-[#F5B400] transition-colors text-xs">
                X (Twitter)
              </button>
              <button className="text-white/30 hover:text-[#F5B400] transition-colors text-xs">
                Instagram
              </button>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;