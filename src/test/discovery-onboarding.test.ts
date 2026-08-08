import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('discovery onboarding package contributes', () => {
  const pkg = JSON.parse(readFileSync(resolve(__dirname, '../../package.json'), 'utf8'));

  it('uses readable displayName and searchable categories', () => {
    expect(pkg.displayName).toBe('SQLSugar');
    expect(pkg.categories).toContain('Programming Languages');
  });

  it('keeps command ids and renames Templated SQL title', () => {
    const commands = pkg.contributes.commands;
    expect(commands).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          command: 'sqlsugar.editInlineSQL',
          title: 'SQLSugar: Edit Inline SQL',
        }),
        expect.objectContaining({
          command: 'sqlsugar.copyTemplatedSql',
          title: 'SQLSugar: Open Templated SQL Editor',
        }),
      ])
    );
    expect(commands.find((c: { command: string }) => c.command === 'sqlsugar.copyTemplatedSql').title)
      .not.toMatch(/Copy To/i);
  });

  it('contributes default keybindings for both commands', () => {
    const keys = pkg.contributes.keybindings;
    expect(keys).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ command: 'sqlsugar.editInlineSQL' }),
        expect.objectContaining({ command: 'sqlsugar.copyTemplatedSql' }),
      ])
    );
  });

  it('contributes a Get Started walkthrough with two steps', () => {
    const walkthroughs = pkg.contributes.walkthroughs;
    expect(walkthroughs).toHaveLength(1);
    expect(walkthroughs[0].id).toBe('sqlsugar.getStarted');
    expect(walkthroughs[0].steps).toHaveLength(2);
  });
});
