import { useParams } from 'react-router-dom';
import MarkdownPage from '@/components/MarkdownPage';

const PATH_MAP: Record<string, { file: string; title: string }> = {
  '': { file: 'index.md', title: 'Overview' },
  'installation': { file: 'getting-started/installation.md', title: 'Installation' },
  'quick-start': { file: 'getting-started/quick-start.md', title: 'Quick Start' },
  'routing/file-based': { file: 'routing/file-based.md', title: 'File-based Routing' },
  'routing/layouts': { file: 'routing/layouts.md', title: 'Layouts' },
  'routing/dynamic-routes': { file: 'routing/dynamic-routes.md', title: 'Dynamic Routes' },
  'configuration': { file: 'configuration/overview.md', title: 'Configuration' },
  'cli': { file: 'cli/commands.md', title: 'CLI Commands' },
  'api': { file: 'api/components.md', title: 'API Reference' },
};

export default function DocPage() {
  const params = useParams();
  const path = params['*'] || '';

  const page = PATH_MAP[path] || { file: path + '.md', title: 'Documentation' };

  return <MarkdownPage path={page.file} title={`${page.title} - Aplos Docs`} />;
}
