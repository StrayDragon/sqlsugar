/**
 * Analyzer Selector Tests
 *
 * Tests for the analyzer selection UI component.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import '../features/templated-sql/ui/components/analyzer-selector.js';
import type { AnalyzerSelector } from '../features/templated-sql/ui/components/analyzer-selector.js';

describe('AnalyzerSelector', () => {
  let element: AnalyzerSelector;

  beforeEach(async () => {
    localStorage.clear();
    element = document.createElement('analyzer-selector');
    document.body.appendChild(element);
    await element.updateComplete;
  });

  afterEach(() => {
    element.remove();
    localStorage.clear();
  });

  it('should render with default options', async () => {
    const trigger = element.shadowRoot!.querySelector('.selector-trigger');
    expect(trigger).toBeTruthy();
    expect(trigger!.textContent).toContain('Auto');
  });

  it('should show dropdown on click', async () => {
    const trigger = element.shadowRoot!.querySelector('.selector-trigger') as HTMLElement;
    trigger.click();
    await element.updateComplete;

    const dropdown = element.shadowRoot!.querySelector('.dropdown');
    expect(dropdown).toBeTruthy();
  });

  it('should display mode buttons in dropdown', async () => {
    const trigger = element.shadowRoot!.querySelector('.selector-trigger') as HTMLElement;
    trigger.click();
    await element.updateComplete;

    const modeButtons = element.shadowRoot!.querySelectorAll('.mode-button');
    expect(modeButtons).toHaveLength(2);
    expect(modeButtons[0].textContent).toContain('Auto');
    expect(modeButtons[1].textContent).toContain('Manual');
  });

  it('should switch to manual mode', async () => {
    const changeHandler = vi.fn();
    element.addEventListener('analyzer-selection-change', changeHandler);

    const trigger = element.shadowRoot!.querySelector('.selector-trigger') as HTMLElement;
    trigger.click();
    await element.updateComplete;

    const manualButton = element.shadowRoot!.querySelectorAll('.mode-button')[1] as HTMLElement;
    manualButton.click();
    await element.updateComplete;

    expect(element.mode).toBe('manual');
    expect(changeHandler).toHaveBeenCalled();
  });

  it('should show analyzer list in manual mode', async () => {
    element.mode = 'manual';
    await element.updateComplete;

    const trigger = element.shadowRoot!.querySelector('.selector-trigger') as HTMLElement;
    trigger.click();
    await element.updateComplete;

    const items = element.shadowRoot!.querySelectorAll('.analyzer-item');
    expect(items.length).toBeGreaterThan(0);
  });

  it('should toggle analyzer selection', async () => {
    element.mode = 'manual';
    await element.updateComplete;

    const trigger = element.shadowRoot!.querySelector('.selector-trigger') as HTMLElement;
    trigger.click();
    await element.updateComplete;


    const checkboxes = element.shadowRoot!.querySelectorAll('input[type="checkbox"]');
    const namedCheckbox = checkboxes[1] as HTMLInputElement;


    expect(element.selectedAnalyzers).toEqual(['jinja2']);


    namedCheckbox.click();
    await element.updateComplete;

    expect(element.selectedAnalyzers).toContain('named');
    expect(element.selectedAnalyzers).toContain('jinja2');
  });

  it('should not allow deselecting all analyzers', async () => {
    element.mode = 'manual';
    element.selectedAnalyzers = ['jinja2'];
    await element.updateComplete;

    const trigger = element.shadowRoot!.querySelector('.selector-trigger') as HTMLElement;
    trigger.click();
    await element.updateComplete;


    const checkboxes = element.shadowRoot!.querySelectorAll('input[type="checkbox"]');
    const jinja2Checkbox = checkboxes[0] as HTMLInputElement;

    jinja2Checkbox.click();
    await element.updateComplete;


    expect(element.selectedAnalyzers).toContain('jinja2');
  });

  it('should emit selection change event', async () => {
    const handler = vi.fn();
    element.addEventListener('analyzer-selection-change', handler);

    element.mode = 'manual';
    await element.updateComplete;

    const trigger = element.shadowRoot!.querySelector('.selector-trigger') as HTMLElement;
    trigger.click();
    await element.updateComplete;

    const manualButton = element.shadowRoot!.querySelectorAll('.mode-button')[1] as HTMLElement;
    manualButton.click();
    await element.updateComplete;

    expect(handler).toHaveBeenCalled();
    expect(handler.mock.calls[0][0].detail).toEqual({
      mode: 'manual',
      selectedAnalyzers: ['jinja2'],
    });
  });

  it('should close dropdown on outside click', async () => {
    const trigger = element.shadowRoot!.querySelector('.selector-trigger') as HTMLElement;
    trigger.click();
    await element.updateComplete;

    expect(element.shadowRoot!.querySelector('.dropdown')).toBeTruthy();


    document.body.click();
    await element.updateComplete;

    expect(element.shadowRoot!.querySelector('.dropdown')).toBeNull();
  });

  it('should show count badge in manual mode', async () => {
    element.mode = 'manual';
    element.selectedAnalyzers = ['jinja2', 'named'];
    await element.updateComplete;

    const trigger = element.shadowRoot!.querySelector('.selector-trigger');
    expect(trigger!.textContent).toContain('2 selected');
  });

  it('should be disabled when disabled property is set', async () => {
    element.disabled = true;
    await element.updateComplete;

    const trigger = element.shadowRoot!.querySelector('.selector-trigger') as HTMLElement;
    trigger.click();
    await element.updateComplete;


    expect(element.shadowRoot!.querySelector('.dropdown')).toBeNull();
  });

  it('should show auto hint in auto mode', async () => {
    const trigger = element.shadowRoot!.querySelector('.selector-trigger') as HTMLElement;
    trigger.click();
    await element.updateComplete;

    const hint = element.shadowRoot!.querySelector('.auto-hint');
    expect(hint).toBeTruthy();
    expect(hint!.textContent).toContain('auto-detected');
  });

  describe('persistence', () => {
    const STORAGE_KEY = 'sqlsugar.templatedSqlEditor.analyzerState';

    /** Drive the element into manual mode and toggle `named` on. */
    async function selectManualNamed(el: AnalyzerSelector) {
      const trigger = el.shadowRoot!.querySelector('.selector-trigger') as HTMLElement;
      trigger.click();
      await el.updateComplete;

      const manualButton = el.shadowRoot!.querySelectorAll('.mode-button')[1] as HTMLElement;
      manualButton.click();
      await el.updateComplete;

      const namedCheckbox = el.shadowRoot!.querySelectorAll(
        'input[type="checkbox"]'
      )[1] as HTMLInputElement;
      namedCheckbox.click();
      await el.updateComplete;
    }

    it('should persist mode and selection to localStorage on change', async () => {
      await selectManualNamed(element);

      const raw = localStorage.getItem(STORAGE_KEY);
      expect(raw).toBeTruthy();
      const parsed = JSON.parse(raw!);
      expect(parsed.mode).toBe('manual');
      expect(parsed.selectedAnalyzers).toEqual(
        expect.arrayContaining(['jinja2', 'named'])
      );
    });

    it('should restore persisted selection when reopened (fresh element)', async () => {
      await selectManualNamed(element);
      element.remove();

      const reopened = document.createElement('analyzer-selector');
      document.body.appendChild(reopened);
      await reopened.updateComplete;

      expect(reopened.mode).toBe('manual');
      expect(reopened.selectedAnalyzers).toEqual(
        expect.arrayContaining(['jinja2', 'named'])
      );
      reopened.remove();
    });

    it('should fall back to defaults when storage is empty', async () => {
      element.remove();
      localStorage.clear();

      const fresh = document.createElement('analyzer-selector');
      document.body.appendChild(fresh);
      await fresh.updateComplete;

      expect(fresh.mode).toBe('auto');
      expect(fresh.selectedAnalyzers).toEqual(['jinja2']);
      fresh.remove();
    });

    it('should ignore persisted state with unknown analyzer names', async () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ mode: 'manual', selectedAnalyzers: ['ghost', 'phantom'] })
      );
      element.remove();

      const fresh = document.createElement('analyzer-selector');
      document.body.appendChild(fresh);
      await fresh.updateComplete;

      // All names unknown -> no valid selection -> keep defaults.
      expect(fresh.mode).toBe('auto');
      expect(fresh.selectedAnalyzers).toEqual(['jinja2']);
      fresh.remove();
    });

    it('should not crash when localStorage throws on read', async () => {
      const original = localStorage.getItem;
      // Force getItem to throw (e.g. storage disabled in private mode).
      Object.defineProperty(localStorage, 'getItem', {
        configurable: true,
        value: () => {
          throw new Error('storage disabled');
        },
      });

      let fresh: AnalyzerSelector | undefined;
      expect(() => {
        fresh = document.createElement('analyzer-selector');
        document.body.appendChild(fresh);
      }).not.toThrow();

      fresh?.remove();
      Object.defineProperty(localStorage, 'getItem', {
        configurable: true,
        value: original,
      });
    });
  });
});
