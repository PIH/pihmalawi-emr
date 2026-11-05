import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ArtField } from './art-fields';
import { ArtFieldInput } from './fields';

describe('ArtFieldInput', () => {
  it('a coded checkbox saves its one answer', async () => {
    const field: ArtField = { name: 'pregnant', concept: 'c-preg', kind: 'coded', label: 'Pregnant?', checkbox: true, options: [{ value: 'ans-1', label: 'Yes' }] };
    const onChange = vi.fn();
    const { rerender } = render(<ArtFieldInput field={field} value={null} onChange={onChange} />);
    await userEvent.click(screen.getByLabelText('Pregnant?'));
    expect(onChange).toHaveBeenLastCalledWith('ans-1');
    rerender(<ArtFieldInput field={field} value="ans-1" onChange={onChange} />);
    expect(screen.getByLabelText('Pregnant?')).toBeChecked();
    await userEvent.click(screen.getByLabelText('Pregnant?'));
    expect(onChange).toHaveBeenLastCalledWith(null);
  });
});
