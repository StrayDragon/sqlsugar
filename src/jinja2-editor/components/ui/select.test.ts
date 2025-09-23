import { fixture, html, expect } from '@open-wc/testing';
import { JinjaSelect } from './select.js';

describe('JinjaSelect', () => {
  const sampleOptions = [
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2' },
    { value: 'option3', label: 'Option 3' }
  ];

  it('registers as a custom element', () => {
    expect(customElements.get('jinja-select')).to.exist;
  });

  it('renders with default properties', async () => {
    const el = await fixture(html`<jinja-select></jinja-select>`);

    expect(el).to.exist;
    expect(el.value).to.equal('');
    expect(el.options).to.deep.equal([]);
    expect(el.disabled).to.be.false;
    expect(el.required).to.be.false;
    expect(el.placeholder).to.equal('Select an option');
  });

  it('renders with options', async () => {
    const el = await fixture(html`<jinja-select .options=${sampleOptions}></jinja-select>`);

    const select = el.shadowRoot!.querySelector('select');
    const options = select!.querySelectorAll('option');

    expect(options.length).to.equal(3);
    expect(options[0].value).to.equal('option1');
    expect(options[0].textContent?.trim()).to.equal('Option 1');
    expect(options[1].value).to.equal('option2');
    expect(options[1].textContent?.trim()).to.equal('Option 2');
    expect(options[2].value).to.equal('option3');
    expect(options[2].textContent?.trim()).to.equal('Option 3');
  });

  it('shows placeholder when no value is selected', async () => {
    const el = await fixture(html`<jinja-select .options=${sampleOptions} placeholder="Choose one"></jinja-select>`);

    const select = el.shadowRoot!.querySelector('select');
    const firstOption = select!.querySelector('option');

    expect(firstOption).to.have.value('');
    expect(firstOption?.textContent?.trim()).to.equal('Choose one');
    expect(firstOption).to.have.attribute('disabled');
    expect(firstOption).to.have.attribute('selected');
  });

  it('selects correct option when value is set', async () => {
    const el = await fixture(html`<jinja-select .options=${sampleOptions} value="option2"></jinja-select>`);

    const select = el.shadowRoot!.querySelector('select');
    expect(select).to.have.value('option2');
  });

  it('disables select when disabled property is true', async () => {
    const el = await fixture(html`<jinja-select .options=${sampleOptions} disabled></jinja-select>`);

    const select = el.shadowRoot!.querySelector('select');
    expect(select).to.be.disabled;
    expect(el).to.have.class('disabled');
  });

  it('applies required state styling', async () => {
    const el = await fixture(html`<jinja-select .options=${sampleOptions} required></jinja-select>`);

    const select = el.shadowRoot!.querySelector('select');
    expect(select).to.have.attribute('required');
    expect(el).to.have.class('required');
  });

  it('emits change event when option is selected', async () => {
    const el = await fixture(html`<jinja-select .options=${sampleOptions}></jinja-select>`);
    const changeSpy = sinon.spy();

    el.addEventListener('change', changeSpy);

    const select = el.shadowRoot!.querySelector('select')!;
    select.value = 'option2';
    select.dispatchEvent(new Event('change'));

    expect(changeSpy).to.have.been.calledOnce;
    expect(el.value).to.equal('option2');
  });

  it('emits input event when option is selected', async () => {
    const el = await fixture(html`<jinja-select .options=${sampleOptions}></jinja-select>`);
    const inputSpy = sinon.spy();

    el.addEventListener('input', inputSpy);

    const select = el.shadowRoot!.querySelector('select')!;
    select.value = 'option3';
    select.dispatchEvent(new Event('input'));

    expect(inputSpy).to.have.been.calledOnce;
    expect(el.value).to.equal('option3');
  });

  it('updates value when property is changed programmatically', async () => {
    const el = await fixture(html`<jinja-select .options=${sampleOptions}></jinja-select>`);

    el.value = 'option1';
    await el.updateComplete;

    const select = el.shadowRoot!.querySelector('select');
    expect(select).to.have.value('option1');
  });

  it('updates options when options property is changed', async () => {
    const el = await fixture(html`<jinja-select .options=${sampleOptions}></jinja-select>`);
    const newOptions = [
      { value: 'new1', label: 'New Option 1' },
      { value: 'new2', label: 'New Option 2' }
    ];

    el.options = newOptions;
    await el.updateComplete;

    const select = el.shadowRoot!.querySelector('select');
    const options = select!.querySelectorAll('option');

    expect(options.length).to.equal(2); // Including placeholder
    expect(options[1].value).to.equal('new1');
    expect(options[1].textContent?.trim()).to.equal('New Option 1');
    expect(options[2].value).to.equal('new2');
    expect(options[2].textContent?.trim()).to.equal('New Option 2');
  });

  it('handles empty options array', async () => {
    const el = await fixture(html`<jinja-select .options=${[]}></jinja-select>`);

    const select = el.shadowRoot!.querySelector('select');
    const options = select!.querySelectorAll('option');

    expect(options.length).to.equal(1); // Only placeholder
    expect(options[0].value).to.equal('');
    expect(options[0].textContent?.trim()).to.equal('Select an option');
  });

  it('clears value when options are updated and current value is not in new options', async () => {
    const el = await fixture(html`<jinja-select .options=${sampleOptions} value="option2"></jinja-select>`);

    const newOptions = [
      { value: 'new1', label: 'New Option 1' },
      { value: 'new2', label: 'New Option 2' }
    ];

    el.options = newOptions;
    await el.updateComplete;

    expect(el.value).to.equal('');
  });

  it('preserves value when options are updated and current value is still in new options', async () => {
    const el = await fixture(html`<jinja-select .options=${sampleOptions} value="option1"></jinja-select>`);

    const newOptions = [
      { value: 'option1', label: 'Option 1' },
      { value: 'new2', label: 'New Option 2' }
    ];

    el.options = newOptions;
    await el.updateComplete;

    expect(el.value).to.equal('option1');
  });

  it('emits focus event when select is focused', async () => {
    const el = await fixture(html`<jinja-select .options=${sampleOptions}></jinja-select>`);
    const focusSpy = sinon.spy();

    el.addEventListener('focus', focusSpy);

    const select = el.shadowRoot!.querySelector('select')!;
    select.dispatchEvent(new Event('focus'));

    expect(focusSpy).to.have.been.calledOnce;
  });

  it('emits blur event when select loses focus', async () => {
    const el = await fixture(html`<jinja-select .options=${sampleOptions}></jinja-select>`);
    const blurSpy = sinon.spy();

    el.addEventListener('blur', blurSpy);

    const select = el.shadowRoot!.querySelector('select')!;
    select.dispatchEvent(new Event('blur'));

    expect(blurSpy).to.have.been.calledOnce;
  });

  it('has proper ARIA attributes', async () => {
    const el = await fixture(html`<jinja-select .options=${sampleOptions} required></jinja-select>`);

    const select = el.shadowRoot!.querySelector('select');
    expect(select).to.have.attribute('aria-required', 'true');
  });

  it('supports custom CSS classes', async () => {
    const el = await fixture(html`<jinja-select class="custom-class"></jinja-select>`);

    expect(el).to.have.class('custom-class');
  });

  it('supports inline styles', async () => {
    const el = await fixture(html`<jinja-select style="width: 200px;"></jinja-select>`);

    expect(el.style.width).to.equal('200px');
  });

  it('handles options with same values but different labels', async () => {
    const optionsWithSameValues = [
      { value: 'option1', label: 'First Option' },
      { value: 'option1', label: 'Second Option' }
    ];

    const el = await fixture(html`<jinja-select .options=${optionsWithSameValues}></jinja-select>`);

    const select = el.shadowRoot!.querySelector('select');
    const options = select!.querySelectorAll('option');

    expect(options.length).to.equal(3); // Including placeholder
    expect(options[1].value).to.equal('option1');
    expect(options[1].textContent?.trim()).to.equal('First Option');
    expect(options[2].value).to.equal('option1');
    expect(options[2].textContent?.trim()).to.equal('Second Option');
  });

  it('prevents selection when disabled', async () => {
    const el = await fixture(html`<jinja-select .options=${sampleOptions} disabled></jinja-select>`);
    const changeSpy = sinon.spy();

    el.addEventListener('change', changeSpy);

    const select = el.shadowRoot!.querySelector('select')!;
    select.value = 'option2';
    select.dispatchEvent(new Event('change'));

    expect(changeSpy).not.to.have.been.called;
    expect(el.value).to.equal('');
  });

  it('gets selected option details', async () => {
    const el = await fixture(html`<jinja-select .options=${sampleOptions} value="option2"></jinja-select>`);

    const selectedOption = el.getSelectedOption();
    expect(selectedOption).to.deep.equal({ value: 'option2', label: 'Option 2' });
  });

  it('returns undefined for selected option when no value is selected', async () => {
    const el = await fixture(html`<jinja-select .options=${sampleOptions}></jinja-select>`);

    const selectedOption = el.getSelectedOption();
    expect(selectedOption).to.be.undefined;
  });

  it('clears selection when clear method is called', async () => {
    const el = await fixture(html`<jinja-select .options=${sampleOptions} value="option2"></jinja-select>`);

    el.clear();
    await el.updateComplete;

    const select = el.shadowRoot!.querySelector('select');
    expect(select).to.have.value('');
    expect(el.value).to.equal('');
  });

  it('focuses select when focus method is called', async () => {
    const el = await fixture(html`<jinja-select .options=${sampleOptions}></jinja-select>`);
    const select = el.shadowRoot!.querySelector('select')!;
    const focusSpy = sinon.spy(select, 'focus');

    el.focus();

    expect(focusSpy).to.have.been.calledOnce;
  });

  it('validates required field on blur', async () => {
    const el = await fixture(html`<jinja-select .options=${sampleOptions} required></jinja-select>`);

    const select = el.shadowRoot!.querySelector('select')!;
    select.dispatchEvent(new Event('blur'));

    await el.updateComplete;

    // Should show validation message for empty required field
    expect(select.checkValidity()).to.be.false;
  });

  it('removes event listeners on disconnect', async () => {
    const el = await fixture(html`<jinja-select .options=${sampleOptions}></jinja-select>`);
    const removeSpy = sinon.spy();

    // Spy on the removeEventListener method of the select
    const select = el.shadowRoot!.querySelector('select')!;
    const originalRemove = select.removeEventListener;
    select.removeEventListener = removeSpy;

    el.disconnectedCallback();

    expect(removeSpy).to.have.been.called;

    // Restore original method
    select.removeEventListener = originalRemove;
  });

  it('handles options with special characters', async () => {
    const specialOptions = [
      { value: 'option-1', label: 'Option & "Special"' },
      { value: 'option_2', label: 'Option < Special >' },
      { value: 'option 3', label: 'Option \'Special\'' }
    ];

    const el = await fixture(html`<jinja-select .options=${specialOptions}></jinja-select>`);

    const select = el.shadowRoot!.querySelector('select');
    const options = select!.querySelectorAll('option');

    expect(options.length).to.equal(4); // Including placeholder
    expect(options[1].value).to.equal('option-1');
    expect(options[1].textContent?.trim()).to.equal('Option & "Special"');
    expect(options[2].value).to.equal('option_2');
    expect(options[2].textContent?.trim()).to.equal('Option < Special >');
    expect(options[3].value).to.equal('option 3');
    expect(options[3].textContent?.trim()).to.equal('Option \'Special\'');
  });
});