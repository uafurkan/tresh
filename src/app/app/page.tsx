import type { Metadata } from 'next';
import TreshApp from './TreshApp';

export const metadata: Metadata = {
  title: 'Uygulama',
  description: 'Canlı kur seviyesini izle, eşiğini kur, seviye kırılınca bildirim al.',
  alternates: { canonical: '/app' },
};

export default function AppPage() {
  return <TreshApp />;
}
