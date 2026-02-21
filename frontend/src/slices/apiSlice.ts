import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../store'; // ✅ adjust path if your store is elsewhere

const baseQuery = fetchBaseQuery({
  baseUrl: `${import.meta.env.VITE_API_URL ?? ''}/api`,
  credentials: 'include',
  prepareHeaders: (headers, { getState }) => {
    // ✅ getState() is typed as unknown in RTKQ, so we type it here
    const state = getState() as RootState;

    const token = state.auth?.userInfo?.token;

    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    return headers;
  },
});

export const apiSlice = createApi({
  reducerPath: 'api', // optional but good practice
  baseQuery,
  tagTypes: ['User', 'Blog'],
  endpoints: () => ({}), // ✅ removes unused 'builder' warning
});