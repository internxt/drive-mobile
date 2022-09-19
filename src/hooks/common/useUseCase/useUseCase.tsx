import { NotificationType } from '../../../types';
import { useEffect, useState } from 'react';
import notificationsService from 'src/services/NotificationsService';
import { DisplayableError } from 'src/services/common/errors/base';

export type UseCaseResult<T, E = unknown> = {
  data: T | null;
  error: E | null;
  loading: boolean;
};

interface UseUseCaseConfig {
  lazy: boolean;
}

export function useUseCase<T, E = unknown>(
  useCase: () => Promise<T>,
  config?: UseUseCaseConfig,
): [T | null, boolean, E | null, () => Promise<void>] {
  const [state, setState] = useState<UseCaseResult<T, E>>({ data: null, error: null, loading: true });

  useEffect(() => {
    if (!config?.lazy) {
      (async () => {
        await executeUseCase();
      })();
    }
  }, []);

  const processError = (error: unknown) => {
    if (error instanceof DisplayableError) {
      notificationsService.show({
        text1: error.userFriendlyMessage,
        type: NotificationType.Error,
      });
    }
  };

  const resetState = () => {
    setState({ ...state, error: null });
  };

  const executeUseCase = async () => {
    if (state.data || state.error) {
      resetState();
    }

    useCase()
      .then((result) => {
        setState({
          ...state,
          data: result,
          loading: false,
        });
      })
      .catch((error) => {
        processError(error);
        setState({
          ...state,
          error,
          loading: false,
        });
      });
  };
  return [state.data, state.loading, state.error, executeUseCase];
}
