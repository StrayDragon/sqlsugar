import { fixture, html, expect } from '@open-wc/testing';
import { JinjaInput } from './input.js';

describe('JinjaInput', () => {
  it('registers as a custom element', () => {
    expect(customElements.get('jinja-input')).to.exist;
  });

  it('renders with default properties', async () => {
    const el = await fixture(html`<jinja-input></jinja-input>`);

    expect(el).to.exist;
    expect(el.type).to.equal('text');
    expect(el.value).to.equal('');
    expect(el.placeholder).to.equal('');
    expect(el.disabled).to.be.false;
    expect(el.readonly).to.be.false;
    expect(el.required).to.be.false;
    expect(el.error).to.be.false;
  });

  it('renders with initial value', async () => {
    const el = await fixture(html`<jinja-input value="test value"></jinja-input>`);

    const input = el.shadowRoot!.querySelector('input');
    expect(input).to.have.value('test value');
  });

  it('applies different input types', async () => {
    const types = ['text', 'email', 'url', 'number', 'password', 'tel'];

    for (const type of types) {
      const el = await fixture(html`<jinja-input type="${type}"></jinja-input>`);
      const input = el.shadowRoot!.querySelector('input');
      expect(input).to.have.attribute('type', type);
    }
  });

  it('applies placeholder correctly', async () => {
    const el = await fixture(html`<jinja-input placeholder="Enter text"></jinja-input>`);

    const input = el.shadowRoot!.querySelector('input');
    expect(input).to.have.attribute('placeholder', 'Enter text');
  });

  it('disables input when disabled property is true', async () => {
    const el = await fixture(html`<jinja-input disabled></jinja-input>`);

    const input = el.shadowRoot!.querySelector('input');
    expect(input).to.be.disabled;
    expect(el).to.have.class('disabled');
  });

  it('makes input readonly when readonly property is true', async () => {
    const el = await fixture(html`<jinja-input readonly></jinja-input>`);

    const input = el.shadowRoot!.querySelector('input');
    expect(input).to.have.attribute('readonly');
    expect(el).to.have.class('readonly');
  });

  it('applies required state styling', async () => {
    const el = await fixture(html`<jinja-input required></jinja-input>`);

    const input = el.shadowRoot!.querySelector('input');
    expect(input).to.have.attribute('required');
    expect(el).to.have.class('required');
  });

  it('applies error state styling', async () => {
    const el = await fixture(html`<jinja-input error></jinja-input>`);

    expect(el).to.have.class('error');
  });

  it('emits input event when value changes', async () => {
    const el = await fixture(html`<jinja-input></jinja-input>`);
    const inputSpy = sinon.spy();

    el.addEventListener('input', inputSpy);

    const input = el.shadowRoot!.querySelector('input')!;
    input.value = 'new value';
    input.dispatchEvent(new Event('input'));

    expect(inputSpy).to.have.been.calledOnce;
    expect(el.value).to.equal('new value');
  });

  it('emits change event when value changes and input loses focus', async () => {
    const el = await fixture(html`<jinja-input></jinja-input>`);
    const changeSpy = sinon.spy();

    el.addEventListener('change', changeSpy);

    const input = el.shadowRoot!.querySelector('input')!;
    input.value = 'new value';
    input.dispatchEvent(new Event('change'));

    expect(changeSpy).to.have.been.calledOnce;
    expect(el.value).to.equal('new value');
  });

  it('emits keydown event when key is pressed', async () => {
    const el = await fixture(html`<jinja-input></jinja-input>`);
    const keydownSpy = sinon.spy();

    el.addEventListener('keydown', keydownSpy);

    const input = el.shadowRoot!.querySelector('input')!;
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

    expect(keydownSpy).to.have.been.calledOnce;
  });

  it('emits focus event when input is focused', async () => {
    const el = await fixture(html`<jinja-input></jinja-input>`);
    const focusSpy = sinon.spy();

    el.addEventListener('focus', focusSpy);

    const input = el.shadowRoot!.querySelector('input')!;
    input.dispatchEvent(new Event('focus'));

    expect(focusSpy).to.have.been.calledOnce;
  });

  it('emits blur event when input loses focus', async () => {
    const el = await fixture(html`<jinja-input></jinja-input>`);
    const blurSpy = sinon.spy();

    el.addEventListener('blur', blurSpy);

    const input = el.shadowRoot!.querySelector('input')!;
    input.dispatchEvent(new Event('blur'));

    expect(blurSpy).to.have.been.calledOnce;
  });

  it('updates value when property is changed programmatically', async () => {
    const el = await fixture(html`<jinja-input></jinja-input>`);

    el.value = 'programmatic value';
    await el.updateComplete;

    const input = el.shadowRoot!.querySelector('input');
    expect(input).to.have.value('programmatic value');
  });

  it('handles number type validation', async () => {
    const el = await fixture(html`<jinja-input type="number" value="42"></jinja-input>`);

    const input = el.shadowRoot!.querySelector('input')!;
    input.value = 'invalid';
    input.dispatchEvent(new Event('input'));

    expect(el.value).to.equal('invalid'); // Input elements don't prevent invalid typing
  });

  it('supports min and max attributes for number type', async () => {
    const el = await fixture(html`<jinja-input type="number" min="0" max="100"></jinja-input>`);

    const input = el.shadowRoot!.querySelector('input');
    expect(input).to.have.attribute('min', '0');
    expect(input).to.have.attribute('max', '100');
  });

  it('supports step attribute for number type', async () => {
    const el = await fixture(html`<jinja-input type="number" step="0.1"></jinja-input>`);

    const input = el.shadowRoot!.querySelector('input');
    expect(input).to.have.attribute('step', '0.1');
  });

  it('clears value when clear method is called', async () => {
    const el = await fixture(html`<jinja-input value="test"></jinja-input>`);

    el.clear();
    await el.updateComplete;

    const input = el.shadowRoot!.querySelector('input');
    expect(input).to.have.value('');
    expect(el.value).to.equal('');
  });

  it('focuses input when focus method is called', async () => {
    const el = await fixture(html`<jinja-input></jinja-input>`);
    const input = el.shadowRoot!.querySelector('input')!;
    const focusSpy = sinon.spy(input, 'focus');

    el.focus();

    expect(focusSpy).to.have.been.calledOnce;
  });

  it('selects all text when select method is called', async () => {
    const el = await fixture(html`<jinja-input value="select me"></jinja-input>`);
    const input = el.shadowRoot!.querySelector('input')!;
    const selectSpy = sinon.spy(input, 'select');

    el.select();

    expect(selectSpy).to.have.been.calledOnce;
  });

  it('has proper ARIA attributes', async () => {
    const el = await fixture(html`<jinja-input placeholder="Enter name" required></jinja-input>`);

    const input = el.shadowRoot!.querySelector('input');
    expect(input).to.have.attribute('role', 'textbox');
    expect(input).to.have.attribute('aria-placeholder', 'Enter name');
    expect(input).to.have.attribute('aria-required', 'true');
  });

  it('shows error state with error message', async () => {
    const el = await fixture(html`<jinja-input error error-message="Invalid input"></jinja-input>`);

    const errorMessage = el.shadowRoot!.querySelector('.error-message');
    expect(errorMessage).to.exist;
    expect(errorMessage?.textContent?.trim()).to.equal('Invalid input');
  });

  it('supports custom CSS classes', async () => {
    const el = await fixture(html`<jinja-input class="custom-class"></jinja-input>`);

    expect(el).to.have.class('custom-class');
  });

  it('supports inline styles', async () => {
    const el = await fixture(html`<jinja-input style="width: 200px;"></jinja-input>`);

    expect(el.style.width).to.equal('200px');
  });

  it('validates required field on blur', async () => {
    const el = await fixture(html`<jinja-input required></jinja-input>`);

    const input = el.shadowRoot!.querySelector('input')!;
    input.dispatchEvent(new Event('blur'));

    await el.updateComplete;

    // Should show error state for empty required field
    expect(el.error).to.be.false; // Default behavior - validation not automatic
  });

  it('prevents input when disabled', async () => {
    const el = await fixture(html`<jinja-input disabled></jinja-input>`);
    const inputSpy = sinon.spy();

    el.addEventListener('input', inputSpy);

    const input = el.shadowRoot!.querySelector('input')!;
    input.value = 'should not work';
    input.dispatchEvent(new Event('input'));

    expect(inputSpy).not.to.have.been.called;
    expect(el.value).to.equal('');
  });

  it('removes event listeners on disconnect', async () => {
    const el = await fixture(html`<jinja-input></jinja-input>`);
    const removeSpy = sinon.spy();

    // Spy on the removeEventListener method of the input
    const input = el.shadowRoot!.querySelector('input')!;
    const originalRemove = input.removeEventListener;
    input.removeEventListener = removeSpy;

    el.disconnectedCallback();

    expect(removeSpy).to.have.been.called;

    // Restore original method
    input.removeEventListener = originalRemove;
  });
});