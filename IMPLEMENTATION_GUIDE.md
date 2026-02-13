# PH-BookRent - Professional Vue.js Book Rental Application

A minimalist, performance-optimized book rental platform built with Vue.js 3 and the Composition API.

## Features

- 🎨 **Minimalist Design System** - Consistent colors, typography, and spacing
- ⚡ **Performance Optimized**  - Lazy-loaded routes and dynamic imports
- 📱 **Fully Responsive** - Mobile-first design approach
- ♿ **Accessible** - WCAG compliant with keyboard navigation
- 🧩 **Reusable Components** - Scalable component architecture
- 🎯 **Type-Safe** - Clean, maintainable code structure

## Tech Stack

- **Framework**: Vue.js 3 (Composition API)
- **Build Tool**: Vite
- **Router**: Vue Router 4
- **Backend**: Supabase
- **Styling**: CSS Custom Properties (Design Tokens)

## Project Structure

```
src/
├── components/
│   ├── ui/              # Reusable UI components
│   │   ├── AppButton.vue
│   │   ├── AppCard.vue
│   │   ├── AppInput.vue
│   │   ├── AppModal.vue
│   │   ├── AppSelect.vue
│   │   ├── AppToast.vue
│   │   └── AppLoading.vue
│   └── layout/          # Layout components
│       ├── AppHeader.vue
│       ├── PageLayout.vue
│       ├── SectionHeader.vue
│       └── EmptyState.vue
├── pages/               # Route pages
│   ├── HomePage.vue
│   ├── LoginPage.vue
│   ├── RegisterPage.vue
│   └── NotFoundPage.vue
├── views/               # Feature views
│   ├── admin/
│   │   ├── AdminDashboard.vue
│   │   ├── AdminInventory.vue
│   │   └── AdminRecords.vue
│   └── customer/
│       └── Rentbook.vue
├── router/              # Router configuration
│   └── index.js
├── services/            # External services
│   └── supabaseClient.js
├── composables/         # Reusable composition functions
│   └── useToast.js
├── styles/              # Global styles and tokens
│   ├── tokens.css       # Design system tokens
│   └── global.css       # Global styles
└── App.vue              # Root component
```

## Design System

### Colors

- **Primary**: Blue (#2563eb)
- **Secondary**: Slate (#64748b)
- **Success**: Green (#10b981)
- **Error**: Red (#ef4444)
- **Warning**: Amber (#f59e0b)

### Typography

- **Font Family**: System font stack (SF Pro, Segoe UI, Roboto)
- **Font Sizes**: 0.75rem - 2.25rem (12px - 36px)
- **Font Weights**: 400, 500, 600, 700

### Spacing

Uses a consistent 4px base unit scale:
- `--space-1` to `--space-20` (4px - 80px)

## Component Usage

### AppButton

```vue
<AppButton variant="primary" size="md" @click="handleClick">
  Click Me
</AppButton>
```

**Props**:
- `variant`: 'primary' | 'secondary' | 'success' | 'error' | 'ghost'
- `size`: 'sm' | 'md' | 'lg'
- `loading`: boolean
- `disabled`: boolean
- `block`: boolean (full width)

### AppCard

```vue
<AppCard hoverable>
  <template #header>Card Title</template>
  Card content goes here
  <template #footer>Card footer</template>
</AppCard>
```

### AppInput

```vue
<AppInput
  v-model="value"
  label="Email"
  type="email"
  placeholder="Enter email"
  :error="errorMessage"
  required
/>
```

### AppModal

```vue
<AppModal v-model="showModal" title="Modal Title" size="md">
  Modal content
  <template #footer>
    <AppButton @click="showModal = false">Close</AppButton>
  </template>
</AppModal>
```

### AppSelect

```vue
<AppSelect
  v-model="selected"
  :options="[
    { value: '1', label: 'Option 1' },
    { value: '2', label: 'Option 2' }
  ]"
  label="Choose option"
/>
```

## Layout Components

### AppHeader

```vue
<AppHeader app-name="Your App">
  <template #nav-links>
    <router-link to="/page">Link</router-link>
  </template>
  <template #nav-actions>
    <AppButton>Action</AppButton>
  </template>
</AppHeader>
```

### PageLayout

```vue
<PageLayout>
  <!-- Your page content -->
</PageLayout>
```

### SectionHeader

```vue
<SectionHeader 
  title="Section Title"
  description="Section description"
>
  <template #action>
    <AppButton>Action</AppButton>
  </template>
</SectionHeader>
```

### EmptyState

```vue
<EmptyState
  icon="📭"
  title="No items found"
  description="Try adjusting your filters"
>
  <template #action>
    <AppButton>Clear Filters</AppButton>
  </template>
</EmptyState>
```

## Composables

### useToast

```vue
<script setup>
import { useToast } from '@/composables/useToast'

const toast = useToast()

const handleSuccess = () => {
  toast.success('Operation successful!')
}

const handleError = () => {
  toast.error('Something went wrong')
}
</script>
```

## Development

### Prerequisites

- Node.js 16+
- npm or yarn

### Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Environment Variables

Create a `.env` file:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Code Style Guidelines

### Vue Components

- Use Composition API with `<script setup>`
- Keep components small and focused (< 200 lines)
- Use props validation
- Emit events with `defineEmits`
- Prefer computed over watchers

### CSS

- Use CSS custom properties (design tokens)
- Scope styles with `scoped` attribute
- Follow BEM-like naming for complex components
- Mobile-first media queries

### File Naming

- Components: PascalCase (e.g., `AppButton.vue`)
- Pages: PascalCase with suffix (e.g., `HomePage.vue`)
- Composables: camelCase with `use` prefix (e.g., `useToast.js`)
- Utils: camelCase (e.g., `formatDate.js`)

## Performance Best Practices

1. **Lazy Loading**: All routes are lazy-loaded
2. **Dynamic Imports**: Heavy components imported dynamically
3. **Minimize Re-renders**: Use computed properties and proper reactivity
4. **Optimize Assets**: Compress images and use WebP format
5. **Code Splitting**: Separate vendor and app bundles

## Accessibility

- Semantic HTML elements
- ARIA labels and roles
- Keyboard navigation support
- Focus indicators
- Color contrast compliance
- Screen reader friendly

## Browser Support

- Chrome (last 2 versions)
- Firefox (last 2 versions)
- Safari (last 2 versions)
- Edge (last 2 versions)

## License

MIT

## Contributing

1. Follow the established design system
2. Write clean, maintainable code
3. Test on multiple devices
4. Ensure accessibility compliance
5. Update documentation as needed
