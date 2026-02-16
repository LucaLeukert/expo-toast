import mdx from '@astrojs/mdx';
import starlight from '@astrojs/starlight';
import { defineConfig } from 'astro/config';

const repository = process.env.GITHUB_REPOSITORY ?? 'lucaleukert/expo-toast';
const repoName = repository.split('/')[1] ?? 'expo-toast';
const isPagesBuild = process.env.GITHUB_ACTIONS === 'true';

export default defineConfig({
  site: 'https://lucaleukert.github.io',
  base: isPagesBuild ? `/${repoName}` : '/',
  integrations: [
    starlight({
      title: 'expo-toast',
      description: 'Simple, user-focused docs for expo-toast.',
      customCss: ['./src/styles/custom.css'],
      social: {
        github: 'https://github.com/lucaleukert/expo-toast',
      },
      sidebar: [
        {
          label: 'Getting Started',
          items: [
            { label: 'Introduction', slug: '' },
            { label: 'Getting Started', slug: 'guides/getting-started' },
          ],
        },
        {
          label: 'Guides',
          items: [
            { label: 'Using the Toast Module', slug: 'guides/using-toast-module' },
            { label: 'Toast Variants', slug: 'guides/toast-variants' },
            { label: 'Configuration', slug: 'guides/configuration' },
            { label: 'API Overview', slug: 'guides/api' },
          ],
        },
        {
          label: 'Reference',
          items: [
            { label: 'API Reference', slug: 'reference/api' },
            { label: 'README', slug: 'reference/readme' },
            { label: 'Changelog', slug: 'reference/changelog' },
          ],
        },
      ],
    }),
    mdx(),
  ],
});
