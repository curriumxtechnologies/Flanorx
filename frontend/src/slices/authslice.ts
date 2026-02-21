import { createSlice } from "@reduxjs/toolkit";

interface UserInfo {
  token: string;
  // add other fields if needed
}

interface AuthState {
  userInfo: UserInfo | null;
}

const storedUserInfo = localStorage.getItem("userInfo");

const initialState: AuthState = {
  userInfo: storedUserInfo ? JSON.parse(storedUserInfo) : null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCredentials: (state, action) => {
      state.userInfo = action.payload;
      localStorage.setItem("userInfo", JSON.stringify(action.payload));
    },

    logout: (state) => {
      state.userInfo = null;
      localStorage.removeItem("userInfo");
    },
  },
});

export const { setCredentials, logout } = authSlice.actions;

export default authSlice.reducer;