import { redirect } from 'next/navigation';

/** Legacy path — shop now lives at /shop. */
export default function LegacyCreatorShopPage() {
  redirect('/shop');
}
