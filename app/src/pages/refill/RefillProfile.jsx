// src/pages/refill/RefillProfile.jsx
import React, { useState, useEffect } from "react";
import {
  Store,
  Clock,
  CheckCircle2,
  AlertCircle,
  Upload,
  FileText,
  Loader2,
  Save,
} from "lucide-react";

import {
  useGetMyRefillStationQuery,
  useUpdateMyRefillStationMutation,
  useUpdateMyRefillStationDocumentsMutation,
} from "../../features/refillApiSlice";

import RefillSidebar from "../../components/refill/RefillSidebar";
import RefillBottombar from "../../components/refill/RefillBottombar";

const CYLINDER_SIZES = ["3kg", "6kg", "12kg", "25kg", "50kg"];

const RefillProfile = () => {
  const { data: stationData, isLoading: isFetching, refetch } = useGetMyRefillStationQuery();
  
  const [updateDetails, { isLoading: isUpdatingDetails }] = useUpdateMyRefillStationMutation();
  const [updateDocuments, { isLoading: isUpdatingDocs }] = useUpdateMyRefillStationDocumentsMutation();

  // Form State
  const [form, setForm] = useState({
    businessName: "",
    contactPerson: "",
    phone: "",
    email: "",
    address: "",
    operatingHours: "",
    lat: "",
    lng: "",
    deliveryFeePerKm: "",
    supportedCylinderSizes: [],
    cylinderPrices: {},
    logoUrl: "",
  });

  // Document State
  const [licenseFile, setLicenseFile] = useState(null);
  const [shopPhotos, setShopPhotos] = useState([]);
  const [cylinderPhotos, setCylinderPhotos] = useState([]);

  const [message, setMessage] = useState({ type: "", text: "" });

  // Populate form when data loads
  useEffect(() => {
    if (stationData) {
      setForm({
        businessName: stationData.businessName || "",
        contactPerson: stationData.contactPerson || "",
        phone: stationData.phone || "",
        email: stationData.email || "",
        address: stationData.address || "",
        operatingHours: stationData.operatingHours || "",
        lat: stationData.coordinates?.lat || "",
        lng: stationData.coordinates?.lng || "",
        deliveryFeePerKm: stationData.deliveryFeePerKm || 100,
        supportedCylinderSizes: stationData.supportedCylinderSizes || [],
        cylinderPrices: stationData.cylinderPrices || {},
        logoUrl: stationData.logoUrl || "",
      });
    }
  }, [stationData]);

  // Handlers
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const toggleSize = (size) => {
    const isSupported = form.supportedCylinderSizes.includes(size);
    let newSizes;
    if (isSupported) {
      newSizes = form.supportedCylinderSizes.filter((s) => s !== size);
    } else {
      newSizes = [...form.supportedCylinderSizes, size];
    }
    setForm({ ...form, supportedCylinderSizes: newSizes });
  };

  const handlePriceChange = (size, value) => {
    setForm({
      ...form,
      cylinderPrices: { ...form.cylinderPrices, [size]: value },
    });
  };

  const handleSaveDetails = async (e) => {
    e.preventDefault();
    setMessage({ type: "", text: "" });

    try {
      await updateDetails({
        ...form,
        coordinates: { lat: Number(form.lat), lng: Number(form.lng) },
        deliveryFeePerKm: Number(form.deliveryFeePerKm),
      }).unwrap();
      
      setMessage({ type: "success", text: "Business details updated successfully!" });
      refetch();
      setTimeout(() => setMessage({ type: "", text: "" }), 3000);
    } catch (err) {
      setMessage({ type: "error", text: err.data?.message || "Failed to update details." });
    }
  };

  const handleSaveDocuments = async (e) => {
    e.preventDefault();
    setMessage({ type: "", text: "" });

    const fd = new FormData();
    if (licenseFile) fd.append("businessLicense", licenseFile);
    shopPhotos.forEach((file) => fd.append("shopPhotos", file));
    cylinderPhotos.forEach((file) => fd.append("cylinderPhotos", file));

    if (!licenseFile && shopPhotos.length === 0 && cylinderPhotos.length === 0) {
      return setMessage({ type: "error", text: "Please select at least one file to upload." });
    }

    try {
      const res = await updateDocuments(fd).unwrap();
      setMessage({ type: "success", text: res.message || "Documents updated successfully!" });
      
      // Clear file states
      setLicenseFile(null);
      setShopPhotos([]);
      setCylinderPhotos([]);
      refetch();
      
      setTimeout(() => setMessage({ type: "", text: "" }), 5000);
    } catch (err) {
      setMessage({ type: "error", text: err.data?.message || "Failed to upload documents." });
    }
  };

  if (isFetching) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-[#13ec5b] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <RefillSidebar />

      <div className="lg:ml-64 pb-20 lg:pb-8">
        <header className="sticky top-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 lg:py-4 lg:px-6 flex items-center justify-between gap-2">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white lg:text-xl truncate">
            Station Profile
          </h1>
          <div className="flex items-center gap-3">
            <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-[#13ec5b]/10 text-[#13ec5b] rounded">
              {stationData?.status || "Active"}
            </span>
          </div>
        </header>

        <div className="w-full px-2 sm:px-4 lg:px-6 py-4">
          <div className="max-w-4xl mx-auto space-y-6">
            
            {/* Status Messages */}
            {message.text && (
              <div
                className={`p-4 rounded-xl border flex items-start gap-3 ${
                  message.type === "error"
                    ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300"
                    : "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300"
                }`}
              >
                {message.type === "error" ? (
                  <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle2 className="h-5 w-5 flex-shrink-0 mt-0.5" />
                )}
                <p className="text-sm">{message.text}</p>
              </div>
            )}

            {/* Warning if station is pending/banned */}
            {stationData?.status === "pending" && (
              <div className="p-4 rounded-xl border border-yellow-200 dark:border-yellow-900/50 bg-yellow-50 dark:bg-yellow-900/20 flex items-start gap-3">
                <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                    Your station is under review.
                  </p>
                  <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-1">
                    You cannot receive orders until an admin approves your latest changes.
                  </p>
                </div>
              </div>
            )}

            {/* ─── Business Details Form ─────────────────────────── */}
            <form onSubmit={handleSaveDetails} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm overflow-hidden">
              <div className="p-5 border-b border-gray-100 dark:border-gray-700">
                <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Store className="h-5 w-5 text-[#13ec5b]" /> Business Details
                </h2>
              </div>
              
              <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Business Name</label>
                  <input type="text" name="businessName" value={form.businessName} onChange={handleChange} className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-[#13ec5b]/50 focus:border-transparent" required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Contact Person</label>
                  <input type="text" name="contactPerson" value={form.contactPerson} onChange={handleChange} className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-[#13ec5b]/50 focus:border-transparent" required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Phone Number</label>
                  <input type="tel" name="phone" value={form.phone} onChange={handleChange} className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-[#13ec5b]/50 focus:border-transparent" required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Email Address</label>
                  <input type="email" name="email" value={form.email} onChange={handleChange} className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-[#13ec5b]/50 focus:border-transparent" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Full Address</label>
                  <textarea name="address" value={form.address} onChange={handleChange} rows="2" className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-[#13ec5b]/50 focus:border-transparent resize-none" required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Latitude</label>
                  <input type="number" step="any" name="lat" value={form.lat} onChange={handleChange} className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-[#13ec5b]/50 focus:border-transparent" required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Longitude</label>
                  <input type="number" step="any" name="lng" value={form.lng} onChange={handleChange} className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-[#13ec5b]/50 focus:border-transparent" required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Operating Hours</label>
                  <input type="text" name="operatingHours" value={form.operatingHours} onChange={handleChange} placeholder="e.g. Mon-Sat 8am - 7pm" className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-[#13ec5b]/50 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Delivery Fee / Km (₦)</label>
                  <input type="number" name="deliveryFeePerKm" value={form.deliveryFeePerKm} onChange={handleChange} className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-[#13ec5b]/50 focus:border-transparent" />
                </div>
              </div>

              {/* Pricing Section */}
              <div className="p-5 border-t border-gray-100 dark:border-gray-700">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">Supported Cylinders & Pricing</h3>
                <div className="space-y-3">
                  {CYLINDER_SIZES.map((size) => {
                    const isChecked = form.supportedCylinderSizes.includes(size);
                    return (
                      <div key={size} className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-200 dark:border-gray-600">
                        <label className="flex items-center gap-2 cursor-pointer w-32 flex-shrink-0">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSize(size)}
                            className="w-4 h-4 rounded border-gray-300 text-[#13ec5b] focus:ring-[#13ec5b]/50"
                          />
                          <span className="text-sm font-medium text-gray-900 dark:text-white">{size} Cylinder</span>
                        </label>
                        {isChecked && (
                          <div className="flex items-center gap-2 flex-1">
                            <span className="text-sm text-gray-500 dark:text-gray-400">₦</span>
                            <input
                              type="number"
                              value={form.cylinderPrices[size] || ""}
                              onChange={(e) => handlePriceChange(size, e.target.value)}
                              placeholder="Price"
                              className="w-full max-w-[200px] px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-[#13ec5b]/50 focus:border-transparent"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="p-5 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex justify-end">
                <button
                  type="submit"
                  disabled={isUpdatingDetails}
                  className="px-6 py-2.5 bg-[#13ec5b] hover:bg-[#10d04e] text-white text-sm font-bold rounded-xl transition disabled:opacity-50 flex items-center gap-2"
                >
                  {isUpdatingDetails ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save Details
                </button>
              </div>
            </form>

            {/* ─── Documents Form ────────────────────────────────── */}
            <form onSubmit={handleSaveDocuments} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm overflow-hidden">
              <div className="p-5 border-b border-gray-100 dark:border-gray-700">
                <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <FileText className="h-5 w-5 text-[#13ec5b]" /> Verification Documents
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Upload new photos or licenses. Changing your business license requires re-approval.
                </p>
              </div>

              <div className="p-5 space-y-6">
                {/* License */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Business License</label>
                  {stationData?.licenseUrl && (
                    <div className="mb-2 flex items-center gap-2 text-xs text-[#13ec5b]">
                      <CheckCircle2 className="h-4 w-4" /> Current license on file
                      <a href={stationData.licenseUrl} target="_blank" rel="noreferrer" className="underline ml-1">View</a>
                    </div>
                  )}
                  <input type="file" onChange={(e) => setLicenseFile(e.target.files[0])} accept="image/*,.pdf" className="block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-[#13ec5b]/10 file:text-[#13ec5b] hover:file:bg-[#13ec5b]/20 transition" />
                </div>

                {/* Shop Photos */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Shop Photos</label>
                  {stationData?.shopPhotos?.length > 0 && (
                    <div className="flex gap-2 mb-2 overflow-x-auto pb-1">
                      {stationData.shopPhotos.map((url, i) => (
                        <img key={i} src={url} alt="shop" className="h-12 w-12 rounded-lg object-cover border border-gray-200 dark:border-gray-700" />
                      ))}
                    </div>
                  )}
                  <input type="file" multiple onChange={(e) => setShopPhotos(Array.from(e.target.files))} accept="image/*" className="block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-[#13ec5b]/10 file:text-[#13ec5b] hover:file:bg-[#13ec5b]/20 transition" />
                </div>

                {/* Cylinder Photos */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Cylinder Photos</label>
                  {stationData?.cylinderPhotos?.length > 0 && (
                    <div className="flex gap-2 mb-2 overflow-x-auto pb-1">
                      {stationData.cylinderPhotos.map((url, i) => (
                        <img key={i} src={url} alt="cylinder" className="h-12 w-12 rounded-lg object-cover border border-gray-200 dark:border-gray-700" />
                      ))}
                    </div>
                  )}
                  <input type="file" multiple onChange={(e) => setCylinderPhotos(Array.from(e.target.files))} accept="image/*" className="block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-[#13ec5b]/10 file:text-[#13ec5b] hover:file:bg-[#13ec5b]/20 transition" />
                </div>
              </div>

              <div className="p-5 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex justify-end">
                <button
                  type="submit"
                  disabled={isUpdatingDocs || (!licenseFile && shopPhotos.length === 0 && cylinderPhotos.length === 0)}
                  className="px-6 py-2.5 bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-100 text-white dark:text-gray-900 text-sm font-bold rounded-xl transition disabled:opacity-50 flex items-center gap-2"
                >
                  {isUpdatingDocs ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  Upload Documents
                </button>
              </div>
            </form>

          </div>
        </div>
      </div>

      <RefillBottombar />
    </div>
  );
};

export default RefillProfile;