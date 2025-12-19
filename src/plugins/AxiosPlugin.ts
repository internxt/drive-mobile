import axios from 'axios';

import { authThunks } from '../store/slices/auth';
import { AppPlugin } from '../types';

const axiosPlugin: AppPlugin = {
  install(store): void {
    axios.interceptors.response.use(undefined, (err) => {
      if (err.response) {
        if (err.response.status === 401) {
          store.dispatch(authThunks.signOutThunk({ reason: 'unauthorized' }));
        }
      }

      return Promise.reject(err);
    });
  },
};

export default axiosPlugin;
