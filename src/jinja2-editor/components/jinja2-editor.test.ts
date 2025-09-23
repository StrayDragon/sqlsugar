import { fixture, html, expect } from '@open-wc/testing';
import { Jinja2Editor } from './jinja2-editor.js';
import type { Jinja2Variable, Jinja2VariableType } from '../types.js';
import sinon from 'sinon';

// Setup DOM for testing
import '../../test/test-dom-setup.js';

describe('Jinja2Editor', () => {
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
    },
    {
      name: 'user_data',
      type: 'json',
      description: 'Additional user data',
      isRequired: false,
      filters: ['default']
    }
  ];

  const sampleTemplate = `SELECT * FROM users
WHERE name = '{{ user_name }}'
  AND age > {{ user_age }}
  AND is_active = {{ is_active }}
  AND data = {{ user_data }}
ORDER BY created_at DESC
LIMIT {{ limit_value }}`;

  it('registers as a custom element', () => {
    expect(customElements.get('jinja-editor')).to.exist;
  });

  it('renders with default properties', async () => {
    const el = await fixture(html`<jinja-editor></jinja-editor>`);

    expect(el).to.exist;
    expect(el.template).to.equal('');
    expect(el.variables).to.deep.equal([]);
    expect(el.values).to.deep.equal({});
    expect(el.layout).to.equal('vertical');
    expect(el.compact).to.be.false;
    expect(el.showFilters).to.be.false;
  });

  it('displays header with title and subtitle', async () => {
    const el = await fixture(html`<jinja-editor></jinja-editor>`);

    const header = el.shadowRoot!.querySelector('.editor-header');
    expect(header).to.exist;

    const title = header?.querySelector('.editor-title');
    expect(title?.textContent?.trim()).to.equal('Jinja2 Template Editor');

    const subtitle = header?.querySelector('.editor-subtitle');
    expect(subtitle?.textContent?.trim()).to.equal('Edit template variables and preview rendered SQL');
  });

  it('shows variables panel when variables are provided', async () => {
    const el = await fixture(html`
      <jinja-editor .variables=${sampleVariables}></jinja-editor>
    `);

    const variablesPanel = el.shadowRoot!.querySelector('.variables-panel');
    expect(variablesPanel).to.exist;

    const variableInputs = variablesPanel!.querySelectorAll('jinja-variable-input');
    expect(variableInputs.length).to.equal(4);
  });

  it('hides variables panel when no variables are provided', async () => {
    const el = await fixture(html`<jinja-editor></jinja-editor>`);

    const variablesPanel = el.shadowRoot!.querySelector('.variables-panel');
    expect(variablesPanel).not.to.exist;
  });

  it('always shows SQL preview panel', async () => {
    const el = await fixture(html`<jinja-editor></jinja-editor>`);

    const previewPanel = el.shadowRoot!.querySelector('.preview-panel');
    expect(previewPanel).to.exist;

    const sqlPreview = previewPanel?.querySelector('jinja-sql-preview');
    expect(sqlPreview).to.exist;
  });

  it('applies correct layout CSS classes', async () => {
    // Vertical layout
    const verticalEl = await fixture(html`<jinja-editor .layout=${'vertical'}></jinja-editor>`);
    expect(verticalEl).to.have.class('layout-vertical');
    expect(verticalEl).not.to.have.class('layout-horizontal');

    // Horizontal layout
    const horizontalEl = await fixture(html`<jinja-editor .layout=${'horizontal'}></jinja-editor>`);
    expect(horizontalEl).to.have.class('layout-horizontal');
    expect(horizontalEl).not.to.have.class('layout-vertical');
  });

  it('applies compact CSS class when compact is true', async () => {
    const el = await fixture(html`<jinja-editor .compact=${true}></jinja-editor>`);
    expect(el).to.have.class('compact');
  });

  it('passes template and values to SQL preview component', async () => {
    const el = await fixture(html`
      <jinja-editor
        .template=${sampleTemplate}
        .variables=${sampleVariables}
      ></jinja-editor>
    `);

    const sqlPreview = el.shadowRoot!.querySelector('jinja-sql-preview');
    expect(sqlPreview).to.have.property('template', sampleTemplate);
    expect(sqlPreview).to.have.deep.property('values', el.values);
  });

  it('passes variables to variable input components', async () => {
    const el = await fixture(html`
      <jinja-editor .variables=${sampleVariables}></jinja-editor>
    `);

    const variableInputs = el.shadowRoot!.querySelectorAll('jinja-variable-input');
    expect(variableInputs.length).to.equal(4);

    // Check first variable input
    const firstInput = variableInputs[0];
    expect(firstInput).to.have.deep.property('variable', sampleVariables[0]);
  });

  it('updates values when variable change event is emitted', async () => {
    const el = await fixture(html`
      <jinja-editor .variables=${sampleVariables}></jinja-editor>
    `);

    const variableInputs = el.shadowRoot!.querySelectorAll('jinja-variable-input');
    const firstInput = variableInputs[0];

    // Simulate value change
    firstInput.dispatchEvent(new CustomEvent('change', {
      detail: {
        name: 'user_name',
        value: 'John Doe',
        type: 'string'
      },
      bubbles: true,
      composed: true
    }));

    expect(el.values).to.deep.equal({
      user_name: 'John Doe'
    });
  });

  it('provides default values for variables', async () => {
    const el = await fixture(html`
      <jinja-editor .variables=${sampleVariables}></jinja-editor>
    `);

    // Check that default values are provided based on variable types
    expect(el.values).to.deep.equal({
      user_name: 'demo_value',
      user_age: 42,
      is_active: true,
      user_data: {}
    });
  });

  it('updates variable input values when values property changes', async () => {
    const el = await fixture(html`
      <jinja-editor .variables=${sampleVariables}></jinja-editor>
    `);

    // Update values programmatically
    el.values = {
      user_name: 'Jane Smith',
      user_age: 25,
      is_active: false,
      user_data: { key: 'value' }
    };
    await el.updateComplete;

    const variableInputs = el.shadowRoot!.querySelectorAll('jinja-variable-input');
    const firstInput = variableInputs[0];

    expect(firstInput).to.have.property('value', 'Jane Smith');
  });

  it('shows variable count in header', async () => {
    const el = await fixture(html`
      <jinja-editor .variables=${sampleVariables}></jinja-editor>
    `);

    const variableCount = el.shadowRoot!.querySelector('.variable-count');
    expect(variableCount?.textContent?.trim()).to.equal('4 variables');
  });

  it('shows variable count with singular form for single variable', async () => {
    const singleVariable: Jinja2Variable[] = [
      {
        name: 'single_var',
        type: 'string',
        isRequired: true
      }
    ];

    const el = await fixture(html`
      <jinja-editor .variables=${singleVariable}></jinja-editor>
    `);

    const variableCount = el.shadowRoot!.querySelector('.variable-count');
    expect(variableCount?.textContent?.trim()).to.equal('1 variable');
  });

  it('hides variable count when no variables', async () => {
    const el = await fixture(html`<jinja-editor></jinja-editor>`);

    const variableCount = el.shadowRoot!.querySelector('.variable-count');
    expect(variableCount).not.to.exist;
  });

  it('emits change event when any variable value changes', async () => {
    const el = await fixture(html`
      <jinja-editor .variables=${sampleVariables}></jinja-editor>
    `);

    const changeSpy = sinon.spy();
    el.addEventListener('change', changeSpy);

    const variableInputs = el.shadowRoot!.querySelectorAll('jinja-variable-input');
    const firstInput = variableInputs[0];

    firstInput.dispatchEvent(new CustomEvent('change', {
      detail: {
        name: 'user_name',
        value: 'New Value',
        type: 'string'
      },
      bubbles: true,
      composed: true
    }));

    expect(changeSpy).to.have.been.calledOnce;
    const detail = changeSpy.firstCall.args[0].detail;
    expect(detail).to.deep.equal({
      name: 'user_name',
      value: 'New Value',
      type: 'string'
    });
  });

  it('emits template-change event when template property changes', async () => {
    const el = await fixture(html`<jinja-editor></jinja-editor>`);

    const templateChangeSpy = sinon.spy();
    el.addEventListener('template-change', templateChangeSpy);

    el.template = sampleTemplate;
    await el.updateComplete;

    expect(templateChangeSpy).to.have.been.calledOnce;
    expect(templateChangeSpy.firstCall.args[0].detail).to.equal(sampleTemplate);
  });

  it('emits values-change event when values are updated', async () => {
    const el = await fixture(html`
      <jinja-editor .variables=${sampleVariables}></jinja-editor>
    `);

    const valuesChangeSpy = sinon.spy();
    el.addEventListener('values-change', valuesChangeSpy);

    const variableInputs = el.shadowRoot!.querySelectorAll('jinja-variable-input');
    const firstInput = variableInputs[0];

    firstInput.dispatchEvent(new CustomEvent('change', {
      detail: {
        name: 'user_name',
        value: 'Updated Value',
        type: 'string'
      },
      bubbles: true,
      composed: true
    }));

    expect(valuesChangeSpy).to.have.been.calledOnce;
    expect(valuesChangeSpy.firstCall.args[0].detail).to.deep.equal({
      user_name: 'Updated Value'
    });
  });

  it('updates variables panel when variables property changes', async () => {
    const el = await fixture(html`<jinja-editor></jinja-editor>`);

    // Initially no variables
    let variableInputs = el.shadowRoot!.querySelectorAll('jinja-variable-input');
    expect(variableInputs.length).to.equal(0);

    // Add variables
    el.variables = sampleVariables;
    await el.updateComplete;

    variableInputs = el.shadowRoot!.querySelectorAll('jinja-variable-input');
    expect(variableInputs.length).to.equal(4);
  });

  it('preserves existing values when variables are updated', async () => {
    const el = await fixture(html`
      <jinja-editor .variables=${sampleVariables}></jinja-editor>
    `);

    // Change a value
    el.values = { user_name: 'Existing Value' };
    await el.updateComplete;

    // Update variables (keep same structure)
    const updatedVariables = [...sampleVariables];
    el.variables = updatedVariables;
    await el.updateComplete;

    // Value should be preserved
    expect(el.values).to.deep.equal({ user_name: 'Existing Value' });
  });

  it('handles variable type changes correctly', async () => {
    const el = await fixture(html`
      <jinja-editor .variables=${sampleVariables}></jinja-editor>
    `);

    const variableInputs = el.shadowRoot!.querySelectorAll('jinja-variable-input');
    const firstInput = variableInputs[0];

    // Simulate type change
    firstInput.dispatchEvent(new CustomEvent('change', {
      detail: {
        name: 'user_name',
        value: 123, // Changed from string to number
        type: 'number'
      },
      bubbles: true,
      composed: true
    }));

    expect(el.values).to.deep.equal({
      user_name: 123,
      user_age: 42,
      is_active: true,
      user_data: {}
    });
  });

  it('shows filters when showFilters is true', async () => {
    const el = await fixture(html`
      <jinja-editor
        .variables=${sampleVariables}
        .showFilters=${true}
      ></jinja-editor>
    `);

    const variableInputs = el.shadowRoot!.querySelectorAll('jinja-variable-input');
    // The last variable has filters
    const lastInput = variableInputs[variableInputs.length - 1];

    expect(lastInput).to.have.property('showFilters', true);
  });

  it('hides filters when showFilters is false', async () => {
    const el = await fixture(html`
      <jinja-editor
        .variables=${sampleVariables}
        .showFilters=${false}
      ></jinja-editor>
    `);

    const variableInputs = el.shadowRoot!.querySelectorAll('jinja-variable-input');
    const lastInput = variableInputs[variableInputs.length - 1];

    expect(lastInput).to.have.property('showFilters', false);
  });

  it('passes showFilters property to variable inputs', async () => {
    const el = await fixture(html`
      <jinja-editor
        .variables=${sampleVariables}
        .showFilters=${true}
      ></jinja-editor>
    `);

    el.showFilters = false;
    await el.updateComplete;

    const variableInputs = el.shadowRoot!.querySelectorAll('jinja-variable-input');
    for (const input of variableInputs) {
      expect(input).to.have.property('showFilters', false);
    }
  });

  it('handles empty variables array gracefully', async () => {
    const el = await fixture(html`
      <jinja-editor .variables=${[]}></jinja-editor>
    `);

    const variablesPanel = el.shadowRoot!.querySelector('.variables-panel');
    expect(variablesPanel).not.to.exist;

    const previewPanel = el.shadowRoot!.querySelector('.preview-panel');
    expect(previewPanel).to.exist;

    const sqlPreview = previewPanel?.querySelector('jinja-sql-preview');
    expect(sqlPreview).to.exist;
  });

  it('handles undefined variables property gracefully', async () => {
    const el = await fixture(html`<jinja-editor></jinja-editor>`);

    const variablesPanel = el.shadowRoot!.querySelector('.variables-panel');
    expect(variablesPanel).not.to.exist;

    expect(el.variables).to.deep.equal([]);
  });

  it('supports responsive layout adjustments', async () => {
    const el = await fixture(html`
      <jinja-editor
        .variables=${sampleVariables}
        .layout=${'horizontal'}
      ></jinja-editor>
    `);

    // Check that horizontal layout is applied
    expect(el).to.have.class('layout-horizontal');

    const container = el.shadowRoot!.querySelector('.editor-container');
    expect(container).to.have.class('layout-horizontal');
  });

  it('provides method to get all current values', async () => {
    const el = await fixture(html`
      <jinja-editor .variables=${sampleVariables}></jinja-editor>
    `);

    const values = el.getValues();
    expect(values).to.deep.equal({
      user_name: 'demo_value',
      user_age: 42,
      is_active: true,
      user_data: {}
    });
  });

  it('provides method to set all values', async () => {
    const el = await fixture(html`
      <jinja-editor .variables=${sampleVariables}></jinja-editor>
    `);

    const newValues = {
      user_name: 'Alice',
      user_age: 28,
      is_active: false,
      user_data: { preferences: { theme: 'dark' } }
    };

    el.setValues(newValues);
    await el.updateComplete;

    expect(el.values).to.deep.equal(newValues);

    // Check that variable inputs are updated
    const variableInputs = el.shadowRoot!.querySelectorAll('jinja-variable-input');
    const firstInput = variableInputs[0];
    expect(firstInput).to.have.property('value', 'Alice');
  });

  it('provides method to get rendered SQL', async () => {
    const el = await fixture(html`
      <jinja-editor
        .template=${sampleTemplate}
        .variables=${sampleVariables}
      ></jinja-editor>
    `);

    const renderedSQL = el.getRenderedSQL();
    expect(renderedSQL).to.include('SELECT');
    expect(renderedSQL).to.include('demo_value');
  });

  it('provides method to reset all values to defaults', async () => {
    const el = await fixture(html`
      <jinja-editor .variables=${sampleVariables}></jinja-editor>
    `);

    // Change some values
    el.values = {
      user_name: 'Custom Name',
      user_age: 99
    };
    await el.updateComplete;

    // Reset to defaults
    el.resetValues();
    await el.updateComplete;

    expect(el.values).to.deep.equal({
      user_name: 'demo_value',
      user_age: 42,
      is_active: true,
      user_data: {}
    });
  });

  it('provides method to clear all values', async () => {
    const el = await fixture(html`
      <jinja-editor .variables=${sampleVariables}></jinja-editor>
    `);

    el.clearValues();
    await el.updateComplete;

    expect(el.values).to.deep.equal({});
  });

  it('validates all variables and returns validation status', async () => {
    const el = await fixture(html`
      <jinja-editor .variables=${sampleVariables}></jinja-editor>
    `);

    // Clear required field to make it invalid
    el.values = { user_name: '' };
    await el.updateComplete;

    const isValid = el.validate();
    expect(isValid).to.be.false;
  });

  it('returns true for validation when all required fields have values', async () => {
    const el = await fixture(html`
      <jinja-editor .variables=${sampleVariables}></jinja-editor>
    `);

    const isValid = el.validate();
    expect(isValid).to.be.true;
  });

  it('supports custom CSS classes', async () => {
    const el = await fixture(html`<jinja-editor class="custom-class"></jinja-editor>`);

    expect(el).to.have.class('custom-class');
  });

  it('supports inline styles', async () => {
    const el = await fixture(html`<jinja-editor style="font-size: 14px;"></jinja-editor>`);

    expect(el.style.fontSize).to.equal('14px');
  });

  it('handles large number of variables efficiently', async () => {
    const manyVariables: Jinja2Variable[] = Array.from({ length: 50 }, (_, i) => ({
      name: `variable_${i}`,
      type: 'string' as Jinja2VariableType,
      description: `Variable ${i}`,
      isRequired: i % 3 === 0 // Make every 3rd variable required
    }));

    const el = await fixture(html`
      <jinja-editor .variables=${manyVariables}></jinja-editor>
    `);

    const variableInputs = el.shadowRoot!.querySelectorAll('jinja-variable-input');
    expect(variableInputs.length).to.equal(50);

    const variableCount = el.shadowRoot!.querySelector('.variable-count');
    expect(variableCount?.textContent?.trim()).to.equal('50 variables');
  });

  it('maintains proper component hierarchy', async () => {
    const el = await fixture(html`
      <jinja-editor .variables=${sampleVariables}></jinja-editor>
    `);

    const container = el.shadowRoot!.querySelector('.editor-container');
    const header = el.shadowRoot!.querySelector('.editor-header');
    const main = el.shadowRoot!.querySelector('.editor-main');

    expect(container).to.exist;
    expect(header).to.exist;
    expect(main).to.exist;

    expect(container).to.contain(header);
    expect(container).to.contain(main);
  });

  it('removes event listeners on disconnect', async () => {
    const el = await fixture(html`
      <jinja-editor .variables=${sampleVariables}></jinja-editor>
    `);

    // Spy on removeEventListener calls
    const originalRemove = EventTarget.prototype.removeEventListener;
    const removeSpy = sinon.spy(EventTarget.prototype, 'removeEventListener');

    el.disconnectedCallback();

    expect(removeSpy).to.have.been.called;

    // Restore original method
    EventTarget.prototype.removeEventListener = originalRemove;
  });

  it('handles rapid property changes efficiently', async () => {
    const el = await fixture(html`<jinja-editor></jinja-editor>`);

    // Rapidly change properties
    for (let i = 0; i < 10; i++) {
      el.template = `SELECT * FROM table_${i}`;
      el.values = { [`var_${i}`]: `value_${i}` };
    }

    await el.updateComplete;

    // Should settle to the last values
    expect(el.template).to.equal('SELECT * FROM table_9');
    expect(el.values).to.deep.equal({ var_9: 'value_9' });
  });

  it('provides consistent API surface', async () => {
    const el = await fixture(html`
      <jinja-editor .variables=${sampleVariables}></jinja-editor>
    `);

    // Check that all expected methods exist
    expect(typeof el.getValues).to.equal('function');
    expect(typeof el.setValues).to.equal('function');
    expect(typeof el.getRenderedSQL).to.equal('function');
    expect(typeof el.resetValues).to.equal('function');
    expect(typeof el.clearValues).to.equal('function');
    expect(typeof el.validate).to.equal('function');
  });
});