import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';

const mocks = vi.hoisted(() => ({ save: vi.fn(), classify: vi.fn(), toast: vi.fn(), reports: [] }));
vi.mock('../src/context/AppContext', () => ({ useApp: () => ({
  currentUser: { id: 'member', fullName: 'Test' }, isCore: true, isSuperAdmin: false,
  addReport: mocks.save, updateReport: vi.fn(), deleteReport: vi.fn(), approveReport: vi.fn(),
  getMemberById: () => null, requireGoogleAuth: vi.fn(), toast: mocks.toast,
}) }));
vi.mock('../src/hooks/useDomainQueries', () => ({ useReports: () => ({ data: mocks.reports }) }));
vi.mock('../src/services/aiService', () => ({ classifyReport: mocks.classify, reviewReport: vi.fn(), groupReportsByTopic: vi.fn() }));
import Reports from '../src/pages/Reports';

beforeEach(() => { mocks.save.mockReset(); mocks.classify.mockReset(); });
afterEach(cleanup);
function form() {
  render(<Reports />);
  fireEvent.click(screen.getByRole('button', { name: 'Thêm tài liệu' }));
  fireEvent.change(screen.getByPlaceholderText('VD: Báo cáo seminar màng mỏng ALD...'), { target: { value: 'Báo cáo ALD' } });
  fireEvent.change(screen.getByPlaceholderText('https://docs.google.com/...'), { target: { value: 'https://example.com/report' } });
}
it('shows the real classification failure without inventing an AI suggestion', async () => {
  mocks.classify.mockRejectedValue(new Error('Máy chủ chưa cấu hình DEEPSEEK_API_KEY.'));
  form(); fireEvent.click(screen.getByRole('button', { name: 'AI Tự động phân loại' }));
  await screen.findByText('Máy chủ chưa cấu hình DEEPSEEK_API_KEY.');
  expect(screen.queryByText(/% tin cậy/)).toBeNull(); expect(mocks.save).not.toHaveBeenCalled();
});
it('keeps user input and upload link when Firebase rejects saving', async () => {
  mocks.save.mockResolvedValue(false);
  form(); fireEvent.click(screen.getByRole('button', { name: /Đăng tài liệu/ }));
  await screen.findByText(/Chưa lưu được báo cáo/);
  expect((screen.getByPlaceholderText('VD: Báo cáo seminar màng mỏng ALD...') as HTMLInputElement).value).toBe('Báo cáo ALD');
  expect((screen.getByPlaceholderText('https://docs.google.com/...') as HTMLInputElement).value).toBe('https://example.com/report');
});
it('saves classification metadata only after the user submits the report', async () => {
  mocks.classify.mockResolvedValue({ type: 'research', typeName: 'Báo cáo nghiên cứu', confidence: 83, tags: ['ALD'], reason: 'Thí nghiệm', source: 'deepseek' });
  mocks.save.mockResolvedValue({ id: 'new' });
  form(); fireEvent.change(screen.getByLabelText('Mô tả hoặc trích đoạn cho DeepSeek'), { target: { value: 'Thí nghiệm lắng đọng ALD' } });
  fireEvent.click(screen.getByRole('button', { name: 'AI Tự động phân loại' }));
  await screen.findByText('83% tin cậy'); expect(mocks.save).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: /Đăng tài liệu/ }));
  await waitFor(() => expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({ title: 'Báo cáo ALD', description: 'Thí nghiệm lắng đọng ALD', type: 'research', classification: expect.objectContaining({ source: 'deepseek', confidence: 83 }) })));
});
