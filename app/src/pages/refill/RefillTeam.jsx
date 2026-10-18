// src/pages/refill/RefillTeam.jsx
import React, { useState, useEffect } from "react";
import {
  Users,
  Search,
  Plus,
  Trash2,
  Loader2,
  AlertCircle,
  X,
  UserCheck,
  Bike,
  Shield,
  Phone,
  Mail,
} from "lucide-react";

import { useGetProfileQuery } from "../../features/userApiSlice";
import {
  useGetRefillTeamQuery,
  useLazySearchUsersForRefillStationQuery,
  useAddRefillTeamMemberMutation,
  useRemoveRefillTeamMemberMutation,
} from "../../features/refillApiSlice";

import RefillSidebar from "../../components/refill/RefillSidebar";
import RefillBottombar from "../../components/refill/RefillBottombar";

const MAX_TEAM_MEMBERS = 20;

const getRoleBadge = (role) => {
  switch (role) {
    case "owner":
      return "bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400 border border-purple-200 dark:border-purple-800";
    case "staff":
      return "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 border border-blue-200 dark:border-blue-800";
    case "rider":
      return "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 border border-green-200 dark:border-green-800";
    default:
      return "bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-400 border border-gray-200 dark:border-gray-700";
  }
};

const RefillTeam = () => {
  const { data: profile } = useGetProfileQuery();
  const isOwner = profile?.refillStationRole === "owner";

  // State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [removeModal, setRemoveModal] = useState({ isOpen: false, member: null });
  
  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedRole, setSelectedRole] = useState("staff");

  // Queries
  const { data: team = [], isLoading, error, refetch } = useGetRefillTeamQuery();
  const [triggerSearch, { isFetching: isSearching }] = useLazySearchUsersForRefillStationQuery();

  // Mutations
  const [addMember, { isLoading: isAdding }] = useAddRefillTeamMemberMutation();
  const [removeMember, { isLoading: isRemoving }] = useRemoveRefillTeamMemberMutation();

  // Debounced search
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const results = await triggerSearch(searchQuery.trim()).unwrap();
        setSearchResults(results);
      } catch (err) {
        console.error("Search failed", err);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery, triggerSearch]);

  // Handlers
  const handleAddMember = async () => {
    if (!selectedUser) return;
    try {
      await addMember({ userId: selectedUser._id, role: selectedRole }).unwrap();
      setIsAddModalOpen(false);
      setSearchQuery("");
      setSelectedUser(null);
      setSearchResults([]);
      refetch();
    } catch (err) {
      alert(err.data?.message || "Failed to add team member");
    }
  };

  const handleRemoveMember = async () => {
    if (!removeModal.member) return;
    try {
      await removeMember(removeModal.member._id).unwrap();
      setRemoveModal({ isOpen: false, member: null });
      refetch();
    } catch (err) {
      alert(err.data?.message || "Failed to remove member");
    }
  };

  const openAddModal = () => {
    setSearchQuery("");
    setSelectedUser(null);
    setSearchResults([]);
    setSelectedRole("staff");
    setIsAddModalOpen(true);
  };

  // ─── Main Render ─────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <RefillSidebar />

      <div className="lg:ml-64 pb-20 lg:pb-8">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 lg:py-4 lg:px-6 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white lg:text-xl truncate">
              Team & Riders
            </h1>
            <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gray-500 bg-gray-100 dark:bg-gray-800 dark:text-gray-400 rounded">
              {team.length} / {MAX_TEAM_MEMBERS}
            </span>
          </div>
          {isOwner && (
            <button
              onClick={openAddModal}
              disabled={team.length >= MAX_TEAM_MEMBERS}
              className="flex items-center gap-1.5 bg-[#13ec5b] hover:bg-[#10d04e] text-white px-3 py-1.5 lg:px-4 lg:py-2 rounded-lg text-sm font-medium transition shadow-sm flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add Member</span>
              <span className="sm:hidden">Add</span>
            </button>
          )}
        </header>

        <div className="w-full px-2 sm:px-4 lg:px-6 py-4">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden lg:rounded-2xl rounded-2xl">
            {isLoading ? (
              <div className="p-8 text-center">
                <Loader2 className="h-8 w-8 text-[#13ec5b] animate-spin mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">Loading team...</p>
              </div>
            ) : error ? (
              <div className="p-8 text-center">
                <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-3" />
                <p className="text-red-600 dark:text-red-400">Failed to load team.</p>
                <button onClick={refetch} className="mt-3 text-[#13ec5b] hover:underline text-sm font-medium">
                  Try again
                </button>
              </div>
            ) : team.length === 0 ? (
              <div className="p-12 text-center">
                <Users className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400 font-medium">No team members yet</p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                  Add staff to help manage orders or riders to handle deliveries.
                </p>
                {isOwner && (
                  <button
                    onClick={openAddModal}
                    className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-[#13ec5b] text-white rounded-lg text-sm font-medium transition"
                  >
                    <Plus className="h-4 w-4" /> Add your first member
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full text-sm table-fixed">
                    <colgroup>
                      <col className="w-[30%]" />
                      <col className="w-[25%]" />
                      <col className="w-[20%]" />
                      <col className="w-[15%]" />
                      <col className="w-[10%]" />
                    </colgroup>
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                        <th className="text-left py-3 px-4 text-gray-500 dark:text-gray-400 font-medium">Name</th>
                        <th className="text-left py-3 px-4 text-gray-500 dark:text-gray-400 font-medium">Contact</th>
                        <th className="text-left py-3 px-4 text-gray-500 dark:text-gray-400 font-medium">Role</th>
                        <th className="text-left py-3 px-4 text-gray-500 dark:text-gray-400 font-medium">Joined</th>
                        <th className="text-right py-3 px-4 text-gray-500 dark:text-gray-400 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {team.map((member) => (
                        <tr
                          key={member._id}
                          className="border-b border-gray-100 dark:border-gray-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
                        >
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                                <span className="text-xs font-bold text-gray-600 dark:text-gray-300">
                                  {member.name?.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div className="truncate font-medium text-gray-900 dark:text-white">
                                {member.name}
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="truncate text-gray-600 dark:text-gray-300 flex items-center gap-1.5">
                              <Mail className="h-3.5 w-3.5 text-gray-400" />
                              {member.email}
                            </div>
                            {member.phone && (
                              <div className="truncate text-xs text-gray-500 mt-0.5 flex items-center gap-1.5">
                                <Phone className="h-3 w-3 text-gray-400" />
                                {member.phone}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium capitalize ${getRoleBadge(member.refillStationRole)}`}>
                              {member.refillStationRole === "owner" && <Shield className="h-3 w-3 mr-1" />}
                              {member.refillStationRole === "rider" && <Bike className="h-3 w-3 mr-1" />}
                              {member.refillStationRole}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-gray-500 dark:text-gray-400">
                            {new Date(member.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {isOwner && member.refillStationRole !== "owner" && (
                              <button
                                onClick={() => setRemoveModal({ isOpen: true, member })}
                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                                title="Remove member"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile List */}
                <div className="block lg:hidden divide-y divide-gray-100 dark:divide-gray-700">
                  {team.map((member) => (
                    <div key={member._id} className="p-4 flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-gray-900 dark:text-white truncate">
                            {member.name}
                          </p>
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium capitalize flex-shrink-0 ${getRoleBadge(member.refillStationRole)}`}>
                            {member.refillStationRole}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5 truncate">
                          <Mail className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{member.email}</span>
                        </p>
                        {member.phone && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5 truncate mt-0.5">
                            <Phone className="h-3 w-3 flex-shrink-0" />
                            <span>{member.phone}</span>
                          </p>
                        )}
                      </div>
                      {isOwner && member.refillStationRole !== "owner" && (
                        <button
                          onClick={() => setRemoveModal({ isOpen: true, member })}
                          className="p-2 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-lg flex-shrink-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <RefillBottombar />

      {/* ─── Add Member Modal ───────────────────────────────────── */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4">
          <div className="bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between flex-shrink-0">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                Add Team Member
              </h2>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5">
              {/* Search Input */}
              {!selectedUser ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Search by name or email
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Type at least 2 characters..."
                      className="w-full pl-9 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-[#13ec5b]/50 focus:border-transparent"
                      autoFocus
                    />
                    {isSearching && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#13ec5b] animate-spin" />
                    )}
                  </div>

                  {/* Search Results */}
                  {searchQuery.length >= 2 && !isSearching && (
                    <div className="mt-3 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden max-h-56 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
                      {searchResults.length === 0 ? (
                        <div className="p-4 text-center text-sm text-gray-500">
                          No users found matching "{searchQuery}"
                        </div>
                      ) : (
                        searchResults.map((user) => (
                          <button
                            key={user._id}
                            onClick={() => setSelectedUser(user)}
                            className="w-full text-left p-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition flex items-center gap-3"
                          >
                            <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                              <span className="text-xs font-bold text-gray-600 dark:text-gray-300">
                                {user.name?.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                {user.name}
                              </p>
                              <p className="text-xs text-gray-500 truncate">{user.email}</p>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              ) : (
                /* Selected User & Role Selection */
                <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-200">
                  <div className="flex items-center justify-between p-3 bg-[#13ec5b]/10 border border-[#13ec5b]/20 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#13ec5b] flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-bold text-white">
                          {selectedUser.name?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">
                          {selectedUser.name}
                        </p>
                        <p className="text-xs text-gray-500">{selectedUser.email}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedUser(null)}
                      className="text-xs font-medium text-red-500 hover:underline"
                    >
                      Change
                    </button>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Assign Role
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setSelectedRole("staff")}
                        className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition text-center gap-2 ${
                          selectedRole === "staff"
                            ? "border-[#13ec5b] bg-[#13ec5b]/10 text-[#13ec5b]"
                            : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-600 dark:text-gray-400"
                        }`}
                      >
                        <UserCheck className="h-6 w-6" />
                        <div>
                          <p className="text-sm font-bold">Staff</p>
                          <p className="text-[10px] opacity-80 mt-0.5">Can accept & manage orders</p>
                        </div>
                      </button>
                      <button
                        onClick={() => setSelectedRole("rider")}
                        className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition text-center gap-2 ${
                          selectedRole === "rider"
                            ? "border-[#13ec5b] bg-[#13ec5b]/10 text-[#13ec5b]"
                            : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-600 dark:text-gray-400"
                        }`}
                      >
                        <Bike className="h-6 w-6" />
                        <div>
                          <p className="text-sm font-bold">Rider</p>
                          <p className="text-[10px] opacity-80 mt-0.5">Can be assigned to deliver</p>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex gap-3 flex-shrink-0">
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={handleAddMember}
                disabled={!selectedUser || isAdding}
                className="flex-1 py-2.5 bg-[#13ec5b] hover:bg-[#10d04e] text-white text-sm font-medium rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isAdding && <Loader2 className="h-4 w-4 animate-spin" />}
                Add to Team
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Remove Confirmation Modal ──────────────────────────── */}
      {removeModal.isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-sm shadow-2xl text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
              Remove {removeModal.member?.name}?
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              They will lose access to the station dashboard and won't be able to receive deliveries.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setRemoveModal({ isOpen: false, member: null })}
                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={handleRemoveMember}
                disabled={isRemoving}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isRemoving && <Loader2 className="h-4 w-4 animate-spin" />}
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RefillTeam;