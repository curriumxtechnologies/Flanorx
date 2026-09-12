// src/utils/logoutBtn.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router";
import { useDispatch } from "react-redux";
import { LogOut, Loader2 } from "lucide-react";
import { logout } from "../features/auth/authSlice";
import { apiSlice } from "../features/apiSlice";
import { useUnregisterDeviceTokenMutation } from "../features/notificationApiSlice";
import { getCachedPushToken, clearCachedPushToken } from "./pushManager";

// ═══════════════════════════════════════════════════════════
//  useLogout — the full logout pipeline as a hook
//
//  Order of operations:
//    1. Unregister the FCM token from the backend (best-effort)
//    2. Clear the cached token from localStorage
//    3. Dispatch the auth logout — wipes userInfo + JWT cookie
//    4. Reset the entire RTK Query cache so no data leaks to
//       the next user on a shared device
//    5. Navigate to /login with replace (no back-button return)
//
//  Use this hook when you need to trigger logout from your
//  own custom button — the <LogoutButton /> component below
//  is a styled wrapper around this same hook.
// ═══════════════════════════════════════════════════════════
export const useLogout = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [unregisterDevice] = useUnregisterDeviceTokenMutation();
  const [loggingOut, setLoggingOut] = useState(false);

  const performLogout = async () => {
    if (loggingOut) return; // guard against double-clicks
    setLoggingOut(true);

    // 1 + 2. Push token cleanup — never blocks the logout
    try {
      const token = getCachedPushToken();
      if (token) {
        await unregisterDevice({ token }).catch(() => {});
        clearCachedPushToken();
      }
    } catch {
      // non-fatal — continue with logout
    }

    // 3. Clear auth
    dispatch(logout());

    // 4. Wipe every cached query/mutation from RTK Query
    dispatch(apiSlice.util.resetApiState());

    // 5. Send them out
    navigate("/login", { replace: true });

    setLoggingOut(false);
  };

  return { performLogout, loggingOut };
};

// ═══════════════════════════════════════════════════════════
//  LogoutButton — drop-in component
//
//  Props:
//    className        — your styling for the button element
//    label            — text (default "Logout")
//    showIcon         — include the LogOut icon (default true)
//    showSpinner      — swap icon for a spinner while logging out
//    children         — full custom content (overrides icon + label)
//    onBeforeLogout   — async fn called before logout runs
//    onAfterLogout    — fn called after navigation
//
//  If you pass `children`, they render inside the button
//  instead of the default icon + label.
// ═══════════════════════════════════════════════════════════
const LogoutButton = ({
  className = "",
  children,
  showIcon = true,
  showSpinner = true,
  label = "Logout",
  onBeforeLogout,
  onAfterLogout,
}) => {
  const { performLogout, loggingOut } = useLogout();

  const handleClick = async () => {
    if (onBeforeLogout) {
      try {
        await onBeforeLogout();
      } catch {
        // ignore — proceed with logout anyway
      }
    }

    await performLogout();

    if (onAfterLogout) onAfterLogout();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loggingOut}
      className={className}
    >
      {children ? (
        children
      ) : (
        <>
          {showIcon &&
            (loggingOut && showSpinner ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <LogOut className="h-5 w-5" />
            ))}
          <span>{loggingOut ? "Logging out..." : label}</span>
        </>
      )}
    </button>
  );
};

export default LogoutButton;