import { createSlice, PayloadAction } from "@reduxjs/toolkit";

/* Define what userInfo looks like */
interface UserInfo {
  token: string;
  // add other fields if you have them (name, email, etc)
}

interface AuthState {
  userInfo: UserInfo | null;
}

/* Safe localStorage parsing */
const storedUserInfo = localStorage.getItem("userInfo");

const initialState: AuthState = {
  userInfo: storedUserInfo ? JSON.parse(storedUserInfo) : null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    // ✅ Set Credentials
    setCredentials: (state, action: PayloadAction<UserInfo>) => {
      state.userInfo = action.payload;
      localStorage.setItem("userInfo", JSON.stringify(action.payload));
    },

    // ✅ Logout (removed unused action)
    logout: (state) => {
      state.userInfo = null;
      localStorage.removeItem("userInfo");
    },
  },
});

export const { setCredentials, logout } = authSlice.actions;

export default authSlice.reducer;