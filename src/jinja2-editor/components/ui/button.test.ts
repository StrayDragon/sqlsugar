import { fixture, html, expect } from '@open-wc/testing';
import { JinjaButton } from './button.ts';

describe('JinjaButton', () => {
  it('registers as a custom element', () => {
    expect(customElements.get('jinja-button')).to.exist;
  });

  it('renders with default properties', async () => {
    const el = await fixture(html`<jinja-button>Test Button</jinja-button>`);

    expect(el).to.exist;
    expect(el.variant).to.equal('secondary');
    expect(el.loading).to.be.false;
    expect(el.disabled).to.be.false;
    expect(el.shadowRoot!.querySelector('button')?.textContent?.trim()).to.equal('Test Button');
  });

  it('applies primary variant styles', async () => {
    const el = await fixture(html`<jinja-button variant="primary">Primary Button</jinja-button>`);

    const button = el.shadowRoot!.querySelector('button');
    expect(button).to.have.class('variant-primary');
    expect(button).not.to.have.class('variant-secondary');
    expect(button).not.to.have.class('variant-danger');
  });

  it('applies secondary variant styles', async () => {
    const el = await fixture(html`<jinja-button variant="secondary">Secondary Button</jinja-button>`);

    const button = el.shadowRoot!.querySelector('button');
    expect(button).to.have.class('variant-secondary');
    expect(button).not.to.have.class('variant-primary');
    expect(button).not.to.have.class('variant-danger');
  });

  it('applies danger variant styles', async () => {
    const el = await fixture(html`<jinja-button variant="danger">Danger Button</jinja-button>`);

    const button = el.shadowRoot!.querySelector('button');
    expect(button).to.have.class('variant-danger');
    expect(button).not.to.have.class('variant-primary');
    expect(button).not.to.have.class('variant-secondary');
  });

  it('shows loading state correctly', async () => {
    const el = await fixture(html`<jinja-button loading>Loading Button</jinja-button>`);

    const button = el.shadowRoot!.querySelector('button');
    expect(button).to.have.class('loading');
    expect(button).to.be.disabled;
    expect(el.shadowRoot!.querySelector('.spinner')).to.exist;
  });

  it('disables button when disabled property is true', async () => {
    const el = await fixture(html`<jinja-button disabled>Disabled Button</jinja-button>`);

    const button = el.shadowRoot!.querySelector('button');
    expect(button).to.have.class('disabled');
    expect(button).to.be.disabled;
  });

  it('emits click event when clicked', async () => {
    const el = await fixture(html`<jinja-button>Click Me</jinja-button>`);
    const clickSpy = sinon.spy();

    el.addEventListener('click', clickSpy);
    el.shadowRoot!.querySelector('button')!.click();

    expect(clickSpy).to.have.been.calledOnce;
  });

  it('does not emit click event when loading', async () => {
    const el = await fixture(html`<jinja-button loading>Loading Button</jinja-button>`);
    const clickSpy = sinon.spy();

    el.addEventListener('click', clickSpy);
    el.shadowRoot!.querySelector('button')!.click();

    expect(clickSpy).not.to.have.been.called;
  });

  it('does not emit click event when disabled', async () => {
    const el = await fixture(html`<jinja-button disabled>Disabled Button</jinja-button>`);
    const clickSpy = sinon.spy();

    el.addEventListener('click', clickSpy);
    el.shadowRoot!.querySelector('button')!.click();

    expect(clickSpy).not.to.have.been.called;
  });

  it('updates properties when changed', async () => {
    const el = await fixture(html`<jinja-button>Test Button</jinja-button>`);

    el.variant = 'danger';
    el.loading = true;
    await el.updateComplete;

    const button = el.shadowRoot!.querySelector('button');
    expect(button).to.have.class('variant-danger');
    expect(button).to.have.class('loading');
    expect(el.shadowRoot!.querySelector('.spinner')).to.exist;
  });

  it('renders slot content correctly', async () => {
    const el = await fixture(html`<jinja-button><span>Slot Content</span></jinja-button>`);

    const slot = el.shadowRoot!.querySelector('slot');
    expect(slot).to.exist;

    // Check if slotted content is rendered
    const slottedContent = el.shadowRoot!.querySelector('slot')?.assignedElements()[0];
    expect(slottedContent?.textContent?.trim()).to.equal('Slot Content');
  });

  it('handles keyboard accessibility - Enter key', async () => {
    const el = await fixture(html`<jinja-button>Keyboard Test</jinja-button>`);
    const clickSpy = sinon.spy();

    el.addEventListener('click', clickSpy);

    const event = new KeyboardEvent('keydown', { key: 'Enter' });
    el.shadowRoot!.querySelector('button')!.dispatchEvent(event);

    expect(clickSpy).to.have.been.calledOnce;
  });

  it('handles keyboard accessibility - Space key', async () => {
    const el = await fixture(html`<jinja-button>Keyboard Test</jinja-button>`);
    const clickSpy = sinon.spy();

    el.addEventListener('click', clickSpy);

    const event = new KeyboardEvent('keydown', { key: ' ' });
    el.shadowRoot!.querySelector('button')!.dispatchEvent(event);

    expect(clickSpy).to.have.been.calledOnce;
  });

  it('has proper ARIA attributes', async () => {
    const el = await fixture(html`<jinja-button>Accessible Button</jinja-button>`);

    const button = el.shadowRoot!.querySelector('button');
    expect(button).to.have.attribute('role', 'button');

    // Test loading state ARIA
    el.loading = true;
    await el.updateComplete;

    const loadingButton = el.shadowRoot!.querySelector('button');
    expect(loadingButton).to.have.attribute('aria-busy', 'true');
  });

  it('supports type attribute', async () => {
    const el = await fixture(html`<jinja-button type="submit">Submit Button</jinja-button>`);

    const button = el.shadowRoot!.querySelector('button');
    expect(button).to.have.attribute('type', 'submit');
  });

  it('supports custom CSS classes', async () => {
    const el = await fixture(html`<jinja-button class="custom-class">Custom Button</jinja-button>`);

    expect(el).to.have.class('custom-class');
  });

  it('supports inline styles', async () => {
    const el = await fixture(html`<jinja-button style="margin: 10px;">Styled Button</jinja-button>`);

    expect(el.style.margin).to.equal('10px');
  });

  it('removes event listeners on disconnect', async () => {
    const el = await fixture(html`<jinja-button>Test Button</jinja-button>`);
    const removeSpy = sinon.spy();

    // Spy on the removeEventListener method of the button
    const button = el.shadowRoot!.querySelector('button')!;
    const originalRemove = button.removeEventListener;
    button.removeEventListener = removeSpy;

    el.disconnectedCallback();

    expect(removeSpy).to.have.been.called;

    // Restore original method
    button.removeEventListener = originalRemove;
  });
});