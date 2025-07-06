// C:\Proyectos\Label\frontend\src\redux\productSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import productService from './productService';

// Async Thunk para buscar los productos. Esto maneja la lógica asíncrona.
export const fetchProducts = createAsyncThunk(
  'products/fetchAll',
  async (params = {}, thunkAPI) => {
    try {
      return await productService.getProducts(params);
    } catch (error) {
      const message =
        (error.response?.data?.message) || error.message || error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

const initialState = {
  products: [],
  pagination: {
    currentPage: 1,
    totalPages: 1,
    totalProducts: 0,
  },
  status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
  error: null,
};

export const productSlice = createSlice({
  name: 'products',
  initialState,
  reducers: {
    resetProducts: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProducts.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.products = action.payload.products;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });
  },
});

export const { resetProducts } = productSlice.actions;
export default productSlice.reducer;