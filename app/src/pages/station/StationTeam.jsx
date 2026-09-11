// src/pages/station/StationTeam.jsx
import React, { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate } from "react-router";
import { useSelector } from "react-redux";
import toast from "react-hot-toast";
import {
  Users,
  UserPlus,
  Trash2,
  Search,
  X,
  AlertCircle,
  RefreshCw,
  Loader2,
  Mail,
  Phone,
  Shield,
  User,
  ChevronDown,
  CheckCircle2,
  UserCog,
  Info,
} from "lucide-react";
import StationSidebar from "../../components/station/Sidebar";
import StationBottombar from "../../components/station/Bottombar";
import {
  useGetStationTeamQuery,
  useAddStationTeamMemberMutation,
  useRemoveStationTeamMemberMutation,
  useSearchStationUsersQuery,
} from "../../features/stationApiSlice";

// ═══════════════════════════════════════════════════════════
//  Debounced value hook (used for the user search)
// ═══════════════════════════════════════════════════════════
const useDebounced = (value, delay = 350) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
};

// ═══════════════════════════════════════════════════════════
//  Confirm dialog
// ═══════════════════════════════════════════════════════════
const ConfirmDialog = ({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  danger = false,
  loading = false,
  onCancel,
  onConfirm,
}) => {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={() => !loading && onCancel()}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl max-w-md w-full p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 mb-4">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
              danger ? "bg-red-100 dark:bg-red-900/30" : "bg-[#13ec5b]/10"
            }`}
          >
            <AlertCircle
              className={`h-5 w-5 ${
                danger ? "text-red-600 dark:text-red-400" : "text-[#13ec5b]"
              }`}
            />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              {title}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 break-words">
              {message}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 py-2.5 rounded-lg font-semibold transition disabled:opacity-60 flex items-center justify-center gap-2 ${
              danger
                ? "bg-red-600 hover:bg-red-700 text-white"
                : "bg-[#13ec5b] hover:bg-[#10d04e] text-gray-900"
            }`}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Working...
              </>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
