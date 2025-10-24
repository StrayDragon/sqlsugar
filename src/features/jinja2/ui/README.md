# Jinja2 Editor V2 - Next Generation Visual Template Editor

## 🎯 Overview

Jinja2 Editor V2 is a complete rewrite of the visual template editor with a focus on **direct template interaction**. Instead of editing variables in a separate panel, users can now click directly on highlighted variables in the template to edit them in-place.

## ✨ Key Features

### 🖱️ Direct Template Interaction
- **Click-to-Edit**: Click any highlighted variable to open an inline editor
- **Smart Popovers**: Context-aware editing with intelligent positioning
- **Visual Feedback**: Clear visual indicators for editable content

### 🎨 Enhanced User Experience
- **Responsive Design**: Adapts seamlessly between wide and narrow layouts
- **Real-time Preview**: See SQL changes instantly as you edit
- **Keyboard Navigation**: Full keyboard support (Tab, Enter, Escape)
- **Smooth Animations**: Polished transitions and micro-interactions

### 🧠 Intelligent Features
- **Smart Type Detection**: Automatically infer variable types from context
- **Value Suggestions**: Context-aware suggestions based on variable names
- **Error Validation**: Real-time validation with helpful error messages
- **History Tracking**: Maintain history of variable changes

### ⚡ Performance & Accessibility
- **Optimized Rendering**: Efficient template parsing and highlighting
- **Accessibility**: Full screen reader support and keyboard navigation
- **Reduced Motion**: Respects user's motion preferences
- **High Contrast**: Supports high contrast themes

## 🏗️ Architecture

### Core Components

```
src/jinja2-editor-v2/
├── components/
│   ├── jinja2-editor-v2.ts      # Main editor component
│   ├── template-highlighter.ts   # Template parsing & highlighting
│   ├── variable-popover.ts       # Inline variable editor
│   └── sql-preview-v2.ts        # Enhanced preview component
├── utils/
│   ├── template-parser.ts        # Jinja2 template parsing
│   ├── position-calculator.ts    # Smart popover positioning
│   ├── variable-state-manager.ts # Variable state management
│   └── keyboard-navigation-manager.ts # Keyboard navigation
├── config/
│   └── v2-editor-config.ts       # Configuration management
├── styles/
│   ├── animations.ts             # Animation definitions
│   └── design-system.ts          # Design tokens & mixins
├── types.ts                      # TypeScript type definitions
├── index.ts                      # Public exports
└── test/
    └── v2-editor-test.html        # Interactive test page
```

### Key Technologies

- **Lit Framework**: Modern web components with reactive properties
- **TypeScript**: Full type safety and IntelliSense support
- **CSS Grid/Flexbox**: Responsive layout system
- **Web Components**: Reusable, framework-agnostic components
- **VSCode API Integration**: Seamless editor integration

## 🚀 Getting Started

### Installation

The V2 editor is included in SQLSugar extension. Enable it via VSCode settings:

```json
{
  "sqlsugar.enableV2Editor": true
}
```

### Usage

1. **Open Command Palette** (`Ctrl+Shift+P` or `Cmd+Shift+P`)
2. **Run** `SQLSugar: Copy Jinja2 Template SQL (Visual Editor V2)`
3. **Edit** your template directly by clicking on highlighted variables
4. **Use keyboard shortcuts** for efficient navigation

### Configuration Options

```json
{
  "sqlsugar.enableV2Editor": true,
  "sqlsugar.v2Editor.popoverPlacement": "auto",
  "sqlsugar.v2Editor.highlightStyle": "background",
  "sqlsugar.v2Editor.autoPreview": true,
  "sqlsugar.v2Editor.keyboardNavigation": true,
  "sqlsugar.v2Editor.animationsEnabled": true,
  "sqlsugar.v2Editor.showSuggestions": true,
  "sqlsugar.v2Editor.autoFocusFirst": false
}
```

## 🎮 User Interface

### Layout Modes

- **Wide Layout** (>1024px): Side-by-side template and preview
- **Narrow Layout** (≤1024px): Stacked template and preview

### Highlighting Styles

- **Background**: Variable background highlighting
- **Border**: Variable border highlighting
- **Underline**: Variable underline highlighting

### View Modes

- **Split View**: See both template and rendered result
- **Rendered View**: Focus on the rendered SQL only
- **Diff View**: Compare template vs rendered result

## ⌨️ Keyboard Shortcuts

### Navigation
- `Tab` - Navigate to next variable
- `Shift + Tab` - Navigate to previous variable
- `Ctrl + Home` - Go to first variable
- `Ctrl + End` - Go to last variable
- `↑/↓/←/→` - Navigate between variables

### Editing
- `Enter` / `Space` - Edit focused variable
- `F2` - Edit focused variable
- `Escape` - Close editor / Clear focus

### View Controls
- `Ctrl + 1` - Switch to split view
- `Ctrl + 2` - Switch to rendered view
- `Ctrl + 3` - Switch to diff view
- `Ctrl + L` - Toggle line numbers
- `Ctrl + W` - Toggle word wrap

