import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/providers/AuthProvider';
import { ROUTES } from '@/constants/app.constants';

export function useLogout() {
  const { clearAuth } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useCallback(() => {
    clearAuth();
    queryClient.clear();
    navigate(ROUTES.LOGIN, { replace: true });
  }, [clearAuth, navigate, queryClient]);
}
