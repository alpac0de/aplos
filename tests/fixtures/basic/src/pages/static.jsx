'use static';

export const meta = {
  title: 'Static page',
  description: 'Pre-rendered at build time',
};

export default function StaticPage() {
  return <h1>Static</h1>;
}
