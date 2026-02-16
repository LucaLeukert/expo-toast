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
            { label: 'Overview', slug: '' },
            { label: 'Quick Start', slug: 'guides/quick-start' },
          ],
        },
        {
          label: 'API',
          items: [
            { label: 'API Overview', slug: 'guides/api' },
            { label: 'API (JSDoc)', slug: 'reference/api' },
          ],
        },
        {
          label: 'Reference',
          items: [
            { label: 'README', slug: 'reference/readme' },
            { label: 'Changelog', slug: 'reference/changelog' },
          ],
        },
      ],
    }),
    mdx(),
  ],
});
