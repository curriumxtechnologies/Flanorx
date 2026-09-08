// pages/NotFound.jsx
import React from "react";
import { useNavigate } from "react-router";
import { Home, AlertCircle } from "lucide-react";

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900 px-4">
      <div className="text-center max-w-md">
        <div className="flex justify-center mb-6">
          <div className="p-4 rounded-full bg-[#13ec5b]/10">
            <AlertCircle className="h-16 w-16 text-[#13ec5b]" />
          </div>
        </div>
        <h1 className="text-6xl font-bold text-gray-900 dark:text-white mb-2">404</h1>
        <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100 mb-3">
          Page not found
        </h2>
        <p className="text-gray-500 dark:text-gray-400 mb-2">
          Oops! The page you're looking for doesn't exist or has been moved.
        </p>
        <p className="text-sm text-gray-400 dark:text-gray-500 italic mb-6">
          Wait small nau – I'd do other pages later biko. I don tire.
        </p>
        <button
          onClick={() => navigate("/dashboard")}
          className="inline-flex items-center gap-2 px-6 py-3 bg-[#13ec5b] hover:bg-[#10d04e] text-white font-medium rounded-lg transition shadow-sm hover:shadow-md"
        >
          <Home className="h-5 w-5" />
          Go to Dashboard
        </button>
      </div>
    </div>
  );
};

export default NotFound;