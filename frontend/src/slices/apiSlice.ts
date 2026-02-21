import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const baseQuery = fetchBaseQuery({
  baseUrl: `${import.meta.env.VITE_API_URL || ''}/api`,
  credentials: 'include',
  prepareHeaders: (headers, { getState }) => {
    const token = getState().auth.userInfo?.token; // 👈 get token from redux

    if (token) {
      headers.set('Authorization', `Bearer ${token}`); // 👈 attach token
    }

    return headers;
  },
});

export const apiSlice = createApi({
  baseQuery,
  tagTypes: ['User', 'Blog'],
  endpoints: (builder) => ({}),
});