### File Operations
- `Ctrl + S` - Save/Submit changes
- `Ctrl + C` - Copy rendered result
- `Ctrl + R` - Refresh preview

### Help
- `Ctrl + ?` - Show keyboard shortcuts
- `F1` - Show keyboard shortcuts

## 🧠 Smart Features

### Type Inference

The editor automatically infers variable types based on:

- **Variable Names**: `user_id` → integer, `email` → email type
- **Context**: SQL WHERE clauses, JOIN conditions
- **Patterns**: Common naming conventions

### Value Suggestions

Context-aware suggestions based on variable names:

- `user_*` → user-related values
- `*_date` → date/time values
- `status_*` → status options
- `*_id` → ID numbers

### Error Validation

Real-time validation with helpful messages:

- Type checking
- Required field validation
- Format validation (email, URL, UUID)
- SQL syntax validation

## 🎨 Customization

### Themes

The V2 editor automatically adapts to your VSCode theme:

- **Dark Themes**: Full dark mode support
- **Light Themes**: Full light mode support
- **High Contrast**: Accessibility support

### Animations

Control animation behavior:

```typescript
// Respect user preferences
if (prefersReducedMotion) {
  // Disable animations
}

// Custom easing functions
const easing = 'cubic-bezier(0.4, 0, 0.2, 1)';
```

## 🧪 Testing

### Interactive Test Page

Open `src/jinja2-editor-v2/test/v2-editor-test.html` in your browser to test the V2 editor interactively.

### Test Features

- **Template Loading**: Pre-defined test templates
- **Configuration Testing**: Test different settings
- **Keyboard Navigation**: Test all shortcuts
- **Responsive Layout**: Test different screen sizes
- **Theme Switching**: Test theme variations

### Debug Console

```javascript
// Access editor state
testEditor.getState()
testEditor.logState()

// Test configurations
testEditor.testHighlightStyle('background')
testEditor.testPopoverPlacement('auto')
testEditor.toggleAnimations()
testEditor.toggleKeyboardNav()
```

## 🔧 Development

### Building the V2 Editor

```bash
# Install dependencies
pnpm install

# Build extension
pnpm run build

# Package extension
pnpm run vsix
```

### Component Architecture

Each component follows the Lit framework pattern:

```typescript
@customElement('my-component')
export class MyComponent extends LitElement {
  @property() accessor myProp: string = '';

  static styles = css`
    /* Component styles */
  `;

  render() {
    return html`<!-- Template -->`;
  }
}
```

### State Management

Centralized state management with reactive updates:

```typescript
// Variable state manager
const stateManager = new VariableStateManager();
stateManager.initialize(variables);

// Listen for changes
stateManager.addListener((event) => {
  // Handle state changes
});
```

### Keyboard Navigation

Comprehensive keyboard navigation system:

```typescript
const keyboardManager = new KeyboardNavigationManager(config);
keyboardManager.initialize(variables);

// Handle events
keyboardManager.addListener((event) => {
  // Handle navigation
});
```

## 🐛 Troubleshooting

### Common Issues

1. **Popovers not appearing**
   - Check if animations are disabled
   - Verify CSS variables are loaded
   - Check console for JavaScript errors

2. **Keyboard shortcuts not working**
   - Ensure keyboard navigation is enabled
   - Check if another extension is intercepting keys
   - Verify focus is on the editor

3. **Template not parsing correctly**
   - Check for invalid Jinja2 syntax
   - Verify template encoding
   - Look for parsing errors in console

### Debug Mode

Enable debug logging:

```json
{
  "sqlsugar.logLevel": "debug"
}
```

### Performance Issues

1. **Large templates**
   - Editor automatically handles large templates
   - Virtual scrolling for very large content

2. **Slow animations**
   - Check `prefers-reduced-motion` setting
   - Disable animations in settings

## 🗺️ Roadmap

### Phase 1: Core Features ✅
- [x] Direct template interaction
- [x] Smart popovers
- [x] Keyboard navigation
- [x] Responsive design
- [x] Configuration system

### Phase 2: Enhanced Features
- [ ] AI-powered suggestions
- [ ] Template analytics
- [ ] Collaborative editing
- [ ] Advanced search
- [ ] Custom themes

### Phase 3: Advanced Features
- [ ] Plugin system
- [ ] Template library
- [ ] Performance metrics
- [ ] Export/import functionality
- [ ] Advanced validation

## 📝 License

This project is part of the SQLSugar extension. See the main project license for details.

## 🤝 Contributing

Contributions are welcome! Please read the contributing guidelines and submit pull requests.

### Development Setup

1. Clone the repository
2. Install dependencies with `pnpm install`
3. Run the development server
4. Make your changes
5. Submit a pull request

### Code Style

- Use TypeScript for all new code
- Follow the existing code style
- Add tests for new features
- Update documentation

---

**Built with ❤️ for the SQLSugar community**