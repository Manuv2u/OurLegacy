import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { PersonCardView } from '@/features/family-tree/PersonCardView';
import { pickVariant } from '@/features/family-tree/PortraitArt';
import LandingPage from '@/features/landing/LandingPage';
import { PersonDialog } from '@/features/people/PersonDialog';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useEditorStore } from '@/stores/editorStore';
import { useUiStore } from '@/stores/uiStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { createEmptyTree } from '@/lib/trees';
import { createSampleTree } from '@/features/family-tree/sampleTree';
import type { Person } from '@/types/family';

const person = (over: Partial<Person> = {}): Person => ({ id: 'p1', firstName: 'Suresh', lastName: 'Rao', createdAt: '', updatedAt: '', ...over });

beforeEach(() => {
  useSettingsStore.setState({ locale: 'en', nameOrder: 'given-first' });
  useUiStore.setState({ dialog: null });
});

describe('PersonCardView', () => {
  it('shows initials, name and life years', () => {
    render(<PersonCardView person={person({ birthDate: '1958', deathDate: '2020' })} />);
    expect(screen.getByText('Suresh Rao')).toBeInTheDocument();
    expect(screen.getByText('1958 – 2020')).toBeInTheDocument();
    expect(screen.getByText('SR')).toBeInTheDocument();
  });

  it('shows a photo when there is one, with an accessible label', () => {
    render(<PersonCardView person={person({ photo: 'data:image/jpeg;base64,AAAA' })} />);
    expect(screen.getByRole('img', { name: 'Photo of Suresh Rao' })).toBeInTheDocument();
  });

  it('renders Kannada names and localised life labels', () => {
    useSettingsStore.setState({ locale: 'kn' });
    render(<PersonCardView person={person({ firstName: 'ಸುರೇಶ್', lastName: 'ರಾವ್', birthDate: '1958' })} />);
    expect(screen.getByText('ಸುರೇಶ್ ರಾವ್')).toBeInTheDocument();
    expect(screen.getByText('ಜ. 1958')).toBeInTheDocument();
  });

  it('respects family-name-first ordering', () => {
    useSettingsStore.setState({ nameOrder: 'family-first' });
    render(<PersonCardView person={person()} />);
    expect(screen.getByText('Rao Suresh')).toBeInTheDocument();
  });
});

describe('gender picture', () => {
  it('shows an accessible male/female picture instead of initials when there is no photo and gender is known', () => {
    const { container, rerender } = render(<PersonCardView person={person({ gender: 'male' })} />);
    expect(container.querySelector('[data-gender="male"]')).toBeInTheDocument();
    expect(screen.getByText('Male')).toBeInTheDocument();
    rerender(<PersonCardView person={person({ gender: 'female' })} />);
    expect(container.querySelector('[data-gender="female"]')).toBeInTheDocument();
    rerender(<PersonCardView person={person({ gender: 'other' })} />);
    expect(container.querySelector('[data-gender]')).toBeNull();
    expect(screen.getByText('SR')).toBeInTheDocument(); // falls back to initials
    rerender(<PersonCardView person={person({ gender: 'male', photo: 'data:image/jpeg;base64,AAAA' })} />);
    expect(container.querySelector('[data-gender]')).toBeNull(); // a real photo wins
  });
});

describe('living / deceased', () => {
  it('colour-codes cards and words the life span for people marked deceased without dates', () => {
    const { container, rerender } = render(<PersonCardView person={person({ birthDate: '1950' })} />);
    expect(container.querySelector('[data-status]')).toHaveAttribute('data-status', 'living');
    expect(screen.getByText('b. 1950')).toBeInTheDocument();
    rerender(<PersonCardView person={person({ birthDate: '1950', isDeceased: true })} />);
    expect(container.querySelector('[data-status]')).toHaveAttribute('data-status', 'deceased');
    expect(screen.getByText('1950 – ?')).toBeInTheDocument();
    rerender(<PersonCardView person={person({ isDeceased: true })} />);
    expect(screen.getByText('Deceased')).toBeInTheDocument();
    rerender(<PersonCardView person={person({ deathDate: '2001' })} />);
    expect(container.querySelector('[data-status]')).toHaveAttribute('data-status', 'deceased');
  });

  it('is localised', () => {
    useSettingsStore.setState({ locale: 'kn' });
    render(<PersonCardView person={person({ isDeceased: true })} />);
    expect(screen.getByText('ಮೃತ')).toBeInTheDocument();
  });
});

describe('LandingPage', () => {
  it('renders the headline, both CTAs and the three benefits', () => {
    render(
      <MemoryRouter>
        <TooltipProvider>
          <LandingPage />
        </TooltipProvider>
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { level: 1, name: 'Your family. Your story. Your legacy.' })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /Create your family tree/ }).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByRole('link', { name: 'Explore a sample tree' })).toHaveAttribute('href', '/sample');
    for (const b of ['No account required', 'Saved in your browser', 'Export to PNG and PDF']) expect(screen.getByText(b)).toBeInTheDocument();
  });
});

describe('PersonDialog', () => {
  const setup = () => {
    useEditorStore.getState().load(createEmptyTree('T', 'vertical'));
    useUiStore.setState({ dialog: { kind: 'person', mode: 'first' } });
    render(
      <TooltipProvider>
        <PersonDialog />
      </TooltipProvider>,
    );
    return within(screen.getByRole('dialog'));
  };

  it('requires a name and shows an accessible error', async () => {
    const user = userEvent.setup();
    const dialog = setup();
    await user.click(dialog.getByRole('button', { name: 'Add person' }));
    expect(await dialog.findByText('Enter at least a first or last name.')).toBeInTheDocument();
    expect(useEditorStore.getState().tree!.people).toHaveLength(0);
  });

  it('creates and selects the person, trimming and dropping empty optional fields', async () => {
    const user = userEvent.setup();
    const dialog = setup();
    await user.type(dialog.getByLabelText(/^First name/), '  Suresh ');
    await user.type(dialog.getByLabelText(/Birth date/), '1958-03');
    await user.click(dialog.getByRole('button', { name: 'Add person' }));
    const { tree, selectedId } = useEditorStore.getState();
    expect(tree!.people).toHaveLength(1);
    expect(tree!.people[0]).toMatchObject({ firstName: 'Suresh', birthDate: '1958-03' });
    expect(tree!.people[0].lastName).toBeUndefined();
    expect(tree!.people[0].biography).toBeUndefined();
    expect(selectedId).toBe(tree!.people[0].id);
  });

  it('rejects an invalid date and a death before birth', async () => {
    const user = userEvent.setup();
    const dialog = setup();
    await user.type(dialog.getByLabelText(/^First name/), 'A');
    await user.type(dialog.getByLabelText(/Birth date/), '1950-02-31');
    await user.click(dialog.getByRole('button', { name: 'Add person' }));
    expect(await dialog.findByText(/valid date/)).toBeInTheDocument();
    await user.clear(dialog.getByLabelText(/Birth date/));
    await user.type(dialog.getByLabelText(/Birth date/), '1950');
    await user.click(dialog.getByRole('radio', { name: 'Deceased' }));
    await user.type(dialog.getByLabelText(/Death date/), '1940');
    await user.click(dialog.getByRole('button', { name: 'Add person' }));
    expect(await dialog.findByText(/before the birth date/)).toBeInTheDocument();
  });

  it('editing preserves fields the form does not own (relationships, ids)', async () => {
    const user = userEvent.setup();
    const tree = createSampleTree();
    useEditorStore.getState().load(tree);
    const target = tree.people.find((p) => p.firstName === 'Suresh')!;
    useUiStore.setState({ dialog: { kind: 'person', mode: 'edit', personId: target.id } });
    render(
      <TooltipProvider>
        <PersonDialog />
      </TooltipProvider>,
    );
    const dialog = within(screen.getByRole('dialog'));
    expect(dialog.getByLabelText(/Biography/)).toHaveValue(target.biography);
    await user.clear(dialog.getByLabelText(/^Last name/));
    await user.type(dialog.getByLabelText(/^Last name/), 'Raoji');
    await user.click(dialog.getByRole('button', { name: 'Save changes' }));
    const after = useEditorStore.getState().tree!;
    expect(after.people.find((p) => p.id === target.id)).toMatchObject({ lastName: 'Raoji', biography: target.biography, birthDate: '1958' });
    expect(after.relationships).toEqual(tree.relationships);
    expect(after.people).toHaveLength(tree.people.length);
  });
});

describe('portrait avatars', () => {
  it('draws the style that matches the age group, and is stable per person', () => {
    const style = (p: Partial<Person>) => {
      const r = render(<PersonCardView person={person({ id: 'x1', ...p })} />);
      const v = r.container.querySelector('[data-portrait]')?.getAttribute('data-portrait');
      r.unmount();
      return v;
    };
    expect(style({ gender: 'male', birthDate: '1930', deathDate: '2005' })).toBe('mElder'); // grandfather
    expect(style({ gender: 'female', birthDate: '1930', deathDate: '2005' })).toBe('fElder'); // grandmother
    expect(style({ gender: 'male', birthDate: String(new Date().getFullYear() - 8) })).toBe('mBoy');
    expect(style({ gender: 'female', birthDate: String(new Date().getFullYear() - 8) })).toBe('fGirl');
    expect(['mAdult', 'mBeard', 'mGlasses']).toContain(style({ gender: 'male', birthDate: '1990' }));
    expect(['fLong', 'fBob']).toContain(style({ gender: 'female', birthDate: '1990' }));
    expect(pickVariant('female', 'same', 'adult')).toBe(pickVariant('female', 'same', 'adult'));
    expect(new Set(['a', 'b', 'c', 'd', 'e', 'f'].map((id) => pickVariant('male', id, 'adult'))).size).toBeGreaterThan(1);
  });
});
