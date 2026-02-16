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
      description: 'Native-feeling liquid-glass toast notifications for Expo (iOS 26+).',
      customCss: ['./src/styles/custom.css'],
      social: {
        github: 'https://github.com/lucaleukert/expo-toast',
      },
      sidebar: [
        {
          label: 'Getting Started',
          items: [
            { label: 'Quick Start', slug: 'guides/quick-start' },
            { label: 'API Reference', slug: 'guides/api' },
          ],
        },
        {
          label: 'Source of Truth',
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
