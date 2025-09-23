import { fixture, html, expect } from '@open-wc/testing';
import { JinjaSqlPreview } from './sql-preview.js';
import type { Jinja2Variable } from '../types.js';
import { stub } from 'sinon';

describe('JinjaSqlPreview', () => {
  const sampleVariables: Jinja2Variable[] = [
    {
      name: 'user_name',
      type: 'string',
      description: 'The name of the user',
      isRequired: true
    },
    {
      name: 'user_age',
      type: 'number',
      description: 'The age of the user',
      isRequired: true
    },
    {
      name: 'is_active',
      type: 'boolean',
      description: 'Whether the user is active',
      isRequired: false
    }
  ];

  const sampleValues = {
    user_name: 'John Doe',
    user_age: 30,
    is_active: true
  };

  const sampleTemplate = `SELECT * FROM users
WHERE name = '{{ user_name }}'
  AND age > {{ user_age }}
  AND is_active = {{ is_active }}
ORDER BY created_at DESC`;

  it('registers as a custom element', () => {
    expect(customElements.get('jinja-sql-preview')).to.exist;
  });

  it('renders with default properties', async () => {
    const el = await fixture(html`<jinja-sql-preview></jinja-sql-preview>`);

    expect(el).to.exist;
    expect(el.template).to.equal('');
    expect(el.values).to.deep.equal({});
    expect(el.variables).to.deep.equal([]);
    expect(el.theme).to.equal('vscode-dark');
    expect(el.showOriginal).to.be.true;
    expect(el.autoRender).to.be.true;
    expect(el.highlightSyntax).to.be.true;
  });

  it('shows empty state when no template is provided', async () => {
    const el = await fixture(html`<jinja-sql-preview></jinja-sql-preview>`);

    const emptyState = el.shadowRoot!.querySelector('.empty-state');
    expect(emptyState).to.exist;
    expect(emptyState?.querySelector('.empty-text')?.textContent?.trim()).to.equal('No template to preview');
  });

  it('shows SQL content when template is provided', async () => {
    const el = await fixture(html`
      <jinja-sql-preview
        .template=${sampleTemplate}
        .values=${sampleValues}
        .variables=${sampleVariables}
      ></jinja-sql-preview>
    `);

    const emptyState = el.shadowRoot!.querySelector('.empty-state');
    const sqlContent = el.shadowRoot!.querySelector('.sql-content');

    expect(emptyState).not.to.exist;
    expect(sqlContent).to.exist;
  });

  it('shows original template section when showOriginal is true', async () => {
    const el = await fixture(html`
      <jinja-sql-preview
        .template=${sampleTemplate}
        .showOriginal=${true}
      ></jinja-sql-preview>
    `);

    const templateSection = el.shadowRoot!.querySelector('.template-section');
    expect(templateSection).to.exist;

    const templateContent = templateSection?.querySelector('.template-content');
    expect(templateContent?.textContent?.trim()).to.equal(sampleTemplate);
  });

  it('hides original template section when showOriginal is false', async () => {
    const el = await fixture(html`
      <jinja-sql-preview
        .template=${sampleTemplate}
        .showOriginal=${false}
      ></jinja-sql-preview>
    `);

    const templateSection = el.shadowRoot!.querySelector('.template-section');
    expect(templateSection).not.to.exist;
  });

  it('displays template complexity information', async () => {
    const el = await fixture(html`
      <jinja-sql-preview
        .template=${sampleTemplate}
      ></jinja-sql-preview>
    `);

    const templateMeta = el.shadowRoot!.querySelector('.template-meta');
    expect(templateMeta).to.exist;
    expect(templateMeta?.textContent?.trim()).to.include('complexity');
  });

  it('shows render button when autoRender is false', async () => {
    const el = await fixture(html`
      <jinja-sql-preview
        .template=${sampleTemplate}
        .autoRender=${false}
      ></jinja-sql-preview>
    `);

    const renderButton = el.shadowRoot!.querySelector('.render-button');
    expect(renderButton).to.exist;
    expect(renderButton?.textContent?.trim()).to.include('Render');
  });

  it('hides render button when autoRender is true', async () => {
    const el = await fixture(html`
      <jinja-sql-preview
        .template=${sampleTemplate}
        .autoRender=${true}
      ></jinja-sql-preview>
    `);

    const renderButton = el.shadowRoot!.querySelector('.render-button');
    expect(renderButton).not.to.exist;
  });

  it('renders template when render button is clicked', async () => {
    const el = await fixture(html`
      <jinja-sql-preview
        .template=${sampleTemplate}
        .values=${sampleValues}
        .autoRender=${false}
      ></jinja-sql-preview>
    `);

    const renderButton = el.shadowRoot!.querySelector('.render-button')!;
    renderButton.click();
    await el.updateComplete;

    const sqlContent = el.shadowRoot!.querySelector('.sql-content');
    expect(sqlContent).to.exist;
    expect(sqlContent?.textContent).to.include('John Doe');
  });

  it('shows loading spinner during rendering', async () => {
    const el = await fixture(html`
      <jinja-sql-preview
        .template=${sampleTemplate}
        .values=${sampleValues}
        .autoRender=${false}
      ></jinja-sql-preview>
    `);

    // Mock the renderTemplate method to show loading state
    const originalRenderTemplate = el.renderTemplate;
    el.renderTemplate = async () => {
      el.isRendering = true;
      await el.updateComplete;
      setTimeout(() => {
        el.isRendering = false;
        el.renderedSQL = 'test';
        el.updateComplete();
      }, 100);
    };

    const renderButton = el.shadowRoot!.querySelector('.render-button')!;
    renderButton.click();
    await el.updateComplete;

    const spinner = el.shadowRoot!.querySelector('.spinner');
    expect(spinner).to.exist;

    // Restore original method
    el.renderTemplate = originalRenderTemplate;
  });

  it('disables render button during rendering', async () => {
    const el = await fixture(html`
      <jinja-sql-preview
        .template=${sampleTemplate}
        .values=${sampleValues}
        .autoRender=${false}
      ></jinja-sql-preview>
    `);

    el.isRendering = true;
    await el.updateComplete;

    const renderButton = el.shadowRoot!.querySelector('.render-button');
    expect(renderButton).to.have.attribute('disabled');
  });

  it('shows error section when rendering fails', async () => {
    const el = await fixture(html`
      <jinja-sql-preview
        .template=${'invalid template {{'}
        .values=${sampleValues}
      ></jinja-sql-preview>
    `);

    // Force an error
    el.renderedSQL = '';
    el.renderError = 'Template parsing error';
    el.isRendering = false;
    await el.updateComplete;

    const errorSection = el.shadowRoot!.querySelector('.error-section');
    expect(errorSection).to.exist;
    expect(errorSection?.textContent?.trim()).to.include('Template rendering failed');
  });

  it('applies correct theme CSS classes', async () => {
    const themes = ['vscode-dark', 'vscode-light', 'github-dark', 'github-light', 'monokai'];

    for (const theme of themes) {
      const el = await fixture(html`
        <jinja-sql-preview
          .template=${sampleTemplate}
          .theme=${theme}
        ></jinja-sql-preview>
      `);

      const sqlContent = el.shadowRoot!.querySelector('.sql-content');
      expect(sqlContent).to.have.class(`theme-${theme}`);
    }
  });

  it('highlights SQL syntax when highlightSyntax is true', async () => {
    const el = await fixture(html`
      <jinja-sql-preview
        .template=${sampleTemplate}
        .values=${sampleValues}
        .highlightSyntax=${true}
      ></jinja-sql-preview>
    `);

    const sqlContent = el.shadowRoot!.querySelector('.sql-content');
    const htmlContent = sqlContent?.innerHTML;

    expect(htmlContent).to.include('sql-keyword');
    expect(htmlContent).to.include('sql-string');
    expect(htmlContent).to.include('sql-number');
  });

  it('does not highlight SQL syntax when highlightSyntax is false', async () => {
    const el = await fixture(html`
      <jinja-sql-preview
        .template=${sampleTemplate}
        .values=${sampleValues}
        .highlightSyntax=${false}
      ></jinja-sql-preview>
    `);

    const sqlContent = el.shadowRoot!.querySelector('.sql-content');
    const htmlContent = sqlContent?.innerHTML;

    expect(htmlContent).not.to.include('sql-keyword');
    expect(htmlContent).not.to.include('sql-string');
    expect(htmlContent).not.to.include('sql-number');
  });

  it('shows correct status indicator for different states', async () => {
    // Success state
    const successEl = await fixture(html`
      <jinja-sql-preview
        .template=${sampleTemplate}
        .values=${sampleValues}
      ></jinja-sql-preview>
    `);

    const successIndicator = successEl.shadowRoot!.querySelector('.status-indicator');
    expect(successIndicator).to.have.class('success');

    // Error state
    const errorEl = await fixture(html`
      <jinja-sql-preview
        .template=${'invalid template {{'}
        .values=${sampleValues}
      ></jinja-sql-preview>
    `);
    errorEl.renderedSQL = '';
    errorEl.renderError = 'Error';
    await errorEl.updateComplete;

    const errorIndicator = errorEl.shadowRoot!.querySelector('.status-indicator');
    expect(errorIndicator).to.have.class('error');

    // Warning state (no template)
    const warningEl = await fixture(html`<jinja-sql-preview></jinja-sql-preview>`);
    const warningIndicator = warningEl.shadowRoot!.querySelector('.status-indicator');
    expect(warningIndicator).to.have.class('warning');
  });

  it('shows variable count in status bar', async () => {
    const el = await fixture(html`
      <jinja-sql-preview
        .template=${sampleTemplate}
        .values=${sampleValues}
        .variables=${sampleVariables}
      ></jinja-sql-preview>
    `);

    const statusBar = el.shadowRoot!.querySelector('.status-bar');
    expect(statusBar?.textContent?.trim()).to.include('3 variables');
  });

  it('shows render time in status bar when available', async () => {
    const el = await fixture(html`
      <jinja-sql-preview
        .template=${sampleTemplate}
        .values=${sampleValues}
      ></jinja-sql-preview>
    `);

    el.lastRenderTime = 150;
    await el.updateComplete;

    const statusBar = el.shadowRoot!.querySelector('.status-bar');
    expect(statusBar?.textContent?.trim()).to.include('150ms');
  });

  it('shows copy button when SQL content is available and no error', async () => {
    const el = await fixture(html`
      <jinja-sql-preview
        .template=${sampleTemplate}
        .values=${sampleValues}
      ></jinja-sql-preview>
    `);

    const copyButton = el.shadowRoot!.querySelector('.copy-button');
    expect(copyButton).to.exist;
  });

  it('hides copy button when no content or error', async () => {
    const el = await fixture(html`<jinja-sql-preview></jinja-sql-preview>`);

    const copyButton = el.shadowRoot!.querySelector('.copy-button');
    expect(copyButton).not.to.exist;
  });

  it('copies SQL to clipboard when copy button is clicked', async () => {
    const el = await fixture(html`
      <jinja-sql-preview
        .template=${sampleTemplate}
        .values=${sampleValues}
      ></jinja-sql-preview>
    `);

    // Mock clipboard API
    const writeTextStub = stub(navigator.clipboard, 'writeText').resolves();
    const copyButton = el.shadowRoot!.querySelector('.copy-button')!;

    copyButton.click();
    await el.updateComplete;

    expect(writeTextStub).to.have.been.calledOnce;
    expect(writeTextStub.firstCall.args[0]).to.include('John Doe');

    // Check button state change
    expect(copyButton.textContent?.trim()).to.equal('Copied!');
    expect(copyButton).to.have.class('copied');

    writeTextStub.restore();
  });

  it('shows error message when clipboard copy fails', async () => {
    const el = await fixture(html`
      <jinja-sql-preview
        .template=${sampleTemplate}
        .values=${sampleValues}
      ></jinja-sql-preview>
    `);

    // Mock clipboard API to throw error
    const writeTextStub = stub(navigator.clipboard, 'writeText').rejects(new Error('Clipboard error'));
    const consoleErrorSpy = stub(console, 'error');

    const copyButton = el.shadowRoot!.querySelector('.copy-button')!;
    copyButton.click();
    await el.updateComplete;

    expect(consoleErrorSpy).to.have.been.calledOnce;

    writeTextStub.restore();
    consoleErrorSpy.restore();
  });

  it('resets copy button state after timeout', async () => {
    const el = await fixture(html`
      <jinja-sql-preview
        .template=${sampleTemplate}
        .values=${sampleValues}
      ></jinja-sql-preview>
    `);

    // Mock clipboard API
    const writeTextStub = stub(navigator.clipboard, 'writeText').resolves();
    const copyButton = el.shadowRoot!.querySelector('.copy-button')!;

    copyButton.click();
    await el.updateComplete;

    // Fast-forward timeout
    await new Promise(resolve => setTimeout(resolve, 2100));

    expect(copyButton.textContent?.trim()).to.equal('Copy');
    expect(copyButton).not.to.have.class('copied');

    writeTextStub.restore();
  });

  it('toggles original template visibility when toggle button is clicked', async () => {
    const el = await fixture(html`
      <jinja-sql-preview
        .template=${sampleTemplate}
        .showOriginal=${true}
      ></jinja-sql-preview>
    `);

    const toggleButton = el.shadowRoot!.querySelector('.toggle-button')!;
    toggleButton.click();
    await el.updateComplete;

    expect(el.showOriginal).to.be.false;
    expect(toggleButton.textContent?.trim()).to.equal('Show Template');

    const templateSection = el.shadowRoot!.querySelector('.template-section');
    expect(templateSection).not.to.exist;
  });

  it('re-renders template when template property changes and autoRender is true', async () => {
    const el = await fixture(html`
      <jinja-sql-preview
        .template=${'SELECT * FROM users'}
        .values=${sampleValues}
        .autoRender=${true}
      ></jinja-sql-preview>
    `);

    const renderSpy = stub(el, 'renderTemplate');
    el.template = sampleTemplate;
    await el.updateComplete;

    expect(renderSpy).to.have.been.calledOnce;

    renderSpy.restore();
  });

  it('re-renders template when values property changes and autoRender is true', async () => {
    const el = await fixture(html`
      <jinja-sql-preview
        .template=${sampleTemplate}
        .values=${{}}
        .autoRender=${true}
      ></jinja-sql-preview>
    `);

    const renderSpy = stub(el, 'renderTemplate');
    el.values = sampleValues;
    await el.updateComplete;

    expect(renderSpy).to.have.been.calledOnce;

    renderSpy.restore();
  });

  it('re-renders template when variables property changes and autoRender is true', async () => {
    const el = await fixture(html`
      <jinja-sql-preview
        .template=${sampleTemplate}
        .values=${sampleValues}
        .variables=${[]}
        .autoRender=${true}
      ></jinja-sql-preview>
    `);

    const renderSpy = stub(el, 'renderTemplate');
    el.variables = sampleVariables;
    await el.updateComplete;

    expect(renderSpy).to.have.been.calledOnce;

    renderSpy.restore();
  });

  it('calculates template complexity correctly', async () => {
    // Empty template
    const emptyEl = await fixture(html`<jinja-sql-preview></jinja-sql-preview>`);
    expect(emptyEl.getTemplateComplexity()).to.equal('empty');

    // Simple template
    const simpleEl = await fixture(html`<jinja-sql-preview .template=${'SELECT * FROM users WHERE id = {{ id }}'}></jinja-sql-preview>`);
    expect(simpleEl.getTemplateComplexity()).to.equal('simple');

    // Medium complexity template
    const mediumEl = await fixture(html`<jinja-sql-preview .template=${sampleTemplate}></jinja-sql-preview>`);
    expect(mediumEl.getTemplateComplexity()).to.equal('medium');

    // Complex template
    const complexTemplate = `SELECT * FROM users
WHERE name = '{{ name }}'
  {% if active %}AND status = 'active'{% endif %}
  {% for item in items %}AND item_id = {{ item }}{% endfor %}`;
    const complexEl = await fixture(html`<jinja-sql-preview .template=${complexTemplate}></jinja-sql-preview>`);
    expect(complexEl.getTemplateComplexity()).to.equal('complex');
  });

  it('formats values correctly in SQL output', async () => {
    const el = await fixture(html`
      <jinja-sql-preview
        .template=${'SELECT {{ string }}, {{ number }}, {{ boolean }}, {{ null_value }}'}
        .values=${{
          string: 'test',
          number: 42,
          boolean: true,
          null_value: null
        }}
      ></jinja-sql-preview>
    `);

    const sqlContent = el.shadowRoot!.querySelector('.sql-content');
    const text = sqlContent?.textContent?.trim();

    expect(text).to.include("'test'");
    expect(text).to.include("42");
    expect(text).to.include("TRUE");
    expect(text).to.include("NULL");
  });

  it('handles SQL injection prevention in values', async () => {
    const el = await fixture(html`
      <jinja-sql-preview
        .template=${'SELECT * FROM users WHERE name = {{ user_name }}'}
        .values=${{
          user_name: "Robert'); DROP TABLE users; --"
        }}
      ></jinja-sql-preview>
    `);

    const sqlContent = el.shadowRoot!.querySelector('.sql-content');
    const text = sqlContent?.textContent?.trim();

    // Should escape single quotes
    expect(text).to.include("'Robert''); DROP TABLE users; --'");
  });

  it('supports custom CSS classes', async () => {
    const el = await fixture(html`<jinja-sql-preview class="custom-class"></jinja-sql-preview>`);

    expect(el).to.have.class('custom-class');
  });

  it('supports inline styles', async () => {
    const el = await fixture(html`<jinja-sql-preview style="height: 400px;"></jinja-sql-preview>`);

    expect(el.style.height).to.equal('400px');
  });

  it('removes event listeners on disconnect', async () => {
    const el = await fixture(html`<jinja-sql-preview></jinja-sql-preview>`);

    // Spy on removeEventListener calls
    const originalRemove = EventTarget.prototype.removeEventListener;
    const removeSpy = sinon.spy(EventTarget.prototype, 'removeEventListener');

    el.disconnectedCallback();

    expect(removeSpy).to.have.been.called;

    // Restore original method
    EventTarget.prototype.removeEventListener = originalRemove;
  });
});