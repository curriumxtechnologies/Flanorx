"use client";

import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Smooth scroll to section
  const scrollToSection = (sectionId: string) => {
    setIsOpen(false);
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <nav
      className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        isScrolled ? "bg-white shadow-lg py-2" : "bg-white py-4"
      }`}
    >
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex items-center justify-between">
          {/* LEFT SIDE - Brand */}
          <div
            onClick={() => scrollToSection("home")}
            className="flex items-center gap-2 cursor-pointer group"
          >
            {/* Logo Icon */}
            <div className="w-10 h-10 bg-[#15563A] rounded-lg flex items-center justify-center transform group-hover:scale-105 transition-transform">
              <span className="text-white font-bold text-xl">F</span>
            </div>
            {/* Brand Name */}
            <span className="text-2xl font-bold text-[#15563A]">Flanorx</span>
          </div>

          {/* CENTER - Main Navigation (Desktop) */}
          <div className="hidden md:flex items-center space-x-8">
            <button
              onClick={() => scrollToSection("home")}
              className="text-[#4A4A4A] hover:text-[#15563A] font-medium transition-colors"
            >
              Home
            </button>
            <button
              onClick={() => scrollToSection("how-it-works")}
              className="text-[#4A4A4A] hover:text-[#15563A] font-medium transition-colors"
            >
              How It Works
            </button>
            <button
              onClick={() => scrollToSection("for-business")}
              className="text-[#4A4A4A] hover:text-[#15563A] font-medium transition-colors"
            >
              For Business
            </button>
            <button
              onClick={() => scrollToSection("partners")}
              className="text-[#4A4A4A] hover:text-[#15563A] font-medium transition-colors"
            >
              Partners
            </button>
          </div>

          {/* RIGHT SIDE - Actions (Desktop) */}
          <div className="hidden md:flex items-center gap-4">
            <button
              onClick={() => scrollToSection("signin")}
              className="text-[#4A4A4A] hover:text-[#15563A] font-medium transition-colors"
            >
              Sign In
            </button>
            <button
              onClick={() => scrollToSection("get-fuel")}
              className="bg-[#15563A] text-white px-6 py-2 rounded-full font-semibold hover:bg-[#0e3f2b] transition-all transform hover:scale-105 shadow-md"
            >
              Get Fuel
            </button>
            {/* Optional Join as Partner - commented as per your note */}
            {/* <button className="text-[#4A4A4A] hover:text-[#15563A] font-medium">
              Join as Partner
            </button> */}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden text-[#15563A] p-2"
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="md:hidden absolute top-full left-0 w-full bg-white shadow-lg py-4 px-4 flex flex-col space-y-4 animate-fadeIn">
            <button
              onClick={() => scrollToSection("home")}
              className="text-[#4A4A4A] hover:text-[#15563A] py-2 font-medium transition-colors text-left"
            >
              Home
            </button>
            <button
              onClick={() => scrollToSection("how-it-works")}
              className="text-[#4A4A4A] hover:text-[#15563A] py-2 font-medium transition-colors text-left"
            >
              How It Works
            </button>
            <button
              onClick={() => scrollToSection("for-business")}
              className="text-[#4A4A4A] hover:text-[#15563A] py-2 font-medium transition-colors text-left"
            >
              For Business
            </button>
            <button
              onClick={() => scrollToSection("partners")}
              className="text-[#4A4A4A] hover:text-[#15563A] py-2 font-medium transition-colors text-left"
            >
              Partners
            </button>
            <div className="border-t border-gray-200 my-2"></div>
            <button
              onClick={() => scrollToSection("signin")}
              className="text-[#4A4A4A] hover:text-[#15563A] py-2 font-medium transition-colors text-left"
            >
              Sign In
            </button>
            <button
              onClick={() => scrollToSection("get-fuel")}
              className="bg-[#15563A] text-white px-6 py-3 rounded-full font-semibold hover:bg-[#0e3f2b] transition-all text-center"
            >
              Get Fuel
            </button>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;