import { DisplayableError } from '@internxt-mobile/services/common';
import notificationsService from '@internxt-mobile/services/NotificationsService';
import { useEffect, useState } from 'react';
import { NotificationType } from '../../../types';

export type UseCaseResult<TData, TError = unknown> = {
  data: TData | null;
  error: TError | null;
  loading: boolean;
};

interface UseUseCaseConfig<TParams> {
  // Enable if you want to trigger the use case on demand
  lazy?: boolean;
  // Params that will be injected into the useCase function
  params?: TParams;
}
export enum UseCaseStatus {
  IDLE,
  SUCCESS,
  LOADING,
}
type ReExecutor<TParams, TData> = (() => Promise<TData | null>) | ((params?: TParams) => Promise<TData | null>);
// eslint-disable-next-line @typescript-eslint/ban-types
export function useUseCase<TData, TParams = undefined, TError = unknown>(
  useCase: (params: TParams) => Promise<TData>,
  config?: UseUseCaseConfig<TParams>,
): {
  data: TData | null;
  loading: boolean;
  error: TError | null;
  executeUseCase: ReExecutor<TParams, TData>;
  resetUseCase: () => void;
} {
  const [loading, setLoading] = useState(false);
  const [state, setState] = useState<{ data: TData | null; error: TError | null }>({ data: null, error: null });

  // Triggers the useCase on initial render, pass config.lazy: true to disable this
  useEffect(() => {
    if (!config?.lazy) {
      (async () => {
        await executeUseCase(config?.params as TParams);
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

  /**
   * Executes the use case function provided, if params are given, they will be injected
   * into the useCase function, the result or error will be stored into the state.
   * @param params Params injected from the config
   */
  const executeUseCase = async (params: TParams) => {
    if (state.data || state.error) {
      resetState();
    }
    setLoading(true);

    try {
      const result = await useCase(params);
      setState({
        ...state,
        data: result,
      });
      setLoading(false);
      return result;
    } catch (error) {
      processError(error);
      setState({
        ...state,
        error: error as TError,
      });
      setLoading(false);
      return null;
    }
  };

  return {
    data: state.data,
    loading,
    error: state.error,
    executeUseCase: executeUseCase as ReExecutor<TParams, TData>,
    resetUseCase: () => {
      setLoading(false);
      setState({ error: null, data: null });
    },
  };
}
