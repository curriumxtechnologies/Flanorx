import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import {
  Users,
  Filter,
  X,
  Search,
  RefreshCw,
  ChevronDown,
  Eye,
  UserCheck,
  UserX,
  AlertCircle,
  CheckCircle,
  Clock,
  Shield,
  Trash2,
} from "lucide-react";
import { useSelector } from "react-redux";
import {
  useGetAllUsersQuery,
  useUpdateUserRoleMutation,
  useDeleteUserMutation,
} from "../../features/adminApiSlice";
import AdminSidebar from "../../components/admin/Sidebar";
import AdminBottombar from "../../components/admin/Bottombar";

const AdminUsers = () => {
  const navigate = useNavigate();
  const { userInfo } = useSelector((state) => state.auth);

  // ─── Filters state ─────────────────────────────────────────
  const [filters, setFilters] = useState({
    role: "",
    isVerified: "",
    search: "",
  });
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // ─── Queries & Mutations ──────────────────────────────────
  const {
    data: users = [],
    isLoading,
    error,
    refetch,
  } = useGetAllUsersQuery({
    role: filters.role || undefined,
    isVerified: filters.isVerified === "" ? undefined : filters.isVerified === "verified",
    search: filters.search || undefined,
  });

  const [updateUserRole, { isLoading: updateLoading }] = useUpdateUserRoleMutation();
  const [deleteUser, { isLoading: deleteLoading }] = useDeleteUserMutation();

  // ─── Filter options ────────────────────────────────────────
  const roleOptions = [
    { value: "", label: "All Roles" },
    { value: "user", label: "User" },
    { value: "rider", label: "Rider" },
    { value: "admin", label: "Admin" },
  ];

  const verificationOptions = [
    { value: "", label: "All" },
    { value: "verified", label: "Verified" },
    { value: "unverified", label: "Unverified" },
  ];

  // ─── Filter handlers ──────────────────────────────────────
  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      role: "",
      isVerified: "",
      search: "",
    });
  };

  // ─── Role update handler ──────────────────────────────────
  const handleRoleUpdate = async (userId, newRole) => {
    try {
      await updateUserRole({ id: userId, role: newRole }).unwrap();
      refetch();
      // If the modal is open for this user, update the selected user data
      if (selectedUser && selectedUser._id === userId) {
        const updated = users.find((u) => u._id === userId);
        if (updated) setSelectedUser(updated);
      }
    } catch (err) {
      alert(err.data?.message || "Failed to update user role");
    }
  };

  // ─── Delete handler ──────────────────────────────────────
  const handleDeleteUser = async (userId) => {
    if (!window.confirm("Are you sure you want to delete this user? This action cannot be undone.")) return;
    try {
      await deleteUser(userId).unwrap();
      refetch();
      setSelectedUser(null);
    } catch (err) {
      alert(err.data?.message || "Failed to delete user");
    }
  };

  // ─── Status/role colors ──────────────────────────────────
  const getRoleBadgeColor = (role) => {
    switch (role) {
      case "admin":
        return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300";
      case "rider":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300";
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  const getVerificationBadgeColor = (isVerified) => {
    return isVerified
      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
      : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300";
  };

  // ─── Custom Dropdown ─────────────────────────────────────
  const CustomDropdown = ({ value, options, onChange, placeholder, className = "" }) => {
    const [isOpen, setIsOpen] = useState(false);
    const ref = React.useRef(null);

    React.useEffect(() => {
      const handler = (e) => {
        if (ref.current && !ref.current.contains(e.target)) setIsOpen(false);
      };
      document.addEventListener("mousedown", handler);
      return () => document.removeEventListener("mousedown", handler);
    }, []);

    const selected = options.find((opt) => opt.value === value);
    const display = selected ? selected.label : placeholder;

    return (
      <div className={`relative ${className}`} ref={ref}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-[#13ec5b]/50"
        >
          <span>{display}</span>
          <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </button>
        {isOpen && (
          <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-20 max-h-60 overflow-auto py-1">
            {options.map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition ${
                  opt.value === value
                    ? "bg-[#13ec5b]/10 text-[#13ec5b]"
                    : "text-gray-700 dark:text-gray-300"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  // ─── Desktop FilterDropdown ──────────────────────────────
  const FilterDropdown = ({ label, value, options, onSelect }) => {
    const [isOpen, setIsOpen] = useState(false);
    const ref = React.useRef(null);

    React.useEffect(() => {
      const handler = (e) => {
        if (ref.current && !ref.current.contains(e.target)) setIsOpen(false);
      };
      document.addEventListener("mousedown", handler);
      return () => document.removeEventListener("mousedown", handler);
    }, []);

    const selected = options.find((opt) => opt.value === value);
    const display = selected ? selected.label : label;

    return (
      <div className="relative" ref={ref}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition min-w-[140px] justify-between"
        >
          <span>{display}</span>
          <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </button>
        {isOpen && (
          <div className="absolute top-full left-0 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-20 max-h-60 overflow-auto py-1">
            {options.map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  onSelect(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition ${
                  opt.value === value
                    ? "bg-[#13ec5b]/10 text-[#13ec5b]"
                    : "text-gray-700 dark:text-gray-300"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  // ─── Filter Sheet (mobile) ──────────────────────────────
  const FilterSheet = () => (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm"
      onClick={() => setShowFilterSheet(false)}
    >
      <div
        className="bg-white dark:bg-gray-900 w-full max-w-full p-6 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Filter Users</h3>
          <button
            onClick={() => setShowFilterSheet(false)}
            className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Role
            </label>
            <div className="flex flex-wrap gap-2">
              {roleOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleFilterChange("role", opt.value)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                    filters.role === opt.value
                      ? "bg-[#13ec5b] text-white"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Verification
            </label>
            <div className="flex flex-wrap gap-2">
              {verificationOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleFilterChange("isVerified", opt.value)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                    filters.isVerified === opt.value
                      ? "bg-[#13ec5b] text-white"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Search
            </label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => handleFilterChange("search", e.target.value)}
              placeholder="Name or email..."
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-[#13ec5b]/50 text-sm"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => {
                clearFilters();
                setShowFilterSheet(false);
              }}
              className="flex-1 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium"
            >
              Clear All
            </button>
            <button
              onClick={() => setShowFilterSheet(false)}
              className="flex-1 py-2.5 bg-[#13ec5b] text-white rounded-lg font-medium"
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // ─── Detail Modal ────────────────────────────────────────
  const DetailModal = () => {
    if (!selectedUser) return null;

    const user = selectedUser;
    const [localRole, setLocalRole] = useState(user.role || "user");

    const handleRoleChange = (val) => {
      setLocalRole(val);
      handleRoleUpdate(user._id, val);
    };

    return (
      <div
        className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm"
        onClick={() => setSelectedUser(null)}
      >
        <div
          className="bg-white dark:bg-gray-900 w-full max-w-full p-6 max-h-[85vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              {user.name || "User"}
            </h3>
            <button
              onClick={() => setSelectedUser(null)}
              className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-xs">Email</p>
                <p className="text-gray-900 dark:text-white">{user.email || "—"}</p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-xs">Phone</p>
                <p className="text-gray-900 dark:text-white">{user.phone || "—"}</p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-xs">Role</p>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(
                    user.role
                  )}`}
                >
                  {user.role || "user"}
                </span>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-xs">Verified</p>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getVerificationBadgeColor(
                    user.isVerified
                  )}`}
                >
                  {user.isVerified ? "Verified" : "Unverified"}
                </span>
              </div>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
              <p className="text-gray-500 dark:text-gray-400 text-xs mb-1">Update Role</p>
              <CustomDropdown
                value={localRole}
                options={roleOptions.filter((opt) => opt.value !== "")}
                onChange={handleRoleChange}
                placeholder="Select role"
                disabled={updateLoading}
              />
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
              <button
                onClick={() => handleDeleteUser(user._id)}
                disabled={deleteLoading}
                className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition flex items-center justify-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                {deleteLoading ? "Deleting..." : "Delete User"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ─── Mobile Slim List Item ──────────────────────────────
  const SlimUserItem = ({ user }) => (
    <div
      onClick={() => setSelectedUser(user)}
      className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 active:bg-gray-100 dark:active:bg-gray-600 cursor-pointer transition"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900 dark:text-white text-sm truncate">
            {user.name || "Unknown"}
          </span>
          <span
            className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${getRoleBadgeColor(
              user.role
            )}`}
          >
            {user.role || "user"}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {user.email || ""}
          </span>
          <span
            className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${getVerificationBadgeColor(
              user.isVerified
            )}`}
          >
            {user.isVerified ? "✓" : "✗"}
          </span>
        </div>
      </div>
      <ChevronDown className="h-4 w-4 text-gray-400 rotate-[-90deg] flex-shrink-0 ml-2" />
    </div>
  );

  // ─── Main render ──────────────────────────────────────────
  const isModalOpen = !!selectedUser || showFilterSheet;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <AdminSidebar />

      <div className="lg:ml-64 pb-20 lg:pb-8">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 lg:py-4 lg:px-6 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white lg:text-xl">
            Users
          </h1>
          <div className="flex items-center gap-3">
            <button
              onClick={() => refetch()}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
            >
              <RefreshCw className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            </button>
            <button
              onClick={() => setShowFilterSheet(true)}
              className="lg:hidden flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300"
            >
              <Filter className="h-4 w-4" />
              Filters
            </button>
          </div>
        </header>

        <div className="w-full px-0 sm:px-4 lg:px-6 py-4">
          {/* Desktop filters */}
          <div className="hidden lg:flex flex-wrap items-center gap-3 mb-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
            <FilterDropdown
              label="Role"
              value={filters.role}
              options={roleOptions}
              onSelect={(v) => handleFilterChange("role", v)}
            />
            <FilterDropdown
              label="Verification"
              value={filters.isVerified}
              options={verificationOptions}
              onSelect={(v) => handleFilterChange("isVerified", v)}
            />
            <div className="flex-1 min-w-[150px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => handleFilterChange("search", e.target.value)}
                  placeholder="Search users..."
                  className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-[#13ec5b]/50"
                />
              </div>
            </div>
            <button
              onClick={clearFilters}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition text-sm font-medium"
            >
              Clear
            </button>
          </div>

          {/* Users display */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden lg:rounded-2xl">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                {users.length} {users.length === 1 ? "User" : "Users"} found
              </h2>
            </div>

            {isLoading ? (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4 px-4 py-3 animate-pulse">
                    <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-700" />
                    <div className="flex-1">
                      <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
                      <div className="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded mt-1" />
                    </div>
                    <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded-full" />
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-8 text-red-500 dark:text-red-400">
                <AlertCircle className="h-12 w-12 mx-auto mb-2" />
                Failed to load users. Please try again.
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">No users found</p>
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                        <th className="text-left py-2.5 px-3 text-gray-500 dark:text-gray-400 font-medium">
                          Name
                        </th>
                        <th className="text-left py-2.5 px-3 text-gray-500 dark:text-gray-400 font-medium">
                          Email
                        </th>
                        <th className="text-left py-2.5 px-3 text-gray-500 dark:text-gray-400 font-medium">
                          Role
                        </th>
                        <th className="text-left py-2.5 px-3 text-gray-500 dark:text-gray-400 font-medium">
                          Verified
                        </th>
                        <th className="text-left py-2.5 px-3 text-gray-500 dark:text-gray-400 font-medium">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <tr
                          key={user._id}
                          className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
                        >
                          <td className="py-2.5 px-3 font-medium text-gray-900 dark:text-white">
                            {user.name || "Unknown"}
                          </td>
                          <td className="py-2.5 px-3 text-gray-600 dark:text-gray-300">
                            {user.email || "—"}
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(
                                user.role
                              )}`}
                            >
                              {user.role || "user"}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getVerificationBadgeColor(
                                user.isVerified
                              )}`}
                            >
                              {user.isVerified ? "Verified" : "Unverified"}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setSelectedUser(user)}
                                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                                title="View details"
                              >
                                <Eye className="h-4 w-4 text-gray-400" />
                              </button>
                              <select
                                value={user.role || "user"}
                                onChange={(e) =>
                                  handleRoleUpdate(user._id, e.target.value)
                                }
                                disabled={updateLoading}
                                className="text-xs border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-[#13ec5b]/50"
                              >
                                {roleOptions
                                  .filter((opt) => opt.value !== "")
                                  .map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                      {opt.label}
                                    </option>
                                  ))}
                              </select>
                              <button
                                onClick={() => handleDeleteUser(user._id)}
                                disabled={deleteLoading}
                                className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition text-red-500"
                                title="Delete user"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Slim List */}
                <div className="block lg:hidden divide-y divide-gray-100 dark:divide-gray-700">
                  {users.map((user) => (
                    <SlimUserItem key={user._id} user={user} />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Bottom bar - hidden when modal open */}
      {!isModalOpen && <AdminBottombar />}

      {/* Modals */}
      {showFilterSheet && <FilterSheet />}
      {selectedUser && <DetailModal />}
    </div>
  );
};

export default AdminUsers;