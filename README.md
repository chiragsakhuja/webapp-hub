# Vue Tools Collection

A modern, responsive collection of simple single-page tools built with Vue.js and designed for Cloudflare Pages deployment.

## Features

- 🎨 **Beautiful UI**: Inspired by modern design principles with gradient backgrounds and glassmorphism effects
- 📱 **Mobile-First**: Fully responsive design optimized for all devices
- ⚡ **Fast & Lightweight**: Built with Vue 3 and Vite for optimal performance
- 🛠️ **Extensible**: Easy to add new tools to the collection
- 🚀 **Cloudflare Pages Ready**: Optimized for seamless deployment

## Design Theme

The webapp features a beautiful gradient background and modern UI elements inspired by contemporary design trends:
- Gradient backgrounds with purple/blue tones
- Glassmorphism effects with backdrop filters
- Rounded corners and smooth transitions
- Mobile-optimized with proper safe area handling
- Clean typography with proper contrast

## Project Structure

```
src/
├── components/
│   └── tools/
│       ├── ToolLayout.vue     # Reusable layout for tools
│       └── [YourTool].vue     # Individual tool components
├── views/
│   └── HomeView.vue           # Landing page with tools grid
├── router/
│   └── index.ts              # Vue Router configuration
└── App.vue                   # Main app component
```

## Adding New Tools

To add a new tool to the collection:

1. **Create the tool component** in `src/components/tools/YourTool.vue`:
   ```vue
   <script setup lang="ts">
   import ToolLayout from './ToolLayout.vue'
   </script>

   <template>
     <ToolLayout title="Your Tool" description="Tool description">
       <!-- Your tool content here -->
     </ToolLayout>
   </template>
   ```

2. **Add the route** in `src/router/index.ts`:
   ```typescript
   {
     path: '/your-tool',
     name: 'your-tool',
     component: () => import('../components/tools/YourTool.vue'),
   }
   ```

3. **Update the tools array** in `src/views/HomeView.vue`:
   ```typescript
   {
     id: 'your-tool',
     name: 'Your Tool',
     description: 'Brief description of what your tool does',
     icon: '🛠️',
     path: '/your-tool',
     status: 'available'
   }
   ```

## Development

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Setup
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Build specifically for Cloudflare Pages
npm run build-cloudflare

# Preview production build
npm run preview
```

### Code Quality
```bash
# Lint code
npm run lint

# Format code
npm run format

# Type check
npm run type-check
```

## Deployment to Cloudflare Pages

### Option 1: Git Integration (Recommended)

1. Push your code to a Git repository (GitHub, GitLab, etc.)
2. Go to [Cloudflare Pages](https://pages.cloudflare.com/)
3. Connect your repository
4. Configure build settings:
   - **Build command**: `npm run build-cloudflare`
   - **Build output directory**: `dist`
   - **Node.js version**: `18` or higher

### Option 2: Direct Upload

1. Build the project locally:
   ```bash
   npm run build-cloudflare
   ```

2. Upload the `dist` folder to Cloudflare Pages

### Build Configuration

The project is pre-configured for Cloudflare Pages with:
- SPA routing support via `_redirects` file
- Optimized Vite build configuration
- Proper asset handling and chunking

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile browsers (iOS Safari, Chrome Mobile)
- Progressive enhancement for older browsers

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add your tool following the structure above
4. Test thoroughly on mobile and desktop
5. Submit a pull request

## License

MIT License - feel free to use this as a starting point for your own tools collection!

---

**Happy building!** 🚀
