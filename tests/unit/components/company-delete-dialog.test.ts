import { describe, expect, it } from 'vitest';

import { deleteWarningText } from '@/components/companies/company-delete-dialog';

describe('deleteWarningText', () => {
  it('shows generic warning when there are no applications', () => {
    expect(deleteWarningText(0)).toBe('This action cannot be undone.');
  });

  it('shows application count in warning for 1 application', () => {
    expect(deleteWarningText(1)).toBe(
      'Deleting this company will also delete its 1 application(s). This cannot be undone.',
    );
  });

  it('shows application count in warning for 2 applications', () => {
    expect(deleteWarningText(2)).toBe(
      'Deleting this company will also delete its 2 application(s). This cannot be undone.',
    );
  });
});
