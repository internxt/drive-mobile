import axios from 'axios';

import { HTTP_UNAUTHORIZED } from '../services/common/httpStatusCodes';
import { authThunks } from '../store/slices/auth';
import { AppPlugin } from '../types';

const axiosPlugin: AppPlugin = {
  install(store): void {
    axios.interceptors.response.use(undefined, (err) => {
      if (err.response) {
        if (err.response.status === HTTP_UNAUTHORIZED) {
          store.dispatch(authThunks.signOutThunk({ reason: 'unauthorized' }));
        }
      }

      return Promise.reject(err);
    });
  },
};

export default axiosPlugin;
