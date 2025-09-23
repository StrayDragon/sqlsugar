import { fixture, html, expect } from '@open-wc/testing';
import { JinjaVariableInput } from './variable-input.js';
import type { Jinja2Variable, Jinja2VariableType } from '../types.js';

describe('JinjaVariableInput', () => {
  const sampleVariable: Jinja2Variable = {
    name: 'user_name',
    type: 'string',
    description: 'The name of the user',
    isRequired: true,
    filters: ['default', 'trim']
  };

  const booleanVariable: Jinja2Variable = {
    name: 'is_active',
    type: 'boolean',
    description: 'Whether the user is active',
    isRequired: false
  };

  const numberVariable: Jinja2Variable = {
    name: 'user_age',
    type: 'number',
    description: 'The age of the user',
    isRequired: true
  };

  it('registers as a custom element', () => {
    expect(customElements.get('jinja-variable-input')).to.exist;
  });

  it('renders with default properties', async () => {
    const el = await fixture(html`<jinja-variable-input .variable=${sampleVariable}></jinja-variable-input>`);

    expect(el).to.exist;
    expect(el.variable).to.deep.equal(sampleVariable);
    expect(el.value).to.be.undefined;
    expect(el.showFilters).to.be.false;
  });

  it('displays variable name and type badge', async () => {
    const el = await fixture(html`<jinja-variable-input .variable=${sampleVariable}></jinja-variable-input>`);

    const nameElement = el.shadowRoot!.querySelector('.variable-name');
    const typeBadge = el.shadowRoot!.querySelector('.type-badge');

    expect(nameElement?.textContent?.trim()).to.equal('user_name');
    expect(typeBadge?.textContent?.trim()).to.equal('text');
  });

  it('shows required indicator for required variables', async () => {
    const el = await fixture(html`<jinja-variable-input .variable=${sampleVariable}></jinja-variable-input>`);

    const requiredIndicator = el.shadowRoot!.querySelector('.required-indicator');
    expect(requiredIndicator).to.exist;
    expect(requiredIndicator?.textContent?.trim()).to.equal('*');
  });

  it('does not show required indicator for optional variables', async () => {
    const el = await fixture(html`<jinja-variable-input .variable=${booleanVariable}></jinja-variable-input>`);

    const requiredIndicator = el.shadowRoot!.querySelector('.required-indicator');
    expect(requiredIndicator).not.to.exist;
  });

  it('displays variable description', async () => {
    const el = await fixture(html`<jinja-variable-input .variable=${sampleVariable}></jinja-variable-input>`);

    const description = el.shadowRoot!.querySelector('.variable-description');
    expect(description?.textContent?.trim()).to.equal('The name of the user');
  });

  it('does not display description when not provided', async () => {
    const variableWithoutDesc: Jinja2Variable = {
      name: 'simple_var',
      type: 'string',
      isRequired: false
    };

    const el = await fixture(html`<jinja-variable-input .variable=${variableWithoutDesc}></jinja-variable-input>`);

    const description = el.shadowRoot!.querySelector('.variable-description');
    expect(description).not.to.exist;
  });

  it('renders type selector with all available types', async () => {
    const el = await fixture(html`<jinja-variable-input .variable=${sampleVariable}></jinja-variable-input>`);

    const typeSelector = el.shadowRoot!.querySelector('jinja-select');
    expect(typeSelector).to.exist;
  });

  it('renders text input for string type', async () => {
    const el = await fixture(html`<jinja-variable-input .variable=${sampleVariable}></jinja-variable-input>`);

    const valueInput = el.shadowRoot!.querySelector('jinja-input');
    expect(valueInput).to.exist;
    expect(valueInput).to.have.attribute('type', 'text');
  });

  it('renders select for boolean type', async () => {
    const el = await fixture(html`<jinja-variable-input .variable=${booleanVariable}></jinja-variable-input>`);

    const valueSelect = el.shadowRoot!.querySelector('jinja-select');
    expect(valueSelect).to.exist;
  });

  it('renders disabled input for null type', async () => {
    const nullVariable: Jinja2Variable = {
      name: 'null_value',
      type: 'null',
      isRequired: false
    };

    const el = await fixture(html`<jinja-variable-input .variable=${nullVariable}></jinja-variable-input>`);

    const valueInput = el.shadowRoot!.querySelector('jinja-input');
    expect(valueInput).to.exist;
    expect(valueInput).to.have.attribute('disabled');
  });

  it('shows quick options for string type', async () => {
    const el = await fixture(html`<jinja-variable-input .variable=${sampleVariable}></jinja-variable-input>`);

    const quickOptions = el.shadowRoot!.querySelector('.quick-options');
    expect(quickOptions).to.exist;

    const buttons = quickOptions!.querySelectorAll('.quick-option-btn');
    expect(buttons.length).to.be.greaterThan(0);
  });

  it('shows quick options for number type', async () => {
    const el = await fixture(html`<jinja-variable-input .variable=${numberVariable}></jinja-variable-input>`);

    const quickOptions = el.shadowRoot!.querySelector('.quick-options');
    expect(quickOptions).to.exist;

    const buttons = quickOptions!.querySelectorAll('.quick-option-btn');
    expect(buttons.length).to.be.greaterThan(0);
  });

  it('shows filters section when variable has filters', async () => {
    const el = await fixture(html`<jinja-variable-input .variable=${sampleVariable}></jinja-variable-input>`);

    const filtersSection = el.shadowRoot!.querySelector('.filters-section');
    expect(filtersSection).to.exist;

    const filterTags = filtersSection!.querySelectorAll('.filter-tag');
    expect(filterTags.length).to.equal(2);
    expect(filterTags[0].textContent?.trim()).to.equal('default');
    expect(filterTags[1].textContent?.trim()).to.equal('trim');
  });

  it('does not show filters section when no filters', async () => {
    const el = await fixture(html`<jinja-variable-input .variable=${booleanVariable}></jinja-variable-input>`);

    const filtersSection = el.shadowRoot!.querySelector('.filters-section');
    expect(filtersSection).not.to.exist;
  });

  it('toggles filters visibility when toggle button is clicked', async () => {
    const el = await fixture(html`<jinja-variable-input .variable=${sampleVariable}></jinja-variable-input>`);

    const toggleButton = el.shadowRoot!.querySelector('.filters-toggle');
    const filtersList = el.shadowRoot!.querySelector('.filters-list');

    // Initially hidden
    expect(filtersList).not.to.exist;

    // Click to show
    toggleButton!.click();
    await el.updateComplete;

    const visibleFiltersList = el.shadowRoot!.querySelector('.filters-list');
    expect(visibleFiltersList).to.exist;
    expect(toggleButton?.textContent?.trim()).to.equal('Hide');

    // Click to hide
    toggleButton!.click();
    await el.updateComplete;

    const hiddenFiltersList = el.shadowRoot!.querySelector('.filters-list');
    expect(hiddenFiltersList).not.to.exist;
    expect(toggleButton?.textContent?.trim()).to.equal('Show');
  });

  it('emits change event when value is changed', async () => {
    const el = await fixture(html`<jinja-variable-input .variable=${sampleVariable}></jinja-variable-input>`);
    const changeSpy = sinon.spy();

    el.addEventListener('change', changeSpy);

    // Simulate input change
    const input = el.shadowRoot!.querySelector('jinja-input')!;
    input.dispatchEvent(new CustomEvent('input', {
      detail: { value: 'new_value' },
      bubbles: true,
      composed: true
    }));

    expect(changeSpy).to.have.been.calledOnce;
    const detail = changeSpy.firstCall.args[0].detail;
    expect(detail.name).to.equal('user_name');
    expect(detail.value).to.equal('new_value');
    expect(detail.type).to.equal('string');
  });

  it('emits change event when type is changed', async () => {
    const el = await fixture(html`<jinja-variable-input .variable=${sampleVariable}></jinja-variable-input>`);
    const changeSpy = sinon.spy();

    el.addEventListener('change', changeSpy);

    // Simulate type change
    const typeSelector = el.shadowRoot!.querySelector('jinja-select')!;
    typeSelector.dispatchEvent(new CustomEvent('change', {
      detail: { value: 'number' },
      bubbles: true,
      composed: true
    }));

    expect(changeSpy).to.have.been.calledOnce;
    const detail = changeSpy.firstCall.args[0].detail;
    expect(detail.name).to.equal('user_name');
    expect(detail.type).to.equal('number');
    expect(detail.value).to.equal(42); // Default number value
  });

  it('removes filter when remove button is clicked', async () => {
    const el = await fixture(html`<jinja-variable-input .variable=${sampleVariable}></jinja-variable-input>`);

    // Show filters
    const toggleButton = el.shadowRoot!.querySelector('.filters-toggle')!;
    toggleButton.click();
    await el.updateComplete;

    const removeButton = el.shadowRoot!.querySelector('.filter-tag .remove')!;
    removeButton.click();
    await el.updateComplete;

    const updatedVariable = el.variable;
    expect(updatedVariable.filters).to.deep.equal(['trim']); // 'default' removed
  });

  it('shows validation error for required field when empty', async () => {
    const el = await fixture(html`<jinja-variable-input .variable=${sampleVariable} value=""></jinja-variable-input>`);

    const errorMessage = el.shadowRoot!.querySelector('.validation-message');
    expect(errorMessage).to.exist;
    expect(errorMessage?.textContent?.trim()).to.include('required');
  });

  it('shows validation error for invalid email format', async () => {
    const emailVariable: Jinja2Variable = {
      name: 'user_email',
      type: 'email',
      isRequired: true
    };

    const el = await fixture(html`<jinja-variable-input .variable=${emailVariable} value="invalid-email"></jinja-variable-input>`);

    const errorMessage = el.shadowRoot!.querySelector('.validation-message');
    expect(errorMessage).to.exist;
    expect(errorMessage?.textContent?.trim()).to.include('Invalid email format');
  });

  it('shows validation error for invalid URL format', async () => {
    const urlVariable: Jinja2Variable = {
      name: 'website_url',
      type: 'url',
      isRequired: true
    };

    const el = await fixture(html`<jinja-variable-input .variable=${urlVariable} value="not-a-url"></jinja-variable-input>`);

    const errorMessage = el.shadowRoot!.querySelector('.validation-message');
    expect(errorMessage).to.exist;
    expect(errorMessage?.textContent?.trim()).to.include('Invalid URL format');
  });

  it('shows validation error for invalid UUID format', async () => {
    const uuidVariable: Jinja2Variable = {
      name: 'user_id',
      type: 'uuid',
      isRequired: true
    };

    const el = await fixture(html`<jinja-variable-input .variable=${uuidVariable} value="invalid-uuid"></jinja-variable-input>`);

    const errorMessage = el.shadowRoot!.querySelector('.validation-message');
    expect(errorMessage).to.exist;
    expect(errorMessage?.textContent?.trim()).to.include('Invalid UUID format');
  });

  it('activates quick option button when value matches', async () => {
    const el = await fixture(html`<jinja-variable-input .variable=${sampleVariable} value="demo_string"></jinja-variable-input>`);

    const quickOptions = el.shadowRoot!.querySelector('.quick-options');
    const buttons = quickOptions!.querySelectorAll('.quick-option-btn');

    const activeButton = Array.from(buttons).find(btn => btn.textContent?.includes('demo_string'));
    expect(activeButton).to.have.class('active');
  });

  it('updates value when quick option is clicked', async () => {
    const el = await fixture(html`<jinja-variable-input .variable=${sampleVariable}></jinja-variable-input>`);

    const quickOptions = el.shadowRoot!.querySelector('.quick-options');
    const button = quickOptions!.querySelector('.quick-option-btn')!;
    button.click();
    await el.updateComplete;

    expect(el.value).to.equal('demo_string');
  });

  it('shows empty checkbox for string type', async () => {
    const el = await fixture(html`<jinja-variable-input .variable=${sampleVariable}></jinja-variable-input>`);

    const emptyCheckbox = el.shadowRoot!.querySelector('input[type="checkbox"]');
    expect(emptyCheckbox).to.exist;
    const label = emptyCheckbox!.closest('label');
    expect(label?.textContent?.trim()).to.include('Empty');
  });

  it('does not show empty checkbox for non-string types', async () => {
    const el = await fixture(html`<jinja-variable-input .variable=${numberVariable}></jinja-variable-input>`);

    const emptyCheckbox = el.shadowRoot!.querySelector('input[type="checkbox"]');
    expect(emptyCheckbox).not.to.exist;
  });

  it('handles empty string value when empty checkbox is checked', async () => {
    const el = await fixture(html`<jinja-variable-input .variable=${sampleVariable}></jinja-variable-input>`);

    const emptyCheckbox = el.shadowRoot!.querySelector('input[type="checkbox"]')!;
    emptyCheckbox.checked = true;
    emptyCheckbox.dispatchEvent(new Event('change'));
    await el.updateComplete;

    expect(el.value).to.equal('');
  });

  it('uses appropriate input types for different variable types', async () => {
    const typesToTest: Array<[Jinja2VariableType, string]> = [
      ['email', 'email'],
      ['url', 'url'],
      ['number', 'number'],
      ['integer', 'number'],
      ['string', 'text']
    ];

    for (const [varType, expectedInputType] of typesToTest) {
      const variable: Jinja2Variable = {
        name: 'test_var',
        type: varType,
        isRequired: false
      };

      const el = await fixture(html`<jinja-variable-input .variable=${variable}></jinja-variable-input>`);
      const input = el.shadowRoot!.querySelector('jinja-input');

      if (varType === 'boolean' || varType === 'null') {
        // Boolean and null use select/disabled input, not type attribute
        continue;
      }

      expect(input).to.have.attribute('type', expectedInputType);
    }
  });

  it('provides appropriate placeholders based on variable name and type', async () => {
    const el = await fixture(html`<jinja-variable-input .variable=${sampleVariable}></jinja-variable-input>`);

    const input = el.shadowRoot!.querySelector('jinja-input');
    expect(input).to.have.attribute('placeholder', 'Enter user_name (text)');
  });

  it('supports updating variable property', async () => {
    const el = await fixture(html`<jinja-variable-input .variable=${sampleVariable}></jinja-variable-input>`);

    const newVariable: Jinja2Variable = {
      ...sampleVariable,
      name: 'new_name',
      type: 'number'
    };

    el.variable = newVariable;
    await el.updateComplete;

    const nameElement = el.shadowRoot!.querySelector('.variable-name');
    expect(nameElement?.textContent?.trim()).to.equal('new_name');

    const typeBadge = el.shadowRoot!.querySelector('.type-badge');
    expect(typeBadge?.textContent?.trim()).to.equal('number');
  });

  it('supports updating value property', async () => {
    const el = await fixture(html`<jinja-variable-input .variable=${sampleVariable}></jinja-variable-input>`);

    el.value = 'new_value';
    await el.updateComplete;

    const input = el.shadowRoot!.querySelector('jinja-input');
    expect(input).to.have.value('new_value');
  });

  it('has proper error state styling', async () => {
    const el = await fixture(html`<jinja-variable-input .variable=${sampleVariable} value=""></jinja-variable-input>`);

    const variableItem = el.shadowRoot!.querySelector('.variable-item');
    expect(variableItem).to.have.class('has-error');
  });

  it('formats JSON values correctly', async () => {
    const jsonVariable: Jinja2Variable = {
      name: 'user_data',
      type: 'json',
      isRequired: false
    };

    const el = await fixture(html`<jinja-variable-input .variable=${jsonVariable} value={"key": "value"}></jinja-variable-input>`);

    const input = el.shadowRoot!.querySelector('jinja-input');
    expect(input).to.have.value('{"key": "value"}');
  });

  it('formats date values correctly', async () => {
    const dateVariable: Jinja2Variable = {
      name: 'birth_date',
      type: 'date',
      isRequired: false
    };

    const el = await fixture(html`<jinja-variable-input .variable=${dateVariable} value="2024-01-01"></jinja-variable-input>`);

    const input = el.shadowRoot!.querySelector('jinja-input');
    expect(input).to.have.value('2024-01-01');
  });

  it('shows correct type labels', async () => {
    const typeLabelTests: Array<[Jinja2VariableType, string]> = [
      ['string', 'text'],
      ['number', 'number'],
      ['integer', 'int'],
      ['boolean', 'bool'],
      ['date', 'date'],
      ['datetime', 'datetime'],
      ['json', 'json'],
      ['uuid', 'uuid'],
      ['email', 'email'],
      ['url', 'url'],
      ['null', 'null']
    ];

    for (const [varType, expectedLabel] of typeLabelTests) {
      const variable: Jinja2Variable = {
        name: 'test_var',
        type: varType,
        isRequired: false
      };

      const el = await fixture(html`<jinja-variable-input .variable=${variable}></jinja-variable-input>`);
      const typeBadge = el.shadowRoot!.querySelector('.type-badge');
      expect(typeBadge?.textContent?.trim()).to.equal(expectedLabel);
    }
  });

  it('removes event listeners on disconnect', async () => {
    const el = await fixture(html`<jinja-variable-input .variable=${sampleVariable}></jinja-variable-input>`);

    // Spy on removeEventListener calls
    const originalRemove = EventTarget.prototype.removeEventListener;
    const removeSpy = sinon.spy(EventTarget.prototype, 'removeEventListener');

    el.disconnectedCallback();

    expect(removeSpy).to.have.been.called;

    // Restore original method
    EventTarget.prototype.removeEventListener = originalRemove;
  });
});