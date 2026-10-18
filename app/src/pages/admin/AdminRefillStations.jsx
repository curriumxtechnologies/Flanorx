// src/pages/admin/AdminRefillStations.jsx
import React, { useState, useMemo } from "react";
import { useSelector } from "react-redux";
import {
  Search,
  MapPin,
  Phone,
  Loader2,
  AlertCircle,
  X,
  Droplet,
  ShieldAlert,
  ShieldCheck,
  FileText,
  Image as ImageIcon,
} from "lucide-react";
import AdminSidebar from "../../components/admin/Sidebar";
import AdminBottombar from "../../components/admin/Bottombar";
import {
  useAdminGetRefillStationsQuery,
  useAdminApproveRefillStationMutation,
  useAdminRejectRefillStationMutation,
  useAdminBanRefillStationMutation,
  useAdminUnbanRefillStationMutation,
} from "../../features/refillApiSlice";

const AdminRefillStations = () => {
  const { userInfo } = useSelector((state) => state.auth);

  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStation, setSelectedStation] = useState(null);
  const [actionModal, setActionModal] = useState(null); // { type: 'reject' | 'ban', stationId }
  const [actionReason, setActionReason] = useState("");

  // ─── API Queries & Mutations ─────────────────────────────
  const {
    data: rawStations = [],
    isLoading,
    error,
    refetch,
  } = useAdminGetRefillStationsQuery();

  const [approveStation, { isLoading: isApproving }] = useAdminApproveRefillStationMutation();
  const [rejectStation, { isLoading: isRejecting }] = useAdminRejectRefillStationMutation();
  const [banStation, { isLoading: isBanning }] = useAdminBanRefillStationMutation();
  const [unbanStation, { isLoading: isUnbanning }] = useAdminUnbanRefillStationMutation();

  // ─── Handlers ────────────────────────────────────────────
  const handleApprove = async (id) => {
    try {
      await approveStation(id).unwrap();
      refetch();
      if (selectedStation) setSelectedStation(null);
    } catch (err) {
      alert(err.data?.message || "Failed to approve station");
    }
  };

  const handleReject = async () => {
    if (!actionReason.trim()) return alert("Rejection reason is required");
    try {
      await rejectStation({ id: actionModal.stationId, reason: actionReason }).unwrap();
      setActionModal(null);
      setActionReason("");
      refetch();
      if (selectedStation) setSelectedStation(null);
    } catch (err) {
      alert(err.data?.message || "Failed to reject station");
    }
  };

  const handleBan = async () => {
    if (!actionReason.trim()) return alert("Ban reason is required");
    try {
      await banStation({ id: actionModal.stationId, reason: actionReason }).unwrap();
      setActionModal(null);
      setActionReason("");
      refetch();
      if (selectedStation) setSelectedStation(null);
    } catch (err) {
      alert(err.data?.message || "Failed to ban station");
    }
  };

  const handleUnban = async (id) => {
    try {
      await unbanStation(id).unwrap();
      refetch();
      if (selectedStation) setSelectedStation(null);
    } catch (err) {
      alert(err.data?.message || "Failed to unban station");
    }
  };

  // ─── Derived Data (STRICT FRONTEND FILTER) ───────────────
  const filteredStations = useMemo(() => {
    // 1. FIREWALL: Kick out any object that is a Pickup Station
    // Pickup stations have a `stock` object and use `name`.
    // Refill stations have `businessName` and NO `stock`.
    let baseData = (rawStations || []).filter((s) => {
      const isPickupStation = s.stock !== undefined || (!s.businessName && s.name);
      return !isPickupStation && !!s.businessName;
    });

    // 2. Apply search
    if (searchQuery) {
      const lowerQ = searchQuery.toLowerCase();
      baseData = baseData.filter(
        (s) =>
          s.businessName?.toLowerCase().includes(lowerQ) ||
          s.address?.toLowerCase().includes(lowerQ) ||
          s.contactPerson?.toLowerCase().includes(lowerQ) ||
          s.phone?.includes(lowerQ)
      );
    }

    return baseData;
  }, [rawStations, searchQuery]);

  // Status Badge Helper
  const getStatusBadge = (status) => {
    switch (status) {
      case "approved":
        return "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400";
      case "pending":
        return "bg-yellow-50 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400";
      case "rejected":
      case "banned":
        return "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400";
      default:
        return "bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
    }
  };

  // ─── Main Render ─────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <AdminSidebar />

      <div className="lg:ml-64 pb-20 lg:pb-8">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 lg:py-4 lg:px-6 flex items-center justify-between gap-2">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white lg:text-xl truncate">
            Refill Stations
          </h1>
          <div className="flex items-center gap-3 flex-shrink-0">
            <span className="text-sm text-gray-500 dark:text-gray-400 hidden sm:inline truncate max-w-[160px]">
              {userInfo?.name || "Admin"}
            </span>
          </div>
        </header>

        <div className="w-full px-2 sm:px-4 lg:px-6 py-4">
          {/* Search Bar */}
          <div className="mb-4 relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by business name, contact, or address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-[#13ec5b]/50 focus:border-transparent transition"
            />
          </div>

          {/* Content */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden lg:rounded-2xl rounded-2xl">
            {isLoading ? (
              <div className="p-8 text-center">
                <Loader2 className="h-8 w-8 text-[#13ec5b] animate-spin mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">Loading stations...</p>
              </div>
            ) : error ? (
              <div className="p-8 text-center">
                <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-3" />
                <p className="text-red-600 dark:text-red-400">
                  Failed to load refill stations.
                </p>
                <button
                  onClick={refetch}
                  className="mt-3 text-[#13ec5b] hover:underline text-sm font-medium"
                >
                  Try again
                </button>
              </div>
            ) : filteredStations.length === 0 ? (
              <div className="p-12 text-center">
                <Droplet className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400 font-medium">
                  No refill stations found
                </p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                  {searchQuery
                    ? "Try adjusting your search query."
                    : "No refill station applications have been submitted yet."}
                </p>
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full text-sm table-fixed">
                    <colgroup>
                      <col className="w-[25%]" />
                      <col className="w-[25%]" />
                      <col className="w-[15%]" />
                      <col className="w-[15%]" />
                      <col className="w-[20%]" />
                    </colgroup>
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                        <th className="text-left py-3 px-4 text-gray-500 dark:text-gray-400 font-medium">
                          Business Name
                        </th>
                        <th className="text-left py-3 px-4 text-gray-500 dark:text-gray-400 font-medium">
                          Contact Info
                        </th>
                        <th className="text-left py-3 px-4 text-gray-500 dark:text-gray-400 font-medium">
                          Status
                        </th>
                        <th className="text-left py-3 px-4 text-gray-500 dark:text-gray-400 font-medium">
                          Location
                        </th>
                        <th className="text-right py-3 px-4 text-gray-500 dark:text-gray-400 font-medium">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStations.map((station) => (
                        <tr
                          key={station._id}
                          className="border-b border-gray-100 dark:border-gray-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition cursor-pointer"
                          onClick={() => setSelectedStation(station)}
                        >
                          <td className="py-3 px-4 font-medium text-gray-900 dark:text-white">
                            <div className="truncate">{station.businessName}</div>
                            <div className="text-[10px] text-gray-500">
                              {station.contactPerson}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-gray-600 dark:text-gray-300">
                            <div className="flex items-center gap-1.5 truncate mb-0.5">
                              <Phone className="h-3 w-3 text-gray-400 flex-shrink-0" />
                              <span>{station.phone}</span>
                            </div>
                            <div className="text-[10px] text-gray-500 truncate">
                              {station.email}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusBadge(
                                station.status
                              )}`}
                            >
                              {station.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-gray-600 dark:text-gray-300">
                            <div className="flex items-center gap-1.5 truncate">
                              <MapPin className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                              <span className="truncate">{station.address}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                              {station.status === "pending" && (
                                <>
                                  <button
                                    onClick={() => handleApprove(station._id)}
                                    disabled={isApproving}
                                    className="px-2 py-1 bg-green-50 text-green-600 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 rounded-lg text-xs font-medium transition"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => {
                                      setActionModal({ type: "reject", stationId: station._id });
                                      setActionReason("");
                                    }}
                                    className="px-2 py-1 bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 rounded-lg text-xs font-medium transition"
                                  >
                                    Reject
                                  </button>
                                </>
                              )}
                              {station.status === "approved" && (
                                <button
                                  onClick={() => {
                                    setActionModal({ type: "ban", stationId: station._id });
                                    setActionReason("");
                                  }}
                                  className="px-2 py-1 bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 rounded-lg text-xs font-medium transition flex items-center gap-1"
                                >
                                  <ShieldAlert className="h-3 w-3" /> Ban
                                </button>
                              )}
                              {station.status === "banned" && (
                                <button
                                  onClick={() => handleUnban(station._id)}
                                  disabled={isUnbanning}
                                  className="px-2 py-1 bg-green-50 text-green-600 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 rounded-lg text-xs font-medium transition flex items-center gap-1"
                                >
                                  <ShieldCheck className="h-3 w-3" /> Unban
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile List */}
                <div className="block lg:hidden divide-y divide-gray-100 dark:divide-gray-700">
                  {filteredStations.map((station) => (
                    <div
                      key={station._id}
                      className="p-4 flex flex-col gap-3"
                      onClick={() => setSelectedStation(station)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white">
                            {station.businessName}
                          </p>
                          <p className="text-[11px] text-gray-500">
                            {station.contactPerson} · {station.phone}
                          </p>
                        </div>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium capitalize flex-shrink-0 ${getStatusBadge(
                            station.status
                          )}`}
                        >
                          {station.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5 truncate">
                        <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                        <span className="truncate">{station.address}</span>
                      </p>
                      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                        {station.status === "pending" && (
                          <>
                            <button
                              onClick={() => handleApprove(station._id)}
                              className="flex-1 py-1.5 bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400 rounded-lg text-xs font-medium"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => {
                                setActionModal({ type: "reject", stationId: station._id });
                                setActionReason("");
                              }}
                              className="flex-1 py-1.5 bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 rounded-lg text-xs font-medium"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {station.status === "approved" && (
                          <button
                            onClick={() => {
                              setActionModal({ type: "ban", stationId: station._id });
                              setActionReason("");
                            }}
                            className="flex-1 py-1.5 bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 rounded-lg text-xs font-medium"
                          >
                            Ban Station
                          </button>
                        )}
                        {station.status === "banned" && (
                          <button
                            onClick={() => handleUnban(station._id)}
                            className="flex-1 py-1.5 bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400 rounded-lg text-xs font-medium"
                          >
                            Unban Station
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <AdminBottombar />

      {/* ─── View Details Modal ────────────────────────────────── */}
      {selectedStation && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4">
          <div className="bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between flex-shrink-0">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                Station Details
              </h2>
              <button
                onClick={() => setSelectedStation(null)}
                className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-500 text-xs mb-1">Business Name</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {selectedStation.businessName}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs mb-1">Contact Person</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {selectedStation.contactPerson}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs mb-1">Phone</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {selectedStation.phone}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs mb-1">Email</p>
                  <p className="font-medium text-gray-900 dark:text-white truncate">
                    {selectedStation.email}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-gray-500 text-xs mb-1">Address</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {selectedStation.address}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-gray-500 text-xs mb-1">Coordinates</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {selectedStation.coordinates?.lat}, {selectedStation.coordinates?.lng}
                  </p>
                </div>
              </div>

              <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
                <p className="text-gray-500 text-xs mb-2">Supported Cylinders & Prices</p>
                <div className="flex flex-wrap gap-2">
                  {selectedStation.supportedCylinderSizes?.map((size) => (
                    <span key={size} className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-lg text-xs">
                      {size}: ₦{selectedStation.cylinderPrices?.[size]}
                    </span>
                  ))}
                </div>
              </div>

              <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
                <p className="text-gray-500 text-xs mb-2">Documents</p>
                <div className="flex flex-col gap-2">
                  {selectedStation.licenseUrl && (
                    <a
                      href={selectedStation.licenseUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 text-[#13ec5b] hover:underline"
                    >
                      <FileText className="h-4 w-4" /> View Business License
                    </a>
                  )}
                  {selectedStation.shopPhotos?.length > 0 && (
                    <a
                      href={selectedStation.shopPhotos[0]}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 text-[#13ec5b] hover:underline"
                    >
                      <ImageIcon className="h-4 w-4" /> View Shop Photos ({selectedStation.shopPhotos.length})
                    </a>
                  )}
                </div>
              </div>

              {/* Actions inside modal */}
              <div className="border-t border-gray-100 dark:border-gray-800 pt-4 flex gap-3">
                {selectedStation.status === "pending" && (
                  <>
                    <button
                      onClick={() => handleApprove(selectedStation._id)}
                      className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl transition"
                    >
                      Approve Station
                    </button>
                    <button
                      onClick={() => {
                        setActionModal({ type: "reject", stationId: selectedStation._id });
                        setActionReason("");
                      }}
                      className="flex-1 py-2.5 bg-red-100 hover:bg-red-200 text-red-600 dark:bg-red-900/30 dark:text-red-400 font-medium rounded-xl transition"
                    >
                      Reject
                    </button>
                  </>
                )}
                {selectedStation.status === "approved" && (
                  <button
                    onClick={() => {
                      setActionModal({ type: "ban", stationId: selectedStation._id });
                      setActionReason("");
                    }}
                    className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl transition flex items-center justify-center gap-2"
                  >
                    <ShieldAlert className="h-4 w-4" /> Ban Station
                  </button>
                )}
                {selectedStation.status === "banned" && (
                  <button
                    onClick={() => handleUnban(selectedStation._id)}
                    className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl transition flex items-center justify-center gap-2"
                  >
                    <ShieldCheck className="h-4 w-4" /> Unban Station
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Action Reason Modal (Reject / Ban) ─────────────────── */}
      {actionModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
              {actionModal.type === "reject" ? "Reject Application" : "Ban Station"}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Please provide a reason. This will be sent to the station owner.
            </p>
            <textarea
              value={actionReason}
              onChange={(e) => setActionReason(e.target.value)}
              rows="3"
              placeholder="Enter reason here..."
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm mb-4 focus:ring-2 focus:ring-[#13ec5b]/50 focus:border-transparent resize-none"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setActionModal(null)}
                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={actionModal.type === "reject" ? handleReject : handleBan}
                disabled={isRejecting || isBanning}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {(isRejecting || isBanning) && <Loader2 className="h-4 w-4 animate-spin" />}
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminRefillStations;