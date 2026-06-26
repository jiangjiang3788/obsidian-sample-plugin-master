import { AddIcon, SearchIcon } from '../../src/shared/ui/icons';

describe('shared local icons', () => {
  it('renders lightweight local icon nodes without Material Icons imports', () => {
    const add = AddIcon({ fontSize: 'small', color: 'primary' });
    const search = SearchIcon({ fontSize: 'inherit' });

    expect(add.props.className).toContain('think-os-icon');
    expect(add.props.style.fontSize).toBe('1rem');
    expect(add.props.style.color).toBe('var(--interactive-accent)');
    expect(search.props.style.fontSize).toBe('inherit');
  });
});
