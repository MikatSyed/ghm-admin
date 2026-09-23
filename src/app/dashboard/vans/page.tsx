import { redirect } from 'next/navigation';

export default function VansRedirect() {
  redirect('/dashboard/distribution?tab=fleet');
}