//  Add Member Modal
// ═══════════════════════════════════════════════════════════
const AddMemberModal = ({ onClose, onSaved }) => {
  const [query, setQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const debouncedQuery = useDebounced(query, 350);
  const inputRef = useRef(null);

  const {
    data: candidates = [],
    isLoading: searching,
    isFetching: fetchingSearch,
  } = useSearchStationUsersQuery(
    { q: debouncedQuery },
    { skip: debouncedQuery.trim().length < 2 }
  );

  const [addMember, { isLoading: adding }] =
    useAddStationTeamMemberMutation();

  useEffect(() => {
    // Focus the search input when the modal opens
    if (inputRef.current) inputRef.current.focus();
  }, []);

  const handleSubmit = async () => {
    if (!selectedUserId) {
      toast.error("Select a user first");
      return;
    }
    try {
      await addMember({ userId: selectedUserId }).unwrap();
      toast.success("Team member added");
      onSaved();
    } catch (err) {
      toast.error(err?.data?.message || "Failed to add team member");
    }
  };

  const showResults = debouncedQuery.trim().length >= 2;
  const isTyping = query !== debouncedQuery || fetchingSearch;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={() => !adding && onClose()}
    >
      <div
        className="bg-white dark:bg-gray-900 w-full max-w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl max-h-[92vh] sm:max-h-[85vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="min-w-0">
            <h3 className="text-base font-bold text-gray-900 dark:text-white truncate">
              Add team member
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Search by name or email
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={adding}
            className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 flex-shrink-0 disabled:opacity-50"
          >
            <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedUserId("");
              }}
              placeholder="Type a name or email (min 2 characters)..."
              autoComplete="off"
              disabled={adding}
              className="w-full pl-9 pr-9 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-[#13ec5b]/50 focus:border-[#13ec5b] outline-none disabled:opacity-60"
            />
            {(query || fetchingSearch) && (
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {isTyping && (
                  <Loader2 className="h-3.5 w-3.5 text-gray-400 animate-spin" />
                )}
                {query && (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery("");
                      setSelectedUserId("");
                    }}
                    className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
                  >
                    <X className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-4 min-h-0">
          {!showResults ? (
            <div className="text-center py-10">
              <Search className="h-10 w-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Start typing to find users
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                Only users not already assigned to a station will appear.
              </p>
            </div>
          ) : searching ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 animate-pulse"
                >
                  <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-700" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
                    <div className="h-3 w-40 bg-gray-200 dark:bg-gray-700 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : candidates.length === 0 ? (
            <div className="text-center py-10">
              <AlertCircle className="h-10 w-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No matching users found
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                Try a different name or email
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {candidates.map((u) => {
                const isSelected = selectedUserId === u._id;
                return (
                  <button
                    key={u._id}
                    type="button"
                    onClick={() => setSelectedUserId(u._id)}
                    disabled={adding}
                    className={`w-full text-left p-3 rounded-xl border-2 transition flex items-center gap-3 ${
                      isSelected
                        ? "border-[#13ec5b] bg-[#13ec5b]/5"
                        : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600"
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        isSelected
                          ? "border-[#13ec5b] bg-[#13ec5b]"
                          : "border-gray-300 dark:border-gray-500"
                      }`}
                    >
                      {isSelected && (
                        <CheckCircle2 className="h-3 w-3 text-white" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {u.name || "Unknown"}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {u.email}
                      </p>
                      {u.phone && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
                          <Phone className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{u.phone}</span>
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex gap-2">
            <button
              onClick={onClose}
              disabled={adding}
              className="flex-1 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!selectedUserId || adding}
              className="flex-1 py-2.5 bg-[#13ec5b] hover:bg-[#10d04e] text-gray-900 rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {adding ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  Add to team
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
//  Main page
// ═══════════════════════════════════════════════════════════
const StationTeam = () => {
  const navigate = useNavigate();
  const { userInfo } = useSelector((state) => state.auth);

  const isStationAdmin = userInfo?.stationRole === "admin";

  const [showAddModal, setShowAddModal] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(null);
  const [search, setSearch] = useState("");

  const {
    data: members = [],
    isLoading,
    error,
    refetch,
    isFetching,
  } = useGetStationTeamQuery(undefined, {
    pollingInterval: 60000,
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });

  const [removeMember, { isLoading: removing }] =
    useRemoveStationTeamMemberMutation();

  // ─── Filter members ────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return members;
    return members.filter(
      (m) =>
        m.name?.toLowerCase().includes(q) ||
        m.email?.toLowerCase().includes(q) ||
        m.phone?.toLowerCase().includes(q)
    );
  }, [members, search]);

  const adminCount = members.filter((m) => m.stationRole === "admin").length;
  const staffCount = members.filter((m) => m.stationRole === "staff").length;

  // ─── Handlers ──────────────────────────────────────────────
  const handleRemove = async () => {
    if (!confirmRemove) return;
    try {
      await removeMember({ userId: confirmRemove._id }).unwrap();
      toast.success("Team member removed");
      setConfirmRemove(null);
      refetch();
    } catch (err) {
      toast.error(err?.data?.message || "Failed to remove team member");
    }
  };

  // ─── Error state ──────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <StationSidebar />
        <div className="lg:ml-64 pb-20 lg:pb-8">
          <header className="sticky top-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 lg:py-4 lg:px-6 flex items-center justify-between">
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white lg:text-xl">
              Team
            </h1>
          </header>
          <div className="w-full px-2 sm:px-4 lg:px-6 py-4">
            <div className="flex flex-col items-center justify-center h-64">
              <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
              <p className="text-red-600 dark:text-red-400">
                Failed to load team
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                {error?.data?.message || error?.message || "Please try again"}
              </p>
            </div>
          </div>
        </div>
        <StationBottombar />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <StationSidebar />

      <div className="lg:ml-64 pb-20 lg:pb-8">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 lg:py-4 lg:px-6 flex items-center justify-between gap-2">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white lg:text-xl truncate">
            Team
          </h1>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw
                className={`h-5 w-5 text-gray-500 dark:text-gray-400 ${
                  isFetching ? "animate-spin" : ""
                }`}
              />
            </button>
            {isStationAdmin && (
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-[#13ec5b] hover:bg-[#10d04e] text-gray-900 rounded-lg text-sm font-semibold transition"
              >
                <UserPlus className="h-4 w-4" />
                <span className="hidden sm:inline">Add Member</span>
                <span className="sm:hidden">Add</span>
              </button>
            )}
          </div>
        </header>

        <div className="w-full px-2 sm:px-4 lg:px-6 py-4">
          {/* ─── MOBILE HERO ─────────────────────────────── */}
          <div className="lg:hidden relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 mb-4 shadow-sm">
            {isLoading ? (
              <>
                <div className="flex items-center justify-between mb-3 gap-2">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="h-2.5 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                  </div>
                </div>
                <div className="flex items-end justify-between mb-3 gap-2">
                  <div className="min-w-0 space-y-2">
                    <div className="h-2.5 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                  </div>
                  <div className="text-right min-w-0 space-y-2">
                    <div className="h-2.5 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse ml-auto" />
                    <div className="h-6 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse ml-auto" />
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between mb-3 gap-2">
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                      Team
                    </span>
                    <h1 className="text-lg font-bold leading-tight truncate text-gray-900 dark:text-white">
                      Staff Members
                    </h1>
                  </div>
                  <button
                    onClick={() => refetch()}
                    disabled={isFetching}
                    className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition flex-shrink-0 disabled:opacity-50"
                  >
                    <RefreshCw
                      className={`h-4 w-4 ${
                        isFetching ? "animate-spin" : ""
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-end justify-between mb-3 gap-2">
                  <div className="min-w-0">
                    <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Total Members
                    </span>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white truncate">
                      {members.length}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="text-right min-w-0">
                      <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Admins
                      </span>
                      <p className="text-xl font-bold text-gray-900 dark:text-white truncate">
                        {adminCount}
                      </p>
                    </div>
                    <div className="text-right min-w-0">
                      <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Staff
                      </span>
                      <p className="text-xl font-bold text-gray-900 dark:text-white truncate">
                        {staffCount}
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* ─── DESKTOP STATS ──────────────────────────── */}
          <div className="hidden lg:grid grid-cols-3 gap-4 mb-6">
            {isLoading
              ? [...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm"
                  >
                    <div className="h-2.5 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" />
                    <div className="h-7 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                  </div>
                ))
              : (
                <>
                  <StatCard
                    label="Total Members"
                    value={members.length}
                    icon={Users}
                  />
                  <StatCard
                    label="Admins"
                    value={adminCount}
                    icon={Shield}
                  />
                  <StatCard
                    label="Staff"
                    value={staffCount}
                    icon={UserCog}
                  />
                </>
              )}
          </div>

          {/* ─── Info banner ────────────────────────────── */}
          {!isLoading && (
            <div className="mb-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-3 flex items-start gap-2">
              <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700 dark:text-blue-300">
                <span className="font-semibold">Staff</span> can view and
                manage orders, inventory, and the station dashboard.{" "}
                <span className="font-semibold">Admins</span> can additionally
                manage team members and riders.
              </p>
            </div>
          )}

          {/* ─── Search ─────────────────────────────────── */}
          {!isLoading && members.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-3 mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search team by name, email, or phone..."
                  autoComplete="off"
                  className="w-full pl-9 pr-9 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-[#13ec5b]/50 focus:border-[#13ec5b] outline-none"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600"
                  >
                    <X className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ─── Members list ───────────────────────────── */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden lg:rounded-2xl rounded-2xl">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 truncate">
                {filtered.length}{" "}
                {filtered.length === 1 ? "Member" : "Members"}
                {search && (
                  <span className="text-xs font-normal text-gray-400 dark:text-gray-500 ml-2">
                    filtered from {members.length}
                  </span>
                )}
              </h2>
            </div>

            {isLoading ? (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 px-4 py-3 animate-pulse"
                  >
                    <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700" />
                    <div className="flex-1">
                      <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
                      <div className="h-3 w-40 bg-gray-200 dark:bg-gray-700 rounded mt-1" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">
                  {search
                    ? "No team members match your search"
                    : "No team members yet"}
                </p>
                {!search && isStationAdmin && (
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="mt-3 text-[#13ec5b] hover:underline text-sm font-medium"
                  >
                    Add your first team member
                  </button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {filtered.map((member) => (
                  <MemberRow
                    key={member._id}
                    member={member}
                    isSelf={String(member._id) === String(userInfo?._id)}
                    isStationAdmin={isStationAdmin}
                    onRemove={() => setConfirmRemove(member)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <StationBottombar />

      {showAddModal && (
        <AddMemberModal
          onClose={() => setShowAddModal(false)}
          onSaved={() => {
            setShowAddModal(false);
            refetch();
          }}
        />
      )}

      <ConfirmDialog
        open={!!confirmRemove}
        title="Remove team member?"
        message={
          confirmRemove
            ? `${confirmRemove.name || confirmRemove.email} will lose access to this station. They can be re-added later.`
            : ""
        }
        confirmLabel="Remove"
        danger
        loading={removing}
        onCancel={() => setConfirmRemove(null)}
        onConfirm={handleRemove}
      />
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
//  Stat Card
// ═══════════════════════════════════════════════════════════
const StatCard = ({ label, value, icon: Icon }) => (
  <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm min-w-0">
    <div className="flex items-center justify-between gap-2 min-w-0">
      <div className="min-w-0 flex-1">
        <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider truncate">
          {label}
        </p>
        <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1 truncate">
          {value}
        </p>
      </div>
      <div className="p-2 rounded-lg bg-[#13ec5b]/10 text-[#13ec5b] flex-shrink-0">
        <Icon className="h-5 w-5" />
      </div>
    </div>
  </div>
);

// ═══════════════════════════════════════════════════════════
//  Member Row
// ═══════════════════════════════════════════════════════════
const MemberRow = ({ member, isSelf, isStationAdmin, onRemove }) => {
  const isAdmin = member.stationRole === "admin";
  const canRemove = isStationAdmin && !isAdmin; // can't remove admins or self

  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition">
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
          isAdmin
            ? "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400"
            : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
        }`}
      >
        {isAdmin ? (
          <Shield className="h-5 w-5" />
        ) : (
          <User className="h-5 w-5" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
            {member.name || "Unknown"}
          </p>
          {isSelf && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-[#13ec5b]/10 text-[#0f9c46] dark:text-[#13ec5b]">
              You
            </span>
          )}
          <span
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
              isAdmin
                ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
            }`}
          >
            {isAdmin ? "Admin" : "Staff"}
          </span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-3 mt-0.5 text-xs text-gray-500 dark:text-gray-400 min-w-0">
          <span className="flex items-center gap-1 min-w-0">
            <Mail className="h-3 w-3 flex-shrink-0" />
            <span className="truncate" title={member.email}>
              {member.email}
            </span>
          </span>
          {member.phone && (
            <span className="flex items-center gap-1 min-w-0">
              <Phone className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{member.phone}</span>
            </span>
          )}
        </div>
      </div>

      {isStationAdmin && !isAdmin && (
        <button
          onClick={onRemove}
          className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition flex-shrink-0"
          title="Remove from team"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}

      {isStationAdmin && isAdmin && (
        <span
          className="p-2 text-gray-300 dark:text-gray-600 flex-shrink-0"
          title="The station admin cannot be removed"
        >
          <Shield className="h-4 w-4" />
        </span>
      )}
    </div>
  );
};

export default StationTeam;