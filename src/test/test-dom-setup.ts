/**
 * Test DOM Setup for Node.js Environment
 *
 * This file provides basic DOM APIs needed for testing web components in Node.js
 */

// Basic DOM element mock
class MockElement {
    tagName: string;
    attributes: Record<string, string> = {};
    children: MockElement[] = [];
    parentNode: MockElement | null = null;
    textContent: string = '';
    innerHTML: string = '';
    className: string = '';
    id: string = '';

    constructor(tagName: string) {
        this.tagName = tagName.toUpperCase();
    }

    setAttribute(name: string, value: string) {
        this.attributes[name] = value;
    }

    getAttribute(name: string): string | null {
        return this.attributes[name] || null;
    }

    hasAttribute(name: string): boolean {
        return name in this.attributes;
    }

    removeAttribute(name: string) {
        delete this.attributes[name];
    }

    appendChild(child: MockElement) {
        child.parentNode = this;
        this.children.push(child);
    }

    removeChild(child: MockElement) {
        const index = this.children.indexOf(child);
        if (index > -1) {
            this.children.splice(index, 1);
            child.parentNode = null;
        }
    }

    addEventListener(event: string, handler: Function) {
        // Simple event listener simulation
    }

    removeEventListener(event: string, handler: Function) {
        // Simple event listener simulation
    }

    dispatchEvent(event: Event): boolean {
        return true;
    }

    get classList() {
        return {
            add: (className: string) => {
                if (this.className) {
                    this.className += ' ' + className;
                } else {
                    this.className = className;
                }
            },
            remove: (className: string) => {
                this.className = this.className
                    .split(' ')
                    .filter(c => c !== className)
                    .join(' ');
            },
            contains: (className: string) => {
                return this.className.split(' ').includes(className);
            }
        };
    }

    get shadowRoot() {
        return this;
    }

    querySelector(selector: string): MockElement | null {
        // Simple selector simulation
        if (selector.startsWith('.')) {
            const className = selector.slice(1);
            return this.children.find(child => child.className.includes(className)) || null;
        }
        return null;
    }

    querySelectorAll(selector: string): MockElement[] {
        // Simple selector simulation
        if (selector.startsWith('.')) {
            const className = selector.slice(1);
            return this.children.filter(child => child.className.includes(className));
        }
        return [];
    }

    cloneNode(deep?: boolean): MockElement {
        const clone = new MockElement(this.tagName);
        clone.tagName = this.tagName;
        clone.attributes = { ...this.attributes };
        clone.textContent = this.textContent;
        clone.innerHTML = this.innerHTML;
        clone.className = this.className;
        clone.id = this.id;
        return clone;
    }
}

// Custom elements registry
const customElements = {
    define: (tagName: string, elementClass: any) => {
        // Store the custom element definition
        (globalThis as any).customElementsRegistry = (globalThis as any).customElementsRegistry || {};
        (globalThis as any).customElementsRegistry[tagName] = elementClass;
    },
    get: (tagName: string) => {
        return (globalThis as any).customElementsRegistry?.[tagName];
    },
    upgrade: (element: MockElement) => {
        // Upgrade element to custom element
    }
};

// Event mock
class Event {
    type: string;
    bubbles: boolean;
    cancelable: boolean;
    defaultPrevented: boolean = false;

    constructor(type: string, options?: { bubbles?: boolean; cancelable?: boolean }) {
        this.type = type;
        this.bubbles = options?.bubbles || false;
        this.cancelable = options?.cancelable || false;
    }

    preventDefault() {
        this.defaultPrevented = true;
    }
}

// Document mock
class Document extends MockElement {
    constructor() {
        super('document');
    }

    createElement(tagName: string): MockElement {
        return new MockElement(tagName);
    }

    createElementNS(namespace: string, tagName: string): MockElement {
        return new MockElement(tagName);
    }

    createTextNode(text: string): Text {
        return new Text(text);
    }

    getElementById(id: string): MockElement | null {
        // Simple implementation for testing
        return null;
    }

    querySelector(selector: string): MockElement | null {
        return null;
    }

    querySelectorAll(selector: string): MockElement[] {
        return [];
    }
}

// Text node mock
class Text {
    nodeValue: string;

    constructor(text: string) {
        this.nodeValue = text;
    }
}

// Window mock
const window = {
    navigator: {
        userAgent: 'Node.js Test Environment',
        clipboard: {
            writeText: async (text: string) => {
                // Mock clipboard write
                console.log('Clipboard writeText:', text);
            },
            readText: async () => {
                return 'Mock clipboard content';
            }
        }
    },
    document: new Document(),
    location: {
        href: 'about:blank'
    },
    alert: (message: string) => {
        console.log('Alert:', message);
    },
    setTimeout: globalThis.setTimeout,
    clearTimeout: globalThis.clearTimeout,
    setInterval: globalThis.setInterval,
    clearInterval: globalThis.clearInterval
};

// Navigator mock
const navigator = window.navigator;

// Setup global variables for testing
if (typeof globalThis !== 'undefined') {
    (globalThis as any).window = window;
    (globalThis as any).document = window.document;
    (globalThis as any).navigator = navigator;
    (globalThis as any).customElements = customElements;
    (globalThis as any).Event = Event;
    (globalThis as any).Text = Text;
}

export { MockElement, customElements, Event, Text, Document, window, navigator };

// Export for CommonJS environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { MockElement, customElements, Event, Text, Document, window, navigator };
}