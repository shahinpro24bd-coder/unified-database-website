import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { DEFAULT_LEAD_VIEW, LeadStatus } from '@/components/lead-status';
afterEach(cleanup);
it('starts the workspace on active leads', () => {
  expect(DEFAULT_LEAD_VIEW).toBe('active');
});
it('tick explicitly marks the lead verified', () => {
  const onChange = vi.fn();
  render(<LeadStatus verified={false} pending={false} onChange={onChange} />);
  fireEvent.click(screen.getByRole('button', { name: 'Mark as verified' }));
  expect(onChange).toHaveBeenCalledWith(true);
});
it('cross explicitly marks the lead not verified', () => {
  const onChange = vi.fn();
  render(<LeadStatus verified={true} pending={false} onChange={onChange} />);
  fireEvent.click(screen.getByRole('button', { name: 'Mark as not verified' }));
  expect(onChange).toHaveBeenCalledWith(false);
});