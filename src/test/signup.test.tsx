import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';

const { signIn, rpc, navigate } = vi.hoisted(() => ({ signIn: vi.fn(), rpc: vi.fn(), navigate: vi.fn() }));
vi.mock('@tanstack/react-router', () => ({ createFileRoute: () => (o: unknown) => o, useNavigate: () => navigate }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc, auth: {
  getSession: vi.fn().mockResolvedValue({ data: { session: null } }), signInWithPassword: signIn,
} } }));
vi.mock('@/integrations/lovable/index', () => ({ lovable: {} }));
vi.mock('@/components/team-brand', () => ({ TeamBrand: () => null }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
import { Route } from '@/routes/auth';

async function login(isAdmin: boolean) {
  navigate.mockClear();
  signIn.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
  rpc.mockResolvedValue({ data: isAdmin, error: null });
  const C = (Route as unknown as { component: React.ComponentType }).component;
  const { unmount } = render(<C />);
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'a@example.com' } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret12' } });
  fireEvent.submit(screen.getByRole('button', { name: 'Login' }).closest('form') as HTMLFormElement);
  await waitFor(() => expect(navigate).toHaveBeenCalled());
  unmount();
  return navigate.mock.calls[0]?.[0];
}

it('sends the admin straight to the admin dashboard', async () => {
  expect(await login(true)).toEqual({ to: '/admin' });
});
it('sends ordinary accounts to their leads', async () => {
  expect(await login(false)).toEqual({ to: '/leads' });
});
